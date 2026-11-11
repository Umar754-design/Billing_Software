-- ========================================================
-- Infinity Traders — Reset Transactions & Set Stock to 0
-- (Keeps Products, Categories, Brands, Customers, Suppliers)
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Delete all transactions
DELETE FROM `sales_return_items`;
DELETE FROM `sales_returns`;
DELETE FROM `customer_payments`;
DELETE FROM `sales_invoice_items`;
DELETE FROM `sales_invoices`;
DELETE FROM `purchase_order_items`;
DELETE FROM `purchase_orders`;
DELETE FROM `audit_log`;

-- 2. Reset IDs
ALTER TABLE `sales_return_items` AUTO_INCREMENT = 1;
ALTER TABLE `sales_returns` AUTO_INCREMENT = 1;
ALTER TABLE `customer_payments` AUTO_INCREMENT = 1;
ALTER TABLE `sales_invoice_items` AUTO_INCREMENT = 1;
ALTER TABLE `sales_invoices` AUTO_INCREMENT = 1;
ALTER TABLE `purchase_order_items` AUTO_INCREMENT = 1;
ALTER TABLE `purchase_orders` AUTO_INCREMENT = 1;
ALTER TABLE `audit_log` AUTO_INCREMENT = 1;

-- 3. Set stock to 0 and reset balances
UPDATE `products` SET `stock` = 0;
UPDATE `customers` SET `outstanding_balance` = 0.00;
UPDATE `suppliers` SET `outstanding_balance` = 0.00;

-- 4. Reset next invoice & purchase counter to 1
UPDATE `settings` 
SET `next_invoice_num` = 1, 
    `next_purchase_num` = 1 
WHERE `id` = 1;

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Success: Stock set to 0 and all transactions cleared!' AS message;
