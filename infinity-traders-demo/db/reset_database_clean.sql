-- ========================================================
-- Infinity Traders — Reset Database / Clear Demo Data (0 Clean Slate)
-- Uses DELETE + AUTO_INCREMENT=1 to avoid MySQL 1701 Foreign Key errors
-- IMPORTANT: Admin User Login and Store Settings remain SAFE.
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Delete all transactions & related items
DELETE FROM `sales_return_items`;
DELETE FROM `sales_returns`;
DELETE FROM `customer_payments`;
DELETE FROM `sales_invoice_items`;
DELETE FROM `sales_invoices`;
DELETE FROM `purchase_order_items`;
DELETE FROM `purchase_orders`;
DELETE FROM `audit_log`;

-- 2. Delete demo products, customers, suppliers
DELETE FROM `products`;
DELETE FROM `customers`;
DELETE FROM `suppliers`;

-- 3. Reset auto-increment IDs to 1
ALTER TABLE `sales_return_items` AUTO_INCREMENT = 1;
ALTER TABLE `sales_returns` AUTO_INCREMENT = 1;
ALTER TABLE `customer_payments` AUTO_INCREMENT = 1;
ALTER TABLE `sales_invoice_items` AUTO_INCREMENT = 1;
ALTER TABLE `sales_invoices` AUTO_INCREMENT = 1;
ALTER TABLE `purchase_order_items` AUTO_INCREMENT = 1;
ALTER TABLE `purchase_orders` AUTO_INCREMENT = 1;
ALTER TABLE `audit_log` AUTO_INCREMENT = 1;
ALTER TABLE `products` AUTO_INCREMENT = 1;
ALTER TABLE `customers` AUTO_INCREMENT = 1;
ALTER TABLE `suppliers` AUTO_INCREMENT = 1;

-- 4. Reset next invoice & purchase counter to 1
UPDATE `settings` 
SET `next_invoice_num` = 1, 
    `next_purchase_num` = 1 
WHERE `id` = 1;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Success: Database reset to 0! All demo data cleared.' AS message;
