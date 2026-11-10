/**
 * INFINITY TRADERS — Billing / POS Module (billing.js)
 * ======================================================
 * Handles product search, cart management, GST toggle,
 * order discount (Rupees or Percent), default paid amount,
 * customer database auto-suggestions, invoice preview & print.
 */

'use strict';

// ── Billing State ─────────────────────────────────────────────────────────────
let billingState = {
  cart: [],
  gstEnabled: false,
  gstRate: 18,
  searchQuery: '',
  categoryFilter: '',
  brandFilter: '',
  discountType: 'fixed', // 'fixed' (₹) or 'percent' (%)
  discountValue: 0,
  userEditedAmountPaid: false
};

async function renderBilling(container) {
  if (!container) container = document.getElementById('page-container');
  if (!container) return;

  renderLoadingSpinner(container, 'Initializing billing system...');

  const [prodRes, custRes] = await Promise.all([
    apiGet('api/products/index.php'),
    apiGet('api/customers/index.php'),
    AppState.categories.length === 0 ? loadGlobalAppData() : Promise.resolve()
  ]);

  if (prodRes && prodRes.success && Array.isArray(prodRes.data)) {
    AppState.products = prodRes.data;
  }
  if (custRes && custRes.success && Array.isArray(custRes.data)) {
    AppState.customers = custRes.data;
  }

  const categories = AppState.categories.map(c => c.name);
  const brands = AppState.brands.map(b => b.name);

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>New Billing / POS</h1>
        <div class="breadcrumb-text">Create invoices and process persistent sales in MySQL</div>
      </div>
    </div>

    <div class="pos-layout" id="pos-layout">
      <!-- Left: Product Selection -->
      <div>
        <!-- Search & Filters -->
        <div class="card" style="margin-bottom:16px">
          <div class="card-body" style="padding:16px">
            <div class="product-search-bar">
              <div style="position:relative;flex:2">
                <input type="search" class="form-control-it" id="bill-product-search" placeholder="🔍 Search by name or SKU..." autocomplete="off" style="padding-left:38px">
                <i class="bi bi-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);pointer-events:none"></i>
              </div>
              <select class="form-control-it" id="bill-cat-filter" style="flex:1">
                <option value="">All Categories</option>
                ${categories.map(c => `<option value="${sanitizeHTML(c)}">${sanitizeHTML(c)}</option>`).join('')}
              </select>
              <select class="form-control-it" id="bill-subcat-filter" style="flex:1">
                <option value="">All Subcategories</option>
              </select>
              <select class="form-control-it" id="bill-brand-filter" style="flex:1">
                <option value="">All Brands</option>
                ${brands.map(b => `<option value="${sanitizeHTML(b)}">${sanitizeHTML(b)}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
        <!-- Product Grid -->
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="bi bi-grid"></i>Products <span id="prod-count-label" style="font-size:12px;font-weight:400;color:var(--text-muted)"></span></span>
          </div>
          <div class="card-body" style="padding:16px">
            <div class="products-grid" id="billing-products-grid"></div>
          </div>
        </div>
      </div>

      <!-- Right: Cart -->
      <div class="cart-panel" id="cart-panel">
        <div class="cart-header">
          <div>
            <h5 style="margin:0"><i class="bi bi-cart3"></i> Shopping Cart</h5>
            <div class="cart-shortcut-hints">
              <span class="cart-hint-pill"><kbd>↑</kbd><kbd>↓</kbd> Qty</span>
              <span class="cart-hint-pill"><kbd>→</kbd> Disc</span>
              <span class="cart-hint-pill"><kbd>Enter ↵</kbd> Next</span>
            </div>
          </div>
          <span class="cart-badge" id="cart-count">0</span>
        </div>

        <!-- GST Toggle -->
        <div class="cart-gst-box">
          <div class="gst-toggle-wrap" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.15)">
            <div class="form-check form-switch mb-0">
              <input class="form-check-input" type="checkbox" role="switch" id="gst-toggle">
            </div>
            <label for="gst-toggle" style="color:#e2e8f0;font-size:13px;cursor:pointer">
              <i class="bi bi-percent"></i> GST <span id="gst-status-label" style="color:var(--text-nav)">(Off)</span>
            </label>
            <select class="form-control-it" id="gst-rate-select" style="width:80px;font-size:12px;padding:5px 8px;display:none">
              <option value="5">5%</option>
              <option value="12">12%</option>
              <option value="18" selected>18%</option>
              <option value="28">28%</option>
            </select>
          </div>
          <div id="gst-type-row" style="display:none;margin-top:6px">
            <select class="form-control-it" id="gst-type-select" style="font-size:12px;padding:5px 10px;color:#e2e8f0;background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.2)">
              <option value="intrastate">Intrastate (CGST+SGST)</option>
              <option value="interstate">Interstate (IGST)</option>
            </select>
          </div>
        </div>

        <!-- Cart Items -->
        <div class="cart-items" id="cart-items-container">
          <div class="cart-empty">
            <i class="bi bi-cart3"></i>
            <p>Add products from the left panel</p>
          </div>
        </div>

        <!-- Discount Controls (Rupees or Percent) -->
        <div style="padding:10px 16px;background:var(--bg);border-top:1px solid var(--border-light)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <label style="font-size:11.5px;font-weight:700;color:var(--text-dark);margin:0;display:flex;align-items:center;gap:4px">
              <i class="bi bi-tag-fill" style="color:var(--primary)"></i> Bill Discount:
            </label>
            <div style="display:inline-flex;border-radius:var(--radius-sm);overflow:hidden;border:1px solid var(--border)">
              <button type="button" class="disc-toggle-btn ${billingState.discountType === 'fixed' ? 'active' : ''}" id="btn-disc-fixed" title="Discount in Rupees">₹ Rupees</button>
              <button type="button" class="disc-toggle-btn ${billingState.discountType === 'percent' ? 'active' : ''}" id="btn-disc-percent" title="Discount in Percent">% Percent</button>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <div style="position:relative;flex:1">
              <input type="number" class="form-control-it" id="bill-cart-discount" min="0" step="any" placeholder="${billingState.discountType === 'fixed' ? 'Discount in ₹' : 'Discount in %'}" value="${billingState.discountValue > 0 ? billingState.discountValue : ''}" style="font-size:12.5px;height:34px;padding-right:26px">
              <span id="disc-unit-label" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text-muted);font-weight:700">${billingState.discountType === 'fixed' ? '₹' : '%'}</span>
            </div>
            <div id="cart-discount-calc" style="font-size:12px;font-weight:700;color:var(--success);white-space:nowrap;min-width:65px;text-align:right">-₹0.00</div>
          </div>
        </div>

        <!-- Totals -->
        <div class="cart-totals" id="cart-totals">
          <div class="total-line"><span>Subtotal</span><span id="ct-subtotal">₹0.00</span></div>
          <div class="total-line" style="color:var(--success)"><span>Discount</span><span id="ct-discount">-₹0.00</span></div>
          <div class="total-line"><span>Taxable Amount</span><span id="ct-taxable">₹0.00</span></div>
          <div class="total-line" id="ct-gst-row" style="display:none"><span id="ct-gst-label">GST (18%)</span><span id="ct-gst">₹0.00</span></div>
          <div class="total-line grand-total"><span>Grand Total</span><span id="ct-grand">₹0.00</span></div>
        </div>

        <!-- Footer / Checkout -->
        <div class="cart-footer">
          <!-- Customer Auto-Suggestion Section -->
          <div style="position:relative;margin-bottom:8px">
            <div class="customer-fields" style="margin-bottom:0">
              <div style="position:relative">
                <input type="text" class="form-control-it" id="bill-customer-name" placeholder="Customer Name" autocomplete="off" style="font-size:12.5px">
              </div>
              <div style="position:relative">
                <input type="tel" class="form-control-it" id="bill-customer-phone" placeholder="Phone Number" autocomplete="off" style="font-size:12.5px">
              </div>
            </div>
            <!-- Floating Auto-Suggest Dropdown -->
            <div id="cust-autocomplete-list" class="customer-autocomplete-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;margin-top:4px"></div>
          </div>
          <div style="margin-bottom:8px">
            <input type="text" class="form-control-it" id="bill-customer-address" placeholder="Customer Address (City / Area / Street)" autocomplete="off" style="font-size:12px">
          </div>
          <div id="cust-matched-badge" style="display:none;font-size:11px;color:var(--success);margin-top:-4px;margin-bottom:8px"></div>

          <div style="display:flex;gap:8px;margin-bottom:8px">
            <div style="flex:1">
              <input type="text" class="form-control-it" id="bill-invoice-no" value="${sanitizeHTML(getNextInvoiceNo())}" style="font-size:12px" readonly>
            </div>
            <div style="flex:1">
              <input type="date" class="form-control-it" id="bill-date" value="${todayISO()}" style="font-size:12px">
            </div>
          </div>
          <div class="payment-row">
            <select class="form-control-it" id="bill-payment-method" style="font-size:12.5px;flex:1">
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <!-- Amount Paid & Balance Due (Both editable & bidirectionally synced) -->
          <div class="amount-row">
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                <label style="font-size:10.5px;color:var(--text-muted);margin:0">AMOUNT PAID (₹)</label>
                <button type="button" id="btn-full-paid" style="background:none;border:none;color:var(--success);font-size:10.5px;font-weight:600;padding:0;cursor:pointer;text-decoration:underline">Full Paid (₹)</button>
              </div>
              <input type="number" class="form-control-it" id="bill-amount-paid" placeholder="0.00" min="0" step="0.01" style="font-size:12.5px;font-weight:600;color:var(--primary)">
            </div>
            <div style="flex:1">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                <label style="font-size:10.5px;color:var(--text-muted);margin:0">BALANCE DUE (₹)</label>
                <button type="button" id="btn-zero-due" style="background:none;border:none;color:var(--primary);font-size:10.5px;font-weight:600;padding:0;cursor:pointer;text-decoration:underline">Zero Due (₹)</button>
              </div>
              <input type="number" class="form-control-it" id="bill-balance" placeholder="0.00" min="0" step="0.01" style="font-size:12.5px;font-weight:600;color:var(--danger)">
            </div>
          </div>

          <div class="cart-actions">
            <button class="btn-ghost" style="flex:0.9;border:1.5px solid var(--border);border-radius:var(--radius)" id="btn-clear-cart" title="Clear Cart">
              <i class="bi bi-trash"></i> Clear
            </button>
            <button class="btn-outline-it" style="flex:1" id="btn-preview-invoice" title="Preview Invoice">
              <i class="bi bi-eye"></i> Preview
            </button>
            <button class="btn-primary-it" style="flex:1.5" id="btn-complete-sale" title="Complete Sale & Save">
              <i class="bi bi-check2-circle"></i> Complete Sale
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Invoice Preview Modal -->
  <div class="modal fade" id="invoice-preview-modal" tabindex="-1" aria-labelledby="invoice-modal-title" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="invoice-modal-title"><i class="bi bi-receipt"></i> Invoice Preview</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body" id="invoice-modal-body"></div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
          <button type="button" class="btn-primary-it" id="btn-print-invoice"><i class="bi bi-printer"></i> Print Invoice</button>
        </div>
      </div>
    </div>
  </div>`;

  billingState = {
    cart: [],
    gstEnabled: false,
    gstRate: 18,
    searchQuery: '',
    categoryFilter: '',
    subcategoryFilter: '',
    brandFilter: '',
    discountType: 'fixed',
    discountValue: 0,
    userEditedPayment: false,
    lastEditedPaymentField: null
  };

  renderProductGrid();
  initBillingEvents();
  renderCart();
}

function renderProductGrid() {
  const grid = document.getElementById('billing-products-grid');
  if (!grid) return;

  let filtered = AppState.products.filter(p => p.status === 'Active');

  if (billingState.searchQuery) {
    const q = billingState.searchQuery.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q))
    );
  }
  if (billingState.categoryFilter) {
    filtered = filtered.filter(p => (p.category || p.category_name) === billingState.categoryFilter);
  }
  if (billingState.subcategoryFilter) {
    filtered = filtered.filter(p => (p.subcategory || p.subcategory_name) === billingState.subcategoryFilter);
  }
  if (billingState.brandFilter) {
    filtered = filtered.filter(p => (p.brand || p.brand_name) === billingState.brandFilter);
  }

  const countLabel = document.getElementById('prod-count-label');
  if (countLabel) countLabel.textContent = `(${filtered.length} products)`;

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:40px">
      <i class="bi bi-search"></i><h4>No Products Found</h4><p>Try adjusting your search or filters.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const stockStatus = getStockStatus(p);
    const isOut = stockStatus === 'out';
    const catName = p.category || p.category_name || '';
    const subcatName = p.subcategory || p.subcategory_name || '';
    return `
    <div class="product-card-pos ${isOut ? 'out-of-stock' : ''}" data-sku="${sanitizeHTML(p.sku)}" title="${sanitizeHTML(p.name)}" tabindex="${isOut ? '-1' : '0'}" role="button" aria-label="${sanitizeHTML(p.name)}, ${formatINR(p.sellingPrice)}">
      ${p.image_url ? `
        <div class="prod-img-pos">
          <img src="${sanitizeHTML(p.image_url)}" alt="${sanitizeHTML(p.name)}" loading="lazy" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="prod-brand">
        <span>${sanitizeHTML(p.brand || 'Infinity')}</span>
        ${catName ? `
          <span class="badge" style="background:rgba(2,132,199,0.12);color:#0284c7;font-size:10px;padding:2px 6px;margin-left:4px;font-weight:600">
            ${sanitizeHTML(catName)}${subcatName ? ' › ' + sanitizeHTML(subcatName) : ''}
          </span>
        ` : ''}
      </div>
      <div class="prod-name">${sanitizeHTML(p.name)}</div>
      <div class="prod-meta">${sanitizeHTML(p.size || '—')} · ${sanitizeHTML(p.color || '—')}</div>
      <div class="prod-price">${formatINR(p.sellingPrice)}</div>
      <div class="prod-stock ${stockStatus}">
        ${isOut ? '<i class="bi bi-x-circle"></i> Out of Stock' : stockStatus === 'low' ? `<i class="bi bi-exclamation-circle"></i> ${p.stock} left (low)` : `<i class="bi bi-check-circle"></i> ${p.stock} in stock`}
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.product-card-pos:not(.out-of-stock)').forEach(card => {
    card.addEventListener('click', () => addToCart(card.dataset.sku));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        addToCart(card.dataset.sku);
      }
    });
  });
}

