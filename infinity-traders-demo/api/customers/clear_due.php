<?php
// ========================================================
// Infinity Traders — Customer Clear Due / Receive Payment API
// (POST /api/customers/clear_due.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? (php_sapi_name() === 'cli' ? 'POST' : 'GET');

if ($method !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed. Only POST is accepted.'], 405);
}

$input = getJsonInput();

$customerId    = !empty($input['customer_id']) ? (int)$input['customer_id'] : null;
$customerName  = trim($input['customer_name'] ?? '');
$invoiceId     = !empty($input['invoice_id']) ? (int)$input['invoice_id'] : null;
$amount        = (float)($input['amount'] ?? 0);
$paymentMethod = trim($input['payment_method'] ?? 'Cash') ?: 'Cash';
$paymentDate   = trim($input['payment_date'] ?? date('Y-m-d')) ?: date('Y-m-d');
$notes         = trim($input['notes'] ?? '') ?: null;

if ($amount <= 0.001) {
    jsonResponse(['success' => false, 'error' => 'Valid payment amount greater than zero is required.'], 400);
}

// If customerId is provided but not name, look up name
if ($customerId && empty($customerName)) {
    $cStmt = $db->prepare("SELECT name FROM customers WHERE id = ? LIMIT 1");
    $cStmt->execute([$customerId]);
    $customerName = (string)$cStmt->fetchColumn();
}

if (empty($customerName) && !$customerId && !$invoiceId) {
    jsonResponse(['success' => false, 'error' => 'Customer name or ID is required.'], 400);
}

