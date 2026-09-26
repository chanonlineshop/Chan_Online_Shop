import React from 'react';
import { Printer, X, CheckCircle, QrCode, CreditCard, DollarSign, WifiOff } from 'lucide-react';
import { POSSale, ShopSettings } from '../../types';

interface POSThermalReceiptModalProps {
  sale: POSSale;
  settings: ShopSettings;
  onClose: () => void;
  onNewSale: () => void;
}

export const POSThermalReceiptModal: React.FC<POSThermalReceiptModalProps> = ({
  sale,
  settings,
  onClose,
  onNewSale,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Payment Approved!</span>
            </span>
            {sale.isOfflineSyncPending && (
              <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
                <WifiOff className="w-3 h-3" />
                <span>Offline Stored</span>
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 80mm Thermal Receipt Slip */}
        <div id="thermal-pos-receipt" className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 my-4 text-slate-900 font-mono text-xs space-y-3">
          {/* Store Branding */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h2 className="text-base font-black tracking-tight uppercase">{settings.shopName}</h2>
            <p className="text-[11px] text-slate-600 mt-0.5">{settings.address}</p>
            <p className="text-[11px] font-bold text-slate-900">TEL: {settings.phone}</p>
            <p className="text-[10px] text-slate-500 mt-1">Official POS Cash Register Docket</p>
            {sale.isOfflineSyncPending && (
              <p className="text-[10px] font-bold text-rose-600 mt-0.5 tracking-wider uppercase">
                [ OFFLINE STORED - PENDING CLOUD SYNC ]
              </p>
            )}
          </div>

          {/* Sale Meta */}
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-bold text-slate-900">{sale.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date &amp; Time:</span>
              <span>{new Date(sale.date).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span className="font-bold text-slate-800">{sale.cashierName}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{sale.customerName}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-[11px]">
            {sale.items.map((it, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="truncate max-w-[170px]">
                  {it.productName} <span className="text-slate-500">x{it.quantity}</span>
                </span>
                <span className="font-bold">${it.lineTotal.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-1 text-xs pt-1">
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Subtotal:</span>
              <span>${sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-600 text-[11px]">
                <span>Discount:</span>
                <span>-${sale.discount.toFixed(2)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-slate-600 text-[11px]">
                <span>VAT 10%:</span>
                <span>+${sale.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-950 pt-1 border-t border-slate-200">
              <span>TOTAL DUE:</span>
              <span>${sale.total.toFixed(2)}</span>
            </div>

            {/* PAYMENT METHOD BREAKDOWN */}
            <div className="pt-2 border-t border-dashed border-slate-200 space-y-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-800">
                <span>Payment Method:</span>
                <span className="uppercase">{sale.paymentMethod}</span>
              </div>

              {/* CASH Specific */}
              {sale.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Amount Tendered:</span>
                    <span>${sale.amountTendered.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-700">
                    <span>Change Returned:</span>
                    <span>${sale.changeGiven.toFixed(2)}</span>
                  </div>
                  {sale.paymentDetails?.changeGivenKHR !== undefined && sale.paymentDetails.changeGivenKHR > 0 && (
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Change in KHR:</span>
                      <span>{sale.paymentDetails.changeGivenKHR.toLocaleString()} ៛</span>
                    </div>
                  )}
                </>
              )}

              {/* KHQR Specific */}
              {sale.paymentMethod === 'KHQR' && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>KHQR Channel:</span>
                    <span className="font-bold">{sale.paymentDetails?.khqrPayerBank || 'Bakong Gateway'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Bakong Ref:</span>
                    <span className="font-mono">{sale.paymentDetails?.khqrRef || 'KHQR-VERIFIED'}</span>
                  </div>
                </>
              )}

              {/* CARD Specific */}
              {sale.paymentMethod === 'CARD' && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Card Scheme:</span>
                    <span className="font-bold">
                      {sale.paymentDetails?.cardBrand || 'Visa'} •••• {sale.paymentDetails?.cardLast4 || '4242'}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Entry Method:</span>
                    <span>{sale.paymentDetails?.cardEntryMethod || 'Contactless Tap'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                    <span>Auth Code:</span>
                    <span className="font-bold text-slate-900">{sale.paymentDetails?.authCode || 'AUTH-849201'}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Barcode & Gratitude */}
          <div className="text-center pt-3 border-t border-dashed border-slate-300 text-[10px] text-slate-500 space-y-1">
            <p className="font-bold text-slate-700">Thank you for shopping with us!</p>
            <p>100% Genuine Guaranteed • 7-Day Exchange</p>
            <div className="tracking-widest font-mono text-slate-400 pt-1 font-bold">
              * {sale.receiptNumber} *
            </div>
          </div>
        </div>

        {/* Buttons (Hidden in Print) */}
        <div className="grid grid-cols-2 gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Docket</span>
          </button>

          <button
            onClick={onNewSale}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors"
          >
            New POS Sale
          </button>
        </div>
      </div>
    </div>
  );
};
