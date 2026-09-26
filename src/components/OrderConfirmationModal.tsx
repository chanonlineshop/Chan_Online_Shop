import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useStore } from '../context/StoreContext';
import { 
  CheckCircle2, 
  Printer, 
  ShoppingBag, 
  PhoneCall, 
  ShieldCheck, 
  Send,
  X,
  Calendar,
  CreditCard,
  FileText
} from 'lucide-react';
import { ThermalReceiptSlip, triggerThermalPrint, ThermalReceiptData } from './ThermalReceiptSlip';

interface OrderConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ isOpen, onClose }) => {
  const { lastPlacedOrder, settings, setActiveView } = useStore();

  useEffect(() => {
    if (isOpen) {
      // Fire celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen]);

  if (!isOpen || !lastPlacedOrder) return null;

  const handlePrint = () => {
    window.print();
  };

  const handlePrintThermal = (width: '80mm' | '58mm' = '80mm') => {
    triggerThermalPrint(width);
  };

  const handleViewInOrders = () => {
    onClose();
    setActiveView('orders');
  };

  const thermalReceiptData: ThermalReceiptData = {
    receiptNumber: lastPlacedOrder.id,
    orderDate: new Date(lastPlacedOrder.date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    customerName: lastPlacedOrder.customer.fullName,
    customerPhone: lastPlacedOrder.customer.phoneNumber,
    customerAddress: lastPlacedOrder.customer.address,
    customerCity: lastPlacedOrder.customer.city,
    customerNotes: lastPlacedOrder.customer.notes,
    items: lastPlacedOrder.items.map(it => ({
      productName: it.productName,
      sku: it.sku,
      quantity: it.quantity,
      price: it.price,
      total: it.price * it.quantity,
    })),
    subtotal: lastPlacedOrder.subtotal,
    shippingFee: lastPlacedOrder.shippingFee,
    discount: lastPlacedOrder.discount,
    total: lastPlacedOrder.total,
    paymentMethod: lastPlacedOrder.paymentMethod.toUpperCase(),
    paymentStatus: lastPlacedOrder.paymentStatus.toUpperCase(),
    transactionRef: lastPlacedOrder.transactionId,
    cashierName: 'Online Web Checkout',
  };

  const formattedDate = new Date(lastPlacedOrder.date).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto print:border-none print:shadow-none print:max-w-full"
      >
        {/* Header Ribbon */}
        <div className="bg-emerald-600 text-white p-6 text-center relative print:hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Order Confirmed!</h2>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1">
            Thank you for shopping at <strong>{settings.shopName}</strong>
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-700/60 px-3 py-1 rounded-full text-xs font-mono">
            <span>Invoice ID: {lastPlacedOrder.id}</span>
          </div>
        </div>

        {/* Invoice Printable Sheet */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Shop & Invoice Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-5 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-600" />
                <h3 className="font-extrabold text-lg text-slate-900">{settings.shopName}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Hotline: <strong className="text-slate-800">{settings.phone}</strong></p>
              <p className="text-[11px] text-slate-400">{settings.address}</p>
            </div>

            <div className="text-left sm:text-right text-xs text-slate-500">
              <div className="flex items-center sm:justify-end gap-1 font-semibold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
              <p className="font-mono text-slate-500 mt-0.5">Txn: {lastPlacedOrder.transactionId}</p>
              <span className="inline-block mt-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Payment: {lastPlacedOrder.paymentStatus}
              </span>
            </div>
          </div>

          {/* Customer & Gateway Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Delivered To:</p>
              <p className="font-semibold text-slate-900">{lastPlacedOrder.customer.fullName}</p>
              <p className="text-slate-600">{lastPlacedOrder.customer.phoneNumber}</p>
              <p className="text-slate-600 mt-0.5">{lastPlacedOrder.customer.address}, {lastPlacedOrder.customer.city}</p>
              {lastPlacedOrder.customer.notes && (
                <p className="text-slate-500 italic mt-1">"{lastPlacedOrder.customer.notes}"</p>
              )}
            </div>

            <div>
              <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Payment Gateway:</p>
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 mb-0.5">
                <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                <span>{lastPlacedOrder.paymentGatewayProvider}</span>
              </div>
              <p className="text-slate-500 text-[11px] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 256-Bit Authenticated
              </p>
              <div className="mt-2 text-[11px] text-slate-500">
                <span>Fulfillment: </span>
                <span className="font-bold text-slate-800">{lastPlacedOrder.fulfillmentStatus}</span>
              </div>
            </div>
          </div>

          {/* Purchased Items List */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Purchased Items
            </h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
              {lastPlacedOrder.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img 
                        src={item.image} 
                        alt={item.productName} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">SKU: {item.sku} × {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-extrabold text-slate-900">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Totals */}
          <div className="space-y-1.5 text-xs pt-2">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span className="font-medium text-slate-800">${lastPlacedOrder.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Shipping Fee</span>
              <span className="font-medium text-slate-800">
                {lastPlacedOrder.shippingFee === 0 ? 'FREE' : `$${lastPlacedOrder.shippingFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
              <span>Total Paid Amount</span>
              <span className="text-base text-amber-600">${lastPlacedOrder.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Hotline & Telegram Help */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold text-slate-900">Need immediate dispatch assistance?</p>
                <p className="text-slate-600 text-[11px]">Dial hotline <strong>{settings.phone}</strong> with your order ID</p>
              </div>
            </div>

            <a
              href={`https://t.me/${settings.telegramUsername}?text=Hello+Chan+Online+Shop,+my+order+ID+is+${lastPlacedOrder.id}`}
              target="_blank"
              rel="noreferrer"
              className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0"
            >
              <Send className="w-3 h-3" />
              <span>Telegram</span>
            </a>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 print:hidden">
            <button
              onClick={() => handlePrintThermal('80mm')}
              className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-300 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              title="Formatted specifically for continuous 80mm roll thermal POS printers"
            >
              <Printer className="w-3.5 h-3.5 text-amber-600" />
              <span>Thermal (80mm)</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Full Invoice</span>
            </button>

            <button
              onClick={handleViewInOrders}
              className="py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>View Orders</span>
            </button>

            <button
              onClick={onClose}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 text-xs font-bold transition-all"
            >
              Continue Shopping
            </button>
          </div>
        </div>

        {/* Hidden Thermal Printable Docket */}
        <ThermalReceiptSlip
          data={thermalReceiptData}
          settings={settings}
          paperWidth="80mm"
        />
      </div>
    </div>
  );
};
