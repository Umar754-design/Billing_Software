<?php
// ========================================================
// Infinity Traders — Current User Profile API (GET /api/auth/me.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$user = requireAuth();

$db = getDbConnection();
$stmt = $db->prepare("SELECT id, username, full_name, role, is_active, created_at FROM users WHERE id = ? LIMIT 1");
$stmt->execute([$user['id']]);
$freshUser = $stmt->fetch();

if (!$freshUser || (int)$freshUser['is_active'] !== 1) {
    session_destroy();
    jsonResponse(['success' => false, 'error' => 'User no longer active.'], 401);
}

jsonResponse([
    'success' => true,
    'user'    => [
        'id'        => (int)$freshUser['id'],
        'username'  => $freshUser['username'],
        'full_name' => $freshUser['full_name'],
        'role'      => $freshUser['role'],
        'created_at'=> $freshUser['created_at']
    ]
]);