// If specific invoice is targeted
if ($invoiceId) {
    $invStmt = $db->prepare("
        SELECT id, invoice_no, customer_id, customer_name, grand_total, amount_paid, balance_due
        FROM sales_invoices
        WHERE id = ?
        LIMIT 1
    ");
    $invStmt->execute([$invoiceId]);
    $inv = $invStmt->fetch();

    if (!$inv) {
        jsonResponse(['success' => false, 'error' => 'Invoice not found.'], 404);
    }

    $currentDue = (float)$inv['balance_due'];
    if ($currentDue <= 0.001) {
        jsonResponse(['success' => false, 'error' => 'This invoice has already been fully paid.'], 400);
    }

    $customerId   = $customerId ?: ($inv['customer_id'] ? (int)$inv['customer_id'] : null);
    $customerName = $customerName ?: ($inv['customer_name'] ?? 'Walk-in Customer');

    $paidNow = min($amount, $currentDue);
    $newAmountPaid = (float)$inv['amount_paid'] + $paidNow;
    $newBalanceDue = max(0, $currentDue - $paidNow);
    $newStatus     = ($newBalanceDue <= 0.01) ? 'Paid' : 'Partial';

    $updStmt = $db->prepare("
        UPDATE sales_invoices SET
            amount_paid = ?,
            balance_due = ?,
            payment_status = ?
        WHERE id = ?
    ");
    $updStmt->execute([$newAmountPaid, $newBalanceDue, $newStatus, $inv['id']]);

    // Insert payment record
    $payStmt = $db->prepare("
        INSERT INTO customer_payments (
            customer_id, customer_name, invoice_id, invoice_no, amount, payment_method, payment_date, notes, received_by, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        )
    ");
    $payStmt->execute([
        $customerId, $customerName, $inv['id'], $inv['invoice_no'], $paidNow, $paymentMethod, $paymentDate, $notes, $currentUser['id']
    ]);

    logAudit($db, 'CLEAR_INVOICE_DUE', 'sales_invoices', $inv['id'], [
        'invoice_no'    => $inv['invoice_no'],
        'paid_now'      => $paidNow,
        'new_balance'   => $newBalanceDue,
        'payment_method'=> $paymentMethod
    ]);

    // Get total remaining customer due
    $totDueStmt = $db->prepare("
        SELECT COALESCE(SUM(balance_due), 0)
        FROM sales_invoices
        WHERE (customer_id IS NOT NULL AND customer_id = ?) OR (customer_id IS NULL AND customer_name = ?)
    ");
    $totDueStmt->execute([$customerId, $customerName]);
    $totalRemainingDue = (float)$totDueStmt->fetchColumn();

    jsonResponse([
        'success' => true,
        'message' => 'Payment of ₹' . number_format($paidNow, 2) . ' recorded for invoice ' . $inv['invoice_no'] . '!' . ($newBalanceDue <= 0.01 ? ' Invoice is now Fully Paid.' : ' Remaining invoice due: ₹' . number_format($newBalanceDue, 2)),
        'data' => [
            'amount_paid'           => $paidNow,
            'invoice_id'            => $inv['id'],
            'invoice_no'            => $inv['invoice_no'],
            'invoice_balance_due'   => $newBalanceDue,
            'total_remaining_due'   => $totalRemainingDue
        ]
    ]);
}

// Otherwise, clear due across customer's pending invoices (FIFO)
$whereParts = ["balance_due > 0.009"];
$params = [];

if ($customerId) {
    $whereParts[] = "(customer_id = ? OR customer_name = ?)";
    $params[] = $customerId;
    $params[] = $customerName;
} else {
    $whereParts[] = "customer_name = ?";
    $params[] = $customerName;
}

$whereSql = implode(' AND ', $whereParts);

$dueStmt = $db->prepare("
    SELECT id, invoice_no, grand_total, amount_paid, balance_due
    FROM sales_invoices
    WHERE $whereSql
    ORDER BY date ASC, id ASC
");
$dueStmt->execute($params);
$pendingInvoices = $dueStmt->fetchAll();

if (empty($pendingInvoices)) {
    jsonResponse(['success' => false, 'error' => 'No pending dues found for this customer.'], 400);
}

$remainingToPay = $amount;
$totalApplied = 0.0;
$clearedCount = 0;
$invoicesUpdated = [];

$updStmt = $db->prepare("
    UPDATE sales_invoices SET
        amount_paid = ?,
        balance_due = ?,
        payment_status = ?
    WHERE id = ?
");

$payStmt = $db->prepare("
    INSERT INTO customer_payments (
        customer_id, customer_name, invoice_id, invoice_no, amount, payment_method, payment_date, notes, received_by, created_at
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW()
    )
");

foreach ($pendingInvoices as $inv) {
    if ($remainingToPay <= 0.001) break;

    $invDue = (float)$inv['balance_due'];
    $payThis = min($remainingToPay, $invDue);

    $newAmountPaid = (float)$inv['amount_paid'] + $payThis;
    $newBalanceDue = max(0, $invDue - $payThis);
    $newStatus     = ($newBalanceDue <= 0.01) ? 'Paid' : 'Partial';

    $updStmt->execute([$newAmountPaid, $newBalanceDue, $newStatus, $inv['id']]);

    $payStmt->execute([
        $customerId, $customerName, $inv['id'], $inv['invoice_no'], $payThis, $paymentMethod, $paymentDate, $notes, $currentUser['id']
    ]);

    $totalApplied += $payThis;
    $remainingToPay -= $payThis;

    if ($newBalanceDue <= 0.01) {
        $clearedCount++;
    }

    $invoicesUpdated[] = [
        'invoice_no'  => $inv['invoice_no'],
        'paid'        => $payThis,
        'balance_due' => $newBalanceDue
    ];
}

logAudit($db, 'CLEAR_CUSTOMER_DUE', 'customers', $customerId ?: 0, [
    'customer_name' => $customerName,
    'total_paid'    => $totalApplied,
    'method'        => $paymentMethod,
    'invoices'      => $invoicesUpdated
]);

// Total remaining customer due
$totDueStmt = $db->prepare("
    SELECT COALESCE(SUM(balance_due), 0)
    FROM sales_invoices
    WHERE (customer_id IS NOT NULL AND customer_id = ?) OR (customer_id IS NULL AND customer_name = ?)
");
$totDueStmt->execute([$customerId, $customerName]);
$totalRemainingDue = (float)$totDueStmt->fetchColumn();

jsonResponse([
    'success' => true,
    'message' => 'Payment of ₹' . number_format($totalApplied, 2) . ' successfully applied! Remaining due: ₹' . number_format($totalRemainingDue, 2),
    'data' => [
        'amount_paid'         => $totalApplied,
        'total_remaining_due' => $totalRemainingDue,
        'cleared_invoices'    => $clearedCount,
        'invoices_updated'    => $invoicesUpdated
    ]
]);
