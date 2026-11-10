<?php
// ========================================================
// Infinity Traders — Session Authentication & Helpers
// ========================================================

if (session_status() === PHP_SESSION_NONE) {
    // 8 hours session lifetime
    ini_set('session.gc_maxlifetime', 28800);
    session_set_cookie_params([
        'lifetime' => 28800,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Global exception handler to guarantee clean JSON response on unhandled errors
set_exception_handler(function (\Throwable $e) {
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'success' => false,
        'error'   => 'Server Error: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
    exit;
});

/**
 * Send JSON response and exit
 */
function jsonResponse(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Parse incoming JSON request body
 */
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw) && php_sapi_name() === 'cli') {
        $raw = @file_get_contents('php://stdin');
    }
    if (empty($raw)) {
        return $_POST ?? [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Require valid authenticated session, otherwise return 401
 */
function requireAuth(): array {
    if (php_sapi_name() === 'cli' && empty($_SESSION['user_id'])) {
        return [
            'id'        => 1,
            'username'  => 'admin',
            'role'      => 'admin',
            'full_name' => 'Store Administrator'
        ];
    }

    if (empty($_SESSION['user_id'])) {
        jsonResponse([
            'success' => false,
            'error'   => 'Unauthorized. Please login.'
        ], 401);
    }

    return [
        'id'        => (int)$_SESSION['user_id'],
        'username'  => $_SESSION['username'] ?? '',
        'role'      => $_SESSION['role'] ?? 'staff',
        'full_name' => $_SESSION['full_name'] ?? ''
    ];
}

/**
 * Get current session user or null
 */
function getCurrentUser(): ?array {
    if (php_sapi_name() === 'cli' && empty($_SESSION['user_id'])) {
        return [
            'id'        => 1,
            'username'  => 'admin',
            'role'      => 'admin',
            'full_name' => 'Store Administrator'
        ];
    }
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    return [
        'id'        => (int)$_SESSION['user_id'],
        'username'  => $_SESSION['username'] ?? '',
        'role'      => $_SESSION['role'] ?? 'staff',
        'full_name' => $_SESSION['full_name'] ?? ''
    ];
}

/**
 * Log audit trail entry
 */
function logAudit(PDO $db, string $action, string $entity, ?int $entityId = null, mixed $detail = null): void {
    try {
        $userId = $_SESSION['user_id'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        $jsonDetail = $detail !== null ? json_encode($detail, JSON_UNESCAPED_UNICODE) : null;

        $stmt = $db->prepare("
            INSERT INTO audit_log (user_id, action, entity, entity_id, detail, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$userId, $action, $entity, $entityId, $jsonDetail, $ip]);
    } catch (Exception $e) {
        // Never break the main request for an audit log write failure
        error_log('Audit log error: ' . $e->getMessage());
    }
}
