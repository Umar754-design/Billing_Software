/**
 * INFINITY TRADERS — Reports Module (reports.js)
 * ================================================
 * Sales, Purchase, Profit, Category/Brand, Stock,
 * Low Stock, and Payment Collection reports.
 */

'use strict';

let reportChartInstances = {};
let reportFilters = { period: 'monthly', dateFrom: '', dateTo: '' };

function renderReports(container) {
  container.innerHTML = `
  <div class="page-section">
    <div class="page-header">
      <div class="page-header-left">
        <h1>Reports &amp; Analytics</h1>
        <div class="breadcrumb-text">Business insights — sample data only</div>
      </div>
    </div>
    <div class="demo-banner"><i class="bi bi-info-circle-fill"></i><span><strong>Demo Reports:</strong> All figures are sample data for demonstration. Not actual business records.</span></div>

    <!-- Period selector -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-body" style="padding:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
        <span style="font-weight:600;font-size:13px;color:var(--text-dark)"><i class="bi bi-calendar3"></i> Period:</span>
        <div class="chart-filter-group">
          <button class="chart-filter-btn" data-rp="weekly">Weekly</button>
          <button class="chart-filter-btn active" data-rp="monthly">Monthly</button>
          <button class="chart-filter-btn" data-rp="yearly">Yearly</button>
        </div>
        <span style="font-weight:600;font-size:13px;color:var(--text-muted)">— or —</span>
        <input type="date" class="form-control-it" id="rp-date-from" style="width:150px" placeholder="From">
        <input type="date" class="form-control-it" id="rp-date-to"   style="width:150px" placeholder="To">
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
  renderReport('sales-report');

  document.querySelectorAll('[data-rp]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-rp]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      reportFilters.period = btn.dataset.rp;
      const activeReport = document.querySelector('[data-report].active')?.dataset.report || 'sales-report';
      renderReport(activeReport);
    });
  });

  document.querySelectorAll('[data-report]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-report]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderReport(btn.dataset.report);
    });
  });

  ['rp-date-from','rp-date-to'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      reportFilters.dateFrom = document.getElementById('rp-date-from')?.value || '';
      reportFilters.dateTo   = document.getElementById('rp-date-to')?.value || '';
    });
  });
}

function destroyReportCharts() {
  Object.values(reportChartInstances).forEach(c => { try { c.destroy(); } catch(e) {} });
  reportChartInstances = {};
}

function renderReport(reportName) {
  destroyReportCharts();
  const content = document.getElementById('report-content');
  if (!content) return;

  switch (reportName) {
    case 'sales-report':       renderSalesReport(content); break;
    case 'purchase-report':    renderPurchaseReport(content); break;
    case 'gross-profit':       renderGrossProfitReport(content); break;
    case 'category-sales':     renderCategorySalesReport(content); break;
    case 'brand-sales':        renderBrandSalesReport(content); break;
    case 'stock-valuation':    renderStockValuationReport(content); break;
    case 'low-stock':          renderLowStockReport(content); break;
    case 'payment-summary':    renderPaymentSummaryReport(content); break;
    default: content.innerHTML = '';
  }
}

function renderSalesReport(container) {
  const data = CHART_DATA[reportFilters.period];
  const totalSales = AppState.sales.reduce((s, x) => s + x.grandTotal, 0);
  const totalInvoices = AppState.sales.length;
  const paidCount = AppState.sales.filter(s => s.paymentStatus === 'Paid').length;

  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#2457D6">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Sales (Sample)</div><div class="kpi-value">${formatINR(totalSales)}</div></div><div class="kpi-icon"><i class="bi bi-bag-check"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#10b981">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Invoices</div><div class="kpi-value">${totalInvoices}</div></div><div class="kpi-icon"><i class="bi bi-receipt"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#6366f1">
        <div class="kpi-card-header"><div><div class="kpi-label">Avg. Invoice Value</div><div class="kpi-value">${formatINR(totalInvoices > 0 ? totalSales/totalInvoices : 0)}</div></div><div class="kpi-icon"><i class="bi bi-calculator"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#D4AF37">
        <div class="kpi-card-header"><div><div class="kpi-label">Collection Rate</div><div class="kpi-value">${Math.round((paidCount/totalInvoices)*100)||0}%</div></div><div class="kpi-icon"><i class="bi bi-graph-up"></i></div></div>
      </div>
    </div>
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-graph-up-arrow"></i>Sales Trend (${sanitizeHTML(reportFilters.period)} — sample)</span>
        <button class="btn-outline-it" onclick="exportSalesReportCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> Export CSV</button>
      </div>
      <div class="card-body"><div class="chart-wrapper"><canvas id="rp-sales-chart"></canvas></div></div>
    </div>
    <div class="report-card">
      <div class="card-header"><span class="card-title"><i class="bi bi-table"></i>Sales Breakdown</span></div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Period</th><th>Sales (₹)</th><th>Growth</th></tr></thead>
          <tbody>${data.labels.map((l,i)=>`<tr>
            <td>${sanitizeHTML(l)}</td>
            <td><strong>${formatINR(data.sales[i])}</strong></td>
            <td>${i>0?`<span class="${data.sales[i]>=data.sales[i-1]?'stock-ok':'stock-out'}">${data.sales[i]>=data.sales[i-1]?'↑':'↓'} ${Math.abs(Math.round(((data.sales[i]-data.sales[i-1])/data.sales[i-1])*100))}%</span>`:'—'}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-sales-chart');
    if (canvas && data) {
      reportChartInstances['sales'] = new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Sales (₹)', data: data.sales,
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
  }, 50);
}

