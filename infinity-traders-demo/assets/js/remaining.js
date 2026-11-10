/**
 * INFINITY TRADERS — Suppliers, Customers & Settings (remaining.js)
 * Fully connected to PHP + MySQL REST API
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────────────────────────────────────────
let supplierEditId = null;

async function renderSuppliers(container) {
  renderLoadingSpinner(container);

  const res = await apiGet('api/suppliers/index.php');
  if (res.success && Array.isArray(res.data)) {
    AppState.suppliers = res.data.map(s => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contact_person || s.contactPerson || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      gstin: s.gstin || '',
      outstanding: parseFloat(s.outstanding || 0),
      status: s.status || 'Active'
    }));
  }

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Suppliers</h1>
        <div class="breadcrumb-text">${AppState.suppliers.length} suppliers in database</div>
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
            <tr><th>Supplier Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>Due Amount (₹)</th><th>Status</th><th>Actions</th></tr>
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
            <div class="col-md-6"><label class="form-label">GSTIN</label><input type="text" class="form-control-it" id="sup-gstin" placeholder="GSTIN..."></div>
            <div class="col-md-3"><label class="form-label">Due Amount (₹)</label><input type="number" class="form-control-it" id="sup-outstanding" value="0" min="0"></div>
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
  if (query)        data = data.filter(s => s.name.toLowerCase().includes(query) || (s.contactPerson && s.contactPerson.toLowerCase().includes(query)));
  if (statusFilter) data = data.filter(s => s.status === statusFilter);

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:40px"><i class="bi bi-building"></i><h4>No Suppliers Found</h4></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(s => `<tr>
    <td><strong>${sanitizeHTML(s.name)}</strong></td>
    <td>${sanitizeHTML(s.contactPerson || '—')}</td>
    <td>${sanitizeHTML(s.phone || '—')}</td>
    <td>${sanitizeHTML(s.email || '—')}</td>
    <td class="${s.outstanding > 0 ? 'stock-out' : 'stock-ok'}" style="font-weight:${s.outstanding>0?'700':'400'}">${formatINR(s.outstanding)}</td>
    <td><span class="badge-status ${s.status === 'Active' ? 'badge-active' : 'badge-out'}">${sanitizeHTML(s.status)}</span></td>
    <td style="white-space:nowrap">
      <button class="btn-sm-action" onclick="viewSupplier('${sanitizeHTML(s.id)}')"><i class="bi bi-eye"></i></button>
      <button class="btn-sm-action" onclick="openSupplierModal('${sanitizeHTML(s.id)}')"><i class="bi bi-pencil"></i> Edit</button>
      <button class="btn-sm-action text-danger" onclick="deleteSupplier('${sanitizeHTML(s.id)}')"><i class="bi bi-trash"></i></button>
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
    const s = AppState.suppliers.find(x => String(x.id) === String(id));
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

async function saveSupplier() {
  const name = document.getElementById('sup-name')?.value.trim();
  const errEl = document.getElementById('err-sup-name');
  if (!name) { if (errEl) errEl.textContent = 'Supplier name is required.'; return; }
  if (errEl) errEl.textContent = '';

  const payload = {
    name,
    contact_person: document.getElementById('sup-contact')?.value.trim() || '',
    phone:          document.getElementById('sup-phone')?.value.trim() || '',
    email:          document.getElementById('sup-email')?.value.trim() || '',
    address:        document.getElementById('sup-address')?.value.trim() || '',
    gstin:          document.getElementById('sup-gstin')?.value.trim() || '',
    outstanding:    parseFloat(document.getElementById('sup-outstanding')?.value || 0) || 0,
    status:         document.getElementById('sup-status')?.value || 'Active'
  };

  let res;
  if (supplierEditId) {
    res = await apiPut('api/suppliers/item.php?id=' + encodeURIComponent(supplierEditId), payload);
  } else {
    res = await apiPost('api/suppliers/index.php', payload);
  }

  if (res && res.success) {
    showToast(supplierEditId ? 'Supplier updated successfully!' : 'Supplier added successfully!', 'success');
    bootstrap.Modal.getInstance(document.getElementById('supplier-modal'))?.hide();
    await renderSuppliers(document.getElementById('main-content'));
  } else {
    showToast(res?.error || res?.message || 'Failed to save supplier', 'danger');
  }
}

async function deleteSupplier(id) {
  showConfirm('Delete Supplier?', 'Are you sure you want to delete this supplier?', async () => {
    const res = await apiDelete('api/suppliers/item.php?id=' + encodeURIComponent(id));
    if (res && res.success) {
      showToast('Supplier deleted', 'success');
      await renderSuppliers(document.getElementById('main-content'));
    } else {
      showToast(res?.error || res?.message || 'Failed to delete supplier', 'danger');
    }
  });
}

function viewSupplier(id) {
  const s = AppState.suppliers.find(x => String(x.id) === String(id));
  if (!s) return;
  const body = document.getElementById('view-supplier-body');
  if (!body) return;
  const purchaseCount = (AppState.purchases || []).filter(p => String(p.supplierId) === String(id)).length;
  const totalPurchased = (AppState.purchases || []).filter(p => String(p.supplierId) === String(id)).reduce((sum, p) => sum + (parseFloat(p.totalAmount) || 0), 0);
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div><span class="form-label">Supplier Name</span><p style="font-weight:700;font-size:15px">${sanitizeHTML(s.name)}</p></div>
      <div><span class="form-label">Status</span><p><span class="badge-status ${s.status==='Active'?'badge-active':'badge-out'}">${sanitizeHTML(s.status)}</span></p></div>
      <div><span class="form-label">Contact Person</span><p>${sanitizeHTML(s.contactPerson||'—')}</p></div>
      <div><span class="form-label">Phone</span><p>${sanitizeHTML(s.phone||'—')}</p></div>
      <div><span class="form-label">Email</span><p>${sanitizeHTML(s.email||'—')}</p></div>
      <div><span class="form-label">GSTIN</span><p><code>${sanitizeHTML(s.gstin || '—')}</code></p></div>
      <div style="grid-column:span 2"><span class="form-label">Address</span><p>${sanitizeHTML(s.address||'—')}</p></div>
      <div><span class="form-label">Due Amount</span><p class="${s.outstanding>0?'stock-out':''}" style="font-weight:700;font-size:16px">${formatINR(s.outstanding)}</p></div>
      <div><span class="form-label">Purchase Orders</span><p>${purchaseCount} orders · ${formatINR(totalPurchased)} total</p></div>
    </div>`;
  new bootstrap.Modal(document.getElementById('view-supplier-modal')).show();
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────
let customerEditId = null;

async function renderCustomers(container) {
  if (!container) container = document.getElementById('page-container') || document.getElementById('main-content');
  if (!container) return;
  renderLoadingSpinner(container);

  const res = await apiGet('api/customers/index.php');
  if (res.success && Array.isArray(res.data)) {
    AppState.customers = res.data.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      address: c.address || '',
      outstanding: parseFloat(c.outstanding || 0),
      totalPurchases: parseFloat(c.total_purchases || c.totalPurchases || c.total_spent || 0)
    }));
  }

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Customers</h1>
        <div class="breadcrumb-text">${AppState.customers.length} customers in database</div>
      </div>
      <div class="page-header-right">
        <button class="btn-primary-it" id="btn-add-customer"><i class="bi bi-plus"></i> Add Customer</button>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="cust-search" placeholder="🔍 Search by name, phone, address...">
        </div>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Address</th><th>Total Purchases</th><th>Due Amount (₹)</th><th>Actions</th></tr>
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
            <div class="col-12"><label class="form-label">Address</label><textarea class="form-control-it" id="cust-address" rows="2" style="resize:vertical" placeholder="Enter customer address..."></textarea></div>
            <div class="col-md-6"><label class="form-label">Due Amount (₹)</label><input type="number" class="form-control-it" id="cust-outstanding" value="0" min="0"></div>
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
  if (query) data = data.filter(c => c.name.toLowerCase().includes(query) || (c.phone && c.phone.includes(query)) || (c.address && c.address.toLowerCase().includes(query)));

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:40px"><i class="bi bi-people"></i><h4>No Customers Found</h4></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => {
    return `<tr>
      <td><strong>${sanitizeHTML(c.name)}</strong></td>
      <td>${sanitizeHTML(c.phone||'—')}</td>
      <td><span style="display:inline-block;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${sanitizeHTML(c.address||'')}">${sanitizeHTML(c.address||'—')}</span></td>
      <td>${formatINR(c.totalPurchases)}</td>
      <td class="${c.outstanding>0?'stock-out':''}" style="font-weight:${c.outstanding>0?'700':'400'}">${formatINR(c.outstanding)}</td>
      <td style="white-space:nowrap">
        ${c.outstanding > 0 ? `
          <button class="btn-sm-action text-danger" onclick="openClearDueModal({ id: '${sanitizeHTML(c.id)}', name: '${escapeAttr(c.name)}', due: ${c.outstanding} })" title="Clear customer due">
            <i class="bi bi-cash-stack"></i> Clear Due
          </button>
        ` : ''}
        <button class="btn-sm-action" onclick="viewCustomer('${sanitizeHTML(c.id)}')"><i class="bi bi-eye"></i></button>
        <button class="btn-sm-action" onclick="openCustomerModal('${sanitizeHTML(c.id)}')"><i class="bi bi-pencil"></i> Edit</button>
        <button class="btn-sm-action text-danger" onclick="deleteCustomer('${sanitizeHTML(c.id)}')"><i class="bi bi-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function openCustomerModal(id) {
  customerEditId = id;
  const title = document.getElementById('customer-modal-title');
  if (title) title.innerHTML = id ? '<i class="bi bi-pencil"></i> Edit Customer' : '<i class="bi bi-person-plus"></i> Add Customer';
  ['cust-name','cust-phone','cust-address'].forEach(el => { const e = document.getElementById(el); if (e) e.value = ''; });
  document.getElementById('cust-outstanding').value = '0';
  document.getElementById('err-cust-name').textContent = '';

  if (id) {
    const c = AppState.customers.find(x => String(x.id) === String(id));
    if (c) {
      document.getElementById('cust-name').value        = c.name;
      document.getElementById('cust-phone').value       = c.phone || '';
      document.getElementById('cust-address').value     = c.address || '';
      document.getElementById('cust-outstanding').value = c.outstanding || 0;
    }
  }
  const modalEl = document.getElementById('customer-modal');
  (bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(modalEl) : new bootstrap.Modal(modalEl)).show();
}

async function saveCustomer() {
  const name = document.getElementById('cust-name')?.value.trim();
  const errEl = document.getElementById('err-cust-name');
  if (!name) { if (errEl) errEl.textContent = 'Customer name is required.'; return; }
  if (errEl) errEl.textContent = '';

  const payload = {
    name,
    phone:       document.getElementById('cust-phone')?.value.trim() || '',
    address:     document.getElementById('cust-address')?.value.trim() || '',
    outstanding: parseFloat(document.getElementById('cust-outstanding')?.value || 0) || 0
  };

  let res;
  if (customerEditId) {
    res = await apiPut('api/customers/item.php?id=' + encodeURIComponent(customerEditId), payload);
  } else {
    res = await apiPost('api/customers/index.php', payload);
  }

  if (res && res.success) {
    showToast(customerEditId ? 'Customer updated successfully!' : 'Customer added successfully!', 'success');
    const modalEl = document.getElementById('customer-modal');
    bootstrap.Modal.getInstance(modalEl)?.hide();
    customerEditId = null;
    await renderCustomers(document.getElementById('page-container'));
  } else {
    showToast(res?.error || res?.message || 'Failed to save customer', 'danger');
  }
}

async function deleteCustomer(id) {
  showConfirm('Delete Customer?', 'Are you sure you want to delete this customer?', async () => {
    const res = await apiDelete('api/customers/item.php?id=' + encodeURIComponent(id));
    if (res && res.success) {
      showToast('Customer deleted', 'success');
      await renderCustomers(document.getElementById('page-container'));
    } else {
      showToast(res?.error || res?.message || 'Failed to delete customer', 'danger');
    }
  });
}

async function viewCustomer(id) {
  openCustomerDetailModal({ id });
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
async function renderSettings(container) {
  renderLoadingSpinner(container);

  const res = await apiGet('api/settings/index.php');
  if (res.success && res.data) {
    const d = res.data;
    AppState.settings = {
      businessName: d.business_name || d.businessName || 'Infinity Traders',
      businessAddress: d.business_address || d.businessAddress || '',
      phone: d.phone || '',
      email: d.email || '',
      gstin: d.gstin || '',
      invoicePrefix: d.invoice_prefix || d.invoicePrefix || 'IT-INV',
      currency: d.currency || 'INR',
      lowStockThreshold: parseInt(d.low_stock_threshold || d.lowStockThreshold || 3, 10),
      defaultGstMode: !!parseInt(d.default_gst_mode !== undefined ? d.default_gst_mode : 0, 10),
      invoiceFooterText: d.invoice_footer_text || d.invoiceFooterText || ''
    };
    AppState.nextInvoiceNum = parseInt(d.next_invoice_num || 1, 10);
  }
  const s = AppState.settings;

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Settings</h1>
        <div class="breadcrumb-text">Manage business profiles, invoice settings, and security</div>
      </div>
      <div class="page-header-right">
        <button class="btn-primary-it" id="btn-save-settings"><i class="bi bi-save"></i> Save Settings</button>
      </div>
    </div>

    <div class="settings-section">
      <h5><i class="bi bi-building"></i> Business Information</h5>
      <div class="row g-3">
        <div class="col-md-6"><label class="form-label">Business Name</label><input type="text" class="form-control-it" id="set-biz-name" value="${sanitizeHTML(s.businessName)}"></div>
        <div class="col-md-6"><label class="form-label">Phone</label><input type="tel" class="form-control-it" id="set-phone" value="${sanitizeHTML(s.phone)}"></div>
        <div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control-it" id="set-email" value="${sanitizeHTML(s.email)}"></div>
        <div class="col-md-6"><label class="form-label">GSTIN</label><input type="text" class="form-control-it" id="set-gstin" value="${sanitizeHTML(s.gstin)}"></div>
        <div class="col-12"><label class="form-label">Business Address</label><textarea class="form-control-it" id="set-address" rows="2" style="resize:vertical">${sanitizeHTML(s.businessAddress)}</textarea></div>
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
        <div class="col-md-4">
          <label class="form-label">Receipt Paper Size (POS Terminal)</label>
          <select class="form-control-it" id="set-paper-size">
            <option value="80mm" ${(localStorage.getItem('pos_paper_size')||'80mm')==='80mm'?'selected':''}>80mm Thermal (POS SRS810-15 - Default)</option>
            <option value="58mm" ${(localStorage.getItem('pos_paper_size')||'80mm')==='58mm'?'selected':''}>58mm Thermal (2-inch roll)</option>
            <option value="a4" ${(localStorage.getItem('pos_paper_size')||'80mm')==='a4'?'selected':''}>A4 Full Sheet (Laser/Inkjet)</option>
          </select>
        </div>
        <div class="col-12">
          <label class="form-label">Invoice Footer Text</label>
          <input type="text" class="form-control-it" id="set-footer" value="${sanitizeHTML(s.invoiceFooterText)}">
        </div>
      </div>
      <div class="settings-note"><i class="bi bi-info-circle"></i> Configured for Shreyans POS SRS810-15 (80mm Thermal continuous roll). Next invoice: <strong id="next-inv-preview">${sanitizeHTML(getNextInvoiceNo())}</strong></div>
    </div>

    <div class="settings-section">
      <h5><i class="bi bi-shield-lock"></i> Admin Account & Security</h5>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label">Current Password</label>
          <input type="password" class="form-control-it" id="set-cur-pass" placeholder="Enter current password to change">
        </div>
        <div class="col-md-6">
          <label class="form-label">New Password</label>
          <input type="password" class="form-control-it" id="set-new-pass" placeholder="Enter at least 6 characters">
        </div>
      </div>
      <div class="settings-note" style="margin-top:10px"><i class="bi bi-key"></i> Leave passwords blank if you only want to update business and invoice information.</div>
    </div>
  </div>`;

  document.getElementById('set-inv-prefix')?.addEventListener('input', e => {
    const prefix = e.target.value.trim() || 'IT-INV';
    const num = String(AppState.nextInvoiceNum || 1).padStart(3, '0');
    const preview = document.getElementById('next-inv-preview');
    if (preview) preview.textContent = `${prefix}-${num}`;
  });

  document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
}

async function saveSettings() {
  const saveBtn = document.getElementById('btn-save-settings');
  if (saveBtn) saveBtn.disabled = true;

  const payload = {
    business_name:       document.getElementById('set-biz-name')?.value.trim() || AppState.settings.businessName,
    business_address:    document.getElementById('set-address')?.value.trim() || '',
    phone:               document.getElementById('set-phone')?.value.trim() || '',
    email:               document.getElementById('set-email')?.value.trim() || '',
    gstin:               document.getElementById('set-gstin')?.value.trim() || '',
    invoice_prefix:      document.getElementById('set-inv-prefix')?.value.trim() || 'IT-INV',
    currency:            document.getElementById('set-currency')?.value || 'INR',
    low_stock_threshold: parseInt(document.getElementById('set-low-stock')?.value, 10) || 3,
    default_gst_mode:    document.getElementById('set-gst-mode')?.value === 'true' ? 1 : 0,
    invoice_footer_text: document.getElementById('set-footer')?.value.trim() || ''
  };

  const curPass = document.getElementById('set-cur-pass')?.value || '';
  const newPass = document.getElementById('set-new-pass')?.value || '';

  if (newPass) {
    if (!curPass) {
      showToast('Please enter your current password to set a new password.', 'warning');
      if (saveBtn) saveBtn.disabled = false;
      return;
    }
    if (newPass.length < 6) {
      showToast('New password must be at least 6 characters.', 'warning');
      if (saveBtn) saveBtn.disabled = false;
      return;
    }
    payload.current_password = curPass;
    payload.new_password = newPass;
  }

  const paperSize = document.getElementById('set-paper-size')?.value || '80mm';
  try { localStorage.setItem('pos_paper_size', paperSize); } catch(e){}

  const res = await apiPut('api/settings/index.php', payload);
  if (saveBtn) saveBtn.disabled = false;

  if (res && res.success) {
    AppState.settings = {
      businessName: payload.business_name,
      businessAddress: payload.business_address,
      phone: payload.phone,
      email: payload.email,
      gstin: payload.gstin,
      invoicePrefix: payload.invoice_prefix,
      currency: payload.currency,
      lowStockThreshold: payload.low_stock_threshold,
      defaultGstMode: !!payload.default_gst_mode,
      invoiceFooterText: payload.invoice_footer_text
    };
    if (newPass) {
      document.getElementById('set-cur-pass').value = '';
      document.getElementById('set-new-pass').value = '';
      showToast('Settings and password saved successfully!', 'success');
    } else {
      showToast('Settings saved successfully!', 'success');
    }
  } else {
    showToast(res?.error || res?.message || 'Failed to save settings', 'danger');
  }
}
