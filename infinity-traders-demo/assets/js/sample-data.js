/**
 * INFINITY TRADERS - Sample Data
 * ================================
 * All data in this file is FICTIONAL and for demonstration purposes only.
 * This data is temporary and will NOT persist after page refresh.
 * Real business data will be managed through a PHP + MySQL backend in production.
 */

'use strict';

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
const CATEGORIES_DATA = [
  {
    id: 'cat-shoes', name: 'Shoes',
    subcategories: ['Running Shoes', 'Sneakers', 'Wheel Shoes']
  },
  {
    id: 'cat-sports-dress', name: 'Sports Dresses',
    subcategories: ['Lower / Track Pants', 'Half Pants / Shorts', 'T-Shirts', 'Track Suits']
  },
  {
    id: 'cat-slippers', name: 'Slippers',
    subcategories: ['Crocs / Clogs', 'Sliders']
  }
];

// ─── BRANDS ───────────────────────────────────────────────────────────────────
const BRANDS_DATA = [
  { id: 'brand-nike',      name: 'Nike' },
  { id: 'brand-adidas',    name: 'Adidas' },
  { id: 'brand-asics',     name: 'ASICS' },
  { id: 'brand-puma',      name: 'Puma' },
  { id: 'brand-crocs',     name: 'Crocs' },
  { id: 'brand-ua',        name: 'Under Armour' },
  { id: 'brand-other',     name: 'Other' }
];

// ─── SUPPLIERS ────────────────────────────────────────────────────────────────
const SUPPLIERS_DATA = [
  {
    id: 'sup-001', name: 'Raj Sports Distributors', contactPerson: 'Rajesh Kumar',
    phone: '+91 98451 12301', email: 'rajesh@rajsports.example',
    address: '14, Industrial Area, Phase 2, Ludhiana, Punjab - 141003',
    gstin: 'GSTIN_PLACEHOLDER_001', outstanding: 45000, status: 'Active'
  },
  {
    id: 'sup-002', name: 'Mumbai Footwear Hub', contactPerson: 'Priya Mehta',
    phone: '+91 97671 44502', email: 'priya@mumbaifootwear.example',
    address: '7, Dharavi Industrial Estate, Mumbai, Maharashtra - 400017',
    gstin: 'GSTIN_PLACEHOLDER_002', outstanding: 0, status: 'Active'
  },
  {
    id: 'sup-003', name: 'Nike India Wholesale', contactPerson: 'Suresh Nair',
    phone: '+91 94431 88003', email: 'suresh@nikeindia.example',
    address: '22, SEZ Phase 1, Noida, Uttar Pradesh - 201301',
    gstin: 'GSTIN_PLACEHOLDER_003', outstanding: 120000, status: 'Active'
  },
  {
    id: 'sup-004', name: 'Adidas South India', contactPerson: 'Kavitha Reddy',
    phone: '+91 99001 55004', email: 'kavitha@adidassouth.example',
    address: '5, Rajiv Gandhi Nagar, Hyderabad, Telangana - 500032',
    gstin: 'GSTIN_PLACEHOLDER_004', outstanding: 28000, status: 'Active'
  },
  {
    id: 'sup-005', name: 'Puma Merchandise Pvt Ltd', contactPerson: 'Amit Shah',
    phone: '+91 98250 72005', email: 'amit@pumamerch.example',
    address: '9, Gift City, Gandhinagar, Gujarat - 382355',
    gstin: 'GSTIN_PLACEHOLDER_005', outstanding: 0, status: 'Active'
  },
  {
    id: 'sup-006', name: 'Southern Sportswear Co.', contactPerson: 'Murugan Pillai',
    phone: '+91 96000 33006', email: 'murugan@southernsports.example',
    address: '18, Anna Salai, Chennai, Tamil Nadu - 600002',
    gstin: 'GSTIN_PLACEHOLDER_006', outstanding: 15000, status: 'Inactive'
  }
];

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────
const CUSTOMERS_DATA = [
  { id: 'cust-001', name: 'Arjun Sharma',     phone: '+91 98456 10001', email: 'arjun.sharma@example.in',   address: 'Koramangala, Bengaluru', outstanding: 0,    totalPurchases: 12500 },
  { id: 'cust-002', name: 'Preethi Iyengar',  phone: '+91 97441 20002', email: 'preethi.i@example.in',       address: 'Jayanagar, Bengaluru',   outstanding: 2500, totalPurchases: 8750 },
  { id: 'cust-003', name: 'Mohammed Farhan',  phone: '+91 96321 30003', email: 'mfarhan@example.in',         address: 'Shivajinagar, Pune',     outstanding: 0,    totalPurchases: 5200 },
  { id: 'cust-004', name: 'Deepa Krishnan',   phone: '+91 99101 40004', email: 'deepa.k@example.in',         address: 'T. Nagar, Chennai',      outstanding: 0,    totalPurchases: 18000 },
  { id: 'cust-005', name: 'Vikram Bhatia',    phone: '+91 95401 50005', email: 'vikram.b@example.in',        address: 'Lajpat Nagar, Delhi',    outstanding: 1500, totalPurchases: 6300 },
  { id: 'cust-006', name: 'Sneha Patil',      phone: '+91 98001 60006', email: 'sneha.patil@example.in',     address: 'Kothrud, Pune',          outstanding: 0,    totalPurchases: 9400 },
  { id: 'cust-007', name: 'Rahul Nambiar',    phone: '+91 96101 70007', email: 'rahul.nambiar@example.in',   address: 'Thrissur, Kerala',       outstanding: 0,    totalPurchases: 4100 },
  { id: 'cust-008', name: 'Ananya Singh',     phone: '+91 97771 80008', email: 'ananya.s@example.in',        address: 'Gomti Nagar, Lucknow',   outstanding: 3000, totalPurchases: 21500 },
  { id: 'cust-009', name: 'Karthik Subramaniam', phone: '+91 98901 90009', email: 'karthik.sub@example.in', address: 'Adyar, Chennai',         outstanding: 0,    totalPurchases: 7800 },
  { id: 'cust-010', name: 'Walk-in Customer', phone: '',                 email: '',                           address: '',                       outstanding: 0,    totalPurchases: 0 }
];

