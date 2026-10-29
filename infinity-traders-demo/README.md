# Infinity Traders — Retail Billing & Inventory Management System
## Frontend Prototype v1.0

> **⚠ Demo Notice**: This is a **frontend-only prototype** built for client review. All data is fictional, stored in-memory, and resets on page refresh. No real business data is stored anywhere.

---

## 🚀 Quick Start

### Option A: XAMPP (Recommended)
1. Copy the `infinity-traders-demo/` folder to your XAMPP `htdocs` directory:
   ```
   C:\xampp\htdocs\infinity-traders-demo\
   ```
2. Start XAMPP and ensure Apache is running.
3. Open your browser and navigate to:
   ```
   http://localhost/infinity-traders-demo/
   ```

### Option B: VS Code Live Server
1. Open the `infinity-traders-demo/` folder in VS Code.
2. Install the "Live Server" extension if not already installed.
3. Right-click `index.html` → **Open with Live Server**.

### Option C: Direct File Open (Limited — CDN required)
1. Open `index.html` directly in Chrome or Edge.
2. **Note**: Bootstrap, Chart.js, and Bootstrap Icons are loaded from CDN — internet connection is required.

---

## 📁 Project Structure

```
infinity-traders-demo/
├── index.html                  ← Main application entry point
├── README.md
└── assets/
    ├── css/
    │   ├── style.css           ← Main design system & component styles
    │   ├── responsive.css      ← Tablet & mobile responsive styles
    │   └── print.css           ← Invoice print styles
    ├── js/
    │   ├── sample-data.js      ← All fictional sample data
    │   ├── app.js              ← Core: routing, state, utilities, toasts
    │   ├── dashboard.js        ← Dashboard KPIs, charts, quick actions
    │   ├── billing.js          ← POS billing, cart, GST, invoice preview
    │   ├── purchases.js        ← Purchase entry & purchase history
    │   ├── inventory.js        ← Products, categories, brands, sales history
    │   ├── reports.js          ← 8 report types with Chart.js & CSV export
    │   └── remaining.js        ← Suppliers, customers, settings
    └── images/
        └── logo-placeholder.svg ← Placeholder logo (to be replaced)
```

---

## ✅ Features Implemented

### Dashboard
- [x] 6 KPI cards with INR formatting and sample percentage changes
- [x] Interactive Sales & Purchase bar chart (Weekly/Monthly/Yearly)
- [x] Recent Sales, Recent Purchases, Low Stock Alerts
- [x] Best-Selling Products, Category Donut Chart
- [x] Quick Action buttons

### New Billing / POS
- [x] Product search (name/SKU) with category & brand filters
- [x] Product grid with stock status indicators
- [x] Add to cart, remove, quantity update, item-level discount
- [x] Stock overflow prevention
- [x] GST toggle (Off by default) with rate selection (5/12/18/28%)
- [x] CGST+SGST or IGST breakdown selection
- [x] Live total calculation (subtotal, discount, taxable, GST, grand total)
- [x] Customer name, phone, invoice number, date, payment method
- [x] Amount paid → balance due calculation
- [x] Invoice preview modal with all details
- [x] Browser print invoice with print CSS
- [x] Complete sale → updates in-memory stock & sales history

### Purchases
- [x] Purchase entry form with multi-product support
- [x] Supplier selection, supplier invoice, date
- [x] Per-line quantity, cost, and discount
- [x] Optional GST with rate selector
- [x] Payment status (Paid/Partial/Unpaid) with amount paid
- [x] Form validation with error messages
- [x] Confirmation dialog before saving
- [x] Saved purchase updates stock levels
- [x] Purchase History table with search, supplier, status, and date filters
- [x] View purchase details modal
- [x] Print purchase order
- [x] CSV export of filtered purchase history

### Products & Inventory
- [x] Searchable product table with category, brand, and stock status filters
- [x] Profit margin % display per product
- [x] Add/Edit product modal with full form validation
- [x] SKU uniqueness validation
- [x] Category → subcategory dynamic dropdown
- [x] View product details modal
- [x] Color-coded stock status (green/amber/red)
- [x] CSV export of filtered inventory
- [x] Pagination (12 per page)

