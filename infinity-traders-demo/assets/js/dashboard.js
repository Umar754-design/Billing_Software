/**
 * INFINITY TRADERS — Dashboard Module (dashboard.js)
 * ====================================================
 * Renders KPI cards (all 8 cards interactive with detailed drill-down modals),
 * sales/purchase chart, category breakdown, quick actions, and activity lists.
 * Backed by live MySQL aggregate queries via PHP API (api/dashboard/stats.php).
 */

'use strict';

let dashboardChartInstance = null;
let categoryChartInstance = null;
let currentDashboardPeriod = 'weekly';
let currentDashboardData = null;

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

function getWeekAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().split('T')[0];
}

async function ensureDashboardData() {
  if (currentDashboardData && currentDashboardData.kpi) {
    return currentDashboardData;
  }
  try {
    const res = await apiGet('api/dashboard/stats.php');
    if (res && res.success && res.data) {
      currentDashboardData = res.data;
      return currentDashboardData;
    }
  } catch (err) {
    console.error('Failed to fetch dashboard stats in ensureDashboardData:', err);
  }
  return currentDashboardData || {};
}

async function renderDashboard(container) {
  // Clean up any existing chart instances before re-rendering
  destroyDashboardCharts();
  renderLoadingSpinner(container);

  let data = null;
  try {
    const res = await apiGet('api/dashboard/stats.php');
    if (res.success && res.data) {
      data = res.data;
    }
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err);
  }

  // Fallback defaults if API fails
  if (!data) {
    data = {
      kpi: {
        today_sales: 0,
        today_sales_count: 0,
        today_sales_paid: 0,
        today_sales_due: 0,
        today_sales_cash: 0,
        today_sales_upi: 0,
        today_sales_other: 0,
        today_customers_count: 0,
        this_week_sales: 0,
        this_week_sales_count: 0,
        this_week_sales_paid: 0,
        this_week_sales_due: 0,
        this_week_purchases: 0,
        this_week_purchases_count: 0,
        this_week_purchases_paid: 0,
        this_week_purchases_due: 0,
        estimated_profit: 0,
        profit_margin_pct: 0,
        total_products: AppState.products?.length || 0,
        in_stock_count: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        total_stock_units: 0,
        inventory_cost_val: 0,
        inventory_retail_val: 0,
        total_returns_amount: 0,
        total_returns_count: 0,
        total_returns_items: 0,
        today_returns_amount: 0,
        today_returns_count: 0,
        this_week_returns_amount: 0,
        this_week_returns_count: 0
      },
      charts: {
        weekly: { labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'], sales: [0,0,0,0,0,0,0], purchases: [0,0,0,0,0,0,0] },
        monthly: { labels: ['Jan','Feb','Mar','Apr','May','Jun'], sales: [0,0,0,0,0,0], purchases: [0,0,0,0,0,0] },
        yearly: { labels: ['2023','2024','2025','2026'], sales: [0,0,0,0], purchases: [0,0,0,0] },
        category: []
      },
      today_customers: [],
      today_sales_list: [],
      this_week_sales_list: [],
      this_week_purchases_list: [],
      returns_list: [],
      all_low_stock_products: [],
      products_list: [],
      category_distribution: [],
      recent_sales: [],
      recent_purchases: [],
      low_stock_products: [],
      best_sellers: []
    };
  }

  currentDashboardData = data;
  const kpi = data.kpi;

  container.innerHTML = `
  <div class="page-section">
    <!-- KPI Cards (All 8 are interactive & clickable for full details) -->
    <div class="kpi-grid" id="kpi-grid">
      <!-- 1. Today's Sales -->
      <div class="kpi-card kpi-card-clickable" id="kpi-today-sales" style="--kpi-accent:#2457D6;--kpi-icon-bg:#e8eefb" title="Click to view full breakdown of Today's Sales" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Today's Sales</div>
            <div class="kpi-value">${formatINR(kpi.today_sales || 0)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-bag-check"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="kpi-change ${(kpi.today_sales || 0) > 0 ? 'up' : 'neutral'}">
            <i class="bi ${(kpi.today_sales || 0) > 0 ? 'bi-arrow-up-short' : 'bi-dash'}"></i>${(kpi.today_sales_count || 0) > 0 ? (kpi.today_sales_count + ((kpi.today_sales_count === 1) ? ' bill' : ' bills')) : 'No sales today'}
          </span>
          <span style="font-size:11px;color:var(--text-muted)">today</span>
        </div>
        <div class="kpi-click-cue">
          <span>View today's bills</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>

      <!-- 2. Today's Customers -->
      <div class="kpi-card kpi-card-clickable" id="kpi-today-customers" style="--kpi-accent:#0ea5e9;--kpi-icon-bg:#e0f2fe" title="Click to view Today's Customers details" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Today's Customers</div>
            <div class="kpi-value">${kpi.today_customers_count || 0} <span style="font-size:13px;color:var(--text-muted);font-weight:500">${(kpi.today_customers_count === 1) ? 'visitor' : 'visitors'}</span></div>
          </div>
          <div class="kpi-icon"><i class="bi bi-people-fill"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="kpi-change ${(kpi.today_customers_count || 0) > 0 ? 'up' : 'neutral'}">
            <i class="bi ${(kpi.today_customers_count || 0) > 0 ? 'bi-person-check-fill' : 'bi-box-arrow-up-right'}"></i>${(kpi.today_customers_count || 0) > 0 ? 'Active Today' : 'No visitors'}
          </span>
          <span style="font-size:11px;color:var(--text-muted)">today</span>
        </div>
        <div class="kpi-click-cue">
          <span>View customer logs</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>

      <!-- 3. This Week's Sales -->
      <div class="kpi-card kpi-card-clickable" id="kpi-week-sales" style="--kpi-accent:#10b981;--kpi-icon-bg:#d1fae5" title="Click to view full breakdown of This Week's Sales" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">This Week's Sales</div>
            <div class="kpi-value">${formatINR(kpi.this_week_sales || 0)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-graph-up-arrow"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="kpi-change ${(kpi.this_week_sales || 0) > 0 ? 'up' : 'neutral'}">
            <i class="bi ${(kpi.this_week_sales || 0) > 0 ? 'bi-arrow-up-short' : 'bi-dash'}"></i>${(kpi.this_week_sales_count || 0)} bills this week
          </span>
          <span style="font-size:11px;color:var(--text-muted)">7 days</span>
        </div>
        <div class="kpi-click-cue">
          <span>Weekly sales breakdown</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>

      <!-- 4. This Week's Purchases -->
      <div class="kpi-card kpi-card-clickable" id="kpi-week-purchases" style="--kpi-accent:#f59e0b;--kpi-icon-bg:#fef3c7" title="Click to view full breakdown of This Week's Purchases" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">This Week's Purchases</div>
            <div class="kpi-value">${formatINR(kpi.this_week_purchases || 0)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-box-seam"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="kpi-change ${(kpi.this_week_purchases || 0) > 0 ? 'up' : 'neutral'}">
            <i class="bi ${(kpi.this_week_purchases || 0) > 0 ? 'bi-arrow-up-short' : 'bi-dash'}"></i>${(kpi.this_week_purchases_count || 0)} POs this week
          </span>
          <span style="font-size:11px;color:var(--text-muted)">7 days</span>
        </div>
        <div class="kpi-click-cue">
          <span>Weekly purchases list</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>

      <!-- 5. Est. Gross Profit -->
      <div class="kpi-card kpi-card-clickable" id="kpi-est-profit" style="--kpi-accent:#D4AF37;--kpi-icon-bg:rgba(212,175,55,0.12)" title="Click to view Gross Profit & Margin calculations" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Est. Gross Profit</div>
            <div class="kpi-value">${formatINR(kpi.estimated_profit || 0)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-currency-rupee"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="kpi-change ${(kpi.estimated_profit || 0) >= 0 ? 'up' : 'down'}">
            <i class="bi ${(kpi.estimated_profit || 0) >= 0 ? 'bi-arrow-up-short' : 'bi-arrow-down-short'}"></i>${(kpi.profit_margin_pct !== undefined) ? (kpi.profit_margin_pct + '% margin') : ((kpi.estimated_profit >= 0) ? 'Net positive' : 'Net negative')}
          </span>
          <span style="font-size:11px;color:var(--text-muted)">this week</span>
        </div>
        <div class="kpi-click-cue">
          <span>Profit & margin breakdown</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>

      <!-- 6. Total Products -->
      <div class="kpi-card kpi-card-clickable" id="kpi-total-products" style="--kpi-accent:#6366f1;--kpi-icon-bg:#ede9fe" title="Click to view Product Catalog & Inventory Valuation" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Total Products</div>
            <div class="kpi-value">${kpi.total_products || 0} <span style="font-size:13px;color:var(--text-muted)">items</span></div>
          </div>
          <div class="kpi-icon"><i class="bi bi-grid-3x3-gap"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="kpi-subtitle" style="margin:0">${kpi.in_stock_count || 0} in stock (${kpi.total_stock_units || 0} units)</div>
        </div>
        <div class="kpi-click-cue">
          <span>Catalog & valuation</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>

      <!-- 7. Low / Out of Stock -->
      <div class="kpi-card kpi-card-clickable" id="kpi-low-stock" style="--kpi-accent:#ef4444;--kpi-icon-bg:#fee2e2" title="Click to view Low Stock & Out of Stock Alerts" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Low / Out of Stock</div>
            <div class="kpi-value">${(kpi.low_stock_count || 0) + (kpi.out_of_stock_count || 0)} <span style="font-size:13px;color:var(--text-muted)">alerts</span></div>
          </div>
          <div class="kpi-icon"><i class="bi bi-exclamation-triangle"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="kpi-subtitle" style="color:var(--danger);margin:0">${kpi.out_of_stock_count || 0} out of stock · ${kpi.low_stock_count || 0} low</div>
        </div>
        <div class="kpi-click-cue">
          <span>Replenish & reorder</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>

      <!-- 8. Total Return (NEW MODULE!) -->
      <div class="kpi-card kpi-card-clickable" id="kpi-total-returns" style="--kpi-accent:#e11d48;--kpi-icon-bg:#ffe4e6" title="Click to view Sales Returns & Refund details" role="button" tabindex="0">
        <div class="kpi-card-header">
          <div>
            <div class="kpi-label">Total Return</div>
            <div class="kpi-value">${formatINR(kpi.total_returns_amount || 0)}</div>
          </div>
          <div class="kpi-icon"><i class="bi bi-arrow-counterclockwise"></i></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="kpi-change ${(kpi.total_returns_count || 0) > 0 ? 'down' : 'neutral'}" style="background:#fff1f2;color:#e11d48">
            <i class="bi bi-arrow-return-left"></i>${(kpi.total_returns_count || 0)} returns (${kpi.total_returns_items || 0} items)
          </span>
          <span style="font-size:11px;color:var(--text-muted)">all-time</span>
        </div>
        <div class="kpi-click-cue">
          <span>Return receipts & items</span>
          <i class="bi bi-arrow-right-short"></i>
        </div>
      </div>
    </div>

    <!-- Chart + Quick Actions row -->
    <div class="sections-grid" style="margin-bottom:20px">
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="bi bi-bar-chart-line"></i>Sales &amp; Purchase Analytics</span>
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
          <div class="card-header"><span class="card-title"><i class="bi bi-pie-chart"></i>Sales by Category</span></div>
          <div class="card-body" style="padding:16px 20px 20px">
            <div class="chart-wrapper category-chart-wrapper" style="height:220px;position:relative"><canvas id="category-chart" role="img" aria-label="Sales by Category breakdown doughnut chart"></canvas></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 4-column row: Today's Customers, Recent Sales, Recent Purchases, Low Stock -->
    <div class="dashboard-activity-grid" style="margin-bottom:20px">
      <!-- Today's Customers -->
      <div class="card">
        <div class="card-header" style="cursor:pointer" onclick="openTodayCustomersModal()" title="Click to view all today's customers">
          <span class="card-title"><i class="bi bi-people" style="color:#0ea5e9"></i>Today's Customers (${(data.today_customers || []).length})</span>
          <button class="btn-ghost" style="font-size:12px" onclick="event.stopPropagation(); openTodayCustomersModal()">View All <i class="bi bi-chevron-right"></i></button>
        </div>
        <div id="today-customers-list"></div>
      </div>
      <!-- Recent Sales -->
      <div class="card">
        <div class="card-header" style="cursor:pointer" onclick="openWeekSalesModal()" title="Click to view sales breakdown">
          <span class="card-title"><i class="bi bi-bag" style="color:var(--primary)"></i>Recent Sales</span>
          <button class="btn-ghost" style="font-size:12px" onclick="event.stopPropagation(); navigateTo('sales-history')">View All <i class="bi bi-chevron-right"></i></button>
        </div>
        <div id="recent-sales-list"></div>
      </div>
      <!-- Recent Purchases -->
      <div class="card">
        <div class="card-header" style="cursor:pointer" onclick="openWeekPurchasesModal()" title="Click to view purchases breakdown">
          <span class="card-title"><i class="bi bi-truck" style="color:#f59e0b"></i>Recent Purchases</span>
          <button class="btn-ghost" style="font-size:12px" onclick="event.stopPropagation(); navigateTo('purchase-history')">View All <i class="bi bi-chevron-right"></i></button>
        </div>
        <div id="recent-purchases-list"></div>
      </div>
      <!-- Low Stock Alerts -->
      <div class="card">
        <div class="card-header" style="cursor:pointer" onclick="openLowStockModal()" title="Click to view all stock alerts">
          <span class="card-title"><i class="bi bi-exclamation-triangle" style="color:var(--warning)"></i>Low Stock Alerts</span>
          <button class="btn-ghost" style="font-size:12px" onclick="event.stopPropagation(); openLowStockModal()">Manage <i class="bi bi-chevron-right"></i></button>
        </div>
        <div id="low-stock-list"></div>
      </div>
    </div>

    <!-- Best Sellers -->
    <div class="card" style="margin-bottom:20px">
      <div class="card-header" style="cursor:pointer" onclick="openTotalProductsModal()" title="Click to view product catalog">
        <span class="card-title"><i class="bi bi-trophy" style="color:#D4AF37"></i>Best-Selling Products</span>
        <button class="btn-ghost" style="font-size:12px" onclick="event.stopPropagation(); openTotalProductsModal()">View All Items <i class="bi bi-chevron-right"></i></button>
      </div>
      <div class="card-body">
        <div id="best-sellers-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0 20px"></div>
      </div>
    </div>
  </div>`;

  renderDashboardLists(data);

  // Wire Click and Keyboard listeners to all 8 KPI cards
  const kpiBindings = [
    { id: 'kpi-today-sales', fn: openTodaySalesModal },
    { id: 'kpi-today-customers', fn: openTodayCustomersModal },
    { id: 'kpi-week-sales', fn: openWeekSalesModal },
    { id: 'kpi-week-purchases', fn: openWeekPurchasesModal },
    { id: 'kpi-est-profit', fn: openProfitModal },
    { id: 'kpi-total-products', fn: openTotalProductsModal },
    { id: 'kpi-low-stock', fn: openLowStockModal },
    { id: 'kpi-total-returns', fn: openTotalReturnsModal }
  ];

  kpiBindings.forEach(({ id, fn }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', () => fn());
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    });
  });

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
    }, 40);
  });
}

