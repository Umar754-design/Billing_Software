<?php
// ========================================================
// Infinity Traders — Single Supplier API (GET / PUT / DELETE /api/suppliers/item.php?id=)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) {
    jsonResponse(['success' => false, 'error' => 'Valid supplier ID is required.'], 400);
}

if ($method === 'GET') {
    $stmt = $db->prepare("SELECT * FROM suppliers WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $supplier = $stmt->fetch();

    if (!$supplier) {
        jsonResponse(['success' => false, 'error' => 'Supplier not found.'], 404);
    }

    $supplier['id'] = (int)$supplier['id'];
    $supplier['outstanding_balance'] = (float)$supplier['outstanding_balance'];

    jsonResponse(['success' => true, 'data' => $supplier]);
}

if ($method === 'PUT' || $method === 'POST') {
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
        UPDATE suppliers SET
            name = ?,
            contact_person = ?,
            phone = ?,
            email = ?,
            address = ?,
            gstin = ?,
            outstanding_balance = ?,
            status = ?
        WHERE id = ?
    ");

    $stmt->execute([
        $name, $contact_person, $phone, $email, $address, $gstin, $outstanding_balance, $status, $id
    ]);

    logAudit($db, 'UPDATE_SUPPLIER', 'suppliers', $id, ['name' => $name]);

    jsonResponse(['success' => true, 'message' => 'Supplier updated successfully.']);
}

if ($method === 'DELETE') {
    $stmt = $db->prepare("DELETE FROM suppliers WHERE id = ?");
    $stmt->execute([$id]);
    logAudit($db, 'DELETE_SUPPLIER', 'suppliers', $id);

    jsonResponse(['success' => true, 'message' => 'Supplier deleted successfully.']);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
