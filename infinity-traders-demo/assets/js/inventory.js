/**
 * INFINITY TRADERS — Inventory Module (inventory.js)
 * ====================================================
 * Products list, search/filter, Add/Edit product modal,
 * categories & brands management.
 */

'use strict';

let invFilters = { search: '', category: '', subcategory: '', brand: '', status: '' };
let invPage = 1;
const INV_PER_PAGE = 12;
let editingProductId = null;

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS & INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
function renderInventory(container) {
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Products &amp; Inventory</h1>
        <div class="breadcrumb-text">${AppState.products.length} total variants</div>
      </div>
      <div class="page-header-right" style="display:flex;gap:10px">
        <button class="btn-outline-it" id="inv-export-btn"><i class="bi bi-download"></i> CSV Export</button>
        <button class="btn-primary-it" id="btn-add-product"><i class="bi bi-plus"></i> Add Product</button>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="inv-search" placeholder="🔍 Search by name, SKU, brand...">
          <select class="form-control-it" id="inv-category">
            <option value="">All Categories</option>
            ${AppState.categories.map(c => `<option value="${sanitizeHTML(c.name)}">${sanitizeHTML(c.name)}</option>`).join('')}
          </select>
          <select class="form-control-it" id="inv-brand">
            <option value="">All Brands</option>
            ${AppState.brands.map(b => `<option value="${sanitizeHTML(b.name)}">${sanitizeHTML(b.name)}</option>`).join('')}
          </select>
          <select class="form-control-it" id="inv-stock-status">
            <option value="">All Stock Status</option>
            <option value="ok">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
        <div id="inv-summary" style="font-size:12.5px;color:var(--text-muted);margin-top:-4px"></div>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead>
            <tr>
              <th>Product</th><th>SKU</th><th>Category</th><th>Brand</th><th>Size</th>
              <th>Purchase Price</th><th>Selling Price</th><th>Stock</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="inv-tbody"></tbody>
        </table>
      </div>
      <div class="pagination-bar">
        <span id="inv-showing">Showing 0 of 0</span>
        <div class="pagination-controls" id="inv-pagination"></div>
      </div>
    </div>
  </div>

  <!-- Add/Edit Product Modal -->
  <div class="modal fade" id="product-modal" tabindex="-1" aria-labelledby="product-modal-title" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="product-modal-title"><i class="bi bi-box-seam"></i> Add Product</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label">Product Name *</label>
              <input type="text" class="form-control-it" id="prod-name" placeholder="e.g. Nike Air Zoom Pegasus 40">
              <div class="form-error-msg" id="err-prod-name"></div>
            </div>
            <div class="col-md-4">
              <label class="form-label">SKU *</label>
              <input type="text" class="form-control-it" id="prod-sku" placeholder="e.g. NK-RUN-PEG-UK8-BLK">
              <div class="form-error-msg" id="err-prod-sku"></div>
            </div>
            <div class="col-md-4">
              <label class="form-label">Barcode (optional)</label>
              <input type="text" class="form-control-it" id="prod-barcode" placeholder="Barcode placeholder">
            </div>
            <div class="col-md-4">
              <label class="form-label">Category *</label>
              <select class="form-control-it" id="prod-category">
                <option value="">— Select —</option>
                ${AppState.categories.map(c => `<option value="${sanitizeHTML(c.name)}">${sanitizeHTML(c.name)}</option>`).join('')}
              </select>
              <div class="form-error-msg" id="err-prod-category"></div>
            </div>
            <div class="col-md-4">
              <label class="form-label">Subcategory</label>
              <select class="form-control-it" id="prod-subcategory"><option value="">— Select Category First —</option></select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Brand *</label>
              <select class="form-control-it" id="prod-brand">
                <option value="">— Select —</option>
                ${AppState.brands.map(b => `<option value="${sanitizeHTML(b.name)}">${sanitizeHTML(b.name)}</option>`).join('')}
              </select>
              <div class="form-error-msg" id="err-prod-brand"></div>
            </div>
            <div class="col-md-3">
              <label class="form-label">Size</label>
              <input type="text" class="form-control-it" id="prod-size" placeholder="e.g. UK 8, M, L">
            </div>
            <div class="col-md-3">
              <label class="form-label">Color</label>
              <input type="text" class="form-control-it" id="prod-color" placeholder="e.g. Black/White">
            </div>
            <div class="col-md-3">
              <label class="form-label">Purchase Price (₹) *</label>
              <input type="number" class="form-control-it" id="prod-purchase-price" min="0" step="0.01" placeholder="0.00">
              <div class="form-error-msg" id="err-prod-purchase-price"></div>
            </div>
            <div class="col-md-3">
              <label class="form-label">Selling Price (₹) *</label>
              <input type="number" class="form-control-it" id="prod-selling-price" min="0" step="0.01" placeholder="0.00">
              <div class="form-error-msg" id="err-prod-selling-price"></div>
            </div>
            <div class="col-md-3">
              <label class="form-label">Current Stock *</label>
              <input type="number" class="form-control-it" id="prod-stock" min="0" placeholder="0">
              <div class="form-error-msg" id="err-prod-stock"></div>
            </div>
            <div class="col-md-3">
              <label class="form-label">Low Stock Threshold</label>
              <input type="number" class="form-control-it" id="prod-low-threshold" min="1" value="${AppState.settings.lowStockThreshold}">
            </div>
            <div class="col-md-3">
              <label class="form-label">Status</label>
              <select class="form-control-it" id="prod-status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn-primary-it" id="btn-save-product"><i class="bi bi-save"></i> Save Product</button>
        </div>
      </div>
    </div>
  </div>

  <!-- View Product Modal -->
  <div class="modal fade" id="view-product-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-md">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi bi-box-seam"></i> Product Details</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body" id="view-product-body"></div>
        <div class="modal-footer"><button class="btn-ghost" data-bs-dismiss="modal">Close</button></div>
      </div>
    </div>
  </div>`;

  invFilters = { search: '', category: '', subcategory: '', brand: '', status: '' };
  invPage = 1;
  renderInvTable();

  ['inv-search','inv-category','inv-brand','inv-stock-status'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      invFilters.search   = document.getElementById('inv-search')?.value.toLowerCase() || '';
      invFilters.category = document.getElementById('inv-category')?.value || '';
      invFilters.brand    = document.getElementById('inv-brand')?.value || '';
      invFilters.status   = document.getElementById('inv-stock-status')?.value || '';
      invPage = 1;
      renderInvTable();
    });
  });

  document.getElementById('inv-export-btn')?.addEventListener('click', exportInventoryCSV);
  document.getElementById('btn-add-product')?.addEventListener('click', () => openProductModal(null));

  // Category → subcategory
  document.getElementById('prod-category')?.addEventListener('change', e => {
    updateSubcategoryOptions(e.target.value);
  });

  document.getElementById('btn-save-product')?.addEventListener('click', saveProduct);
}

function getFilteredInventory() {
  return AppState.products.filter(p => {
    if (invFilters.search && !p.name.toLowerCase().includes(invFilters.search) && !p.sku.toLowerCase().includes(invFilters.search) && !p.brand.toLowerCase().includes(invFilters.search)) return false;
    if (invFilters.category && p.category !== invFilters.category) return false;
    if (invFilters.brand    && p.brand    !== invFilters.brand)    return false;
    if (invFilters.status   && getStockStatus(p) !== invFilters.status) return false;
    return true;
  });
}

function renderInvTable() {
  const tbody = document.getElementById('inv-tbody');
  if (!tbody) return;
  const all = getFilteredInventory();
  const totalPages = Math.ceil(all.length / INV_PER_PAGE) || 1;
  if (invPage > totalPages) invPage = totalPages;
  const paged = all.slice((invPage-1)*INV_PER_PAGE, invPage*INV_PER_PAGE);

  const showEl = document.getElementById('inv-showing');
  if (showEl) showEl.textContent = `Showing ${paged.length} of ${all.length} products`;

  const summEl = document.getElementById('inv-summary');
  if (summEl) {
    const low = all.filter(p => getStockStatus(p) === 'low').length;
    const out = all.filter(p => getStockStatus(p) === 'out').length;
    summEl.innerHTML = `<span style="color:var(--warning)"><i class="bi bi-exclamation-triangle"></i> ${low} low stock</span> &nbsp;|&nbsp; <span style="color:var(--danger)"><i class="bi bi-x-circle"></i> ${out} out of stock</span>`;
  }

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state" style="padding:40px"><i class="bi bi-box"></i><h4>No Products Found</h4><p>Try adjusting your filters.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(p => {
      const stockStatus = getStockStatus(p);
      const margin = p.sellingPrice > 0 ? Math.round(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100) : 0;
      return `<tr>
        <td>
          <div style="font-weight:600;font-size:13px">${sanitizeHTML(p.name)}</div>
          <div style="font-size:11px;color:var(--text-muted)">${sanitizeHTML(p.color||'—')}</div>
        </td>
        <td><code style="font-size:11.5px">${sanitizeHTML(p.sku)}</code></td>
        <td>${sanitizeHTML(p.category)}<br><span style="font-size:11px;color:var(--text-muted)">${sanitizeHTML(p.subcategory)}</span></td>
        <td>${sanitizeHTML(p.brand)}</td>
        <td>${sanitizeHTML(p.size||'—')}</td>
        <td>${formatINR(p.purchasePrice)}</td>
        <td>${formatINR(p.sellingPrice)} <small style="color:var(--success)">${margin}%</small></td>
        <td>
          <span class="${stockStatus === 'out' ? 'stock-out' : stockStatus === 'low' ? 'stock-low' : 'stock-ok'}" style="font-weight:700">
            ${p.stock}
          </span>
        </td>
        <td>${getStockBadge(p)}</td>
        <td style="white-space:nowrap">
          <button class="btn-sm-action" onclick="viewProduct('${sanitizeHTML(p.id)}')"><i class="bi bi-eye"></i></button>
          <button class="btn-sm-action" onclick="openProductModal('${sanitizeHTML(p.id)}')"><i class="bi bi-pencil"></i> Edit</button>
        </td>
      </tr>`;
    }).join('');
  }

  // Pagination
  const pgEl = document.getElementById('inv-pagination');
  if (pgEl) {
    pgEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === invPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => { invPage = i; renderInvTable(); });
      pgEl.appendChild(btn);
    }
  }
}

function openProductModal(productId) {
  editingProductId = productId;
  const title = document.getElementById('product-modal-title');
  if (title) title.innerHTML = productId ? '<i class="bi bi-pencil"></i> Edit Product' : '<i class="bi bi-box-seam"></i> Add Product';

  // Clear form
  ['prod-name','prod-sku','prod-barcode','prod-size','prod-color'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['prod-purchase-price','prod-selling-price','prod-stock'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('prod-low-threshold').value = AppState.settings.lowStockThreshold;
  document.getElementById('prod-category').value = '';
  document.getElementById('prod-brand').value = '';
  document.getElementById('prod-status').value = 'Active';
  updateSubcategoryOptions('');
  ['err-prod-name','err-prod-sku','err-prod-category','err-prod-brand','err-prod-purchase-price','err-prod-selling-price','err-prod-stock'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '';
  });

  if (productId) {
    const p = AppState.products.find(x => x.id === productId);
    if (p) {
      document.getElementById('prod-name').value = p.name;
      document.getElementById('prod-sku').value  = p.sku;
      document.getElementById('prod-barcode').value = p.barcode || '';
      document.getElementById('prod-size').value    = p.size || '';
      document.getElementById('prod-color').value   = p.color || '';
      document.getElementById('prod-purchase-price').value = p.purchasePrice;
      document.getElementById('prod-selling-price').value  = p.sellingPrice;
      document.getElementById('prod-stock').value          = p.stock;
      document.getElementById('prod-low-threshold').value  = p.lowStockThreshold;
      document.getElementById('prod-status').value         = p.status;
      document.getElementById('prod-category').value       = p.category;
      document.getElementById('prod-brand').value          = p.brand;
      updateSubcategoryOptions(p.category);
      setTimeout(() => { document.getElementById('prod-subcategory').value = p.subcategory || ''; }, 0);
    }
  }

  new bootstrap.Modal(document.getElementById('product-modal')).show();
}

function updateSubcategoryOptions(categoryName) {
  const el = document.getElementById('prod-subcategory');
  if (!el) return;
  const cat = AppState.categories.find(c => c.name === categoryName);
  el.innerHTML = cat
    ? `<option value="">— All / None —</option>${cat.subcategories.map(s => `<option value="${sanitizeHTML(s)}">${sanitizeHTML(s)}</option>`).join('')}`
    : `<option value="">— Select Category First —</option>`;
}

function saveProduct() {
  const name      = document.getElementById('prod-name')?.value.trim();
  const sku       = document.getElementById('prod-sku')?.value.trim();
  const category  = document.getElementById('prod-category')?.value;
  const brand     = document.getElementById('prod-brand')?.value;
  const purPrice  = parseFloat(document.getElementById('prod-purchase-price')?.value);
  const sellPrice = parseFloat(document.getElementById('prod-selling-price')?.value);
  const stock     = parseInt(document.getElementById('prod-stock')?.value, 10);

  let valid = true;
  const setErr = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
  ['err-prod-name','err-prod-sku','err-prod-category','err-prod-brand','err-prod-purchase-price','err-prod-selling-price','err-prod-stock'].forEach(id => setErr(id, ''));

  if (!name)                             { setErr('err-prod-name', 'Product name is required.'); valid = false; }
  if (!sku)                              { setErr('err-prod-sku', 'SKU is required.'); valid = false; }
  if (!category)                         { setErr('err-prod-category', 'Category is required.'); valid = false; }
  if (!brand)                            { setErr('err-prod-brand', 'Brand is required.'); valid = false; }
  if (isNaN(purPrice)  || purPrice < 0)  { setErr('err-prod-purchase-price', 'Valid purchase price required.'); valid = false; }
  if (isNaN(sellPrice) || sellPrice < 0) { setErr('err-prod-selling-price', 'Valid selling price required.'); valid = false; }
  if (isNaN(stock)     || stock < 0)     { setErr('err-prod-stock', 'Stock cannot be negative.'); valid = false; }

  // SKU uniqueness check (skip self on edit)
  if (sku) {
    const existing = AppState.products.find(p => p.sku === sku && p.id !== editingProductId);
    if (existing) { setErr('err-prod-sku', 'SKU already exists. Use a unique SKU.'); valid = false; }
  }

  if (!valid) return;

  const productData = {
    name, sku,
    barcode:    document.getElementById('prod-barcode')?.value.trim() || '',
    category,
    subcategory: document.getElementById('prod-subcategory')?.value || '',
    brand,
    size:       document.getElementById('prod-size')?.value.trim() || '',
    color:      document.getElementById('prod-color')?.value.trim() || '',
    purchasePrice: purPrice,
    sellingPrice:  sellPrice,
    stock,
    lowStockThreshold: parseInt(document.getElementById('prod-low-threshold')?.value, 10) || AppState.settings.lowStockThreshold,
    status:     document.getElementById('prod-status')?.value || 'Active'
  };

  if (editingProductId) {
    const idx = AppState.products.findIndex(p => p.id === editingProductId);
    if (idx !== -1) AppState.products[idx] = { id: editingProductId, ...productData };
    showToast('Product updated successfully!', 'success');
  } else {
    AppState.products.push({ id: `prod-${Date.now()}`, ...productData });
    showToast('Product added successfully!', 'success');
  }

  bootstrap.Modal.getInstance(document.getElementById('product-modal'))?.hide();
  renderInvTable();
}

function viewProduct(id) {
  const p = AppState.products.find(x => x.id === id);
  if (!p) return;
  const body = document.getElementById('view-product-body');
  if (!body) return;
  const stockStatus = getStockStatus(p);
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div><span class="form-label">Product Name</span><p style="font-weight:600">${sanitizeHTML(p.name)}</p></div>
      <div><span class="form-label">SKU</span><p><code>${sanitizeHTML(p.sku)}</code></p></div>
      <div><span class="form-label">Brand</span><p>${sanitizeHTML(p.brand)}</p></div>
      <div><span class="form-label">Category</span><p>${sanitizeHTML(p.category)} › ${sanitizeHTML(p.subcategory||'—')}</p></div>
      <div><span class="form-label">Size</span><p>${sanitizeHTML(p.size||'—')}</p></div>
      <div><span class="form-label">Color</span><p>${sanitizeHTML(p.color||'—')}</p></div>
      <div><span class="form-label">Purchase Price</span><p style="font-weight:700;color:var(--warning)">${formatINR(p.purchasePrice)}</p></div>
      <div><span class="form-label">Selling Price</span><p style="font-weight:700;color:var(--success)">${formatINR(p.sellingPrice)}</p></div>
      <div><span class="form-label">Current Stock</span><p class="${stockStatus === 'out' ? 'stock-out' : stockStatus === 'low' ? 'stock-low' : 'stock-ok'}" style="font-weight:700;font-size:20px">${p.stock}</p></div>
      <div><span class="form-label">Stock Status</span><p>${getStockBadge(p)}</p></div>
      <div><span class="form-label">Low Stock Alert At</span><p>${p.lowStockThreshold} units</p></div>
      <div><span class="form-label">Status</span><p><span class="badge-status ${p.status === 'Active' ? 'badge-active' : 'badge-out'}">${sanitizeHTML(p.status)}</span></p></div>
    </div>
    ${p.barcode ? `<div style="margin-top:12px"><span class="form-label">Barcode</span><p><code>${sanitizeHTML(p.barcode)}</code></p></div>` : ''}`;
  new bootstrap.Modal(document.getElementById('view-product-modal')).show();
}