function renderPurchaseReport(container) {
  const data = CHART_DATA[reportFilters.period];
  const totalPur = AppState.purchases.reduce((s, x) => s + x.totalAmount, 0);
  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#f59e0b">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Purchases (Sample)</div><div class="kpi-value">${formatINR(totalPur)}</div></div><div class="kpi-icon"><i class="bi bi-box-seam"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#ef4444">
        <div class="kpi-card-header"><div><div class="kpi-label">Outstanding Payments</div><div class="kpi-value">${formatINR(AppState.purchases.filter(p=>p.paymentStatus!=='Paid').reduce((s,p)=>s+p.balance,0))}</div></div><div class="kpi-icon"><i class="bi bi-exclamation-triangle"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#6366f1">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Purchase Orders</div><div class="kpi-value">${AppState.purchases.length}</div></div><div class="kpi-icon"><i class="bi bi-truck"></i></div></div>
      </div>
    </div>
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-bar-chart"></i>Purchase Trend (${sanitizeHTML(reportFilters.period)} — sample)</span>
        <button class="btn-outline-it" onclick="exportPurchaseReportCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> Export CSV</button>
      </div>
      <div class="card-body"><div class="chart-wrapper"><canvas id="rp-purchase-chart"></canvas></div></div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-purchase-chart');
    if (canvas && data) {
      reportChartInstances['purchase'] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [{ label: 'Purchases (₹)', data: data.purchases, backgroundColor: 'rgba(212,175,55,0.75)', borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatINR(ctx.parsed.y)}` } } },
          scales: { y: { ticks: { callback: v => formatINRCompact(v) } } }
        }
      });
    }
  }, 50);
}

function renderGrossProfitReport(container) {
  const data = CHART_DATA[reportFilters.period];
  const profitData = data.sales.map((s, i) => s - data.purchases[i]);
  container.innerHTML = `
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-currency-rupee"></i>Gross Profit (Sales − Purchases — sample)</span>
        <button class="btn-outline-it" onclick="exportProfitReportCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> Export CSV</button>
      </div>
      <div class="card-body"><div class="chart-wrapper"><canvas id="rp-profit-chart"></canvas></div></div>
    </div>
    <div class="report-card">
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Period</th><th>Sales</th><th>Purchases</th><th>Gross Profit</th><th>Margin %</th></tr></thead>
          <tbody>${data.labels.map((l,i)=>{
            const margin = data.sales[i] > 0 ? Math.round((profitData[i]/data.sales[i])*100) : 0;
            return `<tr>
              <td>${sanitizeHTML(l)}</td>
              <td>${formatINR(data.sales[i])}</td>
              <td>${formatINR(data.purchases[i])}</td>
              <td class="${profitData[i]>=0?'stock-ok':'stock-out'}" style="font-weight:700">${formatINR(profitData[i])}</td>
              <td class="${margin>=0?'stock-ok':'stock-out'}">${margin}%</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-profit-chart');
    if (canvas) {
      reportChartInstances['profit'] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: data.labels,
          datasets: [
            { label: 'Sales', data: data.sales,     backgroundColor: 'rgba(36,87,214,0.7)', borderRadius: 4 },
            { label: 'Purchases', data: data.purchases, backgroundColor: 'rgba(212,175,55,0.7)', borderRadius: 4 },
            { label: 'Gross Profit', data: profitData, backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatINR(ctx.parsed.y)}` } } },
          scales: { y: { ticks: { callback: v => formatINRCompact(v) } } }
        }
      });
    }
  }, 50);
}

