<?php
// ========================================================
// Infinity Traders — Single Product API (GET / PUT / DELETE /api/products/item.php?id=)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    jsonResponse(['success' => false, 'error' => 'Valid product ID is required.'], 400);
}

if ($method === 'GET') {
    $stmt = $db->prepare("
        SELECT
            p.*,
            c.name AS category_name,
            sc.name AS subcategory_name,
            b.name AS brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
    $product = $stmt->fetch();

    if (!$product) {
        jsonResponse(['success' => false, 'error' => 'Product not found.'], 404);
    }

    $product['id'] = (int)$product['id'];
    $product['purchase_price'] = (float)$product['purchase_price'];
    $product['selling_price'] = (float)$product['selling_price'];
    $product['stock'] = (int)$product['stock'];
    $product['low_stock_threshold'] = (int)$product['low_stock_threshold'];
    $product['category'] = $product['category_name'] ?? '';
    $product['subcategory'] = $product['subcategory_name'] ?? '';
    $product['brand'] = $product['brand_name'] ?? '';
    $product['purchasePrice'] = $product['purchase_price'];
    $product['sellingPrice'] = $product['selling_price'];
    $product['lowStockThreshold'] = $product['low_stock_threshold'];
    $product['status'] = $product['is_active'] ? 'Active' : 'Inactive';

    jsonResponse(['success' => true, 'data' => $product]);
}

if ($method === 'PUT' || $method === 'POST') {
    $input = getJsonInput();

    $checkStmt = $db->prepare("SELECT id FROM products WHERE id = ? LIMIT 1");
    $checkStmt->execute([$id]);
    if (!$checkStmt->fetch()) {
        jsonResponse(['success' => false, 'error' => 'Product not found.'], 404);
    }

    $name = trim($input['name'] ?? '');
    $sku  = trim($input['sku'] ?? '');

    if (empty($name) || empty($sku)) {
        jsonResponse(['success' => false, 'error' => 'Product name and SKU are required.'], 400);
    }

    $skuCheck = $db->prepare("SELECT id FROM products WHERE sku = ? AND id != ? LIMIT 1");
    $skuCheck->execute([$sku, $id]);
    if ($skuCheck->fetch()) {
        jsonResponse(['success' => false, 'error' => "SKU '$sku' is already used by another product."], 400);
    }

    $categoryId = !empty($input['category_id']) ? (int)$input['category_id'] : null;
    if (!$categoryId && !empty($input['category'])) {
        $cStmt = $db->prepare("SELECT id FROM categories WHERE name = ? LIMIT 1");
        $cStmt->execute([trim($input['category'])]);
        $categoryId = $cStmt->fetchColumn() ?: null;
    }

    $subcategoryId = !empty($input['subcategory_id']) ? (int)$input['subcategory_id'] : null;
    if (!$subcategoryId && !empty($input['subcategory']) && $categoryId) {
        $scStmt = $db->prepare("SELECT id FROM subcategories WHERE category_id = ? AND name = ? LIMIT 1");
        $scStmt->execute([$categoryId, trim($input['subcategory'])]);
        $subcategoryId = $scStmt->fetchColumn() ?: null;
    }

    $brandId = !empty($input['brand_id']) ? (int)$input['brand_id'] : null;
    if (!$brandId && !empty($input['brand'])) {
        $bStmt = $db->prepare("SELECT id FROM brands WHERE name = ? LIMIT 1");
        $bStmt->execute([trim($input['brand'])]);
        $brandId = $bStmt->fetchColumn() ?: null;
    }

    $barcode          = trim($input['barcode'] ?? '') ?: null;
    $size             = trim($input['size'] ?? '') ?: null;
    if ($size !== null) {
        $size = trim(preg_replace('/^UK\s*/i', '', $size));
    }
    $color            = trim($input['color'] ?? '') ?: null;
    $purchase_price   = max(0, (float)($input['purchase_price'] ?? ($input['purchasePrice'] ?? 0)));
    $selling_price    = max(0, (float)($input['selling_price'] ?? ($input['sellingPrice'] ?? 0)));

    // In Strict Purchase Mode, stock cannot be modified via product edit form (only via New Purchase / Sales)
    $stockStmt = $db->prepare("SELECT stock FROM products WHERE id = ?");
    $stockStmt->execute([$id]);
    $stock = (int)$stockStmt->fetchColumn();
    $low_stock        = max(1, (int)($input['low_stock_threshold'] ?? ($input['lowStockThreshold'] ?? 3)));
    $notes            = trim($input['notes'] ?? '') ?: null;
    $image_url        = trim($input['image_url'] ?? ($input['image'] ?? '')) ?: null;
    $is_active        = isset($input['status']) ? ($input['status'] === 'Active' ? 1 : 0) : (isset($input['is_active']) ? ((int)$input['is_active'] ? 1 : 0) : 1);

    $updateStmt = $db->prepare("
        UPDATE products SET
            name = ?,
            sku = ?,
            barcode = ?,
            category_id = ?,
            subcategory_id = ?,
            brand_id = ?,
            size = ?,
            color = ?,
            purchase_price = ?,
            selling_price = ?,
            stock = ?,
            low_stock_threshold = ?,
            notes = ?,
            image_url = ?,
            is_active = ?,
            updated_at = NOW()
        WHERE id = ?
    ");

    try {
        $updateStmt->execute([
            $name, $sku, $barcode, $categoryId, $subcategoryId, $brandId,
            $size, $color, $purchase_price, $selling_price, $stock,
            $low_stock, $notes, $image_url, $is_active, $id
        ]);
    } catch (\PDOException $e) {
        if (strpos($e->getMessage(), 'image_url') !== false) {
            try {
                $db->exec("ALTER TABLE `products` ADD COLUMN `image_url` VARCHAR(255) NULL AFTER `notes`");
                $updateStmt->execute([
                    $name, $sku, $barcode, $categoryId, $subcategoryId, $brandId,
                    $size, $color, $purchase_price, $selling_price, $stock,
                    $low_stock, $notes, $image_url, $is_active, $id
                ]);
            } catch (\Throwable $ex) {
                $fallbackStmt = $db->prepare("
                    UPDATE products SET
                        name = ?, sku = ?, barcode = ?, category_id = ?,
                        subcategory_id = ?, brand_id = ?, size = ?, color = ?,
                        purchase_price = ?, selling_price = ?, stock = ?,
                        low_stock_threshold = ?, notes = ?, is_active = ?,
                        updated_at = NOW()
                    WHERE id = ?
                ");
                $fallbackStmt->execute([
                    $name, $sku, $barcode, $categoryId, $subcategoryId, $brandId,
                    $size, $color, $purchase_price, $selling_price, $stock,
                    $low_stock, $notes, $is_active, $id
                ]);
            }
        } else {
            jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    logAudit($db, 'UPDATE_PRODUCT', 'products', $id, ['name' => $name, 'sku' => $sku]);

    jsonResponse(['success' => true, 'message' => 'Product updated successfully.']);
}

if ($method === 'DELETE') {
    $saleCheck = $db->prepare("SELECT COUNT(*) FROM sales_invoice_items WHERE product_id = ?");
    $saleCheck->execute([$id]);
    $salesCount = (int)$saleCheck->fetchColumn();

    $purchaseCheck = $db->prepare("SELECT COUNT(*) FROM purchase_order_items WHERE product_id = ?");
    $purchaseCheck->execute([$id]);
    $purchaseCount = (int)$purchaseCheck->fetchColumn();

    if ($salesCount > 0 || $purchaseCount > 0) {
        $delStmt = $db->prepare("UPDATE products SET is_active = 0 WHERE id = ?");
        $delStmt->execute([$id]);
        logAudit($db, 'DEACTIVATE_PRODUCT', 'products', $id, ['reason' => 'Referenced in past transactions']);
        jsonResponse([
            'success' => true,
            'message' => 'Product deactivated (preserved for past transaction records).'
        ]);
    } else {
        $delStmt = $db->prepare("DELETE FROM products WHERE id = ?");
        $delStmt->execute([$id]);
        logAudit($db, 'DELETE_PRODUCT', 'products', $id);
        jsonResponse(['success' => true, 'message' => 'Product deleted successfully.']);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
