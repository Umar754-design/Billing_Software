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
  products:  [],
  sales:     [],
  returns:   [],
  purchases: [],
  suppliers: [],
  customers: [],
  categories: [],
  brands:    [],
  settings:  { ...DEFAULT_SETTINGS },
  nextInvoiceNum: 1,
  nextPurchaseNum: 1,
  currentPage: 'dashboard'
};

// ─── API CLIENT HELPERS ────────────────────────────────────────────────────────
async function safeParseResponse(res, endpoint) {
  if (res.status === 401) {
    window.location.href = 'login.html';
    return null;
  }
  const text = await res.text();
  if (!text || !text.trim()) {
    return {
      success: false,
      error: `Server returned empty response (${res.status}). Please check database and server error logs.`
    };
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('API Non-JSON Response:', endpoint, text);
    const cleanMsg = text.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
    return {
      success: false,
      error: cleanMsg.length > 0 ? cleanMsg.substring(0, 180) : `Invalid server response (${res.status})`
    };
  }
}

async function apiGet(endpoint) {
  try {
    const res = await fetch(endpoint);
    return await safeParseResponse(res, endpoint);
  } catch (err) {
    console.error('API GET Error:', endpoint, err);
    return { success: false, error: err.message };
  }
}

async function apiPost(endpoint, data) {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await safeParseResponse(res, endpoint);
  } catch (err) {
    console.error('API POST Error:', endpoint, err);
    return { success: false, error: err.message };
  }
}

async function apiPut(endpoint, data) {
  try {
    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await safeParseResponse(res, endpoint);
  } catch (err) {
    console.error('API PUT Error:', endpoint, err);
    return { success: false, error: err.message };
  }
}

async function apiDelete(endpoint) {
  try {
    const res = await fetch(endpoint, { method: 'DELETE' });
    return await safeParseResponse(res, endpoint);
  } catch (err) {
    console.error('API DELETE Error:', endpoint, err);
    return { success: false, error: err.message };
  }
}

async function loadGlobalAppData() {
  try {
    const [catRes, brandRes, setRes] = await Promise.all([
      apiGet('api/categories/index.php'),
      apiGet('api/brands/index.php'),
      apiGet('api/settings/index.php')
    ]);

    if (catRes && catRes.success && catRes.data) {
      AppState.categories = catRes.data;
    }
    if (brandRes && brandRes.success && brandRes.data) {
      AppState.brands = brandRes.data;
    }
    if (setRes && setRes.success && setRes.data) {
      const s = setRes.data;
      AppState.settings = {
        businessName: s.business_name || DEFAULT_SETTINGS.businessName,
        businessAddress: s.business_address || '',
        phone: s.phone || '',
        email: s.email || '',
        gstin: s.gstin || '',
        defaultGstMode: s.default_gst_mode == 1,
        invoicePrefix: s.invoice_prefix || 'IT-INV',
        currency: s.currency || 'INR',
        lowStockThreshold: parseInt(s.low_stock_threshold, 10) || 3,
        invoiceFooterText: s.invoice_footer_text || DEFAULT_SETTINGS.invoiceFooterText,
        nextInvoiceNum: parseInt(s.next_invoice_num, 10) || 1,
        nextPurchaseNum: parseInt(s.next_purchase_num, 10) || 1
      };
      AppState.nextInvoiceNum = AppState.settings.nextInvoiceNum;
      AppState.nextPurchaseNum = AppState.settings.nextPurchaseNum;
    }
  } catch (e) {
    console.warn('Error loading global data:', e);
  }
}