function addToCart(sku) {
  const product = AppState.products.find(p => p.sku === sku);
  if (!product) return;
  if (product.stock <= 0) { showToast('This product is out of stock.', 'danger'); return; }

  const existing = billingState.cart.find(i => i.sku === sku);
  if (existing) {
    if (existing.qty >= product.stock) {
      showToast(`Only ${product.stock} units available in stock.`, 'warning');
      focusCartItemInput(sku, 'qty');
      return;
    }
    existing.qty++;
  } else {
    billingState.cart.push({
      id: product.id,
      product_id: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category || product.category_name || '',
      subcategory: product.subcategory || product.subcategory_name || '',
      size: product.size,
      color: product.color,
      unitPrice: product.sellingPrice,
      maxStock: product.stock,
      qty: 1,
      discount: 0
    });
  }
  renderCart();
  focusCartItemInput(sku, 'qty');
  showToast(`${product.name} added to cart`, 'success', 1200);
}

function removeFromCart(sku) {
  billingState.cart = billingState.cart.filter(i => i.sku !== sku);
  renderCart();
}

function focusCartItemInput(sku, field = 'qty') {
  requestAnimationFrame(() => {
    const selector = field === 'discount'
      ? `.discount-input[data-sku="${sku}"]`
      : `.qty-input[data-sku="${sku}"]`;
    const input = document.querySelector(selector);
    if (input) {
      input.focus();
      input.select();
      input.closest('.cart-item')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

function updateCartItemLive(sku, field, value) {
  const item = billingState.cart.find(i => i.sku === sku);
  if (!item) return;

  const numVal = parseFloat(value);
  if (field === 'qty') {
    if (!isNaN(numVal) && numVal >= 1) {
      item.qty = Math.min(Math.floor(numVal), item.maxStock);
    }
  } else if (field === 'discount') {
    if (!isNaN(numVal) && numVal >= 0) {
      const lineTotal = item.qty * item.unitPrice;
      item.discount = Math.min(numVal, lineTotal);
    }
  }

  // Live update line total in DOM
  const itemRow = document.querySelector(`.cart-item[data-sku="${sku}"]`);
  if (itemRow) {
    const lineTotal = (item.qty * item.unitPrice) - (item.discount || 0);
    const totalEl = itemRow.querySelector('.cart-item-total');
    if (totalEl) totalEl.textContent = formatINR(lineTotal);
  }

  // Live update cart count
  const totalItems = billingState.cart.reduce((s, i) => s + i.qty, 0);
  const cartCount = document.getElementById('cart-count');
  if (cartCount) cartCount.textContent = totalItems;

  // Live recalculate bill totals
  updateCartTotals();
}

function updateCartItem(sku, field, value, shouldReRender = false) {
  const item = billingState.cart.find(i => i.sku === sku);
  if (!item) return;
  const numVal = parseFloat(value);
  if (field === 'qty') {
    if (isNaN(numVal) || numVal < 1) {
      showToast('Quantity must be at least 1.', 'warning', 1000);
      item.qty = 1;
    } else if (numVal > item.maxStock) {
      showToast(`Max available: ${item.maxStock}`, 'warning', 1000);
      item.qty = item.maxStock;
    } else {
      item.qty = Math.floor(numVal);
    }
    const input = document.querySelector(`.qty-input[data-sku="${sku}"]`);
    if (input && String(input.value) !== String(item.qty)) input.value = item.qty;
  }
  if (field === 'discount') {
    if (isNaN(numVal) || numVal < 0) {
      showToast('Discount cannot be negative.', 'warning', 1000);
      item.discount = 0;
    } else {
      const lineTotal = item.qty * item.unitPrice;
      if (numVal > lineTotal) {
        showToast('Discount cannot exceed item total.', 'warning', 1000);
        item.discount = lineTotal;
      } else {
        item.discount = numVal;
      }
    }
    const input = document.querySelector(`.discount-input[data-sku="${sku}"]`);
    if (input && String(input.value) !== String(item.discount)) input.value = item.discount;
  }

  if (shouldReRender) {
    renderCart();
  } else {
    updateCartItemLive(sku, field, item[field]);
  }
}

function getBillingFocusableSequence() {
  const list = [];
  const container = document.getElementById('cart-items-container');
  if (container) {
    const items = container.querySelectorAll('.cart-item');
    items.forEach(row => {
      const q = row.querySelector('.qty-input');
      const d = row.querySelector('.discount-input');
      if (q) list.push(q);
      if (d) list.push(d);
    });
  }
  const checkoutIds = [
    'bill-cart-discount',
    'bill-customer-name',
    'bill-customer-phone',
    'bill-customer-address',
    'bill-amount-paid',
    'btn-complete-sale'
  ];
  checkoutIds.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.offsetParent !== null && !el.disabled) {
      list.push(el);
    }
  });
  return list;
}

function moveToNextCartField(currentEl, reverse = false) {
  const seq = getBillingFocusableSequence();
  const idx = seq.indexOf(currentEl);
  if (idx === -1) return;

  const targetIdx = reverse ? idx - 1 : idx + 1;
  if (targetIdx >= 0 && targetIdx < seq.length) {
    const target = seq[targetIdx];
    target.focus();
    if (typeof target.select === 'function' && target.tagName === 'INPUT') {
      target.select();
    }
    if (target.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
}

function moveCartRow(currentElement, direction) {
  const container = document.getElementById('cart-items-container');
  if (!container) return;
  const rows = Array.from(container.querySelectorAll('.cart-item'));
  const currentRow = currentElement.closest('.cart-item');
  const currentIndex = rows.indexOf(currentRow);
  if (currentIndex === -1) return;

  const targetIndex = currentIndex + direction;
  if (targetIndex >= 0 && targetIndex < rows.length) {
    const targetRow = rows[targetIndex];
    let targetEl;
    if (currentElement.classList.contains('discount-input')) {
      targetEl = targetRow.querySelector('.discount-input');
    } else if (currentElement.classList.contains('btn-remove-item')) {
      targetEl = targetRow.querySelector('.btn-remove-item');
    } else {
      targetEl = targetRow.querySelector('.qty-input');
    }
    if (targetEl) {
      targetEl.focus();
      if (typeof targetEl.select === 'function' && targetEl.tagName === 'INPUT') targetEl.select();
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } else if (direction > 0 && targetIndex >= rows.length) {
    const billDisc = document.getElementById('bill-cart-discount');
    if (billDisc) {
      billDisc.focus();
      billDisc.select();
    }
  }
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const cartCount = document.getElementById('cart-count');
  if (!container) return;

  const totalItems = billingState.cart.reduce((s, i) => s + i.qty, 0);
  if (cartCount) cartCount.textContent = totalItems;

  if (!billingState.cart.length) {
    container.innerHTML = `<div class="cart-empty"><i class="bi bi-cart3"></i><p>Add products from the left panel</p></div>`;
    updateCartTotals();
    return;
  }

  container.innerHTML = billingState.cart.map(item => {
    const lineTotal = (item.qty * item.unitPrice) - (item.discount || 0);
    return `
    <div class="cart-item" data-sku="${sanitizeHTML(item.sku)}">
      <div>
        <div class="cart-item-name">${sanitizeHTML(item.name)}</div>
        ${(item.category || item.subcategory) ? `
          <div style="font-size:11px;color:#0284c7;font-weight:600;margin:1px 0">
            <i class="bi bi-tag-fill" style="font-size:10px"></i> ${sanitizeHTML(item.category || '')}${item.subcategory ? ' › ' + sanitizeHTML(item.subcategory) : ''}
          </div>
        ` : ''}
        <div class="cart-item-sku">${sanitizeHTML(item.sku)}${item.size ? ' · Size: <strong>' + sanitizeHTML(item.size) + '</strong>' : ''}</div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button type="button" class="qty-btn" data-sku="${sanitizeHTML(item.sku)}" data-action="dec" title="Decrease (−)">−</button>
            <input class="qty-input" type="number" value="${item.qty}" min="1" max="${item.maxStock}" data-sku="${sanitizeHTML(item.sku)}" data-field="qty" title="Arrow Up/Down to change qty, Enter for next">
            <button type="button" class="qty-btn" data-sku="${sanitizeHTML(item.sku)}" data-action="inc" title="Increase (+)">+</button>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">×${formatINR(item.unitPrice)}</span>
          <input class="discount-input" type="number" value="${item.discount || 0}" min="0" placeholder="Disc ₹" data-sku="${sanitizeHTML(item.sku)}" data-field="discount" title="Item discount (₹), Arrow Up/Down to adjust, Enter for next">
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <button type="button" class="btn-remove-item" data-sku="${sanitizeHTML(item.sku)}" title="Remove item"><i class="bi bi-x-lg"></i></button>
        <div class="cart-item-total">${formatINR(lineTotal)}</div>
      </div>
    </div>`;
  }).join('');

  // Events: Increment/Decrement buttons
  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sku = btn.dataset.sku;
      const item = billingState.cart.find(i => i.sku === sku);
      if (!item) return;
      const newQty = btn.dataset.action === 'inc' ? item.qty + 1 : item.qty - 1;
      if (newQty < 1) {
        showToast('Quantity must be at least 1.', 'warning', 1000);
        return;
      }
      if (newQty > item.maxStock) {
        showToast(`Only ${item.maxStock} units available in stock.`, 'warning', 1000);
        return;
      }
      item.qty = newQty;
      const qInput = container.querySelector(`.qty-input[data-sku="${sku}"]`);
      if (qInput) qInput.value = item.qty;
      updateCartItemLive(sku, 'qty', item.qty);
    });
  });

  // Events: Quantity Inputs with Live typing, Arrow Key control & Enter navigation
  container.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('input', () => {
      updateCartItemLive(input.dataset.sku, 'qty', input.value);
    });

    input.addEventListener('blur', () => {
      updateCartItem(input.dataset.sku, 'qty', input.value, false);
    });

    input.addEventListener('keydown', (e) => {
      const sku = input.dataset.sku;
      const item = billingState.cart.find(i => i.sku === sku);
      if (!item) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        moveToNextCartField(input, e.shiftKey);
      } else if (e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
        if (e.ctrlKey || e.altKey) {
          e.preventDefault();
          moveCartRow(input, -1);
        } else {
          e.preventDefault();
          if (item.qty < item.maxStock) {
            item.qty++;
            input.value = item.qty;
            updateCartItemLive(sku, 'qty', item.qty);
            input.select();
          } else {
            showToast(`Max available: ${item.maxStock}`, 'warning', 1000);
          }
        }
      } else if (e.key === 'ArrowDown' || e.key === '-' || e.key === '_') {
        if (e.ctrlKey || e.altKey) {
          e.preventDefault();
          moveCartRow(input, 1);
        } else {
          e.preventDefault();
          if (item.qty > 1) {
            item.qty--;
            input.value = item.qty;
            updateCartItemLive(sku, 'qty', item.qty);
            input.select();
          } else {
            showToast('Minimum quantity is 1', 'warning', 1000);
          }
        }
      } else if (e.key === 'ArrowRight') {
        const discInput = input.closest('.cart-item')?.querySelector('.discount-input');
        if (discInput) {
          e.preventDefault();
          discInput.focus();
          discInput.select();
        }
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        moveCartRow(input, -1);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        moveCartRow(input, 1);
      }
    });
  });

  // Events: Discount Inputs with Live typing, Arrow Key control & Enter navigation
  container.querySelectorAll('.discount-input').forEach(input => {
    input.addEventListener('input', () => {
      updateCartItemLive(input.dataset.sku, 'discount', input.value);
    });

    input.addEventListener('blur', () => {
      updateCartItem(input.dataset.sku, 'discount', input.value, false);
    });

    input.addEventListener('keydown', (e) => {
      const sku = input.dataset.sku;
      const item = billingState.cart.find(i => i.sku === sku);
      if (!item) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        moveToNextCartField(input, e.shiftKey);
      } else if (e.key === 'ArrowUp') {
        if (e.ctrlKey || e.altKey) {
          e.preventDefault();
          moveCartRow(input, -1);
        } else {
          e.preventDefault();
          const step = e.shiftKey ? 50 : 10;
          const lineTotal = item.qty * item.unitPrice;
          const currentDisc = parseFloat(item.discount) || 0;
          const newDisc = Math.min(lineTotal, currentDisc + step);
          item.discount = newDisc;
          input.value = newDisc;
          updateCartItemLive(sku, 'discount', newDisc);
          input.select();
        }
      } else if (e.key === 'ArrowDown') {
        if (e.ctrlKey || e.altKey) {
          e.preventDefault();
          moveCartRow(input, 1);
        } else {
          e.preventDefault();
          const step = e.shiftKey ? 50 : 10;
          const currentDisc = parseFloat(item.discount) || 0;
          const newDisc = Math.max(0, currentDisc - step);
          item.discount = newDisc;
          input.value = newDisc;
          updateCartItemLive(sku, 'discount', newDisc);
          input.select();
        }
      } else if (e.key === 'ArrowLeft') {
        const qInput = input.closest('.cart-item')?.querySelector('.qty-input');
        if (qInput) {
          e.preventDefault();
          qInput.focus();
          qInput.select();
        }
      } else if (e.key === 'ArrowRight') {
        const removeBtn = input.closest('.cart-item')?.querySelector('.btn-remove-item');
        if (removeBtn) {
          e.preventDefault();
          removeBtn.focus();
        }
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        moveCartRow(input, -1);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        moveCartRow(input, 1);
      }
    });
  });

  // Events: Remove Item Button
  container.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.sku));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const discInput = btn.closest('.cart-item')?.querySelector('.discount-input');
        if (discInput) {
          discInput.focus();
          discInput.select();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveCartRow(btn, -1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveCartRow(btn, 1);
      } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'Delete') {
        e.preventDefault();
        removeFromCart(btn.dataset.sku);
      }
    });
  });

  updateCartTotals();
}

