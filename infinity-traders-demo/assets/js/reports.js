/**
 * INFINITY TRADERS — Reports Module (reports.js)
 * ================================================
 * Sales, Purchase, Profit, Category/Brand, Stock,
 * Low Stock, and Payment Collection reports.
 * Fully backed by MySQL aggregate queries via PHP API.
 */

'use strict';

let reportChartInstances = {};
let reportFilters = { period: 'monthly', dateFrom: '', dateTo: '' };
let activeReportType = 'sales-report';
let currentReportData = null;

function destroyReportCharts() {
  Object.values(reportChartInstances).forEach(c => {
    try { c.destroy(); } catch (e) {}
  });
  reportChartInstances = {};
}

function renderReports(container) {
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Reports &amp; Analytics</h1>
        <div class="breadcrumb-text">Live business insights and database aggregate analytics</div>
      </div>
    </div>

    <!-- Period selector -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <span style="font-weight:600;font-size:13px;color:var(--text-dark)"><i class="bi bi-calendar3"></i> Period:</span>
        <div class="chart-filter-group">
          <button class="chart-filter-btn" data-rp="weekly">Weekly</button>
          <button class="chart-filter-btn active" data-rp="monthly">Monthly</button>
          <button class="chart-filter-btn" data-rp="yearly">Yearly</button>
        </div>
        <span style="font-weight:600;font-size:13px;color:var(--text-muted)">— or Custom Date Range —</span>
        <input type="date" class="form-control-it" id="rp-date-from" style="width:150px" placeholder="From">
        <input type="date" class="form-control-it" id="rp-date-to"   style="width:150px" placeholder="To">
        <button class="btn-sm-action" id="btn-apply-date-filter" style="padding:8px 14px"><i class="bi bi-funnel"></i> Apply</button>
      </div>
    </div>

    <!-- Reports tabs -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
      ${['Sales Report','Purchase Report','Gross Profit','Category Sales','Brand Sales','Stock Valuation','Low Stock','Payment Summary'].map((name,i)=>`
        <button class="chart-filter-btn ${i===0?'active':''}" data-report="${name.toLowerCase().replace(/ /g,'-')}">${sanitizeHTML(name)}</button>`).join('')}
    </div>

    <!-- Report content -->
    <div id="report-content"></div>
  </div>`;

  reportFilters = { period: 'monthly', dateFrom: '', dateTo: '' };
  activeReportType = 'sales-report';
  renderReport('sales-report');

  document.querySelectorAll('[data-rp]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rp]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      reportFilters.period = btn.dataset.rp;
      reportFilters.dateFrom = '';
      reportFilters.dateTo = '';
      const dFrom = document.getElementById('rp-date-from');
      const dTo = document.getElementById('rp-date-to');
      if (dFrom) dFrom.value = '';
      if (dTo) dTo.value = '';
      renderReport(activeReportType);
    });
  });

  document.querySelectorAll('[data-report]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-report]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeReportType = btn.dataset.report;
      renderReport(activeReportType);
    });
  });

  document.getElementById('btn-apply-date-filter')?.addEventListener('click', () => {
    reportFilters.dateFrom = document.getElementById('rp-date-from')?.value || '';
    reportFilters.dateTo   = document.getElementById('rp-date-to')?.value || '';
    renderReport(activeReportType);
  });
}

async function renderReport(reportName) {
  destroyReportCharts();
  const content = document.getElementById('report-content');
  if (!content) return;
  renderLoadingSpinner(content);

  const queryParams = new URLSearchParams({
    type: reportName,
    period: reportFilters.period,
    date_from: reportFilters.dateFrom,
    date_to: reportFilters.dateTo
  });

  let res = null;
  try {
    res = await apiGet('api/reports/index.php?' + queryParams.toString());
  } catch (err) {
    console.error('Failed to load report data:', err);
  }

  const data = (res && res.success) ? res.data : null;
  currentReportData = data;

  switch (reportName) {
    case 'sales-report':       renderSalesReport(content, data); break;
    case 'purchase-report':    renderPurchaseReport(content, data); break;
    case 'gross-profit':       renderGrossProfitReport(content, data); break;
    case 'category-sales':     renderCategorySalesReport(content, data); break;
    case 'brand-sales':        renderBrandSalesReport(content, data); break;
    case 'stock-valuation':    renderStockValuationReport(content, data); break;
    case 'low-stock':          renderLowStockReport(content, data); break;
    case 'payment-summary':    renderPaymentSummaryReport(content, data); break;
    default: content.innerHTML = '';
  }
}

function renderSalesReport(container, data) {
  const totalSales = data?.total_sales || 0;
  const totalInvoices = data?.total_invoices || 0;
  const avgValue = data?.avg_invoice_value || 0;
  const collectionRate = data?.collection_rate || 0;
  const chartData = data?.chart || { labels: ['No Data'], sales: [0] };
  const invoices = data?.invoices || [];

  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#2457D6">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Sales</div><div class="kpi-value">${formatINR(totalSales)}</div></div><div class="kpi-icon"><i class="bi bi-bag-check"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#10b981">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Invoices</div><div class="kpi-value">${totalInvoices}</div></div><div class="kpi-icon"><i class="bi bi-receipt"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#6366f1">
        <div class="kpi-card-header"><div><div class="kpi-label">Avg. Invoice Value</div><div class="kpi-value">${formatINR(avgValue)}</div></div><div class="kpi-icon"><i class="bi bi-calculator"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#D4AF37">
        <div class="kpi-card-header"><div><div class="kpi-label">Collection Rate</div><div class="kpi-value">${collectionRate}%</div></div><div class="kpi-icon"><i class="bi bi-graph-up"></i></div></div>
      </div>
    </div>
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-graph-up-arrow"></i>Sales Trend (${sanitizeHTML(reportFilters.period)})</span>
        <button class="btn-outline-it" onclick="exportSalesReportCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> Export CSV</button>
      </div>
      <div class="card-body"><div class="chart-wrapper"><canvas id="rp-sales-chart"></canvas></div></div>
    </div>
    <div class="report-card">
      <div class="card-header"><span class="card-title"><i class="bi bi-table"></i>Recent Invoices Breakdown</span></div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Invoice No</th><th>Customer</th><th>Date</th><th>Payment</th><th>Grand Total</th><th>Status</th></tr></thead>
          <tbody>${invoices.length ? invoices.map(inv => `<tr>
            <td><strong>${sanitizeHTML(inv.invoice_no)}</strong></td>
            <td>${sanitizeHTML(inv.customer_name || 'Walk-in')}</td>
            <td>${formatDate(inv.date)}</td>
            <td>${sanitizeHTML(inv.payment_method)}</td>
            <td><strong>${formatINR(inv.grand_total)}</strong></td>
            <td>${paymentBadge(inv.payment_status)}</td>
          </tr>`).join('') : `<tr><td colspan="6"><div class="empty-state" style="padding:20px"><p>No sales records found for this period.</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-sales-chart');
    if (canvas && chartData) {
      reportChartInstances['sales'] = new Chart(canvas, {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Sales (₹)', data: chartData.sales,
            borderColor: '#2457D6', backgroundColor: 'rgba(36,87,214,0.1)',
            fill: true, tension: 0.4, pointRadius: 4
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatINR(ctx.parsed.y)}` } } },
          scales: { y: { ticks: { callback: v => formatINRCompact(v) } } }
        }
      });
    }
  }, 40);
}

function renderPurchaseReport(container, data) {
  const totalPur = data?.total_purchases || 0;
  const totalOrders = data?.total_orders || 0;
  const outstanding = data?.outstanding_balance || 0;
  const chartData = data?.chart || { labels: ['No Data'], purchases: [0] };
  const purchases = data?.purchases || [];

  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#f59e0b">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Purchases</div><div class="kpi-value">${formatINR(totalPur)}</div></div><div class="kpi-icon"><i class="bi bi-box-seam"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#ef4444">
        <div class="kpi-card-header"><div><div class="kpi-label">Due Amount</div><div class="kpi-value">${formatINR(outstanding)}</div></div><div class="kpi-icon"><i class="bi bi-exclamation-triangle"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#6366f1">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Purchase Orders</div><div class="kpi-value">${totalOrders}</div></div><div class="kpi-icon"><i class="bi bi-truck"></i></div></div>
      </div>
    </div>
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-bar-chart"></i>Purchase Trend (${sanitizeHTML(reportFilters.period)})</span>
        <button class="btn-outline-it" onclick="exportPurchaseReportCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> Export CSV</button>
      </div>
      <div class="card-body"><div class="chart-wrapper"><canvas id="rp-purchase-chart"></canvas></div></div>
    </div>
    <div class="report-card">
      <div class="card-header"><span class="card-title"><i class="bi bi-table"></i>Recent Purchases Breakdown</span></div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Purchase No</th><th>Supplier</th><th>Date</th><th>Total Amount</th><th>Status</th></tr></thead>
          <tbody>${purchases.length ? purchases.map(po => `<tr>
            <td><strong>${sanitizeHTML(po.purchase_no)}</strong></td>
            <td>${sanitizeHTML(po.supplier_name || 'Supplier')}</td>
            <td>${formatDate(po.date)}</td>
            <td><strong>${formatINR(po.total_amount)}</strong></td>
            <td>${paymentBadge(po.payment_status)}</td>
          </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:20px"><p>No purchase records found for this period.</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-purchase-chart');
    if (canvas && chartData) {
      reportChartInstances['purchase'] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: chartData.labels,
          datasets: [{ label: 'Purchases (₹)', data: chartData.purchases, backgroundColor: 'rgba(212,175,55,0.75)', borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatINR(ctx.parsed.y)}` } } },
          scales: { y: { ticks: { callback: v => formatINRCompact(v) } } }
        }
      });
    }
  }, 40);
}

function renderGrossProfitReport(container, data) {
  const totalRev = data?.total_revenue || 0;
  const totalCost = data?.total_cost || 0;
  const totalProfit = data?.total_profit || 0;
  const margin = data?.overall_margin || 0;
  const items = data?.items || [];

  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#2457D6">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Revenue</div><div class="kpi-value">${formatINR(totalRev)}</div></div><div class="kpi-icon"><i class="bi bi-cash-stack"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#f59e0b">
        <div class="kpi-card-header"><div><div class="kpi-label">Cost of Goods</div><div class="kpi-value">${formatINR(totalCost)}</div></div><div class="kpi-icon"><i class="bi bi-receipt"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#10b981">
        <div class="kpi-card-header"><div><div class="kpi-label">Gross Profit</div><div class="kpi-value">${formatINR(totalProfit)}</div></div><div class="kpi-icon"><i class="bi bi-currency-rupee"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#D4AF37">
        <div class="kpi-card-header"><div><div class="kpi-label">Margin %</div><div class="kpi-value">${margin}%</div></div><div class="kpi-icon"><i class="bi bi-percent"></i></div></div>
      </div>
    </div>
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-currency-rupee"></i>Product-level Gross Profit Breakdown</span>
        <button class="btn-outline-it" onclick="exportProfitReportCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> Export CSV</button>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Units Sold</th><th>Avg Sell Price</th><th>Cost Price</th><th>Revenue</th><th>Profit</th><th>Margin</th></tr></thead>
          <tbody>${items.length ? items.map(it => `<tr>
            <td style="font-weight:600">${sanitizeHTML(it.product_name)}</td>
            <td><code>${sanitizeHTML(it.sku)}</code></td>
            <td>${it.total_qty}</td>
            <td>${formatINR(it.avg_selling_price)}</td>
            <td>${formatINR(it.cost_price)}</td>
            <td><strong>${formatINR(it.total_revenue)}</strong></td>
            <td class="${it.gross_profit>=0?'stock-ok':'stock-out'}" style="font-weight:700">${formatINR(it.gross_profit)}</td>
            <td class="${it.margin_pct>=0?'stock-ok':'stock-out'}">${it.margin_pct}%</td>
          </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state" style="padding:20px"><p>No product sales recorded for profit analysis in this period.</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

function renderCategorySalesReport(container, data) {
  const categories = data?.categories || [];
  const total = data?.total_revenue || 0;

  container.innerHTML = `
    <div class="sections-grid">
      <div class="report-card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-pie-chart"></i>Category-wise Sales</span>
          <button class="btn-outline-it" onclick="exportCategoryCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
        </div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="rp-cat-chart"></canvas></div></div>
      </div>
      <div class="report-card">
        <div class="card-header"><span class="card-title"><i class="bi bi-table"></i>Category Breakdown</span></div>
        <div class="table-wrapper">
          <table class="it-table">
            <thead><tr><th>Category</th><th>Products</th><th>Units Sold</th><th>Sales (₹)</th><th>Share %</th></tr></thead>
            <tbody>${categories.length ? categories.map(c => `<tr>
              <td><strong>${sanitizeHTML(c.name)}</strong></td>
              <td>${c.product_count}</td>
              <td>${c.total_qty}</td>
              <td><strong>${formatINR(c.total_revenue)}</strong></td>
              <td>${c.share_pct}%</td>
            </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:20px"><p>No category sales data found.</p></div></td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-cat-chart');
    if (canvas && categories.length) {
      reportChartInstances['cat'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: categories.map(c => c.name),
          datasets: [{ data: categories.map(c => c.total_revenue), backgroundColor: ['#2457D6','#D4AF37','#10b981','#6366f1','#ef4444','#f59e0b','#94a3b8'], borderWidth: 2 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatINR(ctx.parsed)}` } } },
          cutout: '60%'
        }
      });
    }
  }, 40);
}

function renderBrandSalesReport(container, data) {
  const brands = data?.brands || [];

  container.innerHTML = `
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-bar-chart-steps"></i>Brand-wise Sales</span>
        <button class="btn-outline-it" onclick="exportBrandCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
      </div>
      <div class="card-body"><div class="chart-wrapper" style="height:280px"><canvas id="rp-brand-chart"></canvas></div></div>
    </div>
    <div class="report-card">
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Brand</th><th>Products</th><th>Units Sold</th><th>Sales (₹)</th><th>Share %</th></tr></thead>
          <tbody>${brands.length ? brands.map(b => `<tr>
            <td style="font-weight:600">${sanitizeHTML(b.name)}</td>
            <td>${b.product_count}</td>
            <td>${b.total_qty}</td>
            <td><strong>${formatINR(b.total_revenue)}</strong></td>
            <td>${b.share_pct}%</td>
          </tr>`).join('') : `<tr><td colspan="5"><div class="empty-state" style="padding:20px"><p>No brand sales data found.</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-brand-chart');
    if (canvas && brands.length) {
      reportChartInstances['brand'] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: brands.map(b => b.name),
          datasets: [{ label: 'Sales (₹)', data: brands.map(b => b.total_revenue), backgroundColor: ['#2457D6','#10b981','#D4AF37','#6366f1','#ef4444','#f59e0b','#94a3b8'], borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatINR(ctx.parsed.x)}` } } },
          scales: { x: { ticks: { callback: v => formatINRCompact(v) } } }
        }
      });
    }
  }, 40);
}

