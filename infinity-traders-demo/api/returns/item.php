<?php
// ========================================================
// Infinity Traders — Single Return API (GET /api/returns/item.php?id=)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();

$id = (int)($_GET['id'] ?? 0);
$returnNo = trim($_GET['return_no'] ?? '');

if ($id <= 0 && empty($returnNo)) {
    jsonResponse(['success' => false, 'error' => 'Return ID or return_no is required.'], 400);
}

if ($id > 0) {
    $stmt = $db->prepare("
        SELECT r.*, c.address AS customer_address, c.email AS customer_email
        FROM sales_returns r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE r.id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
} else {
    $stmt = $db->prepare("
        SELECT r.*, c.address AS customer_address, c.email AS customer_email
        FROM sales_returns r
        LEFT JOIN customers c ON r.customer_id = c.id
        WHERE r.return_no = ?
        LIMIT 1
    ");
    $stmt->execute([$returnNo]);
}

$ret = $stmt->fetch();
if (!$ret) {
    jsonResponse(['success' => false, 'error' => 'Return record not found.'], 404);
}

// Fetch line items
$itemStmt = $db->prepare("
    SELECT ri.*, p.image_url
    FROM sales_return_items ri
    LEFT JOIN products p ON ri.product_id = p.id
    WHERE ri.return_id = ?
    ORDER BY ri.id ASC
");
$itemStmt->execute([$ret['id']]);
$items = $itemStmt->fetchAll();

foreach ($items as &$it) {
    $it['id']            = (int)$it['id'];
    $it['return_id']     = (int)$it['return_id'];
    $it['product_id']    = $it['product_id'] ? (int)$it['product_id'] : null;
    $it['return_qty']    = (int)$it['return_qty'];
    $it['qty']           = (int)$it['return_qty'];
    $it['unit_price']    = (float)$it['unit_price'];
    $it['price']         = (float)$it['unit_price'];
    $it['refund_amount'] = (float)$it['refund_amount'];
    $it['restock']       = (int)$it['restock'];
    $it['name']          = $it['product_name'];
}

$ret['id']                  = (int)$ret['id'];
$ret['invoice_id']          = $ret['invoice_id'] ? (int)$ret['invoice_id'] : null;
$ret['customer_id']         = $ret['customer_id'] ? (int)$ret['customer_id'] : null;
$ret['total_refund_amount'] = (float)$ret['total_refund_amount'];
$ret['items']               = $items;

jsonResponse(['success' => true, 'data' => $ret]);
