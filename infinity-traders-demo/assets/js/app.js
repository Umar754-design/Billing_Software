/**
 * INFINITY TRADERS — Core Application (app.js)
 * ================================================
 * Manages: Routing, shared state, utility functions,
 *          toast notifications, sidebar, topbar.
 * 
 * DATA NOTICE: All data in this session is temporary (in-memory).
 * Refreshing the page resets all data to sample values.
 */

'use strict';

// ─── SHARED APPLICATION STATE ──────────────────────────────────────────────────
const AppState = {
  products:  [...PRODUCTS_DATA],
  sales:     [...SALES_DATA],
  purchases: [...PURCHASES_DATA],
  suppliers: [...SUPPLIERS_DATA],
  customers: [...CUSTOMERS_DATA],
  categories: JSON.parse(JSON.stringify(CATEGORIES_DATA)),
  brands:    [...BRANDS_DATA],
  settings:  { ...DEFAULT_SETTINGS },
  nextInvoiceNum: 16,
  nextPurchaseNum: 11,
  currentPage: 'dashboard'
};

// ─── FORMAT UTILITIES ──────────────────────────────────────────────────────────
function formatINR(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0.00';
  const num = parseFloat(amount);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatINRCompact(amount) {
  const num = parseFloat(amount) || 0;
  if (num >= 1e7) return '₹' + (num / 1e7).toFixed(2) + 'Cr';
  if (num >= 1e5) return '₹' + (num / 1e5).toFixed(2) + 'L';
  if (num >= 1e3) return '₹' + (num / 1e3).toFixed(1) + 'K';
  return '₹' + num.toFixed(0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function sanitizeHTML(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

function getNextInvoiceNo() {
  const prefix = AppState.settings.invoicePrefix || 'IT-INV';
  const num = String(AppState.nextInvoiceNum).padStart(3, '0');
  return `${prefix}-${num}`;
}

// ─── TOAST NOTIFICATIONS ───────────────────────────────────────────────────────
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container-it';
    document.body.appendChild(container);
  }

  const icons = { success: 'bi-check-circle-fill', danger: 'bi-x-circle-fill', warning: 'bi-exclamation-triangle-fill', info: 'bi-info-circle-fill' };
  const toast = document.createElement('div');
  toast.className = `toast-it toast-${type}`;
  toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${sanitizeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-closing');
    setTimeout(() => toast.remove(), 350);
  }, duration);
}

// ─── CONFIRMATION DIALOG ───────────────────────────────────────────────────────
function showConfirm(title, message, onConfirm, confirmLabel = 'Confirm', confirmClass = 'btn-primary-it') {
  const existing = document.getElementById('confirm-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'confirm-overlay';
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = `
    <div class="confirm-box">
      <i class="bi bi-question-circle"></i>
      <h4>${sanitizeHTML(title)}</h4>
      <p>${sanitizeHTML(message)}</p>
      <div class="confirm-actions">
        <button class="btn-ghost" id="confirm-cancel-btn" style="padding:9px 22px;border:1.5px solid var(--border);border-radius:var(--radius)">Cancel</button>
        <button class="${confirmClass}" id="confirm-ok-btn">${sanitizeHTML(confirmLabel)}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);

  document.getElementById('confirm-ok-btn').addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });
  document.getElementById('confirm-cancel-btn').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:        'Dashboard',
  billing:          'New Billing / POS',
  'sales-history':  'Sales History',
  purchases:        'New Purchase',
  'purchase-history':'Purchase History',
  inventory:        'Products & Inventory',
  categories:       'Categories & Brands',
  suppliers:        'Suppliers',
  customers:        'Customers',
  reports:          'Reports',
  settings:         'Settings'
};

function navigateTo(page) {
  AppState.currentPage = page;

  // Update active nav link
  document.querySelectorAll('.nav-link-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Update topbar title
  const titleEl = document.getElementById('topbar-title');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] || page;

  // Render appropriate page
  const container = document.getElementById('page-container');
  if (!container) return;

  // Clean up any charts from previous page to prevent memory leaks or duplicate canvas instances
  if (typeof destroyDashboardCharts === 'function') {
    destroyDashboardCharts();
  }

  container.innerHTML = '';

  switch (page) {
    case 'dashboard':       renderDashboard(container); break;
    case 'billing':         renderBilling(container); break;
    case 'sales-history':   renderSalesHistory(container); break;
    case 'purchases':       renderPurchases(container); break;
    case 'purchase-history':renderPurchaseHistory(container); break;
    case 'inventory':       renderInventory(container); break;
    case 'categories':      renderCategories(container); break;
    case 'suppliers':       renderSuppliers(container); break;
    case 'customers':       renderCustomers(container); break;
    case 'reports':         renderReports(container); break;
    case 'settings':        renderSettings(container); break;
    default:
      container.innerHTML = `<div class="empty-state"><i class="bi bi-puzzle"></i><h4>Page Not Found</h4><p>This section is not yet available.</p></div>`;
  }

  // Mobile: close sidebar
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }
}

// ─── SIDEBAR TOGGLE ────────────────────────────────────────────────────────────
function initSidebarToggle() {
  const sidebar      = document.getElementById('sidebar');
  const mainContent  = document.getElementById('main-content');
  const toggleBtn    = document.getElementById('sidebar-toggle-btn');
  const overlay      = document.getElementById('sidebar-overlay');

  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active');
    } else {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('sidebar-collapsed');
    }
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }
}

// ─── TOPBAR CLOCK ─────────────────────────────────────────────────────────────
function initClock() {
  const dateEl = document.getElementById('topbar-date');
  function tick() {
    if (!dateEl) return;
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) +
      ' · ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  tick();
  setInterval(tick, 60000);
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────
function initGlobalSearch() {
  const input = document.getElementById('global-search');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      // Navigate to inventory and search there
      navigateTo('inventory');
      setTimeout(() => {
        const inv = document.getElementById('inv-search');
        if (inv) { inv.value = q; inv.dispatchEvent(new Event('input')); }
        input.value = '';
      }, 100);
    }
  });
}

// ─── CSV EXPORT ───────────────────────────────────────────────────────────────
function exportCSV(filename, headers, rows) {
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click(); URL.revokeObjectURL(url);
  showToast(`CSV exported: ${filename}`, 'success');
}

// ─── UNIVERSAL PRINT UTILITY ──────────────────────────────────────────────────
function printInvoiceContent(htmlOrElement) {
  let mount = document.getElementById('print-mount');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'print-mount';
    mount.className = 'print-mount';
    document.body.appendChild(mount);
  }

  if (typeof htmlOrElement === 'string') {
    mount.innerHTML = htmlOrElement;
  } else if (htmlOrElement && htmlOrElement.innerHTML) {
    mount.innerHTML = htmlOrElement.innerHTML;
  }

  // Strip UI elements not meant for bill printing
  mount.querySelectorAll('.placeholder-banner, .demo-banner, .btn-close, .modal-header, .modal-footer, button').forEach(el => el.remove());

  // Trigger browser print dialog
  setTimeout(() => {
    window.print();
  }, 120);
}

// Intercept Ctrl+P or browser menu print to guarantee mount is populated
window.addEventListener('beforeprint', () => {
  const mount = document.getElementById('print-mount');
  if (mount && !mount.innerHTML.trim()) {
    const activeInvoice = document.getElementById('printable-invoice') ||
      document.querySelector('#view-sale-modal .invoice-container') ||
      document.querySelector('#view-purchase-modal .invoice-container');
    if (activeInvoice) {
      mount.innerHTML = activeInvoice.outerHTML;
      mount.querySelectorAll('.placeholder-banner, .demo-banner, button').forEach(el => el.remove());
    }
  }
});

window.addEventListener('afterprint', () => {
  const mount = document.getElementById('print-mount');
  if (mount) {
    mount.innerHTML = '';
  }
});

// ─── STOCK UTILITIES ──────────────────────────────────────────────────────────
function getStockStatus(product) {
  if (product.stock <= 0) return 'out';
  if (product.stock <= product.lowStockThreshold) return 'low';
  return 'ok';
}

function getStockBadge(product) {
  const s = getStockStatus(product);
  if (s === 'out') return '<span class="badge-status badge-out">Out of Stock</span>';
  if (s === 'low') return '<span class="badge-status badge-low">Low Stock</span>';
  return '<span class="badge-status badge-active">In Stock</span>';
}

function updateStockAfterSale(items) {
  items.forEach(item => {
    const prod = AppState.products.find(p => p.sku === item.sku);
    if (prod) prod.stock = Math.max(0, prod.stock - item.qty);
  });
}

function updateStockAfterPurchase(items) {
  items.forEach(item => {
    const prod = AppState.products.find(p => p.sku === item.sku);
    if (prod) prod.stock += item.qty;
  });
}

// ─── FULL KEYBOARD ARROW-KEY NAVIGATION SYSTEM ────────────────────────────────
function isTypingInput(el) {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'textarea') return true;
  if (tag === 'input') {
    const type = (el.type || 'text').toLowerCase();
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range'].includes(type);
  }
  return false;
}

function initKeyboardNavigation() {
  document.addEventListener('keydown', e => {
    const active = document.activeElement;
    const isModalOpen = document.querySelector('.modal.show, #confirm-overlay');

    // 1. ESCAPE: Close modals, overlays, mobile drawer, or blur inputs
    if (e.key === 'Escape') {
      const confirmOverlay = document.getElementById('confirm-overlay');
      if (confirmOverlay) {
        e.preventDefault();
        confirmOverlay.remove();
        return;
      }
      const openModal = document.querySelector('.modal.show');
      if (openModal) {
        e.preventDefault();
        const bsModal = bootstrap.Modal.getInstance(openModal);
        if (bsModal) {
          bsModal.hide();
        } else {
          openModal.querySelector('[data-bs-dismiss="modal"], .btn-close')?.click();
        }
        return;
      }
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        e.preventDefault();
        sidebar.classList.remove('mobile-open');
        document.getElementById('sidebar-overlay')?.classList.remove('active');
        return;
      }
      if (isTypingInput(active)) {
        active.blur();
        return;
      }
    }

    // 2. MODAL NAVIGATION
    if (isModalOpen) {
      const modal = isModalOpen;
      const focusables = Array.from(modal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )).filter(el => el.offsetParent !== null);

      if (!focusables.length) return;

      // Don't intercept arrow keys if user is typing inside text field
      if (isTypingInput(active)) return;
      if (active && active.tagName && active.tagName.toLowerCase() === 'select') return;

      const idx = focusables.indexOf(active);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const next = focusables[(idx + 1) % focusables.length];
        next.focus();
        return;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = focusables[(idx - 1 + focusables.length) % focusables.length];
        prev.focus();
        return;
      }
      return; // Keep modal focus contained
    }

    // 3. SEARCH INPUT DOWN-ARROW SHORTCUT
    if (active && active.id === 'bill-product-search' && e.key === 'ArrowDown') {
      const firstCard = document.querySelector('#billing-products-grid .product-card-pos:not(.out-of-stock)');
      if (firstCard) {
        e.preventDefault();
        firstCard.focus();
        return;
      }
    }

    // 4. PRESERVE TYPING IN INPUTS / TEXTAREAS
    if (isTypingInput(active)) {
      return; // Never hijack arrow keys when typing!
    }

    // 5. PRESERVE SELECT DROPDOWNS
    if (active && active.tagName && active.tagName.toLowerCase() === 'select') {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') return; // Allow native select option cycling
    }

    // 6. SIDEBAR NAVIGATION
    const navItem = active ? active.closest('.nav-link-item') : null;
    if (navItem) {
      const navLinks = Array.from(document.querySelectorAll('.sidebar-nav .nav-link-item'));
      const idx = navLinks.indexOf(navItem);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = navLinks[(idx + 1) % navLinks.length];
        next.focus();
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = navLinks[(idx - 1 + navLinks.length) % navLinks.length];
        prev.focus();
        return;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // Move focus into the page main content
        const pageTarget = document.querySelector('#bill-product-search') ||
          document.querySelector('#inv-search') ||
          document.querySelector('#main-content input:not([disabled])') ||
          document.querySelector('#main-content button:not([disabled])');
        if (pageTarget) pageTarget.focus();
        return;
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navItem.click();
        return;
      }
    }

    // 7. POS PRODUCT GRID NAVIGATION
    const productCard = active ? active.closest('.product-card-pos') : null;
    if (productCard) {
      const grid = document.getElementById('billing-products-grid');
      const cards = grid ? Array.from(grid.querySelectorAll('.product-card-pos:not(.out-of-stock)')) : [];
      const idx = cards.indexOf(productCard);

      if (idx !== -1 && cards.length) {
        // Calculate grid columns dynamically
        let cols = 1;
        const firstTop = cards[0].offsetTop;
        for (let i = 1; i < cards.length; i++) {
          if (cards[i].offsetTop > firstTop) { cols = i; break; }
        }
        if (cols === 1 && cards.length > 1 && cards[1].offsetTop === firstTop) {
          cols = cards.length;
        }

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (idx + 1 < cards.length) {
            cards[idx + 1].focus();
          } else {
            // Jump to cart controls
            const cartAction = document.querySelector('.cart-actions button') || document.getElementById('bill-customer-name');
            if (cartAction) cartAction.focus();
          }
          return;
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (idx % cols !== 0 && idx > 0) {
            cards[idx - 1].focus();
          } else {
            // Leftmost column: move back to active sidebar nav link
            const activeNav = document.querySelector('.nav-link-item.active') || document.querySelector('.nav-link-item');
            if (activeNav) activeNav.focus();
          }
          return;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (idx + cols < cards.length) {
            cards[idx + cols].focus();
          } else {
            cards[cards.length - 1].focus();
          }
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (idx - cols >= 0) {
            cards[idx - cols].focus();
          } else {
            // Top row: move up to product search bar
            const searchInput = document.getElementById('bill-product-search');
            if (searchInput) searchInput.focus();
          }
          return;
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          productCard.click();
          return;
        }
      }
    }

    // 8. CART ACTIONS BAR NAVIGATION
    const cartActionBtn = active ? active.closest('.cart-actions button') : null;
    if (cartActionBtn) {
      const btns = Array.from(document.querySelectorAll('.cart-actions button:not([disabled])'));
      const idx = btns.indexOf(cartActionBtn);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        btns[(idx + 1) % btns.length].focus();
        return;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        btns[(idx - 1 + btns.length) % btns.length].focus();
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const amtInput = document.getElementById('bill-amount-paid') || document.getElementById('bill-payment-method');
        if (amtInput) amtInput.focus();
        return;
      } else if (e.key === 'Enter') {
        // Allow button click natively
        return;
      }
    }

    // 9. TABS & FILTER GROUPS (e.g. chart filter buttons, report tabs)
    const filterBtn = active ? active.closest('.chart-filter-btn') : null;
    if (filterBtn) {
      const group = filterBtn.parentElement;
      const btns = Array.from(group.querySelectorAll('.chart-filter-btn'));
      const idx = btns.indexOf(filterBtn);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = btns[(idx + 1) % btns.length];
        next.focus();
        next.click();
        return;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = btns[(idx - 1 + btns.length) % btns.length];
        prev.focus();
        prev.click();
        return;
      }
    }

    // 10. GENERAL FALLBACK
    if (!active || active === document.body) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        const first = document.querySelector('.nav-link-item.active') || document.querySelector('.nav-link-item');
        if (first) first.focus();
      }
    }
  });
}

// ─── INIT APPLICATION ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSidebarToggle();
  initClock();
  initGlobalSearch();
  initKeyboardNavigation();

  // Attach nav link handlers
  document.querySelectorAll('.nav-link-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // User dropdown
  const userMenuBtn = document.getElementById('user-menu-btn');
  if (userMenuBtn) {
    userMenuBtn.addEventListener('click', () => {
      showToast('User management will be available in the production version.', 'info');
    });
  }

  // Notifications
  document.getElementById('notif-btn')?.addEventListener('click', () => {
    showToast('No new notifications.', 'info');
  });

  // Default page
  navigateTo('dashboard');
});