// ─── PRODUCTS ─────────────────────────────────────────────────────────────────
const PRODUCTS_DATA = [
  // Nike Running Shoes
  { id: 'prod-001', name: 'Nike Air Zoom Pegasus 40', sku: 'NK-RUN-PEG-UK8-BLK', barcode: '890012345601', category: 'Shoes', subcategory: 'Running Shoes', brand: 'Nike', size: 'UK 8', color: 'Black/White', purchasePrice: 4500, sellingPrice: 7499, stock: 5, lowStockThreshold: 3, status: 'Active' },
  { id: 'prod-002', name: 'Nike Air Zoom Pegasus 40', sku: 'NK-RUN-PEG-UK9-BLK', barcode: '890012345602', category: 'Shoes', subcategory: 'Running Shoes', brand: 'Nike', size: 'UK 9', color: 'Black/White', purchasePrice: 4500, sellingPrice: 7499, stock: 2, lowStockThreshold: 3, status: 'Active' },
  { id: 'prod-003', name: 'Nike Air Zoom Pegasus 40', sku: 'NK-RUN-PEG-UK10-BLU', barcode: '890012345603', category: 'Shoes', subcategory: 'Running Shoes', brand: 'Nike', size: 'UK 10', color: 'Navy Blue', purchasePrice: 4500, sellingPrice: 7499, stock: 0, lowStockThreshold: 3, status: 'Active' },
  // Nike Sneakers
  { id: 'prod-004', name: 'Nike Air Force 1', sku: 'NK-SNK-AF1-UK8-WHT', barcode: '890012345604', category: 'Shoes', subcategory: 'Sneakers', brand: 'Nike', size: 'UK 8', color: 'White', purchasePrice: 3200, sellingPrice: 5999, stock: 8, lowStockThreshold: 3, status: 'Active' },
  { id: 'prod-005', name: 'Nike Air Force 1', sku: 'NK-SNK-AF1-UK9-WHT', barcode: '890012345605', category: 'Shoes', subcategory: 'Sneakers', brand: 'Nike', size: 'UK 9', color: 'White', purchasePrice: 3200, sellingPrice: 5999, stock: 6, lowStockThreshold: 3, status: 'Active' },
  // Adidas Running Shoes
  { id: 'prod-006', name: 'Adidas Ultraboost 23', sku: 'AD-RUN-UB23-UK8-GRY', barcode: '890012345606', category: 'Shoes', subcategory: 'Running Shoes', brand: 'Adidas', size: 'UK 8', color: 'Grey/Orange', purchasePrice: 5200, sellingPrice: 9499, stock: 4, lowStockThreshold: 3, status: 'Active' },
  { id: 'prod-007', name: 'Adidas Ultraboost 23', sku: 'AD-RUN-UB23-UK9-GRY', barcode: '890012345607', category: 'Shoes', subcategory: 'Running Shoes', brand: 'Adidas', size: 'UK 9', color: 'Grey/Orange', purchasePrice: 5200, sellingPrice: 9499, stock: 1, lowStockThreshold: 3, status: 'Active' },
  // ASICS
  { id: 'prod-008', name: 'ASICS Gel-Nimbus 25', sku: 'AS-RUN-GN25-UK8-BLU', barcode: '890012345608', category: 'Shoes', subcategory: 'Running Shoes', brand: 'ASICS', size: 'UK 8', color: 'Blue/White', purchasePrice: 6000, sellingPrice: 10499, stock: 3, lowStockThreshold: 2, status: 'Active' },
  { id: 'prod-009', name: 'ASICS Gel-Nimbus 25', sku: 'AS-RUN-GN25-UK9-BLU', barcode: '890012345609', category: 'Shoes', subcategory: 'Running Shoes', brand: 'ASICS', size: 'UK 9', color: 'Blue/White', purchasePrice: 6000, sellingPrice: 10499, stock: 2, lowStockThreshold: 2, status: 'Active' },
  // Puma Sneakers
  { id: 'prod-010', name: 'Puma RS-X', sku: 'PU-SNK-RSX-UK8-RED', barcode: '890012345610', category: 'Shoes', subcategory: 'Sneakers', brand: 'Puma', size: 'UK 8', color: 'Red/White', purchasePrice: 2800, sellingPrice: 4999, stock: 7, lowStockThreshold: 3, status: 'Active' },
  // Crocs / Clogs
  { id: 'prod-011', name: 'Crocs Classic Clog', sku: 'CR-CLG-CLS-UK8-YLW', barcode: '890012345611', category: 'Slippers', subcategory: 'Crocs / Clogs', brand: 'Crocs', size: 'UK 8', color: 'Yellow', purchasePrice: 1200, sellingPrice: 2499, stock: 12, lowStockThreshold: 5, status: 'Active' },
  { id: 'prod-012', name: 'Crocs Classic Clog', sku: 'CR-CLG-CLS-UK9-BLK', barcode: '890012345612', category: 'Slippers', subcategory: 'Crocs / Clogs', brand: 'Crocs', size: 'UK 9', color: 'Black', purchasePrice: 1200, sellingPrice: 2499, stock: 9, lowStockThreshold: 5, status: 'Active' },
  // Sliders
  { id: 'prod-013', name: 'Nike Benassi Slider', sku: 'NK-SLD-BNS-UK8-BLK', barcode: '890012345613', category: 'Slippers', subcategory: 'Sliders', brand: 'Nike', size: 'UK 8', color: 'Black', purchasePrice: 900, sellingPrice: 1799, stock: 15, lowStockThreshold: 5, status: 'Active' },
  { id: 'prod-014', name: 'Adidas Adilette Slider', sku: 'AD-SLD-ADL-UK9-WHT', barcode: '890012345614', category: 'Slippers', subcategory: 'Sliders', brand: 'Adidas', size: 'UK 9', color: 'White/Blue', purchasePrice: 850, sellingPrice: 1699, stock: 2, lowStockThreshold: 4, status: 'Active' },
  // T-Shirts
  { id: 'prod-015', name: 'Nike Dri-FIT T-Shirt', sku: 'NK-TSH-DRF-M-BLU', barcode: '890012345615', category: 'Sports Dresses', subcategory: 'T-Shirts', brand: 'Nike', size: 'M', color: 'Royal Blue', purchasePrice: 700, sellingPrice: 1499, stock: 20, lowStockThreshold: 5, status: 'Active' },
  { id: 'prod-016', name: 'Nike Dri-FIT T-Shirt', sku: 'NK-TSH-DRF-L-BLU', barcode: '890012345616', category: 'Sports Dresses', subcategory: 'T-Shirts', brand: 'Nike', size: 'L', color: 'Royal Blue', purchasePrice: 700, sellingPrice: 1499, stock: 18, lowStockThreshold: 5, status: 'Active' },
  { id: 'prod-017', name: 'Nike Dri-FIT T-Shirt', sku: 'NK-TSH-DRF-XL-BLK', barcode: '890012345617', category: 'Sports Dresses', subcategory: 'T-Shirts', brand: 'Nike', size: 'XL', color: 'Black', purchasePrice: 700, sellingPrice: 1499, stock: 1, lowStockThreshold: 5, status: 'Active' },
  // Track Pants
  { id: 'prod-018', name: 'Adidas Tiro Track Pants', sku: 'AD-TRK-TIR-M-BLK', barcode: '890012345618', category: 'Sports Dresses', subcategory: 'Lower / Track Pants', brand: 'Adidas', size: 'M', color: 'Black', purchasePrice: 1100, sellingPrice: 2299, stock: 10, lowStockThreshold: 4, status: 'Active' },
  { id: 'prod-019', name: 'Adidas Tiro Track Pants', sku: 'AD-TRK-TIR-L-BLK', barcode: '890012345619', category: 'Sports Dresses', subcategory: 'Lower / Track Pants', brand: 'Adidas', size: 'L', color: 'Black', purchasePrice: 1100, sellingPrice: 2299, stock: 3, lowStockThreshold: 4, status: 'Active' },
  // Track Suits
  { id: 'prod-020', name: 'Puma Squad Track Suit', sku: 'PU-TRS-SQD-L-NVY', barcode: '890012345620', category: 'Sports Dresses', subcategory: 'Track Suits', brand: 'Puma', size: 'L', color: 'Navy Blue', purchasePrice: 2200, sellingPrice: 3999, stock: 6, lowStockThreshold: 3, status: 'Active' },
  // Half Shorts
  { id: 'prod-021', name: 'Under Armour Launch Shorts', sku: 'UA-SHT-LCH-M-GRN', barcode: '890012345621', category: 'Sports Dresses', subcategory: 'Half Pants / Shorts', brand: 'Under Armour', size: 'M', color: 'Forest Green', purchasePrice: 850, sellingPrice: 1799, stock: 11, lowStockThreshold: 4, status: 'Active' },
  { id: 'prod-022', name: 'Under Armour Launch Shorts', sku: 'UA-SHT-LCH-L-GRN', barcode: '890012345622', category: 'Sports Dresses', subcategory: 'Half Pants / Shorts', brand: 'Under Armour', size: 'L', color: 'Forest Green', purchasePrice: 850, sellingPrice: 1799, stock: 0, lowStockThreshold: 4, status: 'Active' },
  // Wheel Shoes
  { id: 'prod-023', name: 'Skechers Wheelies', sku: 'SK-WHL-WHE-UK6-PNK', barcode: '890012345623', category: 'Shoes', subcategory: 'Wheel Shoes', brand: 'Other', size: 'UK 6', color: 'Pink', purchasePrice: 1800, sellingPrice: 3299, stock: 2, lowStockThreshold: 2, status: 'Active' },
  // Puma Sliders
  { id: 'prod-024', name: 'Puma Popcat Slide', sku: 'PU-SLD-POP-UK8-RED', barcode: '890012345624', category: 'Slippers', subcategory: 'Sliders', brand: 'Puma', size: 'UK 8', color: 'Red', purchasePrice: 700, sellingPrice: 1499, stock: 8, lowStockThreshold: 4, status: 'Active' },
  // Nike Track Suit
  { id: 'prod-025', name: 'Nike Sportswear Club Track Suit', sku: 'NK-TRS-CLB-XL-GRY', barcode: '890012345625', category: 'Sports Dresses', subcategory: 'Track Suits', brand: 'Nike', size: 'XL', color: 'Carbon Grey', purchasePrice: 2800, sellingPrice: 4999, stock: 4, lowStockThreshold: 3, status: 'Active' }
];