function calculateBillTotals() {
  const subtotal = billingState.cart.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
  const itemDiscounts = billingState.cart.reduce((s, i) => s + (parseFloat(i.discount) || 0), 0);
  const baseForCartDisc = Math.max(0, subtotal - itemDiscounts);

  let cartDiscount = 0;
  if (billingState.discountType === 'percent') {
    const pct = Math.min(100, Math.max(0, parseFloat(billingState.discountValue) || 0));
    cartDiscount = parseFloat(((baseForCartDisc * pct) / 100).toFixed(2));
  } else {
    const fixedAmt = Math.max(0, parseFloat(billingState.discountValue) || 0);
    cartDiscount = Math.min(baseForCartDisc, fixedAmt);
  }

  const discount = parseFloat((itemDiscounts + cartDiscount).toFixed(2));
  const taxableAmount = Math.max(0, parseFloat((subtotal - discount).toFixed(2)));
  const gstAmount = billingState.gstEnabled ? parseFloat((taxableAmount * billingState.gstRate / 100).toFixed(2)) : 0;
  const grandTotal = Math.max(0, parseFloat((taxableAmount + gstAmount).toFixed(2)));

  return { subtotal, itemDiscounts, cartDiscount, discount, taxableAmount, gstAmount, grandTotal };
}

