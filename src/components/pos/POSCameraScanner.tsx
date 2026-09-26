import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Camera,
  X,
  Scan,
  CheckCircle,
  Volume2,
  VolumeX,
  Sparkles,
  MinusCircle,
  PlusCircle,
  RotateCcw,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  Zap,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Product } from '../../types';
import { posSound } from '../../utils/posSounds';

export interface POSCartItemRef {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount?: number;
}

interface POSCameraScannerProps {
  products: Product[];
  cartItems?: POSCartItemRef[];
  onProductScanned: (product: Product) => void;
  onProductUnscanned: (product: Product) => { success: boolean; message: string };
  onUpdateCartQuantity?: (productId: string, delta: number) => void;
  onRemoveCartItem?: (productId: string) => void;
  onClose: () => void;
  initialMode?: 'SCAN' | 'UNSCAN';
}

export const POSCameraScanner: React.FC<POSCameraScannerProps> = ({
  products,
  cartItems = [],
  onProductScanned,
  onProductUnscanned,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onClose,
  initialMode = 'SCAN',
}) => {
  // Mode: SCAN (Add +1) vs UNSCAN (Remove -1)
  const [scannerMode, setScannerMode] = useState<'SCAN' | 'UNSCAN'>(initialMode);
  
  // Camera State
  const [cameraActive, setCameraActive] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState(false);

  // Sound Feedback
  const [soundEnabled, setSoundEnabled] = useState(posSound.isEnabled());

  // Feedback Notification Toast
  const [feedback, setFeedback] = useState<{
    text: string;
    type: 'SCAN' | 'UNSCAN' | 'ERROR';
    productName?: string;
  } | null>(null);

  // Undo Tracking
  const [lastAction, setLastAction] = useState<{
    product: Product;
    type: 'SCAN' | 'UNSCAN';
    timestamp: number;
  } | null>(null);

  // Bottom Tab / Drawer: 'catalog' | 'cart'
  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');

  // Refs for media stream & barcode detector loop
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  // Fast map of cart quantities for quick lookup
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    cartItems.forEach((item) => {
      map.set(item.product.id, item.quantity);
    });
    return map;
  }, [cartItems]);

  const totalCartCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  const totalCartAmount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [cartItems]);

  // Clean and stop camera media stream
  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  };

  // Process a captured code (from camera BarcodeDetector, test buttons, or manual selection)
  const handleProcessCode = (rawCode: string) => {
    const now = Date.now();
    const cleanCode = rawCode.trim().toLowerCase();

    // Prevent rapid double-triggering for the exact same barcode within 1.5s
    if (lastScannedCodeRef.current === cleanCode && now - lastScanTimeRef.current < 1500) {
      return;
    }

    lastScannedCodeRef.current = cleanCode;
    lastScanTimeRef.current = now;

    // Look up product by barcode, SKU, or ID
    const matched = products.find(
      (p) =>
        p.sku.toLowerCase() === cleanCode ||
        (p.barcode && p.barcode.toLowerCase() === cleanCode) ||
        p.id.toLowerCase() === cleanCode ||
        p.name.toLowerCase() === cleanCode
    );

    if (!matched) {
      posSound.playError();
      setFeedback({
        text: `Barcode / SKU "${rawCode}" not recognized in inventory`,
        type: 'ERROR',
      });
      setTimeout(() => setFeedback(null), 3500);
      return;
    }

    if (scannerMode === 'SCAN') {
      // SCAN (+1)
      if (matched.stock <= 0) {
        posSound.playError();
        setFeedback({
          text: `"${matched.name}" is currently out of stock`,
          type: 'ERROR',
          productName: matched.name,
        });
        setTimeout(() => setFeedback(null), 3000);
        return;
      }

      const currentQty = cartQtyMap.get(matched.id) || 0;
      if (currentQty >= matched.stock) {
        posSound.playError();
        setFeedback({
          text: `Maximum inventory limit reached (${matched.stock} units)`,
          type: 'ERROR',
          productName: matched.name,
        });
        setTimeout(() => setFeedback(null), 3000);
        return;
      }

      posSound.playScanBeep();
      onProductScanned(matched);
      setLastAction({ product: matched, type: 'SCAN', timestamp: now });
      setFeedback({
        text: `Added: ${matched.name} (+1 in cart)`,
        type: 'SCAN',
        productName: matched.name,
      });
      setTimeout(() => setFeedback(null), 2500);
    } else {
      // UNSCAN (-1)
      const res = onProductUnscanned(matched);
      if (res.success) {
        posSound.playUnscanBeep();
        setLastAction({ product: matched, type: 'UNSCAN', timestamp: now });
        setFeedback({
          text: `Unscanned: ${matched.name} (-1 from cart)`,
          type: 'UNSCAN',
          productName: matched.name,
        });
        setTimeout(() => setFeedback(null), 2500);
      } else {
        posSound.playError();
        setFeedback({
          text: `Cannot unscan: "${matched.name}" is not in the cart`,
          type: 'ERROR',
          productName: matched.name,
        });
        setTimeout(() => setFeedback(null), 3500);
      }
    }
  };

  // Initialize and mount camera
  useEffect(() => {
    if (!cameraActive) {
      stopCamera();
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Live camera access is not supported by this browser. Use the sample barcodes below or manual SKU entry.'
      );
      return;
    }

    setCameraError(null);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Check torch capabilities
        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as { torch?: boolean } | undefined;
        if (capabilities?.torch) {
          setHasTorch(true);
        } else {
          setHasTorch(false);
        }

        // Initialize Native BarcodeDetector if available
        if ('BarcodeDetector' in window) {
          setIsBarcodeDetectorSupported(true);
          try {
            const barcodeDetector = new (window as any).BarcodeDetector({
              formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
            });

            scanIntervalRef.current = window.setInterval(async () => {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                try {
                  const barcodes = await barcodeDetector.detect(videoRef.current);
                  if (barcodes && barcodes.length > 0) {
                    const rawVal = barcodes[0].rawValue;
                    if (rawVal && rawVal.trim()) {
                      handleProcessCode(rawVal.trim());
                    }
                  }
                } catch {
                  // Silent frame error
                }
              }
            }, 300);
          } catch (e) {
            console.log('BarcodeDetector initialization skipped:', e);
          }
        }
      })
      .catch((err) => {
        console.warn('Camera stream error:', err);
        setCameraError(
          'Camera access not granted or unavailable. You can click test barcodes or search below to scan/unscan.'
        );
      });

    return () => {
      stopCamera();
    };
  }, [cameraActive, facingMode]);

  // Flashlight toggle
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Torch constraint error', err);
      }
    }
  };

  // Flip camera (environment <-> user)
  const toggleFacingMode = () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Undo Last Action (e.g. if cashier accidentally scanned or unscanned)
  const handleUndoLastAction = () => {
    if (!lastAction) return;

    if (lastAction.type === 'SCAN') {
      // Undo scan -> unscan it
      onProductUnscanned(lastAction.product);
      posSound.playUnscanBeep();
      setFeedback({
        text: `Undid scan: Removed ${lastAction.product.name} (-1)`,
        type: 'UNSCAN',
        productName: lastAction.product.name,
      });
    } else {
      // Undo unscan -> add it back
      onProductScanned(lastAction.product);
      posSound.playScanBeep();
      setFeedback({
        text: `Undid unscan: Re-added ${lastAction.product.name} (+1)`,
        type: 'SCAN',
        productName: lastAction.product.name,
      });
    }

    setLastAction(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  // Filter products for quick test scanner
  const filteredCatalog = useMemo(() => {
    if (!catalogSearch.trim()) return products.slice(0, 8);
    const q = catalogSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, catalogSearch]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-3.5 my-auto">
        
        {/* Header with Mode Toggle & Close */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-colors ${
                scannerMode === 'UNSCAN'
                  ? 'bg-rose-500/20 text-rose-600'
                  : 'bg-amber-500/20 text-amber-700'
              }`}
            >
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-slate-900">Live Camera Barcode &amp; QR Scanner</h3>
                {isBarcodeDetectorSupported && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    Live AI Vision
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                Point camera at retail barcode, EAN/UPC label, or QR code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRIMARY SCAN / UNSCAN MODE SEGMENTED SWITCH */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScannerMode('SCAN')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              scannerMode === 'SCAN'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>SCAN MODE (+1 Add)</span>
          </button>

          <button
            type="button"
            onClick={() => setScannerMode('UNSCAN')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              scannerMode === 'UNSCAN'
                ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/40'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <MinusCircle className="w-4 h-4" />
            <span>UNSCAN MODE (-1 Remove)</span>
          </button>
        </div>

        {/* Mode Status Indicator Banner */}
        <div
          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-between transition-colors ${
            scannerMode === 'UNSCAN'
              ? 'bg-rose-50 border border-rose-200 text-rose-800'
              : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {scannerMode === 'UNSCAN' ? (
              <>
                <MinusCircle className="w-4 h-4 text-rose-600" />
                <span>UNSCAN ACTIVE: Detected barcode will be deducted (-1) from cart</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4 text-emerald-600" />
                <span>SCAN ACTIVE: Detected barcode will be added (+1) to cart</span>
              </>
            )}
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">
            {cartItems.length} in cart
          </span>
        </div>

        {/* Live Camera Viewfinder Screen */}
        <div className="relative aspect-video sm:aspect-16/10 bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex items-center justify-center shadow-inner">
          {cameraActive && !cameraError ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6 text-slate-400 space-y-1">
              <Camera className="w-10 h-10 mx-auto text-slate-600" />
              <p className="text-xs max-w-xs">{cameraError || 'Camera preview inactive'}</p>
            </div>
          )}

          {/* Aiming Reticle & Animated Scan Laser (Changes color based on mode!) */}
          <div
            className={`absolute inset-6 sm:inset-10 border-2 rounded-2xl pointer-events-none flex items-center justify-center transition-all ${
              scannerMode === 'UNSCAN'
                ? 'border-dashed border-rose-500 bg-rose-500/5 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                : 'border-dashed border-amber-400/90 bg-amber-400/5 shadow-[0_0_15px_rgba(251,191,36,0.25)]'
            }`}
          >
            {/* Horizontal Laser Sweep */}
            <div
              className={`w-full h-0.5 shadow-lg animate-bounce ${
                scannerMode === 'UNSCAN'
                  ? 'bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_rgba(244,63,94,1)]'
                  : 'bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,1)]'
              }`}
            />

            {/* Viewfinder Center Target Tag */}
            <div
              className={`absolute top-2 px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                scannerMode === 'UNSCAN'
                  ? 'bg-rose-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {scannerMode === 'UNSCAN' ? '🔴 Unscan Viewport (-1)' : '🟢 Barcode Target (+1)'}
            </div>
          </div>

          {/* Quick Camera Overlay Controls (Top Right) */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            {hasTorch && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                  torchOn
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-lg'
                    : 'bg-black/50 text-white hover:bg-black/70'
                }`}
                title="Toggle Torch / Flashlight"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleFacingMode}
              className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
              title="Switch Camera (Front/Back)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                const next = posSound.toggleSound();
                setSoundEnabled(next);
              }}
              className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                soundEnabled ? 'bg-black/50 text-white' : 'bg-rose-500/80 text-white'
              }`}
              title={soundEnabled ? 'Mute scanner sounds' : 'Unmute scanner sounds'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Real-time Feedback Toast (Bottom Overlay) */}
          {feedback && (
            <div
              className={`absolute inset-x-4 bottom-3 text-white text-xs font-bold py-2.5 px-3.5 rounded-xl backdrop-blur-md flex items-center justify-between gap-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 z-20 ${
                feedback.type === 'UNSCAN'
                  ? 'bg-rose-600/95 border border-rose-400'
                  : feedback.type === 'SCAN'
                  ? 'bg-emerald-600/95 border border-emerald-400'
                  : 'bg-amber-600/95 border border-amber-400'
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === 'UNSCAN' ? (
                  <MinusCircle className="w-4 h-4 shrink-0 text-white" />
                ) : feedback.type === 'SCAN' ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-white" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                )}
                <span className="truncate">{feedback.text}</span>
              </div>
            </div>
          )}
        </div>

        {/* Undo Last Action Banner (if cashier scanned/unscanned recently) */}
        {lastAction && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2 flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 text-[11px] truncate">
              Last action: <strong className="text-slate-900">{lastAction.product.name}</strong> (
              {lastAction.type === 'SCAN' ? '+1 added' : '-1 unscanned'})
            </span>
            <button
              type="button"
              onClick={handleUndoLastAction}
              className="bg-white hover:bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg border border-slate-300 transition-colors flex items-center gap-1 shrink-0 shadow-2xs text-[11px]"
            >
              <RotateCcw className="w-3 h-3 text-amber-600" />
              <span>Undo {lastAction.type === 'SCAN' ? 'Scan (Unscan)' : 'Unscan (Re-add)'}</span>
            </button>
          </div>
        )}

        {/* Bottom Switcher: Quick Catalog Test vs Current Cart Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`font-bold pb-1 transition-colors border-b-2 ${
                  activeTab === 'catalog'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Catalog &amp; Sample Barcodes
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cart')}
                className={`font-bold pb-1 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'cart'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Current Cart ({totalCartCount} items)</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-500 font-mono font-bold">
              Subtotal: ${totalCartAmount.toFixed(2)}
            </span>
          </div>

          {/* TAB 1: CATALOG & SAMPLE BARCODES */}
          {activeTab === 'catalog' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Filter product barcode or SKU..."
                  className="w-full bg-slate-50 text-xs text-slate-800 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {filteredCatalog.map((prod) => {
                  const qtyInCart = cartQtyMap.get(prod.id) || 0;
                  const isUnscanDisabled = scannerMode === 'UNSCAN' && qtyInCart === 0;

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleProcessCode(prod.sku)}
                      disabled={isUnscanDisabled}
                      className={`text-left p-2 rounded-xl border transition-all relative ${
                        isUnscanDisabled
                          ? 'bg-slate-100 border-slate-200 opacity-50 cursor-not-allowed'
                          : scannerMode === 'UNSCAN'
                          ? 'bg-rose-50/60 hover:bg-rose-100/70 border-rose-200 hover:border-rose-300'
                          : 'bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="font-bold text-xs text-slate-900 truncate">{prod.name}</div>
                        {qtyInCart > 0 && (
                          <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-md shrink-0">
                            {qtyInCart}x
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="truncate">{prod.sku}</span>
                        <span className="font-bold text-slate-800">${prod.price.toFixed(2)}</span>
                      </div>

                      {/* Click Action Badge */}
                      <div className="mt-1 flex items-center gap-1 text-[9px] font-bold">
                        {scannerMode === 'UNSCAN' ? (
                          <span className={qtyInCart > 0 ? 'text-rose-600' : 'text-slate-400'}>
                            {qtyInCart > 0 ? 'Click to Unscan (-1)' : 'Not in cart'}
                          </span>
                        ) : (
                          <span className="text-emerald-600">Click to Scan (+1)</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: CURRENT CART ITEMS & DIRECT UNSCAN ACTION */}
          {activeTab === 'cart' && (
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
              {cartItems.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-1 opacity-40" />
                  <span>Cart is empty. Switch to Scan mode or click items to add.</span>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-900 truncate">{item.product.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                        <span>SKU: {item.product.sku}</span>
                        <span>•</span>
                        <span>${item.unitPrice.toFixed(2)} ea</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Direct Unscan Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateCartQuantity) {
                            onUpdateCartQuantity(item.product.id, -1);
                            posSound.playUnscanBeep();
                          } else {
                            onProductUnscanned(item.product);
                          }
                        }}
                        className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-black px-2 py-1 rounded-lg text-xs transition-colors flex items-center gap-1"
                        title="Unscan (-1)"
                      >
                        <MinusCircle className="w-3.5 h-3.5" />
                        <span>Unscan</span>
                      </button>

                      <span className="font-black text-slate-900 px-1.5 text-xs">
                        {item.quantity}
                      </span>

                      {/* Add Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onUpdateCartQuantity) {
                            onUpdateCartQuantity(item.product.id, 1);
                            posSound.playScanBeep();
                          } else {
                            onProductScanned(item.product);
                          }
                        }}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-black p-1 rounded-lg text-xs transition-colors"
                        title="Add (+1)"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete All Button */}
                      {onRemoveCartItem && (
                        <button
                          type="button"
                          onClick={() => {
                            onRemoveCartItem(item.product.id);
                            posSound.playUnscanBeep();
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                          title="Remove entirely from cart"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setScannerMode((prev) => (prev === 'SCAN' ? 'UNSCAN' : 'SCAN'))}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
              scannerMode === 'UNSCAN'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Switch to {scannerMode === 'SCAN' ? 'Unscan Mode' : 'Scan Mode'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
          >
            Finished Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