// ─── SALES INVOICES ───────────────────────────────────────────────────────────
const SALES_DATA = [
  {
    id: 'sale-001', invoiceNo: 'IT-INV-001', date: '2026-10-28',
    customer: 'Arjun Sharma', customerPhone: '+91 98456 10001', customerAddress: 'Koramangala, Bengaluru',
    items: [{ sku: 'NK-RUN-PEG-UK8-BLK', name: 'Nike Air Zoom Pegasus 40', qty: 1, unitPrice: 7499, discount: 0 }],
    subtotal: 7499, discount: 0, taxableAmount: 7499, gstEnabled: false,
    gstAmount: 0, grandTotal: 7499, amountPaid: 7499, balance: 0,
    paymentMethod: 'UPI', paymentStatus: 'Paid'
  },
  {
    id: 'sale-002', invoiceNo: 'IT-INV-002', date: '2026-10-27',
    customer: 'Deepa Krishnan', customerPhone: '+91 99101 40004', customerAddress: 'T. Nagar, Chennai',
    items: [
      { sku: 'NK-TSH-DRF-M-BLU', name: 'Nike Dri-FIT T-Shirt (M)', qty: 2, unitPrice: 1499, discount: 0 },
      { sku: 'AD-TRK-TIR-M-BLK', name: 'Adidas Tiro Track Pants (M)', qty: 1, unitPrice: 2299, discount: 100 }
    ],
    subtotal: 5297, discount: 100, taxableAmount: 5197, gstEnabled: true,
    gstAmount: 935.46, grandTotal: 6132.46, amountPaid: 6132.46, balance: 0,
    paymentMethod: 'Card', paymentStatus: 'Paid'
  },
  {
    id: 'sale-003', invoiceNo: 'IT-INV-003', date: '2026-10-26',
    customer: 'Walk-in Customer', customerPhone: '', customerAddress: '',
    items: [{ sku: 'CR-CLG-CLS-UK8-YLW', name: 'Crocs Classic Clog (UK8)', qty: 1, unitPrice: 2499, discount: 0 }],
    subtotal: 2499, discount: 0, taxableAmount: 2499, gstEnabled: false,
    gstAmount: 0, grandTotal: 2499, amountPaid: 2499, balance: 0,
    paymentMethod: 'Cash', paymentStatus: 'Paid'
  },
  {
    id: 'sale-004', invoiceNo: 'IT-INV-004', date: '2026-10-25',
    customer: 'Mohammed Farhan', customerPhone: '+91 96321 30003', customerAddress: 'Shivajinagar, Pune',
    items: [
      { sku: 'PU-SNK-RSX-UK8-RED', name: 'Puma RS-X (UK8)', qty: 1, unitPrice: 4999, discount: 200 },
      { sku: 'PU-TRS-SQD-L-NVY', name: 'Puma Squad Track Suit (L)', qty: 1, unitPrice: 3999, discount: 0 }
    ],
    subtotal: 8998, discount: 200, taxableAmount: 8798, gstEnabled: false,
    gstAmount: 0, grandTotal: 8798, amountPaid: 8798, balance: 0,
    paymentMethod: 'Cash', paymentStatus: 'Paid'
  },
  {
    id: 'sale-005', invoiceNo: 'IT-INV-005', date: '2026-10-24',
    customer: 'Sneha Patil', customerPhone: '+91 98001 60006', customerAddress: 'Kothrud, Pune',
    items: [{ sku: 'AD-RUN-UB23-UK8-GRY', name: 'Adidas Ultraboost 23 (UK8)', qty: 1, unitPrice: 9499, discount: 500 }],
    subtotal: 9499, discount: 500, taxableAmount: 8999, gstEnabled: true,
    gstAmount: 1619.82, grandTotal: 10618.82, amountPaid: 10618.82, balance: 0,
    paymentMethod: 'UPI', paymentStatus: 'Paid'
  },
  {
    id: 'sale-006', invoiceNo: 'IT-INV-006', date: '2026-10-23',
    customer: 'Vikram Bhatia', customerPhone: '+91 95401 50005', customerAddress: 'Lajpat Nagar, Delhi',
    items: [
      { sku: 'NK-SLD-BNS-UK8-BLK', name: 'Nike Benassi Slider (UK8)', qty: 2, unitPrice: 1799, discount: 0 },
      { sku: 'NK-TSH-DRF-L-BLU', name: 'Nike Dri-FIT T-Shirt (L)', qty: 1, unitPrice: 1499, discount: 0 }
    ],
    subtotal: 5097, discount: 0, taxableAmount: 5097, gstEnabled: false,
    gstAmount: 0, grandTotal: 5097, amountPaid: 3597, balance: 1500,
    paymentMethod: 'Cash', paymentStatus: 'Partial'
  },
  {
    id: 'sale-007', invoiceNo: 'IT-INV-007', date: '2026-10-22',
    customer: 'Ananya Singh', customerPhone: '+91 97771 80008', customerAddress: 'Gomti Nagar, Lucknow',
    items: [{ sku: 'AS-RUN-GN25-UK8-BLU', name: 'ASICS Gel-Nimbus 25 (UK8)', qty: 1, unitPrice: 10499, discount: 0 }],
    subtotal: 10499, discount: 0, taxableAmount: 10499, gstEnabled: true,
    gstAmount: 1889.82, grandTotal: 12388.82, amountPaid: 12388.82, balance: 0,
    paymentMethod: 'Card', paymentStatus: 'Paid'
  },
  {
    id: 'sale-008', invoiceNo: 'IT-INV-008', date: '2026-10-21',
    customer: 'Walk-in Customer', customerPhone: '', customerAddress: '',
    items: [
      { sku: 'UA-SHT-LCH-M-GRN', name: 'UA Launch Shorts (M)', qty: 1, unitPrice: 1799, discount: 0 },
      { sku: 'CR-CLG-CLS-UK9-BLK', name: 'Crocs Classic Clog (UK9)', qty: 1, unitPrice: 2499, discount: 0 }
    ],
    subtotal: 4298, discount: 0, taxableAmount: 4298, gstEnabled: false,
    gstAmount: 0, grandTotal: 4298, amountPaid: 4298, balance: 0,
    paymentMethod: 'UPI', paymentStatus: 'Paid'
  },
  {
    id: 'sale-009', invoiceNo: 'IT-INV-009', date: '2026-10-20',
    customer: 'Karthik Subramaniam', customerPhone: '+91 98901 90009', customerAddress: 'Adyar, Chennai',
    items: [{ sku: 'NK-SNK-AF1-UK9-WHT', name: 'Nike Air Force 1 (UK9)', qty: 1, unitPrice: 5999, discount: 0 }],
    subtotal: 5999, discount: 0, taxableAmount: 5999, gstEnabled: false,
    gstAmount: 0, grandTotal: 5999, amountPaid: 5999, balance: 0,
    paymentMethod: 'UPI', paymentStatus: 'Paid'
  },
  {
    id: 'sale-010', invoiceNo: 'IT-INV-010', date: '2026-10-19',
    customer: 'Rahul Nambiar', customerPhone: '+91 96101 70007', customerAddress: 'Thrissur, Kerala',
    items: [{ sku: 'PU-SLD-POP-UK8-RED', name: 'Puma Popcat Slide (UK8)', qty: 2, unitPrice: 1499, discount: 0 }],
    subtotal: 2998, discount: 0, taxableAmount: 2998, gstEnabled: false,
    gstAmount: 0, grandTotal: 2998, amountPaid: 2998, balance: 0,
    paymentMethod: 'Cash', paymentStatus: 'Paid'
  },
  {
    id: 'sale-011', invoiceNo: 'IT-INV-011', date: '2026-10-18',
    customer: 'Preethi Iyengar', customerPhone: '+91 97441 20002', customerAddress: 'Jayanagar, Bengaluru',
    items: [{ sku: 'NK-TRS-CLB-XL-GRY', name: 'Nike Sportswear Club Track Suit (XL)', qty: 1, unitPrice: 4999, discount: 0 }],
    subtotal: 4999, discount: 0, taxableAmount: 4999, gstEnabled: true,
    gstAmount: 899.82, grandTotal: 5898.82, amountPaid: 3398.82, balance: 2500,
    paymentMethod: 'Card', paymentStatus: 'Partial'
  },
  {
    id: 'sale-012', invoiceNo: 'IT-INV-012', date: '2026-10-15',
    customer: 'Walk-in Customer', customerPhone: '', customerAddress: '',
    items: [
      { sku: 'AD-SLD-ADL-UK9-WHT', name: 'Adidas Adilette Slider (UK9)', qty: 1, unitPrice: 1699, discount: 0 },
      { sku: 'AD-TRK-TIR-L-BLK', name: 'Adidas Tiro Track Pants (L)', qty: 1, unitPrice: 2299, discount: 0 }
    ],
    subtotal: 3998, discount: 0, taxableAmount: 3998, gstEnabled: false,
    gstAmount: 0, grandTotal: 3998, amountPaid: 3998, balance: 0,
    paymentMethod: 'Cash', paymentStatus: 'Paid'
  },
  {
    id: 'sale-013', invoiceNo: 'IT-INV-013', date: '2026-10-10',
    customer: 'Arjun Sharma', customerPhone: '+91 98456 10001', customerAddress: 'Koramangala, Bengaluru',
    items: [{ sku: 'NK-SNK-AF1-UK8-WHT', name: 'Nike Air Force 1 (UK8)', qty: 1, unitPrice: 5999, discount: 0 }],
    subtotal: 5999, discount: 0, taxableAmount: 5999, gstEnabled: false,
    gstAmount: 0, grandTotal: 5999, amountPaid: 5999, balance: 0,
    paymentMethod: 'UPI', paymentStatus: 'Paid'
  },
  {
    id: 'sale-014', invoiceNo: 'IT-INV-014', date: '2026-10-05',
    customer: 'Deepa Krishnan', customerPhone: '+91 99101 40004', customerAddress: 'T. Nagar, Chennai',
    items: [{ sku: 'SK-WHL-WHE-UK6-PNK', name: 'Skechers Wheelies (UK6)', qty: 1, unitPrice: 3299, discount: 0 }],
    subtotal: 3299, discount: 0, taxableAmount: 3299, gstEnabled: false,
    gstAmount: 0, grandTotal: 3299, amountPaid: 3299, balance: 0,
    paymentMethod: 'Cash', paymentStatus: 'Paid'
  },
  {
    id: 'sale-015', invoiceNo: 'IT-INV-015', date: '2026-09-28',
    customer: 'Ananya Singh', customerPhone: '+91 97771 80008',
    items: [
      { sku: 'NK-TSH-DRF-XL-BLK', name: 'Nike Dri-FIT T-Shirt (XL)', qty: 3, unitPrice: 1499, discount: 0 },
      { sku: 'UA-SHT-LCH-L-GRN', name: 'UA Launch Shorts (L)', qty: 2, unitPrice: 1799, discount: 0 }
    ],
    subtotal: 8095, discount: 0, taxableAmount: 8095, gstEnabled: false,
    gstAmount: 0, grandTotal: 8095, amountPaid: 8095, balance: 0,
    paymentMethod: 'Card', paymentStatus: 'Paid'
  }
];

