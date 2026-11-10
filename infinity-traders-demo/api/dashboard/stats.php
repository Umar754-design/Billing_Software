<?php
// ========================================================
// Infinity Traders — Dashboard Stats API (GET /api/dashboard/stats.php)
// ========================================================

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/auth.php';

$currentUser = requireAuth();
$db = getDbConnection();

$today = date('Y-m-d');
$weekAgo = date('Y-m-d', strtotime('-6 days'));
$monthStart = date('Y-m-01');

// 1. Today's Sales Summary & Invoices
$todaySalesSummaryStmt = $db->prepare("
    SELECT 
        COALESCE(SUM(grand_total), 0) AS total_sales,
        COUNT(id) AS invoices_count,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(balance_due), 0) AS total_due,
        COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN payment_method NOT IN ('Cash','UPI') THEN grand_total ELSE 0 END), 0) AS other_sales
    FROM sales_invoices
    WHERE date = ?
");
$todaySalesSummaryStmt->execute([$today]);
$todaySalesSummary = $todaySalesSummaryStmt->fetch() ?: [];
$todaySales = (float)($todaySalesSummary['total_sales'] ?? 0);

$todaySalesListStmt = $db->prepare("
    SELECT 
        s.id, s.invoice_no, s.customer_id, s.customer_name, s.customer_phone,
        s.date, s.payment_method, s.payment_status, s.grand_total, s.amount_paid,
        s.balance_due, s.created_at,
        COUNT(sii.id) AS items_count
    FROM sales_invoices s
    LEFT JOIN sales_invoice_items sii ON s.id = sii.invoice_id
    WHERE s.date = ?
    GROUP BY s.id
    ORDER BY s.id DESC
");
$todaySalesListStmt->execute([$today]);
$todaySalesList = $todaySalesListStmt->fetchAll();
foreach ($todaySalesList as &$tsl) {
    $tsl['id'] = (int)$tsl['id'];
    $tsl['grand_total'] = (float)$tsl['grand_total'];
    $tsl['amount_paid'] = (float)$tsl['amount_paid'];
    $tsl['balance_due'] = (float)$tsl['balance_due'];
    $tsl['items_count'] = (int)$tsl['items_count'];
    $tsl['time'] = date('h:i A', strtotime($tsl['created_at']));
}
unset($tsl);

// 1b. Today's Customers
$todayCustomers = [];
try {
    $todayCustStmt = $db->prepare("
        SELECT 
            s.customer_id,
            COALESCE(NULLIF(TRIM(s.customer_name), ''), 'Walk-in Customer') AS name,
            COALESCE(NULLIF(TRIM(s.customer_phone), ''), c.phone, '') AS phone,
            COALESCE(NULLIF(TRIM(s.customer_address), ''), c.address, '') AS address,
            COALESCE(c.email, '') AS email,
            c.gstin,
            COUNT(s.id) AS invoices_count,
            SUM(s.grand_total) AS total_spent_today,
            SUM(s.amount_paid) AS total_paid_today,
            SUM(s.balance_due) AS total_balance_today,
            MAX(s.created_at) AS last_purchase_time,
            GROUP_CONCAT(s.invoice_no ORDER BY s.id DESC SEPARATOR ', ') AS invoice_numbers
        FROM sales_invoices s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.date = ?
        GROUP BY 
            s.customer_id, 
            COALESCE(NULLIF(TRIM(s.customer_name), ''), 'Walk-in Customer'),
            COALESCE(NULLIF(TRIM(s.customer_phone), ''), c.phone, ''),
            COALESCE(NULLIF(TRIM(s.customer_address), ''), c.address, ''),
            c.email,
            c.gstin
        ORDER BY total_spent_today DESC, MAX(s.id) DESC
    ");
    $todayCustStmt->execute([$today]);
    $todayCustomers = $todayCustStmt->fetchAll();
} catch (\Throwable $e) {
    try {
        $db->exec("ALTER TABLE `sales_invoices` ADD COLUMN `customer_address` TEXT NULL AFTER `customer_phone`");
        $todayCustStmt->execute([$today]);
        $todayCustomers = $todayCustStmt->fetchAll();
    } catch (\Throwable $ex) {
        $fallbackStmt = $db->prepare("
            SELECT 
                s.customer_id,
                COALESCE(NULLIF(TRIM(s.customer_name), ''), 'Walk-in Customer') AS name,
                COALESCE(NULLIF(TRIM(s.customer_phone), ''), c.phone, '') AS phone,
                COALESCE(c.address, '') AS address,
                COALESCE(c.email, '') AS email,
                c.gstin,
                COUNT(s.id) AS invoices_count,
                SUM(s.grand_total) AS total_spent_today,
                SUM(s.amount_paid) AS total_paid_today,
                SUM(s.balance_due) AS total_balance_today,
                MAX(s.created_at) AS last_purchase_time,
                GROUP_CONCAT(s.invoice_no ORDER BY s.id DESC SEPARATOR ', ') AS invoice_numbers
            FROM sales_invoices s
            LEFT JOIN customers c ON s.customer_id = c.id
            WHERE s.date = ?
            GROUP BY 
                s.customer_id, 
                COALESCE(NULLIF(TRIM(s.customer_name), ''), 'Walk-in Customer'),
                COALESCE(NULLIF(TRIM(s.customer_phone), ''), c.phone, ''),
                c.email,
                c.gstin
            ORDER BY total_spent_today DESC, MAX(s.id) DESC
        ");
        $fallbackStmt->execute([$today]);
        $todayCustomers = $fallbackStmt->fetchAll();
    }
}

foreach ($todayCustomers as &$tc) {
    $tc['customer_id'] = $tc['customer_id'] ? (int)$tc['customer_id'] : null;
    $tc['id'] = $tc['customer_id'];
    $tc['invoices_count'] = (int)$tc['invoices_count'];
    $tc['total_spent_today'] = (float)$tc['total_spent_today'];
    $tc['total_paid_today'] = (float)$tc['total_paid_today'];
    $tc['total_balance_today'] = (float)$tc['total_balance_today'];

    // Invoices today
    if ($tc['customer_id']) {
        $invStmt = $db->prepare("
            SELECT id, invoice_no, date, grand_total, amount_paid, balance_due, payment_method, payment_status, created_at
            FROM sales_invoices
            WHERE date = ? AND (customer_id = ? OR customer_name = ?)
            ORDER BY id DESC
        ");
        $invStmt->execute([$today, $tc['customer_id'], $tc['name']]);
    } else {
        $invStmt = $db->prepare("
            SELECT id, invoice_no, date, grand_total, amount_paid, balance_due, payment_method, payment_status, created_at
            FROM sales_invoices
            WHERE date = ? AND customer_id IS NULL AND customer_name = ?
            ORDER BY id DESC
        ");
        $invStmt->execute([$today, $tc['name']]);
    }
    $invoices = $invStmt->fetchAll();
    foreach ($invoices as &$inv) {
        $inv['id'] = (int)$inv['id'];
        $inv['grand_total'] = (float)$inv['grand_total'];
        $inv['amount_paid'] = (float)$inv['amount_paid'];
        $inv['balance_due'] = (float)$inv['balance_due'];
    }
    unset($inv);
    $tc['invoices'] = $invoices;

    // Lifetime summary
    if ($tc['customer_id']) {
        $lifeStmt = $db->prepare("
            SELECT COUNT(id) AS total_orders, COALESCE(SUM(grand_total), 0) AS lifetime_spent, COALESCE(SUM(balance_due), 0) AS outstanding
            FROM sales_invoices
            WHERE customer_id = ? OR customer_name = ?
        ");
        $lifeStmt->execute([$tc['customer_id'], $tc['name']]);
        $life = $lifeStmt->fetch();
        $tc['total_orders'] = (int)($life['total_orders'] ?? $tc['invoices_count']);
        $tc['lifetime_spent'] = (float)($life['lifetime_spent'] ?? $tc['total_spent_today']);
        $tc['outstanding'] = (float)($life['outstanding'] ?? $tc['total_balance_today']);
    } else {
        $tc['total_orders'] = $tc['invoices_count'];
        $tc['lifetime_spent'] = $tc['total_spent_today'];
        $tc['outstanding'] = $tc['total_balance_today'];
    }
}
unset($tc);

$todayCustomersCount = count($todayCustomers);

// 2. This Week's Sales & Invoices List
$weekSalesSummaryStmt = $db->prepare("
    SELECT 
        COALESCE(SUM(grand_total), 0) AS total_sales,
        COUNT(id) AS invoices_count,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(balance_due), 0) AS total_due,
        COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN grand_total ELSE 0 END), 0) AS upi_sales,
        COALESCE(SUM(CASE WHEN payment_method NOT IN ('Cash','UPI') THEN grand_total ELSE 0 END), 0) AS other_sales
    FROM sales_invoices
    WHERE date >= ? AND date <= ?
");
$weekSalesSummaryStmt->execute([$weekAgo, $today]);
$weekSalesSummary = $weekSalesSummaryStmt->fetch() ?: [];
$thisWeekSales = (float)($weekSalesSummary['total_sales'] ?? 0);

$weekSalesListStmt = $db->prepare("
    SELECT 
        s.id, s.invoice_no, s.customer_id, s.customer_name, s.customer_phone,
        s.date, s.payment_method, s.payment_status, s.grand_total, s.amount_paid,
        s.balance_due, s.created_at,
        COUNT(sii.id) AS items_count
    FROM sales_invoices s
    LEFT JOIN sales_invoice_items sii ON s.id = sii.invoice_id
    WHERE s.date >= ? AND s.date <= ?
    GROUP BY s.id
    ORDER BY s.date DESC, s.id DESC
");
$weekSalesListStmt->execute([$weekAgo, $today]);
$thisWeekSalesList = $weekSalesListStmt->fetchAll();
foreach ($thisWeekSalesList as &$wsl) {
    $wsl['id'] = (int)$wsl['id'];
    $wsl['grand_total'] = (float)$wsl['grand_total'];
    $wsl['amount_paid'] = (float)$wsl['amount_paid'];
    $wsl['balance_due'] = (float)$wsl['balance_due'];
    $wsl['items_count'] = (int)$wsl['items_count'];
    $wsl['time'] = date('h:i A', strtotime($wsl['created_at']));
}
unset($wsl);

// 2b. This Week's Purchases & PO List
$weekPoSummaryStmt = $db->prepare("
    SELECT 
        COALESCE(SUM(total_amount), 0) AS total_purchases,
        COUNT(id) AS po_count,
        COALESCE(SUM(amount_paid), 0) AS total_paid,
        COALESCE(SUM(balance_due), 0) AS total_due,
        COUNT(DISTINCT supplier_id) AS suppliers_count
    FROM purchase_orders
    WHERE date >= ? AND date <= ?
");
$weekPoSummaryStmt->execute([$weekAgo, $today]);
$weekPoSummary = $weekPoSummaryStmt->fetch() ?: [];
$thisWeekPurchases = (float)($weekPoSummary['total_purchases'] ?? 0);

$weekPoListStmt = $db->prepare("
    SELECT 
        po.id, po.purchase_no, po.supplier_id, 
        COALESCE(NULLIF(TRIM(po.supplier_name), ''), sup.name, 'Supplier') AS supplier_name,
        po.supplier_phone, po.supplier_address,
        po.date, po.payment_status, po.total_amount, po.amount_paid, po.balance_due,
        po.created_at,
        COUNT(poi.id) AS items_count
    FROM purchase_orders po
    LEFT JOIN suppliers sup ON po.supplier_id = sup.id
    LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_id
    WHERE po.date >= ? AND po.date <= ?
    GROUP BY po.id
    ORDER BY po.date DESC, po.id DESC
");
$weekPoListStmt->execute([$weekAgo, $today]);
$thisWeekPurchasesList = $weekPoListStmt->fetchAll();
foreach ($thisWeekPurchasesList as &$wpl) {
    $wpl['id'] = (int)$wpl['id'];
    $wpl['total_amount'] = (float)$wpl['total_amount'];
    $wpl['amount_paid'] = (float)$wpl['amount_paid'];
    $wpl['balance_due'] = (float)$wpl['balance_due'];
    $wpl['items_count'] = (int)$wpl['items_count'];
    $wpl['supplier'] = $wpl['supplier_name'] ?? 'Supplier';
}
unset($wpl);

// 2c. Returns (Total Returns, Today & Week Returns, Returns List)
$retAllStmt = $db->query("
    SELECT
        COUNT(DISTINCT r.id) AS total_count,
        COALESCE(SUM(r.total_refund_amount), 0) AS total_amount,
        COALESCE(SUM(ri.return_qty), 0) AS total_items
    FROM sales_returns r
    LEFT JOIN sales_return_items ri ON r.id = ri.return_id
");
$retAll = $retAllStmt->fetch() ?: [];
$totalReturnsAmount = (float)($retAll['total_amount'] ?? 0);
$totalReturnsCount  = (int)($retAll['total_count'] ?? 0);
$totalReturnsItems  = (int)($retAll['total_items'] ?? 0);

$retTodayStmt = $db->prepare("
    SELECT
        COUNT(DISTINCT r.id) AS today_count,
        COALESCE(SUM(r.total_refund_amount), 0) AS today_amount,
        COALESCE(SUM(ri.return_qty), 0) AS today_items
    FROM sales_returns r
    LEFT JOIN sales_return_items ri ON r.id = ri.return_id
    WHERE r.date = ?
");
$retTodayStmt->execute([$today]);
$retToday = $retTodayStmt->fetch() ?: [];
$todayReturnsAmount = (float)($retToday['today_amount'] ?? 0);
$todayReturnsCount  = (int)($retToday['today_count'] ?? 0);
$todayReturnsItems  = (int)($retToday['today_items'] ?? 0);

$retWeekStmt = $db->prepare("
    SELECT
        COUNT(DISTINCT r.id) AS week_count,
        COALESCE(SUM(r.total_refund_amount), 0) AS week_amount,
        COALESCE(SUM(ri.return_qty), 0) AS week_items
    FROM sales_returns r
    LEFT JOIN sales_return_items ri ON r.id = ri.return_id
    WHERE r.date >= ? AND r.date <= ?
");
$retWeekStmt->execute([$weekAgo, $today]);
$retWeek = $retWeekStmt->fetch() ?: [];
$thisWeekReturnsAmount = (float)($retWeek['week_amount'] ?? 0);
$thisWeekReturnsCount  = (int)($retWeek['week_count'] ?? 0);
$thisWeekReturnsItems  = (int)($retWeek['week_items'] ?? 0);

$retListStmt = $db->query("
    SELECT 
        r.id, r.return_no, r.invoice_id, r.invoice_no, r.customer_id,
        COALESCE(NULLIF(TRIM(r.customer_name), ''), 'Walk-in Customer') AS customer_name,
        r.customer_phone, r.date, r.total_refund_amount,
        r.refund_method, r.refund_status, r.reason, r.notes, r.created_at,
        COUNT(ri.id) AS items_count,
        COALESCE(SUM(ri.return_qty), 0) AS return_qty
    FROM sales_returns r
    LEFT JOIN sales_return_items ri ON r.id = ri.return_id
    GROUP BY r.id
    ORDER BY r.date DESC, r.id DESC
    LIMIT 50
");
$returnsList = $retListStmt->fetchAll();
foreach ($returnsList as &$rl) {
    $rl['id'] = (int)$rl['id'];
    $rl['total_refund_amount'] = (float)$rl['total_refund_amount'];
    $rl['items_count'] = (int)$rl['items_count'];
    $rl['return_qty'] = (int)$rl['return_qty'];
}
unset($rl);

// Profit Calculations
$netRevenue = $thisWeekSales - $thisWeekReturnsAmount;
$estimatedProfit = $netRevenue - $thisWeekPurchases;
$profitMarginPct = ($thisWeekSales > 0) ? round(($estimatedProfit / $thisWeekSales) * 100, 1) : 0;

// 3. Product & Stock Counts & Valuations
$prodStmt = $db->query("
    SELECT
        COUNT(*) AS total_products,
        COALESCE(SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END), 0) AS in_stock_count,
        COALESCE(SUM(CASE WHEN stock > 0 AND stock <= low_stock_threshold THEN 1 ELSE 0 END), 0) AS low_stock_count,
        COALESCE(SUM(CASE WHEN stock <= 0 THEN 1 ELSE 0 END), 0) AS out_of_stock_count,
        COALESCE(SUM(stock), 0) AS total_stock_units,
        COALESCE(SUM(stock * purchase_price), 0) AS inventory_value_cost,
        COALESCE(SUM(stock * selling_price), 0) AS inventory_value_retail
    FROM products
    WHERE is_active = 1
");
$stockStats = $prodStmt->fetch() ?: [];

$totalProducts     = (int)($stockStats['total_products'] ?? 0);
$inStockCount      = (int)($stockStats['in_stock_count'] ?? 0);
$lowStockCount     = (int)($stockStats['low_stock_count'] ?? 0);
$outOfStockCount   = (int)($stockStats['out_of_stock_count'] ?? 0);
$totalStockUnits   = (int)($stockStats['total_stock_units'] ?? 0);
$inventoryCostVal  = (float)($stockStats['inventory_value_cost'] ?? 0);
$inventoryRetailVal= (float)($stockStats['inventory_value_retail'] ?? 0);

// Category breakdown with inventory units
$catDistStmt = $db->query("
    SELECT c.id, c.name, COUNT(p.id) AS product_count, COALESCE(SUM(p.stock), 0) AS stock_units
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id AND p.is_active = 1
    GROUP BY c.id, c.name
    ORDER BY product_count DESC
");
$categoryDistribution = $catDistStmt->fetchAll();

// Product List (for Total Products modal)
$allProdStmt = $db->query("
    SELECT p.id, p.name, p.sku, COALESCE(c.name, 'Uncategorized') AS category_name,
           p.purchase_price, p.selling_price, p.stock, p.low_stock_threshold
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
    ORDER BY p.name ASC
    LIMIT 100
");
$productsList = $allProdStmt->fetchAll();
foreach ($productsList as &$pl) {
    $pl['id'] = (int)$pl['id'];
    $pl['purchase_price'] = (float)$pl['purchase_price'];
    $pl['selling_price'] = (float)$pl['selling_price'];
    $pl['stock'] = (int)$pl['stock'];
    $pl['low_stock_threshold'] = (int)$pl['low_stock_threshold'];
}
unset($pl);

// All Low & Out of stock products (for Low Stock modal)
$allLowStockStmt = $db->query("
    SELECT p.id, p.name, p.sku, COALESCE(c.name, 'Uncategorized') AS category_name,
           p.stock, p.low_stock_threshold, p.purchase_price, p.selling_price,
           GREATEST(0, (p.low_stock_threshold - p.stock)) AS deficit
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1 AND p.stock <= p.low_stock_threshold
    ORDER BY p.stock ASC, p.name ASC
");
$allLowStockProducts = $allLowStockStmt->fetchAll();
foreach ($allLowStockProducts as &$alsp) {
    $alsp['id'] = (int)$alsp['id'];
    $alsp['stock'] = (int)$alsp['stock'];
    $alsp['low_stock_threshold'] = (int)$alsp['low_stock_threshold'];
    $alsp['deficit'] = (int)$alsp['deficit'];
    $alsp['purchase_price'] = (float)$alsp['purchase_price'];
    $alsp['selling_price'] = (float)$alsp['selling_price'];
}
unset($alsp);

// 4. Chart Data — Weekly (last 7 days)
$weeklyLabels = [];
$weeklySalesMap = [];
$weeklyPurchasesMap = [];

for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-$i days"));
    $label = date('D', strtotime($d)); // Mon, Tue...
    $weeklyLabels[] = $label;
    $weeklySalesMap[$d] = 0;
    $weeklyPurchasesMap[$d] = 0;
}

$wSalesQuery = $db->prepare("SELECT date, SUM(grand_total) AS total FROM sales_invoices WHERE date >= ? GROUP BY date");
$wSalesQuery->execute([$weekAgo]);
while ($r = $wSalesQuery->fetch()) {
    if (isset($weeklySalesMap[$r['date']])) {
        $weeklySalesMap[$r['date']] = (float)$r['total'];
    }
}

$wPoQuery = $db->prepare("SELECT date, SUM(total_amount) AS total FROM purchase_orders WHERE date >= ? GROUP BY date");
$wPoQuery->execute([$weekAgo]);
while ($r = $wPoQuery->fetch()) {
    if (isset($weeklyPurchasesMap[$r['date']])) {
        $weeklyPurchasesMap[$r['date']] = (float)$r['total'];
    }
}

// 5. Chart Data — Monthly (last 6 months)
$monthlyLabels = [];
$monthlySalesMap = [];
$monthlyPurchasesMap = [];

for ($i = 5; $i >= 0; $i--) {
    $ym = date('Y-m', strtotime("-$i months"));
    $mName = date('M', strtotime("-$i months"));
    $monthlyLabels[] = $mName;
    $monthlySalesMap[$ym] = 0;
    $monthlyPurchasesMap[$ym] = 0;
}

$sixMonthsAgo = date('Y-m-01', strtotime('-5 months'));
$mSalesQuery = $db->prepare("SELECT DATE_FORMAT(date, '%Y-%m') AS ym, SUM(grand_total) AS total FROM sales_invoices WHERE date >= ? GROUP BY ym");
$mSalesQuery->execute([$sixMonthsAgo]);
while ($r = $mSalesQuery->fetch()) {
    if (isset($monthlySalesMap[$r['ym']])) {
        $monthlySalesMap[$r['ym']] = (float)$r['total'];
    }
}

$mPoQuery = $db->prepare("SELECT DATE_FORMAT(date, '%Y-%m') AS ym, SUM(total_amount) AS total FROM purchase_orders WHERE date >= ? GROUP BY ym");
$mPoQuery->execute([$sixMonthsAgo]);
while ($r = $mPoQuery->fetch()) {
    if (isset($monthlyPurchasesMap[$r['ym']])) {
        $monthlyPurchasesMap[$r['ym']] = (float)$r['total'];
    }
}

// 6. Chart Data — Yearly (last 3 years)
$yearlyLabels = [];
$yearlySalesMap = [];
$yearlyPurchasesMap = [];
$currentYear = (int)date('Y');

for ($y = $currentYear - 2; $y <= $currentYear; $y++) {
    $yearlyLabels[] = (string)$y;
    $yearlySalesMap[$y] = 0;
    $yearlyPurchasesMap[$y] = 0;
}

$ySalesQuery = $db->query("SELECT YEAR(date) AS yr, SUM(grand_total) AS total FROM sales_invoices GROUP BY yr");
while ($r = $ySalesQuery->fetch()) {
    $yr = (int)$r['yr'];
    if (isset($yearlySalesMap[$yr])) {
        $yearlySalesMap[$yr] = (float)$r['total'];
    }
}

$yPoQuery = $db->query("SELECT YEAR(date) AS yr, SUM(total_amount) AS total FROM purchase_orders GROUP BY yr");
while ($r = $yPoQuery->fetch()) {
    $yr = (int)$r['yr'];
    if (isset($yearlyPurchasesMap[$yr])) {
        $yearlyPurchasesMap[$yr] = (float)$r['total'];
    }
}

// 7. Sales by Category
$catStmt = $db->query("
    SELECT
        c.name AS category_name,
        COALESCE(SUM(sii.line_total), 0) AS total_sales
    FROM categories c
    LEFT JOIN products p ON c.id = p.category_id
    LEFT JOIN sales_invoice_items sii ON p.id = sii.product_id
    GROUP BY c.id, c.name
    ORDER BY total_sales DESC
");
$catRows = $catStmt->fetchAll();
$categoryBreakdown = [
    'labels' => array_column($catRows, 'category_name'),
    'data'   => array_map('floatval', array_column($catRows, 'total_sales'))
];

// 8. Recent 5 Sales
$recSalesStmt = $db->query("
    SELECT id, invoice_no, customer_name, customer_id, date, payment_method, payment_status, grand_total, balance_due
    FROM sales_invoices
    ORDER BY date DESC, id DESC
    LIMIT 5
");
$recentSales = $recSalesStmt->fetchAll();
foreach ($recentSales as &$rs) {
    $rs['id'] = (int)$rs['id'];
    $rs['grand_total'] = (float)$rs['grand_total'];
    $rs['balance_due'] = (float)$rs['balance_due'];
    $rs['invoiceNo'] = $rs['invoice_no'];
    $rs['customerName'] = $rs['customer_name'];
    $rs['customerId'] = $rs['customer_id'];
    $rs['grandTotal'] = $rs['grand_total'];
    $rs['paymentMethod'] = $rs['payment_method'];
}

// 9. Recent 5 Purchases
$recPoStmt = $db->query("
    SELECT po.id, po.purchase_no, 
           COALESCE(NULLIF(TRIM(po.supplier_name), ''), sup.name, 'Supplier') AS supplier_name,
           po.supplier_phone, po.supplier_address,
           po.date, po.payment_status, po.total_amount
    FROM purchase_orders po
    LEFT JOIN suppliers sup ON po.supplier_id = sup.id
    ORDER BY po.date DESC, po.id DESC
    LIMIT 5
");
$recentPurchases = $recPoStmt->fetchAll();
foreach ($recentPurchases as &$rp) {
    $rp['id'] = (int)$rp['id'];
    $rp['total_amount'] = (float)$rp['total_amount'];
    $rp['purchaseNo'] = $rp['purchase_no'];
    $rp['supplier'] = $rp['supplier_name'] ?? 'Supplier';
    $rp['totalAmount'] = $rp['total_amount'];
    $rp['paymentStatus'] = $rp['payment_status'];
}

// 10. Low Stock Products (up to 5 for activity preview)
$lowStockStmt = $db->query("
    SELECT id, name, sku, stock, low_stock_threshold
    FROM products
    WHERE is_active = 1 AND stock <= low_stock_threshold
    ORDER BY stock ASC
    LIMIT 5
");
$lowStockProducts = $lowStockStmt->fetchAll();
foreach ($lowStockProducts as &$lsp) {
    $lsp['id'] = (int)$lsp['id'];
    $lsp['stock'] = (int)$lsp['stock'];
    $lsp['low_stock_threshold'] = (int)$lsp['low_stock_threshold'];
    $lsp['lowStockThreshold'] = $lsp['low_stock_threshold'];
}

// 11. Best Sellers (top 4 by quantity sold)
$bestStmt = $db->query("
    SELECT
        p.id,
        p.name,
        p.sku,
        COALESCE(c.name, 'Uncategorized') AS category_name,
        COALESCE(SUM(sii.qty), 0) AS total_sold,
        COALESCE(SUM(sii.line_total), 0) AS revenue
    FROM products p
    JOIN sales_invoice_items sii ON p.id = sii.product_id
    LEFT JOIN categories c ON p.category_id = c.id
    GROUP BY p.id, p.name, p.sku, c.name
    ORDER BY total_sold DESC
    LIMIT 4
");
$bestSellers = $bestStmt->fetchAll();
foreach ($bestSellers as &$bs) {
    $bs['id'] = (int)$bs['id'];
    $bs['total_sold'] = (int)$bs['total_sold'];
    $bs['revenue'] = (float)$bs['revenue'];
    $bs['totalSold'] = $bs['total_sold'];
    $bs['category'] = $bs['category_name'];
}

jsonResponse([
    'success' => true,
    'data' => [
        'kpi' => [
            'today_sales'               => $todaySales,
            'today_sales_count'         => (int)($todaySalesSummary['invoices_count'] ?? 0),
            'today_sales_paid'          => (float)($todaySalesSummary['total_paid'] ?? 0),
            'today_sales_due'           => (float)($todaySalesSummary['total_due'] ?? 0),
            'today_sales_cash'          => (float)($todaySalesSummary['cash_sales'] ?? 0),
            'today_sales_upi'           => (float)($todaySalesSummary['upi_sales'] ?? 0),
            'today_sales_other'         => (float)($todaySalesSummary['other_sales'] ?? 0),
            'today_customers_count'     => $todayCustomersCount,
            'this_week_sales'           => $thisWeekSales,
            'this_week_sales_count'     => (int)($weekSalesSummary['invoices_count'] ?? 0),
            'this_week_sales_paid'      => (float)($weekSalesSummary['total_paid'] ?? 0),
            'this_week_sales_due'       => (float)($weekSalesSummary['total_due'] ?? 0),
            'this_week_purchases'       => $thisWeekPurchases,
            'this_week_purchases_count' => (int)($weekPoSummary['po_count'] ?? 0),
            'this_week_purchases_paid'  => (float)($weekPoSummary['total_paid'] ?? 0),
            'this_week_purchases_due'   => (float)($weekPoSummary['total_due'] ?? 0),
            'estimated_profit'          => $estimatedProfit,
            'profit_margin_pct'         => $profitMarginPct,
            'total_products'            => $totalProducts,
            'in_stock_count'            => $inStockCount,
            'low_stock_count'           => $lowStockCount,
            'out_of_stock_count'        => $outOfStockCount,
            'total_stock_units'         => $totalStockUnits,
            'inventory_cost_val'        => $inventoryCostVal,
            'inventory_retail_val'      => $inventoryRetailVal,
            'total_returns_amount'      => $totalReturnsAmount,
            'total_returns_count'       => $totalReturnsCount,
            'total_returns_items'       => $totalReturnsItems,
            'today_returns_amount'      => $todayReturnsAmount,
            'today_returns_count'       => $todayReturnsCount,
            'this_week_returns_amount'  => $thisWeekReturnsAmount,
            'this_week_returns_count'   => $thisWeekReturnsCount
        ],
        'charts' => [
            'weekly' => [
                'labels'    => $weeklyLabels,
                'sales'     => array_values($weeklySalesMap),
                'purchases' => array_values($weeklyPurchasesMap)
            ],
            'monthly' => [
                'labels'    => $monthlyLabels,
                'sales'     => array_values($monthlySalesMap),
                'purchases' => array_values($monthlyPurchasesMap)
            ],
            'yearly' => [
                'labels'    => $yearlyLabels,
                'sales'     => array_values($yearlySalesMap),
                'purchases' => array_values($yearlyPurchasesMap)
            ],
            'category' => $categoryBreakdown
        ],
        'today_customers'        => $todayCustomers,
        'today_sales_list'       => $todaySalesList,
        'this_week_sales_list'   => $thisWeekSalesList,
        'this_week_purchases_list'=> $thisWeekPurchasesList,
        'returns_list'           => $returnsList,
        'all_low_stock_products' => $allLowStockProducts,
        'products_list'          => $productsList,
        'category_distribution'  => $categoryDistribution,
        'recent_sales'           => $recentSales,
        'recent_purchases'       => $recentPurchases,
        'low_stock_products'     => $lowStockProducts,
        'best_sellers'           => $bestSellers
    ]
]);