function updateCartTotals() {
  const totals = calculateBillTotals();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('ct-subtotal', formatINR(totals.subtotal));
  set('ct-discount', '-' + formatINR(totals.discount));
  set('ct-taxable',  formatINR(totals.taxableAmount));
  set('ct-grand',    formatINR(totals.grandTotal));

  const cartDiscCalc = document.getElementById('cart-discount-calc');
  if (cartDiscCalc) {
    cartDiscCalc.textContent = '-' + formatINR(totals.cartDiscount);
  }

  const gstRow = document.getElementById('ct-gst-row');
  if (gstRow) gstRow.style.display = billingState.gstEnabled ? 'flex' : 'none';
  const gstLabel = document.getElementById('ct-gst-label');
  if (gstLabel) {
    const type = document.getElementById('gst-type-select')?.value || 'intrastate';
    if (type === 'intrastate') {
      const half = totals.gstAmount / 2;
      gstLabel.textContent = `CGST (${billingState.gstRate/2}%) + SGST (${billingState.gstRate/2}%)`;
      set('ct-gst', `${formatINR(half)} + ${formatINR(half)}`);
    } else {
      gstLabel.textContent = `IGST (${billingState.gstRate}%)`;
      set('ct-gst', formatINR(totals.gstAmount));
    }
  }

  // ── Amount Paid & Balance Due Sync (Bidirectional) ──────────────────────────
  const amtPaidInput = document.getElementById('bill-amount-paid');
  const balEl = document.getElementById('bill-balance');

  if (!billingState.userEditedPayment) {
    if (amtPaidInput) {
      amtPaidInput.value = totals.grandTotal > 0 ? totals.grandTotal.toFixed(2) : '0.00';
    }
    if (balEl) {
      balEl.value = '0.00';
    }
  } else {
    if (billingState.lastEditedPaymentField === 'balance') {
      const currentDue = parseFloat(balEl?.value || 0) || 0;
      const due = Math.min(totals.grandTotal, Math.max(0, currentDue));
      const paid = Math.max(0, parseFloat((totals.grandTotal - due).toFixed(2)));
      if (balEl && document.activeElement !== balEl) balEl.value = due.toFixed(2);
      if (amtPaidInput) amtPaidInput.value = paid.toFixed(2);
    } else {
      const currentPaid = parseFloat(amtPaidInput?.value || 0) || 0;
      const paid = Math.min(totals.grandTotal, Math.max(0, currentPaid));
      const due = Math.max(0, parseFloat((totals.grandTotal - paid).toFixed(2)));
      if (amtPaidInput && document.activeElement !== amtPaidInput) amtPaidInput.value = paid.toFixed(2);
      if (balEl) balEl.value = due.toFixed(2);
    }
  }
}