// ─── PURCHASES ────────────────────────────────────────────────────────────────
const PURCHASES_DATA = [
  {
    id: 'pur-001', purchaseInvoice: 'PUR-001', supplierInvoice: 'RAJ-2026-551',
    date: '2026-10-20', supplierId: 'sup-001', supplierName: 'Raj Sports Distributors',
    items: [
      { sku: 'NK-RUN-PEG-UK8-BLK', name: 'Nike Air Zoom Pegasus 40 (UK8, Black)', qty: 5, costPerUnit: 4500, discount: 0 },
      { sku: 'NK-RUN-PEG-UK9-BLK', name: 'Nike Air Zoom Pegasus 40 (UK9, Black)', qty: 5, costPerUnit: 4500, discount: 0 }
    ],
    subtotal: 45000, discount: 0, gstEnabled: false, gstAmount: 0,
    totalAmount: 45000, amountPaid: 45000, balance: 0,
    paymentStatus: 'Paid', notes: 'Fresh stock for upcoming season'
  },
  {
    id: 'pur-002', purchaseInvoice: 'PUR-002', supplierInvoice: 'MFH-2026-312',
    date: '2026-10-15', supplierId: 'sup-002', supplierName: 'Mumbai Footwear Hub',
    items: [
      { sku: 'CR-CLG-CLS-UK8-YLW', name: 'Crocs Classic Clog (UK8, Yellow)', qty: 10, costPerUnit: 1200, discount: 0 },
      { sku: 'CR-CLG-CLS-UK9-BLK', name: 'Crocs Classic Clog (UK9, Black)', qty: 10, costPerUnit: 1200, discount: 0 }
    ],
    subtotal: 24000, discount: 0, gstEnabled: true, gstAmount: 4320,
    totalAmount: 28320, amountPaid: 28320, balance: 0,
    paymentStatus: 'Paid', notes: ''
  },
  {
    id: 'pur-003', purchaseInvoice: 'PUR-003', supplierInvoice: 'NIK-WHL-2026-89',
    date: '2026-10-12', supplierId: 'sup-003', supplierName: 'Nike India Wholesale',
    items: [
      { sku: 'NK-SNK-AF1-UK8-WHT', name: 'Nike Air Force 1 (UK8, White)', qty: 8, costPerUnit: 3200, discount: 0 },
      { sku: 'NK-SNK-AF1-UK9-WHT', name: 'Nike Air Force 1 (UK9, White)', qty: 8, costPerUnit: 3200, discount: 0 },
      { sku: 'NK-SLD-BNS-UK8-BLK', name: 'Nike Benassi Slider (UK8, Black)', qty: 20, costPerUnit: 900, discount: 0 }
    ],
    subtotal: 69200, discount: 2000, gstEnabled: true, gstAmount: 12096,
    totalAmount: 79296, amountPaid: 0, balance: 79296,
    paymentStatus: 'Unpaid', notes: 'Net 30 credit terms'
  },
  {
    id: 'pur-004', purchaseInvoice: 'PUR-004', supplierInvoice: 'ADS-2026-445',
    date: '2026-10-08', supplierId: 'sup-004', supplierName: 'Adidas South India',
    items: [
      { sku: 'AD-RUN-UB23-UK8-GRY', name: 'Adidas Ultraboost 23 (UK8)', qty: 5, costPerUnit: 5200, discount: 0 },
      { sku: 'AD-RUN-UB23-UK9-GRY', name: 'Adidas Ultraboost 23 (UK9)', qty: 3, costPerUnit: 5200, discount: 0 },
      { sku: 'AD-TRK-TIR-M-BLK', name: 'Adidas Tiro Track Pants (M)', qty: 10, costPerUnit: 1100, discount: 0 },
      { sku: 'AD-TRK-TIR-L-BLK', name: 'Adidas Tiro Track Pants (L)', qty: 10, costPerUnit: 1100, discount: 0 }
    ],
    subtotal: 63200, discount: 0, gstEnabled: false, gstAmount: 0,
    totalAmount: 63200, amountPaid: 35200, balance: 28000,
    paymentStatus: 'Partial', notes: 'Balance to be paid by month end'
  },
  {
    id: 'pur-005', purchaseInvoice: 'PUR-005', supplierInvoice: 'PUM-2026-210',
    date: '2026-10-05', supplierId: 'sup-005', supplierName: 'Puma Merchandise Pvt Ltd',
    items: [
      { sku: 'PU-SNK-RSX-UK8-RED', name: 'Puma RS-X (UK8, Red)', qty: 8, costPerUnit: 2800, discount: 0 },
      { sku: 'PU-TRS-SQD-L-NVY', name: 'Puma Squad Track Suit (L)', qty: 8, costPerUnit: 2200, discount: 0 },
      { sku: 'PU-SLD-POP-UK8-RED', name: 'Puma Popcat Slide (UK8, Red)', qty: 10, costPerUnit: 700, discount: 0 }
    ],
    subtotal: 46200, discount: 0, gstEnabled: false, gstAmount: 0,
    totalAmount: 46200, amountPaid: 46200, balance: 0,
    paymentStatus: 'Paid', notes: ''
  },
  {
    id: 'pur-006', purchaseInvoice: 'PUR-006', supplierInvoice: 'RAJ-2026-497',
    date: '2026-09-25', supplierId: 'sup-001', supplierName: 'Raj Sports Distributors',
    items: [
      { sku: 'NK-TSH-DRF-M-BLU', name: 'Nike Dri-FIT T-Shirt (M, Blue)', qty: 20, costPerUnit: 700, discount: 0 },
      { sku: 'NK-TSH-DRF-L-BLU', name: 'Nike Dri-FIT T-Shirt (L, Blue)', qty: 20, costPerUnit: 700, discount: 0 },
      { sku: 'NK-TSH-DRF-XL-BLK', name: 'Nike Dri-FIT T-Shirt (XL, Black)', qty: 5, costPerUnit: 700, discount: 0 }
    ],
    subtotal: 31500, discount: 1500, gstEnabled: true, gstAmount: 5400,
    totalAmount: 35400, amountPaid: 35400, balance: 0,
    paymentStatus: 'Paid', notes: ''
  },
  {
    id: 'pur-007', purchaseInvoice: 'PUR-007', supplierInvoice: 'AS-IND-2026-78',
    date: '2026-09-18', supplierId: 'sup-002', supplierName: 'Mumbai Footwear Hub',
    items: [
      { sku: 'AS-RUN-GN25-UK8-BLU', name: 'ASICS Gel-Nimbus 25 (UK8)', qty: 4, costPerUnit: 6000, discount: 0 },
      { sku: 'AS-RUN-GN25-UK9-BLU', name: 'ASICS Gel-Nimbus 25 (UK9)', qty: 3, costPerUnit: 6000, discount: 0 }
    ],
    subtotal: 42000, discount: 0, gstEnabled: false, gstAmount: 0,
    totalAmount: 42000, amountPaid: 42000, balance: 0,
    paymentStatus: 'Paid', notes: 'Premium running shoes batch'
  },
  {
    id: 'pur-008', purchaseInvoice: 'PUR-008', supplierInvoice: 'UA-2026-55',
    date: '2026-09-10', supplierId: 'sup-005', supplierName: 'Puma Merchandise Pvt Ltd',
    items: [
      { sku: 'UA-SHT-LCH-M-GRN', name: 'UA Launch Shorts (M, Green)', qty: 12, costPerUnit: 850, discount: 0 },
      { sku: 'UA-SHT-LCH-L-GRN', name: 'UA Launch Shorts (L, Green)', qty: 4, costPerUnit: 850, discount: 0 }
    ],
    subtotal: 13600, discount: 0, gstEnabled: false, gstAmount: 0,
    totalAmount: 13600, amountPaid: 13600, balance: 0,
    paymentStatus: 'Paid', notes: ''
  },
  {
    id: 'pur-009', purchaseInvoice: 'PUR-009', supplierInvoice: 'MFH-2026-290',
    date: '2026-09-05', supplierId: 'sup-002', supplierName: 'Mumbai Footwear Hub',
    items: [
      { sku: 'AD-SLD-ADL-UK9-WHT', name: 'Adidas Adilette Slider (UK9)', qty: 5, costPerUnit: 850, discount: 0 }
    ],
    subtotal: 4250, discount: 0, gstEnabled: false, gstAmount: 0,
    totalAmount: 4250, amountPaid: 4250, balance: 0,
    paymentStatus: 'Paid', notes: ''
  },
  {
    id: 'pur-010', purchaseInvoice: 'PUR-010', supplierInvoice: 'RAJ-2026-440',
    date: '2026-08-28', supplierId: 'sup-001', supplierName: 'Raj Sports Distributors',
    items: [
      { sku: 'NK-TRS-CLB-XL-GRY', name: 'Nike Sportswear Club Track Suit (XL, Grey)', qty: 6, costPerUnit: 2800, discount: 0 },
      { sku: 'SK-WHL-WHE-UK6-PNK', name: 'Skechers Wheelies (UK6, Pink)', qty: 4, costPerUnit: 1800, discount: 0 },
      { sku: 'NK-RUN-PEG-UK10-BLU', name: 'Nike Air Zoom Pegasus 40 (UK10, Navy)', qty: 3, costPerUnit: 4500, discount: 0 }
    ],
    subtotal: 37200, discount: 0, gstEnabled: false, gstAmount: 0,
    totalAmount: 37200, amountPaid: 37200, balance: 0,
    paymentStatus: 'Paid', notes: ''
  }
];

