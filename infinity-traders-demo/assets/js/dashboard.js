/**
 * INFINITY TRADERS — Dashboard Module (dashboard.js)
 * ====================================================
 * Renders KPI cards, sales/purchase chart, recent tables,
 * low stock alerts, best-sellers, and category breakdown.
 * 
 * DATA NOTICE: All values are sample analytics for demo.
 */

'use strict';

let dashboardChartInstance = null;
let categoryChartInstance = null;
let currentDashboardPeriod = 'weekly';

function destroyDashboardCharts() {
  if (typeof Chart !== 'undefined') {
    const existingSales = Chart.getChart('sales-chart');
    if (existingSales) {
      try { existingSales.destroy(); } catch (e) { console.warn(e); }
    }
    const existingCat = Chart.getChart('category-chart');
    if (existingCat) {
      try { existingCat.destroy(); } catch (e) { console.warn(e); }
    }
  }
  if (dashboardChartInstance) {
    try { dashboardChartInstance.destroy(); } catch (e) {}
    dashboardChartInstance = null;
  }
  if (categoryChartInstance) {
    try { categoryChartInstance.destroy(); } catch (e) {}
    categoryChartInstance = null;
  }
}

function renderDashboard(container) {
  // Clean up any existing chart instances before re-rendering
  destroyDashboardCharts();
  // ── Compute KPI values ────────────────────────────────────────────
  const today = todayISO();
  const todaySales = AppState.sales
    .filter(s => s.date === today)
    .reduce((sum, s) => sum + s.grandTotal, 0);

  // This week (last 7 days including today)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
  const weekAgoISO = weekAgo.toISOString().split('T')[0];
  const prevWeekStart = new Date(); prevWeekStart.setDate(prevWeekStart.getDate() - 13);
  const prevWeekEnd   = new Date(); prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);

  const thisWeekSales = AppState.sales
    .filter(s => s.date >= weekAgoISO && s.date <= today)
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const thisWeekPurchases = AppState.purchases
    .filter(p => p.date >= weekAgoISO && p.date <= today)
    .reduce((sum, p) => sum + p.totalAmount, 0);

  const estimatedProfit = thisWeekSales - thisWeekPurchases;

  const totalProducts = AppState.products.length;
  const lowStockCount = AppState.products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  const outOfStockCount = AppState.products.filter(p => p.stock <= 0).length;

  container.innerHTML = `
  <div class="page-section">
    <!-- Demo Banner -->
    <div class="demo-banner">
      <i class="bi bi-info-circle-fill"></i>
      <span><strong>Demo Mode:</strong> All KPI values, charts, and records are <em>sample data</em> for demonstration purposes. Data resets on page refresh. No real business data is stored.</span>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid" id="kpi-grid">
      <div class="kpi-card" style="--kpi-accent:#2457D6;--kpi-icon-bg:#e8eefb">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Today's Sales</div>
            <div class="kpi-value">${formatINR(todaySales || 7499)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-bag-check"></i></div>
        </div>
        <span class="kpi-change up"><i class="bi bi-arrow-up-short"></i>+12.4%</span>
        <div class="kpi-change-note">vs. yesterday · sample</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#10b981;--kpi-icon-bg:#d1fae5">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">This Week's Sales</div>
            <div class="kpi-value">${formatINR(thisWeekSales || 42308)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-graph-up-arrow"></i></div>
        </div>
        <span class="kpi-change up"><i class="bi bi-arrow-up-short"></i>+8.7%</span>
        <div class="kpi-change-note">vs. last week · sample</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#f59e0b;--kpi-icon-bg:#fef3c7">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">This Week's Purchases</div>
            <div class="kpi-value">${formatINR(thisWeekPurchases || 63200)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-box-seam"></i></div>
        </div>
        <span class="kpi-change down"><i class="bi bi-arrow-down-short"></i>-3.2%</span>
        <div class="kpi-change-note">vs. last week · sample</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#D4AF37;--kpi-icon-bg:rgba(212,175,55,0.12)">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Est. Gross Profit</div>
            <div class="kpi-value">${formatINR(estimatedProfit > 0 ? estimatedProfit : 18450)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-currency-rupee"></i></div>
        </div>
        <span class="kpi-change up"><i class="bi bi-arrow-up-short"></i>+5.1%</span>
        <div class="kpi-change-note">week-over-week · sample</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#6366f1;--kpi-icon-bg:#ede9fe">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Total Products</div>
            <div class="kpi-value">${totalProducts} <span style="font-size:13px;color:var(--text-muted)">variants</span></div>
          </div>
          <div class="kpi-icon"><i class="bi bi-grid-3x3-gap"></i></div>
        </div>
        <div class="kpi-subtitle">${AppState.products.filter(p=>p.stock>0).length} in stock</div>
      </div>
      <div class="kpi-card" style="--kpi-accent:#ef4444;--kpi-icon-bg:#fee2e2">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Low / Out of Stock</div>
            <div class="kpi-value">${lowStockCount} <span style="font-size:13px;color:var(--text-muted)">low</span></div>
          </div>
          <div class="kpi-icon"><i class="bi bi-exclamation-triangle"></i></div>
        </div>
        <div class="kpi-subtitle" style="color:var(--danger)">${outOfStockCount} out of stock</div>
      </div>
    </div>

    <!-- Chart + Quick Actions row -->
    <div class="sections-grid" style="margin-bottom:20px">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-bar-chart-line"></i>Sales &amp; Purchase Analytics <span style="font-size:11px;color:var(--text-muted);font-weight:400">(sample data)</span></span>
          <div class="chart-filter-group" id="chart-period-btns">
            <button class="chart-filter-btn active" data-period="weekly">Weekly</button>
            <button class="chart-filter-btn" data-period="monthly">Monthly</button>
            <button class="chart-filter-btn" data-period="yearly">Yearly</button>
          </div>
        </div>
        <div class="card-body">
          <div class="chart-wrapper"><canvas id="sales-chart" role="img" aria-label="Sales and Purchases comparison chart"></canvas></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="bi bi-lightning-charge"></i>Quick Actions</span></div>
          <div class="card-body">
            <div class="quick-actions">
              <button class="quick-action-btn" onclick="navigateTo('billing')"><i class="bi bi-receipt-cutoff"></i><span>New Bill</span></button>
              <button class="quick-action-btn" onclick="navigateTo('purchases')"><i class="bi bi-cart-plus"></i><span>Add Purchase</span></button>
              <button class="quick-action-btn" onclick="navigateTo('inventory')"><i class="bi bi-plus-circle"></i><span>Add Product</span></button>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="bi bi-pie-chart"></i>Sales by Category <span style="font-size:11px;color:var(--text-muted);font-weight:400">(sample)</span></span></div>
          <div class="card-body" style="padding:16px 20px 20px">
            <div class="chart-wrapper category-chart-wrapper" style="height:220px;position:relative"><canvas id="category-chart" role="img" aria-label="Sales by Category breakdown doughnut chart"></canvas></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3-column row: Recent Sales, Recent Purchases, Low Stock -->
    <div class="sections-grid-3" style="margin-bottom:20px">
      <!-- Recent Sales -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-bag"></i>Recent Sales</span>
          <button class="btn-ghost" style="font-size:12px" onclick="navigateTo('sales-history')">View All <i class="bi bi-chevron-right"></i></button>
        </div>
        <div id="recent-sales-list"></div>
      </div>
      <!-- Recent Purchases -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-truck"></i>Recent Purchases</span>
          <button class="btn-ghost" style="font-size:12px" onclick="navigateTo('purchase-history')">View All <i class="bi bi-chevron-right"></i></button>
        </div>
        <div id="recent-purchases-list"></div>
      </div>
      <!-- Low Stock Alerts -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-exclamation-triangle" style="color:var(--warning)"></i>Low Stock Alerts</span>
          <button class="btn-ghost" style="font-size:12px" onclick="navigateTo('inventory')">Manage <i class="bi bi-chevron-right"></i></button>
        </div>
        <div id="low-stock-list"></div>
      </div>
    </div>

    <!-- Best Sellers -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header"><span class="card-title"><i class="bi bi-trophy"></i>Best-Selling Products <span style="font-size:11px;color:var(--text-muted);font-weight:400">(sample data)</span></span></div>
      <div class="card-body">
        <div id="best-sellers-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0 20px"></div>
      </div>
    </div>
  </div>`;

  renderDashboardLists();

  // Period filter buttons
  currentDashboardPeriod = 'weekly';
  const filterBtns = document.querySelectorAll('#chart-period-btns .chart-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDashboardPeriod = btn.dataset.period || 'weekly';
      initDashboardChart(currentDashboardPeriod);
    });
  });

  // Ensure DOM is painted and containers have computed width & height before initializing charts
  requestAnimationFrame(() => {
    setTimeout(() => {
      initDashboardChart('weekly');
      initCategoryChart();
    }, 30);
  });
}

