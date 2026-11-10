<?php
// ========================================================
// Infinity Traders — Logout API (POST /api/auth/logout.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

if (isset($_SESSION['user_id'])) {
    $db = getDbConnection();
    logAudit($db, 'LOGOUT', 'users', (int)$_SESSION['user_id'], ['username' => $_SESSION['username'] ?? '']);
}

$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();

jsonResponse([
    'success' => true,
    'message' => 'Logged out successfully'
]);
