-- ========================================================
-- Infinity Traders — Database Schema
-- Database: infinity_traders_db
-- ========================================================

-- (Optional for local MySQL root user, commented out for cPanel/Hostinger):
-- CREATE DATABASE IF NOT EXISTS `infinity_traders_db` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `infinity_traders_db`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NULL,
  `role` ENUM('admin','staff') DEFAULT 'admin',
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Subcategories Table
CREATE TABLE IF NOT EXISTS `subcategories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Brands Table
CREATE TABLE IF NOT EXISTS `brands` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `sku` VARCHAR(100) NOT NULL UNIQUE,
  `barcode` VARCHAR(100) NULL,
  `category_id` INT NULL,
  `subcategory_id` INT NULL,
  `brand_id` INT NULL,
  `size` VARCHAR(50) NULL,
  `color` VARCHAR(50) NULL,
  `purchase_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `low_stock_threshold` INT DEFAULT 3,
  `notes` TEXT NULL,
  `image_url` VARCHAR(255) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`subcategory_id`) REFERENCES `subcategories`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Suppliers Table
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `contact_person` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `gstin` VARCHAR(20) NULL,
  `outstanding_balance` DECIMAL(10,2) DEFAULT 0.00,
  `status` ENUM('Active','Inactive') DEFAULT 'Active',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Customers Table
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `gstin` VARCHAR(20) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Sales Invoices Table
CREATE TABLE IF NOT EXISTS `sales_invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_no` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT NULL,
  `customer_name` VARCHAR(200) NULL,
  `customer_phone` VARCHAR(20) NULL,
  `customer_address` TEXT NULL,
  `date` DATE NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'Cash',
  `gst_enabled` TINYINT(1) DEFAULT 0,
  `gst_rate` DECIMAL(5,2) DEFAULT 0.00,
  `gst_type` ENUM('intrastate','interstate') DEFAULT 'intrastate',
  `subtotal` DECIMAL(10,2) DEFAULT 0.00,
  `total_discount` DECIMAL(10,2) DEFAULT 0.00,
  `taxable_amount` DECIMAL(10,2) DEFAULT 0.00,
  `cgst` DECIMAL(10,2) DEFAULT 0.00,
  `sgst` DECIMAL(10,2) DEFAULT 0.00,
  `igst` DECIMAL(10,2) DEFAULT 0.00,
  `grand_total` DECIMAL(10,2) DEFAULT 0.00,
  `amount_paid` DECIMAL(10,2) DEFAULT 0.00,
  `balance_due` DECIMAL(10,2) DEFAULT 0.00,
  `payment_status` ENUM('Paid','Partial','Unpaid') DEFAULT 'Paid',
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Sales Invoice Items Table
CREATE TABLE IF NOT EXISTS `sales_invoice_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `product_id` INT NULL,
  `sku` VARCHAR(100) NULL,
  `product_name` VARCHAR(200) NULL,
  `size` VARCHAR(50) NULL,
  `qty` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `line_total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Purchase Orders Table
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_no` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_id` INT NULL,
  `supplier_name` VARCHAR(200) NULL,
  `supplier_phone` VARCHAR(50) NULL,
  `supplier_address` TEXT NULL,
  `supplier_invoice_no` VARCHAR(100) NULL,
  `date` DATE NOT NULL,
  `gst_enabled` TINYINT(1) DEFAULT 0,
  `gst_rate` DECIMAL(5,2) DEFAULT 0.00,
  `subtotal` DECIMAL(10,2) DEFAULT 0.00,
  `gst_amount` DECIMAL(10,2) DEFAULT 0.00,
  `total_amount` DECIMAL(10,2) DEFAULT 0.00,
  `amount_paid` DECIMAL(10,2) DEFAULT 0.00,
  `balance_due` DECIMAL(10,2) DEFAULT 0.00,
  `payment_status` ENUM('Paid','Partial','Unpaid') DEFAULT 'Paid',
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` INT NOT NULL,
  `product_id` INT NULL,
  `sku` VARCHAR(100) NULL,
  `product_name` VARCHAR(200) NULL,
  `size` VARCHAR(50) NULL,
  `color` VARCHAR(50) NULL,
  `qty` INT NOT NULL,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `selling_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(10,2) DEFAULT 0.00,
  `line_total` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`purchase_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Settings Table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `business_name` VARCHAR(200) DEFAULT 'Infinity Traders',
  `business_address` TEXT NULL,
  `phone` VARCHAR(20) NULL,
  `email` VARCHAR(100) NULL,
  `gstin` VARCHAR(20) NULL,
  `default_gst_mode` TINYINT(1) DEFAULT 0,
  `invoice_prefix` VARCHAR(20) DEFAULT 'IT-INV',
  `currency` VARCHAR(10) DEFAULT 'INR',
  `low_stock_threshold` INT DEFAULT 3,
  `invoice_footer_text` VARCHAR(300) DEFAULT 'Thank you for shopping with Infinity Traders!',
  `next_invoice_num` INT DEFAULT 1,
  `next_purchase_num` INT DEFAULT 1,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Audit Log Table
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity` VARCHAR(50) NOT NULL,
  `entity_id` INT NULL,
  `detail` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Sales Returns Table
CREATE TABLE IF NOT EXISTS `sales_returns` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_no` VARCHAR(50) NOT NULL UNIQUE,
  `invoice_id` INT NULL,
  `invoice_no` VARCHAR(50) NULL,
  `customer_id` INT NULL,
  `customer_name` VARCHAR(200) NULL,
  `customer_phone` VARCHAR(20) NULL,
  `date` DATE NOT NULL,
  `total_refund_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `refund_method` VARCHAR(50) DEFAULT 'Cash',
  `refund_status` ENUM('Completed','Pending','Store Credit') DEFAULT 'Completed',
  `reason` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Sales Return Items Table
CREATE TABLE IF NOT EXISTS `sales_return_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `return_id` INT NOT NULL,
  `product_id` INT NULL,
  `product_name` VARCHAR(200) NULL,
  `sku` VARCHAR(100) NULL,
  `size` VARCHAR(50) NULL,
  `return_qty` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `refund_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `restock` TINYINT(1) DEFAULT 1,
  `item_condition` VARCHAR(100) DEFAULT 'Good (Restock)',
  FOREIGN KEY (`return_id`) REFERENCES `sales_returns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Customer Payments (Due Clearances) Table
CREATE TABLE IF NOT EXISTS `customer_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NULL,
  `customer_name` VARCHAR(200) NOT NULL,
  `invoice_id` INT NULL,
  `invoice_no` VARCHAR(50) NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'Cash',
  `payment_date` DATE NOT NULL,
  `notes` TEXT NULL,
  `received_by` INT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`invoice_id`) REFERENCES `sales_invoices`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


