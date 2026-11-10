<?php
// ========================================================
// Infinity Traders — Customers API (GET / POST /api/customers/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.address LIKE ? OR c.gstin LIKE ?)";
        $wildcard = "%$search%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    $whereSql = implode(' AND ', $where);

    // Join with sales_invoices to calculate total purchases and last visit
    $stmt = $db->prepare("
        SELECT
            c.id,
            c.name,
            c.phone,
            c.email,
            c.address,
            c.gstin,
            c.created_at,
            COUNT(s.id) AS total_orders,
            COALESCE(SUM(s.grand_total), 0) AS total_spent,
            MAX(s.date) AS last_order_date
        FROM customers c
        LEFT JOIN sales_invoices s ON c.id = s.customer_id
        WHERE $whereSql
        GROUP BY c.id, c.name, c.phone, c.email, c.address, c.gstin, c.created_at
        ORDER BY c.id DESC
    ");
    $stmt->execute($params);
    $customers = $stmt->fetchAll();

    foreach ($customers as &$cust) {
        $cust['id'] = (int)$cust['id'];
        $cust['total_orders'] = (int)$cust['total_orders'];
        $cust['total_spent'] = (float)$cust['total_spent'];
    }

    jsonResponse([
        'success' => true,
        'data'    => $customers,
        'total'   => count($customers)
    ]);
}

if ($method === 'POST') {
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
        INSERT INTO customers (name, phone, email, address, gstin, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$name, $phone, $email, $address, $gstin]);

    $newId = (int)$db->lastInsertId();
    logAudit($db, 'CREATE_CUSTOMER', 'customers', $newId, ['name' => $name, 'phone' => $phone]);

    jsonResponse([
        'success' => true,
        'message' => 'Customer created successfully.',
        'id'      => $newId
    ], 201);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
