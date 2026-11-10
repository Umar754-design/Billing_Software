/**
 * INFINITY TRADERS — Purchases Module (purchases.js)
 * ====================================================
 * Handles purchase entry form with Multi-Size / Multi-Variant support,
 * purchase history table, purchase details modal, and stock update on save.
 */

'use strict';

// ── Purchase Form State & Draft Persistence ──────────────────────────────────
let purchaseItems = [];
let purchaseGstEnabled = false;
let editingPurchaseItemIndex = -1;
let modalSizeRows = [];

let purchaseDraftState = {
  supplierId: '',
  supplierName: '',
  supplierPhone: '',
  supplierAddress: '',
  supplierInvoice: '',
  date: '',
  gstEnabled: false,
  gstRate: 18,
  paymentStatus: 'Paid',
  amountPaid: '',
  notes: '',
  items: []
};

function loadPurchaseDraft() {
  try {
    const raw = localStorage.getItem('infinity_purchase_draft');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        purchaseDraftState = parsed;
        if (Array.isArray(parsed.items)) purchaseItems = parsed.items;
        purchaseGstEnabled = Boolean(parsed.gstEnabled);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Draft load error', e);
  }
  return purchaseDraftState;
}

function savePurchaseDraft() {
  const supplierSelect = document.getElementById('pur-supplier-select');
  const draft = {
    supplierId: supplierSelect ? supplierSelect.value : (purchaseDraftState?.supplierId || ''),
    supplierName: document.getElementById('pur-supplier-name')?.value ?? purchaseDraftState?.supplierName ?? '',
    supplierPhone: document.getElementById('pur-supplier-phone')?.value ?? purchaseDraftState?.supplierPhone ?? '',
    supplierAddress: document.getElementById('pur-supplier-address')?.value ?? purchaseDraftState?.supplierAddress ?? '',
    supplierInvoice: document.getElementById('pur-supplier-invoice')?.value ?? purchaseDraftState?.supplierInvoice ?? '',
    date: document.getElementById('pur-date')?.value || purchaseDraftState?.date || todayISO(),
    gstEnabled: purchaseGstEnabled,
    gstRate: parseFloat(document.getElementById('pur-gst-rate')?.value || purchaseDraftState?.gstRate || 18),
    paymentStatus: document.getElementById('pur-payment-status')?.value || purchaseDraftState?.paymentStatus || 'Paid',
    amountPaid: document.getElementById('pur-amount-paid')?.value ?? purchaseDraftState?.amountPaid ?? '',
    notes: document.getElementById('pur-notes')?.value ?? purchaseDraftState?.notes ?? '',
    items: Array.isArray(purchaseItems) ? purchaseItems : []
  };
  purchaseDraftState = draft;
  try {
    localStorage.setItem('infinity_purchase_draft', JSON.stringify(draft));
  } catch (e) {
    console.warn('Draft save error', e);
  }
}

function clearPurchaseDraft() {
  purchaseDraftState = {
    supplierId: '',
    supplierName: '',
    supplierPhone: '',
    supplierAddress: '',
    supplierInvoice: '',
    date: '',
    gstEnabled: false,
    gstRate: 18,
    paymentStatus: 'Paid',
    amountPaid: '',
    notes: '',
    items: []
  };
  purchaseItems = [];
  purchaseGstEnabled = false;
  editingPurchaseItemIndex = -1;
  modalSizeRows = [];
  try {
    localStorage.removeItem('infinity_purchase_draft');
  } catch (e) {}
}

window.addEventListener('beforeunload', () => {
  if (typeof savePurchaseDraft === 'function' && document.getElementById('pur-supplier-name')) {
    savePurchaseDraft();
  }
});