// ── Customer Auto-Suggestion (Issue 3) ─────────────────────────────────────────
function showCustomerSuggestions(query) {
  const box = document.getElementById('cust-autocomplete-list');
  if (!box) return;
  const q = (query || '').trim().toLowerCase();
  if (q.length < 1) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const matches = (AppState.customers || []).filter(c => {
    const nameMatch = c.name && c.name.toLowerCase().includes(q);
    const phoneMatch = c.phone && c.phone.includes(q);
    const addrMatch = c.address && c.address.toLowerCase().includes(q);
    return nameMatch || phoneMatch || addrMatch;
  });

  if (!matches.length) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  box.style.display = 'block';
  box.innerHTML = `
    <div style="padding:6px 12px;font-size:10.5px;color:#94a3b8;border-bottom:1px solid #334155;text-transform:uppercase;letter-spacing:0.5px;background:#0f172a">
      <i class="bi bi-clock-history"></i> Saved Customers (${matches.length})
    </div>
    ${matches.slice(0, 6).map(c => `
      <div class="cust-suggest-item" data-cust-id="${c.id}" style="padding:9px 12px;border-bottom:1px solid rgba(255,255,255,0.06);cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;font-size:13px;color:#f8fafc"><i class="bi bi-person-fill" style="color:var(--primary)"></i> ${sanitizeHTML(c.name)}</span>
          <span style="font-size:11.5px;color:#38bdf8"><i class="bi bi-telephone"></i> ${sanitizeHTML(c.phone || 'No phone')}</span>
        </div>
        ${c.address ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px"><i class="bi bi-geo-alt"></i> ${sanitizeHTML(c.address)}</div>` : ''}
      </div>
    `).join('')}
  `;

  box.querySelectorAll('.cust-suggest-item').forEach(item => {
    item.addEventListener('click', () => {
      const custId = item.dataset.custId;
      const cust = AppState.customers.find(c => String(c.id) === String(custId));
      if (cust) {
        selectCustomer(cust);
      }
      box.style.display = 'none';
    });
  });
}

function selectCustomer(cust) {
  const nameInput = document.getElementById('bill-customer-name');
  const phoneInput = document.getElementById('bill-customer-phone');
  const addrInput = document.getElementById('bill-customer-address');
  const badge = document.getElementById('cust-matched-badge');

  if (nameInput) nameInput.value = cust.name || '';
  if (phoneInput) phoneInput.value = cust.phone || '';
  if (addrInput) addrInput.value = cust.address || '';

  if (badge) {
    badge.style.display = 'block';
    badge.innerHTML = `<i class="bi bi-check-circle-fill"></i> Returning Customer: <strong>${sanitizeHTML(cust.name)}</strong> (${sanitizeHTML(cust.phone || 'No phone')})`;
  }
  showToast(`Customer profile loaded: ${cust.name}`, 'info', 1800);
}

function initBillingEvents() {
  // Search & filter products
  document.getElementById('bill-product-search')?.addEventListener('input', e => {
    billingState.searchQuery = e.target.value;
    renderProductGrid();
  });
  document.getElementById('bill-product-search')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const q = (billingState.searchQuery || '').trim().toLowerCase();
      if (!q) {
        const firstQty = document.querySelector('#cart-items-container .qty-input');
        if (firstQty) {
          firstQty.focus();
          firstQty.select();
        }
        return;
      }
      const matches = AppState.products.filter(p => {
        if (p.stock <= 0) return false;
        const skuMatch = p.sku && p.sku.toLowerCase() === q;
        const nameMatch = p.name && p.name.toLowerCase().includes(q);
        return skuMatch || nameMatch;
      });
      if (matches.length > 0) {
        const exact = matches.find(p => p.sku.toLowerCase() === q) || matches[0];
        addToCart(exact.sku);
        e.target.value = '';
        billingState.searchQuery = '';
        renderProductGrid();
      } else {
        showToast('No matching in-stock product found', 'warning', 1200);
      }
    }
  });
  document.getElementById('bill-cat-filter')?.addEventListener('change', e => {
    billingState.categoryFilter = e.target.value;
    billingState.subcategoryFilter = '';
    // Update subcategory options
    const subSelect = document.getElementById('bill-subcat-filter');
    if (subSelect) {
      subSelect.innerHTML = '<option value="">All Subcategories</option>';
      if (e.target.value) {
        const found = AppState.categories.find(c => c.name === e.target.value);
        const subs = (found && Array.isArray(found.subcategories)) ? found.subcategories : [];
        subs.forEach(s => {
          const sName = typeof s === 'string' ? s : (s.name || '');
          if (sName) subSelect.innerHTML += `<option value="${sanitizeHTML(sName)}">${sanitizeHTML(sName)}</option>`;
        });
      }
    }
    renderProductGrid();
  });
  document.getElementById('bill-subcat-filter')?.addEventListener('change', e => {
    billingState.subcategoryFilter = e.target.value;
    renderProductGrid();
  });
  document.getElementById('bill-brand-filter')?.addEventListener('change', e => {
    billingState.brandFilter = e.target.value;
    renderProductGrid();
  });

  // GST Toggle
  document.getElementById('gst-toggle')?.addEventListener('change', e => {
    billingState.gstEnabled = e.target.checked;
    const statusLabel = document.getElementById('gst-status-label');
    const rateSelect  = document.getElementById('gst-rate-select');
    const typeRow     = document.getElementById('gst-type-row');
    if (statusLabel) statusLabel.textContent = billingState.gstEnabled ? '(On)' : '(Off)';
    if (rateSelect)  rateSelect.style.display = billingState.gstEnabled ? 'block' : 'none';
    if (typeRow)     typeRow.style.display    = billingState.gstEnabled ? 'block' : 'none';
    updateCartTotals();
  });
  document.getElementById('gst-rate-select')?.addEventListener('change', e => {
    billingState.gstRate = parseFloat(e.target.value) || 18;
    updateCartTotals();
  });
  document.getElementById('gst-type-select')?.addEventListener('change', () => updateCartTotals());

  // ── Discount Mode (₹ Rupees vs % Percent) (Issue 2) ─────────────────────────
  document.getElementById('btn-disc-fixed')?.addEventListener('click', () => {
    billingState.discountType = 'fixed';
    document.getElementById('btn-disc-fixed')?.classList.add('active');
    document.getElementById('btn-disc-percent')?.classList.remove('active');
    const input = document.getElementById('bill-cart-discount');
    const label = document.getElementById('disc-unit-label');
    if (input) input.placeholder = 'Discount in ₹';
    if (label) label.textContent = '₹';
    updateCartTotals();
  });

  document.getElementById('btn-disc-percent')?.addEventListener('click', () => {
    billingState.discountType = 'percent';
    document.getElementById('btn-disc-percent')?.classList.add('active');
    document.getElementById('btn-disc-fixed')?.classList.remove('active');
    const input = document.getElementById('bill-cart-discount');
    const label = document.getElementById('disc-unit-label');
    if (input) input.placeholder = 'Discount in %';
    if (label) label.textContent = '%';
    updateCartTotals();
  });

  const billDiscInput = document.getElementById('bill-cart-discount');
  billDiscInput?.addEventListener('input', e => {
    billingState.discountValue = parseFloat(e.target.value) || 0;
    updateCartTotals();
  });
  billDiscInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveToNextCartField(billDiscInput, e.shiftKey);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const step = billingState.discountType === 'percent' ? 1 : 10;
      billingState.discountValue = (parseFloat(billingState.discountValue) || 0) + step;
      billDiscInput.value = billingState.discountValue;
      updateCartTotals();
      billDiscInput.select();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const step = billingState.discountType === 'percent' ? 1 : 10;
      billingState.discountValue = Math.max(0, (parseFloat(billingState.discountValue) || 0) - step);
      billDiscInput.value = billingState.discountValue > 0 ? billingState.discountValue : '';
      updateCartTotals();
      billDiscInput.select();
    }
  });

  // ── Amount Paid & Balance Due (Bidirectional Sync) ─────────────────────────
  const amtPaidInput = document.getElementById('bill-amount-paid');
  const balInput = document.getElementById('bill-balance');

  amtPaidInput?.addEventListener('input', e => {
    billingState.userEditedPayment = true;
    billingState.lastEditedPaymentField = 'paid';
    const totals = calculateBillTotals();
    const val = e.target.value.trim();
    if (val === '') return;
    const paid = Math.max(0, parseFloat(val) || 0);
    const due = Math.max(0, parseFloat((totals.grandTotal - paid).toFixed(2)));
    if (balInput) balInput.value = due.toFixed(2);
  });

  amtPaidInput?.addEventListener('blur', e => {
    const totals = calculateBillTotals();
    let paid = parseFloat(e.target.value);
    if (isNaN(paid) || paid < 0) paid = 0;
    if (paid > totals.grandTotal) paid = totals.grandTotal;
    e.target.value = paid.toFixed(2);
    const due = Math.max(0, parseFloat((totals.grandTotal - paid).toFixed(2)));
    if (balInput) balInput.value = due.toFixed(2);
  });

  amtPaidInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveToNextCartField(amtPaidInput, e.shiftKey);
    } else if (e.key === 'ArrowUp' && e.shiftKey) {
      e.preventDefault();
      moveToNextCartField(amtPaidInput, true);
    }
  });

  balInput?.addEventListener('input', e => {
    billingState.userEditedPayment = true;
    billingState.lastEditedPaymentField = 'balance';
    const totals = calculateBillTotals();
    const val = e.target.value.trim();
    if (val === '') return;
    const due = Math.max(0, parseFloat(val) || 0);
    const paid = Math.max(0, parseFloat((totals.grandTotal - due).toFixed(2)));
    if (amtPaidInput) amtPaidInput.value = paid.toFixed(2);
  });

  balInput?.addEventListener('blur', e => {
    const totals = calculateBillTotals();
    let due = parseFloat(e.target.value);
    if (isNaN(due) || due < 0) due = 0;
    if (due > totals.grandTotal) due = totals.grandTotal;
    e.target.value = due.toFixed(2);
    const paid = Math.max(0, parseFloat((totals.grandTotal - due).toFixed(2)));
    if (amtPaidInput) amtPaidInput.value = paid.toFixed(2);
  });

  balInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveToNextCartField(balInput, e.shiftKey);
    }
  });

  document.getElementById('btn-full-paid')?.addEventListener('click', () => {
    billingState.userEditedPayment = false;
    billingState.lastEditedPaymentField = null;
    const totals = calculateBillTotals();
    if (amtPaidInput) amtPaidInput.value = totals.grandTotal > 0 ? totals.grandTotal.toFixed(2) : '0.00';
    if (balInput) balInput.value = '0.00';
    showToast('Amount Paid set to full bill amount (₹)', 'info', 1500);
  });

  document.getElementById('btn-zero-due')?.addEventListener('click', () => {
    billingState.userEditedPayment = false;
    billingState.lastEditedPaymentField = null;
    const totals = calculateBillTotals();
    if (amtPaidInput) amtPaidInput.value = totals.grandTotal > 0 ? totals.grandTotal.toFixed(2) : '0.00';
    if (balInput) balInput.value = '0.00';
    showToast('Balance Due set to ₹0.00 (Fully Paid)', 'info', 1500);
  });

  // ── Customer Auto-Suggestion Input Events (Issue 3) ──────────────────────────
  const triggerCustSuggest = (e) => showCustomerSuggestions(e.target.value);
  const custNameInput = document.getElementById('bill-customer-name');
  const custPhoneInput = document.getElementById('bill-customer-phone');
  const custAddrInput = document.getElementById('bill-customer-address');

  custNameInput?.addEventListener('input', triggerCustSuggest);
  custPhoneInput?.addEventListener('input', triggerCustSuggest);
  custNameInput?.addEventListener('focus', triggerCustSuggest);
  custPhoneInput?.addEventListener('focus', triggerCustSuggest);

  custNameInput?.addEventListener('keydown', e => {
    const list = document.getElementById('cust-autocomplete-list');
    const isListOpen = list && list.style.display !== 'none' && list.querySelectorAll('.cust-suggest-item').length > 0;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (isListOpen) {
        const activeItem = list.querySelector('.cust-suggest-item.active') || list.querySelector('.cust-suggest-item');
        if (activeItem && activeItem.dataset.custId) {
          const cust = AppState.customers.find(c => String(c.id) === String(activeItem.dataset.custId));
          if (cust) selectCustomer(cust);
        }
        list.style.display = 'none';
      }
      moveToNextCartField(custNameInput, e.shiftKey);
    } else if (e.key === 'ArrowDown') {
      if (isListOpen) {
        e.preventDefault();
        const items = Array.from(list.querySelectorAll('.cust-suggest-item'));
        const currIdx = items.findIndex(it => it.classList.contains('active'));
        items.forEach(it => { it.classList.remove('active'); it.style.background = ''; });
        const nextIdx = (currIdx + 1) % items.length;
        items[nextIdx].classList.add('active');
        items[nextIdx].style.background = 'rgba(56, 189, 248, 0.15)';
        items[nextIdx].scrollIntoView({ block: 'nearest' });
      } else {
        e.preventDefault();
        moveToNextCartField(custNameInput, false);
      }
    } else if (e.key === 'ArrowUp') {
      if (isListOpen) {
        e.preventDefault();
        const items = Array.from(list.querySelectorAll('.cust-suggest-item'));
        const currIdx = items.findIndex(it => it.classList.contains('active'));
        items.forEach(it => { it.classList.remove('active'); it.style.background = ''; });
        const prevIdx = currIdx <= 0 ? items.length - 1 : currIdx - 1;
        items[prevIdx].classList.add('active');
        items[prevIdx].style.background = 'rgba(56, 189, 248, 0.15)';
        items[prevIdx].scrollIntoView({ block: 'nearest' });
      } else {
        e.preventDefault();
        moveToNextCartField(custNameInput, true);
      }
    } else if (e.key === 'Escape') {
      if (isListOpen) {
        list.style.display = 'none';
        e.preventDefault();
      }
    }
  });

  custPhoneInput?.addEventListener('keydown', e => {
    const list = document.getElementById('cust-autocomplete-list');
    if (e.key === 'Enter') {
      e.preventDefault();
      if (list) list.style.display = 'none';
      moveToNextCartField(custPhoneInput, e.shiftKey);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveToNextCartField(custPhoneInput, true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveToNextCartField(custPhoneInput, false);
    }
  });

  custAddrInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      moveToNextCartField(custAddrInput, e.shiftKey);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveToNextCartField(custAddrInput, true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveToNextCartField(custAddrInput, false);
    }
  });

  document.addEventListener('click', (e) => {
    const list = document.getElementById('cust-autocomplete-list');
    if (list && !list.contains(e.target) && e.target.id !== 'bill-customer-name' && e.target.id !== 'bill-customer-phone') {
      list.style.display = 'none';
    }
  });

  // Clear cart
  document.getElementById('btn-clear-cart')?.addEventListener('click', () => {
    if (!billingState.cart.length) return;
    showConfirm('Clear Cart?', 'Remove all items from the cart?', () => {
      billingState.cart = [];
      billingState.discountValue = 0;
      billingState.userEditedPayment = false;
      billingState.lastEditedPaymentField = null;
      const dInput = document.getElementById('bill-cart-discount');
      if (dInput) dInput.value = '';
      renderCart();
    }, 'Clear', 'btn-ghost');
  });

  // Preview Invoice
  document.getElementById('btn-preview-invoice')?.addEventListener('click', () => {
    if (!billingState.cart.length) { showToast('Cart is empty.', 'warning'); return; }
    showInvoicePreview();
  });

  // Complete Sale
  const btnCompleteSale = document.getElementById('btn-complete-sale');
  btnCompleteSale?.addEventListener('click', completeSale);
  btnCompleteSale?.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey)) {
      e.preventDefault();
      moveToNextCartField(btnCompleteSale, true);
    }
  });
}

