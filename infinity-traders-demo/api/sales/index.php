<?php
// ========================================================
// Infinity Traders — Sales Invoices API (GET / POST /api/sales/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $search        = trim($_GET['search'] ?? '');
    $dateFrom      = trim($_GET['date_from'] ?? '');
    $dateTo        = trim($_GET['date_to'] ?? '');
    $paymentStatus = trim($_GET['payment_status'] ?? '');
    $paymentMethod = trim($_GET['payment_method'] ?? '');
    $page          = max(1, (int)($_GET['page'] ?? 1));
    $limit         = isset($_GET['limit']) ? max(0, (int)$_GET['limit']) : 0;

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(s.invoice_no LIKE ? OR s.customer_name LIKE ? OR s.customer_phone LIKE ? OR s.customer_address LIKE ? OR c.address LIKE ? OR i.product_name LIKE ? OR i.sku LIKE ?)";
        $wildcard = "%$search%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    if (!empty($dateFrom)) {
        $where[] = "s.date >= ?";
        $params[] = $dateFrom;
    }

    if (!empty($dateTo)) {
        $where[] = "s.date <= ?";
        $params[] = $dateTo;
    }

    if (!empty($paymentStatus)) {
        $where[] = "s.payment_status = ?";
        $params[] = $paymentStatus;
    }

    if (!empty($paymentMethod)) {
        $where[] = "s.payment_method = ?";
        $params[] = $paymentMethod;
    }

    $whereSql = implode(' AND ', $where);

    // Count total
    $countStmt = $db->prepare("
        SELECT COUNT(DISTINCT s.id)
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN sales_invoice_items i ON s.id = i.invoice_id
        WHERE $whereSql
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $query = "
        SELECT
            s.*,
            COALESCE(NULLIF(TRIM(s.customer_address), ''), c.address, '') AS customer_address,
            COUNT(DISTINCT i.id) AS total_items,
            COALESCE(SUM(i.qty), 0) AS total_qty
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        LEFT JOIN sales_invoice_items i ON s.id = i.invoice_id
        WHERE $whereSql
        GROUP BY s.id
        ORDER BY s.id DESC
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
    $invoices = $stmt->fetchAll();

    $itemsByInvoice = [];
    if (!empty($invoices)) {
        $invoiceIds = array_column($invoices, 'id');
        $placeholders = implode(',', array_fill(0, count($invoiceIds), '?'));
        $itemStmt = $db->prepare("
            SELECT
                i.*,
                p.image_url,
                c.name AS category_name,
                sc.name AS subcategory_name
            FROM sales_invoice_items i
            LEFT JOIN products p ON i.product_id = p.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN subcategories sc ON p.subcategory_id = sc.id
            WHERE i.invoice_id IN ($placeholders)
            ORDER BY i.id ASC
        ");
        $itemStmt->execute($invoiceIds);
        $allItems = $itemStmt->fetchAll();

        foreach ($allItems as $it) {
            $invId = (int)$it['invoice_id'];
            if (!isset($itemsByInvoice[$invId])) {
                $itemsByInvoice[$invId] = [];
            }
            $itemsByInvoice[$invId][] = [
                'id'           => (int)$it['id'],
                'product_id'   => $it['product_id'] ? (int)$it['product_id'] : null,
                'sku'          => $it['sku'] ?? '',
                'product_name' => $it['product_name'] ?? '',
                'name'         => $it['product_name'] ?? '',
                'category'     => $it['category_name'] ?? '',
                'subcategory'  => $it['subcategory_name'] ?? '',
                'size'         => $it['size'] ?? '',
                'qty'          => (int)$it['qty'],
                'unit_price'   => (float)$it['unit_price'],
                'price'        => (float)$it['unit_price'],
                'discount'     => (float)$it['discount'],
                'line_total'   => (float)$it['line_total'],
                'image_url'    => $it['image_url'] ?? ''
            ];
        }
    }

    foreach ($invoices as &$inv) {
        $invId                 = (int)$inv['id'];
        $inv['id']             = $invId;
        $inv['customer_id']    = $inv['customer_id'] ? (int)$inv['customer_id'] : null;
        $inv['gst_enabled']    = (int)$inv['gst_enabled'];
        $inv['gst_rate']       = (float)$inv['gst_rate'];
        $inv['subtotal']       = (float)$inv['subtotal'];
        $inv['total_discount'] = (float)$inv['total_discount'];
        $inv['taxable_amount'] = (float)$inv['taxable_amount'];
        $inv['cgst']           = (float)$inv['cgst'];
        $inv['sgst']           = (float)$inv['sgst'];
        $inv['igst']           = (float)$inv['igst'];
        $inv['grand_total']    = (float)$inv['grand_total'];
        $inv['amount_paid']    = (float)$inv['amount_paid'];
        $inv['balance_due']    = (float)$inv['balance_due'];
        $inv['total_items']    = (int)$inv['total_items'];
        $inv['total_qty']      = (int)$inv['total_qty'];
        $inv['items']          = $itemsByInvoice[$invId] ?? [];
        $inv['products_summary'] = implode(', ', array_map(function($x) {
            $sz = (!empty($x['size']) && $x['size'] !== '—') ? " (Size: {$x['size']})" : '';
            return "{$x['product_name']}{$sz} × {$x['qty']}";
        }, $inv['items']));
    }

    jsonResponse([
        'success' => true,
        'data'    => $invoices,
        'total'   => $total,
        'page'    => $page,
        'pages'   => $pages
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $items = $input['items'] ?? [];
    if (empty($items) || !is_array($items)) {
        jsonResponse(['success' => false, 'error' => 'Invoice must contain at least one item.'], 400);
    }

    $db->beginTransaction();

    try {
        // 1. Lock settings row for atomic invoice numbering
        $setStmt = $db->query("SELECT invoice_prefix, next_invoice_num FROM settings WHERE id = 1 FOR UPDATE");
        $settings = $setStmt->fetch();
        if (!$settings) {
            $settings = ['invoice_prefix' => 'IT-INV', 'next_invoice_num' => 1];
        }

        $invoicePrefix = $settings['invoice_prefix'] ?? 'IT-INV';
        $nextNum       = (int)($settings['next_invoice_num'] ?? 1);

        $customInvoiceNo = trim($input['invoice_no'] ?? '');
        if (empty($customInvoiceNo) || strpos($customInvoiceNo, 'AUTO') !== false) {
            $invoiceNo = sprintf('%s-%04d', $invoicePrefix, $nextNum);
            $incStmt = $db->prepare("UPDATE settings SET next_invoice_num = next_invoice_num + 1 WHERE id = 1");
            $incStmt->execute();
        } else {
            // Check uniqueness if custom provided
            $checkStmt = $db->prepare("SELECT id FROM sales_invoices WHERE invoice_no = ? LIMIT 1");
            $checkStmt->execute([$customInvoiceNo]);
            if ($checkStmt->fetch()) {
                // If it collided with current auto-num, advance and use auto-num
                $invoiceNo = sprintf('%s-%04d', $invoicePrefix, $nextNum);
                $incStmt = $db->prepare("UPDATE settings SET next_invoice_num = next_invoice_num + 1 WHERE id = 1");
                $incStmt->execute();
            } else {
                $invoiceNo = $customInvoiceNo;
                // If the number was formatted with prefix, update next_num
                if (preg_match('/-(\d+)$/', $customInvoiceNo, $m)) {
                    $usedNum = (int)$m[1];
                    if ($usedNum >= $nextNum) {
                        $updStmt = $db->prepare("UPDATE settings SET next_invoice_num = ? WHERE id = 1");
                        $updStmt->execute([$usedNum + 1]);
                    }
                }
            }
        }

        // 2. Customer resolution / auto-create
        // 2. Customer resolution / auto-create
        $customerId      = !empty($input['customer_id']) ? (int)$input['customer_id'] : null;
        $customerName    = trim($input['customer_name'] ?? '');
        $customerPhone   = trim($input['customer_phone'] ?? '');
        $customerAddress = trim($input['customer_address'] ?? '');

        if (!$customerId && (!empty($customerPhone) || !empty($customerName))) {
            $existingCust = null;
            if (!empty($customerPhone)) {
                $cCheck = $db->prepare("SELECT id, name, address FROM customers WHERE phone = ? LIMIT 1");
                $cCheck->execute([$customerPhone]);
                $existingCust = $cCheck->fetch();
            }
            if (!$existingCust && !empty($customerName) && $customerName !== 'Walk-in Customer') {
                $cCheck = $db->prepare("SELECT id, name, address FROM customers WHERE name = ? LIMIT 1");
                $cCheck->execute([$customerName]);
                $existingCust = $cCheck->fetch();
            }

            if ($existingCust) {
                $customerId = (int)$existingCust['id'];
                if (empty($customerName)) {
                    $customerName = $existingCust['name'];
                }
                if (!empty($customerAddress) && (empty($existingCust['address']) || $existingCust['address'] !== $customerAddress)) {
                    $updAddr = $db->prepare("UPDATE customers SET address = ? WHERE id = ?");
                    $updAddr->execute([$customerAddress, $customerId]);
                }
            } elseif (!empty($customerName) && $customerName !== 'Walk-in Customer') {
                $cAdd = $db->prepare("INSERT INTO customers (name, phone, address, created_at) VALUES (?, ?, ?, NOW())");
                $cAdd->execute([$customerName, $customerPhone ?: null, $customerAddress ?: null]);
                $customerId = (int)$db->lastInsertId();
            }
        }

        // 3. Financial calculations
        $date          = !empty($input['date']) ? $input['date'] : date('Y-m-d');
        $paymentMethod = $input['payment_method'] ?? 'Cash';
        $gstEnabled    = !empty($input['gst_enabled']) ? 1 : 0;
        $gstRate       = max(0, (float)($input['gst_rate'] ?? 0));
        $gstType       = in_array($input['gst_type'] ?? '', ['intrastate', 'interstate']) ? $input['gst_type'] : 'intrastate';

        $subtotal      = max(0, (float)($input['subtotal'] ?? 0));
        $totalDiscount = max(0, (float)($input['total_discount'] ?? 0));
        $taxableAmount = max(0, (float)($input['taxable_amount'] ?? ($subtotal - $totalDiscount)));
        $cgst          = max(0, (float)($input['cgst'] ?? 0));
        $sgst          = max(0, (float)($input['sgst'] ?? 0));
        $igst          = max(0, (float)($input['igst'] ?? 0));
        $grandTotal    = max(0, (float)($input['grand_total'] ?? 0));
        $amountPaid    = max(0, (float)($input['amount_paid'] ?? $grandTotal));
        $balanceDue    = max(0, (float)($input['balance_due'] ?? ($grandTotal - $amountPaid)));
        $paymentStatus = $input['payment_status'] ?? ($balanceDue <= 0.01 ? 'Paid' : ($amountPaid > 0 ? 'Partial' : 'Unpaid'));
        $notes         = trim($input['notes'] ?? '') ?: null;

        // 4. Insert Sales Invoice
        $invStmt = $db->prepare("
            INSERT INTO sales_invoices (
                invoice_no, customer_id, customer_name, customer_phone, customer_address, date,
                payment_method, gst_enabled, gst_rate, gst_type,
                subtotal, total_discount, taxable_amount,
                cgst, sgst, igst, grand_total, amount_paid, balance_due,
                payment_status, notes, created_by, created_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, NOW()
            )
        ");

        try {
            $invStmt->execute([
                $invoiceNo, $customerId, $customerName, $customerPhone, $customerAddress ?: null, $date,
                $paymentMethod, $gstEnabled, $gstRate, $gstType,
                $subtotal, $totalDiscount, $taxableAmount,
                $cgst, $sgst, $igst, $grandTotal, $amountPaid, $balanceDue,
                $paymentStatus, $notes, $currentUser['id']
            ]);
        } catch (\PDOException $e) {
            if (strpos($e->getMessage(), 'customer_address') !== false) {
                // Auto-heal: add missing customer_address column to live database
                try {
                    $db->exec("ALTER TABLE `sales_invoices` ADD COLUMN `customer_address` TEXT NULL AFTER `customer_phone`");
                    $invStmt->execute([
                        $invoiceNo, $customerId, $customerName, $customerPhone, $customerAddress ?: null, $date,
                        $paymentMethod, $gstEnabled, $gstRate, $gstType,
                        $subtotal, $totalDiscount, $taxableAmount,
                        $cgst, $sgst, $igst, $grandTotal, $amountPaid, $balanceDue,
                        $paymentStatus, $notes, $currentUser['id']
                    ]);
                } catch (\Throwable $fallbackEx) {
                    // Fallback: insert without customer_address column
                    $fallbackInvStmt = $db->prepare("
                        INSERT INTO sales_invoices (
                            invoice_no, customer_id, customer_name, customer_phone, date,
                            payment_method, gst_enabled, gst_rate, gst_type,
                            subtotal, total_discount, taxable_amount,
                            cgst, sgst, igst, grand_total, amount_paid, balance_due,
                            payment_status, notes, created_by, created_at
                        ) VALUES (
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, NOW()
                        )
                    ");
                    $fallbackInvStmt->execute([
                        $invoiceNo, $customerId, $customerName, $customerPhone, $date,
                        $paymentMethod, $gstEnabled, $gstRate, $gstType,
                        $subtotal, $totalDiscount, $taxableAmount,
                        $cgst, $sgst, $igst, $grandTotal, $amountPaid, $balanceDue,
                        $paymentStatus, $notes, $currentUser['id']
                    ]);
                }
            } else {
                throw $e;
            }
        }

        $invoiceId = (int)$db->lastInsertId();

        // 5. Insert Items and update Product Stock atomically
        $itemStmt = $db->prepare("
            INSERT INTO sales_invoice_items (
                invoice_id, product_id, sku, product_name, size, qty, unit_price, discount, line_total
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        ");

        $stockStmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
        $stockBySkuStmt = $db->prepare("UPDATE products SET stock = stock - ? WHERE sku = ?");

        foreach ($items as $item) {
            $prodId    = !empty($item['product_id']) ? (int)$item['product_id'] : (!empty($item['id']) ? (int)$item['id'] : null);
            $sku       = trim($item['sku'] ?? '') ?: null;
            $prodName  = trim($item['name'] ?? ($item['product_name'] ?? 'Product'));
            $size      = trim($item['size'] ?? '') ?: null;
            $qty       = max(1, (int)($item['qty'] ?? 1));
            $unitPrice = max(0, (float)($item['unit_price'] ?? ($item['price'] ?? 0)));
            $discount  = max(0, (float)($item['discount'] ?? 0));
            $lineTotal = max(0, (float)($item['line_total'] ?? (($unitPrice * $qty) - $discount)));

            // If product_id was not provided, look up by sku
            if (!$prodId && $sku) {
                $pLookup = $db->prepare("SELECT id FROM products WHERE sku = ? LIMIT 1");
                $pLookup->execute([$sku]);
                $prodId = $pLookup->fetchColumn() ?: null;
            }

            $itemStmt->execute([
                $invoiceId, $prodId, $sku, $prodName, $size, $qty, $unitPrice, $discount, $lineTotal
            ]);

            // Deduct stock in DB
            if ($prodId) {
                $stockStmt->execute([$qty, $prodId]);
            } elseif ($sku) {
                $stockBySkuStmt->execute([$qty, $sku]);
            }
        }

        // 6. Log Audit Trail
        logAudit($db, 'CREATE_INVOICE', 'sales_invoices', $invoiceId, [
            'invoice_no'  => $invoiceNo,
            'grand_total' => $grandTotal,
            'items_count' => count($items)
        ]);

        $db->commit();

        jsonResponse([
            'success'    => true,
            'message'    => 'Invoice generated successfully.',
            'id'         => $invoiceId,
            'invoice_no' => $invoiceNo
        ], 201);

    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse([
            'success' => false,
            'error'   => 'Transaction failed: ' . $e->getMessage()
        ], 500);
    }
}

jsonResponse(['success' => false, 'error' => 'Method not allowed.'], 405);
