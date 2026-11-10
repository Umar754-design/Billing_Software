<?php
// ========================================================
// Infinity Traders — Login API (POST /api/auth/login.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed. Use POST.'], 405);
}

$input = getJsonInput();
$username = trim($input['username'] ?? '');
$password = (string)($input['password'] ?? '');

if (empty($username) || empty($password)) {
    jsonResponse(['success' => false, 'error' => 'Username and password are required.'], 400);
}

$db = getDbConnection();

$stmt = $db->prepare("SELECT id, username, password, full_name, role, is_active FROM users WHERE username = ? LIMIT 1");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonResponse(['success' => false, 'error' => 'Invalid username or password.'], 401);
}

if ((int)$user['is_active'] !== 1) {
    jsonResponse(['success' => false, 'error' => 'Account is inactive. Please contact administrator.'], 403);
}

// Regenerate session ID for security
session_regenerate_id(true);

$_SESSION['user_id']   = (int)$user['id'];
$_SESSION['username']  = $user['username'];
$_SESSION['full_name'] = $user['full_name'];
$_SESSION['role']      = $user['role'];

logAudit($db, 'LOGIN', 'users', (int)$user['id'], ['username' => $user['username']]);

jsonResponse([
    'success' => true,
    'message' => 'Login successful',
    'user'    => [
        'id'        => (int)$user['id'],
        'username'  => $user['username'],
        'full_name' => $user['full_name'],
        'role'      => $user['role']
    ]
]);