function exportInventoryCSV() {
  const data = getFilteredInventory();
  exportCSV('inventory.csv',
    ['Product Name','SKU','Barcode','Category','Subcategory','Brand','Size','Color','Purchase Price','Selling Price','Stock','Low Stock Threshold','Status'],
    data.map(p => [p.name, p.sku, p.barcode||'', p.category, p.subcategory||'', p.brand, p.size||'', p.color||'', p.purchasePrice, p.sellingPrice, p.stock, p.lowStockThreshold, p.status])
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES & BRANDS
// ─────────────────────────────────────────────────────────────────────────────
function renderCategories(container) {
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Categories &amp; Brands</h1>
        <div class="breadcrumb-text">Manage product categories, subcategories, and brands</div>
      </div>
    </div>
    <div class="sections-grid">
      <!-- Categories -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-folder2-open"></i>Categories</span>
          <button class="btn-primary-it" style="padding:6px 14px;font-size:12.5px" id="btn-add-category"><i class="bi bi-plus"></i> Add</button>
        </div>
        <div class="card-body" id="categories-body"></div>
      </div>
      <!-- Brands -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-tag"></i>Brands</span>
          <button class="btn-primary-it" style="padding:6px 14px;font-size:12.5px" id="btn-add-brand"><i class="bi bi-plus"></i> Add Brand</button>
        </div>
        <div class="card-body" id="brands-body"></div>
      </div>
    </div>
  </div>`;

  renderCategoriesList();
  renderBrandsList();

  document.getElementById('btn-add-category')?.addEventListener('click', () => {
    const name = prompt('Enter new category name:');
    if (!name || !name.trim()) return;
    if (AppState.categories.find(c => c.name.toLowerCase() === name.trim().toLowerCase())) { showToast('Category already exists.', 'warning'); return; }
    AppState.categories.push({ id: `cat-${Date.now()}`, name: name.trim(), subcategories: [] });
    renderCategoriesList();
    showToast(`Category "${name.trim()}" added.`, 'success');
  });

  document.getElementById('btn-add-brand')?.addEventListener('click', () => {
    const name = prompt('Enter new brand name:');
    if (!name || !name.trim()) return;
    if (AppState.brands.find(b => b.name.toLowerCase() === name.trim().toLowerCase())) { showToast('Brand already exists.', 'warning'); return; }
    AppState.brands.push({ id: `brand-${Date.now()}`, name: name.trim() });
    renderBrandsList();
    showToast(`Brand "${name.trim()}" added.`, 'success');
  });
}

function renderCategoriesList() {
  const body = document.getElementById('categories-body');
  if (!body) return;
  body.innerHTML = AppState.categories.map(cat => `
    <div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <h6 style="font-weight:700;color:var(--text-dark);margin:0"><i class="bi bi-folder" style="color:var(--primary);margin-right:6px"></i>${sanitizeHTML(cat.name)}</h6>
        <button class="btn-sm-action" onclick="addSubcategory('${sanitizeHTML(cat.id)}')"><i class="bi bi-plus"></i> Sub</button>
      </div>
      <div style="padding-left:20px;display:flex;flex-wrap:wrap;gap:6px">
        ${cat.subcategories.map(sub => `
          <span style="background:var(--primary-light);color:var(--primary);padding:3px 10px;border-radius:50px;font-size:12px;font-weight:500">
            ${sanitizeHTML(sub)}
          </span>`).join('')}
        ${!cat.subcategories.length ? '<span style="font-size:12px;color:var(--text-muted)">No subcategories</span>' : ''}
      </div>
    </div>
    <hr style="margin:12px 0;border-color:var(--border-light)">`).join('');
}

function addSubcategory(catId) {
  const cat = AppState.categories.find(c => c.id === catId);
  if (!cat) return;
  const name = prompt(`Add subcategory under "${cat.name}":`);
  if (!name || !name.trim()) return;
  if (cat.subcategories.includes(name.trim())) { showToast('Subcategory already exists.', 'warning'); return; }
  cat.subcategories.push(name.trim());
  renderCategoriesList();
  showToast(`Subcategory "${name.trim()}" added.`, 'success');
}

function renderBrandsList() {
  const body = document.getElementById('brands-body');
  if (!body) return;
  body.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${AppState.brands.map(b => `
        <div style="display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border-light);border-radius:var(--radius);padding:8px 14px">
          <i class="bi bi-tag" style="color:var(--gold)"></i>
          <span style="font-weight:600;font-size:13px">${sanitizeHTML(b.name)}</span>
          <span style="font-size:11px;color:var(--text-muted)">(${AppState.products.filter(p=>p.brand===b.name).length} products)</span>
        </div>`).join('')}
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES HISTORY
// ─────────────────────────────────────────────────────────────────────────────
let shFilters = { search: '', method: '', gst: '', dateFrom: '', dateTo: '' };
let shPage = 1;
const SH_PER_PAGE = 10;

function renderSalesHistory(container) {
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Sales History</h1>
        <div class="breadcrumb-text">All invoices — in-memory sample data</div>
      </div>
      <div class="page-header-right" style="display:flex;gap:10px">
        <button class="btn-outline-it" id="sh-export-btn"><i class="bi bi-download"></i> CSV</button>
        <button class="btn-primary-it" onclick="navigateTo('billing')"><i class="bi bi-plus"></i> New Bill</button>
      </div>
    </div>
    <div class="demo-banner"><i class="bi bi-info-circle-fill"></i><span>Sample invoices. Data resets on page refresh.</span></div>
    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="sh-search" placeholder="🔍 Search invoice, customer...">
          <input type="date" class="form-control-it" id="sh-date-from">
          <input type="date" class="form-control-it" id="sh-date-to">
          <select class="form-control-it" id="sh-method">
            <option value="">All Payments</option>
            <option>Cash</option><option>UPI</option><option>Card</option><option>Other</option>
          </select>
          <select class="form-control-it" id="sh-gst">
            <option value="">GST: All</option>
            <option value="yes">GST: Yes</option>
            <option value="no">GST: No</option>
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead>
            <tr>
              <th>Invoice No.</th><th>Date</th><th>Customer</th><th>Items</th>
              <th>Subtotal</th><th>Discount</th><th>GST</th><th>Total</th>
              <th>Payment</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody id="sh-tbody"></tbody>
        </table>
      </div>
      <div class="pagination-bar">
        <span id="sh-showing">Showing 0 of 0</span>
        <div class="pagination-controls" id="sh-pagination"></div>
      </div>
    </div>
  </div>

  <!-- Sale Invoice Preview Modal -->
  <div class="modal fade" id="view-sale-modal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi bi-receipt"></i> Invoice Preview</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body" id="view-sale-body"></div>
        <div class="modal-footer">
          <button class="btn-ghost" data-bs-dismiss="modal">Close</button>
          <button class="btn-primary-it" id="btn-print-sale"><i class="bi bi-printer"></i> Print</button>
        </div>
      </div>
    </div>
  </div>`;

  shFilters = { search: '', method: '', gst: '', dateFrom: '', dateTo: '' };
  shPage = 1;
  renderSHTable();

  ['sh-search','sh-date-from','sh-date-to','sh-method','sh-gst'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      shFilters.search   = document.getElementById('sh-search')?.value.toLowerCase() || '';
      shFilters.dateFrom = document.getElementById('sh-date-from')?.value || '';
      shFilters.dateTo   = document.getElementById('sh-date-to')?.value || '';
      shFilters.method   = document.getElementById('sh-method')?.value || '';
      shFilters.gst      = document.getElementById('sh-gst')?.value || '';
      shPage = 1;
      renderSHTable();
    });
  });
  document.getElementById('sh-export-btn')?.addEventListener('click', exportSHCSV);
}

