import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { Product, POSCartItem, POSSale } from '../types';
import { fuzzySearchProducts } from '../utils/fuzzySearch';
import { 
  Scan, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  DollarSign, 
  QrCode, 
  CreditCard, 
  CheckCircle, 
  ShoppingBag, 
  User, 
  Percent, 
  Tag,
  Receipt, 
  X,
  Sparkles,
  Camera,
  Layers,
  RotateCcw,
  Volume2,
  VolumeX,
  Smartphone,
  Coins,
  Wifi,
  WifiOff,
  MinusCircle,
  PlusCircle,
  AlertTriangle,
  Fingerprint
} from 'lucide-react';
import { posSound } from '../utils/posSounds';
import { POSQRScannerModal } from './pos/POSQRScannerModal';
import { POSCashDrawerModal } from './pos/POSCashDrawerModal';
import { POSCardTerminalModal } from './pos/POSCardTerminalModal';
import { POSCameraScanner } from './pos/POSCameraScanner';
import { POSThermalReceiptModal } from './pos/POSThermalReceiptModal';

export const POSTerminal: React.FC = () => {
  const { 
    products, 
    currentUser, 
    completePOSSale, 
    settings,
    posSales,
    isOffline,
    toggleOfflineSimulation,
    pendingOfflineSalesCount,
    openBiometricScanner
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [editingItemDiscountId, setEditingItemDiscountId] = useState<string | null>(null);
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(posSound.isEnabled());

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'KHQR' | 'CARD'>('KHQR');
  
  // Camera Product Scanner Modal State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [currentSaleReceipt, setCurrentSaleReceipt] = useState<POSSale | null>(null);

  // Barcode scanner simulator input
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanNotification, setScanNotification] = useState<string | null>(null);

  // Scanner Mode: 'SCAN' (+1) or 'UNSCAN' (-1)
  const [scannerMode, setScannerMode] = useState<'SCAN' | 'UNSCAN'>('SCAN');

  // Last Scanned Action for Instant Undo
  const [lastScannedAction, setLastScannedAction] = useState<{
    product: Product;
    mode: 'SCAN' | 'UNSCAN';
    timestamp: number;
  } | null>(null);

  // Category list
  const categories = useMemo(() => {
    const rawCategories = products
      .map(p => p.category)
      .filter(c => typeof c === 'string' && c.trim().toLowerCase() !== 'all');
    return ['All', ...Array.from(new Set(rawCategories))];
  }, [products]);

  // Filtered products for POS quick touch grid with typo-tolerant search
  const filteredProducts = useMemo(() => {
    return fuzzySearchProducts(products, searchQuery, selectedCategory).results;
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations with item and cart-level discount adjustment
  const rawSubtotal = useMemo(() => {
    return posCart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  }, [posCart]);

  const itemDiscountsTotal = useMemo(() => {
    return posCart.reduce((sum, item) => {
      if (!item.discount) return sum;
      return sum + (item.unitPrice * item.quantity * item.discount) / 100;
    }, 0);
  }, [posCart]);

  const subtotalAfterItemDisc = useMemo(() => {
    return Math.max(0, rawSubtotal - itemDiscountsTotal);
  }, [rawSubtotal, itemDiscountsTotal]);

  const cartDiscountAmount = useMemo(() => {
    if (discountValue <= 0 || subtotalAfterItemDisc <= 0) return 0;
    if (discountType === 'percent') {
      const clamped = Math.min(100, Math.max(0, discountValue));
      return (subtotalAfterItemDisc * clamped) / 100;
    } else {
      return Math.min(subtotalAfterItemDisc, Math.max(0, discountValue));
    }
  }, [subtotalAfterItemDisc, discountType, discountValue]);

  const totalDiscountAmount = useMemo(() => {
    return itemDiscountsTotal + cartDiscountAmount;
  }, [itemDiscountsTotal, cartDiscountAmount]);

  const taxAmount = useMemo(() => {
    return taxEnabled ? ((subtotalAfterItemDisc - cartDiscountAmount) * 0.1) : 0;
  }, [subtotalAfterItemDisc, cartDiscountAmount, taxEnabled]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotalAfterItemDisc - cartDiscountAmount + taxAmount);
  }, [subtotalAfterItemDisc, cartDiscountAmount, taxAmount]);

  const handleAdjustDiscount = (delta: number) => {
    const next = Math.max(0, Number((discountValue + delta).toFixed(2)));
    setDiscountValue(discountType === 'percent' ? Math.min(100, next) : next);
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setPosCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, discount: Math.max(0, Math.min(100, discount)) }
        : item
    ));
  };

  // Add to POS Cart with Audio Feedback
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`Cannot add: "${product.name}" is currently out of stock.`);
      return;
    }

    posSound.playScanBeep();

    setPosCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Maximum available stock reached (${product.stock} units)`);
          return prev;
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.price, discount: 0 }];
    });

    setLastScannedAction({ product, mode: 'SCAN', timestamp: Date.now() });
  };

  // Unscan Product (-1 from cart, or remove if quantity reaches 0)
  const handleUnscanProduct = (product: Product): { success: boolean; message: string } => {
    const existing = posCart.find(item => item.product.id === product.id);
    if (!existing) {
      posSound.playError();
      const msg = `Cannot unscan: "${product.name}" is not in cart`;
      setScanNotification(msg);
      setTimeout(() => setScanNotification(null), 3500);
      return { success: false, message: msg };
    }

    posSound.playUnscanBeep();

    let newQty = 0;
    let wasRemoved = false;

    setPosCart(prev => {
      return prev.map(item => {
        if (item.product.id === product.id) {
          const updatedQty = item.quantity - 1;
          newQty = updatedQty;
          if (updatedQty <= 0) {
            wasRemoved = true;
            return null;
          }
          return { ...item, quantity: updatedQty };
        }
        return item;
      }).filter(Boolean) as POSCartItem[];
    });

    setLastScannedAction({ product, mode: 'UNSCAN', timestamp: Date.now() });

    const msg = wasRemoved
      ? `Unscanned & removed: ${product.name}`
      : `Unscanned: ${product.name} (-1, ${newQty} left in cart)`;
    setScanNotification(msg);
    setTimeout(() => setScanNotification(null), 3000);
    return { success: true, message: msg };
  };

  // Undo Last Scan / Unscan Action
  const handleUndoLastScan = () => {
    if (!lastScannedAction) return;
    if (lastScannedAction.mode === 'SCAN') {
      handleUnscanProduct(lastScannedAction.product);
    } else {
      handleAddToCart(lastScannedAction.product);
      setScanNotification(`Re-added: ${lastScannedAction.product.name} (+1 in cart)`);
      setTimeout(() => setScanNotification(null), 2500);
    }
    setLastScannedAction(null);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setPosCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) {
            alert(`Stock limit reached (${item.product.stock} units available)`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as POSCartItem[];
    });
  };

  const removeItem = (productId: string) => {
    setPosCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearPosCart = () => {
    if (posCart.length === 0) return;
    setPosCart([]);
    setDiscountValue(0);
    setDiscountType('percent');
  };

  // Barcode / SKU scan submit handler (supports both SCAN and UNSCAN mode)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const query = barcodeInput.trim().toLowerCase();
    const matched = products.find(p => 
      p.sku.toLowerCase() === query || 
      (p.barcode && p.barcode.toLowerCase() === query) ||
      p.id.toLowerCase() === query ||
      p.name.toLowerCase().includes(query)
    );

    if (matched) {
      if (scannerMode === 'UNSCAN') {
        handleUnscanProduct(matched);
      } else {
        handleAddToCart(matched);
        setScanNotification(`Scanned: ${matched.name} (+1 in cart)`);
        setTimeout(() => setScanNotification(null), 2500);
      }
      setBarcodeInput('');
    } else {
      posSound.playError();
      setScanNotification(`Barcode / SKU "${barcodeInput}" not found in catalog`);
      setTimeout(() => setScanNotification(null), 3000);
    }
  };

  // Open Checkout
  const handleOpenCheckout = (method?: 'CASH' | 'KHQR' | 'CARD') => {
    if (posCart.length === 0) {
      alert('Cart is empty. Add products to proceed.');
      return;
    }
    if (method) {
      setSelectedPaymentMethod(method);
    }
    setPaymentModalOpen(true);
  };

  // Helper to commit sale
  const commitSale = (
    paymentMethod: 'CASH' | 'KHQR' | 'CARD',
    amountTendered: number,
    changeGiven: number,
    paymentDetails?: POSSale['paymentDetails']
  ) => {
    const saleItems = posCart.map(item => {
      const lineGross = item.unitPrice * item.quantity;
      const lineDisc = item.discount ? (lineGross * item.discount) / 100 : 0;
      return {
        productId: item.product.id,
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: lineGross - lineDisc,
      };
    });

    const newSale = completePOSSale({
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customerName: customerName || 'Walk-in Customer',
      customerPhone: customerPhone || undefined,
      items: saleItems,
      subtotal: rawSubtotal,
      discount: totalDiscountAmount,
      tax: taxAmount,
      total: grandTotal,
      paymentMethod,
      amountTendered,
      changeGiven,
      paymentDetails,
    });

    setCurrentSaleReceipt(newSale);
    setPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
    setPosCart([]);
    setDiscountValue(0);
    setDiscountType('percent');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
  };

  // Handle Payment Method 1: Scan QR Code (Bakong KHQR)
  const handleQRSuccess = (details: {
    khqrRef: string;
    khqrPayerBank: string;
    amountUSD: number;
    amountKHR: number;
  }) => {
    commitSale('KHQR', details.amountUSD, 0, {
      khqrRef: details.khqrRef,
      khqrPayerBank: details.khqrPayerBank,
      tenderCurrency: 'USD',
    });
  };

  // Handle Payment Method 2: Cash Drawer
  const handleCashSuccess = (details: {
    tenderCurrency: 'USD' | 'KHR';
    amountTenderedUSD: number;
    amountTenderedKHR: number;
    changeGivenUSD: number;
    changeGivenKHR: number;
  }) => {
    commitSale('CASH', details.amountTenderedUSD, details.changeGivenUSD, {
      tenderCurrency: details.tenderCurrency,
      tenderedKHR: details.amountTenderedKHR,
      changeGivenKHR: details.changeGivenKHR,
    });
  };

  // Handle Payment Method 3: Card Terminal
  const handleCardSuccess = (details: {
    cardBrand: string;
    cardLast4: string;
    authCode: string;
    cardEntryMethod: 'TAP' | 'CHIP' | 'SWIPE';
  }) => {
    commitSale('CARD', grandTotal, 0, {
      cardBrand: details.cardBrand,
      cardLast4: details.cardLast4,
      authCode: details.authCode,
      cardEntryMethod: details.cardEntryMethod,
    });
  };

  // Daily POS totals
  const todayTotal = useMemo(() => {
    return posSales.reduce((sum, s) => sum + s.total, 0);
  }, [posSales]);

  return (
    <div className="space-y-6">
      {/* POS Session Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">POS Cash Register Terminal</h1>
              <button
                onClick={() => toggleOfflineSimulation()}
                id="btn-pos-toggle-offline-simulation"
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                  isOffline
                    ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                }`}
                title="Click to toggle network outage simulation for testing offline continuity"
              >
                {isOffline ? (
                  <>
                    <WifiOff className="w-3 h-3 text-white" />
                    <span>Offline (Queueing: {pendingOfflineSalesCount})</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span>Online &amp; Active</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Branch: St. 271, Phnom Penh</span>
              <span>•</span>
              <span>Hotline: <strong className="text-amber-400">{settings.phone}</strong></span>
              <span>•</span>
              <span>Cashier: <strong className="text-white">{currentUser.name}</strong> ({currentUser.role})</span>
            </p>
          </div>
        </div>

        {/* Audio Toggle & Quick Shift Summary */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Audio Beep Feedback Toggle */}
          <button
            type="button"
            onClick={() => setSoundOn(posSound.toggleSound())}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              soundOn 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle POS Audio Beeps"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Beep {soundOn ? 'ON' : 'OFF'}</span>
          </button>

          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2 text-right flex-1 md:flex-initial">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Today's Sales</span>
            <span className="text-lg font-black text-amber-400">${todayTotal.toFixed(2)}</span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-4 py-2 text-right flex-1 md:flex-initial">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tickets</span>
            <span className="text-lg font-black text-emerald-400">{posSales.length}</span>
          </div>
        </div>
      </div>

      {/* Main POS Workspace Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / CENTER: PRODUCT LOOKUP & FAST CATALOG (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Barcode & Search Input Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            {/* SCAN vs UNSCAN Mode Switcher & Undo Action */}
            <div className="flex items-center justify-between gap-2 pb-0.5">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setScannerMode('SCAN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    scannerMode === 'SCAN'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Scan Mode (+1)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScannerMode('UNSCAN')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                    scannerMode === 'UNSCAN'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>Unscan Mode (-1)</span>
                </button>
              </div>

              {/* Undo Last Action Button */}
              {lastScannedAction && (
                <button
                  type="button"
                  onClick={handleUndoLastScan}
                  className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 shrink-0"
                  title="Undo last barcode action"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">Undo</span>
                  <span className="max-w-[110px] truncate">{lastScannedAction.product.name}</span>
                </button>
              )}
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1">
                {scannerMode === 'UNSCAN' ? (
                  <MinusCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-rose-600" />
                ) : (
                  <Scan className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                )}
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder={
                    scannerMode === 'UNSCAN'
                      ? 'UNSCAN MODE: Scan barcode or type SKU to deduct (-1) from cart...'
                      : 'Scan barcode or type SKU (e.g. COS-AUD-001) & press Enter...'
                  }
                  className={`w-full text-sm text-slate-900 placeholder:text-slate-400 pl-10 pr-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 font-mono transition-colors ${
                    scannerMode === 'UNSCAN'
                      ? 'bg-rose-50/50 hover:bg-rose-50/80 focus:bg-white border-rose-300 focus:ring-rose-500/30 focus:border-rose-500'
                      : 'bg-amber-50/50 hover:bg-amber-50/80 focus:bg-white border-amber-200 focus:ring-amber-500/30 focus:border-amber-500'
                  }`}
                />
              </div>

              <button
                type="submit"
                className={`font-bold px-3.5 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 ${
                  scannerMode === 'UNSCAN'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                }`}
              >
                {scannerMode === 'UNSCAN' ? <MinusCircle className="w-3.5 h-3.5" /> : <Scan className="w-3.5 h-3.5" />}
                <span>{scannerMode === 'UNSCAN' ? 'Unscan SKU' : 'Scan SKU'}</span>
              </button>

              {/* Live Camera Scanner Button */}
              <button
                type="button"
                onClick={() => setIsCameraScannerOpen(true)}
                className={`font-bold px-3 py-2.5 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-2xs shrink-0 ${
                  scannerMode === 'UNSCAN'
                    ? 'bg-slate-900 hover:bg-slate-800 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
                title="Open Camera Barcode & QR Scanner"
              >
                <Camera className={`w-3.5 h-3.5 ${scannerMode === 'UNSCAN' ? 'text-rose-400' : 'text-amber-400'}`} />
                <span className="hidden sm:inline">Camera Scanner</span>
                {scannerMode === 'UNSCAN' && (
                  <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                    Unscan
                  </span>
                )}
              </button>
            </form>

            {/* Notification alert for scanner */}
            {scanNotification && (
              <div
                className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-between gap-1.5 animate-fadeIn ${
                  scanNotification.toLowerCase().includes('unscan') || scanNotification.toLowerCase().includes('removed')
                    ? 'bg-rose-50 border border-rose-200 text-rose-800'
                    : scanNotification.toLowerCase().includes('cannot') || scanNotification.toLowerCase().includes('not found')
                    ? 'bg-amber-50 border border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {scanNotification.toLowerCase().includes('unscan') || scanNotification.toLowerCase().includes('removed') ? (
                    <MinusCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : scanNotification.toLowerCase().includes('cannot') || scanNotification.toLowerCase().includes('not found') ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <span>{scanNotification}</span>
                </div>
                {lastScannedAction && (
                  <button
                    type="button"
                    onClick={handleUndoLastScan}
                    className="text-[11px] underline font-bold hover:opacity-80 ml-2"
                  >
                    Undo
                  </button>
                )}
              </div>
            )}

            {/* Search and Category Filter Pills */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1 border-t border-slate-100">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search item name..."
                  className="w-full bg-slate-100 text-xs text-slate-800 pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:bg-white"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={`pos-cat-pill-${cat}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-slate-900 text-white shadow-2xs' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto p-1">
            {filteredProducts.map(product => {
              const inCartItem = posCart.find(ci => ci.product.id === product.id);
              const isOutOfStock = product.stock <= 0;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && handleAddToCart(product)}
                  className={`bg-white rounded-xl border p-3 flex flex-col justify-between transition-all cursor-pointer select-none group relative ${
                    isOutOfStock 
                      ? 'border-slate-200 opacity-60 cursor-not-allowed bg-slate-50' 
                      : inCartItem
                        ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                        : 'border-slate-200 hover:border-amber-400/60 hover:shadow-sm'
                  }`}
                >
                  {/* Badge */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {product.sku}
                    </span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      product.stock === 0 
                        ? 'bg-rose-100 text-rose-700' 
                        : product.stock <= product.lowStockThreshold
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {product.stock === 0 ? 'Out' : `${product.stock} in stock`}
                    </span>
                  </div>

                  {/* Thumbnail & Title */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-amber-700 transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {product.category}
                      </p>
                    </div>
                  </div>

                  {/* Price & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-auto">
                    <span className="text-sm font-extrabold text-slate-900">
                      ${product.price.toFixed(2)}
                    </span>

                    {inCartItem ? (
                      <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-md">
                        x{inCartItem.quantity}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 group-hover:bg-amber-100 group-hover:text-amber-900 px-2 py-1 rounded-lg transition-colors">
                        + Add
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: POS CART LEDGER & TENDER CONTROLS (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px]">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-600" />
                <span>Active Sale Docket</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {posCart.reduce((s, i) => s + i.quantity, 0)} items
                </span>
              </h3>
            </div>

            <button
              onClick={clearPosCart}
              disabled={posCart.length === 0}
              className="text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-30 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Customer Selection Row */}
          <div className="p-3 bg-slate-100/60 border-b border-slate-100 grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Customer Phone
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="012 xxx xxx (Optional)"
                className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
            {posCart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-16">
                <ShoppingBag className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                <p className="font-bold text-sm text-slate-600">Register Docket is Empty</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Click any product on the left catalog, scan SKU barcode, or use Camera Scanner.
                </p>
              </div>
            ) : (
              posCart.map(item => (
                <div key={item.product.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {item.product.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-mono">{item.product.sku}</span>
                      <span>•</span>
                      <span>${item.unitPrice.toFixed(2)} each</span>
                      {/* Item Discount Adjuster Button */}
                      <button
                        type="button"
                        onClick={() => setEditingItemDiscountId(editingItemDiscountId === item.product.id ? null : item.product.id)}
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                          item.discount && item.discount > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Click to open item discount adjustment controls"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span>{item.discount && item.discount > 0 ? `-${item.discount}%` : '+ Disc'}</span>
                      </button>
                    </div>

                    {/* Inline Item Discount Micro-Adjuster */}
                    {editingItemDiscountId === item.product.id && (
                      <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-200 flex flex-wrap items-center justify-between gap-1.5 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-700">Disc:</span>
                          <button
                            type="button"
                            onClick={() => updateItemDiscount(item.product.id, Math.max(0, (item.discount || 0) - 5))}
                            className="w-5 h-5 bg-white border border-slate-200 rounded text-slate-800 font-bold flex items-center justify-center text-[10px] hover:bg-slate-100 cursor-pointer"
                            title="-5%"
                          >
                            -5
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount || 0}
                            onChange={(e) => updateItemDiscount(item.product.id, Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                            className="w-11 text-center bg-white border border-amber-300 rounded font-bold text-xs py-0.5 outline-none"
                          />
                          <span className="text-[10px] text-slate-500 font-bold">%</span>
                          <button
                            type="button"
                            onClick={() => updateItemDiscount(item.product.id, Math.min(100, (item.discount || 0) + 5))}
                            className="w-5 h-5 bg-white border border-slate-200 rounded text-slate-800 font-bold flex items-center justify-center text-[10px] hover:bg-slate-100 cursor-pointer"
                            title="+5%"
                          >
                            +5
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          {[0, 10, 20, 50].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => updateItemDiscount(item.product.id, pct)}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded cursor-pointer ${
                                (item.discount || 0) === pct ? 'bg-amber-500 text-slate-950 font-black' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {pct === 0 ? 'Clear' : `${pct}%`}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setEditingItemDiscountId(null)}
                            className="text-[10px] font-bold text-slate-600 hover:text-slate-950 ml-1 px-1.5 py-0.5 rounded hover:bg-amber-100 cursor-pointer"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-700 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center font-bold text-xs text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 rounded flex items-center justify-center hover:bg-white text-slate-700 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line total & remove */}
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-xs text-slate-900 block">
                      ${(item.unitPrice * item.quantity - (item.discount ? (item.unitPrice * item.quantity * item.discount) / 100 : 0)).toFixed(2)}
                    </span>
                    {item.discount && item.discount > 0 ? (
                      <span className="text-[10px] text-emerald-600 font-semibold block line-through">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                    ) : null}
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ledger Summary & Payment Tender Fast Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Comprehensive Discount Adjustment & Tax Control */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Percent className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Discount Adjustment</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Toggle between % and $ */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        discountType === 'percent'
                          ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        discountType === 'fixed'
                          ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      $
                    </button>
                  </div>

                  {/* Reset / Clear Button if discount > 0 */}
                  {(discountValue > 0 || itemDiscountsTotal > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDiscountValue(0);
                        setPosCart(prev => prev.map(item => ({ ...item, discount: 0 })));
                      }}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
                      title="Reset all discounts"
                    >
                      <X className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Adjuster controls: [-], [Input field], [+], and VAT */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdjustDiscount(discountType === 'percent' ? -5 : -1)}
                  disabled={discountValue <= 0}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm transition-colors shrink-0 cursor-pointer"
                  title={discountType === 'percent' ? 'Decrease by 5%' : 'Decrease by $1'}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percent' ? 100 : rawSubtotal}
                    step={discountType === 'percent' ? '1' : '0.50'}
                    value={discountValue === 0 ? '' : discountValue}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                      setDiscountValue(isNaN(val) ? 0 : Math.max(0, val));
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-black text-slate-900 text-center outline-none focus:border-amber-500 focus:bg-white"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                    {discountType === 'percent' ? '%' : '$'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleAdjustDiscount(discountType === 'percent' ? 5 : 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm transition-colors shrink-0 cursor-pointer"
                  title={discountType === 'percent' ? 'Increase by 5%' : 'Increase by $1'}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setTaxEnabled(!taxEnabled)}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                    taxEnabled 
                      ? 'bg-amber-100 border-amber-300 text-amber-900' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  VAT 10%: {taxEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Quick Presets for Instant Adjustment */}
              <div className="flex flex-wrap items-center gap-1 pt-1.5 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium mr-1">Quick:</span>
                {discountType === 'percent' ? (
                  [
                    { label: '0%', val: 0 },
                    { label: '5%', val: 5 },
                    { label: '10%', val: 10 },
                    { label: '15%', val: 15 },
                    { label: '20% Staff', val: 20 },
                    { label: '25% VIP', val: 25 },
                    { label: '50%', val: 50 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDiscountValue(preset.val)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                        discountValue === preset.val
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))
                ) : (
                  [
                    { label: '$0', val: 0 },
                    { label: '$1', val: 1 },
                    { label: '$2', val: 2 },
                    { label: '$5', val: 5 },
                    { label: '$10', val: 10 },
                    { label: '$20', val: 20 },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDiscountValue(preset.val)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                        discountValue === preset.val
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Subtotal lines */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">${rawSubtotal.toFixed(2)}</span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Line Item Discounts</span>
                  <span>-${itemDiscountsTotal.toFixed(2)}</span>
                </div>
              )}

              {cartDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span>Store Discount</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                      {discountType === 'percent' ? `${discountValue}%` : `$${discountValue.toFixed(2)}`}
                    </span>
                  </span>
                  <span>-${cartDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {totalDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-extrabold text-[11px] bg-emerald-50 px-2 py-1 rounded-md">
                  <span>Total Discount Applied</span>
                  <span>-${totalDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              {taxEnabled && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT (10%)</span>
                  <span>+${taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-200">
                <span>Total Due</span>
                <div className="text-right">
                  <span className="text-amber-700 block">${grandTotal.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    ≈ {(grandTotal * 4100).toLocaleString()} ៛ KHR
                  </span>
                </div>
              </div>
            </div>

            {/* QUICK TENDER SHORTCUT BUTTONS: SCAN QR CODE, CASH, CARD */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* Scan QR Code Button */}
              <button
                type="button"
                onClick={() => handleOpenCheckout('KHQR')}
                disabled={posCart.length === 0}
                className="py-3 px-2 rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <QrCode className="w-5 h-5 text-white" />
                <span>Scan QR Code</span>
              </button>

              {/* Cash Button */}
              <button
                type="button"
                onClick={() => handleOpenCheckout('CASH')}
                disabled={posCart.length === 0}
                className="py-3 px-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <DollarSign className="w-5 h-5 text-white" />
                <span>Cash Drawer</span>
              </button>

              {/* Card Terminal Button */}
              <button
                type="button"
                onClick={() => handleOpenCheckout('CARD')}
                disabled={posCart.length === 0}
                className="py-3 px-2 rounded-xl bg-gradient-to-br from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs flex flex-col items-center justify-center gap-1 shadow-xs transition-all active:scale-95"
              >
                <CreditCard className="w-5 h-5 text-white" />
                <span>Card Terminal</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MASTER PAYMENT TENDER MODAL */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900">Process POS Payment</h3>
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span>Cashier: <strong className="text-slate-800">{currentUser.name}</strong></span>
                  <button
                    type="button"
                    onClick={() => openBiometricScanner({
                      mode: 'verify',
                      title: 'Cashier Biometric Authorization',
                      subtitle: `Authenticate POS transaction for $${grandTotal.toFixed(2)}`,
                      userName: currentUser.name,
                      userRole: currentUser.role,
                      existingKeyId: currentUser.biometricKeyId
                    })}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 text-[10px] font-bold cursor-pointer transition-colors"
                    title="Authenticate with real fingerprint on phone screen or PC"
                  >
                    <Fingerprint className="w-3 h-3 text-emerald-600" />
                    <span>Biometric Auth</span>
                  </button>
                  <span>• Ticket Total: <strong className="text-amber-600">${grandTotal.toFixed(2)}</strong></span>
                </div>
              </div>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Main Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('KHQR')}
                className={`py-3 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1.5 border-2 transition-all ${
                  selectedPaymentMethod === 'KHQR'
                    ? 'bg-rose-50 border-rose-600 text-rose-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl ${selectedPaymentMethod === 'KHQR' ? 'bg-rose-600 text-white' : 'bg-white text-rose-600 border border-rose-200'}`}>
                  <QrCode className="w-5 h-5" />
                </div>
                <span>Scan QR Code</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('CASH')}
                className={`py-3 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1.5 border-2 transition-all ${
                  selectedPaymentMethod === 'CASH'
                    ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl ${selectedPaymentMethod === 'CASH' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-600 border border-emerald-200'}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
                <span>Cash Drawer</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaymentMethod('CARD')}
                className={`py-3 px-2 rounded-2xl text-xs font-black flex flex-col items-center gap-1.5 border-2 transition-all ${
                  selectedPaymentMethod === 'CARD'
                    ? 'bg-sky-50 border-sky-600 text-sky-950 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className={`p-2 rounded-xl ${selectedPaymentMethod === 'CARD' ? 'bg-sky-600 text-white' : 'bg-white text-sky-600 border border-sky-200'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <span>Card Terminal</span>
              </button>
            </div>

            {/* TAB CONTENT: 1. SCAN QR CODE */}
            {selectedPaymentMethod === 'KHQR' && (
              <POSQRScannerModal
                amountUSD={grandTotal}
                shopName={settings.khqrMerchantName || settings.shopName}
                shopPhone={settings.khqrMerchantAccount || settings.phone}
                customQrCodeUrl={settings.customQrCodeUrl}
                abaQrCodeUrl={settings.abaQrCodeUrl}
                onPaymentSuccess={handleQRSuccess}
                onCancel={() => setPaymentModalOpen(false)}
              />
            )}

            {/* TAB CONTENT: 2. CASH DRAWER */}
            {selectedPaymentMethod === 'CASH' && (
              <POSCashDrawerModal
                grandTotalUSD={grandTotal}
                onPaymentSuccess={handleCashSuccess}
                onCancel={() => setPaymentModalOpen(false)}
              />
            )}

            {/* TAB CONTENT: 3. CARD TERMINAL */}
            {selectedPaymentMethod === 'CARD' && (
              <POSCardTerminalModal
                grandTotalUSD={grandTotal}
                onPaymentSuccess={handleCardSuccess}
                onCancel={() => setPaymentModalOpen(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* CAMERA BARCODE & QR CODE SCANNER MODAL */}
      {isCameraScannerOpen && (
        <POSCameraScanner
          products={products}
          cartItems={posCart}
          onProductScanned={(prod) => {
            handleAddToCart(prod);
          }}
          onProductUnscanned={(prod) => {
            return handleUnscanProduct(prod);
          }}
          onUpdateCartQuantity={updateQuantity}
          onRemoveCartItem={removeItem}
          initialMode={scannerMode}
          onClose={() => setIsCameraScannerOpen(false)}
        />
      )}

      {/* 80MM THERMAL RECEIPT MODAL */}
      {isReceiptModalOpen && currentSaleReceipt && (
        <POSThermalReceiptModal
          sale={currentSaleReceipt}
          settings={settings}
          onClose={() => setIsReceiptModalOpen(false)}
          onNewSale={() => {
            setIsReceiptModalOpen(false);
            setCurrentSaleReceipt(null);
          }}
        />
      )}
    </div>
  );
};