async function renderPurchases(container) {
  if (!container) container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = renderLoadingSpinner('Loading purchase form...');

  const [supRes, prodRes] = await Promise.all([
    apiGet('api/suppliers/index.php'),
    apiGet('api/products/index.php')
  ]);

  if (supRes && supRes.success && Array.isArray(supRes.data)) {
    AppState.suppliers = supRes.data;
  }
  if (prodRes && prodRes.success && Array.isArray(prodRes.data)) {
    AppState.products = prodRes.data;
  }

  // Ensure categories and brands are available for product creation
  if (!AppState.categories?.length || !AppState.brands?.length) {
    await loadGlobalAppData();
  }

  const suppliers = (AppState.suppliers || []).filter(s => s.status === 'Active');
  const categories = AppState.categories || [];
  const brands = AppState.brands || [];

  // Load existing draft if present
  const draft = loadPurchaseDraft();
  if (draft && Array.isArray(draft.items) && draft.items.length > 0) {
    purchaseItems = draft.items;
  }
  purchaseGstEnabled = draft ? Boolean(draft.gstEnabled) : false;

  const hasDraftContent = Boolean((purchaseItems && purchaseItems.length > 0) || (draft && draft.supplierName && draft.supplierName.trim()));

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>New Purchase Entry</h1>
        <div class="breadcrumb-text">Record new merchandise purchase with multi-size variants and update MySQL inventory</div>
      </div>
    </div>

    ${hasDraftContent ? `
      <div id="pur-draft-alert" class="alert alert-info py-2 px-3 mb-3" style="display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12.5px;border-radius:var(--radius);border-left:4px solid var(--primary);background:rgba(14,165,233,0.08)">
        <div style="display:flex;align-items:center;gap:8px">
          <i class="bi bi-clock-history text-primary" style="font-size:16px"></i>
          <span><strong>Unsaved Purchase Draft Restored:</strong> Aapka enter kiya hua purchase data restore kar diya gaya hai. Jab tak aap save ya cancel nahi karenge, ye delete nahi hoga.</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" id="btn-discard-draft-top" style="font-size:11.5px;padding:3px 12px;white-space:nowrap;font-weight:600">
          <i class="bi bi-trash"></i> Discard Draft
        </button>
      </div>
    ` : ''}

    <!-- 1. Supplier & Invoice Information Card -->
    <div class="card mb-3">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span class="card-title"><i class="bi bi-truck"></i> Supplier & Invoice Details</span>
        <span style="font-size:12px;color:var(--text-muted)">Choose existing supplier or type new supplier details</span>
      </div>
      <div class="card-body">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Registered Supplier (Quick Select)</label>
            <select class="form-control-it" id="pur-supplier-select">
              <option value="">— Choose Registered Supplier (Auto-fill) —</option>
              ${suppliers.map(s => `
                <option value="${sanitizeHTML(s.id)}" 
                        data-name="${sanitizeHTML(s.name)}" 
                        data-phone="${sanitizeHTML(s.phone || '')}" 
                        data-address="${sanitizeHTML(s.address || '')}"
                        ${draft && String(draft.supplierId) === String(s.id) ? 'selected' : ''}>
                  ${sanitizeHTML(s.name)}${s.phone ? ' (' + sanitizeHTML(s.phone) + ')' : ''}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">Supplier Name *</label>
            <input type="text" class="form-control-it" id="pur-supplier-name" value="${sanitizeHTML(draft?.supplierName || '')}" placeholder="Enter supplier or business name" required>
            <div class="form-error-msg" id="err-supplier"></div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Supplier Contact Number</label>
            <input type="text" class="form-control-it" id="pur-supplier-phone" value="${sanitizeHTML(draft?.supplierPhone || '')}" placeholder="e.g. +91 98765 43210">
          </div>
          <div class="col-md-6">
            <label class="form-label">Supplier Address</label>
            <input type="text" class="form-control-it" id="pur-supplier-address" value="${sanitizeHTML(draft?.supplierAddress || '')}" placeholder="Enter street, market, city, state address...">
          </div>
          <div class="col-md-3">
            <label class="form-label">Supplier Invoice No.</label>
            <input type="text" class="form-control-it" id="pur-supplier-invoice" value="${sanitizeHTML(draft?.supplierInvoice || '')}" placeholder="e.g. SUP-INV-001">
          </div>
          <div class="col-md-3">
            <label class="form-label">Purchase Date *</label>
            <input type="date" class="form-control-it" id="pur-date" value="${sanitizeHTML(draft?.date || todayISO())}" required>
            <div class="form-error-msg" id="err-date"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Products Section Card -->
    <div class="card mb-3">
      <div class="card-header" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <span class="card-title" style="margin:0"><i class="bi bi-box-seam"></i> Products to Purchase *</span>
          <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px">
            Purchasing different sizes (e.g. M 20 pcs, L 40 pcs, XL 30 pcs) with separate prices is fully supported.
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <div style="position:relative;width:260px">
            <input type="text" class="form-control-it" id="pur-quick-prod-search" placeholder="🔍 Quick search product or SKU..." autocomplete="off" style="font-size:12.5px;padding-left:32px">
            <i class="bi bi-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none;font-size:12px"></i>
            <div id="pur-quick-suggest-list" class="product-autocomplete-dropdown" style="display:none"></div>
          </div>
          <button class="btn-primary-it" id="btn-open-add-product-modal" style="padding:6px 14px;font-size:12.5px">
            <i class="bi bi-stack"></i> + Add Product & Sizes
          </button>
          <button class="btn-outline-it" id="btn-add-pur-item" style="padding:6px 14px;font-size:12.5px">
            <i class="bi bi-grid-3x3-gap"></i> Browse Catalog
          </button>
        </div>
      </div>
      <div class="card-body">
        <div id="purchase-items-container">
          <div class="empty-state" style="padding:32px;border:1.5px dashed var(--border);border-radius:var(--radius)">
            <i class="bi bi-box-seam" style="font-size:2rem;color:var(--text-muted)"></i>
            <p style="margin-top:8px">No items added yet. Click <strong>"+ Add Product & Sizes"</strong> to enter products with multiple sizes (M, L, XL, etc.) in one go.</p>
          </div>
        </div>
        <div class="form-error-msg" id="err-items"></div>
      </div>
    </div>

    <!-- 3. Totals & GST Section Card -->
    <div class="card mb-3">
      <div class="card-body">
        <div class="gst-toggle-wrap" style="margin-bottom:16px">
          <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch" id="pur-gst-toggle" ${purchaseGstEnabled ? 'checked' : ''}>
          </div>
          <label for="pur-gst-toggle" style="font-size:13px;font-weight:600;cursor:pointer">
            <i class="bi bi-percent"></i> Include GST
          </label>
          <select class="form-control-it" id="pur-gst-rate" style="width:90px;font-size:12.5px;padding:5px 10px;display:${purchaseGstEnabled ? 'block' : 'none'}">
            <option value="5" ${draft?.gstRate == 5 ? 'selected' : ''}>5%</option>
            <option value="12" ${draft?.gstRate == 12 ? 'selected' : ''}>12%</option>
            <option value="18" ${!draft || draft?.gstRate == 18 ? 'selected' : ''}>18%</option>
            <option value="28" ${draft?.gstRate == 28 ? 'selected' : ''}>28%</option>
          </select>
          <small style="color:var(--text-muted);font-size:11px">Tax applied on purchase taxable subtotal</small>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
          <div style="background:var(--bg);border:1px solid var(--border-light);border-radius:var(--radius);padding:18px;min-width:320px">
            <div class="total-line"><span>Subtotal</span><span id="pur-subtotal">₹0.00</span></div>
            <div class="total-line"><span>Discount</span><span id="pur-discount">-₹0.00</span></div>
            <div class="total-line" id="pur-gst-row" style="display:${purchaseGstEnabled ? 'flex' : 'none'}"><span id="pur-gst-label">GST (${draft?.gstRate || 18}%)</span><span id="pur-gst-amt">₹0.00</span></div>
            <div class="total-line grand-total"><span>Total Amount</span><span id="pur-total">₹0.00</span></div>
          </div>
        </div>

        <!-- Payment & Notes -->
        <div class="row g-3 mb-3">
          <div class="col-md-3">
            <label class="form-label">Payment Status *</label>
            <select class="form-control-it" id="pur-payment-status">
              <option value="Paid" ${draft?.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
              <option value="Partial" ${draft?.paymentStatus === 'Partial' ? 'selected' : ''}>Partial</option>
              <option value="Unpaid" ${draft?.paymentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Amount Paid (₹)</label>
            <input type="number" class="form-control-it" id="pur-amount-paid" value="${sanitizeHTML(draft?.amountPaid !== undefined && draft?.amountPaid !== '' ? String(draft.amountPaid) : '')}" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="col-md-6">
            <label class="form-label">Notes</label>
            <input type="text" class="form-control-it" id="pur-notes" value="${sanitizeHTML(draft?.notes || '')}" placeholder="Optional notes for this purchase order...">
          </div>
        </div>

        <div style="display:flex;gap:12px;justify-content:flex-end">
          <button class="btn-ghost" id="btn-cancel-purchase" style="border:1.5px solid var(--border);border-radius:var(--radius);padding:9px 20px">
            <i class="bi bi-x"></i> Cancel
          </button>
          <button class="btn-primary-it" id="btn-save-purchase">
            <i class="bi bi-save"></i> Save Purchase
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ============================================================== -->
  <!-- MODAL: Full Add / Edit Product with Multi-Size Variants Matrix -->
  <!-- ============================================================== -->
  <div class="modal fade" id="add-pur-full-product-modal" tabindex="-1" aria-labelledby="pur-full-product-modal-title" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="pur-full-product-modal-title"><i class="bi bi-box-seam"></i> Add Product & Sizes</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <!-- Product Name -->
            <div class="col-md-8">
              <label class="form-label">PRODUCT NAME *</label>
              <div style="position:relative">
                <input type="text" class="form-control-it" id="pur-prod-modal-name" placeholder="e.g. Cotton Graphic T-Shirt" autocomplete="off">
                <div id="pur-prod-modal-autocomplete" class="product-autocomplete-dropdown" style="display:none"></div>
              </div>
              <div class="form-error-msg" id="err-pur-modal-name"></div>
            </div>

            <!-- Base SKU with auto gen button -->
            <div class="col-md-4">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <label class="form-label mb-0">BASE SKU *</label>
                <a href="javascript:void(0)" id="pur-btn-gen-sku" style="font-size:11px;color:var(--primary);text-decoration:none">
                  <i class="bi bi-magic"></i> Auto SKU
                </a>
              </div>
              <input type="text" class="form-control-it" id="pur-prod-modal-sku" placeholder="e.g. TSH-GRAPH">
              <div class="form-error-msg" id="err-pur-modal-sku"></div>
            </div>

            <!-- Category -->
            <div class="col-md-4">
              <label class="form-label">CATEGORY *</label>
              <select class="form-control-it" id="pur-prod-modal-category">
                <option value="">— Select —</option>
                ${categories.map(c => `<option value="${sanitizeHTML(c.name)}">${sanitizeHTML(c.name)}</option>`).join('')}
              </select>
              <div class="form-error-msg" id="err-pur-modal-category"></div>
            </div>

            <!-- Subcategory -->
            <div class="col-md-4">
              <label class="form-label">SUBCATEGORY</label>
              <select class="form-control-it" id="pur-prod-modal-subcategory">
                <option value="">— Select Category First —</option>
              </select>
            </div>

            <!-- Brand -->
            <div class="col-md-4">
              <label class="form-label">BRAND *</label>
              <select class="form-control-it" id="pur-prod-modal-brand">
                <option value="">— Select —</option>
                ${brands.map(b => `<option value="${sanitizeHTML(b.name)}">${sanitizeHTML(b.name)}</option>`).join('')}
              </select>
              <div class="form-error-msg" id="err-pur-modal-brand"></div>
            </div>

            <!-- Color -->
            <div class="col-md-3">
              <label class="form-label">COLOR</label>
              <input type="text" class="form-control-it" id="pur-prod-modal-color" placeholder="e.g. Black/Navy">
            </div>

            <!-- Low Stock Threshold -->
            <div class="col-md-3">
              <label class="form-label">LOW STOCK THRESHOLD</label>
              <input type="number" class="form-control-it" id="pur-prod-modal-low-threshold" min="1" value="${AppState.settings?.lowStockThreshold || 3}">
            </div>

            <!-- Status -->
            <div class="col-md-3">
              <label class="form-label">STATUS</label>
              <select class="form-control-it" id="pur-prod-modal-status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <!-- Image URL -->
            <div class="col-md-3">
              <label class="form-label">IMAGE URL (CDN / WEB)</label>
              <input type="url" class="form-control-it" id="pur-prod-modal-image-url" placeholder="https://res.cloudinary.com/... or image link">
            </div>

            <!-- Multi-Size, Quantity & Price Breakdown (Variants Matrix) -->
            <div class="col-md-12">
              <div style="background:var(--bg);border:1.5px solid var(--border);border-radius:var(--radius);padding:14px;margin-top:4px">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
                  <div>
                    <label class="form-label mb-0" style="font-weight:700;font-size:13px;color:var(--text-dark)">
                      <i class="bi bi-stack text-primary"></i> Sizes, Quantity & Custom Price Breakdown *
                    </label>
                    <div style="font-size:11px;color:var(--text-muted)">
                      Add multiple sizes in one go (e.g. M 20 pcs, L 40 pcs, XL 30 pcs) with individual prices.
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
                    <span style="font-size:11px;font-weight:600;color:var(--text-muted)">Quick Add:</span>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('S')">+ S</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('M')">+ M</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('L')">+ L</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('XL')">+ XL</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('XXL')">+ XXL</button>
                    <span style="font-size:12px;color:var(--border)">|</span>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('7')">+ 7</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('8')">+ 8</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('9')">+ 9</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('10')">+ 10</button>
                    <button type="button" class="btn-xs-badge" onclick="addPurSizeQuick('Free Size')">+ Free</button>
                    <button type="button" class="btn-outline-it" id="btn-add-size-row" style="padding:3px 10px;font-size:11.5px;margin-left:4px">
                      <i class="bi bi-plus-circle"></i> + Add Size Row
                    </button>
                  </div>
                </div>

                <!-- Table of sizes -->
                <div class="table-wrapper" style="max-height:260px;overflow-y:auto;border:1px solid var(--border-light);border-radius:var(--radius-sm)">
                  <table class="it-table mb-0" id="pur-sizes-table" style="font-size:12px">
                    <thead>
                      <tr style="background:var(--card-bg)">
                        <th style="width:100px">Size *</th>
                        <th style="min-width:130px">Variant SKU *</th>
                        <th style="width:95px">Qty (Pcs) *</th>
                        <th style="width:130px">Purchase (₹) *</th>
                        <th style="width:130px">Selling (₹) *</th>
                        <th style="width:110px">Line Total</th>
                        <th style="width:40px;text-align:center"></th>
                      </tr>
                    </thead>
                    <tbody id="pur-sizes-tbody">
                      <!-- Rendered by renderModalSizeRows() -->
                    </tbody>
                    <tfoot>
                      <tr style="background:var(--card-bg);font-weight:700">
                        <td colspan="2">Variants: <span id="pur-sizes-total-variants">0</span></td>
                        <td><span id="pur-sizes-total-qty">0</span> pcs</td>
                        <td colspan="2" style="text-align:right">Estimated Total:</td>
                        <td><span id="pur-sizes-total-amount">₹0.00</span></td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div class="form-error-msg" id="err-pur-modal-sizes"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn-primary-it" id="btn-save-pur-product">
            <i class="bi bi-cart-plus"></i> <span id="pur-modal-save-btn-text">Add to Purchase</span>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Browse Existing Product modal for quick selection -->
  <div class="modal fade" id="add-pur-item-modal" tabindex="-1" aria-labelledby="add-pur-item-title" aria-hidden="true">
    <div class="modal-dialog modal-md">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="add-pur-item-title"><i class="bi bi-grid-3x3-gap"></i> Browse Products to Purchase</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-2 mb-3">
            <div class="col-12 col-md-7">
              <input type="search" class="form-control-it" id="pur-prod-search" placeholder="Search product by name or SKU...">
            </div>
            <div class="col-12 col-md-5">
              <select class="form-control-it" id="pur-prod-cat-filter">
                <option value="">All Categories</option>
                ${categories.map(c => `<option value="${sanitizeHTML(c.name)}">${sanitizeHTML(c.name)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="pur-prod-list" style="max-height:300px;overflow-y:auto"></div>
        </div>
      </div>
    </div>
  </div>`;

  editingPurchaseItemIndex = -1;
  modalSizeRows = [];
  initPurchaseEvents();
  renderPurchaseItemsTable();
  updatePurchaseTotals();
  savePurchaseDraft();
}

// ── Supplier Requirement Check Helper ─────────────────────────────────────────
function hasSelectedSupplier() {
  const supplierSelect = document.getElementById('pur-supplier-select');
  const supplierName = document.getElementById('pur-supplier-name')?.value.trim();
  return Boolean((supplierSelect && supplierSelect.value) || (supplierName && supplierName.length > 0));
}

function checkSupplierBeforeProductAction() {
  if (!hasSelectedSupplier()) {
    showToast('Bina supplier choose kiye product purchase/add nahi kar sakte. Please select or enter a supplier first!', 'warning');
    const nameEl = document.getElementById('pur-supplier-name');
    const errEl = document.getElementById('err-supplier');
    if (errEl) errEl.textContent = 'Bina supplier choose kiye product purchase nahi ho sakta. Please select or enter a supplier.';
    if (nameEl) {
      nameEl.classList.add('is-invalid');
      nameEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameEl.focus();
    }
    return false;
  }
  return true;
}

function initPurchaseEvents() {
  // Supplier selection auto-fill
  const supplierSelect = document.getElementById('pur-supplier-select');
  if (supplierSelect) {
    supplierSelect.addEventListener('change', () => {
      const opt = supplierSelect.options[supplierSelect.selectedIndex];
      if (opt && opt.value) {
        const nameEl = document.getElementById('pur-supplier-name');
        const phoneEl = document.getElementById('pur-supplier-phone');
        const addrEl = document.getElementById('pur-supplier-address');
        if (nameEl) {
          nameEl.value = opt.getAttribute('data-name') || '';
          nameEl.classList.remove('is-invalid');
        }
        if (phoneEl) phoneEl.value = opt.getAttribute('data-phone') || '';
        if (addrEl) addrEl.value = opt.getAttribute('data-address') || '';

        const errEl = document.getElementById('err-supplier');
        if (errEl) errEl.textContent = '';
      }
    });
  }

  // Clear supplier error on typing
  const supNameInput = document.getElementById('pur-supplier-name');
  if (supNameInput) {
    supNameInput.addEventListener('input', () => {
      if (supNameInput.value.trim()) {
        const errEl = document.getElementById('err-supplier');
        if (errEl) errEl.textContent = '';
        supNameInput.classList.remove('is-invalid');
      }
    });
  }

  // GST Toggle
  document.getElementById('pur-gst-toggle')?.addEventListener('change', e => {
    purchaseGstEnabled = e.target.checked;
    const rateEl = document.getElementById('pur-gst-rate');
    const rowEl  = document.getElementById('pur-gst-row');
    if (rateEl) rateEl.style.display = purchaseGstEnabled ? 'block' : 'none';
    if (rowEl)  rowEl.style.display  = purchaseGstEnabled ? 'flex' : 'none';
    updatePurchaseTotals();
  });
  document.getElementById('pur-gst-rate')?.addEventListener('change', updatePurchaseTotals);

  // Open Full Add Product Modal (Requires Supplier)
  document.getElementById('btn-open-add-product-modal')?.addEventListener('click', () => {
    if (!checkSupplierBeforeProductAction()) return;
    openAddPurchaseProductModal(-1);
  });

  // Open Browse Product Catalog Modal (Requires Supplier)
  document.getElementById('btn-add-pur-item')?.addEventListener('click', () => {
    if (!checkSupplierBeforeProductAction()) return;
    openPurchaseProductModal();
  });

  // Category change in Full Modal updates Subcategory
  document.getElementById('pur-prod-modal-category')?.addEventListener('change', (e) => {
    updatePurModalSubcategory(e.target.value);
  });

  // Auto SKU button in Full Modal
  document.getElementById('pur-btn-gen-sku')?.addEventListener('click', () => {
    const brand = document.getElementById('pur-prod-modal-brand')?.value || 'IT';
    const cleanBrand = brand.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase() || 'IT';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const skuEl = document.getElementById('pur-prod-modal-sku');
    if (skuEl) {
      skuEl.value = `${cleanBrand}-${randNum}`;
      // Update variant SKUs
      modalSizeRows.forEach(r => {
        if (r.size) r.sku = `${skuEl.value}-${r.size.toUpperCase()}`;
      });
      renderModalSizeRows();
    }
  });

  // Base SKU change syncs to variant SKUs
  document.getElementById('pur-prod-modal-sku')?.addEventListener('input', (e) => {
    const baseSku = e.target.value.trim();
    modalSizeRows.forEach(r => {
      if (r.size) r.sku = baseSku ? `${baseSku}-${r.size.toUpperCase()}` : '';
    });
    renderModalSizeRows();
  });

  // Add Size Row button
  document.getElementById('btn-add-size-row')?.addEventListener('click', () => {
    addCustomSizeRow();
  });

  // Save product from Full Modal
  document.getElementById('btn-save-pur-product')?.addEventListener('click', savePurchaseProductModal);

  // Main purchase actions
  document.getElementById('btn-save-purchase')?.addEventListener('click', savePurchase);

  // Cancel Purchase with "Are you sure?" confirmation
  function handleCancelPurchase() {
    const hasData = (purchaseItems && purchaseItems.length > 0) || Boolean(document.getElementById('pur-supplier-name')?.value.trim());
    if (hasData) {
      showConfirm(
        'Are you sure?',
        'Kya aap sach me ye purchase cancel karna chahte hain? Sabhi entered products aur supplier details delete ho jayengi.',
        () => {
          clearPurchaseDraft();
          showToast('Purchase draft deleted.', 'info');
          navigateTo('purchase-history');
        },
        'Yes, Discard & Delete',
        'btn-danger-it'
      );
    } else {
      clearPurchaseDraft();
      navigateTo('purchase-history');
    }
  }

  document.getElementById('btn-cancel-purchase')?.addEventListener('click', handleCancelPurchase);
  document.getElementById('btn-discard-draft-top')?.addEventListener('click', handleCancelPurchase);

  // Payment status auto-fill amount
  document.getElementById('pur-payment-status')?.addEventListener('change', e => {
    const totals = calcPurchaseTotals();
    const amtEl = document.getElementById('pur-amount-paid');
    if (!amtEl) return;
    if (e.target.value === 'Paid') amtEl.value = totals.total.toFixed(2);
    else if (e.target.value === 'Unpaid') amtEl.value = '0.00';
    savePurchaseDraft();
  });

  // Auto-save draft on any input change
  ['pur-supplier-phone', 'pur-supplier-address', 'pur-supplier-invoice', 'pur-date', 'pur-notes', 'pur-amount-paid'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', savePurchaseDraft);
    document.getElementById(id)?.addEventListener('change', savePurchaseDraft);
  });
  document.getElementById('pur-supplier-select')?.addEventListener('change', savePurchaseDraft);
  document.getElementById('pur-supplier-name')?.addEventListener('input', savePurchaseDraft);
  document.getElementById('pur-gst-toggle')?.addEventListener('change', savePurchaseDraft);
  document.getElementById('pur-gst-rate')?.addEventListener('change', savePurchaseDraft);

  initPurchaseQuickAutosuggest();
  initPurModalAutocomplete();
}

function updatePurModalSubcategory(categoryName, selectedSubcategory = '') {
  const el = document.getElementById('pur-prod-modal-subcategory');
  if (!el) return;
  const cat = (AppState.categories || []).find(c => c.name === categoryName);
  if (cat && Array.isArray(cat.subcategories) && cat.subcategories.length) {
    el.innerHTML = '<option value="">— Select Subcategory —</option>' +
      cat.subcategories.map(s => `<option value="${sanitizeHTML(s)}" ${s === selectedSubcategory ? 'selected' : ''}>${sanitizeHTML(s)}</option>`).join('');
  } else {
    el.innerHTML = '<option value="">— Select Category First —</option>';
  }
}

// ── Multi-Size Matrix Handlers ────────────────────────────────────────────────
function renderModalSizeRows() {
  const tbody = document.getElementById('pur-sizes-tbody');
  if (!tbody) return;

  const baseSku = document.getElementById('pur-prod-modal-sku')?.value.trim() || '';

  tbody.innerHTML = modalSizeRows.map((row, idx) => {
    if (!row.sku && baseSku && row.size) {
      row.sku = `${baseSku}-${row.size.toUpperCase()}`;
    }
    const isNat = row.qty && /^[1-9]\d*$/.test(String(row.qty).trim());
    const qtyVal = isNat ? parseInt(row.qty, 10) : 0;
    const cost = (row.purchasePrice !== '' && row.purchasePrice !== undefined && !isNaN(parseFloat(row.purchasePrice))) ? parseFloat(row.purchasePrice) : null;
    const lineTotal = (qtyVal > 0 && cost !== null) ? (qtyVal * cost) : 0;

    return `
      <tr>
        <td>
          <input type="text" class="form-control-it" value="${sanitizeHTML(row.size || '')}" placeholder="e.g. M, 8" 
                 style="font-size:12px;padding:5px 8px;font-weight:600"
                 oninput="updateModalSizeRow(${idx}, 'size', this.value)">
        </td>
        <td>
          <input type="text" class="form-control-it" value="${sanitizeHTML(row.sku || '')}" placeholder="Variant SKU" 
                 style="font-size:12px;padding:5px 8px"
                 oninput="updateModalSizeRow(${idx}, 'sku', this.value)">
        </td>
        <td>
          <input type="text" inputmode="numeric" class="form-control-it" 
                 value="${row.qty !== '' && row.qty !== undefined ? sanitizeHTML(String(row.qty)) : ''}" 
                 placeholder="Qty *" 
                 style="font-size:12px;padding:5px 8px"
                 onkeypress="return (event.charCode >= 48 && event.charCode <= 57)"
                 oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/^0+/, ''); updateModalSizeRow(${idx}, 'qty', this.value)">
        </td>
        <td>
          <input type="number" class="form-control-it" 
                 value="${row.purchasePrice !== '' && row.purchasePrice !== undefined ? row.purchasePrice : ''}" 
                 min="0" step="0.01" placeholder="Rate *" 
                 style="font-size:12px;padding:5px 8px"
                 oninput="updateModalSizeRow(${idx}, 'purchasePrice', this.value)">
        </td>
        <td>
          <input type="number" class="form-control-it" 
                 value="${row.sellingPrice !== '' && row.sellingPrice !== undefined ? row.sellingPrice : ''}" 
                 min="0" step="0.01" placeholder="Selling *" 
                 style="font-size:12px;padding:5px 8px"
                 oninput="updateModalSizeRow(${idx}, 'sellingPrice', this.value)">
        </td>
        <td style="font-weight:700;color:var(--text);font-size:12.5px;vertical-align:middle">
          ${formatINR(lineTotal)}
        </td>
        <td style="text-align:center;vertical-align:middle">
          ${modalSizeRows.length > 1 ? `
            <button type="button" class="btn-sm-action btn-sm-danger" onclick="removeModalSizeRow(${idx})" title="Remove size"><i class="bi bi-trash"></i></button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  // Update footer statistics
  let totalQty = 0;
  let totalAmount = 0;
  modalSizeRows.forEach(r => {
    const isNat = r.qty && /^[1-9]\d*$/.test(String(r.qty).trim());
    const q = isNat ? parseInt(r.qty, 10) : 0;
    const c = (r.purchasePrice !== '' && r.purchasePrice !== undefined && !isNaN(parseFloat(r.purchasePrice))) ? parseFloat(r.purchasePrice) : 0;
    totalQty += q;
    totalAmount += (q * c);
  });

  const totVarEl = document.getElementById('pur-sizes-total-variants');
  const totQtyEl = document.getElementById('pur-sizes-total-qty');
  const totAmtEl = document.getElementById('pur-sizes-total-amount');
  if (totVarEl) totVarEl.textContent = modalSizeRows.length;
  if (totQtyEl) totQtyEl.textContent = totalQty;
  if (totAmtEl) totAmtEl.textContent = formatINR(totalAmount);
}

function addPurSizeQuick(size) {
  const baseSku = document.getElementById('pur-prod-modal-sku')?.value.trim() || '';

  // If initial single row is empty, fill it
  if (modalSizeRows.length === 1 && !modalSizeRows[0].size && !modalSizeRows[0].sku && !modalSizeRows[0].qty) {
    modalSizeRows[0].size = size;
    modalSizeRows[0].sku = baseSku ? `${baseSku}-${size.toUpperCase()}` : '';
    modalSizeRows[0].qty = '';
    modalSizeRows[0].purchasePrice = '';
    modalSizeRows[0].sellingPrice = '';
  } else {
    const existing = modalSizeRows.find(r => (r.size || '').toUpperCase() === size.toUpperCase());
    if (existing) {
      showToast(`Size "${size}" is already added. Please enter its quantity manually.`, 'info');
    } else {
      modalSizeRows.push({
        size: size,
        sku: baseSku ? `${baseSku}-${size.toUpperCase()}` : '',
        qty: '',             // Strictly blank! Must be entered manually!
        purchasePrice: '',   // Strictly blank! Must NOT copy from row 1!
        sellingPrice: ''     // Strictly blank! Must NOT copy from row 1!
      });
    }
  }
  renderModalSizeRows();
}

function addCustomSizeRow() {
  const baseSku = document.getElementById('pur-prod-modal-sku')?.value.trim() || '';

  modalSizeRows.push({
    size: '',
    sku: baseSku ? `${baseSku}-` : '',
    qty: '',             // Strictly blank!
    purchasePrice: '',   // Strictly blank! Must NOT copy from row 1!
    sellingPrice: ''     // Strictly blank! Must NOT copy from row 1!
  });
  renderModalSizeRows();

  setTimeout(() => {
    const rows = document.querySelectorAll('#pur-sizes-tbody tr');
    if (rows.length) {
      const firstInput = rows[rows.length - 1].querySelector('input');
      firstInput?.focus();
    }
  }, 50);
}

function updateModalSizeRow(idx, field, value) {
  if (!modalSizeRows[idx]) return;
  modalSizeRows[idx][field] = value;

  // Auto SKU compute when size changes
  if (field === 'size') {
    const baseSku = document.getElementById('pur-prod-modal-sku')?.value.trim() || '';
    if (baseSku && (!modalSizeRows[idx].sku || modalSizeRows[idx].sku.startsWith(baseSku))) {
      modalSizeRows[idx].sku = `${baseSku}-${value.trim().toUpperCase()}`;
      const skuInput = document.querySelectorAll('#pur-sizes-tbody tr')[idx]?.querySelectorAll('input')[1];
      if (skuInput) skuInput.value = modalSizeRows[idx].sku;
    }
  }

  // Update line total cell directly for smooth typing without loss of focus
  const row = modalSizeRows[idx];
  const tr = document.querySelectorAll('#pur-sizes-tbody tr')[idx];
  if (tr) {
    const isNat = row.qty && /^[1-9]\d*$/.test(String(row.qty).trim());
    const q = isNat ? parseInt(row.qty, 10) : 0;
    const c = (row.purchasePrice !== '' && row.purchasePrice !== undefined && !isNaN(parseFloat(row.purchasePrice))) ? parseFloat(row.purchasePrice) : null;
    const lineTotal = (q > 0 && c !== null) ? (q * c) : 0;
    const lineTotalCell = tr.cells[5];
    if (lineTotalCell) lineTotalCell.textContent = formatINR(lineTotal);
  }

  // Recalculate totals in footer
  let totalQty = 0;
  let totalAmount = 0;
  modalSizeRows.forEach(r => {
    const isNat = r.qty && /^[1-9]\d*$/.test(String(r.qty).trim());
    const q = isNat ? parseInt(r.qty, 10) : 0;
    const c = (r.purchasePrice !== '' && r.purchasePrice !== undefined && !isNaN(parseFloat(r.purchasePrice))) ? parseFloat(r.purchasePrice) : 0;
    totalQty += q;
    totalAmount += (q * c);
  });

  const totVarEl = document.getElementById('pur-sizes-total-variants');
  const totQtyEl = document.getElementById('pur-sizes-total-qty');
  const totAmtEl = document.getElementById('pur-sizes-total-amount');
  if (totVarEl) totVarEl.textContent = modalSizeRows.length;
  if (totQtyEl) totQtyEl.textContent = totalQty;
  if (totAmtEl) totAmtEl.textContent = formatINR(totalAmount);
}

function removeModalSizeRow(idx) {
  if (modalSizeRows.length <= 1) return;
  modalSizeRows.splice(idx, 1);
  renderModalSizeRows();
}

function duplicatePurItemNewSize(idx) {
  const item = purchaseItems[idx];
  if (!item) return;

  editingPurchaseItemIndex = -1; // New item mode

  const titleEl = document.getElementById('pur-full-product-modal-title');
  const btnTextEl = document.getElementById('pur-modal-save-btn-text');
  if (titleEl) titleEl.innerHTML = `<i class="bi bi-stack"></i> Add Another Size for "${sanitizeHTML(item.name)}"`;
  if (btnTextEl) btnTextEl.textContent = 'Add to Purchase';

  // Base SKU extraction (remove previous size suffix if present)
  let baseSku = item.sku || '';
  if (item.size && baseSku.toUpperCase().endsWith('-' + item.size.toUpperCase())) {
    baseSku = baseSku.substring(0, baseSku.length - (item.size.length + 1));
  }

  document.getElementById('pur-prod-modal-name').value = item.name || '';
  document.getElementById('pur-prod-modal-sku').value = baseSku;
  document.getElementById('pur-prod-modal-category').value = item.category || '';
  updatePurModalSubcategory(item.category || '', item.subcategory || '');
  document.getElementById('pur-prod-modal-brand').value = item.brand || '';
  document.getElementById('pur-prod-modal-color').value = item.color || '';
  document.getElementById('pur-prod-modal-low-threshold').value = item.lowStockThreshold || (AppState.settings?.lowStockThreshold || 3);
  document.getElementById('pur-prod-modal-status').value = item.status || 'Active';
  document.getElementById('pur-prod-modal-image-url').value = item.imageUrl || '';

  // Initialize with a blank size row: user must enter size, qty (natural number), purchase price & selling price manually!
  modalSizeRows = [{
    size: '',
    sku: baseSku ? `${baseSku}-` : '',
    qty: '',
    purchasePrice: '',
    sellingPrice: ''
  }];

  renderModalSizeRows();

  const modalEl = document.getElementById('add-pur-full-product-modal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }
}

function openAddPurchaseProductModal(itemIndex = -1) {
  editingPurchaseItemIndex = itemIndex;

  const titleEl = document.getElementById('pur-full-product-modal-title');
  const btnTextEl = document.getElementById('pur-modal-save-btn-text');
  const setErr = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
  [
    'err-pur-modal-name', 'err-pur-modal-sku', 'err-pur-modal-category',
    'err-pur-modal-brand', 'err-pur-modal-sizes'
  ].forEach(id => setErr(id, ''));

  if (itemIndex >= 0 && purchaseItems[itemIndex]) {
    const item = purchaseItems[itemIndex];
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-pencil-square"></i> Edit Product in Purchase';
    if (btnTextEl) btnTextEl.textContent = 'Update Item';

    let baseSku = item.sku || '';
    if (item.size && baseSku.toUpperCase().endsWith('-' + item.size.toUpperCase())) {
      baseSku = baseSku.substring(0, baseSku.length - (item.size.length + 1));
    }

    document.getElementById('pur-prod-modal-name').value = item.name || '';
    document.getElementById('pur-prod-modal-sku').value = baseSku || item.sku || '';
    document.getElementById('pur-prod-modal-category').value = item.category || '';
    updatePurModalSubcategory(item.category || '', item.subcategory || '');
    document.getElementById('pur-prod-modal-brand').value = item.brand || '';
    document.getElementById('pur-prod-modal-color').value = item.color || '';
    document.getElementById('pur-prod-modal-low-threshold').value = item.lowStockThreshold || (AppState.settings?.lowStockThreshold || 3);
    document.getElementById('pur-prod-modal-status').value = item.status || 'Active';
    document.getElementById('pur-prod-modal-image-url').value = item.imageUrl || '';

    modalSizeRows = [{
      size: item.size || '',
      sku: item.sku || '',
      qty: item.qty || '',
      purchasePrice: item.costPerUnit !== undefined && item.costPerUnit !== '' ? item.costPerUnit : '',
      sellingPrice: item.sellingPrice !== undefined && item.sellingPrice !== '' ? item.sellingPrice : ''
    }];
  } else {
    if (titleEl) titleEl.innerHTML = '<i class="bi bi-box-seam"></i> Add Product & Sizes';
    if (btnTextEl) btnTextEl.textContent = 'Add to Purchase';

    document.getElementById('pur-prod-modal-name').value = '';
    document.getElementById('pur-prod-modal-sku').value = '';
    document.getElementById('pur-prod-modal-category').value = '';
    updatePurModalSubcategory('');
    document.getElementById('pur-prod-modal-brand').value = '';
    document.getElementById('pur-prod-modal-color').value = '';
    document.getElementById('pur-prod-modal-low-threshold').value = AppState.settings?.lowStockThreshold || 3;
    document.getElementById('pur-prod-modal-status').value = 'Active';
    document.getElementById('pur-prod-modal-image-url').value = '';

    modalSizeRows = [{
      size: '',
      sku: '',
      qty: '',
      purchasePrice: '',
      sellingPrice: ''
    }];
  }

  renderModalSizeRows();

  const modalEl = document.getElementById('add-pur-full-product-modal');
  if (modalEl) {
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    setTimeout(() => document.getElementById('pur-prod-modal-name')?.focus(), 350);
  }
}

function initPurModalAutocomplete() {
  const input = document.getElementById('pur-prod-modal-name');
  const box = document.getElementById('pur-prod-modal-autocomplete');
  if (!input || !box) return;

  function renderSuggestions() {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    const prods = (AppState.products || []).filter(p => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      return name.includes(q) || sku.includes(q);
    }).slice(0, 6);

    if (!prods.length) {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }

    box.innerHTML = `
      <div class="prod-suggest-header">
        <span><i class="bi bi-stars" style="color:var(--primary)"></i> Auto-fill from Catalog (${prods.length})</span>
        <span style="font-size:10px">Click to prefill</span>
      </div>
      ${prods.map((p, idx) => `
        <div class="prod-suggest-item" data-idx="${idx}">
          <div class="prod-suggest-left">
            <div class="prod-suggest-title">
              <i class="bi bi-box-seam text-primary" style="font-size:12px"></i>
              <span>${sanitizeHTML(p.name)}</span>
            </div>
            <div class="prod-suggest-meta">
              <span>SKU: <strong>${sanitizeHTML(p.sku)}</strong></span>
              ${p.brand ? `<span>· ${sanitizeHTML(p.brand)}</span>` : ''}
              ${p.size ? `<span>· Size: ${sanitizeHTML(p.size)}</span>` : ''}
            </div>
          </div>
          <div class="prod-suggest-right">
            <div class="prod-suggest-price">${formatINR(p.purchasePrice || p.purchase_price || 0)}</div>
          </div>
        </div>
      `).join('')}
    `;
    box.style.display = 'block';

    box.querySelectorAll('.prod-suggest-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(el.dataset.idx, 10);
        const p = prods[idx];
        if (p) {
          input.value = p.name || '';
          let baseSku = p.sku || '';
          if (p.size && baseSku.toUpperCase().endsWith('-' + p.size.toUpperCase())) {
            baseSku = baseSku.substring(0, baseSku.length - (p.size.length + 1));
          }
          document.getElementById('pur-prod-modal-sku').value = baseSku;
          document.getElementById('pur-prod-modal-category').value = p.category || p.category_name || '';
          updatePurModalSubcategory(p.category || p.category_name || '', p.subcategory || p.subcategory_name || '');
          document.getElementById('pur-prod-modal-brand').value = p.brand || p.brand_name || '';
          document.getElementById('pur-prod-modal-color').value = p.color || '';
          document.getElementById('pur-prod-modal-low-threshold').value = p.lowStockThreshold || p.low_stock_threshold || 3;
          document.getElementById('pur-prod-modal-status').value = (p.is_active === 0 || p.status === 'Inactive') ? 'Inactive' : 'Active';
          document.getElementById('pur-prod-modal-image-url').value = p.imageUrl || p.image_url || '';

          // Pre-populate size row with existing size if available, but keep qty blank for manual entry
          if (p.size) {
            modalSizeRows = [{
              size: p.size,
              sku: p.sku || `${baseSku}-${p.size.toUpperCase()}`,
              qty: '', // Strictly blank!
              purchasePrice: (p.purchasePrice || p.purchase_price) ? (p.purchasePrice || p.purchase_price) : '',
              sellingPrice: (p.sellingPrice || p.selling_price) ? (p.sellingPrice || p.selling_price) : ''
            }];
          } else {
            modalSizeRows = [{
              size: '',
              sku: baseSku ? `${baseSku}-` : '',
              qty: '',
              purchasePrice: (p.purchasePrice || p.purchase_price) ? (p.purchasePrice || p.purchase_price) : '',
              sellingPrice: (p.sellingPrice || p.selling_price) ? (p.sellingPrice || p.selling_price) : ''
            }];
          }
          renderModalSizeRows();
          box.style.display = 'none';
        }
      });
    });
  }

  input.addEventListener('input', renderSuggestions);
  input.addEventListener('focus', renderSuggestions);
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = 'none';
    }
  });
}

function savePurchaseProductModal() {
  const name        = document.getElementById('pur-prod-modal-name')?.value.trim();
  const baseSku     = document.getElementById('pur-prod-modal-sku')?.value.trim();
  const category    = document.getElementById('pur-prod-modal-category')?.value.trim();
  const subcategory = document.getElementById('pur-prod-modal-subcategory')?.value.trim();
  const brand       = document.getElementById('pur-prod-modal-brand')?.value.trim();
  const color       = document.getElementById('pur-prod-modal-color')?.value.trim();
  const threshold   = parseInt(document.getElementById('pur-prod-modal-low-threshold')?.value, 10) || 3;
  const status      = document.getElementById('pur-prod-modal-status')?.value || 'Active';
  const imageUrl    = document.getElementById('pur-prod-modal-image-url')?.value.trim();

  let valid = true;
  const setErr = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
  [
    'err-pur-modal-name', 'err-pur-modal-sku', 'err-pur-modal-category',
    'err-pur-modal-brand', 'err-pur-modal-sizes'
  ].forEach(id => setErr(id, ''));

  if (!name)      { setErr('err-pur-modal-name', 'Product name is required.'); valid = false; }
  if (!baseSku)   { setErr('err-pur-modal-sku', 'Base SKU is required.'); valid = false; }
  if (!category)  { setErr('err-pur-modal-category', 'Category is required.'); valid = false; }
  if (!brand)     { setErr('err-pur-modal-brand', 'Brand is required.'); valid = false; }

  if (!modalSizeRows.length) {
    setErr('err-pur-modal-sizes', 'Please add at least one size row.');
    valid = false;
  }

  // Validate every size row: size, natural number qty, purchase price, selling price
  for (let i = 0; i < modalSizeRows.length; i++) {
    const row = modalSizeRows[i];
    const rowSize = (row.size || '').trim();
    const rowQtyStr = String(row.qty !== undefined ? row.qty : '').trim();
    const rowPurStr = String(row.purchasePrice !== undefined ? row.purchasePrice : '').trim();
    const rowSellStr = String(row.sellingPrice !== undefined ? row.sellingPrice : '').trim();

    if (!rowSize) {
      setErr('err-pur-modal-sizes', `Row #${i+1}: Size enter karna compulsory hai.`);
      valid = false;
      break;
    }
    if (!rowQtyStr || !/^[1-9]\d*$/.test(rowQtyStr)) {
      setErr('err-pur-modal-sizes', `Row #${i+1} (${rowSize}): Quantity manually enter karna compulsory hai (Only natural numbers 1, 2, 3...).`);
      valid = false;
      break;
    }
    if (rowPurStr === '' || isNaN(parseFloat(rowPurStr)) || parseFloat(rowPurStr) < 0) {
      setErr('err-pur-modal-sizes', `Row #${i+1} (${rowSize}): Purchase rate manually enter karna compulsory hai.`);
      valid = false;
      break;
    }
    if (rowSellStr === '' || isNaN(parseFloat(rowSellStr)) || parseFloat(rowSellStr) < 0) {
      setErr('err-pur-modal-sizes', `Row #${i+1} (${rowSize}): Selling rate manually enter karna compulsory hai.`);
      valid = false;
      break;
    }
  }

  if (!valid) return;

  if (editingPurchaseItemIndex >= 0 && purchaseItems[editingPurchaseItemIndex]) {
    // Single item edit mode
    const row = modalSizeRows[0];
    const rowPur = parseFloat(row.purchasePrice);
    const rowSell = parseFloat(row.sellingPrice);
    const rowQty = parseInt(row.qty, 10);
    const rowSku = (row.sku || '').trim() || (row.size ? `${baseSku}-${row.size.toUpperCase()}` : baseSku);

    purchaseItems[editingPurchaseItemIndex] = {
      ...purchaseItems[editingPurchaseItemIndex],
      name,
      sku: rowSku,
      category,
      subcategory,
      brand,
      size: row.size.trim(),
      color,
      costPerUnit: rowPur,
      sellingPrice: rowSell,
      qty: rowQty,
      lowStockThreshold: threshold,
      status,
      imageUrl
    };
    showToast(`Updated "${name}" (${row.size}) in purchase list`, 'success');
  } else {
    // Add multiple size variants in one go!
    let addedCount = 0;
    modalSizeRows.forEach(row => {
      const rowSize = (row.size || '').trim();
      const rowSku = (row.sku || '').trim() || (rowSize ? `${baseSku}-${rowSize.toUpperCase()}` : baseSku);
      const rowPur = parseFloat(row.purchasePrice);
      const rowSell = parseFloat(row.sellingPrice);
      const rowQty = parseInt(row.qty, 10);

      // Check if SKU or (name + size) is already in purchaseItems
      const existingIdx = purchaseItems.findIndex(i =>
        (i.sku && rowSku && i.sku.toLowerCase() === rowSku.toLowerCase()) ||
        (i.name.toLowerCase() === name.toLowerCase() && (i.size || '').toLowerCase() === rowSize.toLowerCase())
      );

      if (existingIdx >= 0) {
        purchaseItems[existingIdx].qty = (parseInt(purchaseItems[existingIdx].qty, 10) || 0) + rowQty;
        purchaseItems[existingIdx].costPerUnit = rowPur;
        purchaseItems[existingIdx].sellingPrice = rowSell;
      } else {
        const matchingProd = (AppState.products || []).find(p =>
          (p.sku && rowSku && p.sku.toLowerCase() === rowSku.toLowerCase()) ||
          (p.name.toLowerCase() === name.toLowerCase() && (p.size || '').toLowerCase() === rowSize.toLowerCase())
        );

        purchaseItems.push({
          productId: matchingProd ? matchingProd.id : null,
          sku: rowSku,
          name: name,
          category,
          subcategory,
          brand,
          size: rowSize,
          color,
          costPerUnit: rowPur,
          sellingPrice: rowSell,
          qty: rowQty,
          lowStockThreshold: threshold,
          status,
          imageUrl,
          discount: 0
        });
      }
      addedCount++;
    });

    showToast(`Added ${addedCount} size variant(s) of "${name}" to purchase!`, 'success');
  }

  bootstrap.Modal.getInstance(document.getElementById('add-pur-full-product-modal'))?.hide();
  renderPurchaseItemsTable();
  updatePurchaseTotals();
  savePurchaseDraft();
}

function initPurchaseQuickAutosuggest() {
  const input = document.getElementById('pur-quick-prod-search');
  const box = document.getElementById('pur-quick-suggest-list');
  if (!input || !box) return;

  let activeIdx = -1;
  let currentItems = [];

  function highlightPurMatch(text, query) {
    if (!text) return '';
    const safe = sanitizeHTML(text);
    if (!query) return safe;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const regex = new RegExp(`(${escaped})`, 'gi');
      return safe.replace(regex, '<mark class="suggest-mark">$1</mark>');
    } catch (e) {
      return safe;
    }
  }

  function renderList() {
    const q = input.value.trim().toLowerCase();
    if (q.length < 1) {
      box.style.display = 'none';
      box.innerHTML = '';
      currentItems = [];
      activeIdx = -1;
      return;
    }

    const prods = (AppState.products || []).filter(p => {
      const name = (p.name || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const brand = (p.brand || p.brand_name || '').toLowerCase();
      return name.includes(q) || sku.includes(q) || brand.includes(q);
    });

    if (!prods.length) {
      box.style.display = 'none';
      box.innerHTML = '';
      currentItems = [];
      activeIdx = -1;
      return;
    }

    currentItems = prods.slice(0, 6);
    activeIdx = -1;

    box.innerHTML = `
      <div class="prod-suggest-header">
        <span><i class="bi bi-stars" style="color:var(--primary)"></i> Matching Products (${prods.length})</span>
        <span style="font-size:10px;text-transform:none">Click to add to purchase</span>
      </div>
      ${currentItems.map((p, idx) => `
        <div class="prod-suggest-item" data-idx="${idx}">
          <div class="prod-suggest-left">
            <div class="prod-suggest-title">
              <i class="bi bi-plus-circle text-primary" style="font-size:12px"></i>
              <span>${highlightPurMatch(p.name, q)}</span>
            </div>
            <div class="prod-suggest-meta">
              <span class="prod-suggest-badge brand">${sanitizeHTML(p.brand || 'Infinity')}</span>
              ${p.category ? `<span class="prod-suggest-badge cat">${sanitizeHTML(p.category)}</span>` : ''}
              <span>SKU: <strong>${sanitizeHTML(p.sku)}</strong></span>
              ${p.size ? `<span>Size: ${sanitizeHTML(p.size)}</span>` : ''}
            </div>
          </div>
          <div class="prod-suggest-right">
            <div class="prod-suggest-price">${formatINR(p.purchasePrice)}</div>
            <div class="prod-suggest-cost">Stock: ${p.stock}</div>
          </div>
        </div>
      `).join('')}
    `;

    box.style.display = 'block';

    box.querySelectorAll('.prod-suggest-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(el.dataset.idx, 10);
        if (currentItems[idx]) {
          addPurchaseItem(currentItems[idx].sku);
          input.value = '';
          box.style.display = 'none';
          showToast(`Added "${currentItems[idx].name}" to purchase!`, 'success');
        }
      });
    });
  }

  input.addEventListener('input', () => {
    if (!checkSupplierBeforeProductAction()) {
      input.value = '';
      input.blur();
      return;
    }
    renderList();
  });
  input.addEventListener('focus', () => {
    if (!checkSupplierBeforeProductAction()) {
      input.blur();
      return;
    }
    if (input.value.trim().length >= 1) renderList();
  });

  input.addEventListener('keydown', (e) => {
    if (box.style.display === 'none' || !currentItems.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % currentItems.length;
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + currentItems.length) % currentItems.length;
      updateHighlight();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && currentItems[activeIdx]) {
        e.preventDefault();
        addPurchaseItem(currentItems[activeIdx].sku);
        input.value = '';
        box.style.display = 'none';
        showToast(`Added "${currentItems[activeIdx].name}" to purchase!`, 'success');
      }
    } else if (e.key === 'Escape') {
      box.style.display = 'none';
      activeIdx = -1;
    }
  });

  function updateHighlight() {
    box.querySelectorAll('.prod-suggest-item').forEach((el, idx) => {
      if (idx === activeIdx) {
        el.classList.add('active');
        el.scrollIntoView({ block: 'nearest' });
      } else {
        el.classList.remove('active');
      }
    });
  }

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = 'none';
      activeIdx = -1;
    }
  });
}