function renderCategorySalesReport(container) {
  const catData = [
    { category: 'Shoes', sales: 98500, units: 23 },
    { category: 'Sports Dresses', sales: 42000, units: 51 },
    { category: 'Slippers', sales: 18700, units: 38 }
  ];
  container.innerHTML = `
    <div class="sections-grid">
      <div class="report-card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-pie-chart"></i>Category-wise Sales (sample)</span>
          <button class="btn-outline-it" onclick="exportCategoryCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
        </div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="rp-cat-chart"></canvas></div></div>
      </div>
      <div class="report-card">
        <div class="card-header"><span class="card-title"><i class="bi bi-table"></i>Category Breakdown</span></div>
        <div class="table-wrapper">
          <table class="it-table">
            <thead><tr><th>Category</th><th>Sales (₹)</th><th>Units</th><th>Share %</th></tr></thead>
            <tbody>${catData.map(c=>{
              const total = catData.reduce((s,x)=>s+x.sales,0);
              const share = Math.round((c.sales/total)*100);
              return `<tr><td>${sanitizeHTML(c.category)}</td><td><strong>${formatINR(c.sales)}</strong></td><td>${c.units}</td><td>${share}%</td></tr>`;
            }).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-cat-chart');
    if (canvas) {
      reportChartInstances['cat'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: catData.map(c=>c.category),
          datasets: [{ data: catData.map(c=>c.sales), backgroundColor: ['#2457D6','#D4AF37','#10b981'], borderWidth: 2 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatINR(ctx.parsed)}` } } },
          cutout: '60%'
        }
      });
    }
  }, 50);
}

