import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Product, Order, PurchaseOrder, PurchaseRecord, StockOutRecord, POSSale, ShopSettings } from '../types';

export const defaultShopSettings: ShopSettings = {
  shopName: 'Chan Online Shop',
  tagline: 'Best Quality Products',
  phone: '+855 12 345 678',
  email: 'chan@onlineshop.com',
  address: 'Phnom Penh, Cambodia',
  currency: 'USD',
  taxRate: 0,
  logoUrl: '',
  freeShippingThreshold: 50,
  standardShippingFee: 2.5,
  telegramUsername: 'ChanOnlineShop',
  googleDriveLinked: false,
  googleDriveEmail: '',
  autoSyncDriveEnabled: false,
  autoSyncIntervalSeconds: 60,
  googleDriveFolder: 'ChanStore_Backups',
};

// ==========================================
// 1. DAILY SALES REPORT CALCULATION HELPER
// ==========================================
export interface DailySalesSummary {
  date: string; // YYYY-MM-DD
  displayDate: string;
  totalTransactions: number;
  posTransactions: number;
  orderTransactions: number;
  totalRevenue: number;
  totalUnitsSold: number;
  cashRevenue: number;
  khqrRevenue: number;
  cardRevenue: number;
  codRevenue: number;
  estimatedCost: number;
  grossProfit: number;
  grossMarginPercent: number;
}

export interface DailySalesAggregate {
  dailyList: DailySalesSummary[];
  totalTransactions: number;
  totalRevenue: number;
  totalUnits: number;
  totalCost: number;
  totalGrossProfit: number;
  averageDailyRevenue: number;
}

export function computeDailySales(
  posSales: POSSale[], 
  orders: Order[],
  products: Product[]
): DailySalesAggregate {
  // Map of product cost by SKU or ID for accurate profit calculations
  const productCostMap = new Map<string, number>();
  products.forEach(p => {
    productCostMap.set(p.id, p.costPrice || 0);
    productCostMap.set(p.sku, p.costPrice || 0);
  });

  const dayMap = new Map<string, {
    date: string;
    posCount: number;
    orderCount: number;
    revenue: number;
    units: number;
    cash: number;
    khqr: number;
    card: number;
    cod: number;
    cost: number;
  }>();

  // 1. Process POS Sales
  posSales.forEach(sale => {
    const dStr = sale.date ? sale.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!dayMap.has(dStr)) {
      dayMap.set(dStr, {
        date: dStr,
        posCount: 0,
        orderCount: 0,
        revenue: 0,
        units: 0,
        cash: 0,
        khqr: 0,
        card: 0,
        cod: 0,
        cost: 0,
      });
    }
    const entry = dayMap.get(dStr)!;
    entry.posCount += 1;
    entry.revenue += sale.total || 0;
    
    // Method
    const m = (sale.paymentMethod || '').toUpperCase();
    if (m === 'CASH') entry.cash += sale.total || 0;
    else if (m === 'KHQR') entry.khqr += sale.total || 0;
    else if (m === 'CARD') entry.card += sale.total || 0;
    else entry.cash += sale.total || 0;

    // Units & Cost
    if (Array.isArray(sale.items)) {
      sale.items.forEach(item => {
        const qty = item.quantity || 1;
        entry.units += qty;
        const unitCost = productCostMap.get(item.productId) || productCostMap.get(item.sku) || 0;
        entry.cost += unitCost * qty;
      });
    }
  });

  // 2. Process Storefront Orders (where status is not Cancelled)
  orders.filter(o => o.fulfillmentStatus !== 'Cancelled').forEach(order => {
    const dStr = order.date ? order.date.slice(0, 10) : new Date().toISOString().slice(0, 10);
    if (!dayMap.has(dStr)) {
      dayMap.set(dStr, {
        date: dStr,
        posCount: 0,
        orderCount: 0,
        revenue: 0,
        units: 0,
        cash: 0,
        khqr: 0,
        card: 0,
        cod: 0,
        cost: 0,
      });
    }
    const entry = dayMap.get(dStr)!;
    entry.orderCount += 1;
    entry.revenue += order.total || 0;

    // Payment method
    const pm = (order.paymentMethod || '').toLowerCase();
    if (pm === 'khqr' || pm === 'aba') entry.khqr += order.total || 0;
    else if (pm === 'card') entry.card += order.total || 0;
    else if (pm === 'cod') entry.cod += order.total || 0;
    else entry.cash += order.total || 0;

    // Units & Cost
    if (Array.isArray(order.items)) {
      order.items.forEach(item => {
        const qty = item.quantity || 1;
        entry.units += qty;
        const unitCost = productCostMap.get(item.productId) || productCostMap.get(item.sku) || 0;
        entry.cost += unitCost * qty;
      });
    }
  });

  // Convert to sorted array (newest first)
  const sortedDates = Array.from(dayMap.keys()).sort((a, b) => b.localeCompare(a));
  
  const dailyList: DailySalesSummary[] = sortedDates.map(dStr => {
    const raw = dayMap.get(dStr)!;
    const grossProfit = raw.revenue - raw.cost;
    const grossMarginPercent = raw.revenue > 0 ? (grossProfit / raw.revenue) * 100 : 0;
    
    let displayDate = dStr;
    try {
      displayDate = new Date(dStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      // keep fallback
    }

    return {
      date: dStr,
      displayDate,
      totalTransactions: raw.posCount + raw.orderCount,
      posTransactions: raw.posCount,
      orderTransactions: raw.orderCount,
      totalRevenue: raw.revenue,
      totalUnitsSold: raw.units,
      cashRevenue: raw.cash,
      khqrRevenue: raw.khqr,
      cardRevenue: raw.card,
      codRevenue: raw.cod,
      estimatedCost: raw.cost,
      grossProfit,
      grossMarginPercent,
    };
  });

  const totalTransactions = dailyList.reduce((acc, d) => acc + d.totalTransactions, 0);
  const totalRevenue = dailyList.reduce((acc, d) => acc + d.totalRevenue, 0);
  const totalUnits = dailyList.reduce((acc, d) => acc + d.totalUnitsSold, 0);
  const totalCost = dailyList.reduce((acc, d) => acc + d.estimatedCost, 0);
  const totalGrossProfit = totalRevenue - totalCost;
  const averageDailyRevenue = dailyList.length > 0 ? totalRevenue / dailyList.length : 0;

  return {
    dailyList,
    totalTransactions,
    totalRevenue,
    totalUnits,
    totalCost,
    totalGrossProfit,
    averageDailyRevenue,
  };
}

