<?php
// ========================================================
// Infinity Traders — Products API (GET / POST /api/products/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $search   = trim($_GET['search'] ?? '');
    $category = trim($_GET['category'] ?? '');
    $brand    = trim($_GET['brand'] ?? '');
    $status   = trim($_GET['status'] ?? '');
    $lowStock = isset($_GET['low_stock']) && $_GET['low_stock'] == '1';

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR b.name LIKE ?)";
        $wildcard = "%$search%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    if (!empty($category)) {
        if (is_numeric($category)) {
            $where[] = "p.category_id = ?";
            $params[] = (int)$category;
        } else {
            $where[] = "c.name = ?";
            $params[] = $category;
        }
    }

    if (!empty($brand)) {
        if (is_numeric($brand)) {
            $where[] = "p.brand_id = ?";
            $params[] = (int)$brand;
        } else {
            $where[] = "b.name = ?";
            $params[] = $brand;
        }
    }

    if ($status === 'active' || $status === 'Active') {
        $where[] = "p.is_active = 1";
    } elseif ($status === 'inactive' || $status === 'Inactive') {
        $where[] = "p.is_active = 0";
    }

    if ($lowStock) {
        $where[] = "p.stock <= p.low_stock_threshold";
    }

    $whereSql = implode(' AND ', $where);

    $countStmt = $db->prepare("
        SELECT COUNT(*)
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE $whereSql
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = isset($_GET['limit']) ? max(0, (int)$_GET['limit']) : 0;

    $query = "
        SELECT
            p.id,
            p.name,
            p.sku,
            p.barcode,
            p.category_id,
            c.name AS category_name,
            p.subcategory_id,
            sc.name AS subcategory_name,
            p.brand_id,
            b.name AS brand_name,
            p.size,
            p.color,
            p.purchase_price,
            p.selling_price,
            p.stock,
            p.low_stock_threshold,
            p.notes,
            p.image_url,
            p.is_active,
            p.created_at,
            p.updated_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE $whereSql
        ORDER BY p.id DESC
    ";

    if ($limit > 0) {
        $offset = ($page - 1) * $limit;
        $query .= " LIMIT $limit OFFSET $offset";
        $pages = ceil($total / $limit);
    } else {
        $pages = 1;
    }

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    foreach ($products as &$item) {
        $item['id'] = (int)$item['id'];
        $item['category_id'] = $item['category_id'] ? (int)$item['category_id'] : null;
        $item['subcategory_id'] = $item['subcategory_id'] ? (int)$item['subcategory_id'] : null;
        $item['brand_id'] = $item['brand_id'] ? (int)$item['brand_id'] : null;
        $item['purchase_price'] = (float)$item['purchase_price'];
        $item['selling_price'] = (float)$item['selling_price'];
        $item['stock'] = (int)$item['stock'];
        $item['low_stock_threshold'] = (int)$item['low_stock_threshold'];
        $item['is_active'] = (int)$item['is_active'];
        $item['image_url'] = $item['image_url'] ?? '';
        $item['image'] = $item['image_url'];
        // compatibility with frontend
        $item['category'] = $item['category_name'] ?? '';
        $item['subcategory'] = $item['subcategory_name'] ?? '';
        $item['brand'] = $item['brand_name'] ?? '';
        $item['purchasePrice'] = $item['purchase_price'];
        $item['sellingPrice'] = $item['selling_price'];
        $item['lowStockThreshold'] = $item['low_stock_threshold'];
        $item['status'] = $item['is_active'] ? 'Active' : 'Inactive';
    }

    jsonResponse([
        'success' => true,
        'data'    => $products,
        'total'   => $total,
        'page'    => $page,
        'pages'   => $pages
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $name = trim($input['name'] ?? '');
    $sku  = trim($input['sku'] ?? '');

    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Product name is required.'], 400);
    }

    if (empty($sku)) {
        $sku = 'SKU-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $name), 0, 4)) . '-' . rand(1000, 9999);
    }

    $checkStmt = $db->prepare("SELECT id FROM products WHERE sku = ? LIMIT 1");
    $checkStmt->execute([$sku]);
    if ($checkStmt->fetch()) {
        jsonResponse(['success' => false, 'error' => "SKU '$sku' already exists. Please choose a unique SKU."], 400);
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
    $stock            = max(0, (int)($input['stock'] ?? 0));
    $low_stock        = max(1, (int)($input['low_stock_threshold'] ?? ($input['lowStockThreshold'] ?? 3)));
    $notes            = trim($input['notes'] ?? '') ?: null;
    $image_url        = trim($input['image_url'] ?? ($input['image'] ?? '')) ?: null;
    $is_active        = isset($input['status']) ? ($input['status'] === 'Active' ? 1 : 0) : (isset($input['is_active']) ? ((int)$input['is_active'] ? 1 : 0) : 1);

    $insertStmt = $db->prepare("
        INSERT INTO products (
            name, sku, barcode, category_id, subcategory_id, brand_id,
            size, color, purchase_price, selling_price, stock,
            low_stock_threshold, notes, image_url, is_active, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, NOW()
        )
    ");

    try {
        $insertStmt->execute([
            $name, $sku, $barcode, $categoryId, $subcategoryId, $brandId,
            $size, $color, $purchase_price, $selling_price, $stock,
            $low_stock, $notes, $image_url, $is_active
        ]);
    } catch (\PDOException $e) {
        if (strpos($e->getMessage(), 'image_url') !== false) {
            // Auto-heal: add missing image_url column to live database
            try {
                $db->exec("ALTER TABLE `products` ADD COLUMN `image_url` VARCHAR(255) NULL AFTER `notes`");
                $insertStmt->execute([
                    $name, $sku, $barcode, $categoryId, $subcategoryId, $brandId,
                    $size, $color, $purchase_price, $selling_price, $stock,
                    $low_stock, $notes, $image_url, $is_active
                ]);
            } catch (\Throwable $fallbackEx) {
                // Fallback: insert without image_url
                $fallbackStmt = $db->prepare("
                    INSERT INTO products (
                        name, sku, barcode, category_id, subcategory_id, brand_id,
                        size, color, purchase_price, selling_price, stock,
                        low_stock_threshold, notes, is_active, created_at
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, NOW()
                    )
                ");
                $fallbackStmt->execute([
                    $name, $sku, $barcode, $categoryId, $subcategoryId, $brandId,
                    $size, $color, $purchase_price, $selling_price, $stock,
                    $low_stock, $notes, $is_active
                ]);
            }
        } else {
            jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
        }
    }

    $newId = (int)$db->lastInsertId();
    logAudit($db, 'CREATE_PRODUCT', 'products', $newId, ['name' => $name, 'sku' => $sku]);

    jsonResponse([
        'success' => true,
        'message' => 'Product created successfully',
        'id'      => $newId
    ], 201);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
