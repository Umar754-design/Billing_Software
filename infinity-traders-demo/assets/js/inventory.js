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
async function renderInventory(container) {
  if (!container) container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = renderLoadingSpinner('Loading inventory from database...');

  const [prodRes] = await Promise.all([
    apiGet('api/products/index.php'),
    AppState.categories.length === 0 ? loadGlobalAppData() : Promise.resolve()
  ]);

  if (prodRes && prodRes.success && Array.isArray(prodRes.data)) {
    AppState.products = prodRes.data;
  }

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Products &amp; Inventory</h1>
        <div class="breadcrumb-text">${AppState.products.length} total variants</div>
      </div>
      <div class="page-header-right" style="display:flex;gap:10px">
        <button class="btn-outline-it" id="inv-export-btn"><i class="bi bi-download"></i> CSV Export</button>
        <button class="btn-primary-it" onclick="navigateTo('purchases')" title="New Purchase from Supplier"><i class="bi bi-cart-plus me-1"></i> New Purchase</button>
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
          <h5 class="modal-title" id="product-modal-title"><i class="bi bi-pencil-square"></i> Edit Product</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-md-8">
              <label class="form-label">Product Name *</label>
              <div style="position:relative">
                <input type="text" class="form-control-it" id="prod-name" placeholder="e.g. Nike Air Zoom Pegasus 40" autocomplete="off">
                <div id="prod-name-autocomplete-list" class="product-autocomplete-dropdown" style="display:none"></div>
              </div>
              <div class="form-error-msg" id="err-prod-name"></div>
            </div>
            <div class="col-md-4">
              <label class="form-label">SKU *</label>
              <input type="text" class="form-control-it" id="prod-sku" placeholder="e.g. NK-RUN-PEG-8-BLK">
              <div class="form-error-msg" id="err-prod-sku"></div>
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
              <input type="text" class="form-control-it" id="prod-size" placeholder="e.g. 7, 8, 9, M, L">
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
            <div class="col-md-4">
              <label class="form-label" style="display:flex;justify-content:space-between;align-items:center">
                <span>Current Stock</span>
                <span class="badge" style="background:#e2e8f0;color:#475569;font-size:10px;font-weight:600"><i class="bi bi-shield-lock-fill text-primary"></i> Strict Mode</span>
              </label>
              <input type="number" class="form-control-it" id="prod-stock" min="0" placeholder="0" readonly disabled style="background:#f1f5f9;cursor:not-allowed;font-weight:700;color:var(--text-dark)">
              <div class="form-text" style="font-size:11px;color:var(--text-muted);margin-top:2px">
                <i class="bi bi-info-circle text-primary"></i> Stock add karne ke liye <a href="javascript:void(0)" onclick="bootstrap.Modal.getInstance(document.getElementById('product-modal'))?.hide(); navigateTo('purchases');" style="color:var(--primary);font-weight:600;text-decoration:underline">New Purchase</a> karein (Supplier bill ke sath).
              </div>
              <div class="form-error-msg" id="err-prod-stock"></div>
            </div>
            <div class="col-md-4">
              <label class="form-label">Low Stock Threshold</label>
              <input type="number" class="form-control-it" id="prod-low-threshold" min="1" value="${AppState.settings.lowStockThreshold}">
            </div>
            <div class="col-md-4">
              <label class="form-label">Status</label>
              <select class="form-control-it" id="prod-status">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div class="col-md-12">
              <label class="form-label">Image URL (CDN / Web)</label>
              <input type="url" class="form-control-it" id="prod-image-url" placeholder="https://res.cloudinary.com/... or image link">
            </div>
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center">
          <button type="button" class="btn-outline-it" onclick="bootstrap.Modal.getInstance(document.getElementById('product-modal'))?.hide(); navigateTo('purchases');" title="Open New Purchase to add stock from supplier"><i class="bi bi-cart-plus me-1"></i> New Purchase for this item</button>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn-ghost" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn-primary-it" id="btn-save-product"><i class="bi bi-save"></i> Save Changes</button>
          </div>
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
  initProductNameAutosuggest();
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
          <div style="display:flex;align-items:center;gap:10px">
            ${p.image_url ? `<img src="${sanitizeHTML(p.image_url)}" alt="${sanitizeHTML(p.name)}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;border:1px solid var(--border-light);background:#f8fafc;flex-shrink:0" onerror="this.style.display='none'">` : ''}
            <div>
              <div style="font-weight:600;font-size:13px">${sanitizeHTML(p.name)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${sanitizeHTML(p.color||'—')}</div>
            </div>
          </div>
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
          <button class="btn-sm-action" onclick="viewProduct('${sanitizeHTML(p.id)}')" title="View Details & Supplier"><i class="bi bi-eye"></i></button>
          <button class="btn-sm-action" onclick="openProductModal('${sanitizeHTML(p.id)}')" title="Edit Details"><i class="bi bi-pencil"></i></button>
          <button class="btn-sm-action" style="color:var(--primary)" onclick="navigateTo('purchases')" title="New Purchase from Supplier"><i class="bi bi-cart-plus"></i></button>
          <button class="btn-sm-action text-danger" onclick="deleteProduct('${sanitizeHTML(p.id)}')" title="Delete"><i class="bi bi-trash"></i></button>
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

// ─── PRODUCT NAME AUTO-SUGGESTION SYSTEM ───────────────────────────────────
const PRODUCT_CATALOG_TEMPLATES = [
  { name: 'Nike Air Zoom Pegasus 40', brand: 'Nike', category: 'Shoes', subcategory: 'Running Shoes', purchasePrice: 4500, sellingPrice: 7999, lowStockThreshold: 3 },
  { name: 'Nike Air Force 1 \'07', brand: 'Nike', category: 'Shoes', subcategory: 'Sneakers', purchasePrice: 4200, sellingPrice: 7495, lowStockThreshold: 3 },
  { name: 'Nike Revolution 6 Next Nature', brand: 'Nike', category: 'Shoes', subcategory: 'Running Shoes', purchasePrice: 2100, sellingPrice: 3695, lowStockThreshold: 4 },
  { name: 'Nike Dri-FIT Football Jersey', brand: 'Nike', category: 'Sports Wears', subcategory: 'Jerseys', purchasePrice: 1200, sellingPrice: 2495, lowStockThreshold: 5 },
  { name: 'Nike Club Fleece Tracksuit', brand: 'Nike', category: 'Sports Wears', subcategory: 'Tracksuits', purchasePrice: 2800, sellingPrice: 4995, lowStockThreshold: 3 },
  { name: 'Nike Victori One Slide', brand: 'Nike', category: 'Slippers', subcategory: 'Slides', purchasePrice: 899, sellingPrice: 1995, lowStockThreshold: 4 },
  { name: 'Adidas Ultraboost Light', brand: 'Adidas', category: 'Shoes', subcategory: 'Running Shoes', purchasePrice: 5800, sellingPrice: 11999, lowStockThreshold: 3 },
  { name: 'Adidas Stan Smith Classic', brand: 'Adidas', category: 'Shoes', subcategory: 'Sneakers', purchasePrice: 3400, sellingPrice: 6999, lowStockThreshold: 3 },
  { name: 'Adidas Predator Accuracy Football Boots', brand: 'Adidas', category: 'Shoes', subcategory: 'Football Boots', purchasePrice: 4100, sellingPrice: 7999, lowStockThreshold: 2 },
  { name: 'Adidas Tiro Training Tracksuit', brand: 'Adidas', category: 'Sports Wears', subcategory: 'Tracksuits', purchasePrice: 2200, sellingPrice: 4499, lowStockThreshold: 3 },
  { name: 'Adidas Adilette Comfort Slides', brand: 'Adidas', category: 'Slippers', subcategory: 'Slides', purchasePrice: 999, sellingPrice: 2299, lowStockThreshold: 4 },
  { name: 'Puma Smash V2 Sneakers', brand: 'Puma', category: 'Shoes', subcategory: 'Sneakers', purchasePrice: 1800, sellingPrice: 3499, lowStockThreshold: 4 },
  { name: 'Puma Future 7 Match Football Boots', brand: 'Puma', category: 'Shoes', subcategory: 'Football Boots', purchasePrice: 3200, sellingPrice: 5999, lowStockThreshold: 2 },
  { name: 'Puma ESS Logo Sports Shorts', brand: 'Puma', category: 'Sports Wears', subcategory: 'Shorts', purchasePrice: 750, sellingPrice: 1499, lowStockThreshold: 5 },
  { name: 'Puma Leadcat 2.0 Slides', brand: 'Puma', category: 'Slippers', subcategory: 'Slides', purchasePrice: 699, sellingPrice: 1499, lowStockThreshold: 4 },
  { name: 'ASICS Gel-Kayano 30 Running Shoes', brand: 'ASICS', category: 'Shoes', subcategory: 'Running Shoes', purchasePrice: 7500, sellingPrice: 14999, lowStockThreshold: 2 },
  { name: 'ASICS Gel-Nimbus 26', brand: 'ASICS', category: 'Shoes', subcategory: 'Running Shoes', purchasePrice: 7200, sellingPrice: 13999, lowStockThreshold: 2 },
  { name: 'Crocs Classic Clog', brand: 'Crocs', category: 'Slippers', subcategory: 'Clogs', purchasePrice: 1400, sellingPrice: 2995, lowStockThreshold: 4 },
  { name: 'Crocs Bayaband Slide', brand: 'Crocs', category: 'Slippers', subcategory: 'Slides', purchasePrice: 1100, sellingPrice: 2295, lowStockThreshold: 4 },
  { name: 'Under Armour Curry Flow Basketball Shoes', brand: 'Under Armour', category: 'Shoes', subcategory: 'Sneakers', purchasePrice: 6200, sellingPrice: 12499, lowStockThreshold: 2 },
  { name: 'Under Armour HeatGear Compression Gym Wear', brand: 'Under Armour', category: 'Sports Wears', subcategory: 'Gym Wear', purchasePrice: 1100, sellingPrice: 2299, lowStockThreshold: 4 },
  { name: 'Classic Formal Oxford Leather Shoes', brand: 'Other', category: 'Shoes', subcategory: 'Formal Shoes', purchasePrice: 2100, sellingPrice: 4499, lowStockThreshold: 3 }
];

function highlightTextMatch(text, query) {
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

function getProductSuggestions(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];

  const map = new Map();

  // 1. Existing database products in AppState.products
  (AppState.products || []).forEach(p => {
    const name = (p.name || '').trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        name: name,
        category: p.category || p.category_name || '',
        subcategory: p.subcategory || p.subcategory_name || '',
        brand: p.brand || p.brand_name || '',
        purchasePrice: p.purchasePrice !== undefined ? p.purchasePrice : (p.purchase_price || 0),
        sellingPrice: p.sellingPrice !== undefined ? p.sellingPrice : (p.selling_price || 0),
        lowStockThreshold: p.lowStockThreshold || p.low_stock_threshold || 3,
        imageUrl: p.image_url || p.image || '',
        isSavedProduct: true,
        variantsCount: 0,
        sizes: []
      });
    }
    const item = map.get(key);
    item.variantsCount++;
    if (p.size && !item.sizes.includes(p.size)) {
      item.sizes.push(p.size);
    }
  });

  // 2. Add preset catalog templates
  PRODUCT_CATALOG_TEMPLATES.forEach(tpl => {
    const key = tpl.name.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        ...tpl,
        isSavedProduct: false,
        variantsCount: 0,
        sizes: []
      });
    }
  });

  // 3. Filter items matching query
  const results = [];
  for (const item of map.values()) {
    const nameMatch = item.name.toLowerCase().includes(q);
    const brandMatch = (item.brand || '').toLowerCase().includes(q);
    const catMatch = (item.category || '').toLowerCase().includes(q);
    const subcatMatch = (item.subcategory || '').toLowerCase().includes(q);

    if (nameMatch || brandMatch || catMatch || subcatMatch) {
      let score = 0;
      if (item.name.toLowerCase().startsWith(q)) score += 50;
      else if (nameMatch) score += 30;
      if ((item.brand || '').toLowerCase().startsWith(q)) score += 20;
      if (item.isSavedProduct) score += 15; // Prioritize items already in store

      results.push({ ...item, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 7);
}

function selectProductSuggestion(item) {
  const nameInput = document.getElementById('prod-name');
  if (nameInput) nameInput.value = item.name;

  // Auto-select Category
  if (item.category) {
    const catSelect = document.getElementById('prod-category');
    if (catSelect) {
      for (const opt of catSelect.options) {
        if (opt.value && opt.value.toLowerCase() === item.category.toLowerCase()) {
          catSelect.value = opt.value;
          break;
        }
      }
      updateSubcategoryOptions(catSelect.value);
    }
  }

  // Auto-select Subcategory
  if (item.subcategory) {
    setTimeout(() => {
      const subcatSelect = document.getElementById('prod-subcategory');
      if (subcatSelect) {
        for (const opt of subcatSelect.options) {
          if (opt.value && opt.value.toLowerCase() === item.subcategory.toLowerCase()) {
            subcatSelect.value = opt.value;
            break;
          }
        }
      }
    }, 20);
  }

  // Auto-select Brand
  if (item.brand) {
    const brandSelect = document.getElementById('prod-brand');
    if (brandSelect) {
      for (const opt of brandSelect.options) {
        if (opt.value && opt.value.toLowerCase() === item.brand.toLowerCase()) {
          brandSelect.value = opt.value;
          break;
        }
      }
    }
  }

  // Auto-fill prices
  if (item.purchasePrice !== undefined && item.purchasePrice !== null && !isNaN(item.purchasePrice)) {
    const purInput = document.getElementById('prod-purchase-price');
    if (purInput) purInput.value = parseFloat(item.purchasePrice).toFixed(2);
  }
  if (item.sellingPrice !== undefined && item.sellingPrice !== null && !isNaN(item.sellingPrice)) {
    const sellInput = document.getElementById('prod-selling-price');
    if (sellInput) sellInput.value = parseFloat(item.sellingPrice).toFixed(2);
  }
  if (item.lowStockThreshold) {
    const lowInput = document.getElementById('prod-low-threshold');
    if (lowInput) lowInput.value = item.lowStockThreshold;
  }
  if (item.imageUrl) {
    const imgInput = document.getElementById('prod-image-url');
    if (imgInput && !imgInput.value) imgInput.value = item.imageUrl;
  }

  // Suggest SKU if empty
  const skuInput = document.getElementById('prod-sku');
  if (skuInput && !skuInput.value) {
    const bCode = (item.brand || 'IT').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const cCode = (item.category || 'GEN').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const nWords = (item.name || '').split(/\s+/).map(w => w[0]).join('').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') || 'PRD';
    const rand = Math.floor(100 + Math.random() * 900);
    skuInput.value = `${bCode}-${cCode}-${nWords}-${rand}`;
  }

  // Show autofill hint banner
  let hintEl = document.getElementById('prod-autofill-hint');
  if (!hintEl) {
    hintEl = document.createElement('div');
    hintEl.id = 'prod-autofill-hint';
    hintEl.className = 'suggest-autofill-hint';
    const col = nameInput.closest('.col-md-8');
    if (col) col.appendChild(hintEl);
  }
  hintEl.innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> Auto-filled category, brand & prices from "<strong>${sanitizeHTML(item.name)}</strong>". Adjust size, SKU & stock.`;
  hintEl.style.display = 'flex';

  // Close suggestion dropdown
  const box = document.getElementById('prod-name-autocomplete-list');
  if (box) box.style.display = 'none';

  // Move focus to size
  setTimeout(() => {
    document.getElementById('prod-size')?.focus();
  }, 50);
}

function initProductNameAutosuggest() {
  const input = document.getElementById('prod-name');
  const box = document.getElementById('prod-name-autocomplete-list');
  if (!input || !box) return;

  let activeIdx = -1;
  let currentItems = [];

  function renderList() {
    const q = input.value.trim();
    if (q.length < 1) {
      box.style.display = 'none';
      box.innerHTML = '';
      currentItems = [];
      activeIdx = -1;
      return;
    }

    currentItems = getProductSuggestions(q);
    if (!currentItems.length) {
      box.style.display = 'none';
      box.innerHTML = '';
      activeIdx = -1;
      return;
    }

    activeIdx = -1;
    box.innerHTML = `
      <div class="prod-suggest-header">
        <span><i class="bi bi-stars" style="color:var(--primary)"></i> Suggested Products (${currentItems.length})</span>
        <span style="font-size:10px;text-transform:none">Press ↑↓ to navigate, Enter to select</span>
      </div>
      ${currentItems.map((item, idx) => {
        const catText = item.subcategory ? `${item.category} › ${item.subcategory}` : item.category;
        return `
        <div class="prod-suggest-item" data-idx="${idx}">
          <div class="prod-suggest-left">
            <div class="prod-suggest-title">
              <i class="bi bi-box-seam" style="font-size:12px;color:var(--primary)"></i>
              <span>${highlightTextMatch(item.name, q)}</span>
            </div>
            <div class="prod-suggest-meta">
              ${item.brand ? `<span class="prod-suggest-badge brand"><i class="bi bi-award"></i> ${sanitizeHTML(item.brand)}</span>` : ''}
              ${catText ? `<span class="prod-suggest-badge cat"><i class="bi bi-tag"></i> ${sanitizeHTML(catText)}</span>` : ''}
              ${item.isSavedProduct && item.variantsCount ? `<span class="prod-suggest-badge variants"><i class="bi bi-check-all"></i> ${item.variantsCount} in store</span>` : ''}
              ${item.sizes && item.sizes.length ? `<span>Sizes: ${item.sizes.slice(0, 4).map(s => sanitizeHTML(s)).join(', ')}</span>` : ''}
            </div>
          </div>
          <div class="prod-suggest-right">
            ${item.sellingPrice ? `<div class="prod-suggest-price">${formatINR(item.sellingPrice)}</div>` : ''}
            ${item.purchasePrice ? `<div class="prod-suggest-cost">Cost: ${formatINR(item.purchasePrice)}</div>` : ''}
          </div>
        </div>
      `;
      }).join('')}
    `;

    box.style.display = 'block';

    box.querySelectorAll('.prod-suggest-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const idx = parseInt(el.dataset.idx, 10);
        if (currentItems[idx]) {
          selectProductSuggestion(currentItems[idx]);
        }
      });
    });
  }

  input.addEventListener('input', () => {
    const hint = document.getElementById('prod-autofill-hint');
    if (hint) hint.style.display = 'none';
    renderList();
  });

  input.addEventListener('focus', () => {
    if (input.value.trim().length >= 1) {
      renderList();
    }
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
        selectProductSuggestion(currentItems[activeIdx]);
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

function populateProductForm(p) {
  if (!p) return;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = (val !== undefined && val !== null) ? val : '';
  };

  setVal('prod-name', p.name);
  setVal('prod-sku', p.sku);
  setVal('prod-size', p.size);
  setVal('prod-color', p.color);
  setVal('prod-purchase-price', (p.purchasePrice !== undefined && p.purchasePrice !== null && p.purchasePrice !== '') ? p.purchasePrice : (p.purchase_price ?? ''));
  setVal('prod-selling-price', (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== '') ? p.sellingPrice : (p.selling_price ?? ''));
  setVal('prod-stock', (p.stock !== undefined && p.stock !== null) ? p.stock : 0);
  setVal('prod-low-threshold', (p.lowStockThreshold !== undefined && p.lowStockThreshold !== null) ? p.lowStockThreshold : (p.low_stock_threshold ?? (AppState.settings?.lowStockThreshold ?? 3)));
  setVal('prod-image-url', p.image_url || p.image || '');

  const statusVal = p.status || (p.is_active === 0 || p.is_active === false ? 'Inactive' : 'Active');
  setVal('prod-status', statusVal);

  const catName = p.category || p.category_name || '';
  const brandName = p.brand || p.brand_name || '';
  const subcatName = p.subcategory || p.subcategory_name || '';

  const catEl = document.getElementById('prod-category');
  if (catEl) {
    if (catName && ![...catEl.options].some(o => o.value === catName)) {
      catEl.add(new Option(catName, catName));
    }
    catEl.value = catName;
  }

  const brandEl = document.getElementById('prod-brand');
  if (brandEl) {
    if (brandName && ![...brandEl.options].some(o => o.value === brandName)) {
      brandEl.add(new Option(brandName, brandName));
    }
    brandEl.value = brandName;
  }

  updateSubcategoryOptions(catName);

  const subcatEl = document.getElementById('prod-subcategory');
  if (subcatEl) {
    if (subcatName && ![...subcatEl.options].some(o => o.value === subcatName)) {
      subcatEl.add(new Option(subcatName, subcatName));
    }
    subcatEl.value = subcatName;
  }
}

async function openProductModal(productId) {
  if (!productId) {
    showToast('Strict Purchase Mode: Naya stock aur product Supplier ke sath add karne ke liye New Purchase open ho raha hai.', 'info', 3500);
    navigateTo('purchases');
    return;
  }
  editingProductId = String(productId);
  const title = document.getElementById('product-modal-title');
  if (title) title.innerHTML = '<i class="bi bi-pencil-square"></i> Edit Product Details';

  // Ensure category and brand options are fresh
  const catEl = document.getElementById('prod-category');
  if (catEl && AppState.categories && AppState.categories.length) {
    catEl.innerHTML = `<option value="">— Select —</option>` +
      AppState.categories.map(c => `<option value="${sanitizeHTML(c.name)}">${sanitizeHTML(c.name)}</option>`).join('');
  }
  const brandEl = document.getElementById('prod-brand');
  if (brandEl && AppState.brands && AppState.brands.length) {
    brandEl.innerHTML = `<option value="">— Select —</option>` +
      AppState.brands.map(b => `<option value="${sanitizeHTML(b.name)}">${sanitizeHTML(b.name)}</option>`).join('');
  }

  // Clear form
  ['prod-name','prod-sku','prod-size','prod-color','prod-image-url'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['prod-purchase-price','prod-selling-price','prod-stock'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const lowThreshEl = document.getElementById('prod-low-threshold');
  if (lowThreshEl) lowThreshEl.value = AppState.settings?.lowStockThreshold ?? 3;
  if (catEl) catEl.value = '';
  if (brandEl) brandEl.value = '';
  const statusEl = document.getElementById('prod-status');
  if (statusEl) statusEl.value = 'Active';
  updateSubcategoryOptions('');
  ['err-prod-name','err-prod-sku','err-prod-category','err-prod-brand','err-prod-purchase-price','err-prod-selling-price','err-prod-stock'].forEach(id => {
    const el = document.getElementById(id); if (el) el.textContent = '';
  });

  const suggestBox = document.getElementById('prod-name-autocomplete-list');
  if (suggestBox) {
    suggestBox.style.display = 'none';
    suggestBox.innerHTML = '';
  }
  const hintEl = document.getElementById('prod-autofill-hint');
  if (hintEl) hintEl.style.display = 'none';

  // If editing an existing product, populate immediate data from AppState
  if (productId) {
    const p = (AppState.products || []).find(x => String(x.id) === String(productId));
    if (p) {
      populateProductForm(p);
    }
  }

  const modalEl = document.getElementById('product-modal');
  const modal = bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(modalEl) : new bootstrap.Modal(modalEl);
  modal.show();

  // If editing, also fetch latest product details asynchronously from server API
  if (productId) {
    try {
      const res = await apiGet(`api/products/item.php?id=${encodeURIComponent(productId)}`);
      if (res && res.success && res.data && String(editingProductId) === String(productId)) {
        populateProductForm(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch single product detail from server:', err);
    }
  } else {
    // Focus product name after modal is shown if adding new
    setTimeout(() => {
      document.getElementById('prod-name')?.focus();
    }, 350);
  }
}

function updateSubcategoryOptions(categoryName) {
  const el = document.getElementById('prod-subcategory');
  if (!el) return;
  const cat = (AppState.categories || []).find(c => c.name === categoryName);
  el.innerHTML = cat
    ? `<option value="">— All / None —</option>${(cat.subcategories || []).map(s => `<option value="${sanitizeHTML(s)}">${sanitizeHTML(s)}</option>`).join('')}`
    : `<option value="">— Select Category First —</option>`;
}

async function saveProduct() {
  const name      = document.getElementById('prod-name')?.value.trim();
  const sku       = document.getElementById('prod-sku')?.value.trim();
  const category  = document.getElementById('prod-category')?.value;
  const brand     = document.getElementById('prod-brand')?.value;
  const purPrice  = parseFloat(document.getElementById('prod-purchase-price')?.value);
  const sellPrice = parseFloat(document.getElementById('prod-selling-price')?.value);

  // In Strict Purchase Mode, existing stock is preserved
  const existingProd = (AppState.products || []).find(x => String(x.id) === String(editingProductId));
  const stock     = existingProd ? (existingProd.stock ?? 0) : (parseInt(document.getElementById('prod-stock')?.value, 10) || 0);

  let valid = true;
  const setErr = (id, msg) => { const el = document.getElementById(id); if (el) el.textContent = msg; };
  ['err-prod-name','err-prod-sku','err-prod-category','err-prod-brand','err-prod-purchase-price','err-prod-selling-price','err-prod-stock'].forEach(id => setErr(id, ''));

  if (!name)                             { setErr('err-prod-name', 'Product name is required.'); valid = false; }
  if (!sku)                              { setErr('err-prod-sku', 'SKU is required.'); valid = false; }
  if (!category)                         { setErr('err-prod-category', 'Category is required.'); valid = false; }
  if (!brand)                            { setErr('err-prod-brand', 'Brand is required.'); valid = false; }
  if (isNaN(purPrice)  || purPrice < 0)  { setErr('err-prod-purchase-price', 'Valid purchase price required.'); valid = false; }
  if (isNaN(sellPrice) || sellPrice < 0) { setErr('err-prod-selling-price', 'Valid selling price required.'); valid = false; }

  if (!valid) return;

  const saveBtn = document.getElementById('btn-save-product');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
  }

  const catObj = (AppState.categories || []).find(c => c.name === category);
  const brandObj = (AppState.brands || []).find(b => b.name === brand);
  let subcatId = null;
  const subcategoryVal = document.getElementById('prod-subcategory')?.value || '';
  if (catObj && Array.isArray(catObj.subcategories_detail)) {
    const subObj = catObj.subcategories_detail.find(s => s.name === subcategoryVal);
    if (subObj) subcatId = subObj.id;
  }

  const productData = {
    name, sku,
    barcode:       '',
    category,
    category_id:   catObj ? catObj.id : null,
    subcategory:   subcategoryVal,
    subcategory_id: subcatId,
    brand,
    brand_id:      brandObj ? brandObj.id : null,
    size:          document.getElementById('prod-size')?.value.trim() || '',
    color:         document.getElementById('prod-color')?.value.trim() || '',
    purchase_price: purPrice,
    selling_price:  sellPrice,
    stock,
    low_stock_threshold: parseInt(document.getElementById('prod-low-threshold')?.value, 10) || 3,
    image_url:     document.getElementById('prod-image-url')?.value.trim() || '',
    status:        document.getElementById('prod-status')?.value || 'Active'
  };

  try {
    let res;
    if (editingProductId) {
      res = await apiPut(`api/products/item.php?id=${editingProductId}`, productData);
    } else {
      res = await apiPost('api/products/index.php', productData);
    }

    if (res && res.success) {
      showToast(editingProductId ? 'Product updated successfully!' : 'Product added successfully!', 'success');
      const modalEl = document.getElementById('product-modal');
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
      editingProductId = null;
      const prodRes = await apiGet('api/products/index.php');
      if (prodRes && prodRes.success) {
        AppState.products = prodRes.data;
      }
      renderInvTable();
    } else {
      showToast(res?.error || 'Failed to save product.', 'danger');
    }
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-save"></i> Save Product';
    }
  }
}

function deleteProduct(id) {
  showConfirm('Delete Product', 'Are you sure you want to delete this product?', async () => {
    const res = await apiDelete(`api/products/item.php?id=${id}`);
    if (res && res.success) {
      showToast(res.message || 'Product deleted successfully', 'success');
      const prodRes = await apiGet('api/products/index.php');
      if (prodRes && prodRes.success) {
        AppState.products = prodRes.data;
      }
      renderInvTable();
    } else {
      showToast(res?.error || 'Failed to delete product', 'danger');
    }
  }, 'Delete', 'btn-danger-it');
}

function viewProduct(id) {
  const p = (AppState.products || []).find(x => String(x.id) === String(id));
  if (!p) return;
  const body = document.getElementById('view-product-body');
  if (!body) return;
  const stockStatus = getStockStatus(p);

  // Look up latest purchase order for this product to show Supplier
  let supplierInfo = '<span style="color:var(--text-muted)">Opening / Initial Catalog (No PO)</span>';
  const purchases = AppState.purchases || [];
  for (const po of purchases) {
    const hasItem = (po.items || []).some(it => String(it.productId || it.product_id) === String(id) || (p.sku && String(it.sku) === String(p.sku)));
    if (hasItem) {
      supplierInfo = `<span style="color:var(--primary);font-weight:700"><i class="bi bi-truck me-1"></i>${sanitizeHTML(po.supplierName || po.supplier_name || 'Supplier')}</span>` +
        `<br><small style="color:var(--text-muted)">PO: <strong>${sanitizeHTML(po.purchaseNo || po.purchase_no || '')}</strong> · Date: ${formatDate(po.date)}</small>` +
        (po.supplierPhone || po.supplier_phone ? `<br><small style="color:var(--text-muted)">📞 ${sanitizeHTML(po.supplierPhone || po.supplier_phone)}</small>` : '') +
        (po.supplierAddress || po.supplier_address ? `<br><small style="color:var(--text-muted)"><i class="bi bi-geo-alt"></i> ${sanitizeHTML(po.supplierAddress || po.supplier_address)}</small>` : '');
      break;
    }
  }

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div><span class="form-label">Product Name</span><p style="font-weight:600">${sanitizeHTML(p.name)}</p></div>
      <div><span class="form-label">SKU</span><p><code>${sanitizeHTML(p.sku)}</code></p></div>
      <div><span class="form-label">Brand</span><p>${sanitizeHTML(p.brand || p.brand_name || '—')}</p></div>
      <div><span class="form-label">Category</span><p>${sanitizeHTML(p.category || p.category_name || '—')} › ${sanitizeHTML(p.subcategory || p.subcategory_name || '—')}</p></div>
      <div><span class="form-label">Size</span><p>${sanitizeHTML(p.size || '—')}</p></div>
      <div><span class="form-label">Color</span><p>${sanitizeHTML(p.color || '—')}</p></div>
      <div><span class="form-label">Purchase Price</span><p style="font-weight:700;color:var(--warning)">${formatINR(p.purchasePrice ?? p.purchase_price ?? 0)}</p></div>
      <div><span class="form-label">Selling Price</span><p style="font-weight:700;color:var(--success)">${formatINR(p.sellingPrice ?? p.selling_price ?? 0)}</p></div>
      <div><span class="form-label">Current Stock</span><p class="${stockStatus === 'out' ? 'stock-out' : stockStatus === 'low' ? 'stock-low' : 'stock-ok'}" style="font-weight:700;font-size:20px">${p.stock}</p></div>
      <div><span class="form-label">Stock Status</span><p>${getStockBadge(p)}</p></div>
      <div style="grid-column:span 2;background:#f8fafc;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px">
        <span class="form-label" style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase">Purchased From (Supplier)</span>
        <div style="margin-top:4px;font-size:13px">${supplierInfo}</div>
      </div>
      <div><span class="form-label">Low Stock Alert At</span><p>${p.lowStockThreshold ?? p.low_stock_threshold ?? 3} units</p></div>
      <div><span class="form-label">Status</span><p><span class="badge-status ${(p.status === 'Active' || p.is_active) ? 'badge-active' : 'badge-out'}">${sanitizeHTML(p.status || (p.is_active ? 'Active' : 'Inactive'))}</span></p></div>
    </div>
    <div style="margin-top:16px;text-align:right">
      <button type="button" class="btn-primary-it" style="font-size:12.5px;padding:6px 16px" onclick="bootstrap.Modal.getInstance(document.getElementById('view-product-modal'))?.hide(); navigateTo('purchases');">
        <i class="bi bi-cart-plus me-1"></i> New Purchase for this item
      </button>
    </div>`;
  const modalEl = document.getElementById('view-product-modal');
  const modal = bootstrap.Modal.getOrCreateInstance ? bootstrap.Modal.getOrCreateInstance(modalEl) : new bootstrap.Modal(modalEl);
  modal.show();
}

function exportInventoryCSV() {
  const data = getFilteredInventory();
  exportCSV('inventory.csv',
    ['Product Name','SKU','Category','Subcategory','Brand','Size','Color','Purchase Price','Selling Price','Stock','Low Stock Threshold','Status'],
    data.map(p => [p.name, p.sku, p.category, p.subcategory||'', p.brand, p.size||'', p.color||'', p.purchasePrice, p.sellingPrice, p.stock, p.lowStockThreshold, p.status])
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES & BRANDS
// ─────────────────────────────────────────────────────────────────────────────
async function renderCategories(container) {
  if (!container) container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = renderLoadingSpinner('Loading categories and brands...');
  await loadGlobalAppData();

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Categories &amp; Brands</h1>
        <div class="breadcrumb-text">Manage product categories, subcategories, and brands in MySQL database</div>
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

  document.getElementById('btn-add-category')?.addEventListener('click', async () => {
    const name = prompt('Enter new category name:');
    if (!name || !name.trim()) return;
    const res = await apiPost('api/categories/index.php', { name: name.trim() });
    if (res && res.success) {
      showToast(`Category "${name.trim()}" added.`, 'success');
      await loadGlobalAppData();
      renderCategoriesList();
    } else {
      showToast(res?.error || 'Failed to add category', 'danger');
    }
  });

  document.getElementById('btn-add-brand')?.addEventListener('click', async () => {
    const name = prompt('Enter new brand name:');
    if (!name || !name.trim()) return;
    const res = await apiPost('api/brands/index.php', { name: name.trim() });
    if (res && res.success) {
      showToast(`Brand "${name.trim()}" added.`, 'success');
      await loadGlobalAppData();
      renderBrandsList();
    } else {
      showToast(res?.error || 'Failed to add brand', 'danger');
    }
  });
}

function renderCategoriesList() {
  const body = document.getElementById('categories-body');
  if (!body) return;
  if (!AppState.categories.length) {
    body.innerHTML = '<div class="text-muted p-3">No categories found. Click Add to create one.</div>';
    return;
  }

  body.innerHTML = AppState.categories.map(cat => `
    <div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <h6 style="font-weight:700;color:var(--text-dark);margin:0"><i class="bi bi-folder" style="color:var(--primary);margin-right:6px"></i>${sanitizeHTML(cat.name)}</h6>
        <div style="display:flex;gap:6px">
          <button class="btn-sm-action" onclick="addSubcategory('${cat.id}')"><i class="bi bi-plus"></i> Sub</button>
          <button class="btn-sm-action text-danger" onclick="deleteCategory('${cat.id}')" title="Delete Category"><i class="bi bi-trash"></i></button>
        </div>
      </div>
      <div style="padding-left:20px;display:flex;flex-wrap:wrap;gap:6px">
        ${(cat.subcategories || []).map(sub => `
          <span style="background:var(--primary-light);color:var(--primary);padding:3px 10px;border-radius:50px;font-size:12px;font-weight:500;display:inline-flex;align-items:center;gap:6px">
            ${sanitizeHTML(sub)}
            <i class="bi bi-x" style="cursor:pointer" onclick="deleteSubcategory('${cat.id}', '${sanitizeHTML(sub)}')" title="Delete subcategory"></i>
          </span>`).join('')}
        ${!cat.subcategories || !cat.subcategories.length ? '<span style="font-size:12px;color:var(--text-muted)">No subcategories</span>' : ''}
      </div>
    </div>
    <hr style="margin:12px 0;border-color:var(--border-light)">`).join('');
}

async function addSubcategory(catId) {
  const cat = AppState.categories.find(c => String(c.id) === String(catId));
  if (!cat) return;
  const name = prompt(`Add subcategory under "${cat.name}":`);
  if (!name || !name.trim()) return;

  const res = await apiPost('api/categories/subcategory.php', { category_id: cat.id, name: name.trim() });
  if (res && res.success) {
    showToast(`Subcategory "${name.trim()}" added.`, 'success');
    await loadGlobalAppData();
    renderCategoriesList();
  } else {
    showToast(res?.error || 'Failed to add subcategory', 'danger');
  }
}

function deleteCategory(catId) {
  showConfirm('Delete Category', 'Delete this category and its subcategories?', async () => {
    const res = await apiDelete(`api/categories/index.php?id=${catId}`);
    if (res && res.success) {
      showToast('Category deleted successfully.', 'success');
      await loadGlobalAppData();
      renderCategoriesList();
    } else {
      showToast(res?.error || 'Failed to delete category.', 'danger');
    }
  }, 'Delete', 'btn-danger-it');
}

function deleteSubcategory(catId, subName) {
  showConfirm('Delete Subcategory', `Delete subcategory "${subName}"?`, async () => {
    const res = await apiDelete(`api/categories/subcategory.php?category_id=${catId}&name=${encodeURIComponent(subName)}`);
    if (res && res.success) {
      showToast('Subcategory deleted.', 'success');
      await loadGlobalAppData();
      renderCategoriesList();
    } else {
      showToast(res?.error || 'Failed to delete subcategory.', 'danger');
    }
  }, 'Delete', 'btn-danger-it');
}

function renderBrandsList() {
  const body = document.getElementById('brands-body');
  if (!body) return;
  if (!AppState.brands.length) {
    body.innerHTML = '<div class="text-muted p-3">No brands found. Click Add Brand to create one.</div>';
    return;
  }

  body.innerHTML = `
    <div style="display:flex;flex-wrap:wrap;gap:10px">
      ${AppState.brands.map(b => `
        <div style="display:flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border-light);border-radius:var(--radius);padding:8px 14px">
          <i class="bi bi-tag" style="color:var(--gold)"></i>
          <span style="font-weight:600;font-size:13px">${sanitizeHTML(b.name)}</span>
          <span style="font-size:11px;color:var(--text-muted)">(${b.product_count !== undefined ? b.product_count : AppState.products.filter(p=>p.brand===b.name).length} products)</span>
          <i class="bi bi-trash text-danger" style="cursor:pointer;font-size:12px;margin-left:4px" onclick="deleteBrand('${b.id}')" title="Delete brand"></i>
        </div>`).join('')}
    </div>`;
}

function deleteBrand(brandId) {
  showConfirm('Delete Brand', 'Delete this brand?', async () => {
    const res = await apiDelete(`api/brands/item.php?id=${brandId}`);
    if (res && res.success) {
      showToast('Brand deleted.', 'success');
      await loadGlobalAppData();
      renderBrandsList();
    } else {
      showToast(res?.error || 'Failed to delete brand.', 'danger');
    }
  }, 'Delete', 'btn-danger-it');
}

// ─────────────────────────────────────────────────────────────────────────────
// SALES HISTORY
// ─────────────────────────────────────────────────────────────────────────────
let shFilters = { search: '', method: '', gst: '', dateFrom: '', dateTo: '' };
let shPage = 1;
const SH_PER_PAGE = 10;

async function renderSalesHistory(container) {
  if (!container) container = document.getElementById('page-container');
  if (!container) return;

  container.innerHTML = renderLoadingSpinner('Loading sales history from database...');

  const res = await apiGet('api/sales/index.php');
  if (res && res.success && Array.isArray(res.data)) {
    AppState.sales = res.data.map(s => ({
      id: s.id,
      invoiceNo: s.invoice_no,
      date: s.date,
      customerId: s.customer_id || 0,
      customer: s.customer_name || 'Walk-in Customer',
      customerPhone: s.customer_phone || '',
      itemsCount: s.total_items || 0,
      items: s.items || [],
      productsSummary: s.products_summary || '',
      subtotal: s.subtotal,
      discount: s.total_discount,
      gstEnabled: s.gst_enabled == 1,
      gstAmount: (s.cgst + s.sgst + s.igst) || 0,
      grandTotal: s.grand_total,
      amountPaid: s.amount_paid,
      balance: s.balance_due,
      paymentMethod: s.payment_method || 'Cash',
      paymentStatus: s.payment_status || 'Paid'
    }));
  }

  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Sales History</h1>
        <div class="breadcrumb-text">${AppState.sales.length} persistent sales invoices in database</div>
      </div>
      <div class="page-header-right" style="display:flex;gap:10px">
        <button class="btn-outline-it" onclick="navigateTo('sales-returns')"><i class="bi bi-arrow-return-left"></i> Returns</button>
        <button class="btn-outline-it" id="sh-export-btn"><i class="bi bi-download"></i> CSV</button>
        <button class="btn-primary-it" onclick="navigateTo('billing')"><i class="bi bi-plus"></i> New Bill</button>
      </div>
    </div>
    <div class="card">
      <div class="card-body" style="padding:16px">
        <div class="filter-bar">
          <input type="search" class="form-control-it" id="sh-search" placeholder="🔍 Search invoice, customer, product...">
          <input type="date" class="form-control-it" id="sh-date-from">
          <input type="date" class="form-control-it" id="sh-date-to">
          <select class="form-control-it" id="sh-method">
            <option value="">All Payments</option>
            <option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option>
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
              <th>Invoice No.</th><th>Date</th><th>Customer</th><th style="min-width:240px">Products Sold</th>
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
    const sInv = (s.invoiceNo || '').toLowerCase();
    const sCust = (s.customer || '').toLowerCase();
    const sPhone = (s.customerPhone || '').toLowerCase();
    const sProds = (s.productsSummary || '').toLowerCase();
    if (shFilters.search) {
      const q = shFilters.search;
      if (!sInv.includes(q) && !sCust.includes(q) && !sPhone.includes(q) && !sProds.includes(q)) return false;
    }
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
    tbody.innerHTML = `<tr><td colspan="11"><div class="empty-state" style="padding:40px"><i class="bi bi-receipt"></i><h4>No Sales Found</h4><p>Create an invoice from New Billing.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = paged.map(s => `
      <tr>
        <td><strong>${sanitizeHTML(s.invoiceNo)}</strong></td>
        <td>${formatDate(s.date)}</td>
        <td>
          <a href="javascript:void(0)" onclick="openCustomerDetailModal({ id: ${s.customerId || 0}, name: '${escapeAttr(s.customer)}' })" title="Click to view customer details" style="font-weight:600;color:var(--primary);text-decoration:none">
            ${sanitizeHTML(s.customer)}
          </a>
          <br><small style="color:var(--text-muted)">${sanitizeHTML(s.customerPhone||'—')}</small>
        </td>
        <td style="min-width:240px;max-width:340px;vertical-align:top">
          ${(s.items && s.items.length) ? `
            <div style="display:flex;flex-direction:column;gap:5px">
              ${s.items.map(it => `
                <div style="display:flex;align-items:center;gap:8px;background:var(--bg-light);border:1px solid var(--border-light);border-radius:6px;padding:4px 8px">
                  ${it.image_url ? `<img src="${sanitizeHTML(it.image_url)}" alt="" style="width:28px;height:28px;object-fit:cover;border-radius:4px;flex-shrink:0" onerror="this.style.display='none'">` : '<i class="bi bi-box-seam" style="font-size:16px;color:var(--text-muted);flex-shrink:0"></i>'}
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;font-weight:600;color:var(--text-dark);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${sanitizeHTML(it.product_name || it.name)}">
                      ${sanitizeHTML(it.product_name || it.name)}
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                      ${(it.size && it.size !== '—') ? `<span class="badge" style="background:var(--card-bg, #fff);border:1px solid var(--border-color, #cbd5e1);color:var(--text-dark);font-size:10px;padding:1px 5px;font-weight:700">Size: ${sanitizeHTML(it.size)}</span>` : ''}
                      <span>Qty: <strong>${it.qty}</strong></span>
                      <span>·</span>
                      <span>${formatINR(it.unit_price || it.price)}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `<span style="font-size:12px;color:var(--text-muted)">${sanitizeHTML(s.productsSummary || '—')}</span>`}
        </td>
        <td>${formatINR(s.subtotal)}</td>
        <td>${s.discount > 0 ? formatINR(s.discount) : '—'}</td>
        <td>${s.gstEnabled ? `<span class="badge-status badge-primary">${formatINR(s.gstAmount)}</span>` : '—'}</td>
        <td><strong>${formatINR(s.grandTotal)}</strong></td>
        <td><i class="bi bi-${s.paymentMethod === 'Cash' ? 'cash-coin' : s.paymentMethod === 'UPI' ? 'phone' : 'credit-card'}"></i> ${sanitizeHTML(s.paymentMethod)}</td>
        <td>${paymentBadge(s.paymentStatus)}</td>
        <td style="white-space:nowrap">
          ${parseFloat(s.balance || 0) > 0 ? `
            <button class="btn-sm-action text-danger" title="Clear due for this invoice" style="background:#fef2f2;border-color:#fca5a5;font-weight:600" onclick="openClearDueModal({ customerId: ${s.customerId || 0}, customerName: '${escapeAttr(s.customer)}', invoiceId: ${s.id}, invoiceNo: '${escapeAttr(s.invoiceNo)}', dueAmount: ${s.balance} })">
              <i class="bi bi-cash-stack"></i> Pay Due
            </button>
          ` : ''}
          <button class="btn-sm-action" title="View Invoice" onclick="viewSaleInvoice('${sanitizeHTML(s.id)}')"><i class="bi bi-eye"></i></button>
          <button class="btn-sm-action" title="Print Invoice" onclick="printSaleInvoice('${sanitizeHTML(s.id)}')"><i class="bi bi-printer"></i></button>
          <button class="btn-sm-action" title="Return / Exchange Product" style="color:var(--danger, #ef4444)" onclick="openReturnModalForSale('${sanitizeHTML(s.id)}')"><i class="bi bi-arrow-return-left"></i></button>
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

async function viewSaleInvoice(id) {
  const body = document.getElementById('view-sale-body');
  if (!body) return;
  body.innerHTML = renderLoadingSpinner('Loading invoice details...');
  new bootstrap.Modal(document.getElementById('view-sale-modal')).show();

  const res = await apiGet(`api/sales/item.php?id=${id}`);
  if (!res || !res.success || !res.data) {
    body.innerHTML = '<div class="alert alert-danger">Failed to load invoice details.</div>';
    return;
  }

  const sale = res.data;
  const settings = AppState.settings;
  const items = sale.items || [];

  body.innerHTML = `
    <div class="invoice-container">
      <div class="invoice-header">
        <div class="invoice-company">
          <h2>${sanitizeHTML(settings.businessName)}</h2>
          <p>${sanitizeHTML(settings.businessAddress)}<br>GSTIN: ${sanitizeHTML(settings.gstin || '—')}<br>Phone: ${sanitizeHTML(settings.phone || '—')}</p>
        </div>
        <div class="invoice-meta">
          <h3>INVOICE</h3>
          <p class="invoice-no">${sanitizeHTML(sale.invoice_no)}</p>
          <p>Date: ${formatDate(sale.date)}</p>
        </div>
      </div>
      <div class="invoice-parties">
        <div class="invoice-party">
          <h5>Bill To</h5>
          <p>
            <strong>${sanitizeHTML(sale.customer_name || 'Walk-in Customer')}</strong><br>
            ${sale.customer_phone ? `<span>📞 ${sanitizeHTML(sale.customer_phone)}</span><br>` : ''}
            ${sale.customer_address ? `<span style="font-size:12px;color:var(--text-muted)"><i class="bi bi-geo-alt"></i> ${sanitizeHTML(sale.customer_address)}</span>` : ''}
          </p>
        </div>
        <div class="invoice-party"><h5>Payment Details</h5><p>Method: ${sanitizeHTML(sale.payment_method)}<br>Status: ${paymentBadge(sale.payment_status)}</p></div>
      </div>
      <table class="invoice-items-table">
        <thead><tr><th class="col-hide-thermal">#</th><th>Product</th><th class="col-hide-thermal">SKU</th><th class="col-qty">Qty</th><th class="col-rate">Unit Price</th><th class="col-hide-thermal">Discount</th><th class="col-total">Total</th></tr></thead>
        <tbody>
          ${items.map((item,i) => `<tr>
            <td class="col-hide-thermal">${i+1}</td>
            <td class="col-product">
              <div style="font-weight:600">${sanitizeHTML(item.product_name || item.name)}</div>
              <div class="item-thermal-meta">
                ${(item.size && item.size !== '—') ? `<span>Size: ${sanitizeHTML(item.size)}</span> ` : ''}
                ${item.sku ? `<span>| SKU: ${sanitizeHTML(item.sku)}</span>` : ''}
              </div>
            </td>
            <td class="col-hide-thermal"><small>${sanitizeHTML(item.sku || '—')}</small></td>
            <td class="col-qty">${item.qty}</td>
            <td class="col-rate">${formatINR(item.unit_price || item.price)}</td>
            <td class="col-hide-thermal">${item.discount > 0 ? formatINR(item.discount) : '—'}</td>
            <td class="col-total"><strong>${formatINR(item.line_total || (item.qty * item.unit_price) - item.discount)}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="invoice-totals">
        <div class="total-row"><span>Subtotal</span><span>${formatINR(sale.subtotal)}</span></div>
        ${sale.total_discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatINR(sale.total_discount)}</span></div>` : ''}
        ${sale.gst_enabled ? `<div class="total-row"><span>GST (${sale.gst_rate}%)</span><span>${formatINR((sale.cgst + sale.sgst + sale.igst))}</span></div>` : ''}
        <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatINR(sale.grand_total)}</span></div>
        <div class="total-row" style="font-size:12px;color:var(--text-muted)"><span>Amount Paid</span><span>${formatINR(sale.amount_paid)}</span></div>
        ${sale.balance_due > 0 ? `<div class="total-row" style="color:var(--danger);font-weight:600"><span>Balance Due</span><span>${formatINR(sale.balance_due)}</span></div>` : ''}
      </div>
      <div class="invoice-footer-note"><p>${sanitizeHTML(settings.invoiceFooterText)}</p></div>
    </div>`;

  document.getElementById('btn-print-sale').onclick = () => {
    const container = document.querySelector('#view-sale-modal .invoice-container');
    printInvoiceContent(container ? container.outerHTML : body.innerHTML);
  };
}

async function printSaleInvoice(id) {
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.write('<div style="font-family:sans-serif;padding:50px;text-align:center;color:#64748b;font-size:16px"><div style="display:inline-block;width:32px;height:32px;border:3px solid #cbd5e1;border-top-color:#2563eb;border-radius:50%;animation:spin 1s linear infinite;margin-bottom:12px"></div><br>Preparing invoice for printing...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>');
  }

  try {
    const res = await apiGet(`api/sales/item.php?id=${id}`);
    if (res && res.success && res.data) {
      const sale = res.data;
      const settings = AppState.settings;
      const items = sale.items || [];
      const invoiceHtml = `
        <div class="invoice-container">
          <div class="invoice-header">
            <div class="invoice-company">
              <h2>${sanitizeHTML(settings.businessName)}</h2>
              <p>${sanitizeHTML(settings.businessAddress)}<br>GSTIN: ${sanitizeHTML(settings.gstin || '—')}<br>Phone: ${sanitizeHTML(settings.phone || '—')}</p>
            </div>
            <div class="invoice-meta">
              <h3>INVOICE</h3>
              <p class="invoice-no">${sanitizeHTML(sale.invoice_no)}</p>
              <p>Date: ${formatDate(sale.date)}</p>
            </div>
          </div>
          <div class="invoice-parties">
            <div class="invoice-party">
              <h5>Bill To</h5>
              <p>
                <strong>${sanitizeHTML(sale.customer_name || 'Walk-in Customer')}</strong><br>
                ${sale.customer_phone ? `<span>📞 ${sanitizeHTML(sale.customer_phone)}</span><br>` : ''}
                ${sale.customer_address ? `<span style="font-size:12px;color:var(--text-muted)"><i class="bi bi-geo-alt"></i> ${sanitizeHTML(sale.customer_address)}</span>` : ''}
              </p>
            </div>
            <div class="invoice-party">
              <h5>Payment Details</h5>
              <p>Method: ${sanitizeHTML(sale.payment_method)}<br>Status: ${paymentBadge(sale.payment_status)}</p>
            </div>
          </div>
          <table class="invoice-items-table">
            <thead><tr><th class="col-hide-thermal">#</th><th>Product</th><th class="col-hide-thermal">SKU</th><th class="col-qty">Qty</th><th class="col-rate">Unit Price</th><th class="col-hide-thermal">Discount</th><th class="col-total">Total</th></tr></thead>
            <tbody>
              ${items.map((item,i) => `<tr>
                <td class="col-hide-thermal">${i+1}</td>
                <td class="col-product">
                  <div style="font-weight:600">${sanitizeHTML(item.product_name || item.name)}</div>
                  <div class="item-thermal-meta">
                    ${(item.size && item.size !== '—') ? `<span>Size: ${sanitizeHTML(item.size)}</span> ` : ''}
                    ${item.sku ? `<span>| SKU: ${sanitizeHTML(item.sku)}</span>` : ''}
                  </div>
                </td>
                <td class="col-hide-thermal"><small>${sanitizeHTML(item.sku || '—')}</small></td>
                <td class="col-qty">${item.qty}</td>
                <td class="col-rate">${formatINR(item.unit_price || item.price)}</td>
                <td class="col-hide-thermal">${item.discount > 0 ? formatINR(item.discount) : '—'}</td>
                <td class="col-total"><strong>${formatINR(item.line_total || (item.qty * item.unit_price) - item.discount)}</strong></td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="invoice-totals">
            <div class="total-row"><span>Subtotal</span><span>${formatINR(sale.subtotal)}</span></div>
            ${sale.total_discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatINR(sale.total_discount)}</span></div>` : ''}
            ${sale.gst_enabled ? `<div class="total-row"><span>GST (${sale.gst_rate}%)</span><span>${formatINR((sale.cgst + sale.sgst + sale.igst))}</span></div>` : ''}
            <div class="total-row grand"><span>GRAND TOTAL</span><span>${formatINR(sale.grand_total)}</span></div>
            <div class="total-row" style="font-size:12px;color:var(--text-muted)"><span>Amount Paid</span><span>${formatINR(sale.amount_paid)}</span></div>
            ${sale.balance_due > 0 ? `<div class="total-row" style="color:var(--danger);font-weight:600"><span>Balance Due</span><span>${formatINR(sale.balance_due)}</span></div>` : ''}
          </div>
          <div class="invoice-footer-note"><p>${sanitizeHTML(settings.invoiceFooterText)}</p></div>
        </div>`;
      printInvoiceContent(invoiceHtml, `Invoice - ${sale.invoice_no}`, printWin);
    } else {
      if (printWin) printWin.close();
      showToast('Could not load invoice for printing', 'danger');
    }
  } catch (e) {
    if (printWin) printWin.close();
    console.error('Error printing sale invoice:', e);
    showToast('Failed to print invoice: ' + e.message, 'danger');
  }
}

function exportSHCSV() {
  const data = getFilteredSH();
  exportCSV('sales_history.csv',
    ['Invoice No.','Date','Customer','Phone','Products Sold','Subtotal','Discount','GST Enabled','GST Amount','Grand Total','Amount Paid','Balance','Payment Method','Status'],
    data.map(s => [
      s.invoiceNo,
      s.date,
      s.customer,
      s.customerPhone||'',
      s.productsSummary || (s.items||[]).map(it => `${it.product_name}${it.size ? ' ('+it.size+')':''} x${it.qty}`).join('; '),
      s.subtotal,
      s.discount,
      s.gstEnabled?'Yes':'No',
      s.gstAmount,
      s.grandTotal,
      s.amountPaid,
      s.balance,
      s.paymentMethod,
      s.paymentStatus
    ])
  );
}