function renderLoadingSpinner(target, message = 'Loading data...') {
  let msg = message;
  let container = null;
  if (target && target.nodeType === 1) {
    container = target;
  } else if (typeof target === 'string') {
    msg = target;
  }
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:300px;gap:14px">
      <div class="spinner-border text-primary" role="status" style="width:2.5rem;height:2.5rem">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div style="color:var(--text-muted);font-size:13px;font-weight:500">${sanitizeHTML(msg || 'Loading data...')}</div>
    </div>
  `;
  if (container) {
    container.innerHTML = html;
  }
  return html;
}

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
  'sales-returns':  'Sales Returns & Refunds',
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
  if (page === 'new-purchase') page = 'purchases';
  AppState.currentPage = page;

  // Persist current page to localStorage & URL hash so browser refresh stays on current page
  try {
    localStorage.setItem('it_current_page', page);
    if (window.location.hash.replace(/^#/, '') !== page) {
      history.replaceState(null, '', '#' + page);
    }
  } catch (err) {}

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

  // Auto-save purchase draft if leaving new-purchase page
  if (typeof savePurchaseDraft === 'function' && document.getElementById('pur-supplier-name')) {
    savePurchaseDraft();
  }

  container.innerHTML = '';

  switch (page) {
    case 'dashboard':       renderDashboard(container); break;
    case 'billing':         renderBilling(container); break;
    case 'sales-history':   renderSalesHistory(container); break;
    case 'sales-returns':   renderSalesReturns(container); break;
    case 'purchases':
    case 'new-purchase':    renderPurchases(container); break;
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
// ─── POS THERMAL BARCODE SVG GENERATOR (CODE 39) ────────────────────────────
function generateBarcodeSVG(code) {
  if (!code) return '';
  const clean = String(code).trim().toUpperCase().replace(/[^0-9A-Z\-\.\ \$\/\+\%]/g, '');
  if (!clean) return '';
  const c39 = {
    '0':'101001101101','1':'110100101011','2':'101100101011','3':'110110010101',
    '4':'101001101011','5':'110100110101','6':'101100110101','7':'101001011011',
    '8':'110100101101','9':'101100101101','A':'110101001011','B':'101101001011',
    'C':'110110100101','D':'101011001011','E':'110101100101','F':'101101100101',
    'G':'101010011011','H':'110101001101','I':'101101001101','J':'101011001101',
    'K':'110101010011','L':'101101010011','M':'110110101001','N':'101011010011',
    'O':'110101101001','P':'101101101001','Q':'101010110011','R':'110101011001',
    'S':'101101011001','T':'101011011001','U':'110010101011','V':'100110101011',
    'W':'110011010101','X':'100101101011','Y':'110010110101','Z':'100110110101',
    '-':'100101011011','.':'110010101101',' ':'100110101101','$':'100100100101',
    '/':'100100101001','+':'100101001001','%':'101001001001','*':'100101101101'
  };
  const str = '*' + clean + '*';
  let bits = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    bits += (c39[ch] || c39['*']) + '0';
  }
  const barW = 1.6;
  const barH = 34;
  const totalW = bits.length * barW;
  let rects = '';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      rects += `<rect x="${(i * barW).toFixed(1)}" y="0" width="${barW}" height="${barH}" fill="#000000"/>`;
    }
  }
  return `<svg class="barcode-svg" viewBox="0 0 ${totalW.toFixed(0)} ${barH}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">${rects}</svg><div class="barcode-text">${clean}</div>`;
}

// ─── UNIVERSAL PRINT UTILITY (OPENS IN NEW TAB - OPTIMIZED FOR POS SRS810-15) ─
function printInvoiceContent(htmlOrElement, docTitle, targetWindow) {
  let contentHtml = '';
  if (typeof htmlOrElement === 'string') {
    contentHtml = htmlOrElement;
  } else if (htmlOrElement && htmlOrElement.innerHTML) {
    contentHtml = htmlOrElement.outerHTML || htmlOrElement.innerHTML;
  }

  // Strip UI elements not meant for bill printing
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = contentHtml;
  tempDiv.querySelectorAll('.placeholder-banner, .demo-banner, .btn-close, .modal-header, .modal-footer, button').forEach(el => el.remove());

  // Detect invoice number or title
  let invoiceNo = '';
  const invNoEl = tempDiv.querySelector('.invoice-no') || tempDiv.querySelector('p.invoice-no');
  if (invNoEl) {
    invoiceNo = invNoEl.textContent.trim();
  }
  const titleText = docTitle || invoiceNo || 'Infinity Traders - Invoice';

  // Inject authentic POS Barcode and Terminal footer tag if not already present
  if (!tempDiv.querySelector('.thermal-barcode-box') && invoiceNo) {
    const barcodeBox = document.createElement('div');
    barcodeBox.className = 'thermal-barcode-box';
    barcodeBox.innerHTML = `
      ${generateBarcodeSVG(invoiceNo)}
      <div class="thermal-terminal-tag">Terminal: Shreyans POS SRS810-15</div>
    `;
    const cutSpace = document.createElement('div');
    cutSpace.className = 'thermal-cut-space';

    const footerNote = tempDiv.querySelector('.invoice-footer-note');
    if (footerNote) {
      footerNote.insertAdjacentElement('afterend', barcodeBox);
      barcodeBox.insertAdjacentElement('afterend', cutSpace);
    } else {
      tempDiv.appendChild(barcodeBox);
      tempDiv.appendChild(cutSpace);
    }
  }

  // Ensure inner content has .invoice-container
  let finalBodyHtml = tempDiv.innerHTML.trim();
  if (!tempDiv.querySelector('.invoice-container') && !tempDiv.classList.contains('invoice-container')) {
    finalBodyHtml = `<div class="invoice-container">${finalBodyHtml}</div>`;
  }

  // Determine user's saved paper size preference (default: 80mm for POS SRS810-15)
  let initialPaperSize = '80mm';
  try {
    const saved = localStorage.getItem('pos_paper_size');
    if (saved === '80mm' || saved === '58mm' || saved === 'a4') {
      initialPaperSize = saved;
    }
  } catch (e) {}

  // Open in New Tab
  let printWindow = targetWindow;
  if (!printWindow || printWindow.closed) {
    printWindow = window.open('', '_blank');
  }

  if (!printWindow) {
    // Fallback if browser blocks popups
    let mount = document.getElementById('print-mount');
    if (!mount) {
      mount = document.createElement('div');
      mount.id = 'print-mount';
      mount.className = 'print-mount';
      document.body.appendChild(mount);
    }
    mount.innerHTML = finalBodyHtml;
    setTimeout(() => {
      window.print();
    }, 120);
    showToast('Popup blocked by browser. Printed in current tab.', 'warning');
    return;
  }

  const baseHref = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');

  const pageHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <base href="${baseHref}">
  <title>${sanitizeHTML(titleText)}</title>
  <link rel="stylesheet" href="assets/css/style.css">
  <link rel="stylesheet" href="assets/css/print.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
  <style id="dynamic-page-size">
    @page {
      margin: 0;
      size: 80mm auto;
    }
  </style>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #0f172a;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    /* Sticky Toolbar */
    .print-top-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #1e293b;
      color: #ffffff;
      padding: 10px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      z-index: 9999;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      border-bottom: 1px solid rgba(255,255,255,0.12);
      flex-wrap: wrap;
    }
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .toolbar-badge {
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .toolbar-title {
      font-weight: 700;
      font-size: 14.5px;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }

    /* Paper Switcher in Toolbar */
    .toolbar-center {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .paper-switcher {
      display: inline-flex;
      background: rgba(15, 23, 42, 0.7);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-paper {
      background: transparent;
      border: none;
      color: #94a3b8;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn-paper:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.08);
    }
    .btn-paper.active {
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
    }

    .toolbar-right {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .btn-print-now {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 2px 10px rgba(16, 185, 129, 0.4);
    }
    .btn-print-now:hover {
      background: #059669;
      transform: translateY(-1px);
    }
    .btn-close-tab {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.1);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-close-tab:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #ffffff;
    }

    /* Print Preview Wrapper */
    .invoice-preview-wrapper {
      transition: all 0.2s ease;
      padding: 24px 16px 60px;
    }

    /* ══════════════════════════════════════════════════════════════
       80mm THERMAL RECEIPT (SHREYANS POS SRS810-15 DEFAULT)
       ══════════════════════════════════════════════════════════════ */
    body.paper-80mm .invoice-preview-wrapper {
      max-width: 80mm;
      margin: 0 auto;
    }
    body.paper-80mm .invoice-container {
      width: 80mm !important;
      max-width: 80mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      padding: 4mm 3mm 10mm 3mm !important;
      margin: 0 auto !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 4px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace !important;
      font-size: 11px !important;
      line-height: 1.35 !important;
      box-sizing: border-box !important;
    }
    body.paper-80mm .invoice-header {
      display: block !important;
      text-align: center !important;
      margin-bottom: 6px !important;
      border-bottom: none !important;
      padding-bottom: 0 !important;
    }
    body.paper-80mm .invoice-company {
      text-align: center !important;
    }
    body.paper-80mm .invoice-company h2 {
      font-size: 16px !important;
      font-weight: 800 !important;
      text-transform: uppercase !important;
      color: #000000 !important;
      margin: 0 0 3px 0 !important;
      letter-spacing: 0.5px !important;
    }
    body.paper-80mm .invoice-company p {
      font-size: 10.5px !important;
      color: #111111 !important;
      line-height: 1.35 !important;
      margin: 0 !important;
    }
    body.paper-80mm .invoice-meta {
      text-align: center !important;
      margin-top: 6px !important;
      padding-top: 5px !important;
      border-top: 1px dashed #000000 !important;
    }
    body.paper-80mm .invoice-meta h3 {
      font-size: 12.5px !important;
      font-weight: 800 !important;
      color: #000000 !important;
      margin: 0 0 4px 0 !important;
      letter-spacing: 1px !important;
    }
    body.paper-80mm .invoice-meta p {
      font-size: 11px !important;
      color: #000000 !important;
      margin: 2px 0 !important;
    }
    body.paper-80mm .invoice-meta .invoice-no {
      color: #000000 !important;
      font-weight: 700 !important;
    }
    body.paper-80mm .invoice-divider {
      display: block !important;
      border: none !important;
      border-top: 1px dashed #000000 !important;
      margin: 6px 0 !important;
    }
    body.paper-80mm .invoice-parties {
      display: block !important;
      margin: 6px 0 !important;
      padding: 4px 0 !important;
      background: transparent !important;
      border: none !important;
      border-top: 1px dashed #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      border-radius: 0 !important;
    }
    body.paper-80mm .invoice-parties .invoice-party:last-child {
      display: none !important;
    }
    body.paper-80mm .invoice-party {
      font-size: 11px !important;
      color: #000000 !important;
      line-height: 1.35 !important;
    }
    body.paper-80mm .invoice-party h5 {
      font-size: 10px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      margin: 0 0 2px 0 !important;
      color: #000000 !important;
    }
    body.paper-80mm .invoice-party p {
      font-size: 11px !important;
      color: #000000 !important;
      margin: 0 !important;
    }
    body.paper-80mm .invoice-customer-addr {
      font-size: 10.5px !important;
      color: #222222 !important;
      display: block !important;
      margin-top: 2px !important;
    }

    /* Table in 80mm roll */
    body.paper-80mm .invoice-items-table {
      width: 100% !important;
      border-collapse: collapse !important;
      margin: 6px 0 !important;
    }
    body.paper-80mm .invoice-items-table th {
      background: transparent !important;
      color: #000000 !important;
      font-weight: 700 !important;
      font-size: 10.5px !important;
      padding: 4px 2px !important;
      border: none !important;
      border-top: 1px dashed #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      text-align: left !important;
      text-transform: uppercase !important;
    }
    body.paper-80mm .col-hide-thermal {
      display: none !important;
    }
    body.paper-80mm .col-qty {
      text-align: center !important;
      width: 15% !important;
    }
    body.paper-80mm .col-rate {
      text-align: right !important;
      width: 22% !important;
    }
    body.paper-80mm .col-total,
    body.paper-80mm .invoice-items-table th:last-child,
    body.paper-80mm .invoice-items-table td:last-child {
      text-align: right !important;
      width: 24% !important;
    }
    body.paper-80mm .invoice-items-table td {
      padding: 4px 2px !important;
      border: none !important;
      border-bottom: 1px dotted #cccccc !important;
      font-size: 11px !important;
      color: #000000 !important;
      vertical-align: top !important;
    }
    body.paper-80mm .invoice-items-table tr:nth-child(even) td {
      background: transparent !important;
    }
    body.paper-80mm .item-thermal-meta {
      display: block !important;
      font-size: 9.5px !important;
      color: #333333 !important;
      font-weight: 500 !important;
      margin-top: 1px !important;
    }
    body.paper-80mm .invoice-totals {
      display: flex !important;
      flex-direction: column !important;
      align-items: stretch !important;
      margin-top: 6px !important;
      padding-top: 6px !important;
      border-top: 1px dashed #000000 !important;
    }
    body.paper-80mm .invoice-totals .total-row {
      display: flex !important;
      justify-content: space-between !important;
      width: 100% !important;
      padding: 2px 0 !important;
      font-size: 11.5px !important;
      color: #000000 !important;
    }
    body.paper-80mm .invoice-totals .total-row.grand {
      border-top: 1px dashed #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      padding: 5px 0 !important;
      margin: 4px 0 !important;
      font-weight: 800 !important;
      font-size: 14.5px !important;
      color: #000000 !important;
    }
    body.paper-80mm .thermal-barcode-box {
      display: block !important;
      text-align: center !important;
      margin: 8px 0 4px 0 !important;
      padding-top: 6px !important;
      border-top: 1px dashed #000000 !important;
    }
    body.paper-80mm .barcode-svg {
      max-width: 65mm !important;
      height: 32px !important;
      display: inline-block !important;
    }
    body.paper-80mm .barcode-text {
      font-family: monospace !important;
      font-size: 10px !important;
      letter-spacing: 2px !important;
      margin-top: 2px !important;
      font-weight: 700 !important;
    }
    body.paper-80mm .thermal-terminal-tag {
      font-size: 9px !important;
      color: #444444 !important;
      margin-top: 4px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.5px !important;
    }
    body.paper-80mm .invoice-footer-note {
      text-align: center !important;
      margin-top: 8px !important;
      padding-top: 6px !important;
      border-top: 1px dashed #000000 !important;
      font-size: 10px !important;
      color: #000000 !important;
      line-height: 1.35 !important;
    }
    body.paper-80mm .thermal-cut-space {
      height: 8mm !important;
      display: block !important;
    }

    /* ══════════════════════════════════════════════════════════════
       58mm THERMAL RECEIPT (2-INCH ROLL)
       ══════════════════════════════════════════════════════════════ */
    body.paper-58mm .invoice-preview-wrapper {
      max-width: 58mm;
      margin: 0 auto;
    }
    body.paper-58mm .invoice-container {
      width: 58mm !important;
      max-width: 58mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      padding: 3mm 2mm 8mm 2mm !important;
      margin: 0 auto !important;
      border: 1px solid #cbd5e1 !important;
      border-radius: 4px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35) !important;
      font-size: 10px !important;
      line-height: 1.3 !important;
    }
    body.paper-58mm .invoice-header { display: block !important; text-align: center !important; margin-bottom: 4px !important; }
    body.paper-58mm .invoice-company h2 { font-size: 14px !important; font-weight: 800 !important; margin: 0 0 2px 0 !important; }
    body.paper-58mm .invoice-company p { font-size: 9.5px !important; line-height: 1.3 !important; margin: 0 !important; }
    body.paper-58mm .invoice-meta { text-align: center !important; margin-top: 4px !important; padding-top: 4px !important; border-top: 1px dashed #000 !important; }
    body.paper-58mm .invoice-meta h3 { font-size: 11px !important; margin: 0 0 2px 0 !important; }
    body.paper-58mm .invoice-parties { display: block !important; margin: 4px 0 !important; padding: 4px 0 !important; border-top: 1px dashed #000 !important; border-bottom: 1px dashed #000 !important; }
    body.paper-58mm .invoice-parties .invoice-party:last-child { display: none !important; }
    body.paper-58mm .col-hide-thermal { display: none !important; }
    body.paper-58mm .invoice-items-table { width: 100% !important; border-collapse: collapse !important; margin: 4px 0 !important; }
    body.paper-58mm .invoice-items-table th { font-size: 9.5px !important; padding: 3px 1px !important; border-top: 1px dashed #000 !important; border-bottom: 1px dashed #000 !important; }
    body.paper-58mm .invoice-items-table td { font-size: 9.5px !important; padding: 3px 1px !important; border-bottom: 1px dotted #ccc !important; }
    body.paper-58mm .item-thermal-meta { display: block !important; font-size: 8.5px !important; color: #333 !important; }
    body.paper-58mm .invoice-totals { display: flex !important; flex-direction: column !important; align-items: stretch !important; margin-top: 4px !important; border-top: 1px dashed #000 !important; }
    body.paper-58mm .invoice-totals .total-row { display: flex !important; justify-content: space-between !important; width: 100% !important; font-size: 10px !important; padding: 1.5px 0 !important; }
    body.paper-58mm .invoice-totals .total-row.grand { font-size: 12.5px !important; font-weight: 800 !important; border-top: 1px dashed #000 !important; border-bottom: 1px dashed #000 !important; padding: 4px 0 !important; }
    body.paper-58mm .thermal-barcode-box { display: block !important; text-align: center !important; margin: 6px 0 3px 0 !important; padding-top: 4px !important; border-top: 1px dashed #000 !important; }
    body.paper-58mm .barcode-svg { max-width: 48mm !important; height: 26px !important; }
    body.paper-58mm .barcode-text { font-size: 9px !important; letter-spacing: 1px !important; }
    body.paper-58mm .thermal-terminal-tag { font-size: 8px !important; margin-top: 2px !important; }
    body.paper-58mm .invoice-footer-note { font-size: 9px !important; margin-top: 6px !important; padding-top: 4px !important; border-top: 1px dashed #000 !important; }
    body.paper-58mm .thermal-cut-space { height: 6mm !important; display: block !important; }

    /* ══════════════════════════════════════════════════════════════
       A4 FULL PAGE (STANDARD LASER/DESKJET)
       ══════════════════════════════════════════════════════════════ */
    body.paper-a4 .invoice-preview-wrapper {
      max-width: 860px;
      margin: 0 auto;
    }
    body.paper-a4 .invoice-container {
      background: #ffffff !important;
      border: 1px solid #e2e8f0 !important;
      border-radius: 12px !important;
      padding: 36px 42px !important;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25) !important;
    }
    body.paper-a4 .item-thermal-meta {
      display: none !important;
    }
    body.paper-a4 .thermal-terminal-tag {
      display: none !important;
    }
    body.paper-a4 .thermal-cut-space {
      display: none !important;
    }

    /* Print media overrides */
    @media print {
      .print-top-toolbar {
        display: none !important;
      }
      body {
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .invoice-preview-wrapper {
        margin: 0 auto !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
      .invoice-container {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
      body.paper-80mm .invoice-container {
        width: 76mm !important;
        max-width: 80mm !important;
        padding: 2mm 2mm 8mm 2mm !important;
        margin: 0 auto !important;
      }
      body.paper-58mm .invoice-container {
        width: 54mm !important;
        max-width: 58mm !important;
        padding: 2mm 1mm 6mm 1mm !important;
        margin: 0 auto !important;
      }
      body.paper-a4 .invoice-container {
        padding: 0 !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body class="paper-${initialPaperSize}">
  <div class="print-top-toolbar">
    <div class="toolbar-left">
      <span class="toolbar-badge"><i class="bi bi-display"></i> POS SRS810-15</span>
      <span class="toolbar-title"><i class="bi bi-receipt"></i> ${sanitizeHTML(titleText)}</span>
    </div>
    <div class="toolbar-center">
      <div class="paper-switcher">
        <button type="button" class="btn-paper ${initialPaperSize==='80mm'?'active':''}" data-size="80mm" onclick="setPaperFormat('80mm')">
          <i class="bi bi-receipt"></i> 80mm Thermal (POS SRS810)
        </button>
        <button type="button" class="btn-paper ${initialPaperSize==='58mm'?'active':''}" data-size="58mm" onclick="setPaperFormat('58mm')">
          <i class="bi bi-tag"></i> 58mm Thermal
        </button>
        <button type="button" class="btn-paper ${initialPaperSize==='a4'?'active':''}" data-size="a4" onclick="setPaperFormat('a4')">
          <i class="bi bi-file-earmark-text"></i> A4 Full Page
        </button>
      </div>
    </div>
    <div class="toolbar-right">
      <button class="btn-print-now" onclick="triggerPrint()">
        <i class="bi bi-printer-fill"></i> Print (Enter)
      </button>
      <button class="btn-close-tab" onclick="window.close()">
        <i class="bi bi-x-lg"></i> Close (Esc)
      </button>
    </div>
  </div>

  <div class="invoice-preview-wrapper">
    ${finalBodyHtml}
  </div>

  <script>
    function setPaperFormat(size, shouldSave) {
      if (shouldSave !== false) {
        try { localStorage.setItem('pos_paper_size', size); } catch(e) {}
      }
      document.querySelectorAll('.btn-paper').forEach(function(b) {
        b.classList.toggle('active', b.getAttribute('data-size') === size);
      });
      document.body.className = 'paper-' + size;
      var styleTag = document.getElementById('dynamic-page-size');
      if (styleTag) {
        if (size === '80mm') {
          styleTag.innerHTML = '@page { size: 80mm auto; margin: 0; }';
        } else if (size === '58mm') {
          styleTag.innerHTML = '@page { size: 58mm auto; margin: 0; }';
        } else {
          styleTag.innerHTML = '@page { size: A4 portrait; margin: 10mm; }';
        }
      }
    }

    function triggerPrint() {
      window.focus();
      window.print();
    }

    // Keyboard shortcuts: Enter -> Print, Esc -> Close
    window.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerPrint();
      } else if (e.key === 'Escape') {
        window.close();
      }
    });

    // Initialize with saved size or 80mm for POS SRS810-15
    window.addEventListener('DOMContentLoaded', function() {
      try {
        var saved = localStorage.getItem('pos_paper_size') || '${initialPaperSize}';
        setPaperFormat(saved, false);
      } catch(e) {}
    });

    // Auto-trigger print on initial render
    window.addEventListener('load', function() {
      setTimeout(function() {
        triggerPrint();
      }, 400);
    });
  <\/script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(pageHtml);
  printWindow.document.close();
  showToast('Invoice opened in new tab for POS SRS810-15 printing', 'info', 2500);
}

// Intercept Ctrl+P or browser menu print to guarantee mount is populated if printed directly
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

// ─── USER MENU & LOGOUT ───────────────────────────────────────────────────────
function initUserMenu(currentUser) {
  const userBtn = document.getElementById('user-menu-btn');
  if (!userBtn) return;

  const nameEl = userBtn.querySelector('.user-name');
  const avatarEl = userBtn.querySelector('.user-avatar');

  if (currentUser) {
    const displayName = currentUser.full_name || currentUser.username || 'Admin';
    if (nameEl) nameEl.textContent = displayName;
    if (avatarEl) {
      const parts = displayName.trim().split(/\s+/);
      const initials = parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : displayName.substring(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'IT';
    }
  }

  // Create dropdown menu if not exists
  const dropdownParent = userBtn.closest('.dropdown');
  if (dropdownParent && !dropdownParent.querySelector('.dropdown-menu')) {
    const menu = document.createElement('ul');
    menu.className = 'dropdown-menu dropdown-menu-end shadow border-0';
    menu.style.borderRadius = '12px';
    menu.style.padding = '8px';
    menu.style.minWidth = '210px';
    menu.innerHTML = `
      <li class="px-3 py-2 border-bottom mb-1">
        <div style="font-weight:600;font-size:13px;color:var(--text-dark)">${sanitizeHTML(currentUser?.full_name || currentUser?.username || 'User')}</div>
        <div style="font-size:11px;color:var(--text-muted);text-transform:capitalize">${sanitizeHTML(currentUser?.role || 'Admin')} · Logged in</div>
      </li>
      <li>
        <a class="dropdown-item d-flex align-items-center gap-2 py-2" href="#" id="menu-settings-btn" style="border-radius:8px;font-size:13px">
          <i class="bi bi-gear"></i> Settings
        </a>
      </li>
      <li><hr class="dropdown-divider my-1"></li>
      <li>
        <a class="dropdown-item d-flex align-items-center gap-2 py-2 text-danger" href="#" id="menu-logout-btn" style="border-radius:8px;font-size:13px">
          <i class="bi bi-box-arrow-right"></i> Sign Out
        </a>
      </li>
    `;
    dropdownParent.appendChild(menu);

    userBtn.setAttribute('data-bs-toggle', 'dropdown');
    userBtn.setAttribute('aria-expanded', 'false');

    menu.querySelector('#menu-settings-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('settings');
    });

    menu.querySelector('#menu-logout-btn')?.addEventListener('click', (e) => {
      e.preventDefault();
      showConfirm('Sign Out', 'Are you sure you want to sign out?', async () => {
        try {
          await apiPost('api/auth/logout.php', {});
          localStorage.removeItem('it_current_page');
        } finally {
          window.location.href = 'login.html';
        }
      }, 'Sign Out', 'btn-danger-it');
    });
  }
}

// ─── CUSTOMER HELPERS & MODAL CONTROLLERS ────────────────────────────────────
function escapeAttr(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getInitials(name) {
  if (!name || typeof name !== 'string') return 'CU';
  const clean = name.trim();
  if (!clean) return 'CU';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

async function openTodayCustomersModal() {
  const modalEl = document.getElementById('today-customers-modal');
  if (!modalEl) return;
  const modal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && bootstrap.Modal.getOrCreateInstance)
    ? bootstrap.Modal.getOrCreateInstance(modalEl)
    : new bootstrap.Modal(modalEl);
  modal.show();

  const dateLabel = document.getElementById('today-customers-date-label');
  if (dateLabel) {
    dateLabel.textContent = `Purchases & visitors recorded for today (${formatDate(todayISO())})`;
  }

  const container = document.getElementById('today-customers-container');
  if (container) {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;padding:30px;gap:10px">
        <div class="spinner-border text-info" role="status"></div>
        <div style="color:var(--text-muted);font-size:13px">Loading today's customers...</div>
      </div>
    `;
  }

  let customers = [];
  if (typeof currentDashboardData !== 'undefined' && currentDashboardData && Array.isArray(currentDashboardData.today_customers)) {
    customers = currentDashboardData.today_customers;
  } else {
    try {
      const res = await apiGet('api/dashboard/stats.php');
      if (res && res.success && res.data) {
        if (typeof currentDashboardData !== 'undefined') currentDashboardData = res.data;
        customers = res.data.today_customers || [];
      }
    } catch (e) {
      console.error('Error fetching today customers:', e);
    }
  }

  // Calculate summary metrics
  const totalSpentToday = customers.reduce((sum, c) => sum + (parseFloat(c.total_spent_today) || 0), 0);
  const totalPaidToday  = customers.reduce((sum, c) => sum + (parseFloat(c.total_paid_today) || 0), 0);
  const totalDueToday   = customers.reduce((sum, c) => sum + (parseFloat(c.total_balance_today) || 0), 0);
  const totalBillsToday = customers.reduce((sum, c) => sum + (parseInt(c.invoices_count, 10) || 0), 0);

  const summaryBar = document.getElementById('today-customers-summary-bar');
  if (summaryBar) {
    summaryBar.innerHTML = `
      <div class="today-stat-chip" style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:12px 14px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Customers Today</div>
        <div style="font-size:18px;font-weight:700;color:#0284c7">${customers.length} <span style="font-size:11px;font-weight:500;color:var(--text-muted)">(${totalBillsToday} bills)</span></div>
      </div>
      <div class="today-stat-chip" style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:12px 14px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Total Revenue</div>
        <div style="font-size:18px;font-weight:700;color:var(--primary)">${formatINR(totalSpentToday)}</div>
      </div>
      <div class="today-stat-chip" style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:12px 14px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Collected (Paid)</div>
        <div style="font-size:18px;font-weight:700;color:var(--success)">${formatINR(totalPaidToday)}</div>
      </div>
      <div class="today-stat-chip" style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:12px 14px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Balance Due</div>
        <div style="font-size:18px;font-weight:700;color:${totalDueToday > 0 ? 'var(--danger)' : 'var(--text-muted)'}">${formatINR(totalDueToday)}</div>
      </div>
    `;
  }

  window._allTodayCustomers = customers;
  renderTodayCustomersList(customers);

  const searchInput = document.getElementById('today-cust-search');
  if (searchInput) {
    searchInput.value = '';
    searchInput.oninput = (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      const filtered = (window._allTodayCustomers || []).filter(c => {
        const nameMatch = (c.name || '').toLowerCase().includes(q);
        const phoneMatch = (c.phone || '').includes(q);
        const invMatch = (c.invoice_numbers || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || invMatch;
      });
      renderTodayCustomersList(filtered);
    };
  }
}

