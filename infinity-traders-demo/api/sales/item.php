<?php
// ========================================================
// Infinity Traders — Single Invoice API (GET /api/sales/item.php?id=)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();

$id = (int)($_GET['id'] ?? 0);
$invoiceNo = trim($_GET['invoice_no'] ?? '');

if ($id <= 0 && empty($invoiceNo)) {
    jsonResponse(['success' => false, 'error' => 'Invoice ID or invoice_no is required.'], 400);
}

if ($id > 0) {
    $stmt = $db->prepare("
        SELECT s.*, c.address AS customer_address, c.gstin AS customer_gstin
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.id = ?
        LIMIT 1
    ");
    $stmt->execute([$id]);
} else {
    $stmt = $db->prepare("
        SELECT s.*, c.address AS customer_address, c.gstin AS customer_gstin
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.invoice_no = ?
        LIMIT 1
    ");
    $stmt->execute([$invoiceNo]);
}

$invoice = $stmt->fetch();
if (!$invoice) {
    jsonResponse(['success' => false, 'error' => 'Invoice not found.'], 404);
}

// Fetch line items
$itemStmt = $db->prepare("
    SELECT i.*, p.image_url, c.name AS category_name, sc.name AS subcategory_name
    FROM sales_invoice_items i
    LEFT JOIN products p ON i.product_id = p.id
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
    WHERE i.invoice_id = ?
    ORDER BY i.id ASC
");
$itemStmt->execute([$invoice['id']]);
$items = $itemStmt->fetchAll();

foreach ($items as &$it) {
    $it['id']          = (int)$it['id'];
    $it['invoice_id']  = (int)$it['invoice_id'];
    $it['product_id']  = $it['product_id'] ? (int)$it['product_id'] : null;
    $it['qty']         = (int)$it['qty'];
    $it['unit_price']  = (float)$it['unit_price'];
    $it['discount']    = (float)$it['discount'];
    $it['line_total']  = (float)$it['line_total'];
    // Compatibility with frontend
    $it['price']       = $it['unit_price'];
    $it['name']        = $it['product_name'];
    $it['category']    = $it['category_name'] ?? '';
    $it['subcategory'] = $it['subcategory_name'] ?? '';
}

$invoice['id']             = (int)$invoice['id'];
$invoice['customer_id']    = $invoice['customer_id'] ? (int)$invoice['customer_id'] : null;
$invoice['gst_enabled']    = (int)$invoice['gst_enabled'];
$invoice['gst_rate']       = (float)$invoice['gst_rate'];
$invoice['subtotal']       = (float)$invoice['subtotal'];
$invoice['total_discount'] = (float)$invoice['total_discount'];
$invoice['taxable_amount'] = (float)$invoice['taxable_amount'];
$invoice['cgst']           = (float)$invoice['cgst'];
$invoice['sgst']           = (float)$invoice['sgst'];
$invoice['igst']           = (float)$invoice['igst'];
$invoice['grand_total']    = (float)$invoice['grand_total'];
$invoice['amount_paid']    = (float)$invoice['amount_paid'];
$invoice['balance_due']    = (float)$invoice['balance_due'];
$invoice['items']          = $items;

jsonResponse(['success' => true, 'data' => $invoice]);
