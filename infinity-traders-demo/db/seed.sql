-- ========================================================
-- Infinity Traders — Seed Data
-- Database: infinity_traders_db
-- ========================================================

-- USE `infinity_traders_db`;

-- 1. Seed Admin User (username: admin, password: infinity@2025)
INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `role`, `is_active`)
VALUES (
  1,
  'admin',
  '$2y$10$7pformWFglmdOkPfIavjyuiL5/BvwIED6sDcaQd5y7NzUQSL6qcSi',
  'System Administrator',
  'admin',
  1
) ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- 2. Seed Categories
INSERT INTO `categories` (`id`, `name`) VALUES
(1, 'Shoes'),
(2, 'Sports Wears'),
(3, 'Slippers')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Seed Subcategories
INSERT INTO `subcategories` (`id`, `category_id`, `name`) VALUES
(1, 1, 'Running Shoes'),
(2, 1, 'Sneakers'),
(3, 1, 'Football Boots'),
(4, 1, 'Formal Shoes'),
(5, 2, 'Jerseys'),
(6, 2, 'Shorts'),
(7, 2, 'Tracksuits'),
(8, 2, 'Gym Wear'),
(9, 3, 'Flip Flops'),
(10, 3, 'Slides'),
(11, 3, 'Clogs')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Seed Brands
INSERT INTO `brands` (`id`, `name`) VALUES
(1, 'Nike'),
(2, 'Adidas'),
(3, 'ASICS'),
(4, 'Puma'),
(5, 'Crocs'),
(6, 'Under Armour'),
(7, 'Other')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 5. Seed Default Settings (Row id = 1)
INSERT INTO `settings` (
  `id`,
  `business_name`,
  `business_address`,
  `phone`,
  `email`,
  `gstin`,
  `default_gst_mode`,
  `invoice_prefix`,
  `currency`,
  `low_stock_threshold`,
  `invoice_footer_text`,
  `next_invoice_num`,
  `next_purchase_num`
) VALUES (
  1,
  'Infinity Traders',
  '123 Fashion Street, Commercial Market, Mumbai - 400001',
  '+91 98765 43210',
  'contact@infinitytraders.com',
  '27AABCU9603R1ZM',
  0,
  'IT-INV',
  'INR',
  3,
  'Thank you for shopping with Infinity Traders! Terms: Goods once sold cannot be returned.',
  1,
  1
) ON DUPLICATE KEY UPDATE `business_name` = VALUES(`business_name`);
