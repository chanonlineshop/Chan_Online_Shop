import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { PurchaseRecord, StockOutRecord, PurchaseOrder, PurchaseOrderStatus } from '../types';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { ReceivePOModal } from './ReceivePOModal';
import { PurchaseOrderVoucherModal } from './PurchaseOrderVoucherModal';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Plus, 
  FileText, 
  Package, 
  Search, 
  Download, 
  Building2, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Boxes,
  Clock,
  Ban,
  Printer,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Check,
  RotateCcw,
  FileSpreadsheet,
  ShieldAlert
} from 'lucide-react';
import { 
  exportPurchaseOrdersToPdf, 
  exportPurchaseOrdersToExcel,
  exportTransactionsToPdf,
  exportTransactionsToExcel 
} from '../utils/exportUtils';

export const PurchaseAccountingView: React.FC = () => {
  const { 
    products, 
    purchases, 
    stockOuts, 
    purchaseOrders,
    orders, 
    posSales, 
    addPurchase, 
    deletePurchase,
    addStockOut,
    deleteStockOut,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    currentUser,
    clearPurchases,
    clearStockOuts,
    clearSalesIncome,
    clearAllAccountingRecords
  } = useStore();

  const [activeTab, setActiveTab] = useState<'po' | 'purchases' | 'stockOuts' | 'all' | 'income'>('po');
  const [searchFilter, setSearchFilter] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState<string>('all');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<'stockOuts' | 'purchases' | 'income' | 'all'>('stockOuts');
  
  // Real-Time Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Modals
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [selectedPOForReceive, setSelectedPOForReceive] = useState<PurchaseOrder | null>(null);
  const [selectedPOForVoucher, setSelectedPOForVoucher] = useState<PurchaseOrder | null>(null);

  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);

  // Deletion Confirmation Modals
  const [poToDelete, setPoToDelete] = useState<PurchaseOrder | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseRecord | null>(null);
  const [stockOutToDelete, setStockOutToDelete] = useState<StockOutRecord | null>(null);

  // New Direct Purchase Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState<number>(10);
  const [unitCostPrice, setUnitCostPrice] = useState<number>(0);
  const [purchaseNotes, setPurchaseNotes] = useState('');
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // New Direct Stock Out Form State
  const [stockOutProductId, setStockOutProductId] = useState('');
  const [stockOutQuantity, setStockOutQuantity] = useState<number>(1);
  const [stockOutReason, setStockOutReason] = useState<StockOutRecord['reason']>('Supplier Return');
  const [stockOutNotes, setStockOutNotes] = useState('');
  const [stockOutError, setStockOutError] = useState<string | null>(null);

  // Financial Calculations
  const metrics = useMemo(() => {
    const storefrontIncome = orders
      .filter(o => o.fulfillmentStatus !== 'Cancelled')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const posIncome = posSales.reduce((sum, s) => sum + s.total, 0);
    const totalIncome = storefrontIncome + posIncome;
    const totalPurchasesCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    const totalStockOutLoss = stockOuts.reduce((sum, so) => sum + so.costImpact, 0);
    const netCashflow = totalIncome - totalPurchasesCost - totalStockOutLoss;

    const pendingPOs = purchaseOrders.filter(po => po.status === 'ORDERED');
    const pendingPOValue = pendingPOs.reduce((sum, po) => sum + po.totalAmount, 0);

    return {
      storefrontIncome,
      posIncome,
      totalIncome,
      totalPurchasesCost,
      totalStockOutLoss,
      netCashflow,
      totalUnitsPurchased: purchases.reduce((sum, p) => sum + p.quantity, 0),
      totalUnitsStockOut: stockOuts.reduce((sum, so) => sum + so.quantity, 0),
      pendingPOCount: pendingPOs.length,
      pendingPOValue,
      totalPOCount: purchaseOrders.length,
    };
  }, [orders, posSales, purchases, stockOuts, purchaseOrders]);

  // Handle product select in Purchase modal
  const handleProductSelectForPurchase = (prodId: string) => {
    setSelectedProductId(prodId);
    const prod = products.find(p => p.id === prodId);
    if (prod) {
      setUnitCostPrice(prod.costPrice || Number((prod.price * 0.6).toFixed(2)));
    }
  };

  // Submit Direct Purchase (Stock In)
  const handleRecordPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    setPurchaseError(null);

    const product = products.find(p => p.id === selectedProductId);
    if (!product) {
      setPurchaseError('Please select a valid product.');
      return;
    }
    if (!supplierName.trim()) {
      setPurchaseError('Please enter supplier name.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setPurchaseError('Please enter invoice / receipt number.');
      return;
    }
    if (purchaseQuantity <= 0) {
      setPurchaseError('Quantity must be greater than 0.');
      return;
    }
    if (unitCostPrice < 0) {
      setPurchaseError('Unit cost price cannot be negative.');
      return;
    }

    addPurchase({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      supplierName: supplierName.trim(),
      invoiceNumber: invoiceNumber.trim(),
      quantity: purchaseQuantity,
      unitCostPrice: unitCostPrice,
      totalCost: Number((purchaseQuantity * unitCostPrice).toFixed(2)),
      notes: purchaseNotes.trim() || undefined,
      recordedBy: currentUser?.name || 'Authorized Staff',
      date: new Date().toISOString().split('T')[0],
    });

    showToast(`Stock In Confirmed: +${purchaseQuantity} units added to ${product.name}. Real-time inventory updated!`);

    setIsPurchaseModalOpen(false);
    setSelectedProductId('');
    setSupplierName('');
    setInvoiceNumber('');
    setPurchaseQuantity(10);
    setUnitCostPrice(0);
    setPurchaseNotes('');
  };

  // Submit Stock Out (Loss / Return)
  const handleRecordStockOut = (e: React.FormEvent) => {
    e.preventDefault();
    setStockOutError(null);

    const product = products.find(p => p.id === stockOutProductId);
    if (!product) {
      setStockOutError('Please select a product.');
      return;
    }
    if (stockOutQuantity <= 0) {
      setStockOutError('Quantity must be greater than 0.');
      return;
    }
    if (stockOutQuantity > product.stock) {
      setStockOutError(`Cannot stock out ${stockOutQuantity} units. Only ${product.stock} available in stock.`);
      return;
    }

    const costImpact = Number((stockOutQuantity * product.costPrice).toFixed(2));

    addStockOut({
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: stockOutQuantity,
      reason: stockOutReason,
      costImpact,
      date: new Date().toISOString().split('T')[0],
      notes: stockOutNotes.trim() || undefined,
      recordedBy: currentUser?.name || 'Authorized Staff',
    });

    showToast(`Stock Out Recorded (${stockOutReason}): -${stockOutQuantity} units deducted from ${product.name}.`);

    setIsStockOutModalOpen(false);
    setStockOutProductId('');
    setStockOutQuantity(1);
    setStockOutReason('Supplier Return');
    setStockOutNotes('');
  };

  // Deletion Handlers
  const confirmDeletePO = () => {
    if (!poToDelete) return;
    deletePurchaseOrder(poToDelete.id);
    showToast(`Purchase order ${poToDelete.poNumber} has been removed.`);
    setPoToDelete(null);
  };

  const confirmDeletePurchase = () => {
    if (!purchaseToDelete) return;
    deletePurchase(purchaseToDelete.id);
    showToast(`Purchase record #${purchaseToDelete.invoiceNumber} removed. Stock reversed (-${purchaseToDelete.quantity} units) in real time!`);
    setPurchaseToDelete(null);
  };

  const confirmDeleteStockOut = () => {
    if (!stockOutToDelete) return;
    deleteStockOut(stockOutToDelete.id);
    showToast(`Stock Out record (${stockOutToDelete.reason}) reversed. Stock restored (+${stockOutToDelete.quantity} units) in real time!`);
    setStockOutToDelete(null);
  };

  // Export CSV
  const exportLedgerCSV = () => {
    const headers = ['Type', 'Identifier', 'Date', 'Product / Item', 'SKU', 'Qty Change', 'Amount ($)', 'Details'];
    const rows = [
      headers,
      ...purchaseOrders.map(po => [
        `PO_${po.status}`,
        po.poNumber,
        po.orderDate,
        po.items.map(i => `${i.productName} (x${i.quantityOrdered})`).join('; '),
        po.items.map(i => i.sku).join('; '),
        `+${po.totalQuantity}`,
        `-${po.totalAmount.toFixed(2)}`,
        `Supplier: ${po.supplierName} (Status: ${po.status})`,
      ]),
      ...purchases.map(p => [
        'PURCHASE_STOCK_IN',
        p.invoiceNumber,
        p.date,
        p.productName,
        p.sku,
        `+${p.quantity}`,
        `-${p.totalCost.toFixed(2)}`,
        `Supplier: ${p.supplierName}`,
      ]),
      ...stockOuts.map(so => [
        `STOCK_OUT_${so.reason.toUpperCase().replace(/\s+/g, '_')}`,
        so.id,
        so.date,
        so.productName,
        so.sku,
        `-${so.quantity}`,
        `-${so.costImpact.toFixed(2)}`,
        so.notes || so.reason,
      ]),
      ...posSales.map(ps => [
        'POS_SALE_INCOME',
        ps.receiptNumber,
        ps.date,
        ps.items.map(i => i.productName).join('; '),
        '-',
        `-${ps.items.reduce((s, i) => s + i.quantity, 0)}`,
        `+${ps.total.toFixed(2)}`,
        `Customer: ${ps.customerName} (${ps.paymentMethod})`,
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Chan_Shop_Procurement_Stock_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchSearch = 
        !searchFilter ||
        po.poNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
        po.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        po.items.some(i => i.productName.toLowerCase().includes(searchFilter.toLowerCase()) || i.sku.toLowerCase().includes(searchFilter.toLowerCase()));
      
      const matchStatus = 
        poStatusFilter === 'all' || 
        po.status === poStatusFilter;

      return matchSearch && matchStatus;
    });
  }, [purchaseOrders, searchFilter, poStatusFilter]);

  // Selected product for live preview in purchase modal
  const purchaseProduct = products.find(p => p.id === selectedProductId);
  // Selected product for live preview in stock out modal
  const stockOutProduct = products.find(p => p.id === stockOutProductId);

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>Procurement &amp; Stock Movement</span>
            </h2>
            <span className="text-xs font-bold bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300">
              PO &amp; Real-Time Stock
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Issue Purchase Orders, receive supplier consignments (Stock In), record returns/write-offs (Stock Out), with instant inventory synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Clear Old Data Button */}
          <button
            type="button"
            id="btn-clear-accounting-data"
            onClick={() => {
              setClearTarget('stockOuts');
              setIsClearModalOpen(true);
            }}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Clear old purchase stock out (write-offs) or sale income"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Clear Old Data</span>
          </button>

          {/* Export POs Group */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              type="button"
              id="btn-export-pos-pdf"
              onClick={() => {
                exportPurchaseOrdersToPdf(purchaseOrders);
                showToast('Purchase Orders PDF downloaded successfully.');
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Export POs as PDF"
            >
              <FileText className="w-3.5 h-3.5 text-rose-500" />
              <span>PO PDF</span>
            </button>
            <button
              type="button"
              id="btn-export-pos-excel"
              onClick={() => {
                exportPurchaseOrdersToExcel(purchaseOrders);
                showToast('Purchase Orders Excel spreadsheet downloaded successfully.');
              }}
              className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Export POs as Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>PO Excel</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsStockOutModalOpen(true)}
            className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>- Stock Out / Return</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPurchaseModalOpen(true)}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-2xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Direct Stock IN</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPOModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950 text-xs font-extrabold rounded-2xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>+ Create Purchase Order</span>
          </button>
        </div>
      </div>

      {/* Real-time Sync Engine Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <span className="font-bold text-amber-400">⚡ Live Stock Engine Active:</span>{' '}
            <span className="text-slate-200">
              Every Purchase Order received, Stock In recorded, or Stock Out deducted updates the Product Catalog, POS Register, and Online Store in real time.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-slate-300 bg-white/10 px-2.5 py-1 rounded-lg">
            Catalog: <strong>{products.length} SKUs</strong>
          </span>
          <span className="text-[11px] text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
            Total Warehouse Units: <strong>{products.reduce((acc, p) => acc + p.stock, 0)}</strong>
          </span>
        </div>
      </div>

      {/* KPI Cards: Inflow, Outflow, Net Balance, POs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Purchase Orders */}
        <div className="bg-indigo-50/70 border border-indigo-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              Pending Orders (POs)
            </span>
            <div className="p-2 bg-indigo-200/60 text-indigo-800 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-indigo-950">
              {metrics.pendingPOCount}
            </h3>
            <p className="text-xs text-indigo-800 font-semibold mt-1">
              ${metrics.pendingPOValue.toFixed(2)} awaiting consignment receipt
            </p>
          </div>
        </div>

        {/* Purchase Expenses (Stock In) */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Stock In Expenses
            </span>
            <div className="p-2 bg-amber-200/60 text-amber-900 rounded-xl">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-amber-950">
              ${metrics.totalPurchasesCost.toFixed(2)}
            </h3>
            <p className="text-xs text-amber-800 font-semibold mt-1">
              +{metrics.totalUnitsPurchased} units stocked via {purchases.length} invoices
            </p>
          </div>
        </div>

        {/* Stock Out Write-Offs / Returns */}
        <div className="bg-rose-50/70 border border-rose-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">
              Stock Out Losses
            </span>
            <div className="p-2 bg-rose-200/60 text-rose-900 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-rose-950">
              ${metrics.totalStockOutLoss.toFixed(2)}
            </h3>
            <p className="text-xs text-rose-800 font-semibold mt-1">
              -{metrics.totalUnitsStockOut} units written off (damaged/returns)
            </p>
          </div>
        </div>

        {/* Sales Inflow (Income) */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Sales Income (Inflow)
            </span>
            <div className="p-2 bg-emerald-200/60 text-emerald-800 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-950">
              ${metrics.totalIncome.toFixed(2)}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-emerald-700 font-semibold">
              <span>POS: ${metrics.posIncome.toFixed(2)}</span>
              <span>•</span>
              <span>Web: ${metrics.storefrontIncome.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area with Navigation Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Sub Navigation Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('po')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'po'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Purchase Orders (PO)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTab === 'po' ? 'bg-amber-400 text-slate-950' : 'bg-slate-300 text-slate-800'
              }`}>
                {purchaseOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('purchases')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'purchases'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>Purchases (Stock In)</span>
              <span className="text-[10px] bg-slate-900/15 px-1.5 py-0.2 rounded-full font-mono">
                {purchases.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('stockOuts')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stockOuts'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>Stock Out (Write-off)</span>
              <span className="text-[10px] bg-white/30 px-1.5 py-0.2 rounded-full font-mono">
                {stockOuts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              All Movements
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('income')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'income'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>Sales Income</span>
              <span className="text-[10px] bg-white/30 px-1.5 py-0.2 rounded-full font-mono">
                {orders.length + posSales.length}
              </span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeTab === 'po' && (
              <select
                value={poStatusFilter}
                onChange={(e) => setPoStatusFilter(e.target.value)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">All PO Statuses</option>
                <option value="ORDERED">ORDERED (Pending Delivery)</option>
                <option value="RECEIVED">RECEIVED (In Stock)</option>
                <option value="DRAFT">DRAFT Requisitions</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            )}

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by SKU, PO #, item..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* ================= TAB 1: PURCHASE ORDERS ================= */}
        {activeTab === 'po' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">PO Number &amp; Date</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Ordered Items</th>
                  <th className="py-3 px-4 text-center">Total Units</th>
                  <th className="py-3 px-4 text-right">PO Total Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPOs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="font-bold text-sm">No Purchase Orders Found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Click &quot;+ Create Purchase Order&quot; to generate your first supplier procurement requisition.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPOs.map(po => {
                    const isFullyReceived = po.status === 'RECEIVED';
                    return (
                      <tr key={po.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* PO Number & Dates */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-black text-slate-900 text-xs block">
                            {po.poNumber}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Issued: {po.orderDate}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            Expected: <strong className="text-slate-700">{po.expectedDate}</strong>
                          </span>
                        </td>

                        {/* Supplier */}
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            {po.supplierName}
                          </span>
                          {po.supplierPhone && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {po.supplierPhone}
                            </span>
                          )}
                        </td>

                        {/* Items */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="space-y-1">
                            {po.items.map((item, i) => (
                              <div key={i} className="text-[11px] text-slate-700 flex items-center justify-between gap-2">
                                <span className="truncate font-semibold">{item.productName}</span>
                                <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 shrink-0">
                                  {item.quantityReceived || 0}/{item.quantityOrdered}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Units */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-full text-xs">
                            {po.totalQuantity} units
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-black text-slate-900 text-sm block">
                            ${po.totalAmount.toFixed(2)}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {po.paymentStatus}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 text-center">
                          {po.status === 'RECEIVED' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              RECEIVED (IN STOCK)
                            </span>
                          ) : po.status === 'ORDERED' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full text-[10px]">
                              <Clock className="w-3 h-3" />
                              ORDERED (PENDING)
                            </span>
                          ) : po.status === 'DRAFT' ? (
                            <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full text-[10px]">
                              <FileText className="w-3 h-3" />
                              DRAFT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-full text-[10px]">
                              <Ban className="w-3 h-3" />
                              CANCELLED
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Receive Stock In button */}
                            {!isFullyReceived && po.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                onClick={() => setSelectedPOForReceive(po)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                                title="Receive goods into inventory (Stock In)"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Receive Goods</span>
                              </button>
                            )}

                            {/* View Voucher */}
                            <button
                              type="button"
                              onClick={() => setSelectedPOForVoucher(po)}
                              className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                              title="Print / View Purchase Order Voucher"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Toggle status dropdown */}
                            <select
                              value={po.status}
                              onChange={(e) => updatePurchaseOrderStatus(po.id, e.target.value as PurchaseOrderStatus)}
                              className="text-[10px] font-bold bg-slate-100 border border-slate-300 rounded-lg px-1.5 py-1 outline-none cursor-pointer"
                              title="Update Status"
                            >
                              <option value="ORDERED">Ordered</option>
                              <option value="DRAFT">Draft</option>
                              <option value="RECEIVED">Received</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>

                            {/* Delete PO */}
                            <button
                              type="button"
                              onClick={() => setPoToDelete(po)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete Purchase Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 2: PURCHASES (STOCK IN) ================= */}
        {activeTab === 'purchases' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Invoice / Source</th>
                  <th className="py-3 px-4">Product &amp; SKU</th>
                  <th className="py-3 px-4 text-center">Live Current Stock</th>
                  <th className="py-3 px-4 text-center">Stock In Qty</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4">Supplier &amp; Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No purchase stock-in records found.
                    </td>
                  </tr>
                ) : (
                  purchases
                    .filter(p =>
                      !searchFilter ||
                      p.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      p.supplierName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      p.invoiceNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      p.sku.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map(p => {
                      const prod = products.find(pr => pr.id === p.productId);
                      return (
                        <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {p.date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-slate-900 bg-amber-100/70 text-amber-950 px-2 py-0.5 rounded text-[11px]">
                              {p.invoiceNumber}
                            </span>
                            {p.poId && (
                              <span className="block text-[10px] text-indigo-700 font-bold mt-0.5">
                                Link: PO Confirmed
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{p.productName}</p>
                            <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                              <Boxes className="w-3 h-3 text-slate-500" />
                              {prod ? prod.stock : 'N/A'} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              +{p.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-black text-slate-900 block text-xs">
                              -${p.totalCost.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              @ ${p.unitCostPrice.toFixed(2)}/u
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {p.supplierName}
                            </span>
                            {p.notes && <span className="text-[11px] text-slate-400 block">{p.notes}</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setPurchaseToDelete(p)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete & Reverse Stock"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 3: STOCK OUT (WRITE-OFF / SUPPLIER RETURN) ================= */}
        {activeTab === 'stockOuts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reason / Type</th>
                  <th className="py-3 px-4">Product &amp; SKU</th>
                  <th className="py-3 px-4 text-center">Live Current Stock</th>
                  <th className="py-3 px-4 text-center">Deducted Qty</th>
                  <th className="py-3 px-4 text-right">Cost Impact</th>
                  <th className="py-3 px-4">Notes &amp; Recorded By</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockOuts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock out or write-off records found.
                    </td>
                  </tr>
                ) : (
                  stockOuts
                    .filter(so =>
                      !searchFilter ||
                      so.productName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      so.reason.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      so.sku.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map(so => {
                      const prod = products.find(pr => pr.id === so.productId);
                      return (
                        <tr key={so.id} className="hover:bg-rose-50/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                            {so.date}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded text-[10px]">
                              {so.reason}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-900">{so.productName}</p>
                            <span className="text-[10px] font-mono text-slate-400">{so.sku}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
                              <Boxes className="w-3 h-3 text-slate-500" />
                              {prod ? prod.stock : 'N/A'} units
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-black text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                              -{so.quantity}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-black text-rose-700 block text-xs">
                              -${so.costImpact.toFixed(2)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            <span className="font-semibold text-slate-800 block">{so.notes || `Stock Out: ${so.reason}`}</span>
                            <span className="text-[10px] text-slate-400">By: {so.recordedBy}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setStockOutToDelete(so)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                              title="Delete & Restore Stock"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 4: ALL MOVEMENTS (IN & OUT AUDIT) ================= */}
        {activeTab === 'all' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Movement Type</th>
                  <th className="py-3 px-4">Product / Details</th>
                  <th className="py-3 px-4 text-center">Delta</th>
                  <th className="py-3 px-4 text-right">Financial Impact</th>
                  <th className="py-3 px-4">Party / Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Render Purchases (Stock In) */}
                {purchases
                  .filter(p => !searchFilter || p.productName.toLowerCase().includes(searchFilter.toLowerCase()) || p.invoiceNumber.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(p => (
                    <tr key={p.id} className="hover:bg-amber-50/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{p.date}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          STOCK IN (PURCHASE)
                        </span>
                        <span className="block font-mono text-[10px] text-slate-400 mt-0.5">{p.invoiceNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{p.productName}</p>
                        <span className="font-mono text-[10px] text-slate-400">{p.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          +{p.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-slate-900">-${p.totalCost.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        <span className="font-bold text-slate-800">{p.supplierName}</span>
                      </td>
                    </tr>
                  ))}

                {/* Render Stock Outs */}
                {stockOuts
                  .filter(so => !searchFilter || so.productName.toLowerCase().includes(searchFilter.toLowerCase()) || so.reason.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(so => (
                    <tr key={so.id} className="hover:bg-rose-50/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{so.date}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          <ArrowDownLeft className="w-3 h-3" />
                          STOCK OUT ({so.reason})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{so.productName}</p>
                        <span className="font-mono text-[10px] text-slate-400">{so.sku}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          -{so.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-rose-700">-${so.costImpact.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        <span>{so.notes || so.reason}</span>
                      </td>
                    </tr>
                  ))}

                {/* Render POS Sales Outflow */}
                {posSales
                  .filter(ps => !searchFilter || ps.receiptNumber.toLowerCase().includes(searchFilter.toLowerCase()) || ps.customerName.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(ps => (
                    <tr key={ps.id} className="hover:bg-emerald-50/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{ps.date}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded text-[10px] inline-flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          POS SALE (OUTFLOW)
                        </span>
                        <span className="block font-mono text-[10px] text-slate-400 mt-0.5">{ps.receiptNumber}</span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">{ps.items.map(i => i.productName).join(', ')}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          -{ps.items.reduce((s, i) => s + i.quantity, 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-emerald-700">+${ps.total.toFixed(2)}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-xs">
                        <span>{ps.customerName} ({ps.paymentMethod})</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 5: SALES REVENUE (INFLOW) ================= */}
        {activeTab === 'income' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Source / Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4 text-center">Items Count</th>
                  <th className="py-3 px-4 text-right">Revenue Inflow</th>
                  <th className="py-3 px-4">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posSales.map(ps => (
                  <tr key={ps.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{ps.date}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded text-[11px]">
                        {ps.receiptNumber}
                      </span>
                      <span className="block text-[10px] text-slate-400">POS Register</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{ps.customerName}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">{ps.items.length}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 font-mono">+${ps.total.toFixed(2)}</td>
                    <td className="py-3 px-4 font-bold uppercase text-[10px] text-slate-600">{ps.paymentMethod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================= DIRECT PURCHASE (STOCK IN) MODAL ================= */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-400 text-slate-950 rounded-xl shadow-xs">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Direct Stock In (Purchase)</h3>
                  <p className="text-xs text-slate-300">Increase product inventory with supplier invoice</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPurchase} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {purchaseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{purchaseError}</span>
                </div>
              )}

              {/* Product Selector with Live Stock Badge */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    Product To Stock In *
                  </label>
                  {purchaseProduct && (
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Current Stock: {purchaseProduct.stock} units
                    </span>
                  )}
                </div>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelectForPurchase(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                  required
                >
                  <option value="">-- Select Product From Catalog --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Current Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Supplier & Invoice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shenzhen Acoustics Co."
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Invoice / Receipt # *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-2026-092"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium font-mono outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Quantity and Unit Cost Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity Received (Stock In) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Unit Cost Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitCostPrice}
                    onChange={(e) => setUnitCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Real-time stock impact preview */}
              {purchaseProduct && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                      Real-Time Stock Projection
                    </span>
                    <div className="inline-flex items-center gap-1.5 font-bold font-mono text-xs text-emerald-950 mt-0.5">
                      <span>Current: {purchaseProduct.stock}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-black">
                        New Stock: {purchaseProduct.stock + purchaseQuantity} units
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Expense</span>
                    <span className="font-mono font-black text-emerald-950 text-sm">
                      ${(purchaseQuantity * unitCostPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Shipment Tracking
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Cleared customs, quality inspection passed"
                  value={purchaseNotes}
                  onChange={(e) => setPurchaseNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-amber-400 text-white hover:text-slate-950 rounded-xl font-black shadow-sm transition-all cursor-pointer"
                >
                  Confirm Stock IN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= STOCK OUT (WRITE-OFF / SUPPLIER RETURN) MODAL ================= */}
      {isStockOutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-rose-900 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500 text-white rounded-xl shadow-xs">
                  <ArrowDownLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg">Stock Out / Supplier Return</h3>
                  <p className="text-xs text-rose-200">Deduct inventory with real-time stock adjustment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStockOutModalOpen(false)}
                className="p-1.5 text-rose-300 hover:text-white hover:bg-rose-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordStockOut} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              {stockOutError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{stockOutError}</span>
                </div>
              )}

              {/* Product Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700 uppercase tracking-wider">
                    Select Product *
                  </label>
                  {stockOutProduct && (
                    <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      Current Stock: {stockOutProduct.stock} units
                    </span>
                  )}
                </div>
                <select
                  value={stockOutProductId}
                  onChange={(e) => setStockOutProductId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-rose-500"
                  required
                >
                  <option value="">-- Select Product From Catalog --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.sku}] {p.name} (Available: {p.stock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity and Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quantity to Deduct *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={stockOutProduct?.stock || 999}
                    value={stockOutQuantity}
                    onChange={(e) => setStockOutQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold font-mono outline-none focus:border-rose-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reason / Category *
                  </label>
                  <select
                    value={stockOutReason}
                    onChange={(e) => setStockOutReason(e.target.value as StockOutRecord['reason'])}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-rose-500"
                  >
                    <option value="Supplier Return">Supplier Return / Defective Batch</option>
                    <option value="Damaged">Damaged in Transit/Storage</option>
                    <option value="Sample / Gift">Customer Sample / Gift</option>
                    <option value="Internal Use">Store / Office Internal Use</option>
                    <option value="Expired">Expired / Obsolete</option>
                    <option value="Lost / Theft">Missing / Discrepancy</option>
                    <option value="Other">Other Adjustment</option>
                  </select>
                </div>
              </div>

              {/* Real-time stock impact preview */}
              {stockOutProduct && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-rose-800 block">
                      Real-Time Stock Projection
                    </span>
                    <div className="inline-flex items-center gap-1.5 font-bold font-mono text-xs text-rose-950 mt-0.5">
                      <span>Current: {stockOutProduct.stock}</span>
                      <ArrowRight className="w-3 h-3 text-rose-600" />
                      <span className="text-rose-700 font-black">
                        New Stock: {Math.max(0, stockOutProduct.stock - stockOutQuantity)} units
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-rose-800 block">Cost Impact</span>
                    <span className="font-mono font-black text-rose-950 text-sm">
                      -${(stockOutQuantity * stockOutProduct.costPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Reason Details / Supplier Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Returned to supplier due to broken seal, RMA credit issued"
                  value={stockOutNotes}
                  onChange={(e) => setStockOutNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStockOutModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-sm cursor-pointer"
                >
                  Confirm Stock Out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE PURCHASE ORDER ================= */}
      <PurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
      />

      {/* ================= MODAL: RECEIVE GOODS (PURCHASE IN) ================= */}
      <ReceivePOModal
        po={selectedPOForReceive}
        isOpen={!!selectedPOForReceive}
        onClose={() => setSelectedPOForReceive(null)}
        onSuccessNotice={(msg) => showToast(msg)}
      />

      {/* ================= MODAL: PO PRINTABLE VOUCHER ================= */}
      <PurchaseOrderVoucherModal
        po={selectedPOForVoucher}
        isOpen={!!selectedPOForVoucher}
        onClose={() => setSelectedPOForVoucher(null)}
      />

      {/* ================= CUSTOM CONFIRM MODAL: DELETE PO ================= */}
      {poToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Delete Purchase Order</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to delete purchase order <strong>{poToDelete.poNumber}</strong> ({poToDelete.supplierName})?
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPoToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePO}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black cursor-pointer shadow-sm"
              >
                Delete PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM CONFIRM MODAL: DELETE PURCHASE (REVERSE STOCK) ================= */}
      {purchaseToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2 bg-rose-100 rounded-xl">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Reverse Purchase Record</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Deleting invoice <strong>#{purchaseToDelete.invoiceNumber}</strong> for <strong>{purchaseToDelete.productName}</strong> will automatically <strong>deduct {purchaseToDelete.quantity} units</strong> from your inventory in real time to balance stock.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPurchaseToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePurchase}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black cursor-pointer shadow-sm"
              >
                Reverse &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM CONFIRM MODAL: DELETE STOCK OUT (RESTORE STOCK) ================= */}
      {stockOutToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <RotateCcw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Restore Stock Out Record</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Deleting this adjustment record for <strong>{stockOutToDelete.productName}</strong> ({stockOutToDelete.reason}) will <strong>restore +{stockOutToDelete.quantity} units</strong> back into your warehouse inventory in real time.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStockOutToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStockOut}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black cursor-pointer shadow-sm"
              >
                Restore &amp; Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM CONFIRM MODAL: CLEAR OLD ACCOUNTING / WRITE-OFF / SALE DATA ================= */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Clear Old Accounting Data</h3>
                <p className="text-xs text-slate-500">Purge old purchase stock out (write-offs) or sale income records.</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* Option: Stock Out Write-off */}
              <label 
                onClick={() => setClearTarget('stockOuts')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearTarget === 'stockOuts' 
                    ? 'border-rose-500 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearAccountingTarget" 
                    checked={clearTarget === 'stockOuts'} 
                    onChange={() => setClearTarget('stockOuts')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Stock Out (Write-Off) Records</span>
                    <span className="text-[11px] text-slate-500">Clear past write-offs, damages, and expired consignment write-down logs.</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md shrink-0">
                  {stockOuts.length} records
                </span>
              </label>

              {/* Option: Sale Income */}
              <label 
                onClick={() => setClearTarget('income')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearTarget === 'income' 
                    ? 'border-rose-500 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearAccountingTarget" 
                    checked={clearTarget === 'income'} 
                    onChange={() => setClearTarget('income')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Sale Income (POS &amp; Orders)</span>
                    <span className="text-[11px] text-slate-500">Purge recorded customer sale revenue from POS register and web orders.</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md shrink-0">
                  {posSales.length + orders.length} records
                </span>
              </label>

              {/* Option: Purchase Stock In */}
              <label 
                onClick={() => setClearTarget('purchases')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearTarget === 'purchases' 
                    ? 'border-rose-500 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearAccountingTarget" 
                    checked={clearTarget === 'purchases'} 
                    onChange={() => setClearTarget('purchases')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Purchase Stock In Records</span>
                    <span className="text-[11px] text-slate-500">Purge direct supplier purchasing and invoice transaction logs.</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                  {purchases.length} records
                </span>
              </label>

              {/* Option: Purge All */}
              <label 
                onClick={() => setClearTarget('all')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearTarget === 'all' 
                    ? 'border-rose-600 bg-rose-100/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearAccountingTarget" 
                    checked={clearTarget === 'all'} 
                    onChange={() => setClearTarget('all')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-rose-900 block">Purge All (Purchases, Write-Offs, Sales)</span>
                    <span className="text-[11px] text-rose-700">Completely wipes historical accounting without touching catalog products.</span>
                  </div>
                </div>
                <span className="text-[10px] uppercase font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-md shrink-0">
                  Full Reset
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                id="cancel-clear-accounting-btn"
                onClick={() => {
                  setIsClearModalOpen(false);
                  setClearTarget('stockOuts');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-clear-accounting-btn"
                onClick={() => {
                  if (clearTarget === 'stockOuts') {
                    clearStockOuts();
                    showToast('Old Stock Out (Write-off) records cleared.');
                  } else if (clearTarget === 'income') {
                    clearSalesIncome();
                    showToast('Old Sales Income (POS & Orders) cleared.');
                  } else if (clearTarget === 'purchases') {
                    clearPurchases();
                    showToast('Old Purchase In records cleared.');
                  } else if (clearTarget === 'all') {
                    clearAllAccountingRecords();
                    showToast('All accounting, write-off, and sales income records purged.');
                  }
                  setIsClearModalOpen(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Confirm &amp; Clear Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
