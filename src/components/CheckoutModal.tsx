import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { PaymentMethod } from '../types';
import { 
  X, 
  Lock, 
  ShieldCheck, 
  CreditCard, 
  QrCode, 
  Truck, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Phone,
  ZoomIn,
  Download,
  Printer,
  FileText,
  Percent,
  Tag,
  Minus,
  Plus
} from 'lucide-react';
import { ThermalReceiptSlip, triggerThermalPrint, ThermalReceiptData } from './ThermalReceiptSlip';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onOrderSuccess }) => {
  const { 
    cart, 
    cartSubtotal, 
    settings, 
    placeOrder,
    cartDiscountType,
    cartDiscountValue,
    setCartDiscount,
    clearCartDiscount
  } = useStore();

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Phnom Penh');
  const [notes, setNotes] = useState('');

  // Payment Method Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Card Inputs
  const [cardNumber, setCardNumber] = useState('4242 8888 9999 1234');
  const [cardHolder, setCardHolder] = useState('CHAN SOKHA');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('888');

  // Gateway Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const [showThreeDSecure, setShowThreeDSecure] = useState(false);
  const [otpCode, setOtpCode] = useState('778899');
  const [errorMsg, setErrorMsg] = useState('');
  const [showEnlargedQR, setShowEnlargedQR] = useState(false);
  const [qrTypeSelection, setQrTypeSelection] = useState<'khqr' | 'aba'>('khqr');

  // Thermal Print Receipt Toggle state
  const [printReceipt, setPrintReceipt] = useState<boolean>(() => {
    try {
      return localStorage.getItem('chan_print_receipt_checkout') !== 'false';
    } catch {
      return true;
    }
  });
  const [thermalPaperWidth, setThermalPaperWidth] = useState<'80mm' | '58mm'>('80mm');
  const [showThermalPreview, setShowThermalPreview] = useState(false);

  // Discount Adjustment & Coupon State (Initialized from Cart Drawer / Store)
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(cartDiscountType || 'percent');
  const [discountValue, setDiscountValue] = useState<number>(cartDiscountValue || 0);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponMsg, setCouponMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Synchronize when checkout modal is opened
  useEffect(() => {
    if (isOpen && cartDiscountValue > 0) {
      setDiscountType(cartDiscountType);
      setDiscountValue(cartDiscountValue);
    }
  }, [isOpen, cartDiscountType, cartDiscountValue]);

  const discountAmount = useMemo(() => {
    if (discountValue <= 0 || cartSubtotal <= 0) return 0;
    if (discountType === 'percent') {
      const clamped = Math.min(100, Math.max(0, discountValue));
      return (cartSubtotal * clamped) / 100;
    } else {
      return Math.min(cartSubtotal, Math.max(0, discountValue));
    }
  }, [cartSubtotal, discountType, discountValue]);

  if (!isOpen) return null;

  const shippingFee = cartSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
  const grandTotal = Math.max(0, cartSubtotal - discountAmount + shippingFee);

  const handleAdjustDiscount = (delta: number) => {
    const next = Math.max(0, Number((discountValue + delta).toFixed(2)));
    setDiscountValue(discountType === 'percent' ? Math.min(100, next) : next);
    setCouponApplied(null);
    setCouponMsg(null);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'WELCOME10' || code === 'SAVE10') {
      setDiscountType('percent');
      setDiscountValue(10);
      setCouponApplied(code);
      setCouponMsg({ type: 'success', text: `Coupon "${code}" applied: 10% OFF!` });
    } else if (code === 'VIP20' || code === 'SAVE20') {
      setDiscountType('percent');
      setDiscountValue(20);
      setCouponApplied(code);
      setCouponMsg({ type: 'success', text: `VIP Coupon "${code}" applied: 20% OFF!` });
    } else if (code === 'SAVE5' || code === 'PROMO5') {
      setDiscountType('fixed');
      setDiscountValue(5);
      setCouponApplied(code);
      setCouponMsg({ type: 'success', text: `Coupon "${code}" applied: $5.00 OFF!` });
    } else {
      setCouponMsg({ type: 'error', text: `Invalid coupon "${code}". Try WELCOME10, SAVE5, or use the direct adjustment controls.` });
    }
  };

  // Format Card Number
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Expiry
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const detectCardBrand = () => {
    const clean = cardNumber.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5')) return 'MASTERCARD';
    if (clean.startsWith('3')) return 'AMEX';
    return 'CARD';
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !phoneNumber.trim() || !address.trim()) {
      setErrorMsg('Please complete all required customer delivery information.');
      return;
    }

    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s+/g, '').length < 15 || !cardExpiry || !cardCvv) {
        setErrorMsg('Please enter valid credit or debit card details.');
        return;
      }

      // Trigger 3D Secure Verification
      setShowThreeDSecure(true);
      return;
    }

    await finalizeOrderPlacement();
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit authentication OTP code.');
      return;
    }
    setShowThreeDSecure(false);
    await finalizeOrderPlacement();
  };

  const finalizeOrderPlacement = async () => {
    setIsProcessing(true);
    setProcessingStage('Initiating 256-Bit SSL Handshake...');

    try {
      await new Promise(r => setTimeout(r, 700));
      setProcessingStage('Verifying with Payment Network & Bank Gateway...');
      await new Promise(r => setTimeout(r, 800));
      setProcessingStage('Reserving Stock & Generating Invoice...');
      await new Promise(r => setTimeout(r, 600));

      const providerMap = {
        card: `Global CyberPay SSL Gateway (${detectCardBrand()})`,
        khqr: 'National Bakong KHQR Gateway',
        aba: 'ABA Pay Merchant Switch',
        cod: 'Chan Online Shop Direct Dispatch COD',
      };

      await placeOrder(
        {
          fullName,
          phoneNumber,
          email: email || `${phoneNumber.replace(/\s+/g, '')}@chan-customer.kh`,
          address,
          city,
          notes,
        },
        paymentMethod,
        providerMap[paymentMethod],
        discountAmount
      );

      setIsProcessing(false);
      onClose();
      onOrderSuccess();

      // Trigger browser print dialog formatted specifically for thermal printers if toggle is ON
      if (printReceipt) {
        setTimeout(() => {
          triggerThermalPrint(thermalPaperWidth);
        }, 180);
      }
    } catch (err: unknown) {
      console.error(err);
      setIsProcessing(false);
      setErrorMsg('Payment verification encountered an issue. Please try again or call our hotline.');
    }
  };

  // Draft thermal receipt data for in-modal preview and test print
  const currentDraftReceiptData: ThermalReceiptData = {
    receiptNumber: `COS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    orderDate: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    customerName: fullName.trim() || 'Valued Customer',
    customerPhone: phoneNumber.trim() || settings.phone,
    customerAddress: address.trim() || 'Direct Storefront Order',
    customerCity: city,
    customerNotes: notes.trim() || undefined,
    items: cart.map(it => ({
      productName: it.product.name,
      sku: it.product.sku,
      quantity: it.quantity,
      price: it.product.price,
      total: it.product.price * it.quantity,
    })),
    subtotal: cartSubtotal,
    shippingFee,
    discount: discountAmount > 0 ? discountAmount : undefined,
    total: grandTotal,
    paymentMethod: paymentMethod.toUpperCase(),
    paymentStatus: paymentMethod === 'cod' ? 'PENDING COD' : 'PAID (ONLINE AUTH)',
    transactionRef: `TXN-${paymentMethod.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    cashierName: 'Web Checkout POS',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Top Security Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">Secure Payment Gateway</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> 256-Bit SSL
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Official Checkout for <strong className="text-amber-400">{settings.shopName}</strong> (Hotline: {settings.phone})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmitOrder} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Customer & Delivery Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>1. Customer Delivery Details</span>
              <span className="text-slate-400 normal-case font-normal text-[11px]">All fields required *</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kolvirak Keo"
                  className="w-full text-xs bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number (Call / Telegram) *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 070 433 464 or 012 xxx xxx"
                    className="w-full text-xs bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl pl-9 pr-3.5 py-2.5 outline-none transition-all"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (for e-receipt)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Province *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3 py-2.5 outline-none transition-all"
                >
                  <option value="Phnom Penh">Phnom Penh (Express Delivery)</option>
                  <option value="Siem Reap">Siem Reap</option>
                  <option value="Battambang">Battambang</option>
                  <option value="Sihanoukville">Sihanoukville</option>
                  <option value="Kampot">Kampot</option>
                  <option value="Kandal">Kandal</option>
                  <option value="Other Province">Other Province (VET / J&T)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Delivery Address (Street, House No, Sangkat/Khan) *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. St. 271, Sangkat Boeung Tumpun, Khan Mean Chey"
                  className="w-full text-xs bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Payment Gateway Selection */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>2. Choose Payment Gateway</span>
              <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> PCI-DSS Certified
              </span>
            </h4>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              {/* Option 1: Credit / Debit Card */}
              <div
                onClick={() => setPaymentMethod('card')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'card'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-bold uppercase bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-700">
                    Visa / MC
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">Credit / Debit Card</p>
                <p className="text-[10px] text-slate-500">256-Bit SSL Instant</p>
              </div>

              {/* Option 2: KHQR / Bakong */}
              <div
                onClick={() => setPaymentMethod('khqr')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'khqr'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <QrCode className={`w-5 h-5 ${paymentMethod === 'khqr' ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-bold uppercase bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                    Bakong KHQR
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">KHQR / ABA Pay</p>
                <p className="text-[10px] text-slate-500">Scan &amp; Instant Pay</p>
              </div>

              {/* Option 3: Cash On Delivery */}
              <div
                onClick={() => setPaymentMethod('cod')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Truck className={`w-5 h-5 ${paymentMethod === 'cod' ? 'text-amber-600' : 'text-slate-500'}`} />
                  <span className="text-[10px] font-bold uppercase bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-700">
                    Cash
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-900">Cash on Delivery</p>
                <p className="text-[10px] text-slate-500">Pay upon receipt</p>
              </div>
            </div>

            {/* Dynamic Gateway View Based on Selected Method */}

            {/* CARD FORM */}
            {paymentMethod === 'card' && (
              <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3.5 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
                  <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> End-to-End Tokenized Card Gateway
                  </span>
                  <span className="font-mono text-slate-300">{detectCardBrand()}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      className="w-full bg-slate-800/90 text-white font-mono text-sm px-3.5 py-2.5 rounded-xl border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none tracking-wider"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                      {detectCardBrand()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Expiry (MM/YY)
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={handleExpiryChange}
                      placeholder="MM/YY"
                      className="w-full bg-slate-800/90 text-white font-mono text-xs px-3.5 py-2 rounded-xl border border-slate-700 focus:border-amber-400 outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <span>CVV / CVC</span>
                      <span title="3 digits on back of card"><HelpCircle className="w-3 h-3 text-slate-400" /></span>
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="•••"
                      className="w-full bg-slate-800/90 text-white font-mono text-xs px-3.5 py-2 rounded-xl border border-slate-700 focus:border-amber-400 outline-none text-center tracking-widest"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      placeholder="NAME ON CARD"
                      className="w-full bg-slate-800/90 text-white text-xs px-3.5 py-2 rounded-xl border border-slate-700 focus:border-amber-400 outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Simulated Test Mode: Pre-filled &amp; ready to verify</span>
                  <span className="text-amber-400 font-semibold">3D Secure 2.0 Enabled</span>
                </div>
              </div>
            )}

            {/* KHQR / BANK QR FORM */}
            {paymentMethod === 'khqr' && (
              <div className="p-4 bg-rose-50/70 rounded-2xl border border-rose-200/80 text-center space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-xs">
                    <QrCode className="w-3.5 h-3.5" />
                    <span>National KHQR • Bakong Standard</span>
                  </div>

                  {settings.abaQrCodeUrl && (
                    <div className="flex bg-rose-100 p-0.5 rounded-full text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setQrTypeSelection('khqr')}
                        className={`px-2.5 py-0.5 rounded-full transition-colors ${
                          qrTypeSelection === 'khqr' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        KHQR
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrTypeSelection('aba')}
                        className={`px-2.5 py-0.5 rounded-full transition-colors ${
                          qrTypeSelection === 'aba' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600'
                        }`}
                      >
                        ABA QR
                      </button>
                    </div>
                  )}
                </div>

                {/* KHQR Mock Frame */}
                <div className="mx-auto w-52 bg-white p-3.5 rounded-2xl border-2 border-rose-500 shadow-md flex flex-col items-center">
                  <div className={`w-full text-white py-1 text-[10px] font-black tracking-wider uppercase rounded-md mb-2 flex items-center justify-center gap-1.5 ${
                    qrTypeSelection === 'aba' && settings.abaQrCodeUrl ? 'bg-sky-600' : 'bg-rose-600'
                  }`}>
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{qrTypeSelection === 'aba' && settings.abaQrCodeUrl ? 'ABA PayWay' : 'KHQR Pay'}</span>
                  </div>

                  {/* QR Matrix or Uploaded Merchant QR Code */}
                  {(qrTypeSelection === 'aba' && settings.abaQrCodeUrl) || settings.customQrCodeUrl ? (
                    <div 
                      onClick={() => setShowEnlargedQR(true)}
                      className="w-40 h-40 bg-white p-1 rounded-xl border border-slate-200 flex items-center justify-center cursor-pointer group relative overflow-hidden shadow-2xs"
                      title="Click to view full-size QR code"
                    >
                      <img 
                        src={qrTypeSelection === 'aba' && settings.abaQrCodeUrl ? settings.abaQrCodeUrl : settings.customQrCodeUrl} 
                        alt="Merchant Payment QR" 
                        className="w-full h-full object-contain rounded-lg"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition-opacity gap-1">
                        <ZoomIn className="w-3.5 h-3.5" /> Enlarge
                      </div>
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-slate-900 rounded-lg p-2 flex items-center justify-center relative">
                      {/* Simulated Authentic QR Matrix */}
                      <div className="w-full h-full bg-white flex flex-col items-center justify-center p-1 rounded">
                        <div className="grid grid-cols-5 gap-1 w-full h-full">
                          {[...Array(25)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`rounded-xs ${
                                i === 0 || i === 4 || i === 20 || i === 12 || i === 7 || i === 18 || i === 24
                                  ? 'bg-rose-700'
                                  : (i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-200')
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {/* Center Stamp */}
                      <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white border border-rose-600 flex items-center justify-center text-[9px] font-black text-rose-600">
                        $
                      </div>
                    </div>
                  )}

                  <p className="text-xs font-black text-slate-900 mt-2 truncate max-w-full px-1">
                    {settings.khqrMerchantName || settings.shopName}
                  </p>
                  <p className="text-[11px] font-bold text-rose-600">
                    ${grandTotal.toFixed(2)} USD <span className="text-slate-400 font-normal">({(grandTotal * (settings.khrExchangeRate || 4100)).toLocaleString()} ៛)</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-full">
                    Acc: {settings.khqrMerchantAccount || settings.phone}
                  </p>

                  {((qrTypeSelection === 'aba' && settings.abaQrCodeUrl) || settings.customQrCodeUrl) && (
                    <button
                      type="button"
                      onClick={() => setShowEnlargedQR(true)}
                      className="mt-2 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>Click to Enlarge QR</span>
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Scan using <strong>ABA Mobile, Wing, ACLEDA, Sathapana, or any Bakong App</strong>. 
                  Clicking Complete Payment below will verify the transaction token instantly.
                </p>
              </div>
            )}

            {/* COD FORM */}
            {paymentMethod === 'cod' && (
              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Cash on Delivery (Phnom Penh &amp; Provinces)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our shop manager from <strong>{settings.shopName}</strong> will dial your contact number (or WhatsApp/Telegram) from hotline <strong className="text-amber-700">{settings.phone}</strong> to confirm your address before dispatch.
                </p>
              </div>
            )}
          </div>

          {/* Section 3: Discount Adjustment & Coupon Code */}
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Percent className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Discount &amp; Voucher Adjustment
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Toggle % vs $ */}
                <div className="flex items-center bg-white p-0.5 rounded-lg border border-amber-200 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setDiscountType('percent')}
                    className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      discountType === 'percent'
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
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
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    $
                  </button>
                </div>

                {discountValue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountValue(0);
                      setCouponApplied(null);
                      setCouponMsg(null);
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md transition-colors flex items-center gap-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>

            {/* Stepper + Direct input */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAdjustDiscount(discountType === 'percent' ? -5 : -1)}
                disabled={discountValue <= 0}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white text-slate-800 flex items-center justify-center font-bold transition-colors shrink-0 cursor-pointer"
                title={discountType === 'percent' ? 'Decrease 5%' : 'Decrease $1'}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <div className="relative flex-1">
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : cartSubtotal}
                  step={discountType === 'percent' ? '1' : '0.50'}
                  value={discountValue === 0 ? '' : discountValue}
                  onChange={(e) => {
                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setDiscountValue(isNaN(val) ? 0 : Math.max(0, val));
                    setCouponApplied(null);
                  }}
                  placeholder="0"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs font-black text-slate-900 text-center outline-none focus:ring-2 focus:ring-amber-500/30"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                  {discountType === 'percent' ? '%' : '$'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleAdjustDiscount(discountType === 'percent' ? 5 : 1)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 flex items-center justify-center font-bold transition-colors shrink-0 cursor-pointer"
                title={discountType === 'percent' ? 'Increase 5%' : 'Increase $1'}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-medium">Quick Presets:</span>
              {discountType === 'percent' ? (
                [0, 5, 10, 15, 20].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setDiscountValue(pct);
                      setCouponApplied(null);
                      setCouponMsg(null);
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      discountValue === pct
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {pct}%
                  </button>
                ))
              ) : (
                [0, 2, 5, 10].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setDiscountValue(amt);
                      setCouponApplied(null);
                      setCouponMsg(null);
                    }}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                      discountValue === amt
                        ? 'bg-amber-500 text-slate-950 font-black'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    ${amt}
                  </button>
                ))
              )}
            </div>

            {/* Promo Code Input Field */}
            <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code (e.g. WELCOME10, SAVE5)"
                  className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-amber-500 uppercase font-mono"
                />
                <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-3 py-1.5 bg-slate-900 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Apply
              </button>
            </div>

            {couponMsg && (
              <p className={`text-[11px] font-medium ${couponMsg.type === 'success' ? 'text-emerald-700 font-bold' : 'text-rose-600'}`}>
                {couponMsg.text}
              </p>
            )}
          </div>

          {/* Section 4: Order Summary Table */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Payment Breakdown
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Items Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} units)</span>
              <span className="font-semibold text-slate-800">${cartSubtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-xs text-emerald-700 font-bold bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1.5">
                  <span>Discount Adjustment</span>
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded">
                    {discountType === 'percent' ? `${discountValue}%` : `$${discountValue.toFixed(2)}`}
                  </span>
                  {couponApplied && <span className="text-[10px] uppercase font-mono">({couponApplied})</span>}
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-slate-600">
              <span>Delivery Fee ({city})</span>
              <span className="font-semibold text-slate-800">
                {shippingFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `$${shippingFee.toFixed(2)}`}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
              <span>Total Payable Amount</span>
              <span className="text-base text-amber-600 font-black">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Section 4: Print Receipt (Thermal Printer) Toggle */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 space-y-3 transition-all">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    printReceipt
                      ? 'bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-400/30'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">Print Receipt</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors ${
                        printReceipt
                          ? 'bg-amber-100 text-amber-800 border border-amber-300/80'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      Thermal {thermalPaperWidth}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Triggers browser print dialog formatted specifically for thermal roll printers
                  </p>
                </div>
              </div>

              {/* Accessible Interactive Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  id="checkout-thermal-print-toggle"
                  checked={printReceipt}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setPrintReceipt(checked);
                    try {
                      localStorage.setItem('chan_print_receipt_checkout', String(checked));
                    } catch {}
                  }}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Sub-controls when toggle is ON: Roll width selection, Preview & Test Print */}
            {printReceipt && (
              <div className="pt-2.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Roll Size:</span>
                  <button
                    type="button"
                    onClick={() => setThermalPaperWidth('80mm')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      thermalPaperWidth === '80mm'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    80mm (Standard POS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setThermalPaperWidth('58mm')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      thermalPaperWidth === '58mm'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    58mm (Compact Mini)
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowThermalPreview(true)}
                    className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <FileText className="w-3 h-3 text-amber-500" />
                    <span>Preview Thermal Slip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerThermalPrint(thermalPaperWidth)}
                    className="text-[11px] font-bold text-amber-900 hover:text-amber-950 bg-amber-100/80 border border-amber-200 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    title="Send immediate test print to thermal printer"
                  >
                    <Printer className="w-3 h-3 text-amber-600" />
                    <span>Test Print</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <button
            id="checkout-submit-button"
            type="submit"
            disabled={isProcessing}
            className="w-full bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-extrabold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>{processingStage || 'Securing Transaction...'}</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay &amp; Authorize ${grandTotal.toFixed(2)}</span>
              </>
            )}
          </button>
        </form>

        {/* 3D Secure / OTP Simulation Modal */}
        {showThreeDSecure && (
          <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 mb-1">
                Bank 3D Secure 2.0 Challenge
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                To authorize the payment of <strong>${grandTotal.toFixed(2)}</strong> for {settings.shopName}, please enter the one-time authentication code sent to your mobile phone.
              </p>

              <div className="mb-4">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-48 mx-auto text-center font-mono text-xl font-extrabold tracking-widest bg-slate-100 border border-slate-300 focus:border-amber-500 rounded-xl py-2.5 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Demo test code prefilled: 778899</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowThreeDSecure(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-emerald-600 flex items-center justify-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify &amp; Settle</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Enlarged QR Code Lightbox Modal */}
        {showEnlargedQR && ((qrTypeSelection === 'aba' && settings.abaQrCodeUrl) || settings.customQrCodeUrl) && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4"
            onClick={() => setShowEnlargedQR(false)}
          >
            <div 
              className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full shadow-2xl space-y-4 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-extrabold text-slate-900">
                      {settings.khqrMerchantName || settings.shopName}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {qrTypeSelection === 'aba' ? 'ABA PayWay' : 'Bakong KHQR'} • ${grandTotal.toFixed(2)} USD
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEnlargedQR(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-white rounded-2xl border-2 border-rose-500 shadow-inner inline-block">
                <img
                  src={(qrTypeSelection === 'aba' && settings.abaQrCodeUrl) || settings.customQrCodeUrl}
                  alt="High Resolution Merchant QR"
                  className="w-64 h-64 object-contain rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={(qrTypeSelection === 'aba' && settings.abaQrCodeUrl) || settings.customQrCodeUrl}
                  download="merchant-khqr.png"
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Save QR Image</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowEnlargedQR(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden Thermal Printable Docket during Checkout session */}
        <ThermalReceiptSlip
          data={currentDraftReceiptData}
          settings={settings}
          paperWidth={thermalPaperWidth}
        />

        {/* Interactive Thermal Receipt Preview Modal */}
        {showThermalPreview && (
          <ThermalReceiptSlip
            data={currentDraftReceiptData}
            settings={settings}
            paperWidth={thermalPaperWidth}
            onPaperWidthChange={setThermalPaperWidth}
            isModalPreview={true}
            onClose={() => setShowThermalPreview(false)}
            onPrint={() => {
              triggerThermalPrint(thermalPaperWidth);
            }}
          />
        )}
      </div>
    </div>
  );
};