function renderDashboardLists() {
  // Recent Sales
  const recentSales = [...AppState.sales].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  const rsEl = document.getElementById('recent-sales-list');
  if (rsEl) {
    if (!recentSales.length) {
      rsEl.innerHTML = `<div class="empty-state" style="padding:30px"><i class="bi bi-bag"></i><p>No sales yet.</p></div>`;
    } else {
      rsEl.innerHTML = recentSales.map(s => `
        <div class="low-stock-item" style="padding:10px 18px">
          <div>
            <div class="low-stock-info"><span class="name">${sanitizeHTML(s.invoiceNo)}</span></div>
            <div class="low-stock-info"><span class="sku">${sanitizeHTML(s.customer)} · ${formatDate(s.date)}</span></div>
          </div>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--primary)">${formatINR(s.grandTotal)}</div>
            <div style="text-align:right">${paymentBadge(s.paymentStatus)}</div>
          </div>
        </div>`).join('');
    }
  }

  // Recent Purchases
  const recentPurchases = [...AppState.purchases].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  const rpEl = document.getElementById('recent-purchases-list');
  if (rpEl) {
    if (!recentPurchases.length) {
      rpEl.innerHTML = `<div class="empty-state" style="padding:30px"><i class="bi bi-truck"></i><p>No purchases yet.</p></div>`;
    } else {
      rpEl.innerHTML = recentPurchases.map(p => `
        <div class="low-stock-item" style="padding:10px 18px">
          <div>
            <div class="low-stock-info"><span class="name">${sanitizeHTML(p.purchaseInvoice)}</span></div>
            <div class="low-stock-info"><span class="sku">${sanitizeHTML(p.supplierName)} · ${formatDate(p.date)}</span></div>
          </div>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--warning)">${formatINR(p.totalAmount)}</div>
            <div style="text-align:right">${paymentBadge(p.paymentStatus)}</div>
          </div>
        </div>`).join('');
    }
  }

  // Low Stock
  const lowStock = AppState.products
    .filter(p => p.stock <= p.lowStockThreshold)
    .sort((a,b) => a.stock - b.stock)
    .slice(0, 6);
  const lsEl = document.getElementById('low-stock-list');
  if (lsEl) {
    if (!lowStock.length) {
      lsEl.innerHTML = `<div class="empty-state" style="padding:30px"><i class="bi bi-check-circle" style="color:var(--success)"></i><p>All items are well-stocked!</p></div>`;
    } else {
      lsEl.innerHTML = lowStock.map(p => `
        <div class="low-stock-item" style="padding:10px 18px">
          <div class="low-stock-info">
            <div class="name">${sanitizeHTML(p.name)}</div>
            <div class="sku">${sanitizeHTML(p.sku)}</div>
          </div>
          <div class="low-stock-qty ${p.stock <= 0 ? 'zero' : 'low'}">${p.stock <= 0 ? 'Out' : p.stock + ' left'}</div>
        </div>`).join('');
    }
  }

  // Best Sellers
  const bestSellers = [
    { name: 'Nike Air Zoom Pegasus 40', category: 'Running Shoes', sold: 8,  revenue: 59992 },
    { name: 'Crocs Classic Clog',       category: 'Slippers',      sold: 7,  revenue: 17493 },
    { name: 'Nike Dri-FIT T-Shirt',     category: 'T-Shirts',      sold: 6,  revenue:  8994 },
    { name: 'Adidas Ultraboost 23',     category: 'Running Shoes', sold: 5,  revenue: 47495 },
    { name: 'Nike Air Force 1',         category: 'Sneakers',      sold: 4,  revenue: 23996 }
  ];
  const bsEl = document.getElementById('best-sellers-list');
  if (bsEl) {
    bsEl.innerHTML = bestSellers.map((p, i) => `
      <div class="best-sell-item">
        <div class="best-sell-rank ${i === 0 ? 'rank-1' : ''}">${i + 1}</div>
        <div class="best-sell-info">
          <div class="name">${sanitizeHTML(p.name)}</div>
          <div class="cat">${sanitizeHTML(p.category)} · ${p.sold} units</div>
        </div>
        <div class="best-sell-val">${formatINR(p.revenue)}</div>
      </div>`).join('');
  }
}