### Categories & Brands
- [x] View all categories with subcategories
- [x] Add new category via prompt
- [x] Add subcategory to existing category
- [x] View all brands with product counts
- [x] Add new brand via prompt

### Sales History
- [x] Full sales table with search, date range, payment method, GST filters
- [x] Invoice preview modal for each sale
- [x] Print invoice from history
- [x] CSV export of filtered sales
- [x] Pagination

### Suppliers
- [x] Supplier list with search & status filter
- [x] Add/Edit supplier modal with full details
- [x] View supplier details with purchase summary
- [x] Outstanding balance tracking

### Customers
- [x] Customer list with search
- [x] Add/Edit customer modal
- [x] View customer details with recent invoices

### Reports (8 types)
- [x] Sales Report (trend chart + table)
- [x] Purchase Report (bar chart)
- [x] Gross Profit Report (multi-dataset chart + table)
- [x] Category-wise Sales (donut chart + table)
- [x] Brand-wise Sales (horizontal bar chart + table)
- [x] Stock Valuation (purchase vs. selling price)
- [x] Low Stock Report (with reorder action)
- [x] Payment Collection Summary (pie chart + table)
- [x] All reports have CSV export
- [x] Weekly / Monthly / Yearly period selector

### Settings
- [x] Business name, address, phone, email, GSTIN (all placeholders)
- [x] Invoice prefix, currency, low stock threshold, GST default, footer text
- [x] Session-only save (in-memory)
- [x] Future features roadmap display

---

## 📊 Sample Data Included

| Type | Count |
|------|-------|
| Product Variants | 25 |
| Suppliers | 6 |
| Customers | 10 |
| Sales Invoices | 15 |
| Purchase Records | 10 |
| Brands | 7 |
| Categories | 3 (with subcategories) |

---

## ⚠ Known Limitations (Frontend Prototype)

| Limitation | Next Phase Action |
|-----------|------------------|
| Data resets on page refresh | PHP + MySQL backend with persistent storage |
| No authentication or user login | Implement secure login with sessions |
| GST rates are sample demo values | Integrate legally validated GST logic |
| Business address / GSTIN are placeholders | Fill in after client approval |
| No barcode scanner integration | Add barcode reader API support |
| No email/WhatsApp invoice sending | Add server-side email/WhatsApp integration |
| No multi-user support | Role-based access control system |
| No audit trail | Server-side activity logging |
| CSV imports not available | Add bulk product import via CSV |

---

## 🛣 Next Steps — PHP + MySQL Integration

The following will be implemented in Phase 2 after client approval:

1. **Database Design**: MySQL schema for products, inventory, sales, purchases, suppliers, customers, users
2. **PHP API Layer**: RESTful endpoints for CRUD operations
3. **Authentication**: Secure login system with session management
4. **Server-Side Validation**: Input sanitization and business logic validation
5. **GST Engine**: Legally compliant tax calculation per product category
6. **Audit Logging**: Track all transactions with timestamps and user info
7. **Backup & Reporting**: Automated database backups and advanced report generation
8. **XAMPP Deployment**: Configure Apache + PHP + MySQL for local production use

---

## 🎨 Design System

- **Primary**: Royal Blue `#2457D6`
- **Sidebar**: Deep Navy `#14213D`
- **Background**: Light Gray `#F5F7FB`
- **Accent**: Gold `#D4AF37`
- **Typography**: Inter + Poppins (Google Fonts)

---

## 📋 Technology Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom design system with CSS variables
- **Bootstrap 5.3** — Grid, modals, dropdowns, form utilities
- **Bootstrap Icons 1.11** — Icon library
- **Vanilla JavaScript (ES6+)** — All app logic
- **Chart.js 4.4** — Interactive charts

---

## 📞 Support

This prototype was developed for **Infinity Traders** internal use.  
Website: [https://www.infinitytraders.shop/](https://www.infinitytraders.shop/)

> **⚠ Security Notice**: This demo uses no backend, no authentication, and no database. Do NOT use this prototype in a production environment. Do NOT enter real customer data, real financial figures, or real GSTIN in this demo.
