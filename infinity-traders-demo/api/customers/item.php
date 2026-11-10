<?php
// ========================================================
// Infinity Traders — Single Customer API (GET / PUT / DELETE /api/customers/item.php?id=)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$id   = (int)($_GET['id'] ?? 0);
$name = trim($_GET['name'] ?? '');

if ($method === 'GET') {
    if ($id <= 0 && empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Customer ID or Name is required.'], 400);
    }

    $customer = null;

    if ($id > 0) {
        $stmt = $db->prepare("SELECT * FROM customers WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
        $customer = $stmt->fetch();
    }

    if (!$customer && !empty($name)) {
        $stmt = $db->prepare("SELECT * FROM customers WHERE name = ? ORDER BY id DESC LIMIT 1");
        $stmt->execute([$name]);
        $customer = $stmt->fetch();
    }

    // If still not found in customers table, build virtual profile from sales invoices
    if (!$customer && !empty($name)) {
        $checkSales = $db->prepare("SELECT customer_name, customer_phone, customer_address, created_at FROM sales_invoices WHERE customer_name = ? ORDER BY id DESC LIMIT 1");
        $checkSales->execute([$name]);
        $sRow = $checkSales->fetch();
        if ($sRow) {
            $customer = [
                'id' => 0,
                'name' => $sRow['customer_name'],
                'phone' => $sRow['customer_phone'] ?? '',
                'email' => '',
                'address' => $sRow['customer_address'] ?? '',
                'gstin' => '',
                'created_at' => $sRow['created_at'],
                'is_walk_in' => true
            ];
        }
    }

    if (!$customer) {
        jsonResponse(['success' => false, 'error' => 'Customer not found.'], 404);
    }

    $custId = (int)($customer['id'] ?? 0);
    $custName = $customer['name'];

    // Lifetime summary stats
    if ($custId > 0) {
        $summaryStmt = $db->prepare("
            SELECT
                COUNT(id) AS total_orders,
                COALESCE(SUM(grand_total), 0) AS lifetime_spent,
                COALESCE(SUM(amount_paid), 0) AS total_paid,
                COALESCE(SUM(balance_due), 0) AS outstanding,
                MAX(date) AS last_order_date
            FROM sales_invoices
            WHERE customer_id = ? OR customer_name = ?
        ");
        $summaryStmt->execute([$custId, $custName]);
    } else {
        $summaryStmt = $db->prepare("
            SELECT
                COUNT(id) AS total_orders,
                COALESCE(SUM(grand_total), 0) AS lifetime_spent,
                COALESCE(SUM(amount_paid), 0) AS total_paid,
                COALESCE(SUM(balance_due), 0) AS outstanding,
                MAX(date) AS last_order_date
            FROM sales_invoices
            WHERE customer_name = ?
        ");
        $summaryStmt->execute([$custName]);
    }
    $summary = $summaryStmt->fetch();

    $customer['id'] = $custId;
    $customer['total_orders'] = (int)($summary['total_orders'] ?? 0);
    $customer['lifetime_spent'] = (float)($summary['lifetime_spent'] ?? 0);
    $customer['total_paid'] = (float)($summary['total_paid'] ?? 0);
    $customer['outstanding'] = (float)($summary['outstanding'] ?? 0);
    $customer['last_order_date'] = $summary['last_order_date'] ?? null;

    // Fetch invoices with line items
    if ($custId > 0) {
        $invStmt = $db->prepare("
            SELECT id, invoice_no, date, payment_method, payment_status, subtotal, total_discount, grand_total, amount_paid, balance_due, created_at
            FROM sales_invoices
            WHERE customer_id = ? OR customer_name = ?
            ORDER BY date DESC, id DESC
            LIMIT 25
        ");
        $invStmt->execute([$custId, $custName]);
    } else {
        $invStmt = $db->prepare("
            SELECT id, invoice_no, date, payment_method, payment_status, subtotal, total_discount, grand_total, amount_paid, balance_due, created_at
            FROM sales_invoices
            WHERE customer_name = ?
            ORDER BY date DESC, id DESC
            LIMIT 25
        ");
        $invStmt->execute([$custName]);
    }
    $invoices = $invStmt->fetchAll();

    $itemStmt = $db->prepare("
        SELECT id, product_id, sku, product_name, size, qty, unit_price, discount, line_total
        FROM sales_invoice_items
        WHERE invoice_id = ?
    ");

    foreach ($invoices as &$inv) {
        $inv['id'] = (int)$inv['id'];
        $inv['grand_total'] = (float)$inv['grand_total'];
        $inv['amount_paid'] = (float)$inv['amount_paid'];
        $inv['balance_due'] = (float)$inv['balance_due'];
        $inv['subtotal'] = (float)$inv['subtotal'];
        $inv['total_discount'] = (float)$inv['total_discount'];

        $itemStmt->execute([$inv['id']]);
        $items = $itemStmt->fetchAll();
        foreach ($items as &$it) {
            $it['id'] = (int)$it['id'];
            $it['qty'] = (int)$it['qty'];
            $it['unit_price'] = (float)$it['unit_price'];
            $it['discount'] = (float)$it['discount'];
            $it['line_total'] = (float)$it['line_total'];
        }
        $inv['items'] = $items;
    }
    unset($inv);

    $customer['invoices'] = $invoices;

    // Fetch payment clearance history
    if ($custId > 0) {
        $payStmt = $db->prepare("
            SELECT id, invoice_id, invoice_no, amount, payment_method, payment_date, notes, created_at
            FROM customer_payments
            WHERE customer_id = ? OR customer_name = ?
            ORDER BY payment_date DESC, id DESC
            LIMIT 25
        ");
        $payStmt->execute([$custId, $custName]);
    } else {
        $payStmt = $db->prepare("
            SELECT id, invoice_id, invoice_no, amount, payment_method, payment_date, notes, created_at
            FROM customer_payments
            WHERE customer_name = ?
            ORDER BY payment_date DESC, id DESC
            LIMIT 25
        ");
        $payStmt->execute([$custName]);
    }
    $payments = $payStmt->fetchAll();
    foreach ($payments as &$p) {
        $p['id'] = (int)$p['id'];
        $p['invoice_id'] = $p['invoice_id'] ? (int)$p['invoice_id'] : null;
        $p['amount'] = (float)$p['amount'];
    }
    unset($p);
    $customer['payments'] = $payments;

    jsonResponse(['success' => true, 'data' => $customer]);
}

if ($id <= 0) {
    jsonResponse(['success' => false, 'error' => 'Valid customer ID is required.'], 400);
}

if ($method === 'PUT' || $method === 'POST') {
    $input = getJsonInput();

    $name = trim($input['name'] ?? '');
    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Customer name is required.'], 400);
    }

    $phone   = trim($input['phone'] ?? '') ?: null;
    $email   = trim($input['email'] ?? '') ?: null;
    $address = trim($input['address'] ?? '') ?: null;
    $gstin   = trim($input['gstin'] ?? '') ?: null;

    $stmt = $db->prepare("
        UPDATE customers SET
            name = ?,
            phone = ?,
            email = ?,
            address = ?,
            gstin = ?
        WHERE id = ?
    ");
    $stmt->execute([$name, $phone, $email, $address, $gstin, $id]);

    logAudit($db, 'UPDATE_CUSTOMER', 'customers', $id, ['name' => $name]);

    jsonResponse(['success' => true, 'message' => 'Customer updated successfully.']);
}

if ($method === 'DELETE') {
    $stmt = $db->prepare("DELETE FROM customers WHERE id = ?");
    $stmt->execute([$id]);
    logAudit($db, 'DELETE_CUSTOMER', 'customers', $id);

    jsonResponse(['success' => true, 'message' => 'Customer deleted successfully.']);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
