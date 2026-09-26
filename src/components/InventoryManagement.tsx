import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, ProductCategory, FulfillmentStatus } from '../types';
import { 
  Boxes, 
  Plus, 
  Search, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  PackageCheck, 
  PackageX, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  ArrowUpDown, 
  History, 
  ReceiptText, 
  Sliders, 
  Phone, 
  Download, 
  Check, 
  X, 
  ChevronRight,
  Truck,
  Barcode,
  Layers,
  Sparkles,
  RefreshCw,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Scale,
  Camera,
  Calendar,
  ShieldAlert,
  ChevronDown,
  Tag,
  AlignLeft,
  Eye,
  Copy,
  ChevronUp,
  ListOrdered
} from 'lucide-react';
import { ProductImageUploader } from './ProductImageUploader';
import { CategoryManagerModal } from './CategoryManagerModal';
import { PurchaseAccountingView } from './PurchaseAccountingView';
import { CameraBarcodeScannerModal } from './CameraBarcodeScannerModal';
import { ProductDescriptionViewerModal } from './ProductDescriptionViewerModal';
import { parseProductDescription, DESCRIPTION_TEMPLATES } from '../utils/descriptionFormatter';
import {
  exportInventoryToPdf,
  exportInventoryToExcel,
  exportOrdersToPdf,
  exportOrdersToExcel,
  exportPurchaseOrdersToPdf,
  exportPurchaseOrdersToExcel,
  exportTransactionsToPdf,
  exportTransactionsToExcel,
  exportDailySalesReportToPdf,
  exportDailySalesReportToExcel,
  computeDailySales,
} from '../utils/exportUtils';

