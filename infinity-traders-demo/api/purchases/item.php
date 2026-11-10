<?php
// ========================================================
// Infinity Traders — Single Purchase API (GET /api/purchases/item.php?id=)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();

$id = (int)($_GET['id'] ?? 0);
$purchaseNo = trim($_GET['purchase_no'] ?? '');

if ($id <= 0 && empty($purchaseNo)) {
    jsonResponse(['success' => false, 'error' => 'Purchase ID or purchase_no is required.'], 400);
}

if ($id > 0) {
    $stmt = $db->prepare("
        SELECT po.*, 
               COALESCE(NULLIF(TRIM(po.supplier_name), ''), sup.name, '') AS supplier_name,
               COALESCE(NULLIF(TRIM(po.supplier_phone), ''), sup.phone, '') AS supplier_phone,
               COALESCE(NULLIF(TRIM(po.supplier_address), ''), sup.address, '') AS supplier_address,
               sup.gstin AS supplier_gstin
        FROM purchase_orders po
        LEFT JOIN suppliers sup ON po.supplier_id = sup.id
        WHERE po.id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
} else {
    $stmt = $db->prepare("
        SELECT po.*, 
               COALESCE(NULLIF(TRIM(po.supplier_name), ''), sup.name, '') AS supplier_name,
               COALESCE(NULLIF(TRIM(po.supplier_phone), ''), sup.phone, '') AS supplier_phone,
               COALESCE(NULLIF(TRIM(po.supplier_address), ''), sup.address, '') AS supplier_address,
               sup.gstin AS supplier_gstin
        FROM purchase_orders po
        LEFT JOIN suppliers sup ON po.supplier_id = sup.id
        WHERE po.purchase_no = ?
        LIMIT 1
    ");
    $stmt->execute([$purchaseNo]);
}

$purchase = $stmt->fetch();
if (!$purchase) {
    jsonResponse(['success' => false, 'error' => 'Purchase not found.'], 404);
}

// Fetch items
$itemStmt = $db->prepare("
    SELECT poi.*, 
           COALESCE(NULLIF(TRIM(poi.size), ''), p.size, '') AS size,
           COALESCE(NULLIF(TRIM(poi.color), ''), p.color, '') AS color,
           COALESCE(NULLIF(poi.selling_price, 0), p.selling_price, 0.00) AS selling_price,
           b.name AS brand_name,
           c.name AS category_name, 
           sc.name AS subcategory_name
    FROM purchase_order_items poi
    LEFT JOIN products p ON poi.product_id = p.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    WHERE poi.purchase_id = ?
    ORDER BY poi.id ASC
");
$itemStmt->execute([$purchase['id']]);
$items = $itemStmt->fetchAll();

foreach ($items as &$it) {
    $it['id']            = (int)$it['id'];
    $it['purchase_id']   = (int)$it['purchase_id'];
    $it['product_id']    = $it['product_id'] ? (int)$it['product_id'] : null;
    $it['qty']           = (int)$it['qty'];
    $it['cost_price']    = (float)$it['cost_price'];
    $it['selling_price'] = (float)$it['selling_price'];
    $it['discount']      = (float)$it['discount'];
    $it['line_total']    = (float)$it['line_total'];
    $it['name']          = $it['product_name'];
    $it['brand']         = $it['brand_name'] ?? '';
    $it['category']      = $it['category_name'] ?? '';
    $it['subcategory']   = $it['subcategory_name'] ?? '';
}

$purchase['id']           = (int)$purchase['id'];
$purchase['supplier_id']  = $purchase['supplier_id'] ? (int)$purchase['supplier_id'] : null;
$purchase['gst_enabled']  = (int)$purchase['gst_enabled'];
$purchase['gst_rate']     = (float)$purchase['gst_rate'];
$purchase['subtotal']     = (float)$purchase['subtotal'];
$purchase['gst_amount']   = (float)$purchase['gst_amount'];
$purchase['total_amount'] = (float)$purchase['total_amount'];
$purchase['amount_paid']  = (float)$purchase['amount_paid'];
$purchase['balance_due']  = (float)$purchase['balance_due'];
$purchase['supplier']     = $purchase['supplier_name'] ?? '';
$purchase['items']        = $items;

jsonResponse(['success' => true, 'data' => $purchase]);