function getSaleInvoiceHTML(sale) {
  const settings = AppState.settings;
  const type = document.getElementById('gst-type-select')?.value || 'intrastate';

  let gstBreakdownHtml = '';
  if (sale.gstEnabled && sale.gstAmount > 0) {
    if (type === 'intrastate') {
      const half = sale.gstAmount / 2;
      gstBreakdownHtml = `
        <div class="total-row"><span>CGST (${billingState.gstRate / 2}%)</span><span>${formatINR(half)}</span></div>
        <div class="total-row"><span>SGST (${billingState.gstRate / 2}%)</span><span>${formatINR(half)}</span></div>`;
    } else {
      gstBreakdownHtml = `<div class="total-row"><span>IGST (${billingState.gstRate}%)</span><span>${formatINR(sale.gstAmount)}</span></div>`;
    }
  }

  return `
    <div class="invoice-container" id="printable-invoice">
      <div class="invoice-header">
        <div class="invoice-company">
          <h2>${sanitizeHTML(settings.businessName)}</h2>
          <p>${sanitizeHTML(settings.businessAddress)}<br>
          📞 ${sanitizeHTML(settings.phone)} &nbsp;|&nbsp; ✉ ${sanitizeHTML(settings.email)}<br>
          GSTIN: ${sanitizeHTML(settings.gstin)}</p>
        </div>
        <div class="invoice-meta">
          <h3>INVOICE</h3>
          <p class="invoice-no">${sanitizeHTML(sale.invoiceNo)}</p>
          <p>Date: ${formatDate(sale.date)}</p>
          <p>Payment: ${sanitizeHTML(sale.paymentMethod)} (${paymentBadge(sale.paymentStatus)})</p>
        </div>
      </div>
      <hr class="invoice-divider">
      <div class="invoice-parties">
        <div class="invoice-party">
          <h5>Bill To</h5>
          <p>
            <strong>${sanitizeHTML(sale.customer || 'Walk-in Customer')}</strong><br>
            ${sale.customerPhone ? `<span>📞 ${sanitizeHTML(sale.customerPhone)}</span><br>` : ''}
            ${sale.customerAddress ? `<span class="invoice-customer-addr" style="display:inline-block;margin-top:2px;font-size:12px;color:var(--text-muted)"><i class="bi bi-geo-alt"></i> ${sanitizeHTML(sale.customerAddress)}</span>` : ''}
          </p>
        </div>
        <div class="invoice-party">
          <h5>Bill From</h5>
          <p><strong>${sanitizeHTML(settings.businessName)}</strong><br>${sanitizeHTML(settings.businessAddress)}</p>
        </div>
      </div>
      <table class="invoice-items-table">
        <thead>
          <tr>
            <th class="col-hide-thermal">#</th>
            <th>Product</th>
            <th class="col-hide-thermal">SKU</th>
            <th class="col-hide-thermal">Size</th>
            <th class="col-qty">Qty</th>
            <th class="col-rate">Unit Price</th>
            <th class="col-hide-thermal">Discount</th>
            <th class="col-total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map((item, idx) => `
          <tr>
            <td class="col-hide-thermal">${idx + 1}</td>
            <td class="col-product">
              <div style="font-weight:600">${sanitizeHTML(item.name)}</div>
              <div class="item-thermal-meta">
                ${(item.size && item.size !== '—') ? `<span>Size: ${sanitizeHTML(item.size)}</span> ` : ''}
                ${item.sku ? `<span>| SKU: ${sanitizeHTML(item.sku)}</span>` : ''}
              </div>
              ${(item.category || item.subcategory) ? `
                <div class="col-hide-thermal" style="font-size:10.5px;color:#0284c7;font-weight:600">
                  ${sanitizeHTML(item.category || '')}${item.subcategory ? ' › ' + sanitizeHTML(item.subcategory) : ''}
                </div>
              ` : ''}
            </td>
            <td class="col-hide-thermal"><small style="color:var(--text-muted)">${sanitizeHTML(item.sku)}</small></td>
            <td class="col-hide-thermal">${sanitizeHTML(item.size || '—')}</td>
            <td class="col-qty">${item.qty}</td>
            <td class="col-rate">${formatINR(item.unitPrice)}</td>
            <td class="col-hide-thermal">${item.discount > 0 ? formatINR(item.discount) : '—'}</td>
            <td class="col-total"><strong>${formatINR((item.qty * item.unitPrice) - (item.discount || 0))}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatINR(sale.subtotal)}</span></div>
        ${sale.discount > 0 ? `<div class="total-row" style="color:var(--success)"><span>Total Discount</span><span>-${formatINR(sale.discount)}</span></div>` : ''}
        <div class="total-row"><span>Taxable Amount</span><span>${formatINR(sale.taxableAmount)}</span></div>
        ${gstBreakdownHtml}
        <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatINR(sale.grandTotal)}</span></div>
        <div class="total-row" style="font-size:12.5px;color:var(--text-muted);font-weight:600"><span>Amount Paid</span><span>${formatINR(sale.amountPaid)}</span></div>
        ${sale.balance > 0 ? `<div class="total-row" style="color:var(--danger);font-weight:700"><span>Balance Due</span><span>${formatINR(sale.balance)}</span></div>` : ''}
      </div>
      <div class="invoice-footer-note">
        <p>${sanitizeHTML(settings.invoiceFooterText)}</p>
      </div>
    </div>`;
}

function printCurrentBill(saleObj) {
  const sale = saleObj || buildSaleObject();
  if (!sale.items.length) {
    showToast('Cart is empty. Add products to generate invoice.', 'warning');
    return;
  }
  const html = getSaleInvoiceHTML(sale);
  printInvoiceContent(html, 'Invoice - ' + (sale.invoiceNo || 'Bill'));
}

function showInvoicePreview(saleObj) {
  const sale = saleObj || buildSaleObject();
  const body = document.getElementById('invoice-modal-body');
  if (!body) return;

  const invoiceHtml = getSaleInvoiceHTML(sale);
  body.innerHTML = invoiceHtml;

  const modalEl = document.getElementById('invoice-preview-modal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();

  const printBtn = document.getElementById('btn-print-invoice');
  if (printBtn) {
    printBtn.onclick = () => {
      printInvoiceContent(invoiceHtml, 'Invoice - ' + (sale.invoiceNo || 'Preview'));
    };
  }
}

function buildSaleObject() {
  const totals = calculateBillTotals();
  const amtPaidInput = document.getElementById('bill-amount-paid');
  const balInput = document.getElementById('bill-balance');

  let amtPaid = parseFloat(amtPaidInput?.value);
  let balDue = parseFloat(balInput?.value);

  if (isNaN(amtPaid) && isNaN(balDue)) {
    amtPaid = totals.grandTotal;
    balDue = 0;
  } else if (!isNaN(balDue) && billingState.lastEditedPaymentField === 'balance') {
    balDue = Math.max(0, balDue);
    amtPaid = Math.max(0, parseFloat((totals.grandTotal - balDue).toFixed(2)));
  } else {
    amtPaid = isNaN(amtPaid) ? totals.grandTotal : Math.max(0, amtPaid);
    balDue = Math.max(0, parseFloat((totals.grandTotal - amtPaid).toFixed(2)));
  }

  return {
    invoiceNo: document.getElementById('bill-invoice-no')?.value || getNextInvoiceNo(),
    date: document.getElementById('bill-date')?.value || todayISO(),
    customer: document.getElementById('bill-customer-name')?.value.trim() || 'Walk-in Customer',
    customerPhone: document.getElementById('bill-customer-phone')?.value.trim() || '',
    customerAddress: document.getElementById('bill-customer-address')?.value.trim() || '',
    paymentMethod: document.getElementById('bill-payment-method')?.value || 'Cash',
    items: billingState.cart.map(i => ({ ...i })),
    ...totals,
    amountPaid: amtPaid,
    balance: balDue,
    gstEnabled: billingState.gstEnabled,
    paymentStatus: balDue <= 0.01 ? 'Paid' : (amtPaid > 0 ? 'Partial' : 'Unpaid')
  };
}

function completeSale() {
  if (!billingState.cart.length) { showToast('Cart is empty.', 'warning'); return; }
  const sale = buildSaleObject();
  const grandTotal = sale.grandTotal;

  showConfirm(
    'Complete Sale?',
    `Total: ${formatINR(grandTotal)} · Paid: ${formatINR(sale.amountPaid)} · Customer: ${sale.customer}. Confirm to record this sale and open invoice.`,
    async () => {
      const payload = {
        invoice_no: sale.invoiceNo,
        date: sale.date,
        customer_name: sale.customer,
        customer_phone: sale.customerPhone,
        customer_address: sale.customerAddress,
        payment_method: sale.paymentMethod,
        gst_enabled: sale.gstEnabled ? 1 : 0,
        gst_rate: billingState.gstRate,
        gst_type: document.getElementById('gst-type-select')?.value || 'intrastate',
        subtotal: sale.subtotal,
        total_discount: sale.discount,
        taxable_amount: sale.taxableAmount,
        cgst: sale.gstEnabled ? (sale.gstAmount / 2) : 0,
        sgst: sale.gstEnabled ? (sale.gstAmount / 2) : 0,
        igst: sale.gstEnabled ? sale.gstAmount : 0,
        grand_total: sale.grandTotal,
        amount_paid: sale.amountPaid,
        balance_due: sale.balance,
        payment_status: sale.paymentStatus,
        items: (() => {
          const baseForCartDisc = Math.max(0, (sale.subtotal || 0) - (sale.itemDiscounts || 0));
          const cartDisc = sale.cartDiscount || 0;
          return sale.items.map(i => {
            const itemBase = Math.max(0, (i.qty * i.unitPrice) - (i.discount || 0));
            const cartDiscShare = (baseForCartDisc > 0 && cartDisc > 0)
              ? parseFloat(((itemBase / baseForCartDisc) * cartDisc).toFixed(2))
              : 0;
            const totalLineDisc = parseFloat(((i.discount || 0) + cartDiscShare).toFixed(2));
            const lineTotal = Math.max(0, parseFloat(((i.qty * i.unitPrice) - totalLineDisc).toFixed(2)));
            return {
              product_id: i.id || i.product_id,
              sku: i.sku,
              product_name: i.name,
              size: i.size || '',
              qty: i.qty,
              unit_price: i.unitPrice,
              discount: totalLineDisc,
              line_total: lineTotal
            };
          });
        })()
      };

      const res = await apiPost('api/sales/index.php', payload);
      if (res && res.success) {
        const saleRecord = {
          id: res.id,
          ...sale,
          invoiceNo: res.invoice_no
        };

        showToast(`Sale ${res.invoice_no} completed & saved to database!`, 'success', 3500);

        // Open invoice preview
        showInvoicePreview(saleRecord);

        // Reset cart and customer inputs
        billingState.cart = [];
        billingState.discountValue = 0;
        billingState.userEditedPayment = false;
        billingState.lastEditedPaymentField = null;
        renderCart();

        const nameInput = document.getElementById('bill-customer-name');
        const phoneInput = document.getElementById('bill-customer-phone');
        const addrInput = document.getElementById('bill-customer-address');
        const amtPaidInput = document.getElementById('bill-amount-paid');
        const balInput = document.getElementById('bill-balance');
        const dInput = document.getElementById('bill-cart-discount');
        const badge = document.getElementById('cust-matched-badge');

        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (addrInput) addrInput.value = '';
        if (amtPaidInput) amtPaidInput.value = '';
        if (balInput) balInput.value = '0.00';
        if (dInput) dInput.value = '';
        if (badge) badge.style.display = 'none';

        // Reload products, settings, and CUSTOMERS from API so new customer is immediately available for suggestions!
        const [prodRes, setRes, custRes] = await Promise.all([
          apiGet('api/products/index.php'),
          apiGet('api/settings/index.php'),
          apiGet('api/customers/index.php')
        ]);
        if (prodRes && prodRes.success) AppState.products = prodRes.data;
        if (setRes && setRes.success) {
          AppState.nextInvoiceNum = parseInt(setRes.data.next_invoice_num, 10);
        }
        if (custRes && custRes.success && Array.isArray(custRes.data)) {
          AppState.customers = custRes.data;
        }

        renderProductGrid();

        const invInput = document.getElementById('bill-invoice-no');
        if (invInput) invInput.value = getNextInvoiceNo();
      } else {
        showToast(res?.error || 'Failed to complete sale.', 'danger');
      }
    },
    `Confirm Sale (${formatINR(grandTotal)})`,
    'btn-primary-it'
  );
}