function renderDashboardLists(data) {
  // Today's Customers List
  const todayCustomers = data.today_customers || [];
  const tcEl = document.getElementById('today-customers-list');
  if (tcEl) {
    if (!todayCustomers.length) {
      tcEl.innerHTML = `
        <div class="empty-state" style="padding:28px 16px;text-align:center">
          <div style="width:44px;height:44px;border-radius:50%;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:20px">
            <i class="bi bi-person-x"></i>
          </div>
          <div style="font-weight:600;font-size:13px;color:var(--text-dark)">No customers today yet</div>
          <p style="font-size:12px;color:var(--text-muted);margin:4px 0 12px">Customers from today's billing will appear here.</p>
          <button class="btn-primary-it" style="font-size:12px;padding:6px 14px;margin:0 auto" onclick="navigateTo('billing')">
            <i class="bi bi-plus"></i> New Bill
          </button>
        </div>
      `;
    } else {
      tcEl.innerHTML = todayCustomers.slice(0, 5).map(c => {
        const initials = getInitials(c.name);
        return `
        <div class="low-stock-item clickable-row" style="padding:10px 18px;cursor:pointer" onclick="openCustomerDetailModal({ id: ${c.customer_id || 0}, name: '${escapeAttr(c.name)}' })" title="Click to view full details of ${escapeAttr(c.name)}">
          <div style="display:flex;align-items:center;gap:12px;min-width:0">
            <div class="cust-avatar-circle" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg, #0284c7, #38bdf8);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">
              ${initials}
            </div>
            <div style="min-width:0">
              <div class="low-stock-info">
                <span class="name" style="font-weight:600;color:var(--text-dark);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${sanitizeHTML(c.name)}</span>
              </div>
              <div class="low-stock-info">
                <span class="sku" style="font-size:11.5px;color:var(--text-muted)">
                  ${c.phone ? `<i class="bi bi-telephone"></i> ${sanitizeHTML(c.phone)} · ` : ''}${c.invoices_count} ${c.invoices_count > 1 ? 'bills' : 'bill'}
                </span>
              </div>
            </div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-weight:700;font-size:13px;color:#0284c7">${formatINR(c.total_spent_today)}</div>
            <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:2px">
              <span class="badge-status ${c.total_balance_today > 0 ? 'badge-partial' : 'badge-paid'}" style="font-size:10px;padding:2px 6px">
                ${c.total_balance_today > 0 ? 'Due ' + formatINR(c.total_balance_today) : 'Paid'}
              </span>
              ${c.total_balance_today > 0 ? `
                <button class="btn-sm-action text-danger" style="font-size:10px;padding:1px 6px;border-color:#fca5a5;background:#fef2f2;font-weight:600" onclick="event.stopPropagation(); openClearDueModal({ customerId: ${c.customer_id || 0}, customerName: '${escapeAttr(c.name)}', dueAmount: ${c.total_balance_today} })" title="Clear customer due">
                  <i class="bi bi-cash-stack"></i> Pay
                </button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      }).join('');
    }
  }

  // Recent Sales (Clickable row opens invoice preview!)
  const recentSales = data.recent_sales || [];
  const rsEl = document.getElementById('recent-sales-list');
  if (rsEl) {
    if (!recentSales.length) {
      rsEl.innerHTML = `<div class="empty-state" style="padding:30px"><i class="bi bi-bag"></i><p>No sales yet.</p></div>`;
    } else {
      rsEl.innerHTML = recentSales.map(s => {
        const custName = s.customer_name || s.customer || 'Walk-in';
        const custId = s.customer_id || s.customerId || 0;
        const dueAmt = parseFloat(s.balance_due !== undefined ? s.balance_due : (s.balance || 0));
        return `
        <div class="low-stock-item clickable-row" style="padding:10px 18px;cursor:pointer" onclick="viewSaleInvoice(${s.id})" title="Click to view invoice ${escapeAttr(s.invoice_no || s.invoiceNo)}">
          <div>
            <div class="low-stock-info"><span class="name" style="font-weight:700;color:var(--primary)">${sanitizeHTML(s.invoice_no || s.invoiceNo)}</span></div>
            <div class="low-stock-info">
              <span class="sku">
                <a href="javascript:void(0)" class="clickable-cust-link" onclick="event.stopPropagation(); openCustomerDetailModal({ id: ${custId}, name: '${escapeAttr(custName)}' })" title="Click to view customer details" style="color:var(--text-dark);font-weight:600;text-decoration:none">
                  <i class="bi bi-person"></i> ${sanitizeHTML(custName)}
                </a> · ${formatDate(s.date)}
              </span>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:700;font-size:13px;color:var(--primary)">${formatINR(s.grand_total || s.grandTotal)}</div>
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px;margin-top:2px">
              ${paymentBadge(s.payment_status || s.paymentStatus)}
              ${dueAmt > 0 ? `
                <button class="btn-sm-action text-danger" style="font-size:10px;padding:1px 6px;border-color:#fca5a5;background:#fef2f2;font-weight:600" onclick="event.stopPropagation(); openClearDueModal({ customerId: ${custId}, customerName: '${escapeAttr(custName)}', invoiceId: ${s.id || 0}, invoiceNo: '${escapeAttr(s.invoice_no || s.invoiceNo)}', dueAmount: ${dueAmt} })" title="Clear due for this bill">
                  <i class="bi bi-cash-stack"></i> Pay Due
                </button>
              ` : ''}
            </div>
          </div>
        </div>`;
      }).join('');
    }
  }

  // Recent Purchases (Clickable row opens purchase preview!)
  const recentPurchases = data.recent_purchases || [];
  const rpEl = document.getElementById('recent-purchases-list');
  if (rpEl) {
    if (!recentPurchases.length) {
      rpEl.innerHTML = `<div class="empty-state" style="padding:30px"><i class="bi bi-truck"></i><p>No purchases yet.</p></div>`;
    } else {
      rpEl.innerHTML = recentPurchases.map(p => `
        <div class="low-stock-item clickable-row" style="padding:10px 18px;cursor:pointer" onclick="viewPurchaseDetail(${p.id})" title="Click to view purchase order ${escapeAttr(p.purchase_no || p.purchaseInvoice || '')}">
          <div>
            <div class="low-stock-info"><span class="name" style="font-weight:700;color:var(--warning)">${sanitizeHTML(p.purchase_no || p.purchaseInvoice)}</span></div>
            <div class="low-stock-info"><span class="sku">${sanitizeHTML(p.supplier_name || p.supplier || 'Supplier')} · ${formatDate(p.date)}</span></div>
          </div>
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--warning)">${formatINR(p.total_amount || p.totalAmount)}</div>
            <div style="text-align:right">${paymentBadge(p.payment_status || p.paymentStatus)}</div>
          </div>
        </div>`).join('');
    }
  }

  // Low Stock (Clickable row opens Low Stock modal)
  const lowStock = data.low_stock_products || [];
  const lsEl = document.getElementById('low-stock-list');
  if (lsEl) {
    if (!lowStock.length) {
      lsEl.innerHTML = `<div class="empty-state" style="padding:30px"><i class="bi bi-check-circle" style="color:var(--success)"></i><p>All items are well-stocked!</p></div>`;
    } else {
      lsEl.innerHTML = lowStock.map(p => `
        <div class="low-stock-item clickable-row" style="padding:10px 18px;cursor:pointer" onclick="openLowStockModal()" title="Click to view all stock alerts">
          <div class="low-stock-info">
            <div class="name">${sanitizeHTML(p.name)}</div>
            <div class="sku">${sanitizeHTML(p.sku)}</div>
          </div>
          <div class="low-stock-qty ${p.stock <= 0 ? 'zero' : 'low'}">${p.stock <= 0 ? 'Out' : p.stock + ' left'}</div>
        </div>`).join('');
    }
  }

  // Best Sellers (Clickable item opens Total Products modal)
  const bestSellers = data.best_sellers || [];
  const bsEl = document.getElementById('best-sellers-list');
  if (bsEl) {
    if (!bestSellers.length) {
      bsEl.innerHTML = `<div class="empty-state" style="padding:24px;grid-column:1/-1;text-align:center"><i class="bi bi-inbox" style="font-size:24px;display:block;margin-bottom:6px;color:var(--text-muted)"></i><p style="color:var(--text-muted);font-size:13px;margin:0">No sales recorded yet. Completed sales will appear here.</p></div>`;
    } else {
      bsEl.innerHTML = bestSellers.map((p, i) => `
        <div class="best-sell-item clickable-row" style="cursor:pointer;padding:10px 14px;border-radius:8px" onclick="openTotalProductsModal()" title="Click to view catalog">
          <div class="best-sell-rank ${i === 0 ? 'rank-1' : ''}">${i + 1}</div>
          <div class="best-sell-info">
            <div class="name">${sanitizeHTML(p.name)}</div>
            <div class="cat">${sanitizeHTML(p.category || 'General')} · ${p.total_sold || p.totalSold || 0} units</div>
          </div>
          <div class="best-sell-val">${formatINR(p.revenue)}</div>
        </div>`).join('');
    }
  }
}

