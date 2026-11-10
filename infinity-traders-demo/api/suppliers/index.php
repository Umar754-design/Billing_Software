<?php
// ========================================================
// Infinity Traders — Suppliers API (GET / POST /api/suppliers/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $search = trim($_GET['search'] ?? '');
    $status = trim($_GET['status'] ?? '');

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(name LIKE ? OR contact_person LIKE ? OR phone LIKE ? OR gstin LIKE ?)";
        $wildcard = "%$search%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    if (!empty($status) && in_array($status, ['Active', 'Inactive'])) {
        $where[] = "status = ?";
        $params[] = $status;
    }

    $whereSql = implode(' AND ', $where);
    $stmt = $db->prepare("SELECT * FROM suppliers WHERE $whereSql ORDER BY id DESC");
    $stmt->execute($params);
    $suppliers = $stmt->fetchAll();

    foreach ($suppliers as &$s) {
        $s['id'] = (int)$s['id'];
        $s['outstanding_balance'] = (float)$s['outstanding_balance'];
    }

    jsonResponse([
        'success' => true,
        'data'    => $suppliers,
        'total'   => count($suppliers)
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $name = trim($input['name'] ?? '');
    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Supplier name is required.'], 400);
    }

    $contact_person      = trim($input['contact_person'] ?? '') ?: null;
    $phone               = trim($input['phone'] ?? '') ?: null;
    $email               = trim($input['email'] ?? '') ?: null;
    $address             = trim($input['address'] ?? '') ?: null;
    $gstin               = trim($input['gstin'] ?? '') ?: null;
    $outstanding_balance = (float)($input['outstanding_balance'] ?? 0);
    $status              = in_array($input['status'] ?? '', ['Active', 'Inactive']) ? $input['status'] : 'Active';

    $stmt = $db->prepare("
        INSERT INTO suppliers (
            name, contact_person, phone, email, address, gstin, outstanding_balance, status, created_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, NOW()
        )
    ");

    $stmt->execute([
        $name, $contact_person, $phone, $email, $address, $gstin, $outstanding_balance, $status
    ]);

    $newId = (int)$db->lastInsertId();
    logAudit($db, 'CREATE_SUPPLIER', 'suppliers', $newId, ['name' => $name]);

    jsonResponse([
        'success' => true,
        'message' => 'Supplier created successfully.',
        'id'      => $newId
    ], 201);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