function openPurchaseProductModal() {
  const catFilterEl = document.getElementById('pur-prod-cat-filter');
  if (catFilterEl) {
    catFilterEl.innerHTML = '<option value="">All Categories</option>' +
      (AppState.categories || []).map(c => `<option value="${sanitizeHTML(c.name)}">${sanitizeHTML(c.name)}</option>`).join('');
    catFilterEl.value = '';
  }
  renderPurchaseProductList('', '');
  const modal = new bootstrap.Modal(document.getElementById('add-pur-item-modal'));
  modal.show();

  const searchInput = document.getElementById('pur-prod-search');
  if (searchInput) searchInput.value = '';

  const handleFilterChange = () => {
    const q = document.getElementById('pur-prod-search')?.value.trim().toLowerCase() || '';
    const cat = document.getElementById('pur-prod-cat-filter')?.value || '';
    renderPurchaseProductList(q, cat);
  };

  document.getElementById('pur-prod-search')?.addEventListener('input', handleFilterChange);
  document.getElementById('pur-prod-cat-filter')?.addEventListener('change', handleFilterChange);
}

function renderPurchaseProductList(query, catFilter = '') {
  const list = document.getElementById('pur-prod-list');
  if (!list) return;
  let products = (AppState.products || []).filter(p => p.status === 'Active' || p.is_active != 0);
  if (query) products = products.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
  if (catFilter) products = products.filter(p => (p.category || p.category_name) === catFilter);

  if (!products.length) {
    list.innerHTML = `<div class="empty-state" style="padding:20px"><i class="bi bi-search"></i><p>No products found.</p></div>`;
    return;
  }

  list.innerHTML = products.map(p => {
    const catName = p.category || p.category_name || '';
    const subcatName = p.subcategory || p.subcategory_name || '';
    return `
    <div class="low-stock-item" style="cursor:pointer;padding:10px;border-radius:var(--radius-sm);transition:background 0.15s" 
         data-sku="${sanitizeHTML(p.sku)}" onmouseover="this.style.background='var(--border-light)'" onmouseout="this.style.background=''">
      <div>
        <div style="font-weight:600;font-size:13px">${sanitizeHTML(p.name)}</div>
        ${catName ? `
          <div style="font-size:11px;color:#0284c7;font-weight:600;margin:1px 0">
            <i class="bi bi-tag-fill" style="font-size:10px"></i> ${sanitizeHTML(catName)}${subcatName ? ' › ' + sanitizeHTML(subcatName) : ''}
          </div>
        ` : ''}
        <div style="font-size:11.5px;color:var(--text-muted)">${sanitizeHTML(p.sku)} · ${sanitizeHTML(p.brand || 'Infinity')} · ${sanitizeHTML(p.size || '—')}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;color:var(--primary)">${formatINR(p.purchasePrice || p.purchase_price || 0)}</div>
        <div style="font-size:11px;color:var(--text-muted)">Stock: ${p.stock}</div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-sku]').forEach(row => {
    row.addEventListener('click', () => {
      const sku = row.dataset.sku;
      addPurchaseItem(sku);
      bootstrap.Modal.getInstance(document.getElementById('add-pur-item-modal'))?.hide();
    });
  });
}

function addPurchaseItem(sku) {
  if (!checkSupplierBeforeProductAction()) return;

  const prod = (AppState.products || []).find(p => (p.sku || '').toLowerCase() === sku.toLowerCase());
  if (!prod) return;
  if (purchaseItems.find(i => (i.sku || '').toLowerCase() === sku.toLowerCase())) {
    showToast('Product already added. Update quantity in the table.', 'warning');
    return;
  }
  purchaseItems.push({
    productId: prod.id || null,
    sku: prod.sku,
    name: prod.name,
    category: prod.category || prod.category_name || '',
    subcategory: prod.subcategory || prod.subcategory_name || '',
    brand: prod.brand || prod.brand_name || '',
    size: prod.size || '',
    color: prod.color || '',
    qty: '', // Strictly blank by default! User must enter quantity manually!
    costPerUnit: parseFloat(prod.purchasePrice || prod.purchase_price || 0),
    sellingPrice: parseFloat(prod.sellingPrice || prod.selling_price || 0),
    lowStockThreshold: parseInt(prod.lowStockThreshold || prod.low_stock_threshold || 3, 10),
    status: prod.status || (prod.is_active === 0 ? 'Inactive' : 'Active'),
    imageUrl: prod.imageUrl || prod.image_url || '',
    discount: 0
  });
  renderPurchaseItemsTable();
  updatePurchaseTotals();
  savePurchaseDraft();
}

function renderPurchaseItemsTable() {
  const container = document.getElementById('purchase-items-container');
  if (!container) return;
  if (!purchaseItems.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:32px;border:1.5px dashed var(--border);border-radius:var(--radius)">
        <i class="bi bi-box-seam" style="font-size:2rem;color:var(--text-muted)"></i>
        <p style="margin-top:8px">No items added yet. Click <strong>"+ Add Product & Sizes"</strong> to enter products with multiple sizes (M, L, XL, etc.) in one go.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrapper">
      <table class="it-table">
        <thead>
          <tr>
            <th style="min-width:240px">Product Details</th>
            <th style="width:100px">Qty (Pcs) *</th>
            <th style="width:125px">Cost/Unit (₹) *</th>
            <th style="width:125px">Selling (₹) *</th>
            <th style="width:100px">Discount (₹)</th>
            <th style="width:120px">Line Total</th>
            <th style="width:120px;text-align:center">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${purchaseItems.map((item, idx) => {
            const isNat = item.qty && /^[1-9]\d*$/.test(String(item.qty).trim());
            const q = isNat ? parseInt(item.qty, 10) : 0;
            const cost = (item.costPerUnit !== '' && item.costPerUnit !== undefined && !isNaN(parseFloat(item.costPerUnit))) ? parseFloat(item.costPerUnit) : 0;
            const disc = parseFloat(item.discount) || 0;
            const lineTotal = (q > 0 && cost >= 0) ? Math.max(0, (q * cost) - disc) : 0;

            return `
            <tr>
              <td>
                <div style="font-weight:600;font-size:13.5px">${sanitizeHTML(item.name)}</div>
                ${(item.category || item.subcategory) ? `
                  <div style="font-size:11px;color:#0284c7;font-weight:600;margin:2px 0">
                    <i class="bi bi-tag-fill" style="font-size:10px"></i> ${sanitizeHTML(item.category || '')}${item.subcategory ? ' › ' + sanitizeHTML(item.subcategory) : ''}
                  </div>
                ` : ''}
                <div style="font-size:11.5px;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <span>SKU: <strong>${sanitizeHTML(item.sku)}</strong></span>
                  ${item.size ? `<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px;padding:2px 6px">Size: ${sanitizeHTML(item.size)}</span>` : ''}
                  ${item.brand ? `<span>· Brand: ${sanitizeHTML(item.brand)}</span>` : ''}
                  ${item.color ? `<span>· Color: ${sanitizeHTML(item.color)}</span>` : ''}
                </div>
              </td>
              <td>
                <input type="text" inputmode="numeric" class="form-control-it" 
                       value="${item.qty !== '' && item.qty !== undefined ? sanitizeHTML(String(item.qty)) : ''}" 
                       placeholder="Qty *" 
                       style="font-size:12.5px;padding:6px;width:100%"
                       onkeypress="return (event.charCode >= 48 && event.charCode <= 57)"
                       oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/^0+/, ''); updatePurItem(${idx}, 'qty', this.value)">
              </td>
              <td>
                <input type="number" class="form-control-it" 
                       value="${item.costPerUnit !== '' && item.costPerUnit !== undefined ? item.costPerUnit : ''}" 
                       min="0" step="0.01" placeholder="Rate *" style="font-size:12.5px;padding:6px;width:100%"
                       oninput="updatePurItem(${idx}, 'costPerUnit', this.value)">
              </td>
              <td>
                <input type="number" class="form-control-it" 
                       value="${item.sellingPrice !== '' && item.sellingPrice !== undefined ? item.sellingPrice : ''}" 
                       min="0" step="0.01" placeholder="Selling *" style="font-size:12.5px;padding:6px;width:100%"
                       oninput="updatePurItem(${idx}, 'sellingPrice', this.value)">
              </td>
              <td>
                <input type="number" class="form-control-it" 
                       value="${item.discount || 0}" 
                       min="0" step="0.01" style="font-size:12.5px;padding:6px;width:100%"
                       oninput="updatePurItem(${idx}, 'discount', this.value)">
              </td>
              <td>
                <strong style="color:var(--text);font-size:13px">${formatINR(lineTotal)}</strong>
              </td>
              <td style="text-align:center">
                <div style="display:flex;gap:4px;justify-content:center">
                  <button class="btn-sm-action" onclick="duplicatePurItemNewSize(${idx})" title="Add another size for this product" style="color:var(--primary);font-size:11px;font-weight:600">
                    <i class="bi bi-plus-square"></i> +Size
                  </button>
                  <button class="btn-sm-action" onclick="openAddPurchaseProductModal(${idx})" title="Edit Details"><i class="bi bi-pencil"></i></button>
                  <button class="btn-sm-action btn-sm-danger" onclick="removePurItem(${idx})" title="Remove"><i class="bi bi-trash"></i></button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function updatePurItem(idx, field, value) {
  const item = purchaseItems[idx];
  if (!item) return;

  if (field === 'qty') {
    const clean = String(value || '').trim();
    if (clean === '') {
      item.qty = '';
    } else if (!/^[1-9]\d*$/.test(clean)) {
      showToast('Quantity must be a natural number (1, 2, 3...)', 'warning');
      item.qty = '';
    } else {
      item.qty = parseInt(clean, 10);
    }
  } else if (field === 'costPerUnit') {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { showToast('Cost cannot be negative.', 'warning'); return; }
    item.costPerUnit = num;
  } else if (field === 'sellingPrice') {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { showToast('Selling price cannot be negative.', 'warning'); return; }
    item.sellingPrice = num;
  } else if (field === 'discount') {
    const num = parseFloat(value);
    if (isNaN(num) || num < 0) { showToast('Discount cannot be negative.', 'warning'); return; }
    item.discount = num;
  }

  // Update line total directly without losing input focus while typing
  const rows = document.querySelectorAll('#purchase-items-container tbody tr');
  if (rows && rows[idx]) {
    const isNat = item.qty && /^[1-9]\d*$/.test(String(item.qty).trim());
    const q = isNat ? parseInt(item.qty, 10) : 0;
    const cost = (item.costPerUnit !== '' && item.costPerUnit !== undefined && !isNaN(parseFloat(item.costPerUnit))) ? parseFloat(item.costPerUnit) : 0;
    const disc = parseFloat(item.discount) || 0;
    const lineTotal = (q > 0 && cost >= 0) ? Math.max(0, (q * cost) - disc) : 0;
    const lineTotalCell = rows[idx].cells[5];
    if (lineTotalCell) lineTotalCell.innerHTML = `<strong style="color:var(--text);font-size:13px">${formatINR(lineTotal)}</strong>`;
  }

  updatePurchaseTotals();
  savePurchaseDraft();
}

function removePurItem(idx) {
  purchaseItems.splice(idx, 1);
  renderPurchaseItemsTable();
  updatePurchaseTotals();
  savePurchaseDraft();
}

function calcPurchaseTotals() {
  const subtotal = purchaseItems.reduce((s, i) => {
    const isNat = i.qty && /^[1-9]\d*$/.test(String(i.qty).trim());
    const q = isNat ? parseInt(i.qty, 10) : 0;
    const cost = (i.costPerUnit !== '' && i.costPerUnit !== undefined && !isNaN(parseFloat(i.costPerUnit))) ? parseFloat(i.costPerUnit) : 0;
    return s + (q * cost);
  }, 0);
  const discount  = purchaseItems.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0);
  const taxable   = Math.max(0, subtotal - discount);
  const gstRate   = parseFloat(document.getElementById('pur-gst-rate')?.value || 18);
  const gstAmt    = purchaseGstEnabled ? parseFloat((taxable * gstRate / 100).toFixed(2)) : 0;
  const total     = taxable + gstAmt;
  return { subtotal, discount, taxable, gstAmt, total, gstRate };
}

function updatePurchaseTotals() {
  const t = calcPurchaseTotals();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('pur-subtotal',  formatINR(t.subtotal));
  set('pur-discount',  '-' + formatINR(t.discount));
  set('pur-total',     formatINR(t.total));
  if (purchaseGstEnabled) {
    set('pur-gst-label', `GST (${t.gstRate}%)`);
    set('pur-gst-amt',   formatINR(t.gstAmt));
  }
  // Auto-fill amount paid if status is Paid
  const status = document.getElementById('pur-payment-status')?.value;
  const amtEl  = document.getElementById('pur-amount-paid');
  if (amtEl && status === 'Paid') amtEl.value = t.total.toFixed(2);
}

function savePurchase() {
  // 1. Supplier Validation: Strictly required
  const supplierSelect = document.getElementById('pur-supplier-select');
  const supplierId     = supplierSelect?.value || null;
  const supplierName   = document.getElementById('pur-supplier-name')?.value.trim();
  const supplierPhone  = document.getElementById('pur-supplier-phone')?.value.trim();
  const supplierAddr   = document.getElementById('pur-supplier-address')?.value.trim();
  const date           = document.getElementById('pur-date')?.value;

  const setErr = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
  setErr('err-supplier', ''); setErr('err-date', ''); setErr('err-items', '');

  let valid = true;

  if (!supplierName) {
    setErr('err-supplier', 'Bina supplier choose kiye purchase save nahi ho sakta. Please select or enter a supplier.');
    document.getElementById('pur-supplier-name')?.classList.add('is-invalid');
    valid = false;
  }
  if (!date) {
    setErr('err-date', 'Please select a date.');
    valid = false;
  }
  if (!purchaseItems.length) {
    setErr('err-items', 'Please add at least one product.');
    valid = false;
  }

  // 2. Validate all items: Quantity must be entered manually and must be a natural number (1, 2, 3...)
  for (let i = 0; i < purchaseItems.length; i++) {
    const it = purchaseItems[i];
    const qtyStr = String(it.qty !== undefined ? it.qty : '').trim();
    if (!qtyStr || !/^[1-9]\d*$/.test(qtyStr)) {
      setErr('err-items', `Product "${it.name}${it.size ? ' (' + it.size + ')' : ''}": Quantity manually enter karna compulsory hai (Only natural numbers 1, 2, 3...).`);
      showToast(`Quantity manually enter karna compulsory hai for "${it.name}" (Natural number only)!`, 'warning');
      valid = false;
      break;
    }
    const cost = parseFloat(it.costPerUnit);
    if (it.costPerUnit === '' || it.costPerUnit === undefined || isNaN(cost) || cost < 0) {
      setErr('err-items', `Product "${it.name}${it.size ? ' (' + it.size + ')' : ''}": Purchase rate manually enter karna compulsory hai.`);
      showToast(`Purchase rate required for "${it.name}"!`, 'warning');
      valid = false;
      break;
    }
  }

  if (!valid) {
    showToast('Please fix the errors above before saving purchase.', 'danger');
    return;
  }

  const totals    = calcPurchaseTotals();
  const payStatus = document.getElementById('pur-payment-status')?.value || 'Paid';
  const amtPaid   = parseFloat(document.getElementById('pur-amount-paid')?.value || 0) || (payStatus === 'Paid' ? totals.total : 0);
  const supInv    = document.getElementById('pur-supplier-invoice')?.value.trim() || '';
  const notes     = document.getElementById('pur-notes')?.value.trim() || '';

  showConfirm(
    'Save Purchase?',
    `${purchaseItems.length} item(s) across variants, Total: ${formatINR(totals.total)}. Inventory stock will be updated in the database.`,
    async () => {
      const payload = {
        supplier_id: supplierId,
        supplier_name: supplierName,
        supplier_phone: supplierPhone,
        supplier_address: supplierAddr,
        supplier_invoice_no: supInv,
        date: date,
        gst_enabled: purchaseGstEnabled ? 1 : 0,
        gst_rate: totals.gstRate,
        subtotal: totals.subtotal,
        gst_amount: totals.gstAmt,
        total_amount: totals.total,
        amount_paid: amtPaid,
        balance_due: Math.max(0, totals.total - amtPaid),
        payment_status: payStatus,
        notes: notes,
        items: purchaseItems.map(i => ({
          product_id: i.productId || null,
          sku: i.sku,
          name: i.name,
          category: i.category,
          subcategory: i.subcategory,
          brand: i.brand,
          size: i.size,
          color: i.color,
          qty: i.qty,
          cost_price: i.costPerUnit,
          selling_price: i.sellingPrice || 0,
          low_stock_threshold: i.lowStockThreshold || 3,
          status: i.status || 'Active',
          image_url: i.imageUrl || '',
          discount: i.discount || 0,
          line_total: (i.qty * i.costPerUnit) - (i.discount || 0)
        }))
      };

      const res = await apiPost('api/purchases/index.php', payload);
      if (res && res.success) {
        showToast(`Purchase ${res.purchase_no} saved! Inventory updated for all variants.`, 'success', 4000);
        clearPurchaseDraft();
        purchaseItems = [];

        // Refresh products and suppliers in AppState so inventory and purchases stay synced
        const [pRes, sRes] = await Promise.all([
          apiGet('api/products/index.php'),
          apiGet('api/suppliers/index.php')
        ]);
        if (pRes?.success && Array.isArray(pRes.data)) AppState.products = pRes.data;
        if (sRes?.success && Array.isArray(sRes.data)) AppState.suppliers = sRes.data;

        navigateTo('purchase-history');
      } else {
        showToast(res?.error || 'Failed to save purchase.', 'danger');
      }
    },
    'Save Purchase',
    'btn-primary-it'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE HISTORY
// ─────────────────────────────────────────────────────────────────────────────
let phFilters = { search: '', supplier: '', status: '', dateFrom: '', dateTo: '' };
let phPage = 1;
const PH_PER_PAGE = 10;

async function renderPurchaseHistory(container) {
  renderLoadingSpinner(container);
  const res = await apiGet('api/purchases/index.php');
  if (res.success && Array.isArray(res.data)) {
    AppState.purchases = res.data.map(p => ({
      id: p.id,
      purchaseInvoice: p.purchase_no || p.purchase_invoice || p.purchaseInvoice,
      supplierInvoice: p.supplier_invoice_no || p.supplier_invoice || p.supplierInvoice,
      supplierId: p.supplier_id || p.supplierId,
      supplierName: p.supplier_name || p.supplierName,
      supplierPhone: p.supplier_phone || '',
      supplierAddress: p.supplier_address || '',
      date: p.date,
      items: (p.items || []).map(i => ({
        sku: i.sku,
        name: i.name || i.product_name,
        size: i.size || '',
        color: i.color || '',
        qty: parseFloat(i.qty || 1),
        costPerUnit: parseFloat(i.cost_price || i.cost_per_unit || i.costPerUnit || 0),
        sellingPrice: parseFloat(i.selling_price || 0),
        discount: parseFloat(i.discount || 0),
        lineTotal: parseFloat(i.line_total || i.lineTotal || 0)
      })),
      subtotal: parseFloat(p.subtotal || 0),
      discount: parseFloat(p.discount || 0),
      gstEnabled: !!p.gst_enabled,
      gstRate: parseFloat(p.gst_rate || 0),
      gstAmount: parseFloat(p.gst_amount || 0),
      totalAmount: parseFloat(p.total_amount || 0),
      paymentStatus: p.payment_status || p.paymentStatus,
      paymentMethod: p.payment_method || p.paymentMethod,
      amountPaid: parseFloat(p.amount_paid || 0),
      balance: parseFloat(p.balance_due || p.balance || 0),
      notes: p.notes || ''
    }));
  }

  const suppliers = [...new Set(AppState.purchases.map(p => p.supplierName).filter(Boolean))];
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Purchase History</h1>
        <div class="breadcrumb-text">All purchase records from database</div>
      </div>
      <div class="page-header-right">
        <button class="btn-primary-it" onclick="navigateTo('purchases')"><i class="bi bi-plus"></i> New Purchase</button>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="ph-search" placeholder="🔍 Search invoice, supplier...">
          <select class="form-control-it" id="ph-supplier">
            <option value="">All Suppliers</option>
            ${suppliers.map(s => `<option value="${sanitizeHTML(s)}">${sanitizeHTML(s)}</option>`).join('')}
          </select>
          <select class="form-control-it" id="ph-status">
            <option value="">All Statuses</option>
            <option>Paid</option><option>Partial</option><option>Unpaid</option>
          </select>
          <input type="date" class="form-control-it" id="ph-date-from" title="From date">
          <input type="date" class="form-control-it" id="ph-date-to" title="To date">
          <button class="btn-outline-it" id="ph-export-btn" style="white-space:nowrap"><i class="bi bi-download"></i> CSV</button>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead>
            <tr>
              <th>Invoice No.</th><th>Date</th><th>Supplier</th><th>Supplier Address</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="ph-tbody"></tbody>
        </table>
      </div>
      <div class="pagination-bar">
        <span id="ph-showing">Showing 0 of 0</span>
        <div class="pagination-controls" id="ph-pagination"></div>
      </div>
    </div>
  </div>`;

  phFilters = { search: '', supplier: '', status: '', dateFrom: '', dateTo: '' };
  phPage = 1;
  renderPHTable();

  ['ph-search','ph-supplier','ph-status','ph-date-from','ph-date-to'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      phFilters.search    = document.getElementById('ph-search')?.value.toLowerCase() || '';
      phFilters.supplier  = document.getElementById('ph-supplier')?.value || '';
      phFilters.status    = document.getElementById('ph-status')?.value || '';
      phFilters.dateFrom  = document.getElementById('ph-date-from')?.value || '';
      phFilters.dateTo    = document.getElementById('ph-date-to')?.value || '';
      phPage = 1;
      renderPHTable();
    });
  });
  document.getElementById('ph-export-btn')?.addEventListener('click', exportPHCSV);
}

function getFilteredPH() {
  return AppState.purchases.filter(p => {
    if (phFilters.search && 
        !p.purchaseInvoice.toLowerCase().includes(phFilters.search) && 
        !p.supplierName.toLowerCase().includes(phFilters.search) && 
        !p.supplierInvoice.toLowerCase().includes(phFilters.search) &&
        !(p.supplierAddress || '').toLowerCase().includes(phFilters.search)) return false;
    if (phFilters.supplier && p.supplierName !== phFilters.supplier) return false;
    if (phFilters.status   && p.paymentStatus !== phFilters.status) return false;
    if (phFilters.dateFrom && p.date < phFilters.dateFrom) return false;
    if (phFilters.dateTo   && p.date > phFilters.dateTo) return false;
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date));
}

function renderPHTable() {
  const tbody = document.getElementById('ph-tbody');
  if (!tbody) return;
  const all = getFilteredPH();
  const totalPages = Math.ceil(all.length / PH_PER_PAGE) || 1;
  if (phPage > totalPages) phPage = totalPages;
  const paged = all.slice((phPage-1)*PH_PER_PAGE, phPage*PH_PER_PAGE);

  const showEl = document.getElementById('ph-showing');
  if (showEl) showEl.textContent = `Showing ${paged.length} of ${all.length} records`;

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="padding:40px"><i class="bi bi-truck"></i><h4>No Purchase Records</h4></div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(p => `
      <tr>
        <td><strong>${sanitizeHTML(p.purchaseInvoice)}</strong><br><small style="color:var(--text-muted)">${sanitizeHTML(p.supplierInvoice || '—')}</small></td>
        <td>${formatDate(p.date)}</td>
        <td>
          <strong>${sanitizeHTML(p.supplierName)}</strong>
          ${p.supplierPhone ? `<br><small style="color:var(--text-muted)"><i class="bi bi-telephone"></i> ${sanitizeHTML(p.supplierPhone)}</small>` : ''}
        </td>
        <td>
          <span style="font-size:12px;color:var(--text);display:inline-block;max-width:240px;line-height:1.4">
            ${sanitizeHTML(p.supplierAddress || '—')}
          </span>
        </td>
        <td><strong>${formatINR(p.totalAmount)}</strong></td>
        <td>${formatINR(p.amountPaid)}</td>
        <td>${paymentBadge(p.paymentStatus)}</td>
        <td>
          <button class="btn-sm-action" onclick="viewPurchaseDetail('${sanitizeHTML(p.id)}')"><i class="bi bi-eye"></i> View</button>
          <button class="btn-sm-action" onclick="printPurchase('${sanitizeHTML(p.id)}')"><i class="bi bi-printer"></i></button>
        </td>
      </tr>`).join('');
  }

  // Pagination
  const pgEl = document.getElementById('ph-pagination');
  if (pgEl) {
    pgEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === phPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => { phPage = i; renderPHTable(); });
      pgEl.appendChild(btn);
    }
  }
}

async function viewPurchaseDetail(id) {
  let p = AppState.purchases.find(x => String(x.id) === String(id));
  try {
    const res = await apiGet('api/purchases/item.php?id=' + encodeURIComponent(id));
    if (res.success && res.data) {
      const d = res.data;
      p = {
        id: d.id,
        purchaseInvoice: d.purchase_no || d.purchase_invoice || d.purchaseInvoice,
        supplierInvoice: d.supplier_invoice_no || d.supplier_invoice || d.supplierInvoice,
        supplierName: d.supplier_name || d.supplierName,
        supplierPhone: d.supplier_phone || '',
        supplierAddress: d.supplier_address || '',
        date: d.date,
        items: (d.items || []).map(i => ({
          sku: i.sku,
          name: i.name || i.product_name,
          category: i.category || i.category_name || '',
          subcategory: i.subcategory || i.subcategory_name || '',
          brand: i.brand || i.brand_name || '',
          size: i.size || '',
          color: i.color || '',
          qty: parseFloat(i.qty || 1),
          costPerUnit: parseFloat(i.cost_price || i.cost_per_unit || i.costPerUnit || 0),
          sellingPrice: parseFloat(i.selling_price || 0),
          discount: parseFloat(i.discount || 0),
          lineTotal: parseFloat(i.line_total || i.lineTotal || 0)
        })),
        subtotal: parseFloat(d.subtotal || 0),
        discount: parseFloat(d.discount || d.total_discount || 0),
        gstEnabled: !!d.gst_enabled,
        gstRate: parseFloat(d.gst_rate || 0),
        gstAmount: parseFloat(d.gst_amount || 0),
        totalAmount: parseFloat(d.total_amount || 0),
        paymentStatus: d.payment_status || d.paymentStatus,
        paymentMethod: d.payment_method || d.paymentMethod,
        amountPaid: parseFloat(d.amount_paid || 0),
        balance: parseFloat(d.balance_due || d.balance || 0),
        notes: d.notes || ''
      };
    }
  } catch (err) {
    console.error('Failed to fetch purchase details:', err);
  }

  if (!p) {
    showToast('Purchase record not found', 'danger');
    return;
  }
  const body = document.getElementById('view-purchase-body');
  if (!body) return;

  const bName = AppState.settings?.businessName || 'Infinity Traders';
  const bAddr = AppState.settings?.businessAddress || '';

  body.innerHTML = `
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="invoice-company">
          <h2>${sanitizeHTML(bName)}</h2>
          <p style="font-size:12px;color:var(--text-muted)">${sanitizeHTML(bAddr)}</p>
        </div>
        <div class="invoice-meta">
          <h3 style="font-size:20px">PURCHASE ORDER</h3>
          <p class="invoice-no">${sanitizeHTML(p.purchaseInvoice)}</p>
          <p>Date: ${formatDate(p.date)}</p>
        </div>
      </div>
      <div class="invoice-parties">
        <div class="invoice-party">
          <h5>Supplier</h5>
          <p>
            <strong>${sanitizeHTML(p.supplierName)}</strong>
            ${p.supplierPhone ? `<br><i class="bi bi-telephone"></i> ${sanitizeHTML(p.supplierPhone)}` : ''}
            ${p.supplierAddress ? `<br><i class="bi bi-geo-alt"></i> ${sanitizeHTML(p.supplierAddress)}` : ''}
            <br>Supplier Invoice: ${sanitizeHTML(p.supplierInvoice || '—')}
          </p>
        </div>
        <div class="invoice-party">
          <h5>Payment</h5>
          <p>
            ${paymentBadge(p.paymentStatus)}<br>
            Paid: ${formatINR(p.amountPaid)}<br>
            Balance: ${formatINR(p.balance)}
          </p>
        </div>
      </div>
      <table class="invoice-items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th>SKU</th>
            <th>Size</th>
            <th>Color</th>
            <th>Qty</th>
            <th>Cost/Unit</th>
            <th>Selling Price</th>
            <th>Discount</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${p.items.map((item,i) => `<tr>
            <td>${i+1}</td>
            <td>
              <div style="font-weight:600">${sanitizeHTML(item.name)}</div>
              ${(item.category || item.subcategory) ? `
                <div style="font-size:10.5px;color:#0284c7;font-weight:600">
                  ${sanitizeHTML(item.category || '')}${item.subcategory ? ' › ' + sanitizeHTML(item.subcategory) : ''}
                </div>
              ` : ''}
            </td>
            <td><small>${sanitizeHTML(item.sku)}</small></td>
            <td>${sanitizeHTML(item.size || '—')}</td>
            <td>${sanitizeHTML(item.color || '—')}</td>
            <td>${item.qty}</td>
            <td>${formatINR(item.costPerUnit)}</td>
            <td>${item.sellingPrice > 0 ? formatINR(item.sellingPrice) : '—'}</td>
            <td>${item.discount > 0 ? formatINR(item.discount) : '—'}</td>
            <td><strong>${formatINR((item.qty * item.costPerUnit) - item.discount)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatINR(p.subtotal)}</span></div>
        ${p.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatINR(p.discount)}</span></div>` : ''}
        ${p.gstEnabled ? `<div class="total-row"><span>GST (${p.gstRate}%)</span><span>${formatINR(p.gstAmount)}</span></div>` : ''}
        <div class="total-row grand"><span>TOTAL</span><span>${formatINR(p.totalAmount)}</span></div>
      </div>
      ${p.notes ? `<p style="margin-top:14px;font-size:12.5px;color:var(--text-muted)"><strong>Notes:</strong> ${sanitizeHTML(p.notes)}</p>` : ''}
    </div>`;

  const modal = new bootstrap.Modal(document.getElementById('view-purchase-modal'));
  modal.show();
  document.getElementById('btn-print-purchase').onclick = () => {
    const container = document.querySelector('#view-purchase-modal .invoice-container');
    printInvoiceContent(container ? container.outerHTML : document.getElementById('view-purchase-body').innerHTML);
  };
}

async function printPurchase(id) {
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write('<div style="font-family:sans-serif;padding:50px;text-align:center;color:#64748b;font-size:16px"><div style="display:inline-block;width:32px;height:32px;border:3px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px"></div><br>Preparing purchase order for printing...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>');
  }

  let p = AppState.purchases.find(x => String(x.id) === String(id));
  if (!p || !p.items || !p.items.length) {
    const res = await apiGet(`api/purchases/item.php?id=${id}`);
    if (res && res.success && res.data) {
      const d = res.data;
      p = {
        id: d.id,
        purchaseInvoice: d.purchase_no || d.purchase_invoice,
        supplierInvoice: d.supplier_invoice_no || d.supplier_invoice,
        date: d.date,
        supplierName: d.supplier_name,
        supplierPhone: d.supplier_phone || '',
        supplierAddress: d.supplier_address || '',
        paymentStatus: d.payment_status,
        amountPaid: parseFloat(d.amount_paid || 0),
        balance: parseFloat(d.balance_due || 0),
        subtotal: parseFloat(d.subtotal || 0),
        discount: parseFloat(d.total_discount || d.discount || 0),
        gstEnabled: !!d.gst_enabled,
        gstRate: parseFloat(d.gst_rate || 0),
        gstAmount: parseFloat(d.gst_amount || 0),
        totalAmount: parseFloat(d.total_amount || 0),
        notes: d.notes || '',
        items: (d.items || []).map(i => ({
          name: i.product_name || i.name,
          sku: i.sku || '',
          size: i.size || '',
          color: i.color || '',
          qty: i.qty,
          costPerUnit: parseFloat(i.cost_price || i.unit_cost || 0),
          sellingPrice: parseFloat(i.selling_price || 0),
          discount: parseFloat(i.discount || 0),
          category: i.category_name || i.category || '',
          subcategory: i.subcategory_name || i.subcategory || ''
        }))
      };
    }
  }

  if (!p) {
    if (printWin) printWin.close();
    showToast('Failed to load purchase details for printing', 'danger');
    return;
  }

  const bName = AppState.settings?.businessName || 'Infinity Traders';
  const bAddr = AppState.settings?.businessAddress || '';

  const html = `
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="invoice-company">
          <h2>${sanitizeHTML(bName)}</h2>
          <p style="font-size:12px;color:var(--text-muted)">${sanitizeHTML(bAddr)}</p>
        </div>
        <div class="invoice-meta">
          <h3 style="font-size:20px">PURCHASE ORDER</h3>
          <p class="invoice-no">${sanitizeHTML(p.purchaseInvoice)}</p>
          <p>Date: ${formatDate(p.date)}</p>
        </div>
      </div>
      <div class="invoice-parties">
        <div class="invoice-party">
          <h5>Supplier</h5>
          <p>
            <strong>${sanitizeHTML(p.supplierName)}</strong>
            ${p.supplierPhone ? `<br><i class="bi bi-telephone"></i> ${sanitizeHTML(p.supplierPhone)}` : ''}
            ${p.supplierAddress ? `<br><i class="bi bi-geo-alt"></i> ${sanitizeHTML(p.supplierAddress)}` : ''}
            <br>Supplier Invoice: ${sanitizeHTML(p.supplierInvoice || '—')}
          </p>
        </div>
        <div class="invoice-party">
          <h5>Payment</h5>
          <p>
            ${paymentBadge(p.paymentStatus)}<br>
            Paid: ${formatINR(p.amountPaid)}<br>
            Balance: ${formatINR(p.balance)}
          </p>
        </div>
      </div>
      <table class="invoice-items-table">
        <thead>
          <tr>
            <th class="col-hide-thermal">#</th>
            <th>Product</th>
            <th class="col-hide-thermal">SKU</th>
            <th class="col-hide-thermal">Size</th>
            <th class="col-hide-thermal">Color</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate">Cost/Unit</th>
            <th class="col-rate">Selling Price</th>
            <th class="col-hide-thermal">Discount</th>
            <th class="col-total">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${p.items.map((item,i) => `<tr>
            <td class="col-hide-thermal">${i+1}</td>
            <td class="col-product">
              <div style="font-weight:600">${sanitizeHTML(item.name)}</div>
              <div class="item-thermal-meta">${item.sku ? `<span>SKU: ${sanitizeHTML(item.sku)}</span>` : ''}</div>
              ${(item.category || item.subcategory) ? `
                <div class="col-hide-thermal" style="font-size:10.5px;color:#0284c7;font-weight:600">
                  ${sanitizeHTML(item.category || '')}${item.subcategory ? ' › ' + sanitizeHTML(item.subcategory) : ''}
                </div>
              ` : ''}
            </td>
            <td class="col-hide-thermal"><small>${sanitizeHTML(item.sku)}</small></td>
            <td class="col-hide-thermal">${sanitizeHTML(item.size || '—')}</td>
            <td class="col-hide-thermal">${sanitizeHTML(item.color || '—')}</td>
            <td class="col-qty">${item.qty}</td>
            <td class="col-rate">${formatINR(item.costPerUnit)}</td>
            <td class="col-rate">${item.sellingPrice > 0 ? formatINR(item.sellingPrice) : '—'}</td>
            <td class="col-hide-thermal">${item.discount > 0 ? formatINR(item.discount) : '—'}</td>
            <td class="col-total"><strong>${formatINR((item.qty * item.costPerUnit) - item.discount)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatINR(p.subtotal)}</span></div>
        ${p.discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatINR(p.discount)}</span></div>` : ''}
        ${p.gstEnabled ? `<div class="total-row"><span>GST (${p.gstRate}%)</span><span>${formatINR(p.gstAmount)}</span></div>` : ''}
        <div class="total-row grand"><span>TOTAL</span><span>${formatINR(p.totalAmount)}</span></div>
      </div>
      ${p.notes ? `<p style="margin-top:14px;font-size:12.5px;color:var(--text-muted)"><strong>Notes:</strong> ${sanitizeHTML(p.notes)}</p>` : ''}
    </div>`;

  printInvoiceContent(html, `Purchase Order - ${p.purchaseInvoice}`, printWin);
}

function exportPHCSV() {
  const data = getFilteredPH();
  exportCSV('purchase_history.csv',
    ['Invoice No.', 'Supplier Invoice', 'Date', 'Supplier', 'Contact', 'Supplier Address', 'Subtotal', 'GST', 'Total', 'Paid', 'Balance', 'Status'],
    data.map(p => [
      p.purchaseInvoice,
      p.supplierInvoice || '',
      p.date,
      p.supplierName,
      p.supplierPhone || '',
      p.supplierAddress || '',
      p.subtotal,
      p.gstAmount,
      p.totalAmount,
      p.amountPaid,
      p.balance,
      p.paymentStatus
    ])
  );
}

// Attach globally for inline event handlers
window.addPurSizeQuick = addPurSizeQuick;
window.addCustomSizeRow = addCustomSizeRow;
window.updateModalSizeRow = updateModalSizeRow;
window.removeModalSizeRow = removeModalSizeRow;
window.duplicatePurItemNewSize = duplicatePurItemNewSize;
window.openAddPurchaseProductModal = openAddPurchaseProductModal;
window.updatePurItem = updatePurItem;
window.removePurItem = removePurItem;
window.viewPurchaseDetail = viewPurchaseDetail;
window.printPurchase = printPurchase;