function paymentBadge(status) {
  const map = { Paid: 'badge-paid', Unpaid: 'badge-unpaid', Partial: 'badge-partial' };
  return `<span class="badge-status ${map[status] || 'badge-primary'}">${sanitizeHTML(status)}</span>`;
}

function initDashboardChart(period) {
  const canvas = document.getElementById('sales-chart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded yet. Retrying chart initialization...');
    setTimeout(() => initDashboardChart(period), 100);
    return;
  }

  // Destroy existing chart on canvas or in variable to prevent duplicates
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    try { existingChart.destroy(); } catch (e) { console.warn(e); }
  }
  if (dashboardChartInstance) {
    try { dashboardChartInstance.destroy(); } catch (e) {}
    dashboardChartInstance = null;
  }

  const p = period || 'weekly';
  const data = CHART_DATA[p] || CHART_DATA.weekly;

  try {
    dashboardChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Sales (₹)',
            data: data.sales,
            backgroundColor: '#2457D6',
            hoverBackgroundColor: '#1d4ed8',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.72,
            categoryPercentage: 0.68
          },
          {
            label: 'Purchases (₹)',
            data: data.purchases,
            backgroundColor: '#D4AF37',
            hoverBackgroundColor: '#c29d2b',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.72,
            categoryPercentage: 0.68
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: {
            position: 'top',
            align: 'end',
            labels: {
              font: { family: "'Inter', system-ui, sans-serif", size: 12, weight: '500' },
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: "'Inter', system-ui, sans-serif", size: 12, weight: '600' },
            bodyFont: { family: "'Inter', system-ui, sans-serif", size: 12 },
            padding: 10,
            cornerRadius: 6,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${formatINR(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { family: "'Inter', system-ui, sans-serif", size: 11 },
              color: '#64748b'
            }
          },
          y: {
            grid: { color: 'rgba(226, 232, 240, 0.8)' },
            ticks: {
              callback: v => formatINRCompact(v),
              font: { family: "'Inter', system-ui, sans-serif", size: 11 },
              color: '#64748b'
            }
          }
        }
      }
    });
  } catch (err) {
    console.error('Failed to initialize sales & purchase chart:', err);
  }
}

