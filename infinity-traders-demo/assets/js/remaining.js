/**
 * INFINITY TRADERS — Suppliers, Customers & Settings (remaining.js)
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────────────────────────────────────────
let supplierEditId = null;

function renderSuppliers(container) {
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Suppliers</h1>
        <div class="breadcrumb-text">${AppState.suppliers.length} suppliers on record (sample data)</div>
      </div>
      <div class="page-header-right">
        <button class="btn-primary-it" id="btn-add-supplier"><i class="bi bi-plus"></i> Add Supplier</button>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="sup-search" placeholder="🔍 Search suppliers...">
          <select class="form-control-it" id="sup-status-filter">
            <option value="">All Status</option><option>Active</option><option>Inactive</option>
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead>
            <tr><th>Supplier Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Outstanding (₹)</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody id="sup-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Add/Edit Supplier Modal -->
  <div class="modal fade" id="supplier-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="supplier-modal-title"><i class="bi bi-building"></i> Add Supplier</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label">Supplier Name *</label><input type="text" class="form-control-it" id="sup-name"><div class="form-error-msg" id="err-sup-name"></div></div>
            <div class="col-md-6"><label class="form-label">Contact Person</label><input type="text" class="form-control-it" id="sup-contact"></div>
            <div class="col-md-6"><label class="form-label">Phone</label><input type="tel" class="form-control-it" id="sup-phone" placeholder="+91 00000 00000"></div>
            <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control-it" id="sup-email"></div>
            <div class="col-12"><label class="form-label">Address</label><textarea class="form-control-it" id="sup-address" rows="2" style="resize:vertical"></textarea></div>
            <div class="col-md-6"><label class="form-label">GSTIN (Placeholder)</label><input type="text" class="form-control-it" id="sup-gstin" placeholder="GSTIN_PLACEHOLDER"></div>
            <div class="col-md-3"><label class="form-label">Outstanding (₹)</label><input type="number" class="form-control-it" id="sup-outstanding" value="0" min="0"></div>
            <div class="col-md-3"><label class="form-label">Status</label><select class="form-control-it" id="sup-status"><option>Active</option><option>Inactive</option></select></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
          <button class="btn-primary-it" id="btn-save-supplier"><i class="bi bi-save"></i> Save Supplier</button>
        </div>
      </div>
    </div>
  </div>

  <!-- View Supplier Modal -->
  <div class="modal fade" id="view-supplier-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-md">
      <div class="modal-content">
        <div class="modal-header"><h5 class="modal-title"><i class="bi bi-building"></i> Supplier Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body" id="view-supplier-body"></div>
        <div class="modal-footer"><button class="btn-ghost" data-bs-dismiss="modal">Close</button></div>
      </div>
    </div>
  </div>`;

  renderSupplierTable('', '');

  document.getElementById('sup-search')?.addEventListener('input', () => refreshSupTable());
  document.getElementById('sup-status-filter')?.addEventListener('change', () => refreshSupTable());

  document.getElementById('btn-add-supplier')?.addEventListener('click', () => openSupplierModal(null));
  document.getElementById('btn-save-supplier')?.addEventListener('click', saveSupplier);
}

function refreshSupTable() {
  const q      = document.getElementById('sup-search')?.value.toLowerCase() || '';
  const status = document.getElementById('sup-status-filter')?.value || '';
  renderSupplierTable(q, status);
}

function renderSupplierTable(query, statusFilter) {
  const tbody = document.getElementById('sup-tbody');
  if (!tbody) return;
  let data = AppState.suppliers;
  if (query)        data = data.filter(s => s.name.toLowerCase().includes(query) || s.contactPerson.toLowerCase().includes(query));
  if (statusFilter) data = data.filter(s => s.status === statusFilter);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><i class="bi bi-building"></i><h4>No Suppliers Found</h4></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(s => `<tr>
    <td><strong>${sanitizeHTML(s.name)}</strong></td>
    <td>${sanitizeHTML(s.contactPerson)}</td>
    <td>${sanitizeHTML(s.phone)}</td>
    <td>${sanitizeHTML(s.email)}</td>
    <td class="${s.outstanding > 0 ? 'stock-out' : 'stock-ok'}" style="font-weight:${s.outstanding>0?'700':'400'}">${formatINR(s.outstanding)}</td>
    <td><span class="badge-status ${s.status === 'Active' ? 'badge-active' : 'badge-out'}">${sanitizeHTML(s.status)}</span></td>
    <td style="white-space:nowrap">
      <button class="btn-sm-action" onclick="viewSupplier('${sanitizeHTML(s.id)}')"><i class="bi bi-eye"></i></button>
      <button class="btn-sm-action" onclick="openSupplierModal('${sanitizeHTML(s.id)}')"><i class="bi bi-pencil"></i> Edit</button>
    </td>
  </tr>`).join('');
}

function openSupplierModal(id) {
  supplierEditId = id;
  const title = document.getElementById('supplier-modal-title');
  if (title) title.innerHTML = id ? '<i class="bi bi-pencil"></i> Edit Supplier' : '<i class="bi bi-building"></i> Add Supplier';

  ['sup-name','sup-contact','sup-phone','sup-email','sup-address','sup-gstin'].forEach(el => {
    const e = document.getElementById(el); if (e) e.value = '';
  });
  document.getElementById('sup-outstanding').value = '0';
  document.getElementById('sup-status').value = 'Active';
  document.getElementById('err-sup-name').textContent = '';

  if (id) {
    const s = AppState.suppliers.find(x => x.id === id);
    if (s) {
      document.getElementById('sup-name').value        = s.name;
      document.getElementById('sup-contact').value     = s.contactPerson;
      document.getElementById('sup-phone').value       = s.phone;
      document.getElementById('sup-email').value       = s.email;
      document.getElementById('sup-address').value     = s.address;
      document.getElementById('sup-gstin').value       = s.gstin;
      document.getElementById('sup-outstanding').value = s.outstanding;
      document.getElementById('sup-status').value      = s.status;
    }
  }
  new bootstrap.Modal(document.getElementById('supplier-modal')).show();
}

function saveSupplier() {
  const name = document.getElementById('sup-name')?.value.trim();
  const errEl = document.getElementById('err-sup-name');
  if (!name) { if (errEl) errEl.textContent = 'Supplier name is required.'; return; }
  if (errEl) errEl.textContent = '';

  const data = {
    name,
    contactPerson: document.getElementById('sup-contact')?.value.trim() || '',
    phone:         document.getElementById('sup-phone')?.value.trim() || '',
    email:         document.getElementById('sup-email')?.value.trim() || '',
    address:       document.getElementById('sup-address')?.value.trim() || '',
    gstin:         document.getElementById('sup-gstin')?.value.trim() || 'GSTIN_PLACEHOLDER',
    outstanding:   parseFloat(document.getElementById('sup-outstanding')?.value || 0) || 0,
    status:        document.getElementById('sup-status')?.value || 'Active'
  };

  if (supplierEditId) {
    const idx = AppState.suppliers.findIndex(s => s.id === supplierEditId);
    if (idx !== -1) AppState.suppliers[idx] = { id: supplierEditId, ...data };
    showToast('Supplier updated!', 'success');
  } else {
    AppState.suppliers.push({ id: `sup-${Date.now()}`, ...data });
    showToast('Supplier added!', 'success');
  }
  bootstrap.Modal.getInstance(document.getElementById('supplier-modal'))?.hide();
  refreshSupTable();
}

function viewSupplier(id) {
  const s = AppState.suppliers.find(x => x.id === id);
  if (!s) return;
  const body = document.getElementById('view-supplier-body');
  if (!body) return;
  const purchaseCount = AppState.purchases.filter(p => p.supplierId === id).length;
  const totalPurchased = AppState.purchases.filter(p => p.supplierId === id).reduce((sum, p) => sum + p.totalAmount, 0);
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><span class="form-label">Supplier Name</span><p style="font-weight:700;font-size:15px">${sanitizeHTML(s.name)}</p></div>
      <div><span class="form-label">Status</span><p><span class="badge-status ${s.status==='Active'?'badge-active':'badge-out'}">${sanitizeHTML(s.status)}</span></p></div>
      <div><span class="form-label">Contact Person</span><p>${sanitizeHTML(s.contactPerson||'—')}</p></div>
      <div><span class="form-label">Phone</span><p>${sanitizeHTML(s.phone||'—')}</p></div>
      <div><span class="form-label">Email</span><p>${sanitizeHTML(s.email||'—')}</p></div>
      <div><span class="form-label">GSTIN</span><p><code>${sanitizeHTML(s.gstin)}</code></p></div>
      <div class="col-span-2"><span class="form-label">Address</span><p>${sanitizeHTML(s.address||'—')}</p></div>
      <div><span class="form-label">Outstanding Balance</span><p class="${s.outstanding>0?'stock-out':''}" style="font-weight:700;font-size:16px">${formatINR(s.outstanding)}</p></div>
      <div><span class="form-label">Purchase History</span><p>${purchaseCount} orders · ${formatINR(totalPurchased)} total</p></div>
    </div>`;
  new bootstrap.Modal(document.getElementById('view-supplier-modal')).show();
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────
let customerEditId = null;

function renderCustomers(container) {
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Customers</h1>
        <div class="breadcrumb-text">${AppState.customers.length} customers on record (sample data)</div>
      </div>
      <div class="page-header-right">
        <button class="btn-primary-it" id="btn-add-customer"><i class="bi bi-plus"></i> Add Customer</button>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="cust-search" placeholder="🔍 Search customers...">
        </div>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Email</th><th>Total Purchases</th><th>Outstanding</th><th>Actions</th></tr>
          </thead>
          <tbody id="cust-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- Add/Edit Customer Modal -->
  <div class="modal fade" id="customer-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-md">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="customer-modal-title"><i class="bi bi-person-plus"></i> Add Customer</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-6"><label class="form-label">Customer Name *</label><input type="text" class="form-control-it" id="cust-name"><div class="form-error-msg" id="err-cust-name"></div></div>
            <div class="col-md-6"><label class="form-label">Phone</label><input type="tel" class="form-control-it" id="cust-phone" placeholder="+91 00000 00000"></div>
            <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control-it" id="cust-email"></div>
            <div class="col-md-6"><label class="form-label">Outstanding (₹)</label><input type="number" class="form-control-it" id="cust-outstanding" value="0" min="0"></div>
            <div class="col-12"><label class="form-label">Address</label><textarea class="form-control-it" id="cust-address" rows="2" style="resize:vertical"></textarea></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
          <button class="btn-primary-it" id="btn-save-customer"><i class="bi bi-save"></i> Save Customer</button>
        </div>
      </div>
    </div>
  </div>

  <!-- View Customer Modal -->
  <div class="modal fade" id="view-customer-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-md">
      <div class="modal-content">
        <div class="modal-header"><h5 class="modal-title"><i class="bi bi-person"></i> Customer Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
        <div class="modal-body" id="view-customer-body"></div>
        <div class="modal-footer"><button class="btn-ghost" data-bs-dismiss="modal">Close</button></div>
      </div>
    </div>
  </div>`;

  renderCustomerTable('');
  document.getElementById('cust-search')?.addEventListener('input', e => renderCustomerTable(e.target.value.toLowerCase()));
  document.getElementById('btn-add-customer')?.addEventListener('click', () => openCustomerModal(null));
  document.getElementById('btn-save-customer')?.addEventListener('click', saveCustomer);
}

function renderCustomerTable(query) {
  const tbody = document.getElementById('cust-tbody');
  if (!tbody) return;
  let data = AppState.customers;
  if (query) data = data.filter(c => c.name.toLowerCase().includes(query) || c.phone.includes(query));

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:40px"><i class="bi bi-people"></i><h4>No Customers Found</h4></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => {
    const purchaseHistory = AppState.sales.filter(s => s.customer === c.name).length;
    return `<tr>
      <td><strong>${sanitizeHTML(c.name)}</strong></td>
      <td>${sanitizeHTML(c.phone||'—')}</td>
      <td>${sanitizeHTML(c.email||'—')}</td>
      <td>${formatINR(c.totalPurchases)} <small style="color:var(--text-muted)">(${purchaseHistory} invoices)</small></td>
      <td class="${c.outstanding>0?'stock-out':''}" style="font-weight:${c.outstanding>0?'700':'400'}">${formatINR(c.outstanding)}</td>
      <td style="white-space:nowrap">
        <button class="btn-sm-action" onclick="viewCustomer('${sanitizeHTML(c.id)}')"><i class="bi bi-eye"></i></button>
        <button class="btn-sm-action" onclick="openCustomerModal('${sanitizeHTML(c.id)}')"><i class="bi bi-pencil"></i> Edit</button>
      </td>
    </tr>`;
  }).join('');
}

function openCustomerModal(id) {
  customerEditId = id;
  const title = document.getElementById('customer-modal-title');
  if (title) title.innerHTML = id ? '<i class="bi bi-pencil"></i> Edit Customer' : '<i class="bi bi-person-plus"></i> Add Customer';
  ['cust-name','cust-phone','cust-email','cust-address'].forEach(el => { const e = document.getElementById(el); if (e) e.value = ''; });
  document.getElementById('cust-outstanding').value = '0';
  document.getElementById('err-cust-name').textContent = '';

  if (id) {
    const c = AppState.customers.find(x => x.id === id);
    if (c) {
      document.getElementById('cust-name').value        = c.name;
      document.getElementById('cust-phone').value       = c.phone || '';
      document.getElementById('cust-email').value       = c.email || '';
      document.getElementById('cust-address').value     = c.address || '';
      document.getElementById('cust-outstanding').value = c.outstanding || 0;
    }
  }
  new bootstrap.Modal(document.getElementById('customer-modal')).show();
}

function saveCustomer() {
  const name = document.getElementById('cust-name')?.value.trim();
  const errEl = document.getElementById('err-cust-name');
  if (!name) { if (errEl) errEl.textContent = 'Customer name is required.'; return; }
  if (errEl) errEl.textContent = '';

  const data = {
    name,
    phone:       document.getElementById('cust-phone')?.value.trim() || '',
    email:       document.getElementById('cust-email')?.value.trim() || '',
    address:     document.getElementById('cust-address')?.value.trim() || '',
    outstanding: parseFloat(document.getElementById('cust-outstanding')?.value || 0) || 0,
    totalPurchases: 0
  };

  if (customerEditId) {
    const idx = AppState.customers.findIndex(c => c.id === customerEditId);
    if (idx !== -1) { data.totalPurchases = AppState.customers[idx].totalPurchases; AppState.customers[idx] = { id: customerEditId, ...data }; }
    showToast('Customer updated!', 'success');
  } else {
    AppState.customers.push({ id: `cust-${Date.now()}`, ...data });
    showToast('Customer added!', 'success');
  }
  bootstrap.Modal.getInstance(document.getElementById('customer-modal'))?.hide();
  renderCustomerTable('');
}

function viewCustomer(id) {
  const c = AppState.customers.find(x => x.id === id);
  if (!c) return;
  const body = document.getElementById('view-customer-body');
  if (!body) return;
  const invoices = AppState.sales.filter(s => s.customer === c.name);
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><span class="form-label">Customer Name</span><p style="font-weight:700;font-size:15px">${sanitizeHTML(c.name)}</p></div>
      <div><span class="form-label">Phone</span><p>${sanitizeHTML(c.phone||'—')}</p></div>
      <div><span class="form-label">Email</span><p>${sanitizeHTML(c.email||'—')}</p></div>
      <div><span class="form-label">Outstanding</span><p class="${c.outstanding>0?'stock-out':''}" style="font-weight:700">${formatINR(c.outstanding)}</p></div>
      <div><span class="form-label">Total Purchases</span><p style="font-weight:700;color:var(--primary)">${formatINR(c.totalPurchases)}</p></div>
      <div><span class="form-label">Address</span><p>${sanitizeHTML(c.address||'—')}</p></div>
    </div>
    <div style="margin-top:18px">
      <span class="form-label">Recent Invoices</span>
      ${invoices.length ? invoices.slice(0,3).map(s=>`
        <div class="low-stock-item">
          <div><div style="font-weight:600">${sanitizeHTML(s.invoiceNo)}</div><div style="font-size:11.5px;color:var(--text-muted)">${formatDate(s.date)}</div></div>
          <div style="text-align:right"><div style="font-weight:700;color:var(--primary)">${formatINR(s.grandTotal)}</div>${paymentBadge(s.paymentStatus)}</div>
        </div>`).join('') : `<p style="font-size:13px;color:var(--text-muted)">No invoices found for this customer.</p>`}
    </div>`;
  new bootstrap.Modal(document.getElementById('view-customer-modal')).show();
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
function renderSettings(container) {
  const s = AppState.settings;
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Settings</h1>
        <div class="breadcrumb-text">Session settings — not persisted across page refreshes</div>
      </div>
      <div class="page-header-right">
        <button class="btn-primary-it" id="btn-save-settings"><i class="bi bi-save"></i> Save Settings</button>
      </div>
    </div>
    <div class="demo-banner">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span><strong>Note:</strong> Settings are stored in-memory only for this demo session. They will reset on page refresh. Do not enter real confidential information.</span>
    </div>

    <div class="settings-section">
      <h5><i class="bi bi-building"></i> Business Information</h5>
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Business Name</label><input type="text" class="form-control-it" id="set-biz-name" value="${sanitizeHTML(s.businessName)}"></div>
        <div class="col-md-6"><label class="form-label">Phone (Placeholder)</label><input type="tel" class="form-control-it" id="set-phone" value="${sanitizeHTML(s.phone)}"></div>
        <div class="col-md-6"><label class="form-label">Email (Placeholder)</label><input type="email" class="form-control-it" id="set-email" value="${sanitizeHTML(s.email)}"></div>
        <div class="col-md-6"><label class="form-label">GSTIN (Placeholder)</label><input type="text" class="form-control-it" id="set-gstin" value="${sanitizeHTML(s.gstin)}"></div>
        <div class="col-12"><label class="form-label">Business Address (Placeholder)</label><textarea class="form-control-it" id="set-address" rows="2" style="resize:vertical">${sanitizeHTML(s.businessAddress)}</textarea></div>
      </div>
    </div>

    <div class="settings-section">
      <h5><i class="bi bi-gear"></i> Invoice & Billing Settings</h5>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Invoice Prefix</label>
          <input type="text" class="form-control-it" id="set-inv-prefix" value="${sanitizeHTML(s.invoicePrefix)}">
        </div>
        <div class="col-md-4">
          <label class="form-label">Currency</label>
          <select class="form-control-it" id="set-currency">
            <option value="INR" selected>INR (₹)</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">Low Stock Threshold (default)</label>
          <input type="number" class="form-control-it" id="set-low-stock" value="${s.lowStockThreshold}" min="1">
        </div>
        <div class="col-md-4">
          <label class="form-label">Default GST Mode</label>
          <select class="form-control-it" id="set-gst-mode">
            <option value="false" ${!s.defaultGstMode?'selected':''}>Off (Default)</option>
            <option value="true"  ${s.defaultGstMode?'selected':''}>On</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label">Invoice Footer Text</label>
          <input type="text" class="form-control-it" id="set-footer" value="${sanitizeHTML(s.invoiceFooterText)}">
        </div>
      </div>
      <div class="settings-note"><i class="bi bi-info-circle"></i> Invoice prefix changes apply to new invoices only. Next invoice: <strong id="next-inv-preview">${sanitizeHTML(getNextInvoiceNo())}</strong></div>
    </div>

    <div class="settings-section" style="border:1.5px dashed var(--border);background:var(--bg)">
      <h5><i class="bi bi-lock"></i> Security & Backend (Future Phase)</h5>
      <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">The following features will be implemented in the PHP + MySQL backend phase:</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
        ${['User Authentication & Login','Role-Based Access Control','Data Persistence (Database)','Audit Logging','Server-Side Validation','GST Compliance Engine','Barcode Scanner Integration','Multi-User Support'].map(f=>`
          <div style="display:flex;align-items:center;gap:8px;background:var(--card-bg);padding:10px 14px;border-radius:var(--radius-sm);border:1px solid var(--border-light)">
            <i class="bi bi-clock" style="color:var(--text-muted)"></i>
            <span style="font-size:13px;color:var(--text-muted)">${sanitizeHTML(f)}</span>
          </div>`).join('')}
      </div>
    </div>
  </div>`;

  document.getElementById('set-inv-prefix')?.addEventListener('input', e => {
    const prefix = e.target.value.trim() || 'IT-INV';
    const num = String(AppState.nextInvoiceNum).padStart(3, '0');
    const preview = document.getElementById('next-inv-preview');
    if (preview) preview.textContent = `${prefix}-${num}`;
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', () => {
    AppState.settings.businessName     = document.getElementById('set-biz-name')?.value.trim() || AppState.settings.businessName;
    AppState.settings.businessAddress  = document.getElementById('set-address')?.value.trim() || '';
    AppState.settings.phone            = document.getElementById('set-phone')?.value.trim() || '';
    AppState.settings.email            = document.getElementById('set-email')?.value.trim() || '';
    AppState.settings.gstin            = document.getElementById('set-gstin')?.value.trim() || '';
    AppState.settings.invoicePrefix    = document.getElementById('set-inv-prefix')?.value.trim() || 'IT-INV';
    AppState.settings.lowStockThreshold = parseInt(document.getElementById('set-low-stock')?.value, 10) || 3;
    AppState.settings.defaultGstMode   = document.getElementById('set-gst-mode')?.value === 'true';
    AppState.settings.invoiceFooterText = document.getElementById('set-footer')?.value.trim() || '';
    showToast('Settings saved for this session!', 'success');
  });
}
