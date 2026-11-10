# Infinity Traders — PHP + MySQL Backend Integration Plan

> **Project**: Infinity Traders Retail Billing & Inventory Management System
> **Current State**: Frontend-only SPA (HTML + Vanilla JS, in-memory data)
> **Goal**: Fully persistent PHP + MySQL backend running on XAMPP
> **Prepared**: 2026-10-30

---

## 🔍 Project Analysis Summary

### Current File Structure

```
infinity-traders-demo/
├── index.html                  ← Single-page app entry point
├── README.md
└── assets/
    ├── css/
    │   ├── style.css           ← Main design system
    │   ├── responsive.css      ← Mobile/tablet styles
    │   └── print.css           ← Invoice print styles
    └── js/
        ├── sample-data.js      ← In-memory data store (categories, brands, blank arrays)
        ├── app.js              ← AppState object, routing, utilities
        ├── dashboard.js        ← KPIs, charts, low-stock alerts
        ├── billing.js          ← POS cart, GST, invoice preview & print
        ├── purchases.js        ← Purchase entry & history
        ├── inventory.js        ← Products CRUD, categories & brands
        ├── reports.js          ← 8 report types with Chart.js
        └── remaining.js        ← Suppliers, Customers, Settings
```

### What Each JS File Does (Data Flow)

| File | Reads From | Writes To |
|------|-----------|-----------|
| `app.js` | `AppState` (global object) | `AppState.*` arrays directly |
| `dashboard.js` | `AppState.sales`, `AppState.products` | Read-only (display) |
| `billing.js` | `AppState.products`, `AppState.customers` | `AppState.sales.push()`, stock deduct |
| `purchases.js` | `AppState.suppliers`, `AppState.products` | `AppState.purchases.push()`, stock add |
| `inventory.js` | `AppState.products`, `AppState.categories`, `AppState.brands` | Full CRUD on all three |
| `remaining.js` | `AppState.suppliers`, `AppState.customers`, `AppState.settings` | Full CRUD |
| `reports.js` | `AppState.sales`, `AppState.purchases`, `AppState.products` | Read-only (charts/tables) |

### Current Limitations to Fix

| Limitation | Fix |
|-----------|-----|
| Data resets on page refresh | PHP + MySQL persistent storage |
| No user login / authentication | Session-based PHP auth + `login.html` |
| No server-side validation | PHP validates all inputs before DB write |
| Settings not saved | `settings` table in MySQL |
| Stock update is client-side only | MySQL transaction on sale/purchase save |
| No audit trail | `audit_log` table, written on every mutation |
| No invoice number persistence | `settings.next_invoice_num` incremented atomically |

---

## 📁 Proposed Folder Structure (XAMPP)

```
C:\xampp\htdocs\infinity-traders\
│
├── index.html                      ← Existing (minor auth-check edit)
├── login.html                      ← NEW — Login page
├── BACKEND_PLAN.md                 ← This file
├── assets/                         ← All existing CSS/JS/images (unchanged)
│   ├── css/
│   ├── js/                         ← JS files will be updated in Phase 3-5
│   └── images/
│
├── api/                            ← NEW — PHP REST API layer
│   ├── config/
│   │   ├── db.php                  ← PDO database connection singleton
│   │   └── auth.php                ← Session auth helper & requireAuth()
│   │
│   ├── auth/
│   │   ├── login.php               ← POST  /api/auth/login.php
│   │   ├── logout.php              ← POST  /api/auth/logout.php
│   │   └── me.php                  ← GET   /api/auth/me.php
│   │
│   ├── products/
│   │   ├── index.php               ← GET (list+filter) / POST (create)
│   │   └── item.php                ← GET / PUT / DELETE  ?id=
│   │
│   ├── categories/
│   │   ├── index.php               ← GET (list with subcats) / POST (add category)
│   │   └── subcategory.php         ← POST (add subcat) / DELETE ?id=
│   │
│   ├── brands/
│   │   ├── index.php               ← GET / POST
│   │   └── item.php                ← PUT / DELETE  ?id=
│   │
│   ├── suppliers/
│   │   ├── index.php               ← GET / POST
│   │   └── item.php                ← GET / PUT / DELETE  ?id=
│   │
│   ├── customers/
│   │   ├── index.php               ← GET / POST
│   │   └── item.php                ← GET / PUT / DELETE  ?id=
│   │
│   ├── sales/
│   │   ├── index.php               ← GET (history, filter, paginate) / POST (new invoice)
│   │   └── item.php                ← GET (with items)  ?id=
│   │
│   ├── purchases/
│   │   ├── index.php               ← GET / POST (new purchase)
│   │   └── item.php                ← GET (with items)  ?id=
│   │
│   ├── dashboard/
│   │   └── stats.php               ← GET — KPIs + chart data
│   │
│   ├── reports/
│   │   └── index.php               ← GET ?type=sales|profit|stock|...
│   │
│   └── settings/
│       └── index.php               ← GET / PUT
│
└── db/                             ← NEW — Database files
    ├── schema.sql                  ← Full MySQL schema (run once)
    └── seed.sql                    ← Initial categories, brands, admin user
```