function renderTodayCustomersList(list) {
  const container = document.getElementById('today-customers-container');
  if (!container) return;

  if (!list || !list.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding:40px 20px;text-align:center;background:#fff;border-radius:12px;border:1px dashed var(--border)">
        <div style="width:52px;height:52px;border-radius:50%;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:24px">
          <i class="bi bi-people"></i>
        </div>
        <h5 style="font-size:15px;font-weight:700;color:var(--text-dark);margin-bottom:6px">No Customers Found</h5>
        <p style="font-size:12.5px;color:var(--text-muted);max-width:320px;margin:0 auto 16px">No customers matching this query have made purchases today.</p>
        <button class="btn-primary-it" onclick="navigateTo('billing'); bootstrap.Modal.getInstance(document.getElementById('today-customers-modal'))?.hide();">
          <i class="bi bi-receipt-cutoff"></i> Create New Bill
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(c => {
    const initials = getInitials(c.name);
    const cleanPhone = (c.phone || '').replace(/\D/g, '');
    const isWalkIn = !c.customer_id && (c.name.toLowerCase() === 'walk-in customer');
    return `
      <div class="today-customer-card" style="background:#fff;border:1px solid var(--border-light);border-radius:12px;padding:16px;box-shadow:var(--shadow-sm);transition:all 0.2s ease">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">
          <!-- Left: Customer Profile -->
          <div style="display:flex;gap:14px;align-items:center;min-width:220px">
            <div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg, #0284c7, #38bdf8);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;box-shadow:0 2px 6px rgba(2,132,199,0.3)">
              ${initials}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-weight:700;font-size:15px;color:var(--text-dark)">${sanitizeHTML(c.name)}</span>
                <span class="badge-status ${isWalkIn ? 'badge-primary' : 'badge-paid'}" style="font-size:10px;padding:2px 7px">
                  ${isWalkIn ? 'Walk-in' : 'Registered'}
                </span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:3px;display:flex;gap:10px;flex-wrap:wrap">
                ${c.phone ? `<span><i class="bi bi-telephone text-primary"></i> ${sanitizeHTML(c.phone)}</span>` : '<span style="color:#94a3b8"><i class="bi bi-telephone-x"></i> No phone</span>'}
                ${c.address ? `<span><i class="bi bi-geo-alt text-danger"></i> ${sanitizeHTML(c.address)}</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Middle: Today's Financials -->
          <div style="display:flex;gap:16px;align-items:center">
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Today's Total</div>
              <div style="font-weight:800;font-size:16px;color:#0284c7">${formatINR(c.total_spent_today)}</div>
              <div style="font-size:11px;color:var(--text-muted)">
                ${c.invoices_count} ${c.invoices_count > 1 ? 'invoices' : 'invoice'}
              </div>
            </div>
            <div style="text-align:right;border-left:1px solid var(--border-light);padding-left:14px">
              <div style="font-size:11px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Payment Status</div>
              <div style="margin-top:2px">
                <span class="badge-status ${c.total_balance_today > 0 ? 'badge-partial' : 'badge-paid'}" style="font-size:11px;padding:3px 8px">
                  ${c.total_balance_today > 0 ? 'Due ' + formatINR(c.total_balance_today) : 'Fully Paid'}
                </span>
              </div>
              ${c.lifetime_spent > c.total_spent_today ? `
                <div style="font-size:10.5px;color:var(--text-muted);margin-top:2px" title="Lifetime Total">
                  Lifetime: ${formatINR(c.lifetime_spent)}
                </div>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Invoices today pill list -->
        ${(c.invoices && c.invoices.length) ? `
          <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--border-light);display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase">Today's Invoices:</span>
            ${c.invoices.map(inv => `
              <span class="badge" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;font-weight:600;font-size:11.5px;padding:4px 8px;display:inline-flex;align-items:center;gap:5px">
                <i class="bi bi-receipt"></i> ${sanitizeHTML(inv.invoice_no)} · ${formatINR(inv.grand_total)}
                <span class="badge-dot ${inv.payment_status === 'Paid' ? 'bg-success' : 'bg-warning'}" style="width:6px;height:6px;border-radius:50%;display:inline-block"></span>
              </span>
            `).join('')}
          </div>
        ` : ''}

        <!-- Actions row -->
        <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:8px;align-items:center;flex-wrap:wrap">
          ${cleanPhone ? `
            <a href="tel:${cleanPhone}" class="btn-sm-action" style="text-decoration:none" title="Call Customer">
              <i class="bi bi-telephone"></i> Call
            </a>
            <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-sm-action" style="text-decoration:none;color:#16a34a" title="Chat on WhatsApp">
              <i class="bi bi-whatsapp"></i> WhatsApp
            </a>
          ` : ''}
          ${(c.total_balance_today > 0 || (parseFloat(c.outstanding) > 0)) ? `
            <button class="btn-sm-action text-danger" style="background:#fef2f2;border-color:#fca5a5;font-weight:600" onclick="openClearDueModal({ customerId: ${c.customer_id || 0}, customerName: '${escapeAttr(c.name)}', dueAmount: ${c.total_balance_today || c.outstanding} })" title="Clear customer due">
              <i class="bi bi-cash-stack"></i> Clear Due
            </button>
          ` : ''}
          <button class="btn-sm-action" onclick="startBillForCustomer({ name: '${escapeAttr(c.name)}', phone: '${escapeAttr(c.phone || '')}', address: '${escapeAttr(c.address || '')}' })" title="Start new bill for this customer">
            <i class="bi bi-receipt-cutoff"></i> New Bill
          </button>
          <button class="btn-primary-it" style="font-size:12px;padding:6px 14px" onclick="openCustomerDetailModal({ id: ${c.customer_id || 0}, name: '${escapeAttr(c.name)}' })">
            <i class="bi bi-eye"></i> View Full Details &amp; History
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function openCustomerDetailModal(target) {
  let custId = 0;
  let custName = '';

  if (typeof target === 'object' && target !== null) {
    custId = parseInt(target.id || target.customer_id || 0, 10);
    custName = (target.name || target.customer_name || target.customer || '').trim();
  } else if (typeof target === 'number') {
    custId = target;
  } else if (typeof target === 'string') {
    custName = target.trim();
  }

  const modalEl = document.getElementById('customer-details-modal');
  if (!modalEl) return;
  const modal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && bootstrap.Modal.getOrCreateInstance)
    ? bootstrap.Modal.getOrCreateInstance(modalEl)
    : new bootstrap.Modal(modalEl);
  modal.show();

  const body = document.getElementById('customer-details-modal-body');
  const footerBtns = document.getElementById('cust-modal-action-btns');
  if (footerBtns) footerBtns.innerHTML = '';

  if (body) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:280px;gap:12px">
        <div class="spinner-border text-primary" role="status" style="width:2.5rem;height:2.5rem"></div>
        <div style="color:var(--text-muted);font-size:13px;font-weight:500">Loading complete customer profile and order history...</div>
      </div>
    `;
  }

  let param = '';
  if (custId > 0) param = 'id=' + encodeURIComponent(custId);
  else if (custName) param = 'name=' + encodeURIComponent(custName);
  else {
    if (body) body.innerHTML = `<div class="empty-state" style="padding:40px"><i class="bi bi-exclamation-circle text-danger"></i><h4>Customer not specified</h4></div>`;
    return;
  }

  let cust = null;
  try {
    const res = await apiGet('api/customers/item.php?' + param);
    if (res && res.success && res.data) {
      cust = res.data;
    }
  } catch (err) {
    console.error('Failed to load customer details:', err);
  }

  if (!cust) {
    if (body) {
      body.innerHTML = `
        <div class="empty-state" style="padding:40px;text-align:center">
          <i class="bi bi-person-x" style="font-size:36px;color:var(--text-muted);margin-bottom:8px"></i>
          <h4>Customer Details Unavailable</h4>
          <p style="color:var(--text-muted);font-size:13px">Could not load details for this customer.</p>
        </div>
      `;
    }
    return;
  }

  const initials = getInitials(cust.name);
  const cleanPhone = (cust.phone || '').replace(/\D/g, '');
  const isWalkIn = !cust.id && (cust.name.toLowerCase() === 'walk-in customer');
  const outstandingNum = parseFloat(cust.outstanding || 0);

  body.innerHTML = `
    <!-- Top Customer Profile Header -->
    <div style="background:#fff;border-radius:14px;padding:20px;border:1px solid var(--border-light);box-shadow:var(--shadow-sm);margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">
        <div style="width:62px;height:62px;border-radius:50%;background:linear-gradient(135deg, #2457D6, #0284c7);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:22px;flex-shrink:0;box-shadow:0 4px 12px rgba(36,87,214,0.3)">
          ${initials}
        </div>
        <div style="flex:1;min-width:240px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h4 style="margin:0;font-weight:800;font-size:20px;color:var(--text-dark)">${sanitizeHTML(cust.name)}</h4>
            <span class="badge-status ${isWalkIn ? 'badge-primary' : 'badge-paid'}" style="font-size:11px;padding:3px 8px">
              ${isWalkIn ? 'Walk-in Customer' : 'Registered Customer'}
            </span>
            ${cust.id ? `<span style="font-size:11.5px;color:var(--text-muted);font-weight:600">ID: #${cust.id}</span>` : ''}
          </div>
          <div style="margin-top:8px;display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--text-muted)">
            ${cust.phone ? `
              <a href="tel:${cleanPhone}" style="color:var(--primary);text-decoration:none;font-weight:600;display:inline-flex;align-items:center;gap:4px">
                <i class="bi bi-telephone-fill"></i> ${sanitizeHTML(cust.phone)}
              </a>
            ` : '<span style="color:#94a3b8"><i class="bi bi-telephone-x"></i> No phone</span>'}
            ${cust.email ? `
              <a href="mailto:${sanitizeHTML(cust.email)}" style="color:var(--text-dark);text-decoration:none;display:inline-flex;align-items:center;gap:4px">
                <i class="bi bi-envelope-fill text-primary"></i> ${sanitizeHTML(cust.email)}
              </a>
            ` : ''}
            ${cust.gstin ? `
              <span style="display:inline-flex;align-items:center;gap:4px">
                <i class="bi bi-card-text text-warning"></i> GSTIN: <strong>${sanitizeHTML(cust.gstin)}</strong>
              </span>
            ` : ''}
            ${cust.address ? `
              <span style="display:inline-flex;align-items:center;gap:4px">
                <i class="bi bi-geo-alt-fill text-danger"></i> ${sanitizeHTML(cust.address)}
              </span>
            ` : '<span style="color:#94a3b8"><i class="bi bi-geo-alt"></i> No address recorded</span>'}
          </div>
        </div>
      </div>
    </div>

    <!-- Outstanding Due Alert Banner (if balance > 0) -->
    ${outstandingNum > 0 ? `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
            <i class="bi bi-exclamation-octagon-fill"></i>
          </div>
          <div>
            <div style="font-weight:700;font-size:14px;color:#991b1b">Payment Due Amount: ${formatINR(outstandingNum)}</div>
            <div style="font-size:12px;color:#b91c1c">Customer has pending dues. You can clear full or partial balance now.</div>
          </div>
        </div>
        <button class="btn-primary-it" style="background:#059669;border-color:#059669;font-size:12.5px;padding:7px 16px" onclick="openClearDueModal({ customerId: ${cust.id || 0}, customerName: '${escapeAttr(cust.name)}', dueAmount: ${outstandingNum} })">
          <i class="bi bi-cash-stack"></i> Clear Customer Due
        </button>
      </div>
    ` : ''}

    <!-- 4 Financial Metrics Grid -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;margin-bottom:20px">
      <div style="background:#fff;border:1px solid var(--border-light);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Lifetime Purchases</div>
        <div style="font-size:20px;font-weight:800;color:var(--primary);margin-top:4px">${formatINR(cust.lifetime_spent)}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">across all orders</div>
      </div>
      <div style="background:#fff;border:1px solid var(--border-light);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Due Amount</div>
        <div style="font-size:20px;font-weight:800;color:${outstandingNum > 0 ? 'var(--danger)' : 'var(--success)'};margin-top:4px">${formatINR(outstandingNum)}</div>
        <div style="font-size:11px;color:${outstandingNum > 0 ? 'var(--danger)' : 'var(--success)'};margin-top:2px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap">
          <span>${outstandingNum > 0 ? 'Payment due' : 'Clear / No dues'}</span>
          ${outstandingNum > 0 ? `
            <button class="btn-sm-action text-danger" style="background:#fef2f2;border-color:#fca5a5;font-size:10.5px;padding:2px 8px;margin-top:4px" onclick="openClearDueModal({ customerId: ${cust.id || 0}, customerName: '${escapeAttr(cust.name)}', dueAmount: ${outstandingNum} })">
              <i class="bi bi-cash-stack"></i> Pay
            </button>
          ` : ''}
        </div>
      </div>
      <div style="background:#fff;border:1px solid var(--border-light);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Total Invoices</div>
        <div style="font-size:20px;font-weight:800;color:var(--text-dark);margin-top:4px">${cust.total_orders} <span style="font-size:12px;font-weight:500;color:var(--text-muted)">bills</span></div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${cust.last_order_date ? 'Last: ' + formatDate(cust.last_order_date) : 'No orders'}</div>
      </div>
      <div style="background:#fff;border:1px solid var(--border-light);border-radius:12px;padding:14px 16px;box-shadow:var(--shadow-sm)">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:600;text-transform:uppercase">Total Collected</div>
        <div style="font-size:20px;font-weight:800;color:var(--success);margin-top:4px">${formatINR(cust.total_paid || (cust.lifetime_spent - outstandingNum))}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px">received payments</div>
      </div>
    </div>

    <!-- Purchase Invoices & Items History -->
    <div style="background:#fff;border-radius:14px;border:1px solid var(--border-light);box-shadow:var(--shadow-sm);overflow:hidden">
      <div style="padding:14px 20px;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;background:#fafafa">
        <span style="font-weight:700;font-size:14px;color:var(--text-dark)">
          <i class="bi bi-clock-history text-primary"></i> Order &amp; Invoice History (${cust.invoices ? cust.invoices.length : 0})
        </span>
        <span style="font-size:12px;color:var(--text-muted)">Showing latest purchases</span>
      </div>

      ${(!cust.invoices || !cust.invoices.length) ? `
        <div class="empty-state" style="padding:32px;text-align:center">
          <i class="bi bi-receipt" style="font-size:28px;color:var(--text-muted)"></i>
          <p style="margin:6px 0 0;font-size:13px;color:var(--text-muted)">No past invoices found for this customer.</p>
        </div>
      ` : `
        <div class="table-wrapper" style="margin:0">
          <table class="it-table" style="font-size:12.5px">
            <thead>
              <tr style="background:#f1f5f9">
                <th>Invoice</th>
                <th>Date</th>
                <th>Purchased Items</th>
                <th>Payment</th>
                <th>Total (₹)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${cust.invoices.map(inv => {
                const itemsCount = inv.items ? inv.items.reduce((s, it) => s + (it.qty || 1), 0) : 0;
                const invBalance = parseFloat(inv.balance_due || 0);
                return `
                <tr>
                  <td>
                    <strong style="color:var(--primary)">${sanitizeHTML(inv.invoice_no)}</strong>
                  </td>
                  <td>${formatDate(inv.date)}</td>
                  <td>
                    ${(inv.items && inv.items.length) ? `
                      <div>
                        ${inv.items.map(it => `
                          <div style="margin-bottom:2px">
                            <span style="font-weight:600">${sanitizeHTML(it.product_name)}</span>
                            ${it.size ? `<span style="font-size:10.5px;color:var(--text-muted)">(${sanitizeHTML(it.size)})</span>` : ''}
                            <span style="color:var(--text-muted)">× ${it.qty}</span>
                            <span style="font-size:11px;color:#0284c7;font-weight:600">(${formatINR(it.line_total)})</span>
                          </div>
                        `).join('')}
                      </div>
                    ` : `<span style="color:var(--text-muted)">${itemsCount || 1} items</span>`}
                  </td>
                  <td>
                    <span style="font-weight:500">${sanitizeHTML(inv.payment_method || 'Cash')}</span>
                  </td>
                  <td>
                    <strong style="color:var(--text-dark);font-size:13px">${formatINR(inv.grand_total)}</strong>
                    ${invBalance > 0 ? `<div style="font-size:10.5px;color:var(--danger)">Due: ${formatINR(invBalance)}</div>` : ''}
                  </td>
                  <td>
                    ${paymentBadge(inv.payment_status)}
                  </td>
                  <td>
                    <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
                      <button class="btn-sm-action" onclick="viewExistingInvoice('${sanitizeHTML(inv.invoice_no)}')" title="View/Print Invoice">
                        <i class="bi bi-printer"></i> Bill
                      </button>
                      ${invBalance > 0 ? `
                        <button class="btn-sm-action text-danger" style="background:#fef2f2;border-color:#fca5a5;font-weight:600" onclick="openClearDueModal({ customerId: ${cust.id || 0}, customerName: '${escapeAttr(cust.name)}', invoiceId: ${inv.id}, invoiceNo: '${escapeAttr(inv.invoice_no)}', dueAmount: ${invBalance} })" title="Pay due for this invoice">
                          <i class="bi bi-cash-stack"></i> Pay Due
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    </div>

    <!-- Due Payment Receipts History Table -->
    ${(cust.payments && cust.payments.length) ? `
      <div style="background:#fff;border-radius:14px;border:1px solid var(--border-light);box-shadow:var(--shadow-sm);overflow:hidden;margin-top:16px">
        <div style="padding:14px 20px;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;background:#ecfdf5">
          <span style="font-weight:700;font-size:14px;color:#065f46">
            <i class="bi bi-receipt-cutoff text-success"></i> Payment Receipts &amp; Dues Cleared (${cust.payments.length})
          </span>
          <span style="font-size:12px;color:#047857">Recorded payment history</span>
        </div>
        <div class="table-wrapper" style="margin:0">
          <table class="it-table" style="font-size:12.5px">
            <thead>
              <tr style="background:#f1f5f9">
                <th>Receipt #</th>
                <th>Date</th>
                <th>Amount (₹)</th>
                <th>Method</th>
                <th>Settled Bill / Note</th>
                <th>Received By</th>
              </tr>
            </thead>
            <tbody>
              ${cust.payments.map(p => `
                <tr>
                  <td><strong style="color:#059669">#REC-${p.id}</strong></td>
                  <td>${formatDate(p.payment_date || p.created_at)}</td>
                  <td><strong style="color:#059669;font-size:13px">${formatINR(p.amount)}</strong></td>
                  <td><span class="badge" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1">${sanitizeHTML(p.payment_method || 'Cash')}</span></td>
                  <td>
                    ${p.invoice_no ? `<span style="font-weight:600;color:var(--primary)"><i class="bi bi-receipt"></i> ${sanitizeHTML(p.invoice_no)}</span>` : '<span style="color:var(--text-muted)">General Account Balance</span>'}
                    ${p.notes ? `<div style="font-size:11px;color:var(--text-muted)">${sanitizeHTML(p.notes)}</div>` : ''}
                  </td>
                  <td><span style="font-size:11.5px;color:var(--text-muted)">${sanitizeHTML(p.received_by || 'Admin')}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;

  // Action buttons in modal footer
  if (footerBtns) {
    footerBtns.innerHTML = `
      ${outstandingNum > 0 ? `
        <button class="btn-primary-it" style="background:#059669;border-color:#059669" onclick="openClearDueModal({ customerId: ${cust.id || 0}, customerName: '${escapeAttr(cust.name)}', dueAmount: ${outstandingNum} })">
          <i class="bi bi-cash-stack"></i> Clear Due (${formatINR(outstandingNum)})
        </button>
      ` : ''}
      ${cleanPhone ? `
        <a href="tel:${cleanPhone}" class="btn-ghost" style="text-decoration:none">
          <i class="bi bi-telephone"></i> Call
        </a>
        <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn-ghost" style="text-decoration:none;color:#16a34a">
          <i class="bi bi-whatsapp"></i> WhatsApp
        </a>
      ` : ''}
      <button class="btn-primary-it" onclick="startBillForCustomer({ name: '${escapeAttr(cust.name)}', phone: '${escapeAttr(cust.phone || '')}', address: '${escapeAttr(cust.address || '')}' })">
        <i class="bi bi-receipt-cutoff"></i> Create New Bill
      </button>
    `;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEAR DUE MODAL CONTROLS & SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────
function openClearDueModal(target, nameArg, dueArg, invIdArg, invNoArg) {
  let custId = 0;
  let custName = '';
  let invoiceId = 0;
  let invoiceNo = '';
  let dueAmount = 0;

  if (typeof target === 'object' && target !== null) {
    custId = parseInt(target.customerId || target.customer_id || target.id || 0, 10);
    custName = (target.customerName || target.customer_name || target.name || target.customer || '').trim();
    invoiceId = parseInt(target.invoiceId || target.invoice_id || 0, 10);
    invoiceNo = (target.invoiceNo || target.invoice_no || '').trim();
    dueAmount = parseFloat(target.dueAmount !== undefined ? target.dueAmount : (target.due !== undefined ? target.due : (target.balance !== undefined ? target.balance : (target.outstanding || 0))));
  } else {
    custId = parseInt(target || 0, 10);
    custName = (nameArg || '').trim();
    dueAmount = parseFloat(dueArg || 0);
    invoiceId = parseInt(invIdArg || 0, 10);
    invoiceNo = (invNoArg || '').trim();
  }

  const modalEl = document.getElementById('clear-due-modal');
  if (!modalEl) return;
  const modal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && bootstrap.Modal.getOrCreateInstance)
    ? bootstrap.Modal.getOrCreateInstance(modalEl)
    : new bootstrap.Modal(modalEl);

  const nameEl = document.getElementById('cd-customer-name');
  if (nameEl) nameEl.textContent = custName || (custId ? `Customer #${custId}` : 'Customer');

  const badgeEl = document.getElementById('cd-invoice-badge');
  if (badgeEl) {
    if (invoiceNo) {
      badgeEl.innerHTML = `<i class="bi bi-receipt"></i> Specific Invoice: <strong>${sanitizeHTML(invoiceNo)}</strong>`;
    } else {
      badgeEl.innerHTML = `<i class="bi bi-wallet2"></i> General Due Amount (auto-settles across bills)`;
    }
  }

  const dueEl = document.getElementById('cd-current-due');
  if (dueEl) dueEl.textContent = formatINR(dueAmount);

  const custIdEl = document.getElementById('cd-customer-id');
  if (custIdEl) custIdEl.value = custId || '';

  const invIdEl = document.getElementById('cd-invoice-id');
  if (invIdEl) invIdEl.value = invoiceId || '';

  const amountInput = document.getElementById('cd-amount');
  if (amountInput) {
    amountInput.value = dueAmount > 0 ? dueAmount.toFixed(2) : '';
  }

  const dateInput = document.getElementById('cd-payment-date');
  if (dateInput) {
    dateInput.value = todayISO();
  }

  const methodSelect = document.getElementById('cd-payment-method');
  if (methodSelect) {
    methodSelect.value = 'Cash';
  }

  const notesInput = document.getElementById('cd-notes');
  if (notesInput) {
    notesInput.value = invoiceNo ? `Settlement for invoice ${invoiceNo}` : '';
  }

  // Quick Amount Buttons
  const quickBox = document.getElementById('cd-quick-amounts');
  if (quickBox) {
    const pills = [];
    if (dueAmount > 0) {
      pills.push({ label: `Full (${formatINR(dueAmount)})`, val: dueAmount });
      if (dueAmount >= 500) {
        const roundHalf = Math.round(dueAmount / 2);
        pills.push({ label: `Half (${formatINR(roundHalf)})`, val: roundHalf });
      }
      [500, 1000, 2000, 5000].forEach(amt => {
        if (amt < dueAmount && !pills.some(p => p.val === amt)) {
          pills.push({ label: formatINR(amt), val: amt });
        }
      });
    }
    quickBox.innerHTML = pills.slice(0, 5).map(p => `
      <button type="button" class="btn-sm-action" style="background:#fff;font-size:11.5px;padding:3px 10px;border-radius:20px" onclick="setClearDueAmount(${p.val})">
        ${p.label}
      </button>
    `).join('');
  }

  // Preview listener for remaining balance
  const updatePreview = () => {
    const entered = parseFloat(amountInput?.value || 0);
    const remBox = document.getElementById('cd-remaining-preview');
    if (!remBox) return;
    if (entered <= 0 || isNaN(entered)) {
      remBox.innerHTML = '';
      return;
    }
    const rem = dueAmount - entered;
    if (rem <= 0) {
      remBox.innerHTML = `<span style="color:#059669;font-weight:600"><i class="bi bi-check-circle-fill"></i> Full payment! Due will be completely cleared.</span>`;
    } else {
      remBox.innerHTML = `<span>Remaining due after payment: <strong style="color:var(--danger)">${formatINR(rem)}</strong></span>`;
    }
  };

  if (amountInput) {
    amountInput.oninput = updatePreview;
  }
  updatePreview();

  modal.show();
}

function setClearDueAmount(val) {
  const amountInput = document.getElementById('cd-amount');
  if (amountInput) {
    amountInput.value = parseFloat(val).toFixed(2);
    amountInput.dispatchEvent(new Event('input'));
  }
}

async function submitClearDue() {
  const custId = parseInt(document.getElementById('cd-customer-id')?.value || 0, 10);
  const custName = (document.getElementById('cd-customer-name')?.textContent || '').trim();
  const invoiceId = parseInt(document.getElementById('cd-invoice-id')?.value || 0, 10);
  const amount = parseFloat(document.getElementById('cd-amount')?.value || 0);
  const paymentMethod = document.getElementById('cd-payment-method')?.value || 'Cash';
  const paymentDate = document.getElementById('cd-payment-date')?.value || todayISO();
  const notes = (document.getElementById('cd-notes')?.value || '').trim();

  if (amount <= 0 || isNaN(amount)) {
    showToast('Please enter a valid payment amount greater than 0', 'warning');
    document.getElementById('cd-amount')?.focus();
    return;
  }

  const btn = document.getElementById('btn-submit-clear-due');
  const origBtnHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Recording...`;
  }

  try {
    const payload = {
      customer_id: custId || null,
      customer_name: custName,
      invoice_id: invoiceId || null,
      amount: amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      notes: notes
    };

    const res = await apiPost('api/customers/clear_due.php', payload);

    if (res && res.success) {
      showToast(res.message || `Payment of ${formatINR(amount)} recorded successfully!`, 'success', 3500);

      // Hide modal
      const modalEl = document.getElementById('clear-due-modal');
      if (modalEl) {
        bootstrap.Modal.getInstance(modalEl)?.hide();
      }

      // 1. Refresh Customer Details modal if open
      const custModalEl = document.getElementById('customer-details-modal');
      if (custModalEl && custModalEl.classList.contains('show')) {
        openCustomerDetailModal({ id: custId, name: custName });
      }

      // 2. Refresh Today Customers modal if open
      const todayModalEl = document.getElementById('today-customers-modal');
      if (todayModalEl && todayModalEl.classList.contains('show')) {
        openTodayCustomersModal();
      }

      // 3. Refresh Dashboard if on dashboard
      const activeLink = document.querySelector('.nav-link-item.active');
      const curPage = activeLink ? activeLink.dataset.page : '';
      if (curPage === 'dashboard' || !curPage) {
        if (typeof loadDashboard === 'function') loadDashboard();
      } else if (curPage === 'customers') {
        if (typeof renderCustomers === 'function') renderCustomers(document.getElementById('page-container'));
      } else if (curPage === 'sales-history') {
        if (typeof renderSalesHistory === 'function') renderSalesHistory(document.getElementById('page-container'));
      }
    } else {
      showToast(res?.error || res?.message || 'Failed to record payment', 'danger', 4000);
    }
  } catch (err) {
    console.error('Error submitting clear due:', err);
    showToast('Error recording payment: ' + err.message, 'danger');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = origBtnHtml;
    }
  }
}

function startBillForCustomer(cust) {
  const todayModal = document.getElementById('today-customers-modal');
  if (todayModal) bootstrap.Modal.getInstance(todayModal)?.hide();
  const detModal = document.getElementById('customer-details-modal');
  if (detModal) bootstrap.Modal.getInstance(detModal)?.hide();

  navigateTo('billing');

  setTimeout(() => {
    const nameEl = document.getElementById('bill-customer-name');
    const phoneEl = document.getElementById('bill-customer-phone');
    const addrEl = document.getElementById('bill-customer-address');

    if (nameEl && cust.name && cust.name !== 'Walk-in Customer') nameEl.value = cust.name;
    if (phoneEl && cust.phone) phoneEl.value = cust.phone;
    if (addrEl && cust.address) addrEl.value = cust.address;

    const prodSearch = document.getElementById('bill-product-search');
    if (prodSearch) {
      prodSearch.focus();
      showToast(`Billing started for customer: ${cust.name}`, 'info', 2000);
    }
  }, 350);
}

async function viewExistingInvoice(invoiceNo) {
  if (!invoiceNo) return;
  try {
    const res = await apiGet('api/sales/index.php?search=' + encodeURIComponent(invoiceNo));
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      const sale = res.data.find(s => s.invoice_no === invoiceNo) || res.data[0];
      if (typeof showInvoicePreview === 'function') {
        const saleObj = {
          invoiceNo: sale.invoice_no,
          date: sale.date,
          customer: sale.customer_name || 'Walk-in Customer',
          customerPhone: sale.customer_phone || '',
          customerAddress: sale.customer_address || '',
          paymentMethod: sale.payment_method || 'Cash',
          paymentStatus: sale.payment_status || 'Paid',
          subtotal: parseFloat(sale.subtotal || sale.grand_total || 0),
          discount: parseFloat(sale.total_discount || 0),
          taxableAmount: parseFloat(sale.taxable_amount || sale.subtotal || 0),
          gstEnabled: !!sale.gst_enabled,
          gstRate: parseFloat(sale.gst_rate || 0),
          gstAmount: parseFloat((sale.cgst || 0) + (sale.sgst || 0) + (sale.igst || 0)),
          grandTotal: parseFloat(sale.grand_total || 0),
          amountPaid: parseFloat(sale.amount_paid || sale.grand_total || 0),
          balance: parseFloat(sale.balance_due || 0),
          items: (sale.items || []).map(i => ({
            name: i.product_name,
            sku: i.sku || '',
            size: i.size || '',
            qty: i.qty,
            unitPrice: parseFloat(i.unit_price || 0),
            discount: parseFloat(i.discount || 0),
            lineTotal: parseFloat(i.line_total || 0)
          }))
        };
        showInvoicePreview(saleObj);
      }
    } else {
      showToast('Could not load invoice ' + invoiceNo, 'warning');
    }
  } catch (err) {
    console.error('Failed to view invoice:', err);
    showToast('Failed to view invoice: ' + err.message, 'danger');
  }
}

// ─── INIT APPLICATION ─────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Session verification guard
  let currentUser = null;
  try {
    const authRes = await apiGet('api/auth/me.php');
    if (!authRes || !authRes.success || !authRes.user) {
      window.location.href = 'login.html';
      return;
    }
    currentUser = authRes.user;
    window.currentUser = currentUser;
  } catch (err) {
    window.location.href = 'login.html';
    return;
  }

  initSidebarToggle();
  initClock();
  initGlobalSearch();
  initKeyboardNavigation();
  initUserMenu(currentUser);

  // Attach nav link handlers
  document.querySelectorAll('.nav-link-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.page));
  });

  // Notifications button
  document.getElementById('notif-btn')?.addEventListener('click', () => {
    showToast('All systems operational. Database connected.', 'info');
  });

  // Handle browser back/forward buttons
  window.addEventListener('hashchange', () => {
    const hashPage = window.location.hash.replace(/^#/, '').trim();
    if (hashPage && hashPage !== AppState.currentPage && (PAGE_TITLES[hashPage] || hashPage === 'new-purchase')) {
      navigateTo(hashPage);
    }
  });

  // Load backend categories, brands, settings before rendering initial view
  await loadGlobalAppData();

  // Determine initial page from URL hash or localStorage so refresh stays on the exact same page
  const hashPage = window.location.hash.replace(/^#/, '').trim();
  const storedPage = localStorage.getItem('it_current_page');
  let initialPage = 'dashboard';

  if (hashPage && (PAGE_TITLES[hashPage] || hashPage === 'new-purchase')) {
    initialPage = hashPage;
  } else if (storedPage && (PAGE_TITLES[storedPage] || storedPage === 'new-purchase')) {
    initialPage = storedPage;
  }

  navigateTo(initialPage);
});