function paymentBadge(status) {
  const map = { Paid: 'badge-paid', Unpaid: 'badge-unpaid', Partial: 'badge-partial' };
  return `<span class="badge-status ${map[status] || 'badge-primary'}">${sanitizeHTML(status)}</span>`;
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD DETAIL MODAL CONTROLLER & KPI DRILL-DOWNS
// ─────────────────────────────────────────────────────────────

/**
 * Universal helper to show the dashboard details modal
 */
function showDashboardModal({ title, icon, subtitle, headerGradient, bodyHtml, footerHtml }) {
  const modalEl = document.getElementById('dashboard-detail-modal');
  if (!modalEl) return;

  const headerEl = document.getElementById('dashboard-detail-modal-header');
  const titleEl = document.getElementById('dashboard-detail-modal-title');
  const subtitleEl = document.getElementById('dashboard-detail-modal-subtitle');
  const bodyEl = document.getElementById('dashboard-detail-modal-body');
  const footerEl = document.getElementById('dashboard-detail-modal-footer');

  if (headerEl && headerGradient) {
    headerEl.style.background = headerGradient;
  }
  if (titleEl) {
    titleEl.innerHTML = `<i class="bi ${icon}"></i> <span>${title}</span>`;
  }
  if (subtitleEl) {
    subtitleEl.textContent = subtitle || '';
  }
  if (bodyEl) {
    bodyEl.innerHTML = bodyHtml;
  }
  if (footerEl) {
    footerEl.innerHTML = footerHtml;
  }

  const modal = (typeof bootstrap !== 'undefined' && bootstrap.Modal && bootstrap.Modal.getOrCreateInstance)
    ? bootstrap.Modal.getOrCreateInstance(modalEl)
    : new bootstrap.Modal(modalEl);
  modal.show();
}

/**
 * 1. Today's Sales Drill-Down Modal
 */
async function openTodaySalesModal() {
  const data = await ensureDashboardData();
  const kpi = data.kpi || {};
  const invoices = data.today_sales_list || [];
  const todayTotal = parseFloat(kpi.today_sales || 0);
  const totalBills = parseInt(kpi.today_sales_count || invoices.length || 0, 10);
  const paidTotal = parseFloat(kpi.today_sales_paid || invoices.reduce((s, x) => s + (x.amount_paid || 0), 0));
  const dueTotal = parseFloat(kpi.today_sales_due || invoices.reduce((s, x) => s + (x.balance_due || 0), 0));
  const cashTotal = parseFloat(kpi.today_sales_cash || 0);
  const upiTotal = parseFloat(kpi.today_sales_upi || 0);

  const bodyHtml = `
    <!-- Summary Chips Bar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:18px">
      <div class="detail-stat-chip">
        <span class="chip-label">Today's Revenue</span>
        <span class="chip-value" style="color:var(--primary)">${formatINR(todayTotal)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Bills Generated</span>
        <span class="chip-value" style="color:#0284c7">${totalBills} <small style="font-size:11px;font-weight:500;color:var(--text-muted)">(${totalBills === 1 ? 'bill' : 'bills'})</small></span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Collected (Paid)</span>
        <span class="chip-value" style="color:var(--success)">${formatINR(paidTotal)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Balance Due</span>
        <span class="chip-value" style="color:${dueTotal > 0 ? 'var(--danger)' : 'var(--text-muted)'}">${formatINR(dueTotal)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Cash / UPI</span>
        <span class="chip-value" style="font-size:14px;color:var(--text-dark)">💵 ${formatINR(cashTotal)} <br><span style="font-size:12px;color:#0ea5e9">📱 ${formatINR(upiTotal)}</span></span>
      </div>
    </div>

    <!-- Search filter -->
    <div style="position:relative;margin-bottom:14px">
      <i class="bi bi-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted)"></i>
      <input type="search" id="today-sales-modal-search" class="form-control-it" placeholder="Search by invoice #, customer name or phone..." style="padding-left:38px">
    </div>

    <!-- Invoices List Container -->
    <div id="today-sales-modal-list"></div>
  `;

  const footerHtml = `
    <div>
      <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" class="btn-ghost" onclick="navigateTo('sales-history'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-clock-history"></i> Sales History
      </button>
      <button type="button" class="btn-primary-it" onclick="navigateTo('billing'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-receipt-cutoff"></i> Create New Bill
      </button>
    </div>
  `;

  showDashboardModal({
    title: "Today's Sales Breakdown",
    icon: 'bi-bag-check-fill text-primary',
    subtitle: `All invoices recorded today (${formatDate(todayISO())})`,
    headerGradient: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
    bodyHtml,
    footerHtml
  });

  function renderRows(items) {
    const listEl = document.getElementById('today-sales-modal-list');
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:36px 20px;text-align:center;background:#fff;border-radius:12px;border:1px dashed var(--border)">
          <div style="width:48px;height:48px;border-radius:50%;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">
            <i class="bi bi-bag-x"></i>
          </div>
          <h5 style="font-size:14.5px;font-weight:700;color:var(--text-dark);margin-bottom:4px">No Sales Recorded Today</h5>
          <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 14px">Bills created today will immediately display here.</p>
          <button class="btn-primary-it" style="font-size:12.5px;padding:6px 16px" onclick="navigateTo('billing'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
            <i class="bi bi-plus-lg"></i> Create New Bill
          </button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="detail-modal-table-wrap">
        <table class="detail-modal-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Time</th>
              <th>Payment</th>
              <th>Status</th>
              <th style="text-align:right">Total</th>
              <th style="text-align:right">Paid / Due</th>
              <th style="text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(inv => {
              const cust = inv.customer_name || 'Walk-in';
              const isDue = (inv.balance_due || 0) > 0;
              return `
              <tr>
                <td>
                  <strong style="color:var(--primary);cursor:pointer" onclick="viewSaleInvoice(${inv.id})">${sanitizeHTML(inv.invoice_no)}</strong>
                  ${inv.items_count ? `<div style="font-size:10.5px;color:var(--text-muted)">${inv.items_count} ${inv.items_count === 1 ? 'item' : 'items'}</div>` : ''}
                </td>
                <td>
                  <div style="font-weight:600;color:var(--text-dark)">${sanitizeHTML(cust)}</div>
                  ${inv.customer_phone ? `<div style="font-size:11px;color:var(--text-muted)"><i class="bi bi-telephone"></i> ${sanitizeHTML(inv.customer_phone)}</div>` : ''}
                </td>
                <td><span style="font-size:11.5px;color:var(--text-muted)">${inv.time || '—'}</span></td>
                <td>
                  <span class="badge-status badge-primary" style="font-size:10.5px">${sanitizeHTML(inv.payment_method || 'Cash')}</span>
                </td>
                <td>${paymentBadge(inv.payment_status || 'Paid')}</td>
                <td style="text-align:right;font-weight:700;color:var(--primary);font-size:13px">
                  ${formatINR(inv.grand_total)}
                </td>
                <td style="text-align:right;font-size:11.5px">
                  <div style="color:var(--success);font-weight:600">${formatINR(inv.amount_paid)}</div>
                  ${isDue ? `<div style="color:var(--danger);font-weight:600">Due: ${formatINR(inv.balance_due)}</div>` : ''}
                </td>
                <td style="text-align:center">
                  <button class="btn-sm-action" style="padding:4px 9px;font-size:11.5px" onclick="viewSaleInvoice(${inv.id})" title="View Invoice Preview">
                    <i class="bi bi-eye"></i> View
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderRows(invoices);

  const searchInput = document.getElementById('today-sales-modal-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      const filtered = invoices.filter(inv => {
        const no = (inv.invoice_no || '').toLowerCase();
        const c = (inv.customer_name || '').toLowerCase();
        const ph = (inv.customer_phone || '');
        return no.includes(q) || c.includes(q) || ph.includes(q);
      });
      renderRows(filtered);
    };
  }
}

/**
 * 2. This Week's Sales Drill-Down Modal
 */
async function openWeekSalesModal() {
  const data = await ensureDashboardData();
  const kpi = data.kpi || {};
  const invoices = data.this_week_sales_list || [];
  const weekSales = parseFloat(kpi.this_week_sales || 0);
  const totalBills = parseInt(kpi.this_week_sales_count || invoices.length || 0, 10);
  const totalPaid = parseFloat(kpi.this_week_sales_paid || 0);
  const totalDue = parseFloat(kpi.this_week_sales_due || 0);
  const avgDaily = Math.round(weekSales / 7);

  const weeklyChart = data.charts?.weekly || { labels: [], sales: [] };
  const dailyCards = (weeklyChart.labels || []).map((lbl, idx) => {
    const val = weeklyChart.sales?.[idx] || 0;
    return `
      <div style="background:#fff;border:1px solid var(--border-light);border-radius:8px;padding:8px 10px;text-align:center;min-width:70px">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">${lbl}</div>
        <div style="font-weight:700;font-size:12.5px;color:${val > 0 ? 'var(--primary)' : 'var(--text-muted)'}">${formatINRCompact(val)}</div>
      </div>
    `;
  }).join('');

  const bodyHtml = `
    <!-- Summary Chips Bar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px">
      <div class="detail-stat-chip">
        <span class="chip-label">Week's Sales</span>
        <span class="chip-value" style="color:#059669">${formatINR(weekSales)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Total Bills</span>
        <span class="chip-value" style="color:var(--primary)">${totalBills}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Collected (Paid)</span>
        <span class="chip-value" style="color:var(--success)">${formatINR(totalPaid)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Balance Due</span>
        <span class="chip-value" style="color:${totalDue > 0 ? 'var(--danger)' : 'var(--text-muted)'}">${formatINR(totalDue)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Avg Daily Revenue</span>
        <span class="chip-value" style="font-size:16px;color:var(--text-dark)">${formatINR(avgDaily)}</span>
      </div>
    </div>

    <!-- 7-Day Trend Progression -->
    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px 14px;margin-bottom:16px">
      <div style="font-size:11.5px;font-weight:600;color:#065f46;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
        <span><i class="bi bi-calendar-week"></i> 7-Day Daily Sales Progression</span>
        <span style="font-size:11px;color:#047857">${weeklyChart.labels.length} Days</span>
      </div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px">
        ${dailyCards}
      </div>
    </div>

    <!-- Search filter -->
    <div style="position:relative;margin-bottom:14px">
      <i class="bi bi-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted)"></i>
      <input type="search" id="week-sales-modal-search" class="form-control-it" placeholder="Search this week's invoices by bill #, customer or date..." style="padding-left:38px">
    </div>

    <!-- Invoices List Container -->
    <div id="week-sales-modal-list"></div>
  `;

  const footerHtml = `
    <div>
      <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" class="btn-ghost" onclick="navigateTo('sales-history'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-clock-history"></i> Sales History
      </button>
      <button type="button" class="btn-primary-it" onclick="navigateTo('billing'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-receipt-cutoff"></i> Create New Bill
      </button>
    </div>
  `;

  showDashboardModal({
    title: "This Week's Sales Breakdown",
    icon: 'bi-graph-up-arrow text-success',
    subtitle: `Last 7 Days Sales Activity (${formatDate(getWeekAgoISO())} — ${formatDate(todayISO())})`,
    headerGradient: 'linear-gradient(135deg, #065f46, #0f172a)',
    bodyHtml,
    footerHtml
  });

  function renderRows(items) {
    const listEl = document.getElementById('week-sales-modal-list');
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:36px 20px;text-align:center;background:#fff;border-radius:12px;border:1px dashed var(--border)">
          <div style="width:48px;height:48px;border-radius:50%;background:#e0f2fe;color:#0284c7;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">
            <i class="bi bi-inbox"></i>
          </div>
          <h5 style="font-size:14.5px;font-weight:700;color:var(--text-dark);margin-bottom:4px">No Invoices Found</h5>
          <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 14px">No invoices match your search query for this week.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="detail-modal-table-wrap">
        <table class="detail-modal-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Payment</th>
              <th>Status</th>
              <th style="text-align:right">Total</th>
              <th style="text-align:right">Paid / Due</th>
              <th style="text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(inv => {
              const cust = inv.customer_name || 'Walk-in';
              const isDue = (inv.balance_due || 0) > 0;
              return `
              <tr>
                <td>
                  <strong style="color:var(--primary);cursor:pointer" onclick="viewSaleInvoice(${inv.id})">${sanitizeHTML(inv.invoice_no)}</strong>
                  ${inv.items_count ? `<div style="font-size:10.5px;color:var(--text-muted)">${inv.items_count} items</div>` : ''}
                </td>
                <td>
                  <div style="font-weight:600;color:var(--text-dark)">${sanitizeHTML(cust)}</div>
                  ${inv.customer_phone ? `<div style="font-size:11px;color:var(--text-muted)"><i class="bi bi-telephone"></i> ${sanitizeHTML(inv.customer_phone)}</div>` : ''}
                </td>
                <td><span style="font-size:11.5px;color:var(--text-dark);font-weight:500">${formatDate(inv.date)}</span></td>
                <td>
                  <span class="badge-status badge-primary" style="font-size:10.5px">${sanitizeHTML(inv.payment_method || 'Cash')}</span>
                </td>
                <td>${paymentBadge(inv.payment_status || 'Paid')}</td>
                <td style="text-align:right;font-weight:700;color:var(--primary);font-size:13px">
                  ${formatINR(inv.grand_total)}
                </td>
                <td style="text-align:right;font-size:11.5px">
                  <div style="color:var(--success);font-weight:600">${formatINR(inv.amount_paid)}</div>
                  ${isDue ? `<div style="color:var(--danger);font-weight:600">Due: ${formatINR(inv.balance_due)}</div>` : ''}
                </td>
                <td style="text-align:center">
                  <button class="btn-sm-action" style="padding:4px 9px;font-size:11.5px" onclick="viewSaleInvoice(${inv.id})" title="View Invoice Preview">
                    <i class="bi bi-eye"></i> View
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderRows(invoices);

  const searchInput = document.getElementById('week-sales-modal-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      const filtered = invoices.filter(inv => {
        const no = (inv.invoice_no || '').toLowerCase();
        const c = (inv.customer_name || '').toLowerCase();
        const d = (inv.date || '').toLowerCase();
        return no.includes(q) || c.includes(q) || d.includes(q);
      });
      renderRows(filtered);
    };
  }
}

/**
 * 3. This Week's Purchases Drill-Down Modal
 */
async function openWeekPurchasesModal() {
  const data = await ensureDashboardData();
  const kpi = data.kpi || {};
  const pos = data.this_week_purchases_list || [];
  const weekPurchases = parseFloat(kpi.this_week_purchases || 0);
  const totalPOs = parseInt(kpi.this_week_purchases_count || pos.length || 0, 10);
  const totalPaid = parseFloat(kpi.this_week_purchases_paid || 0);
  const totalDue = parseFloat(kpi.this_week_purchases_due || 0);

  const weeklyChart = data.charts?.weekly || { labels: [], purchases: [] };
  const dailyCards = (weeklyChart.labels || []).map((lbl, idx) => {
    const val = weeklyChart.purchases?.[idx] || 0;
    return `
      <div style="background:#fff;border:1px solid var(--border-light);border-radius:8px;padding:8px 10px;text-align:center;min-width:70px">
        <div style="font-size:11px;color:var(--text-muted);font-weight:600">${lbl}</div>
        <div style="font-weight:700;font-size:12.5px;color:${val > 0 ? '#b45309' : 'var(--text-muted)'}">${formatINRCompact(val)}</div>
      </div>
    `;
  }).join('');

  const bodyHtml = `
    <!-- Summary Chips Bar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px">
      <div class="detail-stat-chip">
        <span class="chip-label">Total Purchases</span>
        <span class="chip-value" style="color:#d97706">${formatINR(weekPurchases)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Purchase Orders</span>
        <span class="chip-value" style="color:var(--text-dark)">${totalPOs} orders</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Paid to Vendors</span>
        <span class="chip-value" style="color:var(--success)">${formatINR(totalPaid)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Vendor Due</span>
        <span class="chip-value" style="color:${totalDue > 0 ? 'var(--danger)' : 'var(--text-muted)'}">${formatINR(totalDue)}</span>
      </div>
    </div>

    <!-- 7-Day Trend Progression -->
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 14px;margin-bottom:16px">
      <div style="font-size:11.5px;font-weight:600;color:#92400e;margin-bottom:8px;display:flex;align-items:center;justify-content:space-between">
        <span><i class="bi bi-box-seam"></i> 7-Day Daily Purchase Procurement</span>
        <span style="font-size:11px;color:#b45309">${weeklyChart.labels.length} Days</span>
      </div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px">
        ${dailyCards}
      </div>
    </div>

    <!-- Search filter -->
    <div style="position:relative;margin-bottom:14px">
      <i class="bi bi-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted)"></i>
      <input type="search" id="week-po-modal-search" class="form-control-it" placeholder="Search purchase orders by PO #, supplier or date..." style="padding-left:38px">
    </div>

    <!-- PO List Container -->
    <div id="week-po-modal-list"></div>
  `;

  const footerHtml = `
    <div>
      <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" class="btn-ghost" onclick="navigateTo('purchase-history'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-clock-history"></i> Purchase History
      </button>
      <button type="button" class="btn-primary-it" style="background:#d97706;border-color:#d97706" onclick="navigateTo('purchases'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-cart-plus"></i> Add Purchase Order
      </button>
    </div>
  `;

  showDashboardModal({
    title: "This Week's Purchases & Procurement",
    icon: 'bi-box-seam-fill text-warning',
    subtitle: `Purchase orders recorded in the last 7 days (${formatDate(getWeekAgoISO())} — ${formatDate(todayISO())})`,
    headerGradient: 'linear-gradient(135deg, #78350f, #0f172a)',
    bodyHtml,
    footerHtml
  });

  function renderRows(items) {
    const listEl = document.getElementById('week-po-modal-list');
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:36px 20px;text-align:center;background:#fff;border-radius:12px;border:1px dashed var(--border)">
          <div style="width:48px;height:48px;border-radius:50%;background:#fef3c7;color:#b45309;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">
            <i class="bi bi-box"></i>
          </div>
          <h5 style="font-size:14.5px;font-weight:700;color:var(--text-dark);margin-bottom:4px">No Purchase Orders Found</h5>
          <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 14px">No purchases match your search query for this week.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="detail-modal-table-wrap">
        <table class="detail-modal-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Items</th>
              <th>Status</th>
              <th style="text-align:right">Total</th>
              <th style="text-align:right">Paid / Balance</th>
              <th style="text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(p => {
              const sup = p.supplier_name || p.supplier || 'Supplier';
              const isDue = (p.balance_due || 0) > 0;
              return `
              <tr>
                <td>
                  <strong style="color:var(--warning);cursor:pointer" onclick="viewPurchaseDetail(${p.id})">${sanitizeHTML(p.purchase_no)}</strong>
                </td>
                <td>
                  <div style="font-weight:600;color:var(--text-dark)">${sanitizeHTML(sup)}</div>
                </td>
                <td><span style="font-size:11.5px;color:var(--text-dark);font-weight:500">${formatDate(p.date)}</span></td>
                <td><span style="font-size:11.5px;color:var(--text-muted)">${p.items_count || 1} items</span></td>
                <td>${paymentBadge(p.payment_status || 'Paid')}</td>
                <td style="text-align:right;font-weight:700;color:#d97706;font-size:13px">
                  ${formatINR(p.total_amount)}
                </td>
                <td style="text-align:right;font-size:11.5px">
                  <div style="color:var(--success);font-weight:600">${formatINR(p.amount_paid)}</div>
                  ${isDue ? `<div style="color:var(--danger);font-weight:600">Due: ${formatINR(p.balance_due)}</div>` : ''}
                </td>
                <td style="text-align:center">
                  <button class="btn-sm-action" style="padding:4px 9px;font-size:11.5px" onclick="viewPurchaseDetail(${p.id})" title="View Purchase Details">
                    <i class="bi bi-eye"></i> View
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderRows(pos);

  const searchInput = document.getElementById('week-po-modal-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      const filtered = pos.filter(p => {
        const no = (p.purchase_no || '').toLowerCase();
        const s = (p.supplier_name || p.supplier || '').toLowerCase();
        const d = (p.date || '').toLowerCase();
        return no.includes(q) || s.includes(q) || d.includes(q);
      });
      renderRows(filtered);
    };
  }
}

/**
 * 4. Gross Profit & Financial Performance Modal
 */
async function openProfitModal() {
  const data = await ensureDashboardData();
  const kpi = data.kpi || {};
  const sales = parseFloat(kpi.this_week_sales || 0);
  const purchases = parseFloat(kpi.this_week_purchases || 0);
  const returns = parseFloat(kpi.this_week_returns_amount || 0);
  const profit = parseFloat(kpi.estimated_profit || (sales - returns - purchases));
  const margin = (kpi.profit_margin_pct !== undefined) ? kpi.profit_margin_pct : (sales > 0 ? ((profit / sales) * 100).toFixed(1) : 0);
  const isNetPos = profit >= 0;

  const catList = data.charts?.category || { labels: [], data: [] };
  const catRows = (catList.labels || []).map((name, i) => {
    const val = catList.data?.[i] || 0;
    const pct = sales > 0 ? ((val / sales) * 100).toFixed(1) : 0;
    return `
      <tr>
        <td style="font-weight:600;color:var(--text-dark)">${sanitizeHTML(name)}</td>
        <td style="text-align:right;font-weight:700;color:var(--primary)">${formatINR(val)}</td>
        <td style="text-align:right">
          <span class="badge-status badge-primary" style="font-size:11px">${pct}%</span>
        </td>
      </tr>
    `;
  }).join('');

  const bodyHtml = `
    <!-- Financial Formula Summary -->
    <div style="background:#fff;border:1px solid var(--border-light);border-radius:12px;padding:18px;margin-bottom:18px;box-shadow:var(--shadow-sm)">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px;margin-bottom:12px">
        Weekly Accounting Breakdown (7 Days)
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        <div class="formula-card" style="border-left:4px solid #10b981">
          <span style="font-size:11px;font-weight:600;color:#059669;text-transform:uppercase">(+) Gross Revenue</span>
          <span style="font-size:18px;font-weight:800;color:#059669">${formatINR(sales)}</span>
          <span style="font-size:11px;color:var(--text-muted)">Sales Invoices</span>
        </div>
        <div class="formula-card" style="border-left:4px solid #e11d48">
          <span style="font-size:11px;font-weight:600;color:#e11d48;text-transform:uppercase">(-) Customer Returns</span>
          <span style="font-size:18px;font-weight:800;color:#e11d48">${formatINR(returns)}</span>
          <span style="font-size:11px;color:var(--text-muted)">Refunds Issued</span>
        </div>
        <div class="formula-card" style="border-left:4px solid #f59e0b">
          <span style="font-size:11px;font-weight:600;color:#d97706;text-transform:uppercase">(-) Purchases / COGS</span>
          <span style="font-size:18px;font-weight:800;color:#d97706">${formatINR(purchases)}</span>
          <span style="font-size:11px;color:var(--text-muted)">Inventory Outlay</span>
        </div>
        <div class="formula-card" style="border-left:4px solid #D4AF37;background:${isNetPos ? '#fefce8' : '#fff1f2'}">
          <span style="font-size:11px;font-weight:600;color:#b45309;text-transform:uppercase">(=) Est. Gross Profit</span>
          <span style="font-size:20px;font-weight:900;color:${isNetPos ? '#b45309' : '#dc2626'}">${formatINR(profit)}</span>
          <span style="font-size:11px;font-weight:600;color:${isNetPos ? '#059669' : '#dc2626'}">${margin}% Margin</span>
        </div>
      </div>
    </div>

    <!-- Explanation Box -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:18px;font-size:12.5px;color:var(--text-muted)">
      <strong style="color:var(--text-dark)"><i class="bi bi-info-circle"></i> Understanding Gross Profit Calculation:</strong><br>
      Gross Profit = <strong>Sales Revenue (${formatINR(sales)})</strong> minus <strong>Customer Refunds (${formatINR(returns)})</strong> minus <strong>Inventory Purchases (${formatINR(purchases)})</strong> during this 7-day period. When large stock procurements occur, net profit reflects capital invested in inventory on shelf.
    </div>

    <!-- Category Contribution -->
    ${catRows ? `
      <div class="detail-modal-table-wrap">
        <div style="padding:12px 16px;background:#f8fafc;font-size:12px;font-weight:700;color:var(--text-dark);border-bottom:1px solid #e2e8f0">
          <i class="bi bi-pie-chart"></i> Category Revenue Contribution
        </div>
        <table class="detail-modal-table">
          <thead>
            <tr>
              <th>Category</th>
              <th style="text-align:right">Sales (₹)</th>
              <th style="text-align:right">Share (%)</th>
            </tr>
          </thead>
          <tbody>
            ${catRows}
          </tbody>
        </table>
      </div>
    ` : ''}
  `;

  const footerHtml = `
    <div>
      <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" class="btn-primary-it" style="background:#D4AF37;border-color:#D4AF37;color:#000;font-weight:600" onclick="navigateTo('reports'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-file-earmark-bar-graph"></i> Open Financial Reports
      </button>
    </div>
  `;

  showDashboardModal({
    title: "Gross Profit & Financial Performance",
    icon: 'bi-currency-rupee text-warning',
    subtitle: `7-Day Profit Analysis & Cost Breakdown`,
    headerGradient: 'linear-gradient(135deg, #713f12, #1e293b)',
    bodyHtml,
    footerHtml
  });
}

/**
 * 5. Total Products Drill-Down Modal
 */
async function openTotalProductsModal() {
  const data = await ensureDashboardData();
  const kpi = data.kpi || {};
  const products = data.products_list || [];
  const catDist = data.category_distribution || [];
  const totalItems = parseInt(kpi.total_products || products.length || 0, 10);
  const inStock = parseInt(kpi.in_stock_count || 0, 10);
  const lowStock = parseInt(kpi.low_stock_count || 0, 10);
  const outStock = parseInt(kpi.out_of_stock_count || 0, 10);
  const totalUnits = parseInt(kpi.total_stock_units || 0, 10);
  const costVal = parseFloat(kpi.inventory_cost_val || 0);
  const retailVal = parseFloat(kpi.inventory_retail_val || 0);

  const catPills = catDist.map(c => `
    <span class="cust-pill">
      <strong>${sanitizeHTML(c.name)}:</strong> ${c.product_count} items (${c.stock_units || 0} pcs)
    </span>
  `).join('');

  const bodyHtml = `
    <!-- Summary Chips Bar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px">
      <div class="detail-stat-chip">
        <span class="chip-label">Catalog Products</span>
        <span class="chip-value" style="color:#6366f1">${totalItems} <small style="font-size:11px;font-weight:500;color:var(--text-muted)">items</small></span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Units in Stock</span>
        <span class="chip-value" style="color:var(--success)">${totalUnits} <small style="font-size:11px;font-weight:500;color:var(--text-muted)">pcs</small></span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Stock Value (Cost)</span>
        <span class="chip-value" style="font-size:16px;color:var(--text-dark)">${formatINR(costVal)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Stock Value (Retail)</span>
        <span class="chip-value" style="font-size:16px;color:var(--primary)">${formatINR(retailVal)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Potential Margin</span>
        <span class="chip-value" style="font-size:16px;color:#059669">${formatINR(retailVal - costVal)}</span>
      </div>
    </div>

    <!-- Category Distribution Pills -->
    ${catPills ? `
      <div style="background:#fff;border:1px solid var(--border-light);border-radius:10px;padding:12px;margin-bottom:16px">
        <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;margin-bottom:6px">Categories Breakdown</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${catPills}
        </div>
      </div>
    ` : ''}

    <!-- Search filter -->
    <div style="position:relative;margin-bottom:14px">
      <i class="bi bi-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted)"></i>
      <input type="search" id="modal-products-search" class="form-control-it" placeholder="Search catalog by product name, SKU or category..." style="padding-left:38px">
    </div>

    <!-- Product list -->
    <div id="modal-products-list"></div>
  `;

  const footerHtml = `
    <div>
      <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" class="btn-primary-it" onclick="navigateTo('inventory'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-boxes"></i> Manage Full Inventory
      </button>
    </div>
  `;

  showDashboardModal({
    title: "Product Catalog & Inventory Valuation",
    icon: 'bi-grid-3x3-gap-fill text-primary',
    subtitle: `Active products catalog, stock counts, and valuation summary`,
    headerGradient: 'linear-gradient(135deg, #3730a3, #0f172a)',
    bodyHtml,
    footerHtml
  });

  function renderRows(items) {
    const listEl = document.getElementById('modal-products-list');
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:36px 20px;text-align:center;background:#fff;border-radius:12px;border:1px dashed var(--border)">
          <div style="width:48px;height:48px;border-radius:50%;background:#ede9fe;color:#6366f1;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">
            <i class="bi bi-box"></i>
          </div>
          <h5 style="font-size:14.5px;font-weight:700;color:var(--text-dark);margin-bottom:4px">No Products Found</h5>
          <p style="font-size:12.5px;color:var(--text-muted);margin:0">No items match your search filter.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="detail-modal-table-wrap">
        <table class="detail-modal-table">
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Category</th>
              <th style="text-align:right">Cost Price</th>
              <th style="text-align:right">Selling Price</th>
              <th style="text-align:center">In Stock</th>
              <th style="text-align:center">Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(p => {
              const isOut = p.stock <= 0;
              const isLow = !isOut && p.stock <= p.low_stock_threshold;
              return `
              <tr>
                <td>
                  <strong style="color:var(--text-dark)">${sanitizeHTML(p.name)}</strong>
                  <div style="font-size:11px;color:var(--text-muted)">SKU: ${sanitizeHTML(p.sku)}</div>
                </td>
                <td><span class="badge-status badge-primary" style="font-size:11px">${sanitizeHTML(p.category_name || 'General')}</span></td>
                <td style="text-align:right;font-size:12px;color:var(--text-muted)">${formatINR(p.purchase_price)}</td>
                <td style="text-align:right;font-weight:700;color:var(--primary);font-size:13px">${formatINR(p.selling_price)}</td>
                <td style="text-align:center;font-weight:700;font-size:13px;color:${isOut ? 'var(--danger)' : (isLow ? '#d97706' : 'var(--success)')}">
                  ${p.stock}
                </td>
                <td style="text-align:center">
                  <span class="badge-status ${isOut ? 'badge-unpaid' : (isLow ? 'badge-partial' : 'badge-paid')}" style="font-size:10.5px">
                    ${isOut ? 'Out of Stock' : (isLow ? 'Low Stock' : 'In Stock')}
                  </span>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderRows(products);

  const searchInput = document.getElementById('modal-products-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      const filtered = products.filter(p => {
        const n = (p.name || '').toLowerCase();
        const s = (p.sku || '').toLowerCase();
        const c = (p.category_name || '').toLowerCase();
        return n.includes(q) || s.includes(q) || c.includes(q);
      });
      renderRows(filtered);
    };
  }
}

/**
 * 6. Low Stock & Out of Stock Drill-Down Modal
 */
async function openLowStockModal() {
  const data = await ensureDashboardData();
  const kpi = data.kpi || {};
  const alerts = data.all_low_stock_products || [];
  const outCount = parseInt(kpi.out_of_stock_count || 0, 10);
  const lowCount = parseInt(kpi.low_stock_count || 0, 10);
  const totalAlerts = outCount + lowCount;

  let currentTab = 'all';

  const bodyHtml = `
    <!-- Summary Chips Bar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px">
      <div class="detail-stat-chip" style="border-left:4px solid #ef4444">
        <span class="chip-label" style="color:#ef4444">Out of Stock (0 Units)</span>
        <span class="chip-value" style="color:#ef4444">${outCount} items</span>
      </div>
      <div class="detail-stat-chip" style="border-left:4px solid #f59e0b">
        <span class="chip-label" style="color:#d97706">Low Stock (≤ Threshold)</span>
        <span class="chip-value" style="color:#d97706">${lowCount} items</span>
      </div>
      <div class="detail-stat-chip" style="border-left:4px solid #6366f1">
        <span class="chip-label">Total Attention Needed</span>
        <span class="chip-value" style="color:var(--text-dark)">${totalAlerts} items</span>
      </div>
    </div>

    <!-- Filter Pills / Tabs -->
    <div style="display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap">
      <button class="chart-filter-btn active" id="tab-stock-all" onclick="filterLowStock('all')">All Alerts (${totalAlerts})</button>
      <button class="chart-filter-btn" id="tab-stock-out" onclick="filterLowStock('out')">Out of Stock (${outCount})</button>
      <button class="chart-filter-btn" id="tab-stock-low" onclick="filterLowStock('low')">Low Stock (${lowCount})</button>
      <div style="position:relative;flex:1;min-width:200px">
        <i class="bi bi-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-muted);font-size:12px"></i>
        <input type="search" id="modal-lowstock-search" class="form-control-it" placeholder="Search alerts by product or SKU..." style="padding-left:34px;height:34px;font-size:12px">
      </div>
    </div>

    <!-- Reorder Table Container -->
    <div id="modal-lowstock-list"></div>
  `;

  const footerHtml = `
    <div>
      <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" class="btn-ghost" onclick="navigateTo('inventory'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-boxes"></i> Open Inventory
      </button>
      <button type="button" class="btn-primary-it" style="background:#dc2626;border-color:#dc2626" onclick="navigateTo('purchases'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-cart-plus"></i> Create Purchase Order
      </button>
    </div>
  `;

  showDashboardModal({
    title: "Low Stock & Out of Stock Alerts",
    icon: 'bi-exclamation-triangle-fill text-danger',
    subtitle: `Items at or below restock thresholds requiring replenishment`,
    headerGradient: 'linear-gradient(135deg, #991b1b, #0f172a)',
    bodyHtml,
    footerHtml
  });

  window.filterLowStock = function(tab) {
    currentTab = tab;
    ['all','out','low'].forEach(t => {
      document.getElementById('tab-stock-' + t)?.classList.toggle('active', t === tab);
    });
    applyFilter();
  };

  function applyFilter() {
    const q = (document.getElementById('modal-lowstock-search')?.value || '').trim().toLowerCase();
    let filtered = alerts;
    if (currentTab === 'out') {
      filtered = filtered.filter(p => p.stock <= 0);
    } else if (currentTab === 'low') {
      filtered = filtered.filter(p => p.stock > 0 && p.stock <= p.low_stock_threshold);
    }
    if (q) {
      filtered = filtered.filter(p => {
        const n = (p.name || '').toLowerCase();
        const s = (p.sku || '').toLowerCase();
        const c = (p.category_name || '').toLowerCase();
        return n.includes(q) || s.includes(q) || c.includes(q);
      });
    }
    renderRows(filtered);
  }

  function renderRows(items) {
    const listEl = document.getElementById('modal-lowstock-list');
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:36px 20px;text-align:center;background:#fff;border-radius:12px;border:1px dashed var(--border)">
          <div style="width:48px;height:48px;border-radius:50%;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">
            <i class="bi bi-check-circle-fill"></i>
          </div>
          <h5 style="font-size:14.5px;font-weight:700;color:var(--text-dark);margin-bottom:4px">No Stock Alerts Found</h5>
          <p style="font-size:12.5px;color:var(--text-muted);margin:0">All items matching this filter have sufficient inventory!</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="detail-modal-table-wrap">
        <table class="detail-modal-table">
          <thead>
            <tr>
              <th>Product / SKU</th>
              <th>Category</th>
              <th style="text-align:center">Current Stock</th>
              <th style="text-align:center">Threshold</th>
              <th style="text-align:center">Deficit / Reorder</th>
              <th style="text-align:right">Selling Price</th>
              <th style="text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(p => {
              const isOut = p.stock <= 0;
              const deficit = Math.max(1, (p.low_stock_threshold || 3) - (p.stock || 0));
              return `
              <tr>
                <td>
                  <strong style="color:var(--text-dark)">${sanitizeHTML(p.name)}</strong>
                  <div style="font-size:11px;color:var(--text-muted)">SKU: ${sanitizeHTML(p.sku)}</div>
                </td>
                <td><span class="badge-status badge-primary" style="font-size:11px">${sanitizeHTML(p.category_name || 'General')}</span></td>
                <td style="text-align:center">
                  <span class="badge-status ${isOut ? 'badge-unpaid' : 'badge-partial'}" style="font-size:11.5px;font-weight:700">
                    ${isOut ? '0 (Out)' : p.stock + ' left'}
                  </span>
                </td>
                <td style="text-align:center;font-size:12px;color:var(--text-muted)">${p.low_stock_threshold || 3}</td>
                <td style="text-align:center">
                  <span style="color:var(--danger);font-weight:700;font-size:12px">+${deficit} needed</span>
                </td>
                <td style="text-align:right;font-weight:600;font-size:12.5px">${formatINR(p.selling_price)}</td>
                <td style="text-align:center">
                  <button class="btn-sm-action" style="padding:4px 10px;font-size:11.5px;color:#d97706;border-color:#fde68a;background:#fffbeb;font-weight:600" onclick="navigateTo('purchases'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();" title="Add to purchase order">
                    <i class="bi bi-cart-plus"></i> Reorder
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderRows(alerts);

  const searchInput = document.getElementById('modal-lowstock-search');
  if (searchInput) {
    searchInput.oninput = applyFilter;
  }
}

/**
 * 7. Total Returns Drill-Down Modal (THE NEW TOTAL RETURN MODULE!)
 */
async function openTotalReturnsModal() {
  const data = await ensureDashboardData();
  const kpi = data.kpi || {};
  const returns = data.returns_list || [];
  const totalAmount = parseFloat(kpi.total_returns_amount || 0);
  const totalCount = parseInt(kpi.total_returns_count || returns.length || 0, 10);
  const totalItems = parseInt(kpi.total_returns_items || 0, 10);
  const todayAmount = parseFloat(kpi.today_returns_amount || 0);
  const todayCount = parseInt(kpi.today_returns_count || 0, 10);
  const weekAmount = parseFloat(kpi.this_week_returns_amount || 0);
  const weekCount = parseInt(kpi.this_week_returns_count || 0, 10);

  const bodyHtml = `
    <!-- Summary Chips Bar -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px">
      <div class="detail-stat-chip" style="border-left:4px solid #e11d48">
        <span class="chip-label" style="color:#e11d48">Total Refunded</span>
        <span class="chip-value" style="color:#e11d48">${formatINR(totalAmount)}</span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Returns Recorded</span>
        <span class="chip-value" style="color:var(--text-dark)">${totalCount} <small style="font-size:11px;font-weight:500;color:var(--text-muted)">(${totalCount === 1 ? 'case' : 'cases'})</small></span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Items Returned</span>
        <span class="chip-value" style="color:#0284c7">${totalItems} <small style="font-size:11px;font-weight:500;color:var(--text-muted)">units</small></span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">Today's Returns</span>
        <span class="chip-value" style="font-size:16px;color:${todayAmount > 0 ? '#e11d48' : 'var(--text-muted)'}">${formatINR(todayAmount)} <small style="font-size:11px;font-weight:500">(${todayCount})</small></span>
      </div>
      <div class="detail-stat-chip">
        <span class="chip-label">This Week</span>
        <span class="chip-value" style="font-size:16px;color:#d97706">${formatINR(weekAmount)} <small style="font-size:11px;font-weight:500">(${weekCount})</small></span>
      </div>
    </div>

    <!-- Search filter -->
    <div style="position:relative;margin-bottom:14px">
      <i class="bi bi-search" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--text-muted)"></i>
      <input type="search" id="modal-returns-search" class="form-control-it" placeholder="Search returns by return #, original invoice #, customer or reason..." style="padding-left:38px">
    </div>

    <!-- Returns List -->
    <div id="modal-returns-list"></div>
  `;

  const footerHtml = `
    <div>
      <button type="button" class="btn-ghost" data-bs-dismiss="modal">Close</button>
    </div>
    <div style="display:flex;gap:8px">
      <button type="button" class="btn-ghost" onclick="navigateTo('sales-returns'); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-arrow-counterclockwise"></i> Returns History
      </button>
      <button type="button" class="btn-primary-it" style="background:#e11d48;border-color:#e11d48" onclick="navigateTo('sales-returns'); setTimeout(() => { if (typeof openNewReturnModal === 'function') openNewReturnModal(); }, 200); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
        <i class="bi bi-plus-lg"></i> Process New Return
      </button>
    </div>
  `;

  showDashboardModal({
    title: "Sales Returns & Refunds Breakdown",
    icon: 'bi-arrow-counterclockwise text-danger',
    subtitle: `Customer return receipts, item restocks, and refund transactions`,
    headerGradient: 'linear-gradient(135deg, #9f1239, #0f172a)',
    bodyHtml,
    footerHtml
  });

  function renderRows(items) {
    const listEl = document.getElementById('modal-returns-list');
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = `
        <div class="empty-state" style="padding:36px 20px;text-align:center;background:#fff;border-radius:12px;border:1px dashed var(--border)">
          <div style="width:48px;height:48px;border-radius:50%;background:#ffe4e6;color:#e11d48;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:22px">
            <i class="bi bi-arrow-return-left"></i>
          </div>
          <h5 style="font-size:14.5px;font-weight:700;color:var(--text-dark);margin-bottom:4px">No Sales Returns Found</h5>
          <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 14px">No return records found matching your query.</p>
          <button class="btn-primary-it" style="font-size:12.5px;padding:6px 16px;background:#e11d48;border-color:#e11d48" onclick="navigateTo('sales-returns'); setTimeout(() => { if (typeof openNewReturnModal === 'function') openNewReturnModal(); }, 200); bootstrap.Modal.getInstance(document.getElementById('dashboard-detail-modal'))?.hide();">
            <i class="bi bi-plus-lg"></i> Process Return
          </button>
        </div>
      `;
      return;
    }

    listEl.innerHTML = `
      <div class="detail-modal-table-wrap">
        <table class="detail-modal-table">
          <thead>
            <tr>
              <th>Return #</th>
              <th>Original Bill</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Reason</th>
              <th>Method</th>
              <th style="text-align:right">Refund</th>
              <th style="text-align:center">Action</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(r => {
              const cust = r.customer_name || 'Walk-in Customer';
              return `
              <tr>
                <td>
                  <strong style="color:#e11d48;cursor:pointer" onclick="viewReturnReceipt(${r.id})">${sanitizeHTML(r.return_no)}</strong>
                </td>
                <td>
                  <span style="font-weight:600;color:var(--primary);font-size:12px">${sanitizeHTML(r.invoice_no || '—')}</span>
                </td>
                <td>
                  <div style="font-weight:600;color:var(--text-dark)">${sanitizeHTML(cust)}</div>
                  ${r.customer_phone ? `<div style="font-size:11px;color:var(--text-muted)"><i class="bi bi-telephone"></i> ${sanitizeHTML(r.customer_phone)}</div>` : ''}
                </td>
                <td><span style="font-size:11.5px;color:var(--text-dark);font-weight:500">${formatDate(r.date)}</span></td>
                <td><span style="font-size:11.5px;color:var(--text-muted)">${r.items_count || 1} items (${r.return_qty || 1} pcs)</span></td>
                <td><span style="font-size:11.5px;color:var(--text-muted)">${sanitizeHTML(r.reason || 'General Return')}</span></td>
                <td><span class="badge-status badge-primary" style="font-size:10.5px">${sanitizeHTML(r.refund_method || 'Cash')}</span></td>
                <td style="text-align:right;font-weight:800;color:#e11d48;font-size:13px">
                  ${formatINR(r.total_refund_amount)}
                </td>
                <td style="text-align:center">
                  <button class="btn-sm-action" style="padding:4px 9px;font-size:11.5px" onclick="viewReturnReceipt(${r.id})" title="View Return Receipt">
                    <i class="bi bi-receipt"></i> Receipt
                  </button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderRows(returns);

  const searchInput = document.getElementById('modal-returns-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      const filtered = returns.filter(r => {
        const no = (r.return_no || '').toLowerCase();
        const inv = (r.invoice_no || '').toLowerCase();
        const c = (r.customer_name || '').toLowerCase();
        const rsn = (r.reason || '').toLowerCase();
        return no.includes(q) || inv.includes(q) || c.includes(q) || rsn.includes(q);
      });
      renderRows(filtered);
    };
  }
}

// Expose modal controllers globally
window.openTodaySalesModal = openTodaySalesModal;
window.openWeekSalesModal = openWeekSalesModal;
window.openWeekPurchasesModal = openWeekPurchasesModal;
window.openProfitModal = openProfitModal;
window.openTotalProductsModal = openTotalProductsModal;
window.openLowStockModal = openLowStockModal;
window.openTotalReturnsModal = openTotalReturnsModal;

// ─────────────────────────────────────────────────────────────
// CHARTS INITIALIZATION
// ─────────────────────────────────────────────────────────────

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
  const chartDataObj = currentDashboardData?.charts?.[p] || {
    labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    sales: [0,0,0,0,0,0,0],
    purchases: [0,0,0,0,0,0,0]
  };

  try {
    dashboardChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: chartDataObj.labels,
        datasets: [
          {
            label: 'Sales (₹)',
            data: chartDataObj.sales,
            backgroundColor: '#2457D6',
            hoverBackgroundColor: '#1d4ed8',
            borderRadius: 6,
            borderSkipped: false,
            barPercentage: 0.72,
            categoryPercentage: 0.68
          },
          {
            label: 'Purchases (₹)',
            data: chartDataObj.purchases,
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

  const catList = currentDashboardData?.charts?.category || [];
  let chartLabels = [];
  let chartData = [];
  const chartColors = ['#2457D6', '#D4AF37', '#10b981', '#6366f1', '#ef4444', '#f59e0b', '#94a3b8'];

  if (catList.labels && Array.isArray(catList.labels) && catList.labels.length > 0) {
    chartLabels = catList.labels;
    chartData = catList.data || [];
  } else if (Array.isArray(catList) && catList.length > 0) {
    chartLabels = catList.map(c => c.name);
    chartData = catList.map(c => c.percentage || c.total_sales || 0);
  } else {
    // If no sales yet, use category names with 0%
    chartLabels = (AppState.categories && AppState.categories.length) ? AppState.categories.map(c => c.name) : ['Footwear', 'Apparel', 'Accessories'];
    chartData = chartLabels.map(() => 0);
  }

  const hasData = chartData.some(v => v > 0);

  try {
    categoryChartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: hasData ? chartData : chartLabels.map(() => 1), // equal placeholder segments if all 0
          backgroundColor: hasData ? chartColors.slice(0, chartLabels.length) : chartLabels.map(() => '#e2e8f0'),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverOffset: hasData ? 6 : 0
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
              label: ctx => hasData ? ` ${ctx.label}: ${formatINR(ctx.parsed)}` : ` ${ctx.label}: No sales yet`
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