// ==========================================
// 2. INVENTORY EXPORT (PDF & EXCEL)
// ==========================================

export function exportInventoryToPdf(products: Product[], settings: Partial<ShopSettings> = defaultShopSettings) {
  const doc = new jsPDF('landscape');
  const now = new Date().toLocaleString();
  const shop = { ...defaultShopSettings, ...settings };

  // Header Title & Branding
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(`${shop.shopName || 'Chan Online Shop'} - Inventory Report`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated: ${now} | Hotline: ${shop.phone} | Total Catalog: ${products.length} Products`, 14, 23);

  const totalRetail = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const totalCost = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const totalUnits = products.reduce((acc, p) => acc + p.stock, 0);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Total Units: ${totalUnits.toLocaleString()}  |  Inventory Cost Value: $${totalCost.toFixed(2)}  |  Retail Value: $${totalRetail.toFixed(2)}`,
    14, 30
  );

  const tableData = products.map((p, idx) => {
    const weightStr = p.weight ? `${p.weight} ${p.weightUnit || 'kg'}` : '-';
    const status = p.stock <= 0 ? 'Out of Stock' : p.stock <= p.lowStockThreshold ? 'Low Stock' : 'In Stock';
    const totalVal = p.price * p.stock;

    return [
      idx + 1,
      p.sku,
      p.barcode || '-',
      p.name,
      p.category,
      weightStr,
      p.stock,
      `$${p.costPrice.toFixed(2)}`,
      `$${p.price.toFixed(2)}`,
      `$${totalVal.toFixed(2)}`,
      status,
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['#', 'SKU', 'Barcode', 'Product Name', 'Category', 'Weight', 'Stock', 'Cost', 'Price', 'Retail Val', 'Status']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 65 },
      4: { cellWidth: 32 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      10: { cellWidth: 22, halign: 'center' },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${doc.internal.pages.length - 1}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    },
  });

  doc.save(`Inventory_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportInventoryToExcel(products: Product[], settings: Partial<ShopSettings> = defaultShopSettings) {
  const rows = products.map((p, idx) => ({
    'No.': idx + 1,
    'SKU': p.sku,
    'Barcode / EAN': p.barcode || '',
    'Product Name': p.name,
    'Category': p.category,
    'Weight': p.weight ? `${p.weight} ${p.weightUnit || 'kg'}` : '',
    'Stock Units': p.stock,
    'Low Stock Threshold': p.lowStockThreshold,
    'Cost Price ($)': p.costPrice,
    'Selling Price ($)': p.price,
    'Total Cost Value ($)': Number((p.costPrice * p.stock).toFixed(2)),
    'Total Retail Value ($)': Number((p.price * p.stock).toFixed(2)),
    'Status': p.stock <= 0 ? 'Out of Stock' : p.stock <= p.lowStockThreshold ? 'Low Stock' : 'In Stock',
    'Brand': p.brand || '',
    'Created Date': p.createdAt || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 16 }, // SKU
    { wch: 18 }, // Barcode
    { wch: 38 }, // Name
    { wch: 22 }, // Category
    { wch: 12 }, // Weight
    { wch: 12 }, // Stock
    { wch: 18 }, // Threshold
    { wch: 14 }, // Cost
    { wch: 15 }, // Price
    { wch: 18 }, // Total Cost
    { wch: 18 }, // Total Retail
    { wch: 14 }, // Status
    { wch: 18 }, // Brand
    { wch: 14 }, // Created Date
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  XLSX.writeFile(workbook, `Inventory_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==========================================
// 3. ORDERS EXPORT (PDF & EXCEL)
// ==========================================

export function exportOrdersToPdf(orders: Order[], settings: Partial<ShopSettings> = defaultShopSettings) {
  const doc = new jsPDF('landscape');
  const now = new Date().toLocaleString();
  const shop = { ...defaultShopSettings, ...settings };

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`${shop.shopName || 'Chan Online Shop'} - Customer Orders List`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${now} | Orders Count: ${orders.length} | Hotline: ${shop.phone}`, 14, 23);

  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Orders Revenue: $${totalRevenue.toFixed(2)}`, 14, 30);

  const tableData = orders.map((o, idx) => {
    const itemsSummary = o.items.map(i => `${i.quantity}x ${i.productName}`).join('; ');
    const dateStr = o.date ? new Date(o.date).toLocaleDateString() : '-';

    return [
      idx + 1,
      o.id,
      dateStr,
      o.customer?.fullName || 'Guest',
      o.customer?.phoneNumber || '-',
      itemsSummary,
      (o.paymentMethod || 'KHQR').toUpperCase(),
      `$${(o.total || 0).toFixed(2)}`,
      o.paymentStatus || 'Paid',
      o.fulfillmentStatus || 'Pending',
      o.trackingNumber || '-',
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Order ID', 'Date', 'Customer Name', 'Phone', 'Items Ordered', 'Payment', 'Total', 'Payment Status', 'Fulfillment', 'Tracking']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 20 },
      3: { cellWidth: 28 },
      4: { cellWidth: 22 },
      5: { cellWidth: 65 },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 24, halign: 'center' },
      9: { cellWidth: 22, halign: 'center' },
      10: { cellWidth: 22 },
    },
  });

  doc.save(`Customer_Orders_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportOrdersToExcel(orders: Order[], settings: Partial<ShopSettings> = defaultShopSettings) {
  const rows = orders.map((o, idx) => ({
    'No.': idx + 1,
    'Order ID': o.id,
    'Order Date': o.date ? new Date(o.date).toISOString().slice(0, 19).replace('T', ' ') : '',
    'Customer Name': o.customer?.fullName || '',
    'Phone': o.customer?.phoneNumber || '',
    'Email': o.customer?.email || '',
    'Address': o.customer?.address || '',
    'City': o.customer?.city || '',
    'Items Summary': o.items.map(i => `${i.quantity}x ${i.productName} ($${i.price})`).join('; '),
    'Subtotal ($)': o.subtotal || 0,
    'Discount ($)': o.discount || 0,
    'Shipping Fee ($)': o.shippingFee || 0,
    'Total Amount ($)': o.total || 0,
    'Payment Method': (o.paymentMethod || '').toUpperCase(),
    'Payment Status': o.paymentStatus || '',
    'Fulfillment Status': o.fulfillmentStatus || '',
    'Transaction Ref': o.transactionId || '',
    'Tracking Number': o.trackingNumber || '',
    'Customer Notes': o.notes || o.customer?.notes || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 14 },
    { wch: 45 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
    { wch: 20 },
    { wch: 18 },
    { wch: 25 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
  XLSX.writeFile(workbook, `Customer_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==========================================
// 4. PURCHASE ORDERS EXPORT (PDF & EXCEL)
// ==========================================

export function exportPurchaseOrdersToPdf(purchaseOrders: PurchaseOrder[], settings: Partial<ShopSettings> = defaultShopSettings) {
  const doc = new jsPDF('landscape');
  const now = new Date().toLocaleString();
  const shop = { ...defaultShopSettings, ...settings };

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`${shop.shopName || 'Chan Online Shop'} - Purchase Orders (PO)`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${now} | Total POs: ${purchaseOrders.length} | Shop Hotline: ${shop.phone}`, 14, 23);

  const totalPOAmount = purchaseOrders.reduce((acc, po) => acc + (po.totalAmount || 0), 0);
  const totalPOUnits = purchaseOrders.reduce((acc, po) => acc + (po.totalQuantity || 0), 0);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total Inbound Quantity: ${totalPOUnits} Units  |  Total Procurement Spend: $${totalPOAmount.toFixed(2)}`, 14, 30);

  const tableData = purchaseOrders.map((po, idx) => {
    const itemsText = po.items.map(i => `${i.quantityOrdered}x ${i.productName} (Unit: $${i.unitCostPrice})`).join('; ');

    return [
      idx + 1,
      po.poNumber,
      po.supplierName,
      po.orderDate,
      po.expectedDate,
      po.status,
      po.paymentStatus,
      po.totalQuantity,
      `$${po.totalAmount.toFixed(2)}`,
      itemsText,
      po.recordedBy || 'Admin',
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['#', 'PO Number', 'Supplier Name', 'Order Date', 'Expected', 'Status', 'Payment', 'Qty', 'Total ($)', 'Items Breakdown', 'Recorded By']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 24, fontStyle: 'bold' },
      2: { cellWidth: 38 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 14, halign: 'center' },
      8: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      9: { cellWidth: 65 },
      10: { cellWidth: 24 },
    },
  });

  doc.save(`Purchase_Orders_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportPurchaseOrdersToExcel(purchaseOrders: PurchaseOrder[], settings: Partial<ShopSettings> = defaultShopSettings) {
  const rows = purchaseOrders.map((po, idx) => ({
    'No.': idx + 1,
    'PO Number': po.poNumber,
    'Supplier Name': po.supplierName,
    'Supplier Phone': po.supplierPhone || '',
    'Supplier Email': po.supplierEmail || '',
    'Order Date': po.orderDate,
    'Expected Date': po.expectedDate,
    'Status': po.status,
    'Payment Status': po.paymentStatus,
    'Total Units Ordered': po.totalQuantity,
    'Total Amount ($)': po.totalAmount,
    'Items Breakdown': po.items.map(i => `${i.quantityOrdered}x ${i.productName} [SKU: ${i.sku}] @ $${i.unitCostPrice}`).join(' | '),
    'Notes': po.notes || '',
    'Recorded By': po.recordedBy || '',
    'Created At': po.createdAt || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 48 },
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase_Orders');
  XLSX.writeFile(workbook, `Purchase_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==========================================
// 5. TRANSACTIONS EXPORT (PDF & EXCEL)
// Purchases + Stock Outs + POS Sales + Orders
// ==========================================

export function exportTransactionsToPdf(
  purchasesOrLogs: any[] = [],
  stockOutsOrSettings?: StockOutRecord[] | Partial<ShopSettings>,
  posSales?: POSSale[],
  orders?: Order[],
  settings?: Partial<ShopSettings>
) {
  const doc = new jsPDF('landscape');
  const now = new Date().toLocaleString();

  // Determine if called with inventoryLogs array alone or multi-argument records
  const isLogsCall = !Array.isArray(stockOutsOrSettings) && !posSales && !orders;
  let effectiveSettings: Partial<ShopSettings> = defaultShopSettings;
  if (isLogsCall && stockOutsOrSettings && typeof stockOutsOrSettings === 'object') {
    effectiveSettings = stockOutsOrSettings as Partial<ShopSettings>;
  } else if (settings) {
    effectiveSettings = settings;
  }
  const shop = { ...defaultShopSettings, ...effectiveSettings };

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`${shop.shopName || 'Chan Online Shop'} - ${isLogsCall ? 'Inventory Transactions & Audit Logs' : 'Financial Transactions Audit'}`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${now} | Hotline: ${shop.phone}`, 14, 23);

  // Combine all transaction rows
  const allRows: {
    date: string;
    type: string;
    ref: string;
    details: string;
    flow: 'INFLOW' | 'OUTFLOW';
    amount: number;
    user: string;
  }[] = [];

  if (isLogsCall) {
    purchasesOrLogs.forEach((log: any, idx: number) => {
      const isPositive = (log.quantityChange ?? 0) >= 0;
      allRows.push({
        date: log.timestamp ? new Date(log.timestamp).toISOString().slice(0, 19).replace('T', ' ') : (log.date || now),
        type: log.type ? `LOG: ${String(log.type).toUpperCase()}` : 'STOCK EVENT',
        ref: log.id || `LOG-${idx + 1}`,
        details: `${log.productName || 'Product'} (SKU: ${log.sku || '-'}) ${log.note ? '• ' + log.note : ''}`,
        flow: isPositive ? 'INFLOW' : 'OUTFLOW',
        amount: Math.abs(log.quantityChange ?? 1),
        user: log.userName || 'Staff / System',
      });
    });
  } else {
    const purchases = (purchasesOrLogs as PurchaseRecord[]) || [];
    const stockOuts = (Array.isArray(stockOutsOrSettings) ? stockOutsOrSettings : []) as StockOutRecord[];
    const sales = posSales || [];
    const ords = orders || [];

    purchases.forEach(p => {
      allRows.push({
        date: p.date || p.createdAt,
        type: 'PURCHASE (STOCK IN)',
        ref: p.invoiceNumber || p.id,
        details: `${p.quantity}x ${p.productName} (Supplier: ${p.supplierName})`,
        flow: 'OUTFLOW',
        amount: p.totalCost,
        user: p.recordedBy || 'Staff',
      });
    });

    stockOuts.forEach(s => {
      allRows.push({
        date: s.date || s.createdAt,
        type: 'STOCK WRITE-OFF',
        ref: s.id,
        details: `${s.quantity}x ${s.productName} (Reason: ${s.reason})`,
        flow: 'OUTFLOW',
        amount: s.costImpact,
        user: s.recordedBy || 'Staff',
      });
    });

    sales.forEach(sale => {
      allRows.push({
        date: sale.date,
        type: 'POS SALE',
        ref: sale.receiptNumber || sale.id,
        details: `${sale.customerName || 'Walk-in'} (${sale.paymentMethod}) - ${sale.items?.length || 1} items`,
        flow: 'INFLOW',
        amount: sale.total,
        user: sale.cashierName || 'Cashier',
      });
    });

    ords.filter(o => o.fulfillmentStatus !== 'Cancelled').forEach(o => {
      allRows.push({
        date: o.date,
        type: 'ONLINE ORDER',
        ref: o.id,
        details: `${o.customer?.fullName || 'Online Customer'} (${o.paymentMethod})`,
        flow: 'INFLOW',
        amount: o.total,
        user: 'Customer / Storefront',
      });
    });
  }

  // Sort newest first
  allRows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const totalInflow = allRows.filter(r => r.flow === 'INFLOW').reduce((acc, r) => acc + r.amount, 0);
  const totalOutflow = allRows.filter(r => r.flow === 'OUTFLOW').reduce((acc, r) => acc + r.amount, 0);
  const netPosition = totalInflow - totalOutflow;

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Total Transactions: ${allRows.length}  |  Total Sales/Inflow: +$${totalInflow.toFixed(2)}  |  Total Purchases & Write-offs: -$${totalOutflow.toFixed(2)}  |  Net: $${netPosition.toFixed(2)}`,
    14, 30
  );

  const tableData = allRows.map((r, idx) => {
    const formattedDate = r.date ? r.date.slice(0, 10) : '-';
    const amountStr = r.flow === 'INFLOW' ? `+$${r.amount.toFixed(2)}` : `-$${r.amount.toFixed(2)}`;

    return [
      idx + 1,
      formattedDate,
      r.type,
      r.ref,
      r.details,
      r.flow,
      amountStr,
      r.user,
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Date', 'Transaction Type', 'Reference / ID', 'Description / Details', 'Flow', 'Amount ($)', 'Recorded By']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 38, fontStyle: 'bold' },
      3: { cellWidth: 32 },
      4: { cellWidth: 85 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 30 },
    },
  });

  doc.save(`Financial_Transactions_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportTransactionsToExcel(
  purchasesOrLogs: any[] = [],
  stockOutsOrSettings?: StockOutRecord[] | Partial<ShopSettings>,
  posSales?: POSSale[],
  orders?: Order[],
  settings?: Partial<ShopSettings>
) {
  const workbook = XLSX.utils.book_new();
  const isLogsCall = !Array.isArray(stockOutsOrSettings) && !posSales && !orders;

  if (isLogsCall) {
    const logRows = purchasesOrLogs.map((log: any, idx: number) => ({
      'No.': idx + 1,
      'Timestamp / Date': log.timestamp || log.date || '',
      'Event Type': log.type || 'STOCK_EVENT',
      'Reference ID': log.id || `LOG-${idx + 1}`,
      'Product Name': log.productName || '',
      'SKU': log.sku || '',
      'Quantity Change': log.quantityChange ?? 0,
      'Stock Balance After': log.stockAfter ?? '',
      'Audit Notes': log.note || '',
      'User / Operator': log.userName || 'Staff / System',
    }));

    const logSheet = XLSX.utils.json_to_sheet(logRows);
    logSheet['!cols'] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 20 },
      { wch: 32 },
      { wch: 16 },
      { wch: 18 },
      { wch: 20 },
      { wch: 40 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, logSheet, 'Inventory_Logs');
    XLSX.writeFile(workbook, `Inventory_Audit_Logs_${new Date().toISOString().slice(0, 10)}.xlsx`);
    return;
  }

  const purchases = (purchasesOrLogs as PurchaseRecord[]) || [];
  const stockOuts = (Array.isArray(stockOutsOrSettings) ? stockOutsOrSettings : []) as StockOutRecord[];
  const sales = posSales || [];
  const ords = orders || [];

  // Sheet 1: Master Combined Transactions
  const combinedRows: any[] = [];

  purchases.forEach(p => {
    combinedRows.push({
      'Date': p.date || p.createdAt,
      'Type': 'PURCHASE (STOCK IN)',
      'Reference': p.invoiceNumber || p.id,
      'Product / Details': `${p.quantity}x ${p.productName}`,
      'Supplier / Customer': p.supplierName,
      'Flow': 'OUTFLOW',
      'Amount ($)': -Math.abs(p.totalCost),
      'Recorded By': p.recordedBy || 'Staff',
      'Notes': p.notes || '',
    });
  });

  stockOuts.forEach(s => {
    combinedRows.push({
      'Date': s.date || s.createdAt,
      'Type': 'STOCK WRITE-OFF',
      'Reference': s.id,
      'Product / Details': `${s.quantity}x ${s.productName} (${s.reason})`,
      'Supplier / Customer': 'Internal / Store Loss',
      'Flow': 'OUTFLOW',
      'Amount ($)': -Math.abs(s.costImpact),
      'Recorded By': s.recordedBy || 'Staff',
      'Notes': s.notes || '',
    });
  });

  sales.forEach(sale => {
    combinedRows.push({
      'Date': sale.date,
      'Type': 'POS CASH REGISTER',
      'Reference': sale.receiptNumber || sale.id,
      'Product / Details': `${sale.items?.length || 0} items purchased`,
      'Supplier / Customer': sale.customerName || 'Walk-in Customer',
      'Flow': 'INFLOW',
      'Amount ($)': sale.total,
      'Recorded By': sale.cashierName || 'Cashier',
      'Notes': sale.paymentMethod,
    });
  });

  ords.forEach(o => {
    combinedRows.push({
      'Date': o.date,
      'Type': 'STOREFRONT ORDER',
      'Reference': o.id,
      'Product / Details': o.items.map(i => `${i.quantity}x ${i.productName}`).join('; '),
      'Supplier / Customer': o.customer?.fullName || 'Online Customer',
      'Flow': o.fulfillmentStatus === 'Cancelled' ? 'VOID' : 'INFLOW',
      'Amount ($)': o.fulfillmentStatus === 'Cancelled' ? 0 : o.total,
      'Recorded By': 'Storefront Gateway',
      'Notes': `${o.paymentMethod} - ${o.paymentStatus} (${o.fulfillmentStatus})`,
    });
  });

  // Sort descending
  combinedRows.sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));

  const masterSheet = XLSX.utils.json_to_sheet(combinedRows);
  masterSheet['!cols'] = [
    { wch: 16 },
    { wch: 24 },
    { wch: 20 },
    { wch: 35 },
    { wch: 25 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(workbook, masterSheet, 'All_Transactions');

  // Sheet 2: Stock-In Purchases
  if (purchases.length > 0) {
    const pRows = purchases.map((p, idx) => ({
      'No.': idx + 1,
      'Date': p.date,
      'Invoice No': p.invoiceNumber,
      'Product': p.productName,
      'SKU': p.sku,
      'Quantity': p.quantity,
      'Unit Cost ($)': p.unitCostPrice,
      'Total Cost ($)': p.totalCost,
      'Supplier': p.supplierName,
      'Recorded By': p.recordedBy,
      'Notes': p.notes || '',
    }));
    const pSheet = XLSX.utils.json_to_sheet(pRows);
    XLSX.utils.book_append_sheet(workbook, pSheet, 'Purchases_In');
  }

  // Sheet 3: Stock-Out Write-offs
  if (stockOuts.length > 0) {
    const sRows = stockOuts.map((s, idx) => ({
      'No.': idx + 1,
      'Date': s.date,
      'Product': s.productName,
      'SKU': s.sku,
      'Quantity': s.quantity,
      'Reason': s.reason,
      'Cost Impact ($)': s.costImpact,
      'Recorded By': s.recordedBy,
      'Notes': s.notes || '',
    }));
    const sSheet = XLSX.utils.json_to_sheet(sRows);
    XLSX.utils.book_append_sheet(workbook, sSheet, 'Stock_Outs');
  }

  XLSX.writeFile(workbook, `Financial_Transactions_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ==========================================
// 6. REPORT FOR PER DAY SALE (PDF & EXCEL)
// ==========================================

export function exportDailySalesReportToPdf(
  dailyDataOrList: DailySalesAggregate | any[],
  settings: Partial<ShopSettings> = defaultShopSettings
) {
  const doc = new jsPDF('landscape');
  const now = new Date().toLocaleString();
  const shop = { ...defaultShopSettings, ...settings };

  let dailyData: DailySalesAggregate;
  if (Array.isArray(dailyDataOrList)) {
    const list = dailyDataOrList;
    const totalRev = list.reduce((acc, d) => acc + (d.totalRevenue ?? 0), 0);
    const totalC = list.reduce((acc, d) => acc + (d.estimatedCost ?? d.totalCost ?? 0), 0);
    const totalP = list.reduce((acc, d) => acc + (d.grossProfit ?? d.estimatedProfit ?? ((d.totalRevenue ?? 0) - (d.estimatedCost ?? 0))), 0);
    dailyData = {
      dailyList: list.map(d => ({
        date: d.date || '',
        displayDate: d.displayDate || d.date || '',
        totalTransactions: d.totalTransactions ?? d.totalOrders ?? 0,
        posTransactions: d.posTransactions ?? d.posCount ?? 0,
        orderTransactions: d.orderTransactions ?? d.orderCount ?? 0,
        totalRevenue: d.totalRevenue ?? 0,
        totalUnitsSold: d.totalUnitsSold ?? d.units ?? 0,
        cashRevenue: d.cashRevenue ?? 0,
        khqrRevenue: d.khqrRevenue ?? 0,
        cardRevenue: d.cardRevenue ?? 0,
        codRevenue: d.codRevenue ?? 0,
        estimatedCost: d.estimatedCost ?? d.totalCost ?? 0,
        grossProfit: d.grossProfit ?? d.estimatedProfit ?? ((d.totalRevenue ?? 0) - (d.estimatedCost ?? 0)),
        grossMarginPercent: (d.totalRevenue ?? 0) > 0 ? (((d.grossProfit ?? d.estimatedProfit ?? 0) / d.totalRevenue) * 100) : 0,
      })),
      totalTransactions: list.reduce((acc, d) => acc + (d.totalTransactions ?? d.totalOrders ?? 0), 0),
      totalRevenue: totalRev,
      totalUnits: list.reduce((acc, d) => acc + (d.totalUnitsSold ?? d.units ?? 0), 0),
      totalCost: totalC,
      totalGrossProfit: totalP,
      averageDailyRevenue: list.length > 0 ? totalRev / list.length : 0,
    };
  } else {
    dailyData = dailyDataOrList;
  }

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(`${shop.shopName || 'Chan Online Shop'} - Daily Sales Performance Report`, 14, 16);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated: ${now} | Store Hotline: ${shop.phone}`, 14, 23);

  // Executive Summary Line
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Days Active: ${dailyData.dailyList.length}  |  Total Transactions: ${dailyData.totalTransactions}  |  Units Sold: ${dailyData.totalUnits}  |  Gross Sales: $${dailyData.totalRevenue.toFixed(2)}  |  Total Profit: $${dailyData.totalGrossProfit.toFixed(2)}`,
    14, 30
  );

  const tableData = dailyData.dailyList.map((d, idx) => {
    return [
      idx + 1,
      d.date,
      d.displayDate,
      d.totalTransactions,
      `${d.posTransactions} POS / ${d.orderTransactions} Web`,
      d.totalUnitsSold,
      `$${d.cashRevenue.toFixed(2)}`,
      `$${d.khqrRevenue.toFixed(2)}`,
      `$${d.cardRevenue.toFixed(2)}`,
      `$${d.codRevenue.toFixed(2)}`,
      `$${d.estimatedCost.toFixed(2)}`,
      `$${d.totalRevenue.toFixed(2)}`,
      `$${d.grossProfit.toFixed(2)} (${d.grossMarginPercent.toFixed(1)}%)`,
    ];
  });

  // Summary Totals Row
  tableData.push([
    '',
    'TOTAL',
    'Overall Period',
    dailyData.totalTransactions,
    '-',
    dailyData.totalUnits,
    `$${dailyData.dailyList.reduce((acc, d) => acc + d.cashRevenue, 0).toFixed(2)}`,
    `$${dailyData.dailyList.reduce((acc, d) => acc + d.khqrRevenue, 0).toFixed(2)}`,
    `$${dailyData.dailyList.reduce((acc, d) => acc + d.cardRevenue, 0).toFixed(2)}`,
    `$${dailyData.dailyList.reduce((acc, d) => acc + d.codRevenue, 0).toFixed(2)}`,
    `$${dailyData.totalCost.toFixed(2)}`,
    `$${dailyData.totalRevenue.toFixed(2)}`,
    `$${dailyData.totalGrossProfit.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [['#', 'Date (ISO)', 'Day', 'Txns', 'Channel Split', 'Units', 'Cash ($)', 'KHQR ($)', 'Card ($)', 'COD ($)', 'Cost ($)', 'Sales ($)', 'Profit ($)']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 22, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 28, halign: 'center' },
      5: { cellWidth: 14, halign: 'center' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 16, halign: 'right' },
      10: { cellWidth: 20, halign: 'right' },
      11: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      12: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
  });

  doc.save(`Daily_Sales_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportDailySalesReportToExcel(
  dailyDataOrList: DailySalesAggregate | any[],
  settings: Partial<ShopSettings> = defaultShopSettings
) {
  let dailyData: DailySalesAggregate;
  if (Array.isArray(dailyDataOrList)) {
    const list = dailyDataOrList;
    const totalRev = list.reduce((acc, d) => acc + (d.totalRevenue ?? 0), 0);
    const totalC = list.reduce((acc, d) => acc + (d.estimatedCost ?? d.totalCost ?? 0), 0);
    const totalP = list.reduce((acc, d) => acc + (d.grossProfit ?? d.estimatedProfit ?? ((d.totalRevenue ?? 0) - (d.estimatedCost ?? 0))), 0);
    dailyData = {
      dailyList: list.map(d => ({
        date: d.date || '',
        displayDate: d.displayDate || d.date || '',
        totalTransactions: d.totalTransactions ?? d.totalOrders ?? 0,
        posTransactions: d.posTransactions ?? d.posCount ?? 0,
        orderTransactions: d.orderTransactions ?? d.orderCount ?? 0,
        totalRevenue: d.totalRevenue ?? 0,
        totalUnitsSold: d.totalUnitsSold ?? d.units ?? 0,
        cashRevenue: d.cashRevenue ?? 0,
        khqrRevenue: d.khqrRevenue ?? 0,
        cardRevenue: d.cardRevenue ?? 0,
        codRevenue: d.codRevenue ?? 0,
        estimatedCost: d.estimatedCost ?? d.totalCost ?? 0,
        grossProfit: d.grossProfit ?? d.estimatedProfit ?? ((d.totalRevenue ?? 0) - (d.estimatedCost ?? 0)),
        grossMarginPercent: (d.totalRevenue ?? 0) > 0 ? (((d.grossProfit ?? d.estimatedProfit ?? 0) / d.totalRevenue) * 100) : 0,
      })),
      totalTransactions: list.reduce((acc, d) => acc + (d.totalTransactions ?? d.totalOrders ?? 0), 0),
      totalRevenue: totalRev,
      totalUnits: list.reduce((acc, d) => acc + (d.totalUnitsSold ?? d.units ?? 0), 0),
      totalCost: totalC,
      totalGrossProfit: totalP,
      averageDailyRevenue: list.length > 0 ? totalRev / list.length : 0,
    };
  } else {
    dailyData = dailyDataOrList;
  }

  const rows = dailyData.dailyList.map((d, idx) => ({
    'No.': idx + 1,
    'Date': d.date,
    'Day of Week': d.displayDate,
    'Total Transactions': d.totalTransactions,
    'POS Register Sales': d.posTransactions,
    'Online Store Orders': d.orderTransactions,
    'Total Units Sold': d.totalUnitsSold,
    'Cash Revenue ($)': Number(d.cashRevenue.toFixed(2)),
    'KHQR / Bakong Revenue ($)': Number(d.khqrRevenue.toFixed(2)),
    'Card Revenue ($)': Number(d.cardRevenue.toFixed(2)),
    'COD Revenue ($)': Number(d.codRevenue.toFixed(2)),
    'Total Estimated Cost ($)': Number(d.estimatedCost.toFixed(2)),
    'Gross Daily Revenue ($)': Number(d.totalRevenue.toFixed(2)),
    'Gross Profit ($)': Number(d.grossProfit.toFixed(2)),
    'Gross Margin (%)': Number(d.grossMarginPercent.toFixed(1)),
  }));

  // Add Summary Total Row
  rows.push({
    'No.': 0,
    'Date': 'TOTAL PERIOD',
    'Day of Week': 'All Days',
    'Total Transactions': dailyData.totalTransactions,
    'POS Register Sales': dailyData.dailyList.reduce((acc, d) => acc + d.posTransactions, 0),
    'Online Store Orders': dailyData.dailyList.reduce((acc, d) => acc + d.orderTransactions, 0),
    'Total Units Sold': dailyData.totalUnits,
    'Cash Revenue ($)': Number(dailyData.dailyList.reduce((acc, d) => acc + d.cashRevenue, 0).toFixed(2)),
    'KHQR / Bakong Revenue ($)': Number(dailyData.dailyList.reduce((acc, d) => acc + d.khqrRevenue, 0).toFixed(2)),
    'Card Revenue ($)': Number(dailyData.dailyList.reduce((acc, d) => acc + d.cardRevenue, 0).toFixed(2)),
    'COD Revenue ($)': Number(dailyData.dailyList.reduce((acc, d) => acc + d.codRevenue, 0).toFixed(2)),
    'Total Estimated Cost ($)': Number(dailyData.totalCost.toFixed(2)),
    'Gross Daily Revenue ($)': Number(dailyData.totalRevenue.toFixed(2)),
    'Gross Profit ($)': Number(dailyData.totalGrossProfit.toFixed(2)),
    'Gross Margin (%)': dailyData.totalRevenue > 0 ? Number(((dailyData.totalGrossProfit / dailyData.totalRevenue) * 100).toFixed(1)) : 0,
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 16 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily_Sales_Report');
  XLSX.writeFile(workbook, `Daily_Sales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
