<?php
// ========================================================
// Infinity Traders — Subcategories API (POST / DELETE /api/categories/subcategory.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');
    $categoryId = (int)($input['category_id'] ?? 0);

    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Subcategory name is required.'], 400);
    }

    if ($categoryId <= 0 && !empty($input['category_name'])) {
        $cStmt = $db->prepare("SELECT id FROM categories WHERE name = ? LIMIT 1");
        $cStmt->execute([trim($input['category_name'])]);
        $categoryId = (int)($cStmt->fetchColumn() ?: 0);
    }

    if ($categoryId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Valid category is required.'], 400);
    }

    // Check duplicate
    $checkStmt = $db->prepare("SELECT id FROM subcategories WHERE category_id = ? AND name = ? LIMIT 1");
    $checkStmt->execute([$categoryId, $name]);
    if ($checkStmt->fetch()) {
        jsonResponse(['success' => false, 'error' => "Subcategory '$name' already exists in this category."], 400);
    }

    $insertStmt = $db->prepare("INSERT INTO subcategories (category_id, name, created_at) VALUES (?, ?, NOW())");
    $insertStmt->execute([$categoryId, $name]);
    $newId = (int)$db->lastInsertId();

    logAudit($db, 'CREATE_SUBCATEGORY', 'subcategories', $newId, ['category_id' => $categoryId, 'name' => $name]);

    jsonResponse([
        'success' => true,
        'message' => 'Subcategory created successfully.',
        'id'      => $newId
    ], 201);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);

    if ($id <= 0 && !empty($_GET['name'])) {
        $name = trim($_GET['name']);
        $catId = (int)($_GET['category_id'] ?? 0);
        if ($catId > 0) {
            $stmt = $db->prepare("DELETE FROM subcategories WHERE category_id = ? AND name = ?");
            $stmt->execute([$catId, $name]);
            jsonResponse(['success' => true, 'message' => 'Subcategory deleted successfully.']);
        }
    }

    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'Valid subcategory ID required.'], 400);
    }

    $stmt = $db->prepare("DELETE FROM subcategories WHERE id = ?");
    $stmt->execute([$id]);
    logAudit($db, 'DELETE_SUBCATEGORY', 'subcategories', $id);

    jsonResponse(['success' => true, 'message' => 'Subcategory deleted successfully.']);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
