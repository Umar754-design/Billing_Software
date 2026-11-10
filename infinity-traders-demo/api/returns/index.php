<?php
// ========================================================
// Infinity Traders — Sales Returns API (GET / POST /api/returns/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

// ─────────────────────────────────────────────────────────
// GET: List Returns
// ─────────────────────────────────────────────────────────
if ($method === 'GET') {
    $search       = trim($_GET['search'] ?? '');
    $dateFrom     = trim($_GET['date_from'] ?? '');
    $dateTo       = trim($_GET['date_to'] ?? '');
    $refundMethod = trim($_GET['refund_method'] ?? '');
    $refundStatus = trim($_GET['refund_status'] ?? '');
    $page         = max(1, (int)($_GET['page'] ?? 1));
    $limit        = isset($_GET['limit']) ? max(0, (int)$_GET['limit']) : 0;

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(r.return_no LIKE ? OR r.invoice_no LIKE ? OR r.customer_name LIKE ? OR r.customer_phone LIKE ? OR ri.product_name LIKE ? OR ri.sku LIKE ?)";
        $wildcard = "%$search%";
        $params = array_merge($params, [$wildcard, $wildcard, $wildcard, $wildcard, $wildcard, $wildcard]);
    }

    if (!empty($dateFrom)) {
        $where[] = "r.date >= ?";
        $params[] = $dateFrom;
    }

    if (!empty($dateTo)) {
        $where[] = "r.date <= ?";
        $params[] = $dateTo;
    }

    if (!empty($refundMethod)) {
        $where[] = "r.refund_method = ?";
        $params[] = $refundMethod;
    }

    if (!empty($refundStatus)) {
        $where[] = "r.refund_status = ?";
        $params[] = $refundStatus;
    }

    $whereSql = implode(' AND ', $where);

    // Count total returns
    $countStmt = $db->prepare("
        SELECT COUNT(DISTINCT r.id)
        FROM sales_returns r
        LEFT JOIN sales_return_items ri ON r.id = ri.return_id
        WHERE $whereSql
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Summary statistics (total refunded amount, total items restocked)
    $statsStmt = $db->query("
        SELECT
            COUNT(DISTINCT r.id) AS total_count,
            COALESCE(SUM(r.total_refund_amount), 0) AS total_refunded,
            COALESCE(SUM(CASE WHEN ri.restock = 1 THEN ri.return_qty ELSE 0 END), 0) AS restocked_qty
        FROM sales_returns r
        LEFT JOIN sales_return_items ri ON r.id = ri.return_id
    ");
    $stats = $statsStmt->fetch();

    $query = "
        SELECT
            r.*,
            COUNT(DISTINCT ri.id) AS total_items,
            COALESCE(SUM(ri.return_qty), 0) AS total_qty
        FROM sales_returns r
        LEFT JOIN sales_return_items ri ON r.id = ri.return_id
        WHERE $whereSql
        GROUP BY r.id
        ORDER BY r.date DESC, r.id DESC
    ";

    if ($limit > 0) {
        $offset = ($page - 1) * $limit;
        $query .= " LIMIT $limit OFFSET $offset";
        $pages = ceil($total / $limit);
    } else {
        $pages = 1;
    }

    $stmt = $db->prepare($query);
    $stmt->execute($params);
    $returns = $stmt->fetchAll();

    // Fetch line items for these returns
    $itemsByReturn = [];
    if (!empty($returns)) {
        $returnIds = array_column($returns, 'id');
        $placeholders = implode(',', array_fill(0, count($returnIds), '?'));
        $itemStmt = $db->prepare("
            SELECT
                ri.*,
                p.image_url
            FROM sales_return_items ri
            LEFT JOIN products p ON ri.product_id = p.id
            WHERE ri.return_id IN ($placeholders)
            ORDER BY ri.id ASC
        ");
        $itemStmt->execute($returnIds);
        $allItems = $itemStmt->fetchAll();

        foreach ($allItems as $it) {
            $retId = (int)$it['return_id'];
            if (!isset($itemsByReturn[$retId])) {
                $itemsByReturn[$retId] = [];
            }
            $itemsByReturn[$retId][] = [
                'id'             => (int)$it['id'],
                'return_id'      => $retId,
                'product_id'     => $it['product_id'] ? (int)$it['product_id'] : null,
                'product_name'   => $it['product_name'] ?? '',
                'name'           => $it['product_name'] ?? '',
                'sku'            => $it['sku'] ?? '',
                'size'           => $it['size'] ?? '',
                'return_qty'     => (int)$it['return_qty'],
                'qty'            => (int)$it['return_qty'],
                'unit_price'     => (float)$it['unit_price'],
                'price'          => (float)$it['unit_price'],
                'refund_amount'  => (float)$it['refund_amount'],
                'restock'        => (int)$it['restock'],
                'item_condition' => $it['item_condition'] ?? 'Good (Restock)',
                'image_url'      => $it['image_url'] ?? ''
            ];
        }
    }

    foreach ($returns as &$ret) {
        $retId = (int)$ret['id'];
        $ret['id']                  = $retId;
        $ret['invoice_id']          = $ret['invoice_id'] ? (int)$ret['invoice_id'] : null;
        $ret['customer_id']         = $ret['customer_id'] ? (int)$ret['customer_id'] : null;
        $ret['total_refund_amount'] = (float)$ret['total_refund_amount'];
        $ret['total_items']         = (int)$ret['total_items'];
        $ret['total_qty']           = (int)$ret['total_qty'];
        $ret['items']               = $itemsByReturn[$retId] ?? [];
        $ret['products_summary']    = implode(', ', array_map(function($x) {
            $sz = (!empty($x['size']) && $x['size'] !== '—') ? " (Size: {$x['size']})" : '';
            return "{$x['product_name']}{$sz} × {$x['return_qty']}";
        }, $ret['items']));
    }

    jsonResponse([
        'success' => true,
        'data'    => $returns,
        'stats'   => [
            'total_returns'   => (int)($stats['total_count'] ?? 0),
            'total_refunded'  => (float)($stats['total_refunded'] ?? 0),
            'restocked_qty'   => (int)($stats['restocked_qty'] ?? 0)
        ],
        'total'   => $total,
        'page'    => $page,
        'pages'   => $pages
    ]);
}

// ─────────────────────────────────────────────────────────
// POST: Create Return
// ─────────────────────────────────────────────────────────
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        jsonResponse(['success' => false, 'error' => 'Invalid JSON input.'], 400);
    }

    $invoiceNo     = trim($input['invoice_no'] ?? '');
    $customerName  = trim($input['customer_name'] ?? '');
    $customerPhone = trim($input['customer_phone'] ?? '');
    $date          = trim($input['date'] ?? date('Y-m-d'));
    $refundMethod  = trim($input['refund_method'] ?? 'Cash');
    $refundStatus  = trim($input['refund_status'] ?? 'Completed');
    $reason        = trim($input['reason'] ?? 'Customer Return');
    $notes         = trim($input['notes'] ?? '');
    $items         = $input['items'] ?? [];

    if (empty($items) || !is_array($items)) {
        jsonResponse(['success' => false, 'error' => 'At least one returned item is required.'], 400);
    }

    // Try finding customer_id and invoice_id if invoice_no provided
    $invoiceId = null;
    $customerId = null;
    if (!empty($invoiceNo)) {
        $invStmt = $db->prepare("SELECT id, customer_id, customer_name, customer_phone FROM sales_invoices WHERE invoice_no = ? LIMIT 1");
        $invStmt->execute([$invoiceNo]);
        $inv = $invStmt->fetch();
        if ($inv) {
            $invoiceId = (int)$inv['id'];
            if (!$customerId && !empty($inv['customer_id'])) {
                $customerId = (int)$inv['customer_id'];
            }
            if (empty($customerName) && !empty($inv['customer_name'])) {
                $customerName = $inv['customer_name'];
            }
            if (empty($customerPhone) && !empty($inv['customer_phone'])) {
                $customerPhone = $inv['customer_phone'];
            }
        }
    }

    if (empty($customerName)) {
        $customerName = 'Walk-in Customer';
    }

    $db->beginTransaction();
    try {
        // Generate Return Number (RET-0001, RET-0002...)
        $maxStmt = $db->query("SELECT MAX(id) FROM sales_returns");
        $nextId = (int)$maxStmt->fetchColumn() + 1;
        $returnNo = 'RET-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

        // Calculate total refund amount
        $totalRefund = 0.00;
        foreach ($items as $it) {
            $qty = max(1, (int)($it['return_qty'] ?? $it['qty'] ?? 1));
            $unitPrice = (float)($it['unit_price'] ?? $it['price'] ?? 0);
            $lineRefund = isset($it['refund_amount']) ? (float)$it['refund_amount'] : ($qty * $unitPrice);
            $totalRefund += $lineRefund;
        }

        // Insert into sales_returns
        $insRet = $db->prepare("
            INSERT INTO sales_returns (
                return_no, invoice_id, invoice_no, customer_id, customer_name, customer_phone,
                date, total_refund_amount, refund_method, refund_status, reason, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insRet->execute([
            $returnNo,
            $invoiceId,
            $invoiceNo ?: null,
            $customerId,
            $customerName,
            $customerPhone,
            $date,
            $totalRefund,
            $refundMethod,
            $refundStatus,
            $reason,
            $notes,
            $currentUser['id'] ?? null
        ]);
        $returnId = (int)$db->lastInsertId();

        // Insert return items and adjust stock if restocked
        $insItem = $db->prepare("
            INSERT INTO sales_return_items (
                return_id, product_id, product_name, sku, size, return_qty, unit_price, refund_amount, restock, item_condition
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stockStmt = $db->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");

        foreach ($items as $it) {
            $prodId        = !empty($it['product_id']) ? (int)$it['product_id'] : null;
            $prodName      = trim($it['product_name'] ?? $it['name'] ?? 'Returned Item');
            $sku           = trim($it['sku'] ?? '');
            $size          = trim($it['size'] ?? '');
            $qty           = max(1, (int)($it['return_qty'] ?? $it['qty'] ?? 1));
            $unitPrice     = (float)($it['unit_price'] ?? $it['price'] ?? 0);
            $lineRefund    = isset($it['refund_amount']) ? (float)$it['refund_amount'] : ($qty * $unitPrice);
            $restock       = isset($it['restock']) ? ((int)$it['restock'] ? 1 : 0) : 1;
            $itemCondition = trim($it['item_condition'] ?? ($restock ? 'Good (Restock)' : 'Defective (Do not restock)'));

            $insItem->execute([
                $returnId,
                $prodId,
                $prodName,
                $sku,
                $size,
                $qty,
                $unitPrice,
                $lineRefund,
                $restock,
                $itemCondition
            ]);

            // If restock is enabled, increment stock in products table
            if ($restock === 1 && $prodId) {
                $stockStmt->execute([$qty, $prodId]);
            }
        }

        // Audit log
        $auditStmt = $db->prepare("
            INSERT INTO audit_log (user_id, action, entity, entity_id, detail, ip_address)
            VALUES (?, 'CREATE', 'sales_returns', ?, ?, ?)
        ");
        $auditStmt->execute([
            $currentUser['id'] ?? null,
            $returnId,
            json_encode(['return_no' => $returnNo, 'total_refund' => $totalRefund, 'items_count' => count($items)]),
            $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1'
        ]);

        $db->commit();

        jsonResponse([
            'success'   => true,
            'message'   => 'Return processed successfully.',
            'data'      => [
                'id'                  => $returnId,
                'return_no'           => $returnNo,
                'total_refund_amount' => $totalRefund,
                'items_count'         => count($items)
            ]
        ], 201);

    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