function renderBrandSalesReport(container) {
  const brandData = [
    { brand: 'Nike',         sales: 78400, units: 29 },
    { brand: 'Adidas',       sales: 52200, units: 18 },
    { brand: 'Puma',         sales: 21000, units: 16 },
    { brand: 'ASICS',        sales: 18500, units:  8 },
    { brand: 'Crocs',        sales: 14900, units: 21 },
    { brand: 'Under Armour', sales:  8700, units: 12 },
    { brand: 'Other',        sales:  5200, units:  7 }
  ];
  container.innerHTML = `
    <div class="report-card">
      <div class="card-header">
        <span class="card-title"><i class="bi bi-bar-chart-steps"></i>Brand-wise Sales (sample)</span>
        <button class="btn-outline-it" onclick="exportBrandCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
      </div>
      <div class="card-body"><div class="chart-wrapper" style="height:280px"><canvas id="rp-brand-chart"></canvas></div></div>
    </div>
    <div class="report-card">
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Brand</th><th>Sales (₹)</th><th>Units Sold</th><th>Avg. Ticket (₹)</th></tr></thead>
          <tbody>${brandData.map(b=>`<tr>
            <td style="font-weight:600">${sanitizeHTML(b.brand)}</td>
            <td>${formatINR(b.sales)}</td>
            <td>${b.units}</td>
            <td>${formatINR(b.sales/b.units)}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-brand-chart');
    if (canvas) {
      reportChartInstances['brand'] = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: brandData.map(b=>b.brand),
          datasets: [{ label: 'Sales (₹)', data: brandData.map(b=>b.sales), backgroundColor: ['#2457D6','#10b981','#D4AF37','#6366f1','#ef4444','#f59e0b','#94a3b8'], borderRadius: 6 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatINR(ctx.parsed.x)}` } } },
          scales: { x: { ticks: { callback: v => formatINRCompact(v) } } }
        }
      });
    }
  }, 50);
}

function renderStockValuationReport(container) {
  const totalPurchaseValue = AppState.products.reduce((s, p) => s + (p.stock * p.purchasePrice), 0);
  const totalSellValue     = AppState.products.reduce((s, p) => s + (p.stock * p.sellingPrice), 0);
  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#2457D6">
        <div class="kpi-card-header"><div><div class="kpi-label">Inventory at Purchase Price</div><div class="kpi-value">${formatINR(totalPurchaseValue)}</div></div><div class="kpi-icon"><i class="bi bi-boxes"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#10b981">
        <div class="kpi-card-header"><div><div class="kpi-label">Inventory at Selling Price</div><div class="kpi-value">${formatINR(totalSellValue)}</div></div><div class="kpi-icon"><i class="bi bi-currency-rupee"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#D4AF37">
        <div class="kpi-card-header"><div><div class="kpi-label">Potential Gross Profit</div><div class="kpi-value">${formatINR(totalSellValue - totalPurchaseValue)}</div></div><div class="kpi-icon"><i class="bi bi-graph-up"></i></div></div>
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
          <tbody>${AppState.products.filter(p=>p.stock>0).sort((a,b)=>(b.stock*b.sellingPrice)-(a.stock*a.sellingPrice)).map(p=>`<tr>
            <td>${sanitizeHTML(p.name)}</td>
            <td><code style="font-size:11px">${sanitizeHTML(p.sku)}</code></td>
            <td>${sanitizeHTML(p.brand)}</td>
            <td>${p.stock}</td>
            <td>${formatINR(p.purchasePrice)}</td>
            <td>${formatINR(p.sellingPrice)}</td>
            <td>${formatINR(p.stock * p.purchasePrice)}</td>
            <td><strong>${formatINR(p.stock * p.sellingPrice)}</strong></td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

function renderLowStockReport(container) {
  const lowStockProds = AppState.products.filter(p => p.stock <= p.lowStockThreshold).sort((a,b) => a.stock - b.stock);
  container.innerHTML = `
    <div class="report-card">
      <div class="card-header">
        <span class="card-title" style="color:var(--warning)"><i class="bi bi-exclamation-triangle"></i>Low Stock Alert — ${lowStockProds.length} products</span>
        <button class="btn-outline-it" onclick="exportLowStockCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
      </div>
      <div class="table-wrapper">
        <table class="it-table">
          <thead><tr><th>Product</th><th>SKU</th><th>Brand</th><th>Category</th><th>Size</th><th>Current Stock</th><th>Threshold</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>${lowStockProds.length ? lowStockProds.map(p=>`<tr>
            <td style="font-weight:600">${sanitizeHTML(p.name)}</td>
            <td><code style="font-size:11px">${sanitizeHTML(p.sku)}</code></td>
            <td>${sanitizeHTML(p.brand)}</td>
            <td>${sanitizeHTML(p.category)}</td>
            <td>${sanitizeHTML(p.size||'—')}</td>
            <td class="${p.stock<=0?'stock-out':'stock-low'}" style="font-weight:700">${p.stock}</td>
            <td>${p.lowStockThreshold}</td>
            <td>${getStockBadge(p)}</td>
            <td><button class="btn-sm-action" onclick="navigateTo('purchases')"><i class="bi bi-cart-plus"></i> Reorder</button></td>
          </tr>`).join('') : `<tr><td colspan="9"><div class="empty-state" style="padding:30px"><i class="bi bi-check-circle" style="color:var(--success)"></i><h4>All products are well-stocked!</h4></div></td></tr>`}</tbody>
        </table>
      </div>
    </div>`;
}

function renderPaymentSummaryReport(container) {
  const methods = ['Cash','UPI','Card','Other'];
  const methodData = methods.map(m => ({
    method: m,
    count: AppState.sales.filter(s => s.paymentMethod === m).length,
    total: AppState.sales.filter(s => s.paymentMethod === m).reduce((s,x) => s + x.amountPaid, 0)
  }));
  const outstanding = AppState.sales.filter(s => s.balance > 0).reduce((s,x) => s + x.balance, 0);
  container.innerHTML = `
    <div class="kpi-grid" style="grid-template-columns:repeat(2,1fr);margin-bottom:20px">
      <div class="kpi-card" style="--kpi-accent:#10b981">
        <div class="kpi-card-header"><div><div class="kpi-label">Total Collected (Sample)</div><div class="kpi-value">${formatINR(AppState.sales.reduce((s,x)=>s+x.amountPaid,0))}</div></div><div class="kpi-icon"><i class="bi bi-cash-stack"></i></div></div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#ef4444">
        <div class="kpi-card-header"><div><div class="kpi-label">Outstanding (Sample)</div><div class="kpi-value">${formatINR(outstanding)}</div></div><div class="kpi-icon"><i class="bi bi-clock-history"></i></div></div>
      </div>
    </div>
    <div class="sections-grid">
      <div class="report-card">
        <div class="card-header"><span class="card-title"><i class="bi bi-pie-chart"></i>Payment Methods (sample)</span></div>
        <div class="card-body"><div class="chart-wrapper"><canvas id="rp-payment-chart"></canvas></div></div>
      </div>
      <div class="report-card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-table"></i>Payment Breakdown</span>
          <button class="btn-outline-it" onclick="exportPaymentCSV()" style="padding:6px 14px;font-size:12.5px"><i class="bi bi-download"></i> CSV</button>
        </div>
        <div class="table-wrapper">
          <table class="it-table">
            <thead><tr><th>Method</th><th>Transactions</th><th>Amount Collected</th></tr></thead>
            <tbody>${methodData.map(m=>`<tr>
              <td><i class="bi bi-${m.method==='Cash'?'cash-coin':m.method==='UPI'?'phone':'credit-card'}"></i> ${sanitizeHTML(m.method)}</td>
              <td>${m.count}</td>
              <td><strong>${formatINR(m.total)}</strong></td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    const canvas = document.getElementById('rp-payment-chart');
    if (canvas) {
      reportChartInstances['payment'] = new Chart(canvas, {
        type: 'pie',
        data: {
          labels: methodData.filter(m=>m.count>0).map(m=>m.method),
          datasets: [{ data: methodData.filter(m=>m.count>0).map(m=>m.total), backgroundColor: ['#10b981','#2457D6','#D4AF37','#94a3b8'], borderWidth: 2 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatINR(ctx.parsed)}` } } }
        }
      });
    }
  }, 50);
}

// CSV Export functions for reports
function exportSalesReportCSV() {
  const data = CHART_DATA[reportFilters.period];
  exportCSV('sales_report.csv', ['Period','Sales (₹)'], data.labels.map((l,i)=>[l, data.sales[i]]));
}
function exportPurchaseReportCSV() {
  const data = CHART_DATA[reportFilters.period];
  exportCSV('purchase_report.csv', ['Period','Purchases (₹)'], data.labels.map((l,i)=>[l, data.purchases[i]]));
}
function exportProfitReportCSV() {
  const data = CHART_DATA[reportFilters.period];
  exportCSV('gross_profit_report.csv', ['Period','Sales (₹)','Purchases (₹)','Gross Profit (₹)'], data.labels.map((l,i)=>[l, data.sales[i], data.purchases[i], data.sales[i]-data.purchases[i]]));
}
function exportCategoryCSV() {
  exportCSV('category_sales.csv', ['Category','Sales (₹)','Units'], [['Shoes','98500','23'],['Sports Dresses','42000','51'],['Slippers','18700','38']]);
}
function exportBrandCSV() {
  exportCSV('brand_sales.csv', ['Brand','Sales (₹)','Units'], [['Nike','78400','29'],['Adidas','52200','18'],['Puma','21000','16'],['ASICS','18500','8'],['Crocs','14900','21'],['Under Armour','8700','12'],['Other','5200','7']]);
}
function exportStockValCSV() {
  exportCSV('stock_valuation.csv',
    ['Product','SKU','Brand','Stock','Purchase Price','Selling Price','Value @ PP','Value @ SP'],
    AppState.products.filter(p=>p.stock>0).map(p=>[p.name,p.sku,p.brand,p.stock,p.purchasePrice,p.sellingPrice,p.stock*p.purchasePrice,p.stock*p.sellingPrice])
  );
}
function exportLowStockCSV() {
  exportCSV('low_stock.csv',
    ['Product','SKU','Brand','Category','Size','Current Stock','Threshold','Status'],
    AppState.products.filter(p=>p.stock<=p.lowStockThreshold).map(p=>[p.name,p.sku,p.brand,p.category,p.size||'',p.stock,p.lowStockThreshold,getStockStatus(p)])
  );
}
function exportPaymentCSV() {
  exportCSV('payment_summary.csv',
    ['Payment Method','Transactions','Amount Collected (₹)'],
    ['Cash','UPI','Card','Other'].map(m=>[m, AppState.sales.filter(s=>s.paymentMethod===m).length, AppState.sales.filter(s=>s.paymentMethod===m).reduce((s,x)=>s+x.amountPaid,0)])
  );
}
