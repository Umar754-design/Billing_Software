<?php
// ========================================================
// Infinity Traders — Settings API (GET / PUT /api/settings/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $stmt = $db->query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch();

    if (!$settings) {
        $db->query("
            INSERT INTO settings (id, business_name, default_gst_mode, invoice_prefix, currency, low_stock_threshold, next_invoice_num, next_purchase_num)
            VALUES (1, 'Infinity Traders', 0, 'IT-INV', 'INR', 3, 1, 1)
        ");
        $stmt = $db->query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
        $settings = $stmt->fetch();
    }

    jsonResponse([
        'success' => true,
        'data'    => $settings
    ]);
}

if ($method === 'PUT' || $method === 'POST') {
    $input = getJsonInput();

    // Check if password change requested
    if (!empty($input['new_password'])) {
        $currentPass = (string)($input['current_password'] ?? '');
        $newPass = (string)$input['new_password'];

        if (strlen($newPass) < 6) {
            jsonResponse(['success' => false, 'error' => 'New password must be at least 6 characters.'], 400);
        }

        // Verify current password
        $userStmt = $db->prepare("SELECT password FROM users WHERE id = ? LIMIT 1");
        $userStmt->execute([$currentUser['id']]);
        $userRow = $userStmt->fetch();

        if (!$userRow || !password_verify($currentPass, $userRow['password'])) {
            jsonResponse(['success' => false, 'error' => 'Current password is incorrect.'], 400);
        }

        $newHash = password_hash($newPass, PASSWORD_BCRYPT);
        $updatePassStmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
        $updatePassStmt->execute([$newHash, $currentUser['id']]);
        logAudit($db, 'UPDATE_PASSWORD', 'users', $currentUser['id'], ['username' => $currentUser['username']]);
    }

    // Update settings table
    $business_name       = trim($input['business_name'] ?? 'Infinity Traders');
    $business_address    = trim($input['business_address'] ?? '');
    $phone               = trim($input['phone'] ?? '');
    $email               = trim($input['email'] ?? '');
    $gstin               = trim($input['gstin'] ?? '');
    $default_gst_mode    = !empty($input['default_gst_mode']) ? 1 : 0;
    $invoice_prefix      = trim($input['invoice_prefix'] ?? 'IT-INV');
    $currency            = trim($input['currency'] ?? 'INR');
    $low_stock_threshold = max(1, (int)($input['low_stock_threshold'] ?? 3));
    $invoice_footer_text = trim($input['invoice_footer_text'] ?? '');

    $stmt = $db->prepare("
        UPDATE settings SET
            business_name = ?,
            business_address = ?,
            phone = ?,
            email = ?,
            gstin = ?,
            default_gst_mode = ?,
            invoice_prefix = ?,
            currency = ?,
            low_stock_threshold = ?,
            invoice_footer_text = ?
        WHERE id = 1
    ");

    $stmt->execute([
        $business_name,
        $business_address,
        $phone,
        $email,
        $gstin,
        $default_gst_mode,
        $invoice_prefix,
        $currency,
        $low_stock_threshold,
        $invoice_footer_text
    ]);

    logAudit($db, 'UPDATE_SETTINGS', 'settings', 1, [
        'business_name' => $business_name,
        'invoice_prefix' => $invoice_prefix
    ]);

    $stmt = $db->query("SELECT * FROM settings WHERE id = 1 LIMIT 1");
    $updatedSettings = $stmt->fetch();

    jsonResponse([
        'success' => true,
        'message' => 'Settings saved successfully',
        'data'    => $updatedSettings
    ]);
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
