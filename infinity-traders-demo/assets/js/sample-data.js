/**
 * INFINITY TRADERS — Application Data Store (sample-data.js)
 * =========================================================
 * Persistent storage is now backed by PHP + MySQL API endpoints.
 * In-memory stores are initialized empty and populated from the backend database.
 */

'use strict';

const CATEGORIES_DATA = [];
const BRANDS_DATA = [];
const SUPPLIERS_DATA = [];
const CUSTOMERS_DATA = [];
const PRODUCTS_DATA = [];
const SALES_DATA = [];
const PURCHASES_DATA = [];

function getDynamicChartData(period) {
  const sales = [];
  const purchases = [];
  const labels = [];
  const allSales = (typeof AppState !== 'undefined' && AppState.sales) ? AppState.sales : [];
  const allPurchases = (typeof AppState !== 'undefined' && AppState.purchases) ? AppState.purchases : [];

  if (period === 'weekly') {
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
      labels.push(dayName);

      const daySales = allSales
        .filter(s => s.date === iso)
        .reduce((sum, s) => sum + (s.grandTotal || s.grand_total || 0), 0);
      sales.push(daySales);

      const dayPurchases = allPurchases
        .filter(p => p.date === iso)
        .reduce((sum, p) => sum + (p.totalAmount || p.total_amount || 0), 0);
      purchases.push(dayPurchases);
    }
  } else if (period === 'monthly') {
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const ymPrefix = `${year}-${month}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      labels.push(label);

      const mSales = allSales
        .filter(s => (s.date || '').startsWith(ymPrefix))
        .reduce((sum, s) => sum + (s.grandTotal || s.grand_total || 0), 0);
      sales.push(mSales);

      const mPurchases = allPurchases
        .filter(p => (p.date || '').startsWith(ymPrefix))
        .reduce((sum, p) => sum + (p.totalAmount || p.total_amount || 0), 0);
      purchases.push(mPurchases);
    }
  } else if (period === 'yearly') {
    const currentYear = new Date().getFullYear();
    for (let i = 2; i >= 0; i--) {
      const yr = currentYear - i;
      const yrStr = String(yr);
      labels.push(yrStr);

      const ySales = allSales
        .filter(s => (s.date || '').startsWith(yrStr))
        .reduce((sum, s) => sum + (s.grandTotal || s.grand_total || 0), 0);
      sales.push(ySales);

      const yPurchases = allPurchases
        .filter(p => (p.date || '').startsWith(yrStr))
        .reduce((sum, p) => sum + (p.totalAmount || p.total_amount || 0), 0);
      purchases.push(yPurchases);
    }
  }
  return { labels, sales, purchases };
}

const CHART_DATA = {
  get weekly() { return getDynamicChartData('weekly'); },
  get monthly() { return getDynamicChartData('monthly'); },
  get yearly() { return getDynamicChartData('yearly'); }
};

// ─── DEFAULT SETTINGS FALLBACK ────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  businessName: 'Infinity Traders',
  businessAddress: '123 Fashion Street, Commercial Market, Mumbai - 400001',
  phone: '+91 98765 43210',
  email: 'contact@infinitytraders.com',
  gstin: '27AABCU9603R1ZM',
  defaultGstMode: false,
  invoicePrefix: 'IT-INV',
  currency: 'INR',
  lowStockThreshold: 3,
  invoiceFooterText: 'Thank you for shopping with Infinity Traders! Terms: Goods once sold cannot be returned.'
};