function initCategoryChart() {
  const canvas = document.getElementById('category-chart');
  if (!canvas) return;

  if (typeof Chart === 'undefined') {
    console.warn('Chart.js is not loaded yet. Retrying category chart initialization...');
    setTimeout(() => initCategoryChart(), 100);
    return;
  }

  // Destroy existing chart on canvas or in variable to prevent duplicates
  const existingChart = Chart.getChart(canvas);
  if (existingChart) {
    try { existingChart.destroy(); } catch (e) { console.warn(e); }
  }
  if (categoryChartInstance) {
    try { categoryChartInstance.destroy(); } catch (e) {}
    categoryChartInstance = null;
  }

  try {
    categoryChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Shoes', 'Sports Dresses', 'Slippers'],
        datasets: [{
          data: [48, 35, 17],
          backgroundColor: ['#2457D6', '#D4AF37', '#10b981'],
          hoverBackgroundColor: ['#1d4ed8', '#c29d2b', '#059669'],
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: "'Inter', system-ui, sans-serif", size: 11.5, weight: '500' },
              padding: 14,
              boxWidth: 12,
              boxHeight: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              color: '#334155'
            }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleFont: { family: "'Inter', system-ui, sans-serif", size: 12, weight: '600' },
            bodyFont: { family: "'Inter', system-ui, sans-serif", size: 12 },
            padding: 10,
            cornerRadius: 6,
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.parsed}% of sales (sample)`
            }
          }
        },
        cutout: '62%'
      }
    });
  } catch (err) {
    console.error('Failed to initialize category chart:', err);
  }
}
