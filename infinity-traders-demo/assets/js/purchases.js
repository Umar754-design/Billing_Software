/**
 * INFINITY TRADERS — Purchases Module (purchases.js)
 * ====================================================
 * Handles purchase entry form, purchase history table,
 * purchase details modal, and stock update on save.
 */

'use strict';

// ── Purchase Form State ───────────────────────────────────────────────────────
let purchaseItems = [];
let purchaseGstEnabled = false;

function renderPurchases(container) {
  const suppliers = AppState.suppliers.filter(s => s.status === 'Active');
  const products  = AppState.products;

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>New Purchase Entry</h1>
        <div class="breadcrumb-text">Record a new stock purchase from a supplier</div>
      </div>
    </div>
    <div class="demo-banner">
      <i class="bi bi-info-circle-fill"></i>
      <span>Purchases saved here are temporary (in-memory). Data resets on page refresh.</span>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title"><i class="bi bi-cart-plus"></i>Purchase Details</span></div>
      <div class="card-body">
        <div class="row g-3 mb-3">
          <div class="col-md-4">
            <label class="form-label">Supplier *</label>
            <select class="form-control-it" id="pur-supplier" required>
              <option value="">— Select Supplier —</option>
              ${suppliers.map(s => `<option value="${sanitizeHTML(s.id)}">${sanitizeHTML(s.name)}</option>`).join('')}
            </select>
            <div class="form-error-msg" id="err-supplier"></div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Supplier Invoice No.</label>
            <input type="text" class="form-control-it" id="pur-supplier-invoice" placeholder="SUP-INV-001">
          </div>
          <div class="col-md-4">
            <label class="form-label">Purchase Date *</label>
            <input type="date" class="form-control-it" id="pur-date" value="${todayISO()}" required>
            <div class="form-error-msg" id="err-date"></div>
          </div>
        </div>

        <!-- Products Section -->
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
            <label class="form-label" style="margin:0">Products *</label>
            <button class="btn-outline-it" id="btn-add-pur-item" style="padding:6px 14px;font-size:12.5px">
              <i class="bi bi-plus"></i> Add Product
            </button>
          </div>
          <div id="purchase-items-container">
            <div class="empty-state" style="padding:30px;border:1.5px dashed var(--border);border-radius:var(--radius)">
              <i class="bi bi-box-seam"></i><p>Click "Add Product" to begin adding items.</p>
            </div>
          </div>
          <div class="form-error-msg" id="err-items"></div>
        </div>

        <!-- GST Toggle -->
        <div class="gst-toggle-wrap" style="margin-bottom:16px">
          <div class="form-check form-switch mb-0">
            <input class="form-check-input" type="checkbox" role="switch" id="pur-gst-toggle">
          </div>
          <label for="pur-gst-toggle" style="font-size:13px;font-weight:600;cursor:pointer">
            <i class="bi bi-percent"></i> Include GST
          </label>
          <select class="form-control-it" id="pur-gst-rate" style="width:90px;font-size:12.5px;padding:5px 10px;display:none">
            <option value="5">5%</option>
            <option value="12">12%</option>
            <option value="18" selected>18%</option>
            <option value="28">28%</option>
          </select>
          <small style="color:var(--text-muted);font-size:11px">Sample rates only</small>
        </div>

        <!-- Totals -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
          <div style="background:var(--bg);border:1px solid var(--border-light);border-radius:var(--radius);padding:18px;min-width:300px">
            <div class="total-line"><span>Subtotal</span><span id="pur-subtotal">₹0.00</span></div>
            <div class="total-line"><span>Discount</span><span id="pur-discount">-₹0.00</span></div>
            <div class="total-line" id="pur-gst-row" style="display:none"><span id="pur-gst-label">GST (18%)</span><span id="pur-gst-amt">₹0.00</span></div>
            <div class="total-line grand-total"><span>Total Amount</span><span id="pur-total">₹0.00</span></div>
          </div>
        </div>

        <!-- Payment & Notes -->
        <div class="row g-3 mb-3">
          <div class="col-md-3">
            <label class="form-label">Payment Status *</label>
            <select class="form-control-it" id="pur-payment-status">
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label">Amount Paid (₹)</label>
            <input type="number" class="form-control-it" id="pur-amount-paid" placeholder="0.00" min="0" step="0.01">
          </div>
          <div class="col-md-6">
            <label class="form-label">Notes</label>
            <input type="text" class="form-control-it" id="pur-notes" placeholder="Optional notes...">
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

  <!-- Product selection modal for purchase -->
  <div class="modal fade" id="add-pur-item-modal" tabindex="-1" aria-labelledby="add-pur-item-title" aria-hidden="true">
    <div class="modal-dialog modal-md">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="add-pur-item-title"><i class="bi bi-plus-circle"></i> Add Product to Purchase</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <input type="search" class="form-control-it" id="pur-prod-search" placeholder="Search product by name or SKU...">
          </div>
          <div id="pur-prod-list" style="max-height:300px;overflow-y:auto"></div>
        </div>
      </div>
    </div>
  </div>`;

  purchaseItems = [];
  purchaseGstEnabled = false;
  initPurchaseEvents();
}

function initPurchaseEvents() {
  document.getElementById('pur-gst-toggle')?.addEventListener('change', e => {
    purchaseGstEnabled = e.target.checked;
    const rateEl = document.getElementById('pur-gst-rate');
    const rowEl  = document.getElementById('pur-gst-row');
    if (rateEl) rateEl.style.display = purchaseGstEnabled ? 'block' : 'none';
    if (rowEl)  rowEl.style.display  = purchaseGstEnabled ? 'flex' : 'none';
    updatePurchaseTotals();
  });
  document.getElementById('pur-gst-rate')?.addEventListener('change', updatePurchaseTotals);

  document.getElementById('btn-add-pur-item')?.addEventListener('click', () => {
    openPurchaseProductModal();
  });

  document.getElementById('btn-save-purchase')?.addEventListener('click', savePurchase);
  document.getElementById('btn-cancel-purchase')?.addEventListener('click', () => {
    showConfirm('Cancel Purchase?', 'Discard all entered purchase data?', () => navigateTo('purchase-history'));
  });

  // Payment status auto-fill amount
  document.getElementById('pur-payment-status')?.addEventListener('change', e => {
    const totals = calcPurchaseTotals();
    const amtEl = document.getElementById('pur-amount-paid');
    if (!amtEl) return;
    if (e.target.value === 'Paid') amtEl.value = totals.total.toFixed(2);
    else if (e.target.value === 'Unpaid') amtEl.value = '0.00';
  });
}

function openPurchaseProductModal() {
  renderPurchaseProductList('');
  const modal = new bootstrap.Modal(document.getElementById('add-pur-item-modal'));
  modal.show();

  document.getElementById('pur-prod-search').value = '';
  document.getElementById('pur-prod-search').addEventListener('input', e => {
    renderPurchaseProductList(e.target.value.trim().toLowerCase());
  });
}

function renderPurchaseProductList(query) {
  const list = document.getElementById('pur-prod-list');
  if (!list) return;
  let products = AppState.products.filter(p => p.status === 'Active');
  if (query) products = products.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));

  if (!products.length) {
    list.innerHTML = `<div class="empty-state" style="padding:20px"><i class="bi bi-search"></i><p>No products found.</p></div>`;
    return;
  }

  list.innerHTML = products.map(p => `
    <div class="low-stock-item" style="cursor:pointer;padding:10px;border-radius:var(--radius-sm);transition:background 0.15s" 
         data-sku="${sanitizeHTML(p.sku)}" onmouseover="this.style.background='var(--border-light)'" onmouseout="this.style.background=''">
      <div>
        <div style="font-weight:600;font-size:13px">${sanitizeHTML(p.name)}</div>
        <div style="font-size:11.5px;color:var(--text-muted)">${sanitizeHTML(p.sku)} · ${sanitizeHTML(p.brand)} · ${sanitizeHTML(p.size)}</div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;color:var(--primary)">${formatINR(p.purchasePrice)}</div>
        <div style="font-size:11px;color:var(--text-muted)">Stock: ${p.stock}</div>
      </div>
    </div>`).join('');

  list.querySelectorAll('[data-sku]').forEach(row => {
    row.addEventListener('click', () => {
      const sku = row.dataset.sku;
      addPurchaseItem(sku);
      bootstrap.Modal.getInstance(document.getElementById('add-pur-item-modal'))?.hide();
    });
  });
}

function addPurchaseItem(sku) {
  const prod = AppState.products.find(p => p.sku === sku);
  if (!prod) return;
  if (purchaseItems.find(i => i.sku === sku)) {
    showToast('Product already added. Update quantity in the form.', 'warning');
    return;
  }
  purchaseItems.push({
    sku: prod.sku, name: prod.name, size: prod.size, color: prod.color,
    qty: 1, costPerUnit: prod.purchasePrice, discount: 0
  });
  renderPurchaseItemsTable();
  updatePurchaseTotals();
}

function renderPurchaseItemsTable() {
  const container = document.getElementById('purchase-items-container');
  if (!container) return;
  if (!purchaseItems.length) {
    container.innerHTML = `<div class="empty-state" style="padding:30px;border:1.5px dashed var(--border);border-radius:var(--radius)">
      <i class="bi bi-box-seam"></i><p>Click "Add Product" to begin adding items.</p></div>`;
    return;
  }
  container.innerHTML = `
    <div class="purchase-items-table">
      <div class="purchase-item-row">
        <span>Product</span><span>Qty</span><span>Cost/Unit (₹)</span><span>Discount (₹)</span><span>Line Total</span><span></span>
      </div>
      ${purchaseItems.map((item, idx) => {
        const lineTotal = (item.qty * item.costPerUnit) - item.discount;
        return `
        <div class="purchase-item-row">
          <div>
            <div style="font-weight:600;font-size:13px">${sanitizeHTML(item.name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${sanitizeHTML(item.sku)} · ${sanitizeHTML(item.size)}</div>
          </div>
          <input type="number" class="form-control-it" value="${item.qty}" min="1" style="font-size:12.5px;padding:6px"
                 onchange="updatePurItem(${idx},'qty',this.value)">
          <input type="number" class="form-control-it" value="${item.costPerUnit}" min="0" step="0.01" style="font-size:12.5px;padding:6px"
                 onchange="updatePurItem(${idx},'costPerUnit',this.value)">
          <input type="number" class="form-control-it" value="${item.discount}" min="0" step="0.01" style="font-size:12.5px;padding:6px"
                 onchange="updatePurItem(${idx},'discount',this.value)">
          <span style="font-weight:700;font-size:13px">${formatINR(lineTotal)}</span>
          <button class="btn-sm-action btn-sm-danger" onclick="removePurItem(${idx})" title="Remove"><i class="bi bi-trash"></i></button>
        </div>`;
      }).join('')}
    </div>`;
}

function updatePurItem(idx, field, value) {
  const item = purchaseItems[idx];
  if (!item) return;
  const num = parseFloat(value);
  if (field === 'qty') {
    if (isNaN(num) || num < 1) { showToast('Quantity must be ≥ 1', 'warning'); return; }
    item.qty = Math.floor(num);
  }
  if (field === 'costPerUnit') {
    if (isNaN(num) || num < 0) { showToast('Cost cannot be negative.', 'warning'); return; }
    item.costPerUnit = num;
  }
  if (field === 'discount') {
    if (isNaN(num) || num < 0) { showToast('Discount cannot be negative.', 'warning'); return; }
    item.discount = num;
  }
  renderPurchaseItemsTable();
  updatePurchaseTotals();
}

function removePurItem(idx) {
  purchaseItems.splice(idx, 1);
  renderPurchaseItemsTable();
  updatePurchaseTotals();
}

function calcPurchaseTotals() {
  const subtotal  = purchaseItems.reduce((s, i) => s + (i.qty * i.costPerUnit), 0);
  const discount  = purchaseItems.reduce((s, i) => s + i.discount, 0);
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
  // Validate
  let valid = true;
  const supplierId = document.getElementById('pur-supplier')?.value;
  const date       = document.getElementById('pur-date')?.value;

  const setErr = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
  setErr('err-supplier', ''); setErr('err-date', ''); setErr('err-items', '');

  if (!supplierId) { setErr('err-supplier', 'Please select a supplier.'); valid = false; }
  if (!date) { setErr('err-date', 'Please select a date.'); valid = false; }
  if (!purchaseItems.length) { setErr('err-items', 'Please add at least one product.'); valid = false; }
  if (!valid) { showToast('Please fix the errors above.', 'danger'); return; }

  const supplier = AppState.suppliers.find(s => s.id === supplierId);
  const totals   = calcPurchaseTotals();
  const payStatus = document.getElementById('pur-payment-status')?.value || 'Paid';
  const amtPaid   = parseFloat(document.getElementById('pur-amount-paid')?.value || 0) || (payStatus === 'Paid' ? totals.total : 0);
  const supInv    = document.getElementById('pur-supplier-invoice')?.value || '';
  const notes     = document.getElementById('pur-notes')?.value || '';
  const purNo     = `PUR-${String(AppState.nextPurchaseNum).padStart(3, '0')}`;

  showConfirm(
    'Save Purchase?',
    `${purchaseItems.length} product(s), Total: ${formatINR(totals.total)}. Stock will be updated.`,
    () => {
      const record = {
        id: `pur-${Date.now()}`,
        purchaseInvoice: purNo,
        supplierInvoice: supInv,
        date,
        supplierId,
        supplierName: supplier?.name || '—',
        items: purchaseItems.map(i => ({ ...i })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        gstEnabled: purchaseGstEnabled,
        gstAmount: totals.gstAmt,
        totalAmount: totals.total,
        amountPaid: amtPaid,
        balance: Math.max(0, totals.total - amtPaid),
        paymentStatus: payStatus,
        notes
      };
      AppState.purchases.unshift(record);
      AppState.nextPurchaseNum++;
      updateStockAfterPurchase(purchaseItems);
      showToast(`Purchase ${purNo} saved! Inventory updated.`, 'success', 4000);
      purchaseItems = [];
      navigateTo('purchase-history');
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

function renderPurchaseHistory(container) {
  const suppliers = [...new Set(AppState.purchases.map(p => p.supplierName))];
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Purchase History</h1>
        <div class="breadcrumb-text">All purchase records (sample data)</div>
      </div>
      <div class="page-header-right">
        <button class="btn-primary-it" onclick="navigateTo('purchases')"><i class="bi bi-plus"></i> New Purchase</button>
      </div>
    </div>
    <div class="demo-banner">
      <i class="bi bi-info-circle-fill"></i>
      <span>Purchase records are in-memory only. They will reset on page refresh.</span>
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
              <th>Invoice No.</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total</th><th>Paid</th><th>Status</th><th>Actions</th>
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
  </div>

  <!-- View Purchase Modal -->
  <div class="modal fade" id="view-purchase-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi bi-eye"></i> Purchase Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body" id="view-purchase-body"></div>
        <div class="modal-footer">
          <button class="btn-ghost" data-bs-dismiss="modal">Close</button>
          <button class="btn-primary-it" id="btn-print-purchase"><i class="bi bi-printer"></i> Print</button>
        </div>
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
    if (phFilters.search && !p.purchaseInvoice.toLowerCase().includes(phFilters.search) && !p.supplierName.toLowerCase().includes(phFilters.search) && !p.supplierInvoice.toLowerCase().includes(phFilters.search)) return false;
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
        <td>${sanitizeHTML(p.supplierName)}</td>
        <td>${p.items.length} item${p.items.length>1?'s':''}</td>
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

function viewPurchaseDetail(id) {
  const p = AppState.purchases.find(x => x.id === id);
  if (!p) return;
  const body = document.getElementById('view-purchase-body');
  if (!body) return;

  body.innerHTML = `
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="invoice-company">
          <h2>${sanitizeHTML(AppState.settings.businessName)}</h2>
          <p style="font-size:12px;color:var(--text-muted)">${sanitizeHTML(AppState.settings.businessAddress)}</p>
        </div>
        <div class="invoice-meta">
          <h3 style="font-size:20px">PURCHASE ORDER</h3>
          <p class="invoice-no">${sanitizeHTML(p.purchaseInvoice)}</p>
          <p>Date: ${formatDate(p.date)}</p>
        </div>
      </div>
      <div class="invoice-parties">
        <div class="invoice-party"><h5>Supplier</h5><p><strong>${sanitizeHTML(p.supplierName)}</strong><br>Invoice: ${sanitizeHTML(p.supplierInvoice||'—')}</p></div>
        <div class="invoice-party"><h5>Payment</h5><p>${paymentBadge(p.paymentStatus)}<br>Paid: ${formatINR(p.amountPaid)}<br>Balance: ${formatINR(p.balance)}</p></div>
      </div>
      <table class="invoice-items-table">
        <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Cost/Unit</th><th>Discount</th><th>Line Total</th></tr></thead>
        <tbody>
          ${p.items.map((item,i) => `<tr>
            <td>${i+1}</td>
            <td>${sanitizeHTML(item.name)}</td>
            <td><small>${sanitizeHTML(item.sku)}</small></td>
            <td>${item.qty}</td>
            <td>${formatINR(item.costPerUnit)}</td>
            <td>${item.discount>0?formatINR(item.discount):'—'}</td>
            <td><strong>${formatINR((item.qty*item.costPerUnit)-item.discount)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatINR(p.subtotal)}</span></div>
        ${p.discount>0?`<div class="total-row"><span>Discount</span><span>-${formatINR(p.discount)}</span></div>`:''}
        ${p.gstEnabled?`<div class="total-row"><span>GST</span><span>${formatINR(p.gstAmount)}</span></div>`:''}
        <div class="total-row grand"><span>TOTAL</span><span>${formatINR(p.totalAmount)}</span></div>
      </div>
      ${p.notes ? `<p style="margin-top:14px;font-size:12.5px;color:var(--text-muted)"><strong>Notes:</strong> ${sanitizeHTML(p.notes)}</p>` : ''}
    </div>`;

  const modal = new bootstrap.Modal(document.getElementById('view-purchase-modal'));
  modal.show();
  document.getElementById('btn-print-purchase').onclick = () => {
    const container = document.querySelector('#view-purchase-modal .invoice-container');
    printInvoiceContent(container ? container.outerHTML : document.getElementById('view-purchase-modal-body').innerHTML);
  };
}

function printPurchase(id) {
  viewPurchaseDetail(id);
  setTimeout(() => {
    const container = document.querySelector('#view-purchase-modal .invoice-container');
    printInvoiceContent(container ? container.outerHTML : document.getElementById('view-purchase-modal-body').innerHTML);
  }, 250);
}

function exportPHCSV() {
  const data = getFilteredPH();
  exportCSV('purchase_history.csv',
    ['Invoice No.', 'Supplier Invoice', 'Date', 'Supplier', 'Items', 'Subtotal', 'GST', 'Total', 'Paid', 'Balance', 'Status'],
    data.map(p => [p.purchaseInvoice, p.supplierInvoice||'', p.date, p.supplierName, p.items.length, p.subtotal, p.gstAmount, p.totalAmount, p.amountPaid, p.balance, p.paymentStatus])
  );
}