export const InventoryManagement: React.FC = () => {
  const { 
    products, 
    orders, 
    inventoryLogs, 
    categories,
    purchases,
    stockOuts,
    purchaseOrders,
    posSales,
    settings, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    adjustStock, 
    updateOrderStatus, 
    updateOrderDiscount,
    deleteOrder,
    updateSettings, 
    resetToDefaults,
    setActiveView,
    clearPurchases,
    clearStockOuts,
    clearSalesIncome,
    clearAllAccountingRecords
  } = useStore();

  const [activeTab, setActiveTab] = useState<'inventory' | 'orders' | 'purchases' | 'logs' | 'settings'>('inventory');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Order Discount Adjustment state
  const [editingDiscountOrderId, setEditingDiscountOrderId] = useState<string | null>(null);
  const [adjustedDiscountValue, setAdjustedDiscountValue] = useState<number>(0);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBarcodeCameraOpen, setIsBarcodeCameraOpen] = useState(false);

  // In-app deletion and reset confirmation states
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [deleteSuccessToast, setDeleteSuccessToast] = useState<string | null>(null);

  // Clear Accounting Data Modal States
  const [isClearDataModalOpen, setIsClearDataModalOpen] = useState(false);
  const [clearDataType, setClearDataType] = useState<'purchases' | 'stockOuts' | 'sales' | 'all' | null>(null);
  
  // Daily Sales Report Modal
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const showExportNotice = (msg: string) => {
    setExportNotice(msg);
    setTimeout(() => setExportNotice(null), 3500);
  };

  // Description view & inspect state for Inventory table
  const [descriptionViewMode, setDescriptionViewMode] = useState<'compact' | 'detailed'>('compact');
  const [expandedDescProductIds, setExpandedDescProductIds] = useState<Set<string>>(new Set());
  const [selectedProductForDescModal, setSelectedProductForDescModal] = useState<Product | null>(null);

  // Add / Edit Product Description Tab state
  const [formDescTab, setFormDescTab] = useState<'write' | 'preview'>('write');

  const toggleProductDescExpand = (productId: string) => {
    setExpandedDescProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formWeight, setFormWeight] = useState<number | ''>('');
  const [formWeightUnit, setFormWeightUnit] = useState<'kg' | 'g' | 'lb' | 'oz' | 'ml' | 'L'>('kg');
  const [formCategory, setFormCategory] = useState<ProductCategory>('Smartphones & Tech');
  const [formPrice, setFormPrice] = useState<number | ''>(25.0);
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | ''>(35.0);
  const [formCostPrice, setFormCostPrice] = useState<number | ''>(15.0);
  const [formStock, setFormStock] = useState<number | ''>(20);
  const [formThreshold, setFormThreshold] = useState<number | ''>(5);
  const [formDescription, setFormDescription] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [productFormError, setProductFormError] = useState<string | null>(null);

  // Quick Restock state
  const [inlineAdjustId, setInlineAdjustId] = useState<string | null>(null);
  const [customAdjustVal, setCustomAdjustVal] = useState<number>(10);

  // Daily Sales Aggregate calculation for Reports
  const dailySalesData = useMemo(() => {
    return computeDailySales(posSales || [], orders || [], products || []);
  }, [posSales, orders, products]);
  const dailyList = dailySalesData?.dailyList || [];

  // Inventory KPI Metrics
  const totalProducts = products.length;
  const totalUnits = useMemo(() => products.reduce((acc, p) => acc + p.stock, 0), [products]);
  const totalRetailValue = useMemo(() => products.reduce((acc, p) => acc + (p.price * p.stock), 0), [products]);
  const totalCostValue = useMemo(() => products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0), [products]);
  
  const lowStockItems = useMemo(() => 
    products.filter(p => p.stock > 0 && p.stock <= p.lowStockThreshold),
    [products]
  );
  
  const outOfStockItems = useMemo(() => 
    products.filter(p => p.stock <= 0),
    [products]
  );

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchFilter.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();

      let matchesStatus = true;
      if (statusFilter === 'in-stock') matchesStatus = p.stock > p.lowStockThreshold;
      if (statusFilter === 'low-stock') matchesStatus = p.stock > 0 && p.stock <= p.lowStockThreshold;
      if (statusFilter === 'out-of-stock') matchesStatus = p.stock <= 0;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchFilter, categoryFilter, statusFilter]);

  // Open Edit Modal with existing data
  const handleOpenEdit = (p: Product) => {
    setProductFormError(null);
    setEditingProduct(p);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormBarcode(p.barcode || '');
    setFormWeight(p.weight !== undefined ? p.weight : '');
    setFormWeightUnit(p.weightUnit || 'kg');
    setFormCategory(p.category);
    setFormPrice(p.price);
    setFormOriginalPrice(p.originalPrice || p.price);
    setFormCostPrice(p.costPrice);
    setFormStock(p.stock);
    setFormThreshold(p.lowStockThreshold);
    setFormDescription(p.description);
    setFormImages(p.images && p.images.length > 0 ? p.images : []);
    setIsAddModalOpen(true);
  };

  const handleOpenAdd = () => {
    setProductFormError(null);
    setEditingProduct(null);
    setFormName('');
    const randomSkuNum = Math.floor(100 + Math.random() * 900);
    setFormSku(`COS-NEW-${randomSkuNum}`);
    setFormBarcode('');
    setFormWeight('');
    setFormWeightUnit('kg');
    setFormCategory(categories[0] || 'Smartphones & Tech');
    setFormPrice(29.0);
    setFormOriginalPrice(39.0);
    setFormCostPrice(16.0);
    setFormStock(25);
    setFormThreshold(5);
    setFormDescription('');
    setFormImages([]);
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    if (!formName.trim()) {
      setProductFormError('Please enter a Product Name.');
      return;
    }

    if (!formSku.trim()) {
      setProductFormError('Please enter a valid SKU Code.');
      return;
    }

    const priceNum = formPrice === '' || isNaN(Number(formPrice)) ? 0 : Number(formPrice);
    const origPriceNum = formOriginalPrice !== '' && !isNaN(Number(formOriginalPrice)) ? Number(formOriginalPrice) : undefined;
    const costPriceNum = formCostPrice === '' || isNaN(Number(formCostPrice)) ? 0 : Number(formCostPrice);
    const stockNum = formStock === '' || isNaN(Number(formStock)) ? 0 : Number(formStock);
    const thresholdNum = formThreshold === '' || isNaN(Number(formThreshold)) ? 5 : Number(formThreshold);

    const payload = {
      name: formName.trim(),
      sku: formSku.trim(),
      barcode: formBarcode.trim() || undefined,
      weight: formWeight !== '' && !isNaN(Number(formWeight)) ? Number(formWeight) : undefined,
      weightUnit: formWeight !== '' ? formWeightUnit : undefined,
      category: formCategory,
      price: priceNum,
      originalPrice: origPriceNum,
      costPrice: costPriceNum,
      stock: stockNum,
      lowStockThreshold: thresholdNum,
      description: formDescription.trim() || 'Premium product available at Chan Online Shop.',
      images: formImages.length > 0 ? formImages : [
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=800&q=80'
      ],
      rating: editingProduct ? editingProduct.rating : 5.0,
      reviewsCount: editingProduct ? editingProduct.reviewsCount : 1,
    };

    if (editingProduct) {
      updateProduct(editingProduct.id, payload);
      showExportNotice(`Product "${payload.name}" updated successfully.`);
    } else {
      addProduct(payload);
      // Reset filter so newly created product is instantly visible to the user!
      setSearchFilter('');
      setCategoryFilter('all');
      setStatusFilter('all');
      showExportNotice(`Product "${payload.name}" added to inventory successfully!`);
    }

    setIsAddModalOpen(false);
    setEditingProduct(null);
    setProductFormError(null);
  };

  // Clear Accounting and Historical Data Handlers
  const handleConfirmClearData = () => {
    if (!clearDataType) return;

    if (clearDataType === 'purchases') {
      clearPurchases();
      showExportNotice('Old Purchase In records cleared successfully.');
    } else if (clearDataType === 'stockOuts') {
      clearStockOuts();
      showExportNotice('Old Stock Out (Write-off) records cleared successfully.');
    } else if (clearDataType === 'sales') {
      clearSalesIncome();
      showExportNotice('Old Sales Income (POS & Orders) cleared successfully.');
    } else if (clearDataType === 'all') {
      clearAllAccountingRecords();
      showExportNotice('All accounting, write-offs, and sales income cleared.');
    }

    setIsClearDataModalOpen(false);
    setClearDataType(null);
  };

  const handleExportJson = () => {
    const data = {
      shop: settings,
      products,
      orders,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chan-online-shop-inventory-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Sub-navigation */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-700">
              <Boxes className="w-5 h-5" />
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Product Inventory &amp; Order Operations
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time catalog control, threshold warning alerts, stock restock and order dispatch for <strong>{settings.shopName}</strong> (Hotline: {settings.phone}).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveView('shop')}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            ← View Store
          </button>

          {/* CLEAR OLD DATA MODAL TRIGGER BUTTON */}
          <button
            id="btn-clear-old-data"
            onClick={() => {
              setClearDataType('stockOuts');
              setIsClearDataModalOpen(true);
            }}
            className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-2.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Clear old purchase stock out (write-offs) or sale income"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Clear Old Data</span>
          </button>

          {/* ALL DATA EXPORT HUB & DAILY SALES REPORT MODAL TRIGGER */}
          <button
            id="btn-export-center-hub"
            onClick={() => setIsDailyReportModalOpen(true)}
            className="text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="Export all data as PDF & Excel (Inventory, Orders, POs, Transactions, Daily Sales)"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Export Center (PDF/Excel)</span>
          </button>

          <button
            id="btn-manage-categories-header"
            onClick={() => setIsCategoryModalOpen(true)}
            className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-2.5 rounded-xl shadow-2xs flex items-center gap-1.5 transition-all"
            title="Add or manage product categories"
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>Categories ({categories.length})</span>
          </button>

          <button
            id="inventory-add-product-button"
            onClick={() => handleOpenAdd()}
            className="text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total SKUs */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Products</span>
            <Boxes className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalProducts}</p>
          <p className="text-[11px] text-slate-400 mt-1">Active Catalog SKUs</p>
        </div>

        {/* Total Stock Units */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stock Units</span>
            <PackageCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalUnits}</p>
          <p className="text-[11px] text-slate-400 mt-1">Available in warehouse</p>
        </div>

        {/* Inventory Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Retail Value</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">${totalRetailValue.toFixed(0)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Cost: ${totalCostValue.toFixed(0)}</p>
        </div>

        {/* Low Stock Alert */}
        <div 
          onClick={() => {
            setActiveTab('inventory');
            setStatusFilter('low-stock');
          }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            lowStockItems.length > 0 
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400' 
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Alert</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{lowStockItems.length}</p>
          <p className="text-[11px] text-amber-700 mt-1">Click to filter items</p>
        </div>

        {/* Out of Stock */}
        <div 
          onClick={() => {
            setActiveTab('inventory');
            setStatusFilter('out-of-stock');
          }}
          className={`p-4 sm:p-5 rounded-2xl border shadow-xs cursor-pointer transition-all ${
            outOfStockItems.length > 0 
              ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400' 
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Out of Stock</span>
            <PackageX className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-900">{outOfStockItems.length}</p>
          <p className="text-[11px] text-rose-700 mt-1">Requires reorder</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          id="inventory-tab-btn"
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'inventory' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Boxes className="w-3.5 h-3.5" />
          <span>Product Catalog</span>
          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded text-[10px]">
            {products.length}
          </span>
        </button>

        <button
          id="purchases-accounting-tab-btn"
          onClick={() => setActiveTab('purchases')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'purchases' 
              ? 'bg-amber-400 text-slate-950 shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span>Purchase Orders &amp; Stock In/Out</span>
          <span className="bg-slate-800/15 text-slate-900 px-1.5 py-0.2 rounded text-[10px] font-bold">
            POs: {purchaseOrders.length} | In/Out
          </span>
        </button>

        <button
          id="orders-tab-btn"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'orders' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ReceiptText className="w-3.5 h-3.5" />
          <span>Customer Orders</span>
          <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded text-[10px]">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'logs' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Stock Movement Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'settings' 
              ? 'bg-slate-900 text-white shadow-xs' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Shop &amp; Hotline Config</span>
        </button>
      </div>

      {/* TAB 1: INVENTORY TABLE */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search SKU, product title..."
                className="w-full text-xs pl-9 pr-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none font-medium"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map((cat) => (
                  <option key={`inv-cat-filter-${cat}`} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
              >
                <option value="all">All Stock Statuses</option>
                <option value="in-stock">Healthy Stock</option>
                <option value="low-stock">Low Stock (≤ Threshold)</option>
                <option value="out-of-stock">Out of Stock (0 units)</option>
              </select>

              {(searchFilter || categoryFilter !== 'all' || statusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchFilter('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                  className="text-xs text-rose-600 font-semibold px-2 py-1 hover:underline cursor-pointer"
                >
                  Reset filters
                </button>
              )}

              {/* Quick Export Inventory PDF & Excel */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <button
                  type="button"
                  id="btn-export-inventory-pdf"
                  onClick={() => {
                    exportInventoryToPdf(filteredProducts);
                    showExportNotice('Inventory PDF downloaded successfully.');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Export Inventory as PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  id="btn-export-inventory-excel"
                  onClick={() => {
                    exportInventoryToExcel(filteredProducts);
                    showExportNotice('Inventory Excel spreadsheet downloaded successfully.');
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Export Inventory as Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel</span>
                </button>
              </div>

              {/* Description Arrangement Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                  <AlignLeft className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Descriptions:</span>
                </span>
                <button
                  type="button"
                  id="btn-desc-view-compact"
                  onClick={() => setDescriptionViewMode('compact')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    descriptionViewMode === 'compact'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Standard compact snippet with one-click full specs viewer"
                >
                  Standard
                </button>
                <button
                  type="button"
                  id="btn-desc-view-detailed"
                  onClick={() => setDescriptionViewMode('detailed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    descriptionViewMode === 'detailed'
                      ? 'bg-white text-amber-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Show full multi-line description and specifications directly in table"
                >
                  Detailed Specs
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[10px] text-slate-500 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Product Info</th>
                    <th className="py-3.5 px-4">SKU / Category</th>
                    <th className="py-3.5 px-4">Price / Cost</th>
                    <th className="py-3.5 px-4">Stock Level</th>
                    <th className="py-3.5 px-4">Stock Status</th>
                    <th className="py-3.5 px-4 text-center">Quick Restock</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <div className="max-w-sm mx-auto flex flex-col items-center">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mb-3 shadow-2xs">
                            <Boxes className="w-6 h-6" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 mb-1">No products found</h4>
                          <p className="text-xs text-slate-400 mb-4">
                            {searchFilter || categoryFilter !== 'all' || statusFilter !== 'all'
                              ? 'No products match your active search or filters.'
                              : 'Your inventory catalog is currently empty. Add your first item below.'}
                          </p>
                          <div className="flex items-center gap-2">
                            {(searchFilter || categoryFilter !== 'all' || statusFilter !== 'all') && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchFilter('');
                                  setCategoryFilter('all');
                                  setStatusFilter('all');
                                }}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                              >
                                Reset Filters
                              </button>
                            )}
                            <button
                              type="button"
                              id="empty-state-add-product-btn"
                              onClick={handleOpenAdd}
                              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Add New Product</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map(p => {
                      const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
                      const isZero = p.stock <= 0;
                      const isRowExpanded = expandedDescProductIds.has(p.id);
                      const isDetailedMode = descriptionViewMode === 'detailed';
                      const showFullDesc = isRowExpanded || isDetailedMode;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors align-top">
                          {/* Product Info & Arranged Description */}
                          <td className="py-3.5 px-4 min-w-[280px] max-w-md">
                            <div className="flex items-start gap-3">
                              {/* Product Thumbnail with Contain Fit */}
                              <div 
                                onClick={() => setSelectedProductForDescModal(p)}
                                className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer group/thumb"
                                title="Click to inspect full description & specifications"
                              >
                                <img
                                  src={p.images[0]}
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-contain group-hover/thumb:scale-105 transition-transform"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                {/* Title & Brand */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p 
                                    onClick={() => setSelectedProductForDescModal(p)}
                                    className="font-bold text-slate-900 text-xs hover:text-amber-700 transition-colors cursor-pointer leading-snug line-clamp-1"
                                    title={p.name}
                                  >
                                    {p.name}
                                  </p>
                                  {p.brand && (
                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {p.brand}
                                    </span>
                                  )}
                                </div>

                                {/* Arranged Description Section */}
                                {showFullDesc ? (
                                  /* Detailed Multi-Line Description Block */
                                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200/90 text-slate-700 text-xs shadow-2xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                        <AlignLeft className="w-3 h-3 text-amber-600" />
                                        <span>Description &amp; Specs</span>
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => toggleProductDescExpand(p.id)}
                                        className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                                        title="Collapse description"
                                      >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                      </button>
                                    </div>

                                    <p className="text-[11px] text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                                      {p.description || 'No description provided.'}
                                    </p>

                                    {/* Features Badges */}
                                    {p.features && p.features.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-slate-200/70">
                                        {p.features.slice(0, 4).map((feat, fIdx) => (
                                          <span key={fIdx} className="text-[10px] bg-white text-emerald-800 border border-emerald-200/80 px-1.5 py-0.5 rounded font-medium">
                                            ✓ {feat}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/70 text-[10px]">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedProductForDescModal(p)}
                                        className="text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                                      >
                                        <Eye className="w-3 h-3" />
                                        <span>Inspect &amp; Quick Edit</span>
                                      </button>
                                      <span className="text-slate-400 font-mono">
                                        {p.description ? `${p.description.length} chars` : ''}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  /* Clean Compact Arranged Snippet */
                                  <div 
                                    onClick={() => setSelectedProductForDescModal(p)}
                                    className="mt-1.5 flex items-center justify-between gap-2 p-1.5 bg-slate-50 hover:bg-amber-50/60 rounded-lg border border-slate-200/80 hover:border-amber-300 transition-all cursor-pointer group/desc"
                                    title="Click to view full description and specifications"
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <AlignLeft className="w-3 h-3 text-amber-600 shrink-0" />
                                      <span className="text-[11px] text-slate-600 group-hover/desc:text-slate-900 font-normal truncate">
                                        {p.description || 'No description provided.'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-100 group-hover/desc:bg-amber-200 px-1.5 py-0.5 rounded transition-colors">
                                        Specs
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleProductDescExpand(p.id);
                                        }}
                                        className="text-slate-400 hover:text-slate-700 p-0.5"
                                        title="Expand description preview"
                                      >
                                        <ChevronDown className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* SKU, Barcode & Category */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {p.sku}
                              </span>
                            </div>
                            {p.barcode ? (
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5" title="Barcode / EAN">
                                <Barcode className="w-3 h-3 text-slate-400" />
                                <span>{p.barcode}</span>
                              </div>
                            ) : null}
                            <p className="text-[11px] text-indigo-600 font-medium mt-0.5">{p.category}</p>
                          </td>

                          {/* Price */}
                          <td className="py-3 px-4">
                            <p className="font-extrabold text-slate-900">${p.price.toFixed(2)}</p>
                            <p className="text-[11px] text-slate-400">Cost: ${p.costPrice.toFixed(2)}</p>
                          </td>

                          {/* Stock Level */}
                          <td className="py-3 px-4">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-black text-sm text-slate-900">{p.stock}</span>
                              <span className="text-[11px] text-slate-400">units</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Alert at &le; {p.lowStockThreshold}</p>
                          </td>

                          {/* Stock Status */}
                          <td className="py-3 px-4">
                            {isZero ? (
                              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                <PackageX className="w-3 h-3" /> Out of Stock
                              </span>
                            ) : isLow ? (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> Low Stock ({p.stock})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                                <PackageCheck className="w-3 h-3" /> Good ({p.stock})
                              </span>
                            )}
                          </td>

                          {/* Quick Restock Buttons */}
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                              <button
                                onClick={() => adjustStock(p.id, 5, 'Quick Restock +5')}
                                className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold rounded-lg shadow-2xs text-[10px] transition-colors"
                                title="Add 5 units to stock"
                              >
                                +5
                              </button>
                              <button
                                onClick={() => adjustStock(p.id, 10, 'Quick Restock +10')}
                                className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold rounded-lg shadow-2xs text-[10px] transition-colors"
                                title="Add 10 units to stock"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => adjustStock(p.id, -1, 'Quick Adjustment -1')}
                                disabled={p.stock <= 0}
                                className="px-2 py-1 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold rounded-lg shadow-2xs text-[10px] transition-colors disabled:opacity-40"
                                title="Reduce 1 unit"
                              >
                                -1
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Edit Product details"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                id={`delete-product-${p.id}`}
                                onClick={() => setProductToDelete(p)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Product"
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
          </div>
        </div>
      )}

      {/* TAB: PURCHASES & CASHFLOW (IN/OUT) */}
      {activeTab === 'purchases' && (
        <PurchaseAccountingView />
      )}

      {/* TAB 2: ORDERS MANAGEMENT */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">Customer Orders Received</h3>
                <p className="text-xs text-slate-500">Track and dispatch customer orders placed via the checkout.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {orders.length} total orders
                </span>
                <button
                  type="button"
                  id="btn-export-orders-pdf"
                  onClick={() => {
                    exportOrdersToPdf(orders);
                    showExportNotice('Orders PDF report exported successfully.');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export Orders as PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  id="btn-export-orders-excel"
                  onClick={() => {
                    exportOrdersToExcel(orders);
                    showExportNotice('Orders Excel spreadsheet exported successfully.');
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Export Orders as Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Excel</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {orders.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  No orders placed yet. As customers check out, their orders appear here in real-time.
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="p-5 hover:bg-slate-50/60 transition-colors space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                          {order.id}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(order.date).toLocaleString()}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          order.paymentStatus === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </div>

                      {/* Status Selector */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-600">Fulfillment:</span>
                        <select
                          value={order.fulfillmentStatus}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as FulfillmentStatus)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg border outline-none ${
                            order.fulfillmentStatus === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : order.fulfillmentStatus === 'Shipped'
                              ? 'bg-sky-50 text-sky-700 border-sky-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          <option value="Pending">Pending Dispatch</option>
                          <option value="Processing">Processing / Packed</option>
                          <option value="Shipped">Shipped / In Transit</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        <button
                          id={`delete-order-${order.id}`}
                          onClick={() => setOrderToDelete(order.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer ml-1"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Customer & Items Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-white p-3.5 rounded-2xl border border-slate-200">
                      <div>
                        <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">Customer Details</p>
                        <p className="font-bold text-slate-900">{order.customer.fullName}</p>
                        <p className="text-slate-600 font-semibold flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-amber-600" />
                          <span>{order.customer.phoneNumber}</span>
                        </p>
                        <p className="text-slate-500 mt-1">{order.customer.address}, {order.customer.city}</p>
                      </div>

                      <div className="md:col-span-2">
                        <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider mb-1">
                          Purchased Items &amp; Gateway
                        </p>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-slate-700">
                              <span>• {item.productName} (Qty: {item.quantity})</span>
                              <span className="font-mono font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5">
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Subtotal:</span>
                            <span className="font-mono text-slate-800 font-semibold">${order.subtotal.toFixed(2)}</span>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 flex items-center gap-1.5">
                              <span>Discount:</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDiscountOrderId(editingDiscountOrderId === order.id ? null : order.id);
                                  setAdjustedDiscountValue(order.discount || 0);
                                }}
                                className="text-[10px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                {editingDiscountOrderId === order.id ? 'Close' : 'Adjust Amount'}
                              </button>
                            </span>
                            <span className="font-mono font-bold text-emerald-600">
                              {order.discount && order.discount > 0 ? `-$${order.discount.toFixed(2)}` : '$0.00'}
                            </span>
                          </div>

                          {/* Inline Discount Adjustment Panel */}
                          {editingDiscountOrderId === order.id && (
                            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2 my-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                                <span>Adjust Discount Amount ($):</span>
                                <span className="text-amber-700">Order Subtotal: ${order.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setAdjustedDiscountValue(prev => Math.max(0, Number((prev - 1).toFixed(2))))}
                                  className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                                  title="Decrease $1"
                                >
                                  -1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdjustedDiscountValue(prev => Math.max(0, Number((prev - 5).toFixed(2))))}
                                  className="px-2 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                                  title="Decrease $5"
                                >
                                  -5
                                </button>
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max={order.subtotal}
                                    step="0.50"
                                    value={adjustedDiscountValue === 0 ? '' : adjustedDiscountValue}
                                    placeholder="0.00"
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                      setAdjustedDiscountValue(isNaN(val) ? 0 : Math.max(0, Math.min(order.subtotal, val)));
                                    }}
                                    className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-bold text-center outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">$</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setAdjustedDiscountValue(prev => Math.min(order.subtotal, Number((prev + 1).toFixed(2))))}
                                  className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                                  title="Increase $1"
                                >
                                  +1
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAdjustedDiscountValue(prev => Math.min(order.subtotal, Number((prev + 5).toFixed(2))))}
                                  className="px-2 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 text-xs cursor-pointer"
                                  title="Increase $5"
                                >
                                  +5
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateOrderDiscount(order.id, adjustedDiscountValue);
                                    setEditingDiscountOrderId(null);
                                  }}
                                  className="px-3 h-7 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg cursor-pointer transition-colors shadow-2xs"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Shipping Fee:</span>
                            <span className="font-mono text-slate-800">
                              {order.shippingFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `$${order.shippingFee.toFixed(2)}`}
                            </span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-100 flex justify-between font-bold text-slate-900">
                            <span className="text-slate-500 font-normal">Gateway: {order.paymentGatewayProvider}</span>
                            <span className="text-amber-600 text-sm">Total: ${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Stock Activity Audit Trail</h3>
              <p className="text-xs text-slate-500">Complete historical logs of inventory additions, customer sales, and manual adjustments.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl">{inventoryLogs.length} entries</span>
              <button
                type="button"
                id="btn-export-transactions-pdf"
                onClick={() => {
                  exportTransactionsToPdf(inventoryLogs);
                  showExportNotice('Stock transactions PDF exported successfully.');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export Transactions as PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                id="btn-export-transactions-excel"
                onClick={() => {
                  exportTransactionsToExcel(inventoryLogs);
                  showExportNotice('Stock transactions Excel spreadsheet exported successfully.');
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Export Transactions as Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {inventoryLogs.map((log, idx) => (
              <div key={`${log.id}-${idx}`} className="p-3.5 hover:bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    log.type === 'Sale'
                      ? 'bg-rose-100 text-rose-800'
                      : log.type === 'Restock'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    {log.type}
                  </span>
                  <div>
                    <p className="font-bold text-slate-900">{log.productName}</p>
                    <p className="text-slate-500 text-[11px]">{log.note}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`font-black text-sm ${log.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Balance: {log.stockAfter} units
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SHOP SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-md shadow-amber-500/20">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Comprehensive Website &amp; Storefront Settings</h4>
                <p className="text-xs text-slate-500">Edit business profile, hero banners, top announcements, exchange rates, shipping, and footer policies.</p>
              </div>
            </div>

            <button
              onClick={() => setActiveView('settings')}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1.5 active:scale-95"
            >
              <span>Open Website Settings</span>
              <ChevronRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Shop Hotline &amp; Identity</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Shop Display Name
              </label>
              <input
                type="text"
                value={settings.shopName}
                onChange={(e) => updateSettings({ shopName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hotline Phone Number (tell)
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => updateSettings({ phone: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-amber-700"
              />
              <p className="text-[11px] text-slate-400 mt-1">Configured hotline: 070 433 464</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Telegram Handle
              </label>
              <input
                type="text"
                value={settings.telegramUsername}
                onChange={(e) => updateSettings({ telegramUsername: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Free Shipping Threshold ($)
              </label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => updateSettings({ freeShippingThreshold: Number(e.target.value) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Data Export &amp; Factory Reset</span>
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              Export your inventory, orders, and customer logs to a local JSON file for safe backup or migration.
            </p>

            <button
              onClick={handleExportJson}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4 text-amber-400" />
              <span>Export Inventory JSON Backup</span>
            </button>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-rose-700 mb-1">Demo Data Reset</p>
              <p className="text-xs text-slate-500 mb-3">
                Restore the default catalog products and reset all custom stock adjustments.
              </p>
              <button
                onClick={() => setIsResetConfirmOpen(true)}
                className="py-2.5 px-4 rounded-xl border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default Products</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base">
                  {editingProduct ? 'Edit Product & Inventory' : 'Add New Inventory Product'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {productFormError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{productFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (productFormError) setProductFormError(null);
                  }}
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                />
              </div>

              {/* Category & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Manage
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ProductCategory)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-medium focus:bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={`inv-cat-form-${cat}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formSku}
                    onChange={(e) => {
                      setFormSku(e.target.value);
                      if (productFormError) setProductFormError(null);
                    }}
                    placeholder="e.g. COS-AUD-099"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Selling Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Original / List ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formOriginalPrice}
                      onChange={(e) => setFormOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cost Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formCostPrice}
                      onChange={(e) => setFormCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold text-slate-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Product Discount Calculator & Quick Adjuster */}
                {Number(formOriginalPrice) > 0 && (
                  <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {Number(formOriginalPrice) > Number(formPrice) ? (
                          <>
                            Discount: <strong className="text-emerald-700 font-bold">${(Number(formOriginalPrice) - Number(formPrice)).toFixed(2)} off</strong> ({Math.round(((Number(formOriginalPrice) - Number(formPrice)) / Number(formOriginalPrice)) * 100)}% off)
                          </>
                        ) : (
                          <span>List price equals selling price (No discount)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-medium">Apply Discount:</span>
                      {[10, 15, 20, 25, 50].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => {
                            const orig = Number(formOriginalPrice);
                            if (orig > 0) {
                              const newPrice = Number((orig * (1 - pct / 100)).toFixed(2));
                              setFormPrice(newPrice);
                            }
                          }}
                          className="px-1.5 py-0.5 bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-900 rounded text-[10px] font-bold transition-colors cursor-pointer"
                        >
                          -{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stock levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Initial / Current Stock (Units) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none font-bold focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Low Stock Alert Threshold *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formThreshold}
                    onChange={(e) => setFormThreshold(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Product Image Uploader (File Upload instead of raw URL) */}
              <div>
                <ProductImageUploader
                  images={formImages}
                  onChange={setFormImages}
                  maxImages={5}
                />
              </div>

              {/* Description & Product Specifications Studio */}
              <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-amber-600" />
                    <span>Product Description &amp; Specifications</span>
                  </label>

                  {/* Write vs Preview Tabs */}
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFormDescTab('write')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                        formDescTab === 'write'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Write
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDescTab('preview')}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                        formDescTab === 'preview'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Live Preview</span>
                    </button>
                  </div>
                </div>

                {/* Templates & Formatting Tools */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setFormDescription(prev => (prev ? prev + '\n• ' : '• '));
                        setFormDescTab('write');
                      }}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Bullet (•)</span>
                    </button>

                    <span className="text-[10px] text-slate-400 font-bold px-1">Templates:</span>
                    {DESCRIPTION_TEMPLATES.map((tmpl, tIdx) => (
                      <button
                        key={tIdx}
                        type="button"
                        onClick={() => {
                          if (formDescription && !window.confirm('Apply this template? It will replace current description text.')) {
                            return;
                          }
                          setFormDescription(tmpl.text);
                          setFormDescTab('write');
                        }}
                        className="px-2 py-1 bg-white hover:bg-amber-50 hover:text-amber-800 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                        title={`Use ${tmpl.name} template layout`}
                      >
                        {tmpl.name}
                      </button>
                    ))}
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {formDescription.length} chars
                  </span>
                </div>

                {formDescTab === 'write' ? (
                  <div>
                    <textarea
                      rows={5}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Write structured product overview, key features, and specifications (use • for bullets)..."
                      className="w-full text-xs font-sans p-3 bg-white border border-slate-300 rounded-xl outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Tip: Add bullet points (•) for features, and "Label: Value" lines for technical specifications.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3 min-h-[120px]">
                    {(() => {
                      const parsed = parseProductDescription(formDescription);
                      return (
                        <>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                              Summary Overview
                            </span>
                            <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                              {parsed.summary}
                            </p>
                          </div>

                          {parsed.bullets.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                                Features
                              </span>
                              <ul className="space-y-1 text-xs text-slate-700">
                                {parsed.bullets.map((b, i) => (
                                  <li key={i} className="flex items-start gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {parsed.specs.length > 0 && (
                            <div className="pt-2 border-t border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                                Specifications
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {parsed.specs.map((s, i) => (
                                  <div key={i} className="bg-slate-50 p-1.5 rounded text-[11px] flex justify-between">
                                    <span className="font-semibold text-slate-500">{s.label}:</span>
                                    <span className="font-bold text-slate-900">{s.value}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Barcode & Weight Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Barcode / EAN with Camera Scanner */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Barcode className="w-3.5 h-3.5 text-slate-500" />
                      <span>Barcode / EAN (Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsBarcodeCameraOpen(true)}
                      className="text-[11px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Scan barcode with device camera"
                    >
                      <Camera className="w-3 h-3 text-amber-600" />
                      <span>Scan with Camera</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={formBarcode}
                      onChange={(e) => setFormBarcode(e.target.value)}
                      placeholder="e.g. 8851234567890"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono outline-none focus:bg-white pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomBarcode = `8850${Math.floor(100000000 + Math.random() * 900000000)}`;
                        setFormBarcode(randomBarcode);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-500 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 px-1.5 py-1 rounded-md transition-colors"
                      title="Auto-generate mock EAN-13 barcode"
                    >
                      Generate
                    </button>
                  </div>
                </div>

                {/* Product Weight & Unit */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    <span className="flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-slate-500" />
                      <span>Product Weight / Volume (Optional)</span>
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formWeight}
                      onChange={(e) => setFormWeight(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="e.g. 0.45, 250, 1.5"
                      className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white"
                    />
                    <select
                      value={formWeightUnit}
                      onChange={(e) => setFormWeightUnit(e.target.value as any)}
                      className="w-24 text-xs font-bold bg-slate-100 border border-slate-300 rounded-xl px-2 py-2.5 outline-none focus:bg-white"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="lb">lb</option>
                      <option value="oz">oz</option>
                      <option value="ml">ml</option>
                      <option value="L">L</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                {editingProduct ? (
                  <button
                    type="button"
                    onClick={() => setProductToDelete(editingProduct)}
                    className="py-2.5 px-3.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Product</span>
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingProduct(null);
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-6 rounded-xl text-xs font-bold bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 transition-all shadow-md cursor-pointer"
                  >
                    {editingProduct ? 'Save Product Changes' : 'Create & Save Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* PRODUCT DELETION CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Delete Product?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-900">"{productToDelete.name}"</strong> (SKU: {productToDelete.sku})? This product will be removed from your catalog and customer cart.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                id="cancel-delete-product-btn"
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-product-btn"
                onClick={() => {
                  const name = productToDelete.name;
                  deleteProduct(productToDelete.id);
                  if (editingProduct?.id === productToDelete.id) {
                    setEditingProduct(null);
                    setIsAddModalOpen(false);
                  }
                  setProductToDelete(null);
                  setDeleteSuccessToast(`"${name}" has been deleted from catalog.`);
                  setTimeout(() => setDeleteSuccessToast(null), 4000);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER DELETION CONFIRMATION MODAL */}
      {orderToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Delete Order?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete order <strong className="font-mono text-slate-900">{orderToDelete}</strong>?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setOrderToDelete(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteOrder(orderToDelete);
                  setOrderToDelete(null);
                  setDeleteSuccessToast(`Order ${orderToDelete} deleted.`);
                  setTimeout(() => setDeleteSuccessToast(null), 4000);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Delete Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Reset to Defaults?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Restore the default catalog products, users, and reset custom data?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetToDefaults();
                  setIsResetConfirmOpen(false);
                  setDeleteSuccessToast('All store data reset to factory defaults.');
                  setTimeout(() => setDeleteSuccessToast(null), 4000);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}


      {/* CAMERA BARCODE SCANNER MODAL (DIRECTLY FILLS PRODUCT BARCODE/EAN) */}
      <CameraBarcodeScannerModal
        isOpen={isBarcodeCameraOpen}
        onClose={() => setIsBarcodeCameraOpen(false)}
        currentBarcode={formBarcode}
        onScanBarcode={(scannedBarcode) => {
          setFormBarcode(scannedBarcode);
          showExportNotice(`Barcode "${scannedBarcode}" scanned & applied!`);
        }}
      />

      {/* CLEAR OLD ACCOUNTING / STOCK OUT / SALE INCOME DATA MODAL */}
      {isClearDataModalOpen && (
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
                <h3 className="text-lg font-black text-slate-900">Clear Old Accounting &amp; Sales Data</h3>
                <p className="text-xs text-slate-500">Purge old records for stock outs, purchases, or recorded sales income.</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              {/* Option: Stock Out (Write-off) */}
              <label 
                onClick={() => setClearDataType('stockOuts')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearDataType === 'stockOuts' 
                    ? 'border-rose-500 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearType" 
                    checked={clearDataType === 'stockOuts'} 
                    onChange={() => setClearDataType('stockOuts')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Stock Out (Write-Off) Records</span>
                    <span className="text-[11px] text-slate-500">Clear all damaged, expired, or shrinkage stock-out audit entries.</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md shrink-0">
                  {stockOuts.length} records
                </span>
              </label>

              {/* Option: Sale Income */}
              <label 
                onClick={() => setClearDataType('sales')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearDataType === 'sales' 
                    ? 'border-rose-500 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearType" 
                    checked={clearDataType === 'sales'} 
                    onChange={() => setClearDataType('sales')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Sale Income (POS &amp; Orders)</span>
                    <span className="text-[11px] text-slate-500">Clear old historical income from POS cashier sales and online orders.</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md shrink-0">
                  {posSales.length + orders.length} records
                </span>
              </label>

              {/* Option: Purchase In records */}
              <label 
                onClick={() => setClearDataType('purchases')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearDataType === 'purchases' 
                    ? 'border-rose-500 bg-rose-50/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearType" 
                    checked={clearDataType === 'purchases'} 
                    onChange={() => setClearDataType('purchases')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Purchase Stock In Records</span>
                    <span className="text-[11px] text-slate-500">Clear past direct purchase inflow and supplier invoice logs.</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                  {purchases.length} records
                </span>
              </label>

              {/* Option: Purge All Accounting History */}
              <label 
                onClick={() => setClearDataType('all')}
                className={`p-3.5 rounded-2xl border-2 flex items-start justify-between gap-3 cursor-pointer transition-all ${
                  clearDataType === 'all' 
                    ? 'border-rose-600 bg-rose-100/50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    name="clearType" 
                    checked={clearDataType === 'all'} 
                    onChange={() => setClearDataType('all')}
                    className="mt-1 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <span className="text-xs font-black text-rose-900 block">Purge All Accounting &amp; Income Records</span>
                    <span className="text-[11px] text-rose-700">Wipes all Purchases, Stock Outs (write-offs), POS sales, and order revenue. (Inventory products remain safe).</span>
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
                id="cancel-clear-data-btn"
                onClick={() => {
                  setIsClearDataModalOpen(false);
                  setClearDataType(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-clear-data-btn"
                onClick={handleConfirmClearData}
                disabled={!clearDataType}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                Clear Selected Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL DATA EXPORT & PER-DAY SALES REPORT MODAL */}
      {isDailyReportModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 max-w-3xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Export Center &amp; Daily Sales Report</h3>
                  <p className="text-xs text-slate-500">Download formatted PDF and Excel documents for all store operations.</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsDailyReportModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Export Grid for all 5 entities */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* 1. Inventory */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-500" />
                    <span>Inventory Catalog</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {products.length} SKUs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportInventoryToPdf(products);
                      showExportNotice('Inventory PDF downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportInventoryToExcel(products);
                      showExportNotice('Inventory Excel spreadsheet downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* 2. Customer Orders */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ReceiptText className="w-4 h-4 text-indigo-500" />
                    <span>Customer Orders</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {orders.length} Orders
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportOrdersToPdf(orders);
                      showExportNotice('Orders PDF downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportOrdersToExcel(orders);
                      showExportNotice('Orders Excel spreadsheet downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* 3. Purchase Orders */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ArrowUpDown className="w-4 h-4 text-emerald-500" />
                    <span>Purchase Orders</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {purchaseOrders.length} POs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportPurchaseOrdersToPdf(purchaseOrders);
                      showExportNotice('Purchase Orders PDF downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportPurchaseOrdersToExcel(purchaseOrders);
                      showExportNotice('Purchase Orders Excel downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* 4. Transactions / Audit logs */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-sky-500" />
                    <span>Transactions / Logs</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    {inventoryLogs.length} logs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      exportTransactionsToPdf(inventoryLogs);
                      showExportNotice('Transactions PDF downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-500" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      exportTransactionsToExcel(inventoryLogs);
                      showExportNotice('Transactions Excel downloaded.');
                    }}
                    className="flex-1 py-1.5 px-2.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel</span>
                  </button>
                </div>
              </div>

              {/* 5. Per Day Sale Report */}
              <div className="bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl p-3.5 space-y-2.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Daily Sales Breakdown Report</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                    {dailyList.length} Day(s) Logged
                  </span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  Aggregates total POS orders, online transactions, units sold, total revenue, and estimated profits grouped per day.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-export-daily-sales-pdf"
                    onClick={() => {
                      exportDailySalesReportToPdf(dailySalesData);
                      showExportNotice('Daily Sales Report PDF downloaded.');
                    }}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Export Daily Sales PDF</span>
                  </button>
                  <button
                    type="button"
                    id="btn-export-daily-sales-excel"
                    onClick={() => {
                      exportDailySalesReportToExcel(dailySalesData);
                      showExportNotice('Daily Sales Report Excel downloaded.');
                    }}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export Daily Sales Excel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Sales Preview Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Per Day Sales Summary Preview</span>
                <span className="text-[11px] text-slate-500">Live aggregated from POS &amp; Web orders</span>
              </div>
              <div className="overflow-x-auto max-h-52">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-center">Orders</th>
                      <th className="py-2.5 px-3 text-center">Units Sold</th>
                      <th className="py-2.5 px-3 text-right">Revenue ($)</th>
                      <th className="py-2.5 px-3 text-right">Est. Profit ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dailyList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No sales recorded yet. Process a POS sale or place an online order to see daily metrics.
                        </td>
                      </tr>
                    ) : (
                      dailyList.map(day => (
                        <tr key={day.date} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{day.displayDate || day.date}</td>
                          <td className="py-2.5 px-3 text-center">{day.totalTransactions}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">{day.totalUnitsSold}</td>
                          <td className="py-2.5 px-3 text-right font-black text-emerald-700">${day.totalRevenue.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-indigo-700">${day.grossProfit.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsDailyReportModalOpen(false)}
                className="py-2.5 px-5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close Export Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DESCRIPTION INSPECT & QUICK-EDIT MODAL */}
      {selectedProductForDescModal && (
        <ProductDescriptionViewerModal
          product={selectedProductForDescModal}
          onClose={() => setSelectedProductForDescModal(null)}
          onSaveDescription={(productId, newDesc) => {
            updateProduct(productId, { description: newDesc });
            setSelectedProductForDescModal(prev => prev ? { ...prev, description: newDesc } : null);
            showExportNotice('Product description updated successfully.');
          }}
        />
      )}

      {/* EXPORT / SUCCESS TOAST */}
      {exportNotice && (
        <div className="fixed bottom-6 left-6 z-60 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* NOTIFICATION TOAST */}
      {deleteSuccessToast && (
        <div className="fixed bottom-6 right-6 z-60 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{deleteSuccessToast}</span>
        </div>
      )}
    </div>
  );
};
