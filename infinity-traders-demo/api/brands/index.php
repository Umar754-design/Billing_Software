<?php
// ========================================================
// Infinity Traders — Brands API (GET / POST /api/brands/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->query("
        SELECT
            b.id,
            b.name,
            b.created_at,
            COUNT(p.id) AS product_count
        FROM brands b
        LEFT JOIN products p ON b.id = p.brand_id
        GROUP BY b.id, b.name, b.created_at
        ORDER BY b.name ASC
    ");
    $brands = $stmt->fetchAll();

    foreach ($brands as &$b) {
        $b['id'] = (int)$b['id'];
        $b['product_count'] = (int)$b['product_count'];
    }

    jsonResponse(['success' => true, 'data' => $brands]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');

    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Brand name is required.'], 400);
    }

    $checkStmt = $db->prepare("SELECT id FROM brands WHERE name = ? LIMIT 1");
    $checkStmt->execute([$name]);
    if ($checkStmt->fetch()) {
        jsonResponse(['success' => false, 'error' => "Brand '$name' already exists."], 400);
    }

    $insertStmt = $db->prepare("INSERT INTO brands (name, created_at) VALUES (?, NOW())");
    $insertStmt->execute([$name]);
    $newId = (int)$db->lastInsertId();

    logAudit($db, 'CREATE_BRAND', 'brands', $newId, ['name' => $name]);

    jsonResponse([
        'success' => true,
        'message' => 'Brand created successfully.',
        'id'      => $newId
    ], 201);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
