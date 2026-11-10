<?php
// ========================================================
// Infinity Traders — Purchases API (GET / POST /api/purchases/index.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();
$method = $_SERVER['REQUEST_METHOD'] ?? (php_sapi_name() === 'cli' ? 'POST' : 'GET');

if ($method === 'GET') {
    $search        = trim($_GET['search'] ?? '');
    $supplier      = trim($_GET['supplier'] ?? '');
    $status        = trim($_GET['status'] ?? '');
    $dateFrom      = trim($_GET['date_from'] ?? '');
    $dateTo        = trim($_GET['date_to'] ?? '');
    $page          = max(1, (int)($_GET['page'] ?? 1));
    $limit         = isset($_GET['limit']) ? max(0, (int)$_GET['limit']) : 0;

    $where = ["1=1"];
    $params = [];

    if (!empty($search)) {
        $where[] = "(po.purchase_no LIKE ? OR po.supplier_invoice_no LIKE ? OR po.supplier_name LIKE ? OR sup.name LIKE ?)";
        $wildcard = "%$search%";
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
        $params[] = $wildcard;
    }

    if (!empty($supplier)) {
        if (is_numeric($supplier)) {
            $where[] = "po.supplier_id = ?";
            $params[] = (int)$supplier;
        } else {
            $where[] = "(po.supplier_name LIKE ? OR sup.name LIKE ?)";
            $params[] = "%$supplier%";
            $params[] = "%$supplier%";
        }
    }

    if (!empty($status)) {
        $where[] = "po.payment_status = ?";
        $params[] = $status;
    }

    if (!empty($dateFrom)) {
        $where[] = "po.date >= ?";
        $params[] = $dateFrom;
    }

    if (!empty($dateTo)) {
        $where[] = "po.date <= ?";
        $params[] = $dateTo;
    }

    $whereSql = implode(' AND ', $where);

    $countStmt = $db->prepare("
        SELECT COUNT(*)
        FROM purchase_orders po
        LEFT JOIN suppliers sup ON po.supplier_id = sup.id
        WHERE $whereSql
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $query = "
        SELECT
            po.*,
            COALESCE(NULLIF(TRIM(po.supplier_name), ''), sup.name, '') AS supplier_name,
            COALESCE(NULLIF(TRIM(po.supplier_phone), ''), sup.phone, '') AS supplier_phone,
            COALESCE(NULLIF(TRIM(po.supplier_address), ''), sup.address, '') AS supplier_address,
            COUNT(poi.id) AS total_items,
            COALESCE(SUM(poi.qty), 0) AS total_qty
        FROM purchase_orders po
        LEFT JOIN suppliers sup ON po.supplier_id = sup.id
        LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_id
        WHERE $whereSql
        GROUP BY po.id
        ORDER BY po.id DESC
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
    $purchases = $stmt->fetchAll();

    foreach ($purchases as &$p) {
        $p['id']               = (int)$p['id'];
        $p['supplier_id']      = $p['supplier_id'] ? (int)$p['supplier_id'] : null;
        $p['supplier_name']    = $p['supplier_name'] ?: '';
        $p['supplier_phone']   = $p['supplier_phone'] ?: '';
        $p['supplier_address'] = $p['supplier_address'] ?: '';
        $p['gst_enabled']      = (int)$p['gst_enabled'];
        $p['gst_rate']         = (float)$p['gst_rate'];
        $p['subtotal']         = (float)$p['subtotal'];
        $p['gst_amount']       = (float)$p['gst_amount'];
        $p['total_amount']     = (float)$p['total_amount'];
        $p['amount_paid']      = (float)$p['amount_paid'];
        $p['balance_due']      = (float)$p['balance_due'];
        $p['total_items']      = (int)$p['total_items'];
        $p['total_qty']        = (int)$p['total_qty'];
        // compatibility
        $p['supplier']         = $p['supplier_name'];
    }

    jsonResponse([
        'success' => true,
        'data'    => $purchases,
        'total'   => $total,
        'page'    => $page,
        'pages'   => $pages
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();

    $items = $input['items'] ?? [];
    if (empty($items) || !is_array($items)) {
        jsonResponse(['success' => false, 'error' => 'Purchase must contain at least one item.'], 400);
    }

    $db->beginTransaction();

    try {
        // 1. Lock settings for purchase number
        $setStmt = $db->query("SELECT next_purchase_num FROM settings WHERE id = 1 FOR UPDATE");
        $settings = $setStmt->fetch();
        $nextNum = (int)($settings['next_purchase_num'] ?? 1);

        $customPurchaseNo = trim($input['purchase_no'] ?? '');
        if (empty($customPurchaseNo) || strpos($customPurchaseNo, 'AUTO') !== false) {
            $purchaseNo = sprintf('PO-%04d', $nextNum);
            $incStmt = $db->prepare("UPDATE settings SET next_purchase_num = next_purchase_num + 1 WHERE id = 1");
            $incStmt->execute();
        } else {
            $purchaseNo = $customPurchaseNo;
            if (preg_match('/-(\d+)$/', $customPurchaseNo, $m)) {
                $usedNum = (int)$m[1];
                if ($usedNum >= $nextNum) {
                    $updStmt = $db->prepare("UPDATE settings SET next_purchase_num = ? WHERE id = 1");
                    $updStmt->execute([$usedNum + 1]);
                }
            }
        }

        // Supplier resolution
        $supplierId      = !empty($input['supplier_id']) ? (int)$input['supplier_id'] : null;
        $supplierName    = trim($input['supplier_name'] ?? ($input['supplier'] ?? ''));
        $supplierPhone   = trim($input['supplier_phone'] ?? '');
        $supplierAddress = trim($input['supplier_address'] ?? '');

        if ($supplierId) {
            $sStmt = $db->prepare("SELECT id, name, phone, address FROM suppliers WHERE id = ? LIMIT 1");
            $sStmt->execute([$supplierId]);
            $sRow = $sStmt->fetch();
            if ($sRow) {
                if (empty($supplierName)) $supplierName = $sRow['name'] ?? '';
                if (empty($supplierPhone)) $supplierPhone = $sRow['phone'] ?? '';
                if (empty($supplierAddress)) $supplierAddress = $sRow['address'] ?? '';
                if (!empty($input['supplier_phone']) && empty($sRow['phone'])) {
                    $db->prepare("UPDATE suppliers SET phone = ? WHERE id = ?")->execute([$supplierPhone, $supplierId]);
                }
                if (!empty($input['supplier_address']) && empty($sRow['address'])) {
                    $db->prepare("UPDATE suppliers SET address = ? WHERE id = ?")->execute([$supplierAddress, $supplierId]);
                }
            }
        } elseif (!empty($supplierName)) {
            $sLookup = $db->prepare("SELECT id, name, phone, address FROM suppliers WHERE name = ? LIMIT 1");
            $sLookup->execute([$supplierName]);
            $sRow = $sLookup->fetch();
            if ($sRow) {
                $supplierId = (int)$sRow['id'];
                if (empty($supplierPhone)) $supplierPhone = $sRow['phone'] ?? '';
                if (empty($supplierAddress)) $supplierAddress = $sRow['address'] ?? '';
            } else {
                $insSup = $db->prepare("
                    INSERT INTO suppliers (name, phone, address, status, created_at)
                    VALUES (?, ?, ?, 'Active', NOW())
                ");
                $insSup->execute([$supplierName, $supplierPhone ?: null, $supplierAddress ?: null]);
                $supplierId = (int)$db->lastInsertId();
            }
        }

        // STRICT REQUIREMENT: Bina supplier choose kiye product purchase nahi hona chahiye
        if (empty($supplierName)) {
            $db->rollBack();
            jsonResponse([
                'success' => false,
                'error'   => 'Supplier is required. Bina supplier choose kiye product purchase nahi ho sakta.'
            ], 400);
        }

        $supplierInvoiceNo = trim($input['supplier_invoice_no'] ?? '') ?: null;
        $date              = !empty($input['date']) ? $input['date'] : date('Y-m-d');
        $gstEnabled        = !empty($input['gst_enabled']) ? 1 : 0;
        $gstRate           = max(0, (float)($input['gst_rate'] ?? 0));
        $subtotal          = max(0, (float)($input['subtotal'] ?? 0));
        $gstAmount         = max(0, (float)($input['gst_amount'] ?? 0));
        $totalAmount       = max(0, (float)($input['total_amount'] ?? ($subtotal + $gstAmount)));
        $amountPaid        = max(0, (float)($input['amount_paid'] ?? $totalAmount));
        $balanceDue        = max(0, (float)($input['balance_due'] ?? ($totalAmount - $amountPaid)));
        $paymentStatus     = $input['payment_status'] ?? ($balanceDue <= 0.01 ? 'Paid' : ($amountPaid > 0 ? 'Partial' : 'Unpaid'));
        $notes             = trim($input['notes'] ?? '') ?: null;

        $poStmt = $db->prepare("
            INSERT INTO purchase_orders (
                purchase_no, supplier_id, supplier_name, supplier_phone, supplier_address,
                supplier_invoice_no, date,
                gst_enabled, gst_rate, subtotal, gst_amount, total_amount,
                amount_paid, balance_due, payment_status, notes, created_by, created_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, NOW()
            )
        ");

        $poStmt->execute([
            $purchaseNo, $supplierId, $supplierName, $supplierPhone ?: null, $supplierAddress ?: null,
            $supplierInvoiceNo, $date,
            $gstEnabled, $gstRate, $subtotal, $gstAmount, $totalAmount,
            $amountPaid, $balanceDue, $paymentStatus, $notes, $currentUser['id']
        ]);

        $purchaseId = (int)$db->lastInsertId();

        // Statements for items and product management
        $findProdById = $db->prepare("SELECT * FROM products WHERE id = ? LIMIT 1");
        $findProdBySku = $db->prepare("SELECT * FROM products WHERE sku = ? LIMIT 1");

        $itemStmt = $db->prepare("
            INSERT INTO purchase_order_items (
                purchase_id, product_id, sku, product_name, size, color, qty, cost_price, selling_price, discount, line_total
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        ");

        $stockStmt = $db->prepare("
            UPDATE products SET
                stock = stock + ?,
                purchase_price = ?,
                selling_price = ?,
                size = ?,
                color = ?,
                image_url = ?
            WHERE id = ?
        ");

        $catLookup = $db->prepare("SELECT id FROM categories WHERE name = ? LIMIT 1");
        $catInsert = $db->prepare("INSERT INTO categories (name, created_at) VALUES (?, NOW())");

        $subLookup = $db->prepare("SELECT id FROM subcategories WHERE category_id = ? AND name = ? LIMIT 1");
        $subInsert = $db->prepare("INSERT INTO subcategories (category_id, name, created_at) VALUES (?, ?, NOW())");

        $brandLookup = $db->prepare("SELECT id FROM brands WHERE name = ? LIMIT 1");
        $brandInsert = $db->prepare("INSERT INTO brands (name, created_at) VALUES (?, NOW())");

        $prodInsert = $db->prepare("
            INSERT INTO products (
                name, sku, category_id, subcategory_id, brand_id, size, color,
                purchase_price, selling_price, stock, low_stock_threshold, is_active, image_url, created_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, NOW()
            )
        ");

        foreach ($items as $item) {
            $prodId       = !empty($item['product_id']) ? (int)$item['product_id'] : (!empty($item['id']) ? (int)$item['id'] : null);
            $sku          = trim($item['sku'] ?? '');
            $prodName     = trim($item['name'] ?? ($item['product_name'] ?? ''));
            $size         = trim($item['size'] ?? '');
            $color        = trim($item['color'] ?? '');
            // Validate strictly that quantity is compulsory and must be a natural number (1, 2, 3...)
            $rawQty = trim((string)($item['qty'] ?? ($item['current_stock'] ?? '')));
            if ($rawQty === '' || !preg_match('/^[1-9]\d*$/', $rawQty)) {
                $db->rollBack();
                jsonResponse([
                    'success' => false,
                    'error'   => 'Quantity is required and must be a natural number (1, 2, 3...) for item "' . ($prodName ?: $sku ?: 'item') . '".'
                ], 400);
            }
            $qty = (int)$rawQty;

            $costPrice    = max(0, (float)($item['cost_price'] ?? ($item['purchase_price'] ?? 0)));
            $sellingPrice = max(0, (float)($item['selling_price'] ?? 0));
            $discount     = max(0, (float)($item['discount'] ?? 0));
            $lineTotal    = max(0, (float)($item['line_total'] ?? (($costPrice * $qty) - $discount)));
            $imageUrl     = trim($item['image_url'] ?? '');
            $threshold    = isset($item['low_stock_threshold']) && is_numeric($item['low_stock_threshold']) ? max(1, (int)$item['low_stock_threshold']) : 3;
            $statusVal    = trim($item['status'] ?? '');
            $isActive     = ($statusVal === 'Inactive' || (isset($item['is_active']) && $item['is_active'] == 0)) ? 0 : 1;

            $existingProd = null;
            if ($prodId) {
                $findProdById->execute([$prodId]);
                $existingProd = $findProdById->fetch();
                // If existing product has a different size, treat as a separate size variant
                if ($existingProd && !empty($size) && !empty($existingProd['size']) && strcasecmp(trim($existingProd['size']), trim($size)) !== 0) {
                    $existingProd = null;
                    $prodId = null;
                }
            }
            if (!$existingProd && !empty($sku)) {
                $findProdBySku->execute([$sku]);
                $existingProd = $findProdBySku->fetch();
                if ($existingProd) {
                    $prodId = (int)$existingProd['id'];
                }
            }

            if ($existingProd) {
                // Update stock and info of existing product
                $updCost  = ($costPrice > 0) ? $costPrice : (float)($existingProd['purchase_price'] ?? 0);
                $updSell  = ($sellingPrice > 0) ? $sellingPrice : (float)($existingProd['selling_price'] ?? 0);
                $updSize  = (!empty($existingProd['size']) && $existingProd['size'] !== '—') ? $existingProd['size'] : ($size ?: null);
                $updColor = (!empty($existingProd['color']) && $existingProd['color'] !== '—') ? $existingProd['color'] : ($color ?: null);
                $updImage = (!empty($existingProd['image_url'])) ? $existingProd['image_url'] : ($imageUrl ?: null);

                $stockStmt->execute([
                    $qty,
                    $updCost,
                    $updSell,
                    $updSize,
                    $updColor,
                    $updImage,
                    $prodId
                ]);
                if (empty($prodName)) $prodName = $existingProd['name'];
                if (empty($sku)) $sku = $existingProd['sku'];
                if (empty($size)) $size = $existingProd['size'] ?? '';
                if (empty($color)) $color = $existingProd['color'] ?? '';
                if ($sellingPrice <= 0) $sellingPrice = (float)($existingProd['selling_price'] ?? 0);
            } else {
                // Product does not exist: AUTO-CREATE IT in products catalog!
                if (empty($prodName)) {
                    $prodName = 'Product ' . ($sku ?: uniqid());
                }
                if (empty($sku)) {
                    $sku = 'SKU-' . strtoupper(substr(uniqid(), -6));
                }

                // Resolve Category
                $catId = !empty($item['category_id']) ? (int)$item['category_id'] : null;
                $catName = trim($item['category'] ?? ($item['category_name'] ?? ''));
                if (!$catId && !empty($catName)) {
                    $catLookup->execute([$catName]);
                    $catId = $catLookup->fetchColumn() ?: null;
                    if (!$catId) {
                        $catInsert->execute([$catName]);
                        $catId = (int)$db->lastInsertId();
                    }
                }

                // Resolve Subcategory
                $subcatId = !empty($item['subcategory_id']) ? (int)$item['subcategory_id'] : null;
                $subcatName = trim($item['subcategory'] ?? ($item['subcategory_name'] ?? ''));
                if (!$subcatId && !empty($subcatName) && $catId) {
                    $subLookup->execute([$catId, $subcatName]);
                    $subcatId = $subLookup->fetchColumn() ?: null;
                    if (!$subcatId) {
                        $subInsert->execute([$catId, $subcatName]);
                        $subcatId = (int)$db->lastInsertId();
                    }
                }

                // Resolve Brand
                $brandId = !empty($item['brand_id']) ? (int)$item['brand_id'] : null;
                $brandName = trim($item['brand'] ?? ($item['brand_name'] ?? ''));
                if (!$brandId && !empty($brandName)) {
                    $brandLookup->execute([$brandName]);
                    $brandId = $brandLookup->fetchColumn() ?: null;
                    if (!$brandId) {
                        $brandInsert->execute([$brandName]);
                        $brandId = (int)$db->lastInsertId();
                    }
                }

                $prodInsert->execute([
                    $prodName,
                    $sku,
                    $catId,
                    $subcatId,
                    $brandId,
                    $size ?: null,
                    $color ?: null,
                    $costPrice,
                    $sellingPrice,
                    $qty, // Stock initialized with purchased quantity
                    $threshold,
                    $isActive,
                    $imageUrl ?: null
                ]);
                $prodId = (int)$db->lastInsertId();
            }

            // Insert into purchase_order_items
            $itemStmt->execute([
                $purchaseId,
                $prodId,
                $sku,
                $prodName,
                $size ?: null,
                $color ?: null,
                $qty,
                $costPrice,
                $sellingPrice,
                $discount,
                $lineTotal
            ]);
        }

        logAudit($db, 'CREATE_PURCHASE', 'purchase_orders', $purchaseId, [
            'purchase_no'  => $purchaseNo,
            'total_amount' => $totalAmount,
            'items_count'  => count($items)
        ]);

        $db->commit();

        jsonResponse([
            'success'     => true,
            'message'     => 'Purchase order saved and inventory updated.',
            'id'          => $purchaseId,
            'purchase_no' => $purchaseNo
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