---

## 🗄️ MySQL Database Schema

### Database: `infinity_traders_db`

---

### Table: `users`
```sql
CREATE TABLE users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  full_name   VARCHAR(100),
  role        ENUM('admin','staff') DEFAULT 'admin',
  is_active   TINYINT(1) DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Table: `categories` + `subcategories`
```sql
CREATE TABLE categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subcategories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);
```

---

### Table: `brands`
```sql
CREATE TABLE brands (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Table: `products`
```sql
CREATE TABLE products (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  sku                 VARCHAR(100) NOT NULL UNIQUE,
  barcode             VARCHAR(100),
  category_id         INT,
  subcategory_id      INT,
  brand_id            INT,
  size                VARCHAR(50),
  color               VARCHAR(50),
  purchase_price      DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock               INT NOT NULL DEFAULT 0,
  low_stock_threshold INT DEFAULT 3,
  notes               TEXT,
  is_active           TINYINT(1) DEFAULT 1,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id)    REFERENCES categories(id)    ON DELETE SET NULL,
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id)       REFERENCES brands(id)        ON DELETE SET NULL
);
```

---

### Table: `suppliers`
```sql
CREATE TABLE suppliers (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  name                VARCHAR(200) NOT NULL,
  contact_person      VARCHAR(100),
  phone               VARCHAR(20),
  email               VARCHAR(100),
  address             TEXT,
  gstin               VARCHAR(20),
  outstanding_balance DECIMAL(10,2) DEFAULT 0,
  status              ENUM('Active','Inactive') DEFAULT 'Active',
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Table: `customers`
```sql
CREATE TABLE customers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(200) NOT NULL,
  phone      VARCHAR(20),
  email      VARCHAR(100),
  address    TEXT,
  gstin      VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### Table: `sales_invoices` + `sales_invoice_items`
```sql
CREATE TABLE sales_invoices (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  invoice_no     VARCHAR(50) NOT NULL UNIQUE,
  customer_id    INT,
  customer_name  VARCHAR(200),
  customer_phone VARCHAR(20),
  date           DATE NOT NULL,
  payment_method VARCHAR(50),
  gst_enabled    TINYINT(1) DEFAULT 0,
  gst_rate       DECIMAL(5,2) DEFAULT 0,
  gst_type       ENUM('intrastate','interstate') DEFAULT 'intrastate',
  subtotal       DECIMAL(10,2) DEFAULT 0,
  total_discount DECIMAL(10,2) DEFAULT 0,
  taxable_amount DECIMAL(10,2) DEFAULT 0,
  cgst           DECIMAL(10,2) DEFAULT 0,
  sgst           DECIMAL(10,2) DEFAULT 0,
  igst           DECIMAL(10,2) DEFAULT 0,
  grand_total    DECIMAL(10,2) DEFAULT 0,
  amount_paid    DECIMAL(10,2) DEFAULT 0,
  balance_due    DECIMAL(10,2) DEFAULT 0,
  payment_status ENUM('Paid','Partial','Unpaid') DEFAULT 'Paid',
  notes          TEXT,
  created_by     INT,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES users(id)     ON DELETE SET NULL
);

CREATE TABLE sales_invoice_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id   INT NOT NULL,
  product_id   INT,
  sku          VARCHAR(100),
  product_name VARCHAR(200),
  size         VARCHAR(50),
  qty          INT NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  discount     DECIMAL(10,2) DEFAULT 0,
  line_total   DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)       ON DELETE SET NULL
);
```

---

### Table: `purchase_orders` + `purchase_order_items`
```sql
CREATE TABLE purchase_orders (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  purchase_no         VARCHAR(50) NOT NULL UNIQUE,
  supplier_id         INT,
  supplier_invoice_no VARCHAR(100),
  date                DATE NOT NULL,
  gst_enabled         TINYINT(1) DEFAULT 0,
  gst_rate            DECIMAL(5,2) DEFAULT 0,
  subtotal            DECIMAL(10,2) DEFAULT 0,
  gst_amount          DECIMAL(10,2) DEFAULT 0,
  total_amount        DECIMAL(10,2) DEFAULT 0,
  amount_paid         DECIMAL(10,2) DEFAULT 0,
  balance_due         DECIMAL(10,2) DEFAULT 0,
  payment_status      ENUM('Paid','Partial','Unpaid') DEFAULT 'Paid',
  notes               TEXT,
  created_by          INT,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by)  REFERENCES users(id)     ON DELETE SET NULL
);

CREATE TABLE purchase_order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id  INT NOT NULL,
  product_id   INT,
  sku          VARCHAR(100),
  product_name VARCHAR(200),
  qty          INT NOT NULL,
  cost_price   DECIMAL(10,2) NOT NULL,
  discount     DECIMAL(10,2) DEFAULT 0,
  line_total   DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id)  REFERENCES products(id)        ON DELETE SET NULL
);
```

---

### Table: `settings`
```sql
CREATE TABLE settings (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  business_name       VARCHAR(200) DEFAULT 'Infinity Traders',
  business_address    TEXT,
  phone               VARCHAR(20),
  email               VARCHAR(100),
  gstin               VARCHAR(20),
  default_gst_mode    TINYINT(1) DEFAULT 0,
  invoice_prefix      VARCHAR(20) DEFAULT 'IT-INV',
  currency            VARCHAR(10) DEFAULT 'INR',
  low_stock_threshold INT DEFAULT 3,
  invoice_footer_text VARCHAR(300) DEFAULT 'Thank you for shopping with Infinity Traders!',
  next_invoice_num    INT DEFAULT 1,
  next_purchase_num   INT DEFAULT 1,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

### Table: `audit_log`
```sql
CREATE TABLE audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  action     VARCHAR(100),
  entity     VARCHAR(50),
  entity_id  INT,
  detail     JSON,
  ip_address VARCHAR(45),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

---

## 🔌 Complete API Endpoint Reference

All endpoints return `Content-Type: application/json`.
All endpoints (except `/api/auth/login.php`) require an active PHP session.

### Auth
| Method | Endpoint | Body / Params | Response |
|--------|----------|--------------|----------|
| POST | `/api/auth/login.php` | `{username, password}` | `{success, user}` |
| POST | `/api/auth/logout.php` | — | `{success}` |
| GET | `/api/auth/me.php` | — | `{id, username, role}` |

### Products
| Method | Endpoint | Body / Params | Response |
|--------|----------|--------------|----------|
| GET | `/api/products/index.php` | `?search=&category=&brand=&status=&page=&limit=` | `{data:[], total, pages}` |
| POST | `/api/products/index.php` | product JSON | `{success, id}` |
| GET | `/api/products/item.php?id=` | — | `{data:{...}}` |
| PUT | `/api/products/item.php?id=` | updated product JSON | `{success}` |
| DELETE | `/api/products/item.php?id=` | — | `{success}` |

### Categories & Brands
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/categories/index.php` | Returns categories with nested subcategories array |
| POST | `/api/categories/index.php` | `{name}` — new category |
| POST | `/api/categories/subcategory.php` | `{category_id, name}` — new subcategory |
| DELETE | `/api/categories/subcategory.php?id=` | Delete subcategory |
| GET | `/api/brands/index.php` | Returns brands with product_count |
| POST | `/api/brands/index.php` | `{name}` — new brand |
| DELETE | `/api/brands/item.php?id=` | Delete brand |

### Suppliers & Customers
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/suppliers/index.php` | `?search=&status=` |
| POST | `/api/suppliers/index.php` | Create supplier |
| PUT | `/api/suppliers/item.php?id=` | Update supplier |
| DELETE | `/api/suppliers/item.php?id=` | Delete supplier |
| GET | `/api/customers/index.php` | `?search=` |
| POST | `/api/customers/index.php` | Create customer |
| PUT | `/api/customers/item.php?id=` | Update customer |
| DELETE | `/api/customers/item.php?id=` | Delete customer |

### Sales (Billing)
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/sales/index.php` | `?search=&date_from=&date_to=&payment=&page=` |
| POST | `/api/sales/index.php` | Creates invoice + items + deducts stock (MySQL transaction) |
| GET | `/api/sales/item.php?id=` | Full invoice with all line items |

### Purchases
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/purchases/index.php` | `?search=&supplier=&status=&page=` |
| POST | `/api/purchases/index.php` | Creates purchase + items + adds stock (MySQL transaction) |
| GET | `/api/purchases/item.php?id=` | Full purchase with all line items |

### Dashboard & Reports
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/dashboard/stats.php` | KPI cards + chart data (weekly/monthly/yearly) |
| GET | `/api/reports/index.php?type=sales` | Sales trend report |
| GET | `/api/reports/index.php?type=purchase` | Purchase report |
| GET | `/api/reports/index.php?type=profit` | Gross profit report |
| GET | `/api/reports/index.php?type=category` | Category-wise sales |
| GET | `/api/reports/index.php?type=brand` | Brand-wise sales |
| GET | `/api/reports/index.php?type=stock` | Stock valuation |
| GET | `/api/reports/index.php?type=lowstock` | Low stock report |
| GET | `/api/reports/index.php?type=payment` | Payment collection summary |

### Settings
| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/settings/index.php` | Returns single settings row |
| PUT | `/api/settings/index.php` | Updates settings (UPDATE WHERE id=1) |

---

## 🔐 Authentication Strategy

- **Method**: PHP Session (`$_SESSION`)
- **Login**: `POST /api/auth/login.php` — verifies password with `password_verify()` — sets `$_SESSION['user_id']`
- **Guard**: Every API file starts with `require_once '../config/auth.php'; requireAuth();`
- **Session timeout**: 8 hours (`session.gc_maxlifetime`)
- **Password storage**: `password_hash($pass, PASSWORD_BCRYPT)` — never plaintext
- **Logout**: `session_destroy()`
- **Frontend guard**: `app.js` calls `GET /api/auth/me.php` on load — if 401, redirect to `login.html`
- **Default credentials** (created by `seed.sql`): `admin` / `infinity@2025` *(change after first login)*

---

## 🔄 JavaScript Migration Strategy

The SPA structure stays **100% intact**. Only the data layer changes.

### Step 1 — Add API helper functions to `app.js`

```js
async function apiGet(endpoint) {
  const res = await fetch(endpoint);
  if (res.status === 401) { location.href = 'login.html'; return; }
  return res.json();
}

async function apiPost(endpoint, data) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiPut(endpoint, data) {
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiDelete(endpoint) {
  const res = await fetch(endpoint, { method: 'DELETE' });
  return res.json();
}
```

### Step 2 — Replace AppState reads/writes (Pattern Examples)

```js
// BEFORE (in-memory)
const products = AppState.products;

// AFTER (API call)
const { data: products } = await apiGet('/api/products/index.php');
```

```js
// BEFORE (in-memory write)
AppState.sales.push(invoice);
updateStockAfterSale(invoice.items);

// AFTER (API — stock handled server-side in transaction)
const result = await apiPost('/api/sales/index.php', invoice);
if (result.success) showToast('Invoice saved!', 'success');
```

### Step 3 — Make render functions async

```js
// BEFORE
function renderInventory(container) {
  const products = AppState.products;
  // ... render table
}

// AFTER
async function renderInventory(container) {
  container.innerHTML = '<div class="loading-spinner">Loading...</div>';
  const { data: products } = await apiGet('/api/products/index.php');
  // ... same HTML render logic as before
}
```

### Files to Modify — Summary

| File | What Changes |
|------|-------------|
| `app.js` | Add `apiGet/Post/Put/Delete` helpers. Add auth check on DOMContentLoaded. Remove `AppState` data arrays (keep only `currentPage`). |
| `sample-data.js` | Remove all static arrays. Keep only `DEFAULT_SETTINGS` as UI fallback. |
| `dashboard.js` | Replace all `AppState.*` reads with `apiGet('/api/dashboard/stats.php')` |
| `billing.js` | Load products via API. Save invoice via `apiPost('/api/sales/index.php')` |
| `purchases.js` | Load suppliers/products via API. Save purchase via `apiPost('/api/purchases/index.php')` |
| `inventory.js` | All product/category/brand CRUD via API |
| `remaining.js` | Supplier/customer CRUD + settings GET/PUT via API |
| `reports.js` | All report data via `apiGet('/api/reports/index.php?type=...')` |

---

## 🛣️ Implementation Roadmap — 5 Phases

### ✅ Phase 1 — Database Setup
**Estimated Time: 2–3 hours**

- [x] Open phpMyAdmin (`http://localhost/phpmyadmin`) / MySQL CLI
- [x] Create database: `infinity_traders_db` (charset: `utf8mb4_unicode_ci`)
- [x] Run `db/schema.sql` — creates all 13 tables
- [x] Run `db/seed.sql` — inserts categories, brands, admin user, default settings row
- [x] Create `api/config/db.php` with PDO connection
- [x] Create `api/config/auth.php` with `requireAuth()` helper

**Deliverable**: Database running, connection tested via phpMyAdmin & CLI ✅

---

### ✅ Phase 2 — Authentication & Settings API
**Estimated Time: 3–4 hours**

- [x] Create `login.html` (styled to match existing design)
- [x] Build `/api/auth/login.php` — verifies credentials, starts session
- [x] Build `/api/auth/logout.php` — destroys session
- [x] Build `/api/auth/me.php` — returns session user info
- [x] Edit `app.js` — add auth check on `DOMContentLoaded`
- [x] Build `/api/settings/index.php` — GET + PUT
- [x] Migrate `renderSettings()` in `remaining.js` to use API

**Deliverable**: Login page works, settings persist after page reload ✅

---

### ✅ Phase 3 — Inventory API + JS Migration
**Estimated Time: 4–5 hours**

- [x] Build `/api/products/index.php` (GET list + POST create)
- [x] Build `/api/products/item.php` (GET + PUT + DELETE)
- [x] Build `/api/categories/index.php` + `subcategory.php`
- [x] Build `/api/brands/index.php` + `item.php`
- [x] Migrate `inventory.js` — all CRUD via `apiGet/Post/Put/Delete`
- [x] Remove product/category/brand arrays from `sample-data.js`
- [x] Verify seed data loads correctly in UI

**Deliverable**: Products, categories, brands fully persistent ✅

---

### ✅ Phase 4 — Contacts & Transactions API + JS Migration
**Estimated Time: 6–8 hours**

- [x] Build `/api/suppliers/` (GET + POST + PUT + DELETE)
- [x] Build `/api/customers/` (GET + POST + PUT + DELETE)
- [x] Migrate `remaining.js` suppliers & customers sections
- [x] Build `/api/sales/index.php`:
  - Validate payload
  - Begin MySQL transaction
  - Insert `sales_invoices` row
  - Insert all `sales_invoice_items` rows
  - Deduct stock from `products` for each item
  - Increment `settings.next_invoice_num`
  - Write `audit_log` entry
  - COMMIT (or ROLLBACK on any error)
- [x] Build `/api/sales/item.php`
- [x] Build `/api/purchases/index.php` (same transaction pattern, add stock)
- [x] Build `/api/purchases/item.php`
- [x] Migrate `billing.js` — load products from API, save invoice via API
- [x] Migrate `purchases.js` — load suppliers/products, save purchase via API

**Deliverable**: Full billing & purchase flow with persistent stock updates ✅

---

### ✅ Phase 5 — Dashboard, Reports & Final Hardening
**Estimated Time: 4–5 hours**

- [x] Build `/api/dashboard/stats.php`:
  - Today's sales total
  - This month's sales and purchases
  - Total products, low stock count
  - Chart data (weekly/monthly/yearly aggregates)
  - Recent sales (last 5) and purchases (last 5)
  - Low stock product list
- [x] Migrate `dashboard.js`
- [x] Build `/api/reports/index.php` for all 8 report types:
  - `sales` — date-range sales trend
  - `purchase` — purchase trend
  - `profit` — gross profit (selling_price - purchase_price) x qty sold
  - `category` — category-wise sales grouping
  - `brand` — brand-wise sales grouping
  - `stock` — stock valuation (current stock x purchase_price)
  - `lowstock` — products below low_stock_threshold
  - `payment` — payment method summary
- [x] Migrate `reports.js`
- [x] Add loading spinners to all async render functions
- [x] End-to-end test: add product → create invoice → check stock → view report
- [x] Test print invoice (browser print — no changes needed)
- [x] Test CSV export (still client-side — no changes needed)

**Deliverable**: Fully functional, fully persistent production-ready system ✅

---

## ⚙️ Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| PHP version | PHP 8.1+ | PDO, named args, null-safe operator |
| DB access | PDO + Prepared Statements | Prevents SQL injection; industry standard |
| Auth method | PHP Sessions | Simple, native, works on XAMPP without extra config |
| API design | Plain PHP files per resource | No framework overhead; easy to read and maintain |
| Stock update | MySQL transaction (server-side) | Prevents partial updates and race conditions |
| Invoice number | SELECT ... FOR UPDATE on settings row | Atomic increment, no duplicate invoice numbers |
| Password | password_hash() / password_verify() | PHP built-in bcrypt |
| Input safety | htmlspecialchars() + PDO binding | Defense-in-depth |
| CORS | Not needed | Same-origin (all on XAMPP localhost) |

---

## 🚀 Quick Start Checklist (After All Phases Complete)

```
1. XAMPP installed — Apache + MySQL running
2. Folder copied to: C:\xampp\htdocs\infinity-traders\
3. phpMyAdmin: imported db/schema.sql then db/seed.sql
4. api/config/db.php: MySQL password set correctly
5. Visit: http://localhost/infinity-traders/login.html
6. Login: admin / infinity@2025
7. Change admin password in Settings after first login
```

---

## ⚠️ Important Notes

**Stock Safety**: Sale and purchase save endpoints MUST use `BEGIN; ... COMMIT;` MySQL transactions. Never update stock outside a transaction.

**Invoice Numbers**: Always lock the settings row with `SELECT next_invoice_num FROM settings WHERE id=1 FOR UPDATE` before incrementing. This prevents duplicate invoice numbers under concurrent access.

**Input Validation**: Validate all inputs in PHP even if JavaScript already validates them client-side. Never trust client data.

**Passwords**: Never store plaintext. Always use `password_hash()`. The seed admin password `infinity@2025` is stored as a bcrypt hash in `seed.sql`.

**Backup**: Use phpMyAdmin Export to back up `infinity_traders_db` after each phase and daily in production.

---

## 📋 Technology Stack (Final)

| Layer | Technology |
|-------|-----------|
| Frontend SPA | HTML5 + Vanilla JS (ES6+) — unchanged |
| Styling | Custom CSS3 + Bootstrap 5.3 — unchanged |
| Charts | Chart.js 4.4 — unchanged |
| Backend | PHP 8.1+ |
| Database | MySQL 8.0+ (via XAMPP) |
| DB Access | PDO with prepared statements |
| Auth | PHP Sessions |
| Server | Apache (XAMPP) |

---

*Plan prepared for Infinity Traders internal development.*
*Estimated total development time: **19–25 hours** across 5 phases.*