function getFilteredSH() {
  return AppState.sales.filter(s => {
    if (shFilters.search && !s.invoiceNo.toLowerCase().includes(shFilters.search) && !s.customer.toLowerCase().includes(shFilters.search)) return false;
    if (shFilters.dateFrom && s.date < shFilters.dateFrom) return false;
    if (shFilters.dateTo   && s.date > shFilters.dateTo) return false;
    if (shFilters.method   && s.paymentMethod !== shFilters.method) return false;
    if (shFilters.gst === 'yes' && !s.gstEnabled) return false;
    if (shFilters.gst === 'no'  &&  s.gstEnabled) return false;
    return true;
  }).sort((a,b) => b.date.localeCompare(a.date));
}

function renderSHTable() {
  const tbody = document.getElementById('sh-tbody');
  if (!tbody) return;
  const all = getFilteredSH();
  const totalPages = Math.ceil(all.length / SH_PER_PAGE) || 1;
  if (shPage > totalPages) shPage = totalPages;
  const paged = all.slice((shPage-1)*SH_PER_PAGE, shPage*SH_PER_PAGE);

  const showEl = document.getElementById('sh-showing');
  if (showEl) showEl.textContent = `Showing ${paged.length} of ${all.length} invoices`;

  if (!paged.length) {
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state" style="padding:40px"><i class="bi bi-receipt"></i><h4>No Sales Found</h4></div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(s => `
      <tr>
        <td><strong>${sanitizeHTML(s.invoiceNo)}</strong></td>
        <td>${formatDate(s.date)}</td>
        <td>${sanitizeHTML(s.customer)}<br><small style="color:var(--text-muted)">${sanitizeHTML(s.customerPhone||'—')}</small></td>
        <td>${s.items.length}</td>
        <td>${formatINR(s.subtotal)}</td>
        <td>${s.discount > 0 ? formatINR(s.discount) : '—'}</td>
        <td>${s.gstEnabled ? `<span class="badge-status badge-primary">${formatINR(s.gstAmount)}</span>` : '—'}</td>
        <td><strong>${formatINR(s.grandTotal)}</strong></td>
        <td><i class="bi bi-${s.paymentMethod === 'Cash' ? 'cash-coin' : s.paymentMethod === 'UPI' ? 'phone' : 'credit-card'}"></i> ${sanitizeHTML(s.paymentMethod)}</td>
        <td>${paymentBadge(s.paymentStatus)}</td>
        <td style="white-space:nowrap">
          <button class="btn-sm-action" onclick="viewSaleInvoice('${sanitizeHTML(s.id)}')"><i class="bi bi-eye"></i></button>
          <button class="btn-sm-action" onclick="printSaleInvoice('${sanitizeHTML(s.id)}')"><i class="bi bi-printer"></i></button>
        </td>
      </tr>`).join('');
  }

  // Pagination
  const pgEl = document.getElementById('sh-pagination');
  if (pgEl) {
    pgEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${i === shPage ? 'active' : ''}`;
      btn.textContent = i;
      btn.addEventListener('click', () => { shPage = i; renderSHTable(); });
      pgEl.appendChild(btn);
    }
  }
}

