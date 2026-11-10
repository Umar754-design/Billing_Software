<?php
// ========================================================
// Infinity Traders — Reports API (GET /api/reports/index.php?type=...)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();

$type     = trim($_GET['type'] ?? 'sales');
$period   = trim($_GET['period'] ?? 'monthly'); // weekly, monthly, yearly
$dateFrom = trim($_GET['date_from'] ?? '');
$dateTo   = trim($_GET['date_to'] ?? '');

// Helper date range filter
function buildDateCondition(string $column, string $dateFrom, string $dateTo): array {
    $where = [];
    $params = [];
    if (!empty($dateFrom)) {
        $where[] = "$column >= ?";
        $params[] = $dateFrom;
    }
    if (!empty($dateTo)) {
        $where[] = "$column <= ?";
        $params[] = $dateTo;
    }
    return ['sql' => !empty($where) ? implode(' AND ', $where) : '1=1', 'params' => $params];
}

switch ($type) {
    case 'sales':
    case 'sales-report':
        $dateCond = buildDateCondition('date', $dateFrom, $dateTo);
        $stmt = $db->prepare("
            SELECT
                COUNT(*) AS total_invoices,
                COALESCE(SUM(grand_total), 0) AS total_sales,
                COALESCE(SUM(taxable_amount), 0) AS total_taxable,
                COALESCE(SUM(cgst + sgst + igst), 0) AS total_gst,
                COALESCE(SUM(total_discount), 0) AS total_discount,
                COALESCE(SUM(CASE WHEN payment_status = 'Paid' THEN 1 ELSE 0 END), 0) AS paid_count
            FROM sales_invoices
            WHERE {$dateCond['sql']}
        ");
        $stmt->execute($dateCond['params']);
        $summary = $stmt->fetch();

        $totalInvoices = (int)$summary['total_invoices'];
        $totalSales    = (float)$summary['total_sales'];
        $paidCount     = (int)$summary['paid_count'];
        $avgValue      = $totalInvoices > 0 ? round($totalSales / $totalInvoices, 2) : 0;
        $collectionRate = $totalInvoices > 0 ? round(($paidCount / $totalInvoices) * 100) : 0;

        // Breakdown by period
        $labels = [];
        $salesData = [];

        if ($period === 'weekly') {
            for ($i = 6; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-$i days"));
                $labels[] = date('D', strtotime($d));
                $sStmt = $db->prepare("SELECT COALESCE(SUM(grand_total), 0) FROM sales_invoices WHERE date = ?");
                $sStmt->execute([$d]);
                $salesData[] = (float)$sStmt->fetchColumn();
            }
        } elseif ($period === 'yearly') {
            $curYear = (int)date('Y');
            for ($y = $curYear - 2; $y <= $curYear; $y++) {
                $labels[] = (string)$y;
                $sStmt = $db->prepare("SELECT COALESCE(SUM(grand_total), 0) FROM sales_invoices WHERE YEAR(date) = ?");
                $sStmt->execute([$y]);
                $salesData[] = (float)$sStmt->fetchColumn();
            }
        } else {
            // monthly (last 6 months)
            for ($i = 5; $i >= 0; $i--) {
                $ym = date('Y-m', strtotime("-$i months"));
                $labels[] = date('M', strtotime("-$i months"));
                $sStmt = $db->prepare("SELECT COALESCE(SUM(grand_total), 0) FROM sales_invoices WHERE DATE_FORMAT(date, '%Y-%m') = ?");
                $sStmt->execute([$ym]);
                $salesData[] = (float)$sStmt->fetchColumn();
            }
        }

        // Detailed invoice rows for tables / export
        $listStmt = $db->prepare("
            SELECT invoice_no, customer_name, date, payment_method, grand_total, payment_status
            FROM sales_invoices
            WHERE {$dateCond['sql']}
            ORDER BY date DESC, id DESC
            LIMIT 100
        ");
        $listStmt->execute($dateCond['params']);
        $invoices = $listStmt->fetchAll();

        jsonResponse([
            'success' => true,
            'data' => [
                'total_sales'      => $totalSales,
                'total_invoices'   => $totalInvoices,
                'avg_invoice_value'=> $avgValue,
                'paid_count'       => $paidCount,
                'collection_rate'  => $collectionRate,
                'chart' => [
                    'labels' => $labels,
                    'sales'  => $salesData
                ],
                'invoices' => $invoices
            ]
        ]);
        break;

    case 'purchase':
    case 'purchase-report':
        $dateCond = buildDateCondition('date', $dateFrom, $dateTo);
        $stmt = $db->prepare("
            SELECT
                COUNT(*) AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_purchases,
                COALESCE(SUM(balance_due), 0) AS outstanding_balance
            FROM purchase_orders
            WHERE {$dateCond['sql']}
        ");
        $stmt->execute($dateCond['params']);
        $summary = $stmt->fetch();

        // Chart breakdown
        $labels = [];
        $poData = [];

        if ($period === 'weekly') {
            for ($i = 6; $i >= 0; $i--) {
                $d = date('Y-m-d', strtotime("-$i days"));
                $labels[] = date('D', strtotime($d));
                $pStmt = $db->prepare("SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE date = ?");
                $pStmt->execute([$d]);
                $poData[] = (float)$pStmt->fetchColumn();
            }
        } elseif ($period === 'yearly') {
            $curYear = (int)date('Y');
            for ($y = $curYear - 2; $y <= $curYear; $y++) {
                $labels[] = (string)$y;
                $pStmt = $db->prepare("SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE YEAR(date) = ?");
                $pStmt->execute([$y]);
                $poData[] = (float)$pStmt->fetchColumn();
            }
        } else {
            for ($i = 5; $i >= 0; $i--) {
                $ym = date('Y-m', strtotime("-$i months"));
                $labels[] = date('M', strtotime("-$i months"));
                $pStmt = $db->prepare("SELECT COALESCE(SUM(total_amount), 0) FROM purchase_orders WHERE DATE_FORMAT(date, '%Y-%m') = ?");
                $pStmt->execute([$ym]);
                $poData[] = (float)$pStmt->fetchColumn();
            }
        }

        $listStmt = $db->prepare("
            SELECT po.purchase_no, sup.name AS supplier_name, po.date, po.total_amount, po.payment_status
            FROM purchase_orders po
            LEFT JOIN suppliers sup ON po.supplier_id = sup.id
            WHERE {$dateCond['sql']}
            ORDER BY po.date DESC, po.id DESC
            LIMIT 100
        ");
        $listStmt->execute($dateCond['params']);
        $purchases = $listStmt->fetchAll();

        jsonResponse([
            'success' => true,
            'data' => [
                'total_purchases'     => (float)$summary['total_purchases'],
                'total_orders'        => (int)$summary['total_orders'],
                'outstanding_balance' => (float)$summary['outstanding_balance'],
                'chart' => [
                    'labels'    => $labels,
                    'purchases' => $poData
                ],
                'purchases' => $purchases
            ]
        ]);
        break;

    case 'profit':
    case 'gross-profit':
        $dateCond = buildDateCondition('s.date', $dateFrom, $dateTo);
        $stmt = $db->prepare("
            SELECT
                COALESCE(p.id, 0) AS product_id,
                sii.product_name,
                sii.sku,
                SUM(sii.qty) AS total_qty,
                COALESCE(p.purchase_price, 0) AS cost_price,
                AVG(sii.unit_price) AS avg_selling_price,
                SUM(sii.line_total) AS total_revenue,
                SUM(sii.qty * COALESCE(p.purchase_price, 0)) AS total_cost
            FROM sales_invoice_items sii
            JOIN sales_invoices s ON sii.invoice_id = s.id
            LEFT JOIN products p ON sii.product_id = p.id
            WHERE {$dateCond['sql']}
            GROUP BY p.id, sii.product_name, sii.sku, p.purchase_price
            ORDER BY total_revenue DESC
        ");
        $stmt->execute($dateCond['params']);
        $rows = $stmt->fetchAll();

        $overallRevenue = 0.0;
        $overallCost = 0.0;
        $overallProfit = 0.0;

        foreach ($rows as &$r) {
            $r['total_qty']         = (int)$r['total_qty'];
            $r['cost_price']        = (float)$r['cost_price'];
            $r['avg_selling_price'] = (float)$r['avg_selling_price'];
            $r['total_revenue']     = (float)$r['total_revenue'];
            $r['total_cost']        = (float)$r['total_cost'];
            $r['gross_profit']      = $r['total_revenue'] - $r['total_cost'];
            $r['margin_pct']        = $r['total_revenue'] > 0 ? round(($r['gross_profit'] / $r['total_revenue']) * 100, 1) : 0;

            $overallRevenue += $r['total_revenue'];
            $overallCost    += $r['total_cost'];
            $overallProfit  += $r['gross_profit'];
        }

        $overallMargin = $overallRevenue > 0 ? round(($overallProfit / $overallRevenue) * 100, 1) : 0;

        jsonResponse([
            'success' => true,
            'data' => [
                'total_revenue'  => $overallRevenue,
                'total_cost'     => $overallCost,
                'total_profit'   => $overallProfit,
                'overall_margin' => $overallMargin,
                'items'          => $rows
            ]
        ]);
        break;

    case 'category':
    case 'category-sales':
        $stmt = $db->query("
            SELECT
                c.id,
                c.name,
                COUNT(DISTINCT p.id) AS product_count,
                COALESCE(SUM(sii.qty), 0) AS total_qty,
                COALESCE(SUM(sii.line_total), 0) AS total_revenue
            FROM categories c
            LEFT JOIN products p ON c.id = p.category_id
            LEFT JOIN sales_invoice_items sii ON p.id = sii.product_id
            GROUP BY c.id, c.name
            ORDER BY total_revenue DESC
        ");
        $categories = $stmt->fetchAll();

        $grandTotalRevenue = array_sum(array_column($categories, 'total_revenue'));
        foreach ($categories as &$c) {
            $c['product_count'] = (int)$c['product_count'];
            $c['total_qty']     = (int)$c['total_qty'];
            $c['total_revenue'] = (float)$c['total_revenue'];
            $c['share_pct']     = $grandTotalRevenue > 0 ? round(($c['total_revenue'] / $grandTotalRevenue) * 100, 1) : 0;
        }

        jsonResponse([
            'success' => true,
            'data' => [
                'total_revenue' => $grandTotalRevenue,
                'categories'    => $categories
            ]
        ]);
        break;

    case 'brand':
    case 'brand-sales':
        $stmt = $db->query("
            SELECT
                b.id,
                b.name,
                COUNT(DISTINCT p.id) AS product_count,
                COALESCE(SUM(sii.qty), 0) AS total_qty,
                COALESCE(SUM(sii.line_total), 0) AS total_revenue
            FROM brands b
            LEFT JOIN products p ON b.id = p.brand_id
            LEFT JOIN sales_invoice_items sii ON p.id = sii.product_id
            GROUP BY b.id, b.name
            ORDER BY total_revenue DESC
        ");
        $brands = $stmt->fetchAll();

        $grandTotalRevenue = array_sum(array_column($brands, 'total_revenue'));
        foreach ($brands as &$b) {
            $b['product_count'] = (int)$b['product_count'];
            $b['total_qty']     = (int)$b['total_qty'];
            $b['total_revenue'] = (float)$b['total_revenue'];
            $b['share_pct']     = $grandTotalRevenue > 0 ? round(($b['total_revenue'] / $grandTotalRevenue) * 100, 1) : 0;
        }

        jsonResponse([
            'success' => true,
            'data' => [
                'total_revenue' => $grandTotalRevenue,
                'brands'        => $brands
            ]
        ]);
        break;

    case 'stock':
    case 'stock-valuation':
        $stmt = $db->query("
            SELECT
                p.id,
                p.name,
                p.sku,
                c.name AS category_name,
                b.name AS brand_name,
                p.stock,
                p.purchase_price,
                p.selling_price,
                (p.stock * p.purchase_price) AS cost_valuation,
                (p.stock * p.selling_price)  AS retail_valuation
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.is_active = 1
            ORDER BY cost_valuation DESC
        ");
        $products = $stmt->fetchAll();

        $totalUnits = 0;
        $totalCostValuation = 0.0;
        $totalRetailValuation = 0.0;

        foreach ($products as &$p) {
            $p['id']               = (int)$p['id'];
            $p['stock']            = (int)$p['stock'];
            $p['purchase_price']   = (float)$p['purchase_price'];
            $p['selling_price']    = (float)$p['selling_price'];
            $p['cost_valuation']   = (float)$p['cost_valuation'];
            $p['retail_valuation'] = (float)$p['retail_valuation'];
            $p['potential_profit'] = $p['retail_valuation'] - $p['cost_valuation'];

            $totalUnits            += $p['stock'];
            $totalCostValuation    += $p['cost_valuation'];
            $totalRetailValuation  += $p['retail_valuation'];
        }

        jsonResponse([
            'success' => true,
            'data' => [
                'total_units'            => $totalUnits,
                'total_cost_valuation'   => $totalCostValuation,
                'total_retail_valuation' => $totalRetailValuation,
                'potential_profit'       => $totalRetailValuation - $totalCostValuation,
                'products'               => $products
            ]
        ]);
        break;

    case 'lowstock':
    case 'low-stock':
        $stmt = $db->query("
            SELECT
                p.id,
                p.name,
                p.sku,
                c.name AS category_name,
                b.name AS brand_name,
                p.stock,
                p.low_stock_threshold,
                CASE WHEN p.stock <= 0 THEN 'Out of Stock' ELSE 'Low Stock' END AS stock_status
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN brands b ON p.brand_id = b.id
            WHERE p.is_active = 1 AND p.stock <= p.low_stock_threshold
            ORDER BY p.stock ASC
        ");
        $lowProducts = $stmt->fetchAll();

        foreach ($lowProducts as &$lp) {
            $lp['id']                  = (int)$lp['id'];
            $lp['stock']               = (int)$lp['stock'];
            $lp['low_stock_threshold'] = (int)$lp['low_stock_threshold'];
        }

        jsonResponse([
            'success' => true,
            'data'    => $lowProducts
        ]);
        break;

    case 'payment':
    case 'payment-summary':
        $dateCond = buildDateCondition('date', $dateFrom, $dateTo);
        $stmt = $db->prepare("
            SELECT
                payment_method,
                COUNT(*) AS count,
                COALESCE(SUM(grand_total), 0) AS total_collected
            FROM sales_invoices
            WHERE {$dateCond['sql']}
            GROUP BY payment_method
            ORDER BY total_collected DESC
        ");
        $stmt->execute($dateCond['params']);
        $methods = $stmt->fetchAll();

        $totalCollected = array_sum(array_column($methods, 'total_collected'));
        foreach ($methods as &$m) {
            $m['count']           = (int)$m['count'];
            $m['total_collected'] = (float)$m['total_collected'];
            $m['share_pct']       = $totalCollected > 0 ? round(($m['total_collected'] / $totalCollected) * 100, 1) : 0;
        }

        jsonResponse([
            'success' => true,
            'data' => [
                'total_collected' => $totalCollected,
                'methods'         => $methods
            ]
        ]);
        break;

    default:
        jsonResponse(['success' => false, 'error' => "Unknown report type '$type'."], 400);
}