function renderStockValuationReport(container, data) {
  const totalCostVal = data?.total_cost_valuation || 0;
  const totalRetailVal = data?.total_retail_valuation || 0;
  const potentialProfit = data?.potential_profit || 0;
  const products = data?.products || [];

  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#2457D6">
        <div class="kpi-card-header"><div><div class="kpi-label">Inventory at Purchase Price</div><div class="kpi-value">${formatINR(totalCostVal)}</div></div><div class="kpi-icon"><i class="bi bi-boxes"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#10b981">
        <div class="kpi-card-header"><div><div class="kpi-label">Inventory at Selling Price</div><div class="kpi-value">${formatINR(totalRetailVal)}</div></div><div class="kpi-icon"><i class="bi bi-currency-rupee"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#D4AF37">
        <div class="kpi-card-header"><div><div class="kpi-label">Potential Gross Profit</div><div class="kpi-value">${formatINR(potentialProfit)}</div></div><div class="kpi-icon"><i class="bi bi-graph-up"></i></div></div>
      </div>
    </div>
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-table"></i>Stock Valuation by Product</span>
        <button class="btn-outline-it" onclick="exportStockValCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Brand</th><th>Stock</th><th>Purchase Price</th><th>Sell Price</th><th>Stock Value (PP)</th><th>Stock Value (SP)</th></tr></thead>
          <tbody>${products.length ? products.map(p => `<tr>
            <td>${sanitizeHTML(p.name)}</td>
            <td><code style="font-size:11px">${sanitizeHTML(p.sku)}</code></td>
            <td>${sanitizeHTML(p.brand_name || '—')}</td>
            <td><strong>${p.stock}</strong></td>
            <td>${formatINR(p.purchase_price)}</td>
            <td>${formatINR(p.selling_price)}</td>
            <td>${formatINR(p.cost_valuation)}</td>
            <td><strong>${formatINR(p.retail_valuation)}</strong></td>
          </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state" style="padding:20px"><p>No active products with valuation found.</p></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

function renderLowStockReport(container, data) {
  const lowStockProds = Array.isArray(data) ? data : (data?.data || []);
  container.innerHTML = `
    <div class="report-card">
      <div class="card-header">
        <span class="card-title" style="color:var(--warning)"><i class="bi bi-exclamation-triangle"></i>Low Stock Alert — ${lowStockProds.length} products</span>
        <button class="btn-outline-it" onclick="exportLowStockCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Brand</th><th>Category</th><th>Current Stock</th><th>Threshold</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${lowStockProds.length ? lowStockProds.map(p => `<tr>
            <td style="font-weight:600">${sanitizeHTML(p.name)}</td>
            <td><code style="font-size:11px">${sanitizeHTML(p.sku)}</code></td>
            <td>${sanitizeHTML(p.brand_name || '—')}</td>
            <td>${sanitizeHTML(p.category_name || '—')}</td>
            <td class="${p.stock<=0?'stock-out':'stock-low'}" style="font-weight:700">${p.stock}</td>
            <td>${p.low_stock_threshold}</td>
            <td><span class="badge-status ${p.stock<=0?'badge-out':'badge-low'}">${sanitizeHTML(p.stock_status)}</span></td>
            <td><button class="btn-sm-action" onclick="navigateTo('purchases')"><i class="bi bi-cart-plus"></i> Reorder</button></td>
          </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state" style="padding:30px"><i class="bi bi-check-circle" style="color:var(--success)"></i><h4>All products are well-stocked!</h4></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

function renderPaymentSummaryReport(container, data) {
  const total = data?.total_collected || 0;
  const methods = data?.methods || [];

  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(1,1fr);max-width:320px;margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#10b981">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Payment Collected</div><div class="kpi-value">${formatINR(total)}</div></div><div class="kpi-icon"><i class="bi bi-cash-stack"></i></div></div>
      </div>
    </div>
    <div class="sections-grid">
      <div class="report-card">
        <div class="card-header"><span class="card-title"><i class="bi bi-pie-chart"></i>Payment Methods Share</span></div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="rp-payment-chart"></canvas></div></div>
      </div>
      <div class="report-card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-table"></i>Payment Breakdown</span>
          <button class="btn-outline-it" onclick="exportPaymentCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
        </div>
        <div class="table-wrapper">
          <table class="it-table">
            <thead><tr><th>Method</th><th>Transactions</th><th>Amount Collected</th><th>Share %</th></tr></thead>
            <tbody>${methods.length ? methods.map(m => `<tr>
              <td><i class="bi bi-${m.payment_method==='Cash'?'cash-coin':m.payment_method==='UPI'?'phone':'credit-card'}"></i> <strong>${sanitizeHTML(m.payment_method)}</strong></td>
              <td>${m.count}</td>
              <td><strong>${formatINR(m.total_collected)}</strong></td>
              <td>${m.share_pct}%</td>
            </tr>`).join('') : `<tr><td colspan="4"><div class="empty-state" style="padding:20px"><p>No payment collections recorded.</p></div></td></tr>`}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-payment-chart');
    if (canvas && methods.length) {
      reportChartInstances['payment'] = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: methods.map(m => m.payment_method),
          datasets: [{ data: methods.map(m => m.total_collected), backgroundColor: ['#10b981','#2457D6','#D4AF37','#94a3b8'], borderWidth: 2 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatINR(ctx.parsed)}` } } }
        }
      });
    }
  }, 40);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
function exportSalesReportCSV() {
  const invoices = currentReportData?.invoices || [];
  exportCSV('sales_report.csv', ['Invoice No', 'Customer', 'Date', 'Payment Method', 'Grand Total', 'Status'], invoices.map(i => [i.invoice_no, i.customer_name || 'Walk-in', i.date, i.payment_method, i.grand_total, i.payment_status]));
}

function exportPurchaseReportCSV() {
  const purchases = currentReportData?.purchases || [];
  exportCSV('purchase_report.csv', ['Purchase No', 'Supplier', 'Date', 'Total Amount', 'Status'], purchases.map(p => [p.purchase_no, p.supplier_name, p.date, p.total_amount, p.payment_status]));
}

function exportProfitReportCSV() {
  const items = currentReportData?.items || [];
  exportCSV('gross_profit_report.csv', ['Product', 'SKU', 'Units Sold', 'Avg Sell Price', 'Cost Price', 'Total Revenue', 'Gross Profit', 'Margin %'], items.map(it => [it.product_name, it.sku, it.total_qty, it.avg_selling_price, it.cost_price, it.total_revenue, it.gross_profit, it.margin_pct]));
}

function exportCategoryCSV() {
  const categories = currentReportData?.categories || [];
  exportCSV('category_sales.csv', ['Category', 'Products', 'Units Sold', 'Sales (₹)', 'Share %'], categories.map(c => [c.name, c.product_count, c.total_qty, c.total_revenue, c.share_pct]));
}

function exportBrandCSV() {
  const brands = currentReportData?.brands || [];
  exportCSV('brand_sales.csv', ['Brand', 'Products', 'Units Sold', 'Sales (₹)', 'Share %'], brands.map(b => [b.name, b.product_count, b.total_qty, b.total_revenue, b.share_pct]));
}

function exportStockValCSV() {
  const products = currentReportData?.products || [];
  exportCSV('stock_valuation.csv', ['Product', 'SKU', 'Brand', 'Stock', 'Purchase Price', 'Selling Price', 'Stock Value (PP)', 'Stock Value (SP)'], products.map(p => [p.name, p.sku, p.brand_name, p.stock, p.purchase_price, p.selling_price, p.cost_valuation, p.retail_valuation]));
}

function exportLowStockCSV() {
  const lowStock = Array.isArray(currentReportData) ? currentReportData : (currentReportData?.data || []);
  exportCSV('low_stock.csv', ['Product', 'SKU', 'Brand', 'Category', 'Current Stock', 'Threshold', 'Status'], lowStock.map(p => [p.name, p.sku, p.brand_name, p.category_name, p.stock, p.low_stock_threshold, p.stock_status]));
}

function exportPaymentCSV() {
  const methods = currentReportData?.methods || [];
  exportCSV('payment_summary.csv', ['Payment Method', 'Transactions', 'Total Collected (₹)', 'Share %'], methods.map(m => [m.payment_method, m.count, m.total_collected, m.share_pct]));
}
