-- ========================================================
-- Infinity Traders — Product Insert SQL
-- Product: Premium Tracksuit Adidas
-- Category: Cloths
-- Subcategory: Tracksuit
-- Brand: Adidas
-- Sizes: M, L, XL, XXL (10 Pieces Each)
-- Color: Black/White
-- ========================================================

-- 1. Ensure Category 'Cloths' exists
INSERT INTO `categories` (`name`) 
VALUES ('Cloths')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Get Category ID for 'Cloths'
SET @cat_id = (SELECT `id` FROM `categories` WHERE `name` = 'Cloths' LIMIT 1);

-- 2. Ensure Brand 'Adidas' exists
INSERT INTO `brands` (`name`) 
VALUES ('Adidas')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Get Brand ID for 'Adidas'
SET @brand_id = (SELECT `id` FROM `brands` WHERE `name` = 'Adidas' LIMIT 1);

-- 3. Ensure Subcategory 'Tracksuit' exists under 'Cloths'
INSERT INTO `subcategories` (`category_id`, `name`) 
SELECT @cat_id, 'Tracksuit'
WHERE NOT EXISTS (
    SELECT 1 FROM `subcategories` WHERE `category_id` = @cat_id AND `name` = 'Tracksuit'
);

-- Get Subcategory ID for 'Tracksuit'
SET @subcat_id = (SELECT `id` FROM `subcategories` WHERE `category_id` = @cat_id AND `name` = 'Tracksuit' LIMIT 1);

-- 4. Insert 4 Size Variants (M, L, XL, XXL) — 10 pieces each
-- Note: You can adjust purchase_price and selling_price if needed.

INSERT INTO `products` (
    `name`,
    `sku`,
    `barcode`,
    `category_id`,
    `subcategory_id`,
    `brand_id`,
    `size`,
    `color`,
    `purchase_price`,
    `selling_price`,
    `stock`,
    `low_stock_threshold`,
    `notes`,
    `is_active`,
    `created_at`
) VALUES 
-- Size: M
(
    'Premium Tracksuit Adidas',
    'ADIDAS-TS-BW-M',
    'AD890101',
    @cat_id,
    @subcat_id,
    @brand_id,
    'M',
    'Black/White',
    0.00,
    0.00,
    10,
    3,
    'Premium quality Adidas tracksuit, color black/white, size M',
    1,
    NOW()
),
-- Size: L
(
    'Premium Tracksuit Adidas',
    'ADIDAS-TS-BW-L',
    'AD890102',
    @cat_id,
    @subcat_id,
    @brand_id,
    'L',
    'Black/White',
    0.00,
    0.00,
    10,
    3,
    'Premium quality Adidas tracksuit, color black/white, size L',
    1,
    NOW()
),
-- Size: XL
(
    'Premium Tracksuit Adidas',
    'ADIDAS-TS-BW-XL',
    'AD890103',
    @cat_id,
    @subcat_id,
    @brand_id,
    'XL',
    'Black/White',
    0.00,
    0.00,
    10,
    3,
    'Premium quality Adidas tracksuit, color black/white, size XL',
    1,
    NOW()
),
-- Size: XXL
(
    'Premium Tracksuit Adidas',
    'ADIDAS-TS-BW-XXL',
    'AD890104',
    @cat_id,
    @subcat_id,
    @brand_id,
    'XXL',
    'Black/White',
    0.00,
    0.00,
    10,
    3,
    'Premium quality Adidas tracksuit, color black/white, size XXL',
    1,
    NOW()
)
ON DUPLICATE KEY UPDATE 
    `name`           = VALUES(`name`),
    `category_id`    = VALUES(`category_id`),
    `subcategory_id` = VALUES(`subcategory_id`),
    `brand_id`       = VALUES(`brand_id`),
    `size`           = VALUES(`size`),
    `color`          = VALUES(`color`),
    `stock`          = VALUES(`stock`),
    `low_stock_threshold` = VALUES(`low_stock_threshold`),
    `notes`          = VALUES(`notes`),
    `is_active`      = 1;
