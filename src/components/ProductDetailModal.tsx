import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Star, 
  Check, 
  ShieldCheck, 
  Truck, 
  PhoneCall, 
  ShoppingBag, 
  AlertCircle,
  Package,
  Layers,
  ZoomIn,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose }) => {
  const { addToCart, setIsCartOpen, settings, productImageFit } = useStore();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [modalFit, setModalFit] = useState<'contain' | 'cover'>(productImageFit || 'contain');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const isOutOfStock = product.stock <= 0;

  const currentImgUrl = (product.images && product.images[selectedImage]) || product.images[0];

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const res = addToCart(product, quantity);
    if (res.success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);
    } else {
      alert(res.message);
    }
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const res = addToCart(product, quantity);
    if (res.success) {
      onClose();
      setIsCartOpen(true);
    } else {
      alert(res.message);
    }
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.images.length > 1) {
      setSelectedImage((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (product.images.length > 1) {
      setSelectedImage((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col md:flex-row"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-white/80 hover:bg-white text-slate-600 hover:text-slate-900 p-2 rounded-full border border-slate-200 shadow-sm transition-colors"
          title="Close details"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: Image Gallery */}
        <div className="md:w-1/2 bg-slate-50/80 p-6 flex flex-col justify-between border-r border-slate-100">
          <div>
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-xs mb-4 flex items-center justify-center group/main-img">
              {currentImgUrl ? (
                <img
                  src={currentImgUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full select-none transition-all duration-300 ${
                    modalFit === 'contain'
                      ? 'object-contain p-4 sm:p-6 drop-shadow-sm'
                      : 'object-cover'
                  }`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                  <Package className="w-14 h-14 text-slate-300 mb-2" />
                  <span className="text-xs font-semibold">{product.name}</span>
                </div>
              )}

              {/* Badges */}
              {product.isFeatured && (
                <span className="absolute top-3 left-3 bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md shadow-xs pointer-events-none">
                  Featured
                </span>
              )}

              {/* Fit Mode Toggle & Lightbox Zoom Button */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <button
                  type="button"
                  onClick={() => setModalFit(prev => prev === 'contain' ? 'cover' : 'contain')}
                  title={modalFit === 'contain' ? 'Switch to Fill Frame (Cover)' : 'Switch to Fit Entire Product (Contain)'}
                  className="bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200/90 shadow-xs flex items-center gap-1 transition-all backdrop-blur-xs"
                >
                  {modalFit === 'contain' ? (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fit</span>
                    </>
                  ) : (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>Fill</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  title="Enlarge product image full size"
                  className="bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 p-1.5 rounded-lg border border-slate-200/90 shadow-xs transition-all backdrop-blur-xs"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>

              {/* Prev / Next Arrows if multiple photos */}
              {product.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full border border-slate-200/80 shadow-xs opacity-0 group-hover/main-img:opacity-100 transition-opacity"
                    title="Previous image"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 p-1.5 rounded-full border border-slate-200/80 shadow-xs opacity-0 group-hover/main-img:opacity-100 transition-opacity"
                    title="Next image"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail list */}
            {product.images.length > 1 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-14 h-14 rounded-xl overflow-hidden border-2 p-1 bg-white flex items-center justify-center transition-all ${
                      selectedImage === idx 
                        ? 'border-amber-500 scale-105 shadow-xs' 
                        : 'border-slate-200/80 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`thumbnail ${idx + 1}`} 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-contain" 
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Direct Shop Hotline Notice */}
          <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <p className="font-bold text-slate-900">Need instant help with this product?</p>
              <a 
                href={`tel:${settings.phone.replace(/\s+/g, '')}`}
                className="text-amber-700 font-extrabold hover:underline"
              >
                Call shop directly: {settings.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Right: Details & Purchase */}
        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Category & SKU */}
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-bold text-amber-700 uppercase tracking-wider">{product.category}</span>
              <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">SKU: {product.sku}</span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight mb-2">
              {product.name}
            </h2>

            {/* Rating & Reviews */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-slate-900">{product.rating}</span>
              <span className="text-xs text-slate-400">({product.reviewsCount} verified reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-sm text-slate-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
              {product.originalPrice && (
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  Save ${(product.originalPrice - product.price).toFixed(2)}
                </span>
              )}
            </div>

            {/* Stock Level Tracker */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>Inventory Status:</span>
                </span>
                {isOutOfStock ? (
                  <span className="text-rose-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="text-amber-600 font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Low Stock ({product.stock} units left)
                  </span>
                ) : (
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> {product.stock} units in stock
                  </span>
                )}
              </div>

              {/* Progress bar for stock */}
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    isOutOfStock ? 'w-0' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: isOutOfStock ? '0%' : `${Math.min(100, (product.stock / 30) * 100)}%` }}
                />
              </div>
            </div>

            {/* Description */}
            <div className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
              {product.description}
            </div>

            {/* Key Features */}
            {product.features && product.features.length > 0 && (
              <div className="mb-5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  <span>Product Highlights</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Quantity & CTA */}
          <div className="pt-4 border-t border-slate-100">
            {!isOutOfStock && (
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-sm font-bold transition-colors"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-sm font-bold text-slate-900 bg-white min-w-10 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    disabled={quantity >= product.stock}
                    className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-40 text-sm font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
                <span className="text-[11px] text-slate-400">
                  (Total: ${(product.price * quantity).toFixed(2)})
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  isOutOfStock
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : isAdded
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-300'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
                  isOutOfStock
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                }`}
              >
                <span>Instant Checkout</span>
              </button>
            </div>

            {/* Guarantees */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Genuine Guarantee
              </span>
              <span className="flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-amber-500" /> Fast Dispatch
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Lightbox Topbar */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white mb-4 z-10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-200">{product.name}</span>
              {product.images.length > 1 && (
                <span className="text-xs bg-white/20 text-slate-300 px-2 py-0.5 rounded-full">
                  {selectedImage + 1} / {product.images.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalFit(prev => prev === 'contain' ? 'cover' : 'contain')}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 border border-white/10"
              >
                {modalFit === 'contain' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                <span>{modalFit === 'contain' ? 'Fit View' : 'Fill View'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="bg-white/10 hover:bg-rose-500 text-white p-2 rounded-xl transition-colors border border-white/10"
                title="Close lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Main Stage */}
          <div 
            className="relative w-full max-w-5xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-2"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={currentImgUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className={`max-h-[75vh] w-auto max-w-full ${
                modalFit === 'contain' ? 'object-contain' : 'object-cover w-full h-full'
              } transition-transform duration-300 select-none drop-shadow-2xl rounded-lg`}
            />

            {product.images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full border border-white/20 shadow-xl transition-all"
                  title="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/90 text-white p-3 rounded-full border border-white/20 shadow-xl transition-all"
                  title="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Lightbox Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-2 mt-4 z-10" onClick={e => e.stopPropagation()}>
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 p-1 bg-white/10 transition-all ${
                    selectedImage === idx ? 'border-amber-400 scale-110' : 'border-white/20 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
