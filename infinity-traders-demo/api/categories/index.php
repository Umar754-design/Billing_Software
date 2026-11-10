<?php
// ========================================================
// Infinity Traders — Categories API (GET / POST /api/categories/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $catStmt = $db->query("SELECT id, name FROM categories ORDER BY name ASC");
    $categories = $catStmt->fetchAll();

    $subStmt = $db->query("SELECT id, category_id, name FROM subcategories ORDER BY name ASC");
    $allSubs = $subStmt->fetchAll();

    $subsByCat = [];
    $subDetailsByCat = [];
    foreach ($allSubs as $sub) {
        $cId = (int)$sub['category_id'];
        if (!isset($subsByCat[$cId])) {
            $subsByCat[$cId] = [];
            $subDetailsByCat[$cId] = [];
        }
        $subsByCat[$cId][] = $sub['name'];
        $subDetailsByCat[$cId][] = [
            'id'   => (int)$sub['id'],
            'name' => $sub['name']
        ];
    }

    $result = [];
    foreach ($categories as $cat) {
        $cId = (int)$cat['id'];
        $result[] = [
            'id'                   => $cId,
            'name'                 => $cat['name'],
            'subcategories'        => $subsByCat[$cId] ?? [],
            'subcategories_detail' => $subDetailsByCat[$cId] ?? []
        ];
    }

    jsonResponse(['success' => true, 'data' => $result]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    $name = trim($input['name'] ?? '');

    if (empty($name)) {
        jsonResponse(['success' => false, 'error' => 'Category name is required.'], 400);
    }

    $checkStmt = $db->prepare("SELECT id FROM categories WHERE name = ? LIMIT 1");
    $checkStmt->execute([$name]);
    if ($checkStmt->fetch()) {
        jsonResponse(['success' => false, 'error' => "Category '$name' already exists."], 400);
    }

    $insertStmt = $db->prepare("INSERT INTO categories (name, created_at) VALUES (?, NOW())");
    $insertStmt->execute([$name]);
    $newId = (int)$db->lastInsertId();

    // If subcategories were passed
    if (!empty($input['subcategories']) && is_array($input['subcategories'])) {
        $subStmt = $db->prepare("INSERT INTO subcategories (category_id, name) VALUES (?, ?)");
        foreach ($input['subcategories'] as $subName) {
            $subName = trim($subName);
            if (!empty($subName)) {
                $subStmt->execute([$newId, $subName]);
            }
        }
    }

    logAudit($db, 'CREATE_CATEGORY', 'categories', $newId, ['name' => $name]);

    jsonResponse([
        'success' => true,
        'message' => 'Category created successfully.',
        'id'      => $newId
    ], 201);
}

if ($method === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'Valid category ID required.'], 400);
    }

    $stmt = $db->prepare("DELETE FROM categories WHERE id = ?");
    $stmt->execute([$id]);
    logAudit($db, 'DELETE_CATEGORY', 'categories', $id);

    jsonResponse(['success' => true, 'message' => 'Category deleted successfully.']);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
