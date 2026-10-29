/**
 * INFINITY TRADERS — Billing / POS Module (billing.js)
 * ======================================================
 * Handles product search, cart management, GST toggle,
 * invoice preview, and browser print.
 * 
 * DATA NOTICE: Completed bills exist in-memory only.
 * Data resets on page refresh.
 */

'use strict';

// ── Billing State ─────────────────────────────────────────────────────────────
let billingState = {
  cart: [],
  gstEnabled: false,
  gstRate: 18,
  searchQuery: '',
  categoryFilter: '',
  brandFilter: ''
};

function renderBilling(container) {
  const categories = AppState.categories.map(c => c.name);
  const brands = AppState.brands.map(b => b.name);

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>New Billing / POS</h1>
        <div class="breadcrumb-text">Create invoices and process payments</div>
      </div>
      <div class="demo-banner" style="margin:0;flex:1;margin-left:20px">
        <i class="bi bi-info-circle-fill"></i>
        <span>Completed bills are in-memory only and will reset on refresh.</span>
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
          <h5><i class="bi bi-cart3"></i> Shopping Cart</h5>
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
          <div style="font-size:10.5px;color:rgba(148,163,184,0.6);margin-top:4px">⚠ Sample GST rates — not legally validated</div>
        </div>

        <div class="cart-items" id="cart-items-container">
          <div class="cart-empty">
            <i class="bi bi-cart3"></i>
            <p>Add products from the left panel</p>
          </div>
        </div>

        <div class="cart-totals" id="cart-totals">
          <div class="total-line"><span>Subtotal</span><span id="ct-subtotal">₹0.00</span></div>
          <div class="total-line"><span>Discount</span><span id="ct-discount">-₹0.00</span></div>
          <div class="total-line"><span>Taxable Amount</span><span id="ct-taxable">₹0.00</span></div>
          <div class="total-line" id="ct-gst-row" style="display:none"><span id="ct-gst-label">GST (18%)</span><span id="ct-gst">₹0.00</span></div>
          <div class="total-line grand-total"><span>Grand Total</span><span id="ct-grand">₹0.00</span></div>
        </div>

        <div class="cart-footer">
          <div class="customer-fields">
            <input type="text" class="form-control-it" id="bill-customer-name" list="bill-cust-datalist" placeholder="Customer Name" autocomplete="off">
            <datalist id="bill-cust-datalist">
              ${AppState.customers.map(c => `<option value="${sanitizeHTML(c.name)}">${sanitizeHTML(c.phone || '')}${c.address ? ' · ' + sanitizeHTML(c.address) : ''}</option>`).join('')}
            </datalist>
            <input type="tel"  class="form-control-it" id="bill-customer-phone" placeholder="Phone Number" autocomplete="off">
          </div>
          <div style="margin-bottom:8px">
            <input type="text" class="form-control-it" id="bill-customer-address" placeholder="Customer Address (City / Area / Street)" autocomplete="off" style="font-size:12px">
          </div>
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
          <div class="amount-row">
            <div style="flex:1">
              <label style="font-size:10.5px;color:var(--text-muted);margin-bottom:3px;display:block">AMOUNT PAID</label>
              <input type="number" class="form-control-it" id="bill-amount-paid" placeholder="0.00" min="0" step="0.01" style="font-size:12.5px">
            </div>
            <div style="flex:1">
              <label style="font-size:10.5px;color:var(--text-muted);margin-bottom:3px;display:block">BALANCE DUE</label>
              <input type="number" class="form-control-it" id="bill-balance" value="0.00" readonly style="font-size:12.5px;background:var(--bg)">
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

  billingState = { cart: [], gstEnabled: false, gstRate: 18, searchQuery: '', categoryFilter: '', brandFilter: '' };
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
      p.brand.toLowerCase().includes(q)
    );
  }
  if (billingState.categoryFilter)
    filtered = filtered.filter(p => p.category === billingState.categoryFilter);
  if (billingState.brandFilter)
    filtered = filtered.filter(p => p.brand === billingState.brandFilter);

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
    return `
    <div class="product-card-pos ${isOut ? 'out-of-stock' : ''}" data-sku="${sanitizeHTML(p.sku)}" title="${sanitizeHTML(p.name)}" tabindex="${isOut ? '-1' : '0'}" role="button" aria-label="${sanitizeHTML(p.name)}, ${formatINR(p.sellingPrice)}">
      <div class="prod-brand">${sanitizeHTML(p.brand)}</div>
      <div class="prod-name">${sanitizeHTML(p.name)}</div>
      <div class="prod-meta">${sanitizeHTML(p.size)} · ${sanitizeHTML(p.color)}</div>
      <div class="prod-price">${formatINR(p.sellingPrice)}</div>
      <div class="prod-stock ${stockStatus}">
        ${isOut ? '<i class="bi bi-x-circle"></i> Out of Stock' : stockStatus === 'low' ? `<i class="bi bi-exclamation-circle"></i> ${p.stock} left (low)` : `<i class="bi bi-check-circle"></i> ${p.stock} in stock`}
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.product-card-pos:not(.out-of-stock)').forEach(card => {
    card.addEventListener('click', () => addToCart(card.dataset.sku));
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
      return;
    }
    existing.qty++;
  } else {
    billingState.cart.push({
      sku: product.sku,
      name: product.name,
      size: product.size,
      color: product.color,
      unitPrice: product.sellingPrice,
      maxStock: product.stock,
      qty: 1,
      discount: 0
    });
  }
  renderCart();
  showToast(`${product.name} added to cart`, 'success', 1800);
}

function removeFromCart(sku) {
  billingState.cart = billingState.cart.filter(i => i.sku !== sku);
  renderCart();
}

function updateCartItem(sku, field, value) {
  const item = billingState.cart.find(i => i.sku === sku);
  if (!item) return;
  const numVal = parseFloat(value);
  if (field === 'qty') {
    if (isNaN(numVal) || numVal < 1) { showToast('Quantity must be at least 1.', 'warning'); return; }
    if (numVal > item.maxStock) { showToast(`Max available: ${item.maxStock}`, 'warning'); return; }
    item.qty = Math.floor(numVal);
  }
  if (field === 'discount') {
    if (isNaN(numVal) || numVal < 0) { showToast('Discount cannot be negative.', 'warning'); return; }
    const lineTotal = item.qty * item.unitPrice;
    if (numVal > lineTotal) { showToast('Discount cannot exceed item total.', 'warning'); return; }
    item.discount = numVal;
  }
  renderCart();
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
    const lineTotal = (item.qty * item.unitPrice) - item.discount;
    return `
    <div class="cart-item" data-sku="${sanitizeHTML(item.sku)}">
      <div>
        <div class="cart-item-name">${sanitizeHTML(item.name)}</div>
        <div class="cart-item-sku">${sanitizeHTML(item.sku)} · ${sanitizeHTML(item.size)}</div>
        <div class="cart-item-controls">
          <div class="qty-control">
            <button class="qty-btn" data-sku="${sanitizeHTML(item.sku)}" data-action="dec">−</button>
            <input class="qty-input" type="number" value="${item.qty}" min="1" max="${item.maxStock}" data-sku="${sanitizeHTML(item.sku)}" data-field="qty">
            <button class="qty-btn" data-sku="${sanitizeHTML(item.sku)}" data-action="inc">+</button>
          </div>
          <span style="font-size:11px;color:var(--text-muted)">×${formatINR(item.unitPrice)}</span>
          <input class="discount-input" type="number" value="${item.discount}" min="0" placeholder="Disc ₹" data-sku="${sanitizeHTML(item.sku)}" data-field="discount" title="Item discount (₹)">
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <button class="btn-remove-item" data-sku="${sanitizeHTML(item.sku)}" title="Remove item"><i class="bi bi-x-lg"></i></button>
        <div class="cart-item-total">${formatINR(lineTotal)}</div>
      </div>
    </div>`;
  }).join('');

  // Events
  container.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const sku = btn.dataset.sku;
      const item = billingState.cart.find(i => i.sku === sku);
      if (!item) return;
      if (btn.dataset.action === 'inc') updateCartItem(sku, 'qty', item.qty + 1);
      else updateCartItem(sku, 'qty', item.qty - 1);
    });
  });
  container.querySelectorAll('.qty-input').forEach(input => {
    input.addEventListener('change', () => updateCartItem(input.dataset.sku, 'qty', input.value));
  });
  container.querySelectorAll('input[data-field="discount"]').forEach(input => {
    input.addEventListener('change', () => updateCartItem(input.dataset.sku, 'discount', input.value));
  });
  container.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.sku));
  });

  updateCartTotals();
}

function calculateBillTotals() {
  const subtotal     = billingState.cart.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
  const discount     = billingState.cart.reduce((s, i) => s + i.discount, 0);
  const taxableAmount = Math.max(0, subtotal - discount);
  const gstAmount    = billingState.gstEnabled ? parseFloat((taxableAmount * billingState.gstRate / 100).toFixed(2)) : 0;
  const grandTotal   = taxableAmount + gstAmount;
  return { subtotal, discount, taxableAmount, gstAmount, grandTotal };
}

function updateCartTotals() {
  const totals = calculateBillTotals();
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('ct-subtotal',  formatINR(totals.subtotal));
  set('ct-discount',  '-' + formatINR(totals.discount));
  set('ct-taxable',   formatINR(totals.taxableAmount));
  set('ct-grand',     formatINR(totals.grandTotal));

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

  // Balance
  const amtPaid = parseFloat(document.getElementById('bill-amount-paid')?.value || 0) || 0;
  const balance = Math.max(0, totals.grandTotal - amtPaid);
  const balEl = document.getElementById('bill-balance');
  if (balEl) balEl.value = balance.toFixed(2);
}

function initBillingEvents() {
  // Search & filter
  document.getElementById('bill-product-search')?.addEventListener('input', e => {
    billingState.searchQuery = e.target.value;
    renderProductGrid();
  });
  document.getElementById('bill-cat-filter')?.addEventListener('change', e => {
    billingState.categoryFilter = e.target.value;
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
    billingState.gstRate = parseFloat(e.target.value);
    updateCartTotals();
  });
  document.getElementById('gst-type-select')?.addEventListener('change', () => updateCartTotals());

  // Amount paid → balance
  document.getElementById('bill-amount-paid')?.addEventListener('input', updateCartTotals);

  // Clear cart
  document.getElementById('btn-clear-cart')?.addEventListener('click', () => {
    if (!billingState.cart.length) return;
    showConfirm('Clear Cart?', 'Remove all items from the cart?', () => {
      billingState.cart = [];
      renderCart();
    }, 'Clear', 'btn-ghost');
  });

  // Customer Auto-fill on name input
  document.getElementById('bill-customer-name')?.addEventListener('input', e => {
    const val = e.target.value.trim().toLowerCase();
    if (!val) return;
    const found = AppState.customers.find(c => c.name.toLowerCase() === val);
    if (found) {
      const phoneInput = document.getElementById('bill-customer-phone');
      const addrInput  = document.getElementById('bill-customer-address');
      if (phoneInput && !phoneInput.value) phoneInput.value = found.phone || '';
      if (addrInput  && !addrInput.value)  addrInput.value  = found.address || '';
    }
  });

  // Preview Invoice
  document.getElementById('btn-preview-invoice')?.addEventListener('click', () => {
    if (!billingState.cart.length) { showToast('Cart is empty.', 'warning'); return; }
    showInvoicePreview();
  });

  // Complete Sale
  document.getElementById('btn-complete-sale')?.addEventListener('click', completeSale);
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
          <p>Payment: ${sanitizeHTML(sale.paymentMethod)}</p>
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
            <th>#</th><th>Product</th><th>SKU</th><th>Size</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${sale.items.map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${sanitizeHTML(item.name)}</td>
            <td><small style="color:var(--text-muted)">${sanitizeHTML(item.sku)}</small></td>
            <td>${sanitizeHTML(item.size || '—')}</td>
            <td>${item.qty}</td>
            <td>${formatINR(item.unitPrice)}</td>
            <td>${item.discount > 0 ? formatINR(item.discount) : '—'}</td>
            <td><strong>${formatINR((item.qty * item.unitPrice) - item.discount)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatINR(sale.subtotal)}</span></div>
        ${sale.discount > 0 ? `<div class="total-row"><span>Total Discount</span><span>-${formatINR(sale.discount)}</span></div>` : ''}
        <div class="total-row"><span>Taxable Amount</span><span>${formatINR(sale.taxableAmount)}</span></div>
        ${gstBreakdownHtml}
        <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatINR(sale.grandTotal)}</span></div>
        <div class="total-row" style="font-size:12px;color:var(--text-muted)"><span>Amount Paid</span><span>${formatINR(sale.amountPaid)}</span></div>
        ${sale.balance > 0 ? `<div class="total-row" style="color:var(--danger);font-weight:600"><span>Balance Due</span><span>${formatINR(sale.balance)}</span></div>` : ''}
      </div>
      <div class="invoice-footer-note">
        <p>${sanitizeHTML(settings.invoiceFooterText)}</p>
        <p style="margin-top:6px;font-size:11px;color:#aaa">⚠ This is a demo invoice. Data is not stored permanently.</p>
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
  printInvoiceContent(html);
}

function showInvoicePreview(saleObj) {
  const sale = saleObj || buildSaleObject();
  const body = document.getElementById('invoice-modal-body');
  if (!body) return;

  const invoiceHtml = getSaleInvoiceHTML(sale);
  body.innerHTML = `
    <div class="placeholder-banner"><i class="bi bi-info-circle"></i> Placeholders: Business address, GSTIN, and logo will be filled in after client approval.</div>
    ${invoiceHtml}
  `;

  const modalEl = document.getElementById('invoice-preview-modal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modal.show();

  const printBtn = document.getElementById('btn-print-invoice');
  if (printBtn) {
    printBtn.onclick = () => {
      printInvoiceContent(invoiceHtml);
    };
  }
}

function buildSaleObject() {
  const totals = calculateBillTotals();
  const amtPaid = parseFloat(document.getElementById('bill-amount-paid')?.value || 0) || 0;
  const balance = Math.max(0, totals.grandTotal - amtPaid);
  return {
    invoiceNo: document.getElementById('bill-invoice-no')?.value || getNextInvoiceNo(),
    date: document.getElementById('bill-date')?.value || todayISO(),
    customer: document.getElementById('bill-customer-name')?.value || 'Walk-in Customer',
    customerPhone: document.getElementById('bill-customer-phone')?.value || '',
    customerAddress: document.getElementById('bill-customer-address')?.value || '',
    paymentMethod: document.getElementById('bill-payment-method')?.value || 'Cash',
    items: billingState.cart.map(i => ({ ...i })),
    ...totals,
    amountPaid: amtPaid,
    balance,
    gstEnabled: billingState.gstEnabled,
    paymentStatus: balance <= 0 ? 'Paid' : amtPaid > 0 ? 'Partial' : 'Unpaid'
  };
}

function completeSale() {
  if (!billingState.cart.length) { showToast('Cart is empty.', 'warning'); return; }
  const sale = buildSaleObject();
  const grandTotal = sale.grandTotal;

  showConfirm(
    'Complete Sale?',
    `Total: ${formatINR(grandTotal)} · Customer: ${sale.customer}${sale.customerAddress ? ' (' + sale.customerAddress + ')' : ''}. Confirm to record this sale and open invoice.`,
    () => {
      // Save sale
      const saleRecord = {
        id: `sale-${Date.now()}`,
        ...sale
      };
      AppState.sales.unshift(saleRecord);
      AppState.nextInvoiceNum++;

      // Deduct stock
      updateStockAfterSale(sale.items);

      // Show toast
      showToast(`Sale ${sale.invoiceNo} completed! Stock updated.`, 'success', 3500);

      // Open invoice preview modal (invoice screen with Print Invoice button available)
      showInvoicePreview(saleRecord);

      // Reset cart and customer inputs
      billingState.cart = [];
      renderCart();
      const nameInput = document.getElementById('bill-customer-name');
      const phoneInput = document.getElementById('bill-customer-phone');
      const addrInput = document.getElementById('bill-customer-address');
      const amtPaidInput = document.getElementById('bill-amount-paid');
      if (nameInput) nameInput.value = '';
      if (phoneInput) phoneInput.value = '';
      if (addrInput) addrInput.value = '';
      if (amtPaidInput) amtPaidInput.value = '';

      // Update invoice number
      const invInput = document.getElementById('bill-invoice-no');
      if (invInput) invInput.value = getNextInvoiceNo();
    },
    `Confirm Sale (${formatINR(grandTotal)})`,
    'btn-primary-it'
  );
}
