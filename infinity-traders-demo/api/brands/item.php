<?php
// ========================================================
// Infinity Traders — Single Brand API (PUT / DELETE /api/brands/item.php?id=)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    jsonResponse(['success' => false, 'error' => 'Valid brand ID is required.'], 400);
}

if ($method === 'PUT' || $method === 'POST') {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');

    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Brand name is required.'], 400);
    }

    $dupCheck = $db->prepare("SELECT id FROM brands WHERE name = ? AND id != ? LIMIT 1");
    $dupCheck->execute([$name, $id]);
    if ($dupCheck->fetch()) {
        jsonResponse(['success' => false, 'error' => "Brand '$name' already exists."], 400);
    }

    $stmt = $db->prepare("UPDATE brands SET name = ? WHERE id = ?");
    $stmt->execute([$name, $id]);
    logAudit($db, 'UPDATE_BRAND', 'brands', $id, ['name' => $name]);

    jsonResponse(['success' => true, 'message' => 'Brand updated successfully.']);
}

if ($method === 'DELETE') {
    $stmt = $db->prepare("DELETE FROM brands WHERE id = ?");
    $stmt->execute([$id]);
    logAudit($db, 'DELETE_BRAND', 'brands', $id);

    jsonResponse(['success' => true, 'message' => 'Brand deleted successfully.']);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