function viewSaleInvoice(id) {
  const sale = AppState.sales.find(s => s.id === id);
  if (!sale) return;

  // Temporarily store billing state and show preview using billing module function
  const savedState = { ...billingState };
  billingState.gstEnabled = sale.gstEnabled;
  billingState.gstRate = 18;
  billingState.cart = sale.items.map(i => ({ ...i, size: i.size || '', maxStock: 999 }));

  const body = document.getElementById('view-sale-body');
  if (!body) return;

  const settings = AppState.settings;
  body.innerHTML = `
    <div class="placeholder-banner"><i class="bi bi-info-circle"></i> Placeholder invoice. Business details to be finalized.</div>
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="invoice-company">
          <h2>${sanitizeHTML(settings.businessName)}</h2>
          <p>${sanitizeHTML(settings.businessAddress)}<br>GSTIN: ${sanitizeHTML(settings.gstin)}</p>
        </div>
        <div class="invoice-meta">
          <h3>INVOICE</h3>
          <p class="invoice-no">${sanitizeHTML(sale.invoiceNo)}</p>
          <p>Date: ${formatDate(sale.date)}</p>
        </div>
      </div>
      <div class="invoice-parties">
        <div class="invoice-party">
          <h5>Bill To</h5>
          <p>
            <strong>${sanitizeHTML(sale.customer)}</strong><br>
            ${sale.customerPhone ? `<span>📞 ${sanitizeHTML(sale.customerPhone)}</span><br>` : ''}
            ${sale.customerAddress ? `<span style="font-size:12px;color:var(--text-muted)"><i class="bi bi-geo-alt"></i> ${sanitizeHTML(sale.customerAddress)}</span>` : ''}
          </p>
        </div>
        <div class="invoice-party"><h5>Payment Method</h5><p>${sanitizeHTML(sale.paymentMethod)}<br>${paymentBadge(sale.paymentStatus)}</p></div>
      </div>
      <table class="invoice-items-table">
        <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Discount</th><th>Total</th></tr></thead>
        <tbody>
          ${sale.items.map((item,i) => `<tr>
            <td>${i+1}</td>
            <td>${sanitizeHTML(item.name)}</td>
            <td><small>${sanitizeHTML(item.sku)}</small></td>
            <td>${item.qty}</td>
            <td>${formatINR(item.unitPrice)}</td>
            <td>${item.discount>0?formatINR(item.discount):'—'}</td>
            <td><strong>${formatINR((item.qty*item.unitPrice)-item.discount)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatINR(sale.subtotal)}</span></div>
        ${sale.discount>0?`<div class="total-row"><span>Discount</span><span>-${formatINR(sale.discount)}</span></div>`:''}
        ${sale.gstEnabled?`<div class="total-row"><span>GST</span><span>${formatINR(sale.gstAmount)}</span></div>`:''}
        <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatINR(sale.grandTotal)}</span></div>
        <div class="total-row" style="font-size:12px;color:var(--text-muted)"><span>Amount Paid</span><span>${formatINR(sale.amountPaid)}</span></div>
        ${sale.balance>0?`<div class="total-row" style="color:var(--danger);font-weight:600"><span>Balance Due</span><span>${formatINR(sale.balance)}</span></div>`:''}
      </div>
      <div class="invoice-footer-note"><p>${sanitizeHTML(settings.invoiceFooterText)}</p></div>
    </div>`;

  new bootstrap.Modal(document.getElementById('view-sale-modal')).show();
  document.getElementById('btn-print-sale').onclick = () => {
    const container = document.querySelector('#view-sale-modal .invoice-container');
    printInvoiceContent(container ? container.outerHTML : document.getElementById('view-sale-modal-body').innerHTML);
  };

  billingState = savedState;
}

function printSaleInvoice(id) {
  viewSaleInvoice(id);
  setTimeout(() => {
    const container = document.querySelector('#view-sale-modal .invoice-container');
    printInvoiceContent(container ? container.outerHTML : document.getElementById('view-sale-modal-body').innerHTML);
  }, 250);
}

function exportSHCSV() {
  const data = getFilteredSH();
  exportCSV('sales_history.csv',
    ['Invoice No.','Date','Customer','Phone','Address','Items','Subtotal','Discount','GST Enabled','GST Amount','Grand Total','Amount Paid','Balance','Payment Method','Status'],
    data.map(s => [s.invoiceNo, s.date, s.customer, s.customerPhone||'', s.customerAddress||'', s.items.length, s.subtotal, s.discount, s.gstEnabled?'Yes':'No', s.gstAmount, s.grandTotal, s.amountPaid, s.balance, s.paymentMethod, s.paymentStatus])
  );
}