// ─── CHART SAMPLE DATA ────────────────────────────────────────────────────────
/**
 * NOTE: These chart datasets are SAMPLE ANALYTICS for demonstration purposes only.
 * They do not represent actual business performance figures.
 */
const CHART_DATA = {
  weekly: {
    labels: ['Wed 22', 'Thu 23', 'Fri 24', 'Sat 25', 'Sun 26', 'Mon 27', 'Tue 28'],
    sales:     [8798,  5097,  10618,  8798,  2499,  7499,  7499],
    purchases: [14500, 0,     0,      28200, 0,     20500, 0]
  },
  monthly: {
    labels: ['Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26', 'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26', 'Oct 26'],
    sales:     [48200, 72500, 38000, 55000, 62000, 41000, 37500, 80000, 45000, 58000, 67000, 82000],
    purchases: [35000, 60000, 42000, 28000, 50000, 38000, 45000, 65000, 32000, 55000, 98000, 120000]
  },
  yearly: {
    labels: ['FY 2022', 'FY 2023', 'FY 2024', 'FY 2025', 'FY 2026'],
    sales:     [420000, 580000, 720000, 950000, 1150000],
    purchases: [310000, 450000, 560000, 720000,  880000]
  }
};

// ─── SETTINGS (session-only) ──────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  businessName: 'Infinity Traders',
  businessAddress: '[Business Address Placeholder]',
  phone: '[Phone Placeholder]',
  email: '[Email Placeholder]',
  gstin: '[GSTIN Placeholder]',
  defaultGstMode: false,
  invoicePrefix: 'IT-INV',
  currency: 'INR',
  lowStockThreshold: 3,
  invoiceFooterText: 'Thank you for shopping with Infinity Traders!'
};
