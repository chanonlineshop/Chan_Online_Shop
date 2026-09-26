import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  ArrowRight, 
  ShieldCheck, 
  Truck,
  Plus,
  Minus,
  Percent,
  Tag
} from 'lucide-react';

interface CartDrawerProps {
  onOpenCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout }) => {
  const { 
    cart, 
    isCartOpen, 
    setIsCartOpen, 
    updateCartQuantity, 
    removeFromCart, 
    cartSubtotal, 
    cartDiscountType,
    cartDiscountValue,
    cartDiscountAmount,
    setCartDiscount,
    clearCartDiscount,
    settings 
  } = useStore();

  const [drawerCouponCode, setDrawerCouponCode] = useState('');
  const [drawerCouponMsg, setDrawerCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isCartOpen) return null;

  const freeShippingThreshold = settings.freeShippingThreshold;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);
  const progressPercent = Math.min(100, (cartSubtotal / freeShippingThreshold) * 100);

  const shippingFee = cartSubtotal >= freeShippingThreshold || cartSubtotal === 0 
    ? 0 
    : settings.standardShippingFee;

  const estimatedTotal = Math.max(0, cartSubtotal - cartDiscountAmount + shippingFee);

  const handleAdjustDiscount = (delta: number) => {
    const next = Math.max(0, Number((cartDiscountValue + delta).toFixed(2)));
    setCartDiscount(cartDiscountType === 'percent' ? Math.min(100, next) : next, cartDiscountType);
    setDrawerCouponMsg(null);
  };

  const handleApplyDrawerCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = drawerCouponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'WELCOME10' || code === 'SAVE10') {
      setCartDiscount(10, 'percent');
      setDrawerCouponMsg({ type: 'success', text: `Promo "${code}" applied: 10% OFF!` });
    } else if (code === 'VIP20' || code === 'SAVE20') {
      setCartDiscount(20, 'percent');
      setDrawerCouponMsg({ type: 'success', text: `VIP "${code}" applied: 20% OFF!` });
    } else if (code === 'SAVE5' || code === 'PROMO5') {
      setCartDiscount(5, 'fixed');
      setDrawerCouponMsg({ type: 'success', text: `Voucher "${code}" applied: $5.00 OFF!` });
    } else {
      setDrawerCouponMsg({ type: 'error', text: `Invalid coupon "${code}". Try WELCOME10, SAVE5, or use the direct amount adjuster.` });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={() => setIsCartOpen(false)} 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Your Shopping Cart</h3>
                <p className="text-xs text-slate-500">{cart.length} unique items</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Meter */}
          <div className="px-5 py-3 bg-amber-50/60 border-b border-amber-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                {remainingForFreeShipping > 0 ? (
                  <span>Add <strong className="text-amber-700">${remainingForFreeShipping.toFixed(2)}</strong> more for Free Delivery</span>
                ) : (
                  <span className="text-emerald-700 font-bold">You unlocked Free Delivery!</span>
                )}
              </span>
              <span className="text-[11px] font-bold text-slate-500">{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm mb-1">Your cart is empty</h4>
                <p className="text-xs text-slate-500 mb-5 max-w-xs">
                  Browse our inventory of premium electronics, fashion, and lifestyle items.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-amber-500 hover:text-slate-950 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.map(item => {
                const availableStock = item.product.stock;

                return (
                  <div 
                    key={item.product.id}
                    className="flex gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                      <img 
                        src={item.product.images[0]} 
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {item.product.sku}</p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                        <span className="font-extrabold text-xs text-slate-900">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>

                        {/* Quantity controls */}
                        <div className="flex items-center border border-slate-200 rounded-lg bg-white shadow-2xs">
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 text-slate-600 hover:bg-slate-100 rounded-l-lg transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-slate-900 min-w-6 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= availableStock}
                            className="p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded-r-lg transition-colors"
                            title={item.quantity >= availableStock ? 'Max stock reached' : 'Add 1'}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer & Checkout Action */}
          {cart.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-white space-y-3">
              {/* Discount Amount Adjustment Panel */}
              <div className="p-3 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                      <Percent className="w-3 h-3" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                      Discount Adjustment
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* % / $ Switcher */}
                    <div className="flex items-center bg-white p-0.5 rounded-lg border border-amber-200 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setCartDiscount(cartDiscountValue, 'percent')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          cartDiscountType === 'percent'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => setCartDiscount(cartDiscountValue, 'fixed')}
                        className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                          cartDiscountType === 'fixed'
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        $
                      </button>
                    </div>

                    {cartDiscountValue > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearCartDiscount();
                          setDrawerCouponMsg(null);
                        }}
                        className="text-[10px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Amount Stepper & Direct Input */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdjustDiscount(cartDiscountType === 'percent' ? -5 : -1)}
                    disabled={cartDiscountValue <= 0}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 text-slate-800 flex items-center justify-center font-bold text-xs transition-colors shrink-0 cursor-pointer"
                    title={cartDiscountType === 'percent' ? 'Decrease 5%' : 'Decrease $1'}
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="0"
                      max={cartDiscountType === 'percent' ? 100 : cartSubtotal}
                      step={cartDiscountType === 'percent' ? '1' : '0.50'}
                      value={cartDiscountValue === 0 ? '' : cartDiscountValue}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                        setCartDiscount(isNaN(val) ? 0 : Math.max(0, val), cartDiscountType);
                      }}
                      placeholder="0"
                      className="w-full bg-white border border-amber-300 rounded-lg px-2 py-1 text-xs font-black text-slate-900 text-center outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      {cartDiscountType === 'percent' ? '%' : '$'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustDiscount(cartDiscountType === 'percent' ? 5 : 1)}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs transition-colors shrink-0 cursor-pointer"
                    title={cartDiscountType === 'percent' ? 'Increase 5%' : 'Increase $1'}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[9px] text-slate-400 font-medium">Presets:</span>
                  {cartDiscountType === 'percent' ? (
                    [5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setCartDiscount(pct, 'percent')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                          cartDiscountValue === pct
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))
                  ) : (
                    [1, 2, 5, 10].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setCartDiscount(amt, 'fixed')}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                          cartDiscountValue === amt
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))
                  )}
                </div>

                {/* Promo Code Input */}
                <form onSubmit={handleApplyDrawerCoupon} className="flex items-center gap-1.5 pt-1 border-t border-amber-200/60">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={drawerCouponCode}
                      onChange={(e) => setDrawerCouponCode(e.target.value)}
                      placeholder="Promo code (e.g. WELCOME10, SAVE5)"
                      className="w-full text-[10px] bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1 outline-none uppercase font-mono"
                    />
                    <Tag className="w-2.5 h-2.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  </div>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Apply
                  </button>
                </form>

                {drawerCouponMsg && (
                  <p className={`text-[10px] ${drawerCouponMsg.type === 'success' ? 'text-emerald-700 font-bold' : 'text-rose-600'}`}>
                    {drawerCouponMsg.text}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-800">${cartSubtotal.toFixed(2)}</span>
                </div>
                {cartDiscountAmount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    <span className="flex items-center gap-1">
                      <span>Discount Adjustment</span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded">
                        {cartDiscountType === 'percent' ? `${cartDiscountValue}%` : `$${cartDiscountValue.toFixed(2)}`}
                      </span>
                    </span>
                    <span>-${cartDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Standard Shipping</span>
                  <span className="font-medium text-slate-800">
                    {shippingFee === 0 ? (
                      <span className="text-emerald-600 font-bold">FREE</span>
                    ) : (
                      `$${shippingFee.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Estimated Total</span>
                  <span className="text-base text-amber-600">${estimatedTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                id="cart-proceed-checkout-button"
                onClick={() => {
                  setIsCartOpen(false);
                  onOpenCheckout();
                }}
                className="w-full bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 py-3.5 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
              >
                <span>Proceed to Secure Gateway</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>256-Bit SSL Encrypted &amp; PCI-DSS Gateway</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
