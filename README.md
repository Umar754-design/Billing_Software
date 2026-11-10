# Infinity Traders — Retail Billing & Inventory Management Software

A full-stack, production-ready Retail Billing, Point of Sale (POS), Inventory, Purchases, Customer Returns, and Supplier Management Web Application with a PHP & MySQL backend.

Live Demo: [https://infinitytrader.esywork.in](https://infinitytrader.esywork.in)

---

## 🚀 Key Features

### 1. 🧾 POS Billing & Invoicing
- Fast barcode/SKU search and product selection.
- Dynamic cart with item-level and bill-level discounts.
- Comprehensive GST calculation (CGST, SGST, IGST with configurable rates 0%, 5%, 12%, 18%, 28%).
- Multi-mode payment handling (Cash, UPI, Card, Net Banking) with Due Amount tracking.
- Instant A4 & Thermal 80mm printable invoice layout.
- Real-time stock decrement upon invoice generation.

### 2. 📦 Strict Purchase & Stock Intake
- Supplier-linked purchasing workflow.
- Multi-item intake with cost price, suggested selling price, size, color, and tax rates.
- Automatic inventory addition and weighted purchase rate adjustment.
- Purchase order printing and supplier transaction ledger.

### 3. 🔄 Customer Returns & Refunds
- Original invoice look-up with automatic discount apportioning.
- Item condition checking (Restock into inventory vs. Damaged/Write-off).
- Refund modes (Cash, Bank/UPI, Credit Note).
- Accurate recalculation of refunded amounts preserving original sale prices.

### 4. 📊 Products & Inventory Management
- Categorized product catalog (Categories, Subcategories, Brands).
- Multi-variant support (Size, Color, SKU).
- Low Stock Threshold warning indicators.
- Strict Purchase Mode preventing unverified stock tampering.

### 5. 👥 Customer & Supplier Management
- Customer balance and due amount clearance with full payment history.
- Supplier purchase tracking, invoice numbers, and payment status.

### 6. 📈 Reports & Business Analytics
- Daily, Weekly, Monthly, and Annual Sales & Profit analytics.
- Category-wise and Brand-wise performance charts.
- Stock valuation report (Cost vs. Selling valuation).
- CSV export for all reports and histories.

### 7. 🔐 Security & Administration
- Session-based authentication with bcrypt password hashing.
- Role-based permissions (Admin, Cashier, Inventory Manager).
- PDO prepared statements with SQL injection prevention and UTF-8 / UTF8mb4 full unicode collation.
- Comprehensive audit trail logging for all financial operations.

---

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+), Bootstrap 5.3, Bootstrap Icons, Chart.js
- **Backend**: PHP 8.x (RESTful API architecture, PDO Singleton)
- **Database**: MySQL 8.x / MariaDB 10.x with InnoDB and `utf8mb4_unicode_ci`
- **Deployment**: Compatible with XAMPP (Local) and Hostinger / cPanel Shared & VPS Hosting

---

## 📁 Project Directory Structure

```text
├── infinity-traders-demo/
│   ├── index.html                   # Main application dashboard & SPA container
│   ├── login.html                   # Authentication portal
│   ├── api/                         # Backend REST API endpoints
│   │   ├── auth/                    # Login, logout, session check
│   │   ├── brands/                  # Brand management
│   │   ├── categories/              # Categories and subcategories
│   │   ├── config/                  # Database PDO and authentication helpers
│   │   ├── customers/               # Customer CRM and due amount clearance
│   │   ├── dashboard/               # Real-time analytics and KPI stats
│   │   ├── products/                # Product catalog & stock
│   │   ├── purchases/               # Supplier purchase orders & stock intake
│   │   ├── reports/                 # Financial and inventory reporting
│   │   ├── returns/                 # Customer sales returns
│   │   ├── sales/                   # Invoicing & POS transactions
│   │   ├── settings/                # Store profile & invoice settings
│   │   └── suppliers/               # Supplier database
│   ├── assets/
│   │   ├── css/                     # Application styling & responsive stylesheets
│   │   └── js/                      # Modular JavaScript controllers
│   └── db/
│       ├── schema.sql               # MySQL database structure
│       ├── seed.sql                 # Initial seed data
│       └── infinity_traders_full_hostinger.sql # Complete database backup dump
```

---

## ⚙️ Installation & Setup

### 1. Database Setup
1. Create a MySQL database (e.g. `infinity_traders_db`).
2. Import `infinity-traders-demo/db/infinity_traders_full_hostinger.sql` using phpMyAdmin or MySQL CLI:
   ```bash
   mysql -u username -p database_name < infinity-traders-demo/db/infinity_traders_full_hostinger.sql
   ```

### 2. Configure Database Credentials
Edit `infinity-traders-demo/api/config/db.php` or set environment variables:
```php
$host = getenv('DB_HOST') ?: '127.0.0.1';
$port = getenv('DB_PORT') ?: '3306';
$db   = getenv('DB_NAME') ?: 'infinity_traders_db';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') !== false ? getenv('DB_PASS') : '';
```

### 3. Run Locally with XAMPP
1. Move or clone the `infinity-traders-demo` folder into `htdocs/`.
2. Start Apache and MySQL from XAMPP Control Panel.
3. Open `http://localhost/infinity-traders-demo/login.html` in your browser.
4. Default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`

---

## 📄 License
This project is proprietary software developed for Infinity Traders.
