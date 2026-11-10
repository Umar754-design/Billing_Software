/**
 * INFINITY TRADERS — Sales Returns & Refunds (returns.js)
 * =======================================================
 * Manages customer product returns, inventory restock,
 * refund processing, and return credit slips.
 */

'use strict';

let retFilters = { search: '', method: '', dateFrom: '', dateTo: '', restock: '' };
let retPage = 1;
const RET_PER_PAGE = 10;
let returnModalInstance = null;

// ─────────────────────────────────────────────────────────────────────────────
// RENDER SALES RETURNS PAGE
// ─────────────────────────────────────────────────────────────────────────────
async function renderSalesReturns(container) {
  if (!container) container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = renderLoadingSpinner('Loading sales returns...');

  // Ensure products, sales, and customers are loaded for autocomplete/selection
  if (!AppState.products.length) {
    const pRes = await apiGet('api/products/index.php');
    if (pRes && pRes.success) AppState.products = pRes.data;
  }
  if (!AppState.sales.length) {
    const sRes = await apiGet('api/sales/index.php');
    if (sRes && sRes.success) AppState.sales = sRes.data;
  }
  if (!AppState.customers.length) {
    const cRes = await apiGet('api/customers/index.php');
    if (cRes && cRes.success && Array.isArray(cRes.data)) AppState.customers = cRes.data;
  }

  const res = await apiGet('api/returns/index.php');
  let returnsList = [];
  let stats = { total_returns: 0, total_refunded: 0, restocked_qty: 0 };

  if (res && res.success && Array.isArray(res.data)) {
    returnsList = res.data;
    if (res.stats) stats = res.stats;
  }

  AppState.returns = returnsList;

  container.innerHTML = `
  <div class="page-section">
    <!-- Header -->
    <div class="page-header">
      <div class="page-header-left">
        <h1>Sales Returns &amp; Refunds</h1>
        <div class="breadcrumb-text">Manage customer returned items, restock inventory &amp; credit notes</div>
      </div>
      <div class="page-header-right" style="display:flex;gap:10px">
        <button class="btn-outline-it" id="ret-export-btn"><i class="bi bi-download"></i> CSV</button>
        <button class="btn-primary-it" id="ret-new-btn"><i class="bi bi-arrow-return-left"></i> New Return</button>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div class="row g-3 mb-4">
      <div class="col-12 col-md-4">
        <div class="card stat-card" style="border-left:4px solid var(--primary, #0284c7)">
          <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:14px">
            <div style="width:48px;height:48px;border-radius:10px;background:rgba(2,132,199,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--primary, #0284c7)">
              <i class="bi bi-arrow-return-left"></i>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Total Returns</div>
              <div style="font-size:22px;font-weight:700;color:var(--text-dark)">${stats.total_returns}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="card stat-card" style="border-left:4px solid var(--danger, #ef4444)">
          <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:14px">
            <div style="width:48px;height:48px;border-radius:10px;background:rgba(239,68,68,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--danger, #ef4444)">
              <i class="bi bi-currency-rupee"></i>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Total Refund Amount</div>
              <div style="font-size:22px;font-weight:700;color:var(--danger, #ef4444)">${formatINR(stats.total_refunded)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="card stat-card" style="border-left:4px solid var(--success, #10b981)">
          <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:14px">
            <div style="width:48px;height:48px;border-radius:10px;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--success, #10b981)">
              <i class="bi bi-box-seam"></i>
            </div>
            <div>
              <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Restocked Items</div>
              <div style="font-size:22px;font-weight:700;color:var(--success, #10b981)">${stats.restocked_qty} Units</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Returns Table Card -->
    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="ret-search" placeholder="🔍 Search return #, invoice #, customer, product...">
          <input type="date" class="form-control-it" id="ret-date-from">
          <input type="date" class="form-control-it" id="ret-date-to">
          <select class="form-control-it" id="ret-method">
            <option value="">All Refund Methods</option>
            <option>Cash</option>
            <option>UPI</option>
            <option>Store Credit</option>
            <option>Bank Transfer</option>
          </select>
          <select class="form-control-it" id="ret-restock">
            <option value="">Stock: All</option>
            <option value="yes">Restocked (+Stock)</option>
            <option value="no">Damaged / Scrapped</option>
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead>
            <tr>
              <th>Return No.</th>
              <th>Date</th>
              <th>Invoice Ref</th>
              <th>Customer</th>
              <th style="min-width:240px">Returned Products</th>
              <th>Reason</th>
              <th>Stock Restocked</th>
              <th>Refund Amount</th>
              <th>Refund Via</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="ret-tbody"></tbody>
        </table>
      </div>
      <div class="pagination-bar">
        <span id="ret-showing">Showing 0 of 0</span>
        <div class="pagination-controls" id="ret-pagination"></div>
      </div>
    </div>
  </div>

  <!-- New Return Modal -->
  <div class="modal fade" id="new-return-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi bi-arrow-return-left"></i> Process Customer Return</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <form id="return-form">
            <!-- Search Invoice or Customer -->
            <div class="row g-3 mb-3">
              <div class="col-12 col-md-6">
                <label class="form-label" style="font-weight:600">Original Invoice No. (Optional)</label>
                <div class="input-group">
                  <input type="text" class="form-control-it" id="ret-input-inv" placeholder="e.g. IT-INV-006" list="ret-inv-datalist">
                  <datalist id="ret-inv-datalist">
                    ${(AppState.sales || []).map(s => `<option value="${s.invoiceNo || s.invoice_no}">${s.customer || s.customer_name} (${s.date})</option>`).join('')}
                  </datalist>
                  <button type="button" class="btn-outline-it" id="btn-fetch-inv-items" title="Load products from invoice"><i class="bi bi-search"></i> Load</button>
                </div>
                <small style="color:var(--text-muted);font-size:11px">Enter invoice to auto-load customer and sold items</small>
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label" style="font-weight:600">Return Date</label>
                <input type="date" class="form-control-it" id="ret-input-date" value="${new Date().toISOString().split('T')[0]}" required>
              </div>
            </div>

            <div class="row g-3 mb-3">
              <div class="col-12 col-md-6">
                <label class="form-label" style="font-weight:600">Customer Name *</label>
                <div style="position:relative">
                  <input type="text" class="form-control-it" id="ret-input-customer" placeholder="Customer Name" autocomplete="off" required>
                  <div id="ret-cust-autocomplete-list" class="product-autocomplete-dropdown" style="display:none"></div>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <label class="form-label" style="font-weight:600">Customer Phone</label>
                <input type="text" class="form-control-it" id="ret-input-phone" placeholder="Phone Number">
              </div>
            </div>

            <!-- Items to Return -->
            <div class="mb-3">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <label class="form-label mb-0" style="font-weight:700;color:var(--text-dark)">Returned Item(s) *</label>
                <button type="button" class="btn-sm-action" id="ret-add-manual-item-btn" style="padding:4px 10px;font-size:12px;background:var(--primary);color:#fff"><i class="bi bi-plus"></i> Add Item</button>
              </div>
              <div id="ret-items-container" style="display:flex;flex-direction:column;gap:10px">
                <!-- Dynamically populated rows -->
              </div>
            </div>

            <!-- Return Details & Reason -->
            <div class="row g-3 mb-3">
              <div class="col-12 col-md-4">
                <label class="form-label" style="font-weight:600">Return Reason *</label>
                <select class="form-control-it" id="ret-input-reason" required>
                  <option value="Size / Fitting Issue">Size / Fitting Issue</option>
                  <option value="Defective / Damaged">Defective / Damaged</option>
                  <option value="Customer Changed Mind">Customer Changed Mind</option>
                  <option value="Exchange for Other Product">Exchange for Other Product</option>
                  <option value="Wrong Item Delivered">Wrong Item Delivered</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label" style="font-weight:600">Refund Method *</label>
                <select class="form-control-it" id="ret-input-method" required>
                  <option value="Cash">Cash Refund</option>
                  <option value="UPI">UPI / Online</option>
                  <option value="Store Credit">Store Credit / Exchange</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div class="col-12 col-md-4">
                <label class="form-label" style="font-weight:600">Total Refund Amount</label>
                <div id="ret-total-refund-display" style="font-size:18px;font-weight:700;color:var(--danger, #ef4444);padding-top:6px">₹0.00</div>
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label" style="font-weight:600">Notes / Remarks</label>
              <textarea class="form-control-it" id="ret-input-notes" rows="2" placeholder="Optional notes about item condition, receipt number, etc."></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn-primary-it" id="btn-save-return"><i class="bi bi-check2-circle"></i> Confirm &amp; Process Return</button>
        </div>
      </div>
    </div>
  </div>
  `;

  retFilters = { search: '', method: '', dateFrom: '', dateTo: '', restock: '' };
  retPage = 1;
  renderReturnsTable();

  // Filter listeners
  ['ret-search', 'ret-date-from', 'ret-date-to', 'ret-method', 'ret-restock'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      retFilters.search   = document.getElementById('ret-search')?.value.toLowerCase() || '';
      retFilters.dateFrom = document.getElementById('ret-date-from')?.value || '';
      retFilters.dateTo   = document.getElementById('ret-date-to')?.value || '';
      retFilters.method   = document.getElementById('ret-method')?.value || '';
      retFilters.restock  = document.getElementById('ret-restock')?.value || '';
      retPage = 1;
      renderReturnsTable();
    });
  });

  document.getElementById('ret-export-btn')?.addEventListener('click', exportReturnsCSV);
  document.getElementById('ret-new-btn')?.addEventListener('click', () => openNewReturnModal());
  document.getElementById('btn-fetch-inv-items')?.addEventListener('click', handleFetchInvoiceItems);
  document.getElementById('ret-input-inv')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFetchInvoiceItems();
    }
  });
  document.getElementById('ret-add-manual-item-btn')?.addEventListener('click', addReturnItemRow);
  document.getElementById('btn-save-return')?.addEventListener('click', handleSaveReturn);
  initReturnCustomerAutosuggest();
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTER & RENDER RETURNS TABLE
// ─────────────────────────────────────────────────────────────────────────────
function getFilteredReturns() {
  const returns = AppState.returns || [];
  return returns.filter(r => {
    const rNo   = (r.return_no || '').toLowerCase();
    const invNo = (r.invoice_no || '').toLowerCase();
    const cust  = (r.customer_name || '').toLowerCase();
    const phone = (r.customer_phone || '').toLowerCase();
    const prods = (r.products_summary || '').toLowerCase();
    const q     = retFilters.search;

    if (q && !rNo.includes(q) && !invNo.includes(q) && !cust.includes(q) && !phone.includes(q) && !prods.includes(q)) {
      return false;
    }
    if (retFilters.dateFrom && r.date < retFilters.dateFrom) return false;
    if (retFilters.dateTo   && r.date > retFilters.dateTo) return false;
    if (retFilters.method   && r.refund_method !== retFilters.method) return false;
    if (retFilters.restock === 'yes' && !(r.items || []).some(it => it.restock === 1)) return false;
    if (retFilters.restock === 'no'  && (r.items || []).every(it => it.restock === 1)) return false;
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);
}

function renderReturnsTable() {
  const tbody = document.getElementById('ret-tbody');
  if (!tbody) return;

  const all = getFilteredReturns();
  const totalPages = Math.ceil(all.length / RET_PER_PAGE) || 1;
  if (retPage > totalPages) retPage = totalPages;
  const paged = all.slice((retPage - 1) * RET_PER_PAGE, retPage * RET_PER_PAGE);

  const showEl = document.getElementById('ret-showing');
  if (showEl) showEl.textContent = `Showing ${paged.length} of ${all.length} returns`;

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state" style="padding:40px"><i class="bi bi-arrow-return-left"></i><h4>No Return Records Found</h4><p>Click "New Return" to process customer returns.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(r => {
      const items = r.items || [];
      const anyRestocked = items.some(it => it.restock === 1);
      return `
        <tr>
          <td><strong style="color:var(--primary, #0284c7)">${sanitizeHTML(r.return_no)}</strong></td>
          <td>${formatDate(r.date)}</td>
          <td>${r.invoice_no ? `<span class="badge" style="background:var(--bg-light);border:1px solid var(--border-color);color:var(--text-dark)">${sanitizeHTML(r.invoice_no)}</span>` : '<span style="color:var(--text-muted)">Walk-in</span>'}</td>
          <td>${sanitizeHTML(r.customer_name)}<br><small style="color:var(--text-muted)">${sanitizeHTML(r.customer_phone || '—')}</small></td>
          <td style="min-width:240px;max-width:320px;vertical-align:top">
            <div style="display:flex;flex-direction:column;gap:5px">
              ${items.map(it => `
                <div style="display:flex;align-items:center;gap:8px;background:var(--bg-light);border:1px solid var(--border-light);border-radius:6px;padding:4px 8px">
                  ${it.image_url ? `<img src="${sanitizeHTML(it.image_url)}" alt="" style="width:28px;height:28px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'">` : '<i class="bi bi-box-seam" style="font-size:16px;color:var(--text-muted)"></i>'}
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;font-weight:600;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${sanitizeHTML(it.product_name || it.name)}">
                      ${sanitizeHTML(it.product_name || it.name)}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                      ${(it.size && it.size !== '—') ? `<span class="badge" style="background:var(--card-bg, #fff);border:1px solid var(--border-color);color:var(--text-dark);font-size:10px;padding:1px 5px;font-weight:700">Size: ${sanitizeHTML(it.size)}</span>` : ''}
                      <span>Qty: <strong>${it.return_qty || it.qty}</strong></span>
                      <span>·</span>
                      <span>Sold Rate: <strong>${formatINR(it.unit_price)}</strong></span>
                      <span>·</span>
                      <span style="color:var(--danger, #ef4444);font-weight:600">Refund: ${formatINR(it.refund_amount)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </td>
          <td><span class="badge" style="background:#f1f5f9;color:#334155;font-size:11px;padding:4px 7px">${sanitizeHTML(r.reason || 'Return')}</span></td>
          <td>
            ${anyRestocked 
              ? `<span class="badge" style="background:rgba(16,185,129,0.15);color:#065f46;border:1px solid rgba(16,185,129,0.3);font-size:11px;padding:3px 8px"><i class="bi bi-check-circle"></i> Restocked</span>` 
              : `<span class="badge" style="background:rgba(239,68,68,0.15);color:#991b1b;border:1px solid rgba(239,68,68,0.3);font-size:11px;padding:3px 8px"><i class="bi bi-x-circle"></i> Damaged / No Restock</span>`}
          </td>
          <td><strong style="color:var(--danger, #ef4444)">${formatINR(r.total_refund_amount)}</strong></td>
          <td><i class="bi bi-${r.refund_method === 'Cash' ? 'cash-coin' : r.refund_method === 'UPI' ? 'phone' : 'credit-card'}"></i> ${sanitizeHTML(r.refund_method || 'Cash')}</td>
          <td style="white-space:nowrap">
            <button class="btn-sm-action" title="View Return Receipt" onclick="viewReturnReceipt('${sanitizeHTML(r.id)}')"><i class="bi bi-eye"></i></button>
            <button class="btn-sm-action" title="Print Return Receipt" onclick="printReturnReceipt('${sanitizeHTML(r.id)}')"><i class="bi bi-printer"></i></button>
          </td>
        </tr>`;
    }).join('');
  }

  // Pagination
  const pgEl = document.getElementById('ret-pagination');
  if (pgEl) {
    pgEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === retPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => { retPage = i; renderReturnsTable(); });
      pgEl.appendChild(btn);
    }
  }
}

// ─── CUSTOMER AUTO-SUGGESTION FOR RETURNS ─────────────────────────────────────
function highlightCustMatch(text, query) {
  if (!text) return '';
  const safe = sanitizeHTML(text);
  if (!query || !query.trim()) return safe;
  const escaped = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  try {
    const regex = new RegExp(`(${escaped})`, 'gi');
    return safe.replace(regex, '<mark class="suggest-mark">$1</mark>');
  } catch (e) {
    return safe;
  }
}

function getCustomerSuggestions(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];

  const map = new Map();

  // 1. Registered customers from AppState.customers
  (AppState.customers || []).forEach(c => {
    const name = (c.name || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: c.id,
        name: name,
        phone: c.phone || '',
        address: c.address || '',
        email: c.email || '',
        recentInvoice: '',
        source: 'Registered Customer'
      });
    }
  });

  // 2. Customers from past sales (AppState.sales)
  (AppState.sales || []).forEach(s => {
    const name = (s.customer_name || s.customer || '').trim();
    if (!name || name.toLowerCase() === 'walk-in customer') return;
    const key = name.toLowerCase();
    const invNo = s.invoice_no || s.invoiceNo || '';
    const phone = s.customer_phone || s.customerPhone || '';
    const addr = s.customer_address || s.customerAddress || '';

    if (!map.has(key)) {
      map.set(key, {
        id: null,
        name: name,
        phone: phone,
        address: addr,
        email: '',
        recentInvoice: invNo,
        source: 'Past Buyer'
      });
    } else {
      const item = map.get(key);
      if (!item.phone && phone) item.phone = phone;
      if (!item.address && addr) item.address = addr;
      if (!item.recentInvoice && invNo) item.recentInvoice = invNo;
    }
  });

  // 3. Filter matches by query
  const matches = [];
  for (const item of map.values()) {
    const nameMatch = item.name.toLowerCase().includes(q);
    const phoneMatch = item.phone.toLowerCase().includes(q);

    if (nameMatch || phoneMatch) {
      let score = 0;
      if (item.name.toLowerCase().startsWith(q)) score += 50;
      else if (nameMatch) score += 30;
      if (item.phone.startsWith(q)) score += 40;
      else if (phoneMatch) score += 20;

      matches.push({ ...item, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 6);
}

function selectReturnCustomer(item) {
  const nameInput = document.getElementById('ret-input-customer');
  const phoneInput = document.getElementById('ret-input-phone');
  const invInput = document.getElementById('ret-input-inv');

  if (nameInput) nameInput.value = item.name;
  if (phoneInput && item.phone) phoneInput.value = item.phone;

  let invoiceFilled = false;
  if (invInput && !invInput.value.trim() && item.recentInvoice) {
    invInput.value = item.recentInvoice;
    invoiceFilled = true;
  }

  // Display helpful confirmation hint banner
  let hint = document.getElementById('ret-cust-autofill-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'ret-cust-autofill-hint';
    hint.className = 'suggest-autofill-hint mt-2';
    const parentRow = nameInput?.closest('.row');
    if (parentRow) parentRow.after(hint);
  }

  if (hint) {
    hint.innerHTML = `
      <i class="bi bi-check-circle-fill text-success"></i>
      <span>Customer matched: <strong>${sanitizeHTML(item.name)}</strong> (${sanitizeHTML(item.phone || 'No phone')})
      ${invoiceFilled ? ` · Linked to recent invoice <strong>${sanitizeHTML(item.recentInvoice)}</strong>. Click "<strong>Load</strong>" above to pull items.` : ''}</span>
    `;
    hint.style.display = 'flex';
  }

  const box = document.getElementById('ret-cust-autocomplete-list');
  if (box) box.style.display = 'none';
}

function initReturnCustomerAutosuggest() {
  const input = document.getElementById('ret-input-customer');
  const box = document.getElementById('ret-cust-autocomplete-list');
  if (!input || !box) return;

  let activeIdx = -1;
  let currentMatches = [];

  function renderSuggestions() {
    const q = input.value.trim();
    if (q.length < 1) {
      box.style.display = 'none';
      box.innerHTML = '';
      currentMatches = [];
      activeIdx = -1;
      return;
    }

    currentMatches = getCustomerSuggestions(q);
    if (!currentMatches.length) {
      box.style.display = 'none';
      box.innerHTML = '';
      activeIdx = -1;
      return;
    }

    activeIdx = -1;
    box.innerHTML = `
      <div class="prod-suggest-header">
        <span><i class="bi bi-person-check-fill" style="color:var(--primary)"></i> Existing Customers (${currentMatches.length})</span>
        <span style="font-size:10px;text-transform:none">Press ↑↓ to navigate, Enter to select</span>
      </div>
      ${currentMatches.map((c, idx) => `
        <div class="prod-suggest-item" data-idx="${idx}">
          <div class="prod-suggest-left">
            <div class="prod-suggest-title">
              <i class="bi bi-person-circle" style="font-size:14px;color:var(--primary)"></i>
              <span>${highlightCustMatch(c.name, q)}</span>
            </div>
            <div class="prod-suggest-meta">
              <span class="prod-suggest-badge brand"><i class="bi bi-telephone"></i> ${highlightCustMatch(c.phone || 'No phone', q)}</span>
              ${c.recentInvoice ? `<span class="prod-suggest-badge cat"><i class="bi bi-receipt"></i> Inv: ${sanitizeHTML(c.recentInvoice)}</span>` : ''}
              ${c.address ? `<span style="font-size:11px;color:var(--text-muted)"><i class="bi bi-geo-alt"></i> ${sanitizeHTML(c.address)}</span>` : ''}
            </div>
          </div>
          <div class="prod-suggest-right">
            <span class="badge" style="background:#eff6ff;color:var(--primary);font-size:10.5px;font-weight:600">${sanitizeHTML(c.source)}</span>
          </div>
        </div>
      `).join('')}
    `;

    box.style.display = 'block';

    box.querySelectorAll('.prod-suggest-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(el.dataset.idx, 10);
        if (currentMatches[idx]) {
          selectReturnCustomer(currentMatches[idx]);
        }
      });
    });
  }

  input.addEventListener('input', () => {
    const hint = document.getElementById('ret-cust-autofill-hint');
    if (hint) hint.remove();
    renderSuggestions();
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 1) {
      renderSuggestions();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (box.style.display === 'none' || !currentMatches.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % currentMatches.length;
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + currentMatches.length) % currentMatches.length;
      updateHighlight();
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && currentMatches[activeIdx]) {
        e.preventDefault();
        selectReturnCustomer(currentMatches[activeIdx]);
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

// ─────────────────────────────────────────────────────────────────────────────
// NEW RETURN MODAL & LOGIC
// ─────────────────────────────────────────────────────────────────────────────
function openNewReturnModal(prefillSale = null) {
  const modalEl = document.getElementById('new-return-modal');
  if (!modalEl) return;

  const form = document.getElementById('return-form');
  if (form) form.reset();

  document.getElementById('ret-items-container').innerHTML = '';
  document.getElementById('ret-input-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('ret-total-refund-display').textContent = '₹0.00';

  const box = document.getElementById('ret-cust-autocomplete-list');
  if (box) {
    box.style.display = 'none';
    box.innerHTML = '';
  }
  const hint = document.getElementById('ret-cust-autofill-hint');
  if (hint) hint.remove();

  if (prefillSale) {
    document.getElementById('ret-input-inv').value = prefillSale.invoice_no || prefillSale.invoiceNo || '';
    document.getElementById('ret-input-customer').value = prefillSale.customer_name || prefillSale.customer || '';
    document.getElementById('ret-input-phone').value = prefillSale.customer_phone || prefillSale.customerPhone || '';

    // Populate items from sale
    if (prefillSale.items && prefillSale.items.length) {
      populateReturnItemsFromSale(prefillSale);
    } else {
      addReturnItemRow();
    }
  } else {
    addReturnItemRow();
  }

  updateTotalRefundCalculated();

  returnModalInstance = new bootstrap.Modal(modalEl);
  returnModalInstance.show();
}

function populateReturnItemsFromSale(sale) {
  const container = document.getElementById('ret-items-container');
  if (!container) return;
  container.innerHTML = '';

  const items = sale.items || [];
  if (!items.length) {
    addReturnItemRow();
    return;
  }

  // 1. Calculate sum of raw line totals (sum of qty * unit_price)
  const totalItemsGross = items.reduce((sum, it) => {
    const q = Math.max(1, parseInt(it.qty) || 1);
    const p = parseFloat(it.unit_price || it.price || 0);
    return sum + (q * p);
  }, 0);

  // 2. Invoice discounts & grand total
  const invoiceTotalDiscount = parseFloat(sale.total_discount ?? sale.discount ?? 0);
  const sumRecordedItemDiscounts = items.reduce((sum, it) => sum + (parseFloat(it.discount) || 0), 0);
  const unallocatedInvoiceDiscount = Math.max(0, invoiceTotalDiscount - sumRecordedItemDiscounts);

  items.forEach(it => {
    const qty = Math.max(1, parseInt(it.qty) || 1);
    const origUnitPrice = parseFloat(it.unit_price || it.price || 0);
    const grossLine = qty * origUnitPrice;
    const recordedLineDisc = parseFloat(it.discount || 0);

    // Share of unallocated bill-level discount for this item
    let billDiscShare = 0;
    if (totalItemsGross > 0 && unallocatedInvoiceDiscount > 0) {
      billDiscShare = (grossLine / totalItemsGross) * unallocatedInvoiceDiscount;
    }

    const totalLineDiscount = recordedLineDisc + billDiscShare;
    const netLineTotal = Math.max(0, grossLine - totalLineDiscount);
    const exactSoldRate = (qty > 0) ? parseFloat((netLineTotal / qty).toFixed(2)) : 0;

    addReturnItemRow({
      productId: it.product_id || it.productId,
      productName: it.product_name || it.name,
      sku: it.sku || '',
      size: it.size || '',
      qty: qty,
      soldRate: exactSoldRate,
      originalPrice: origUnitPrice,
      discount: totalLineDiscount,
      unitPrice: exactSoldRate,
      refundAmount: parseFloat((exactSoldRate * qty).toFixed(2))
    });
  });
}

async function handleFetchInvoiceItems() {
  const invNo = document.getElementById('ret-input-inv')?.value.trim();
  if (!invNo) {
    showToast('Please enter an invoice number to load.', 'warning');
    return;
  }

  const res = await apiGet(`api/sales/item.php?invoice_no=${encodeURIComponent(invNo)}`);
  if (!res || !res.success || !res.data) {
    showToast('Invoice not found. Please check invoice number.', 'danger');
    return;
  }

  const sale = res.data;
  document.getElementById('ret-input-customer').value = sale.customer_name || 'Walk-in Customer';
  document.getElementById('ret-input-phone').value = sale.customer_phone || '';

  populateReturnItemsFromSale(sale);
  showToast(`Loaded ${sale.items?.length || 0} items from invoice ${invNo}`, 'success');

  updateTotalRefundCalculated();
}

function addReturnItemRow(data = null) {
  const container = document.getElementById('ret-items-container');
  if (!container) return;

  const rowId = 'ret-row-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  const row = document.createElement('div');
  row.className = 'card';
  row.id = rowId;
  row.style.background = 'var(--bg-card, #f8fafc)';
  row.style.border = '1px solid var(--border-color, #e2e8f0)';
  row.style.borderRadius = '8px';
  row.style.padding = '12px';

  const prods = AppState.products || [];
  const soldRate = (data && data.soldRate !== undefined) ? data.soldRate : (data ? (data.unitPrice || 0) : 0);
  const qty = data?.qty || 1;
  const refundAmount = (data && data.refundAmount !== undefined) ? data.refundAmount : (soldRate * qty);

  const initialRateStr = (soldRate > 0) ? Number(soldRate).toFixed(2) : '';
  const initialRefundStr = (refundAmount > 0) ? Number(refundAmount).toFixed(2) : '0.00';

  const hasDiscount = Boolean(data && data.discount && parseFloat(data.discount) > 0);
  const discountPill = hasDiscount
    ? `<div class="ret-item-disc-info mt-1" style="font-size:11px;color:#059669;font-weight:600;display:flex;align-items:center;gap:4px">
         <i class="bi bi-tag-fill"></i>
         <span>Sold @ ₹${Number(data.soldRate).toFixed(2)} (MRP: ₹${Number(data.originalPrice).toFixed(2)} - Disc: ₹${Number(data.discount).toFixed(2)})</span>
       </div>`
    : '';

  row.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
      <div style="font-weight:600;font-size:13px;color:var(--text-dark)">Item Details</div>
      <button type="button" class="btn-sm-action text-danger" onclick="document.getElementById('${rowId}').remove(); updateTotalRefundCalculated();" title="Remove Item"><i class="bi bi-trash"></i></button>
    </div>
    <div class="row g-2">
      <div class="col-12 col-md-4">
        <label class="form-label" style="font-size:11px;font-weight:600;margin-bottom:2px">Product *</label>
        <select class="form-control-it ret-item-prod" style="font-size:12px;padding:6px 10px" required>
          <option value="">-- Select Product --</option>
          ${prods.map(p => `
            <option value="${p.id}" data-sku="${sanitizeHTML(p.sku)}" data-price="${p.selling_price}" data-size="${sanitizeHTML(p.size||'')}" ${data && data.productId == p.id ? 'selected' : ''}>
              ${sanitizeHTML(p.name)} (${p.sku}) · ₹${p.selling_price}
            </option>
          `).join('')}
        </select>
        <input type="text" class="form-control-it ret-item-custom-name mt-1" placeholder="Custom product name (if not in catalog)" style="font-size:11.5px;padding:4px 8px;display:${data && !data.productId ? 'block' : 'none'}" value="${data && !data.productId ? sanitizeHTML(data.productName||'') : ''}">
        ${discountPill}
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" style="font-size:11px;font-weight:600;margin-bottom:2px">Size</label>
        <input type="text" class="form-control-it ret-item-size" style="font-size:12px;padding:6px 8px" placeholder="e.g. 8, M" value="${data ? sanitizeHTML(data.size||'') : ''}">
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" style="font-size:11px;font-weight:600;margin-bottom:2px">Sold Rate (₹) *</label>
        <input type="number" step="0.01" min="0" class="form-control-it ret-item-rate" style="font-size:12px;padding:6px 8px;font-weight:600;color:var(--brand-primary, #4361ee)" placeholder="0.00" value="${initialRateStr}" required>
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" style="font-size:11px;font-weight:600;margin-bottom:2px">Return Qty *</label>
        <input type="number" min="1" class="form-control-it ret-item-qty" style="font-size:12px;padding:6px 8px;font-weight:600" value="${qty}" required>
      </div>
      <div class="col-6 col-md-2">
        <label class="form-label" style="font-size:11px;font-weight:600;margin-bottom:2px">Refund Total (₹) *</label>
        <input type="number" step="0.01" min="0" class="form-control-it ret-item-refund" style="font-size:12px;padding:6px 8px;font-weight:700" value="${initialRefundStr}" required>
      </div>
    </div>
    <div class="row g-2 mt-1 align-items-center">
      <div class="col-12 col-md-6">
        <label class="form-label" style="font-size:11px;font-weight:600;margin-bottom:2px">Item Condition</label>
        <select class="form-control-it ret-item-condition" style="font-size:12px;padding:4px 8px">
          <option value="Good (Restock)">Good Condition (Eligible for Restock)</option>
          <option value="Defective (Do not restock)">Defective (Do not Restock)</option>
          <option value="Damaged">Damaged / Worn</option>
        </select>
      </div>
      <div class="col-12 col-md-6">
        <div class="form-check mt-3">
          <input class="form-check-input ret-item-restock" type="checkbox" id="check-${rowId}" checked>
          <label class="form-check-label" for="check-${rowId}" style="font-size:12px;font-weight:600;color:var(--text-dark)">
            Restock item into inventory (+ Stock count)
          </label>
        </div>
      </div>
    </div>
  `;

  container.appendChild(row);

  // Wire event handlers
  const prodSelect  = row.querySelector('.ret-item-prod');
  const sizeInput   = row.querySelector('.ret-item-size');
  const rateInput   = row.querySelector('.ret-item-rate');
  const qtyInput    = row.querySelector('.ret-item-qty');
  const refundInput = row.querySelector('.ret-item-refund');
  const condSelect  = row.querySelector('.ret-item-condition');
  const restockBox  = row.querySelector('.ret-item-restock');

  function recalcRow() {
    const rate = parseFloat(rateInput.value || 0);
    const q = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    refundInput.value = (rate * q).toFixed(2);
    updateTotalRefundCalculated();
  }

  prodSelect.addEventListener('change', () => {
    const opt = prodSelect.options[prodSelect.selectedIndex];
    if (opt && opt.value) {
      const price = parseFloat(opt.dataset.price || 0);
      const size  = opt.dataset.size || '';
      if (!sizeInput.value && size) sizeInput.value = size;
      rateInput.value = price.toFixed(2);
      recalcRow();

      const discNote = row.querySelector('.ret-item-disc-info');
      if (discNote) discNote.remove();
    }
    updateTotalRefundCalculated();
  });

  rateInput.addEventListener('input', recalcRow);

  qtyInput.addEventListener('input', () => {
    let val = qtyInput.value.replace(/[^0-9]/g, '');
    if (val !== '' && parseInt(val, 10) < 1) val = '1';
    if (qtyInput.value !== val) qtyInput.value = val;
    recalcRow();
  });

  refundInput.addEventListener('input', updateTotalRefundCalculated);

  condSelect.addEventListener('change', () => {
    if (condSelect.value.includes('Defective') || condSelect.value.includes('Damaged')) {
      restockBox.checked = false;
    } else {
      restockBox.checked = true;
    }
  });

  updateTotalRefundCalculated();
}

function updateTotalRefundCalculated() {
  const container = document.getElementById('ret-items-container');
  if (!container) return;

  const refundInputs = container.querySelectorAll('.ret-item-refund');
  let total = 0;
  refundInputs.forEach(inp => {
    total += parseFloat(inp.value || 0);
  });

  const displayEl = document.getElementById('ret-total-refund-display');
  if (displayEl) displayEl.textContent = formatINR(total);
}

async function handleSaveReturn() {
  const invoiceNo     = document.getElementById('ret-input-inv')?.value.trim() || '';
  const customerName  = document.getElementById('ret-input-customer')?.value.trim() || 'Walk-in Customer';
  const customerPhone = document.getElementById('ret-input-phone')?.value.trim() || '';
  const date          = document.getElementById('ret-input-date')?.value || new Date().toISOString().split('T')[0];
  const reason        = document.getElementById('ret-input-reason')?.value || 'Customer Return';
  const refundMethod  = document.getElementById('ret-input-method')?.value || 'Cash';
  const notes         = document.getElementById('ret-input-notes')?.value.trim() || '';

  const rows = document.querySelectorAll('#ret-items-container > .card');
  if (!rows.length) {
    showToast('Please add at least one returned item.', 'danger');
    return;
  }

  const items = [];
  for (const row of rows) {
    const prodSelect = row.querySelector('.ret-item-prod');
    const customInp  = row.querySelector('.ret-item-custom-name');
    const sizeInp    = row.querySelector('.ret-item-size');
    const rateInp    = row.querySelector('.ret-item-rate');
    const qtyInp     = row.querySelector('.ret-item-qty');
    const refundInp  = row.querySelector('.ret-item-refund');
    const condSelect = row.querySelector('.ret-item-condition');
    const restockBox = row.querySelector('.ret-item-restock');

    const opt = prodSelect.options[prodSelect.selectedIndex];
    const prodId = opt && opt.value ? parseInt(opt.value) : null;
    let prodName = '';
    let sku = '';

    if (prodId) {
      const found = AppState.products.find(p => p.id == prodId);
      prodName = found ? found.name : opt.text;
      sku = found ? found.sku : (opt.dataset.sku || '');
    } else {
      prodName = customInp.value.trim() || 'Returned Product';
    }

    const qty = Math.max(1, parseInt(qtyInp.value, 10) || 1);
    const refundAmount = parseFloat(refundInp.value) || 0;
    const soldRate = (rateInp && rateInp.value !== '')
      ? parseFloat(rateInp.value || 0)
      : (qty > 0 ? (refundAmount / qty) : refundAmount);
    const size = sizeInp.value.trim();
    const restock = restockBox.checked ? 1 : 0;
    const itemCondition = condSelect.value;

    items.push({
      product_id: prodId,
      product_name: prodName,
      sku: sku,
      size: size,
      return_qty: qty,
      unit_price: soldRate,
      refund_amount: refundAmount,
      restock: restock,
      item_condition: itemCondition
    });
  }

  const payload = {
    invoice_no: invoiceNo,
    customer_name: customerName,
    customer_phone: customerPhone,
    date: date,
    reason: reason,
    refund_method: refundMethod,
    refund_status: 'Completed',
    notes: notes,
    items: items
  };

  const btn = document.getElementById('btn-save-return');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';
  }

  const res = await apiPost('api/returns/index.php', payload);

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-check2-circle"></i> Confirm &amp; Process Return';
  }

  if (res && res.success) {
    showToast(`Return #${res.data.return_no} processed successfully!`, 'success');
    if (returnModalInstance) returnModalInstance.hide();
    // Refresh products stock in memory
    const pRes = await apiGet('api/products/index.php');
    if (pRes && pRes.success) AppState.products = pRes.data;
    // Re-render returns
    renderSalesReturns();
  } else {
    showToast(res ? res.error : 'Failed to process return.', 'danger');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW & PRINT RETURN RECEIPT / CREDIT NOTE
// ─────────────────────────────────────────────────────────────────────────────
async function viewReturnReceipt(id) {
  const body = document.getElementById('view-return-body');
  if (!body) return;
  body.innerHTML = renderLoadingSpinner('Loading return details...');
  new bootstrap.Modal(document.getElementById('view-return-modal')).show();

  const res = await apiGet(`api/returns/item.php?id=${id}`);
  if (!res || !res.success || !res.data) {
    body.innerHTML = '<div class="alert alert-danger">Failed to load return receipt details.</div>';
    return;
  }

  const ret = res.data;
  const settings = AppState.settings || {};
  const items = ret.items || [];

  body.innerHTML = `
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="invoice-company">
          <h2>${sanitizeHTML(settings.businessName || 'Infinity Traders')}</h2>
          <p>${sanitizeHTML(settings.businessAddress || '')}<br>GSTIN: ${sanitizeHTML(settings.gstin || '—')}<br>Phone: ${sanitizeHTML(settings.phone || '—')}</p>
        </div>
        <div class="invoice-meta">
          <h3 style="color:var(--danger, #ef4444)">CREDIT NOTE / RETURN</h3>
          <p class="invoice-no">${sanitizeHTML(ret.return_no)}</p>
          <p>Date: ${formatDate(ret.date)}</p>
          ${ret.invoice_no ? `<p>Original Invoice: <strong>${sanitizeHTML(ret.invoice_no)}</strong></p>` : ''}
        </div>
      </div>
      <div class="invoice-parties">
        <div class="invoice-party">
          <h5>Customer</h5>
          <p>
            <strong>${sanitizeHTML(ret.customer_name || 'Walk-in Customer')}</strong><br>
            ${ret.customer_phone ? `<span>📞 ${sanitizeHTML(ret.customer_phone)}</span><br>` : ''}
            ${ret.customer_address ? `<span><i class="bi bi-geo-alt"></i> ${sanitizeHTML(ret.customer_address)}</span>` : ''}
          </p>
        </div>
        <div class="invoice-party">
          <h5>Return Details</h5>
          <p>
            Reason: <strong>${sanitizeHTML(ret.reason || 'Customer Return')}</strong><br>
            Refund Via: <strong>${sanitizeHTML(ret.refund_method || 'Cash')}</strong><br>
            Status: <span class="badge" style="background:#dcfce7;color:#166534">Completed</span>
          </p>
        </div>
      </div>
      <table class="invoice-items-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Returned Product</th>
            <th>Condition</th>
            <th>Restocked</th>
            <th>Sold Rate</th>
            <th>Qty</th>
            <th>Refund Amount</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it, i) => `
            <tr>
              <td>${i+1}</td>
              <td>
                <div style="font-weight:600">${sanitizeHTML(it.product_name || it.name)}</div>
                ${(it.size && it.size !== '—') ? `<span class="badge" style="background:#e2e8f0;color:#1e293b;font-size:10px;padding:2px 5px">Size: ${sanitizeHTML(it.size)}</span>` : ''}
              </td>
              <td><small>${sanitizeHTML(it.item_condition || 'Good')}</small></td>
              <td>${it.restock ? '<span class="text-success font-weight-bold">Yes (+Stock)</span>' : '<span class="text-muted">No</span>'}</td>
              <td>${formatINR(it.unit_price || (it.refund_amount / (it.return_qty || it.qty || 1)))}</td>
              <td>${it.return_qty || it.qty}</td>
              <td><strong>${formatINR(it.refund_amount)}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row grand" style="color:var(--danger, #ef4444)">
          <span>TOTAL REFUNDED</span>
          <span>${formatINR(ret.total_refund_amount)}</span>
        </div>
      </div>
      ${ret.notes ? `<div style="margin-top:16px;padding:10px;background:var(--bg-light);border-radius:6px;font-size:12px;color:var(--text-muted)"><strong>Notes:</strong> ${sanitizeHTML(ret.notes)}</div>` : ''}
      <div class="invoice-footer-note" style="margin-top:20px"><p>Customer Return &amp; Credit Voucher · Infinity Traders</p></div>
    </div>
  `;

  document.getElementById('btn-print-return').onclick = () => {
    const container = document.querySelector('#view-return-modal .invoice-container');
    printInvoiceContent(container ? container.outerHTML : body.innerHTML);
  };
}

async function printReturnReceipt(id) {
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write('<div style="font-family:sans-serif;padding:50px;text-align:center;color:#64748b;font-size:16px"><div style="display:inline-block;width:32px;height:32px;border:3px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px"></div><br>Preparing return receipt for printing...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>');
  }

  try {
    const res = await apiGet(`api/returns/item.php?id=${id}`);
    if (res && res.success && res.data) {
      const ret = res.data;
      const settings = AppState.settings || {};
      const items = ret.items || [];
      const html = `
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="invoice-company">
              <h2>${sanitizeHTML(settings.businessName || 'Infinity Traders')}</h2>
              <p>${sanitizeHTML(settings.businessAddress || '')}<br>GSTIN: ${sanitizeHTML(settings.gstin || '—')}<br>Phone: ${sanitizeHTML(settings.phone || '—')}</p>
            </div>
            <div class="invoice-meta">
              <h3 style="color:#ef4444">CREDIT NOTE</h3>
              <p class="invoice-no">${sanitizeHTML(ret.return_no)}</p>
              <p>Original Bill: <strong>${sanitizeHTML(ret.invoice_no)}</strong></p>
              <p>Date: ${formatDate(ret.date)}</p>
            </div>
          </div>
          <div class="invoice-parties">
            <div class="invoice-party">
              <h5>Customer</h5>
              <p>
                <strong>${sanitizeHTML(ret.customer_name || 'Walk-in Customer')}</strong><br>
                ${ret.customer_phone ? `<span>📞 ${sanitizeHTML(ret.customer_phone)}</span><br>` : ''}
                ${ret.customer_address ? `<span><i class="bi bi-geo-alt"></i> ${sanitizeHTML(ret.customer_address)}</span>` : ''}
              </p>
            </div>
            <div class="invoice-party">
              <h5>Return Details</h5>
              <p>
                Reason: <strong>${sanitizeHTML(ret.reason || 'Customer Return')}</strong><br>
                Refund Via: <strong>${sanitizeHTML(ret.refund_method || 'Cash')}</strong><br>
                Status: <span class="badge" style="background:#dcfce7;color:#166534">Completed</span>
              </p>
            </div>
          </div>
          <table class="invoice-items-table">
            <thead>
              <tr>
                <th class="col-hide-thermal">#</th>
                <th>Returned Product</th>
                <th class="col-hide-thermal">Condition</th>
                <th class="col-hide-thermal">Restocked</th>
                <th class="col-hide-thermal">Sold Rate</th>
                <th class="col-qty">Qty</th>
                <th class="col-total">Refund Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, i) => `
                <tr>
                  <td class="col-hide-thermal">${i+1}</td>
                  <td class="col-product">
                    <div style="font-weight:600">${sanitizeHTML(it.product_name || it.name)}</div>
                    <div class="item-thermal-meta">
                      ${(it.size && it.size !== '—') ? `<span>Size: ${sanitizeHTML(it.size)}</span> ` : ''}
                      ${it.item_condition ? `<span>| Cond: ${sanitizeHTML(it.item_condition)}</span>` : ''}
                      <span>| Rate: ${formatINR(it.unit_price || (it.refund_amount / (it.return_qty || it.qty || 1)))}</span>
                    </div>
                  </td>
                  <td class="col-hide-thermal"><small>${sanitizeHTML(it.item_condition || 'Good')}</small></td>
                  <td class="col-hide-thermal">${it.restock ? '<span class="text-success font-weight-bold">Yes (+Stock)</span>' : '<span class="text-muted">No</span>'}</td>
                  <td class="col-hide-thermal">${formatINR(it.unit_price || (it.refund_amount / (it.return_qty || it.qty || 1)))}</td>
                  <td class="col-qty">${it.return_qty || it.qty}</td>
                  <td class="col-total"><strong>${formatINR(it.refund_amount)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="invoice-totals">
            <div class="total-row grand" style="color:var(--danger, #ef4444)">
              <span>TOTAL REFUNDED</span>
              <span>${formatINR(ret.total_refund_amount)}</span>
            </div>
          </div>
          ${ret.notes ? `<div style="margin-top:16px;padding:10px;background:var(--bg-light);border-radius:6px;font-size:12px;color:var(--text-muted)"><strong>Notes:</strong> ${sanitizeHTML(ret.notes)}</div>` : ''}
          <div class="invoice-footer-note" style="margin-top:20px"><p>Customer Return &amp; Credit Voucher · Infinity Traders</p></div>
        </div>`;
      printInvoiceContent(html, `Credit Note - ${ret.return_no}`, printWin);
    } else {
      if (printWin) printWin.close();
      showToast('Could not load return receipt for printing', 'danger');
    }
  } catch (e) {
    if (printWin) printWin.close();
    console.error('Error printing return receipt:', e);
    showToast('Failed to print return receipt: ' + e.message, 'danger');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1-CLICK RETURN TRIGGER FROM SALES HISTORY
// ─────────────────────────────────────────────────────────────────────────────
async function openReturnModalForSale(saleId) {
  const res = await apiGet(`api/sales/item.php?id=${saleId}`);
  if (!res || !res.success || !res.data) {
    showToast('Failed to load sale details for return.', 'danger');
    return;
  }
  // Navigate to returns or open return modal directly
  if (AppState.currentPage !== 'sales-returns') {
    navigateTo('sales-returns');
    setTimeout(() => {
      openNewReturnModal(res.data);
    }, 200);
  } else {
    openNewReturnModal(res.data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT RETURNS CSV
// ─────────────────────────────────────────────────────────────────────────────
function exportReturnsCSV() {
  const data = getFilteredReturns();
  exportCSV('sales_returns.csv',
    ['Return No.','Date','Original Invoice','Customer','Phone','Products Returned','Reason','Restocked','Total Refund','Refund Method'],
    data.map(r => [
      r.return_no,
      r.date,
      r.invoice_no || '',
      r.customer_name,
      r.customer_phone || '',
      r.products_summary || (r.items || []).map(it => `${it.product_name} (${it.size}) x${it.return_qty}`).join('; '),
      r.reason || '',
      (r.items || []).some(it => it.restock === 1) ? 'Yes' : 'No',
      r.total_refund_amount,
      r.refund_method || 'Cash'
    ])
  );
}
