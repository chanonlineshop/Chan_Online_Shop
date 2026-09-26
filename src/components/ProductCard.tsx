import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  ShoppingBag, 
  Eye, 
  Star, 
  Check, 
  AlertCircle,
  Phone,
  Maximize2,
  Minimize2,
  Package
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, setSelectedProductForDetail, settings, productImageFit, setProductImageFit } = useStore();
  const [isAdded, setIsAdded] = useState(false);
  const [cardFitOverride, setCardFitOverride] = useState<'contain' | 'cover' | null>(null);
  const [imgError, setImgError] = useState(false);

  const effectiveFit = cardFitOverride || productImageFit || 'contain';

  const isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold;
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;

    const res = addToCart(product, 1);
    if (res.success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1500);
    } else {
      alert(res.message);
    }
  };

  const toggleCardFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextFit = effectiveFit === 'contain' ? 'cover' : 'contain';
    setCardFitOverride(nextFit);
  };

  const discountPercent = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  return (
    <div 
      onClick={() => setSelectedProductForDetail(product)}
      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-amber-400/50 shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
    >
      {/* Product Image Stage */}
      <div 
        className={`relative aspect-square w-full overflow-hidden transition-colors ${
          effectiveFit === 'contain' 
            ? 'bg-radial from-white via-slate-50 to-slate-100/60 p-3 sm:p-4 flex items-center justify-center' 
            : 'bg-slate-100'
        }`}
      >
        {!imgError && product.images && product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ease-out select-none ${
              effectiveFit === 'contain'
                ? 'object-contain object-center drop-shadow-xs'
                : 'object-cover object-center'
            }`}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 p-4 text-center">
            <Package className="w-10 h-10 text-slate-300 mb-1" />
            <span className="text-[11px] font-semibold text-slate-400">{product.name}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10 pointer-events-none">
          {discountPercent > 0 && (
            <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
              -{discountPercent}%
            </span>
          )}
          {product.isFeatured && (
            <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md shadow-xs">
              Popular
            </span>
          )}
        </div>

        {/* Stock Status Badge */}
        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
          {isOutOfStock ? (
            <span className="bg-slate-900/90 backdrop-blur-xs text-rose-400 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-xs">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>Out of Stock</span>
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-500/90 backdrop-blur-xs text-slate-950 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-xs animate-pulse">
              <AlertCircle className="w-3 h-3 text-slate-950" />
              <span>Only {product.stock} left!</span>
            </span>
          ) : (
            <span className="bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-1 rounded-md shadow-xs">
              In Stock ({product.stock})
            </span>
          )}
        </div>

        {/* Image Fit Switcher Pill on hover */}
        <button
          type="button"
          onClick={toggleCardFit}
          title={effectiveFit === 'contain' ? 'Switch to Fill Frame (Cover)' : 'Switch to Fit Entire Product (Contain)'}
          className="absolute bottom-2.5 right-2.5 z-10 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-950 text-[10px] font-bold px-2 py-1 rounded-lg border border-slate-200/80 shadow-xs opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 backdrop-blur-xs"
        >
          {effectiveFit === 'contain' ? (
            <>
              <Maximize2 className="w-3 h-3 text-slate-500" />
              <span>Fit</span>
            </>
          ) : (
            <>
              <Minimize2 className="w-3 h-3 text-slate-500" />
              <span>Fill</span>
            </>
          )}
        </button>

        {/* Quick View Hover Action */}
        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4 pointer-events-none">
          <span className="bg-white text-slate-900 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
            <Eye className="w-3.5 h-3.5 text-slate-600" />
            <span>Quick View</span>
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & SKU */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1.5">
            <span className="text-amber-700 font-semibold">{product.category}</span>
            <span>SKU: {product.sku}</span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-600 transition-colors mb-2">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex items-center text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            </div>
            <span className="text-xs font-bold text-slate-800">{product.rating.toFixed(1)}</span>
            <span className="text-[11px] text-slate-400">({product.reviewsCount})</span>
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                ${product.price.toFixed(2)}
              </span>
              {product.originalPrice && (
                <span className="text-xs text-slate-400 line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {isOutOfStock ? 'Notify when restocked' : `Max ${product.stock} available`}
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Direct Call Button */}
            <a
              href={`tel:${settings.phone.replace(/\s+/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              title={`Call ${settings.phone} to order this product`}
              className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors"
            >
              <Phone className="w-4 h-4" />
            </a>

            {/* Add to Cart Button */}
            <button
              id={`add-to-cart-${product.id}`}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                isOutOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : isAdded
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 shadow-xs active:scale-95'
              }`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : isOutOfStock ? (
                <span>Sold Out</span>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Add</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
