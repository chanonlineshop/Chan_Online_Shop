import React from 'react';
import { Printer, X, Check, Copy, FileText, Smartphone } from 'lucide-react';
import { ShopSettings } from '../types';

export interface ThermalReceiptItem {
  productName: string;
  sku: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ThermalReceiptData {
  receiptNumber: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  customerNotes?: string;
  items: ThermalReceiptItem[];
  subtotal: number;
  shippingFee: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  transactionRef?: string;
  cashierName?: string;
}

/**
 * Triggers the browser's native print dialog formatted specifically for thermal receipt printers (80mm or 58mm).
 */
export const triggerThermalPrint = (
  paperWidth: '80mm' | '58mm' = '80mm',
  onDone?: () => void
) => {
  // Apply thermal printing classes to document body
  document.body.classList.add('thermal-print-active');
  if (paperWidth === '58mm') {
    document.body.classList.add('thermal-width-58mm');
  } else {
    document.body.classList.remove('thermal-width-58mm');
  }

  const cleanup = () => {
    document.body.classList.remove('thermal-print-active', 'thermal-width-58mm');
    window.removeEventListener('afterprint', cleanup);
    if (onDone) onDone();
  };

  window.addEventListener('afterprint', cleanup);
  setTimeout(cleanup, 3000);

  // Invoke browser print dialog
  try {
    window.print();
  } catch (err) {
    console.warn('[Thermal Print Dialog Error]:', err);
    cleanup();
  }
};

interface ThermalReceiptSlipProps {
  data: ThermalReceiptData;
  settings: ShopSettings;
  paperWidth?: '80mm' | '58mm';
  onPaperWidthChange?: (width: '80mm' | '58mm') => void;
  isModalPreview?: boolean;
  onClose?: () => void;
  onPrint?: () => void;
}

export const ThermalReceiptSlip: React.FC<ThermalReceiptSlipProps> = ({
  data,
  settings,
  paperWidth = '80mm',
  onPaperWidthChange,
  isModalPreview = false,
  onClose,
  onPrint,
}) => {
  const khrRate = settings.khrExchangeRate || 4100;
  const khrTotal = Math.round(data.total * khrRate);

  const handleManualPrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      triggerThermalPrint(paperWidth);
    }
  };

  // Content of the 80mm / 58mm thermal docket
  const receiptContent = (
    <div
      className={`font-mono text-slate-900 select-text thermal-monochrome ${
        paperWidth === '58mm' ? 'text-[10px] leading-tight' : 'text-xs leading-relaxed'
      }`}
    >
      {/* 1. STORE HEADER */}
      <div className="text-center pb-2">
        <h1 className="text-sm sm:text-base font-black uppercase tracking-tight text-black">
          {settings.shopName}
        </h1>
        {settings.tagline && (
          <p className="text-[10px] text-black font-semibold mt-0.5">
            {settings.tagline}
          </p>
        )}
        <p className="text-[10px] text-black mt-0.5">
          {settings.address}{settings.city ? `, ${settings.city}` : ''}
        </p>
        <p className="text-[10px] font-bold text-black">
          TEL / TELEGRAM: {settings.phone}
        </p>
        {settings.email && (
          <p className="text-[9px] text-black">
            EMAIL: {settings.email}
          </p>
        )}
        <div className="mt-1 text-[10px] font-black uppercase tracking-widest border-t border-b border-dashed border-black py-0.5">
          *** OFFICIAL SALES DOCKET ***
        </div>
      </div>

      {/* 2. ORDER / DOCKET METADATA */}
      <div className="py-1 text-[10px] space-y-0.5 border-b border-dashed border-black">
        <div className="flex justify-between">
          <span className="font-bold">RECEIPT #:</span>
          <span className="font-bold">{data.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>DATE &amp; TIME:</span>
          <span>{data.orderDate}</span>
        </div>
        <div className="flex justify-between">
          <span>TERMINAL:</span>
          <span>{data.cashierName || 'ONLINE POS CHK-01'}</span>
        </div>
        <div className="flex justify-between">
          <span>CUSTOMER:</span>
          <span className="font-bold truncate max-w-[170px]">{data.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span>TEL:</span>
          <span>{data.customerPhone}</span>
        </div>
        {data.customerAddress && (
          <div className="pt-0.5">
            <span className="block text-[9px] text-black">
              SHIP: {data.customerAddress}{data.customerCity ? `, ${data.customerCity}` : ''}
            </span>
          </div>
        )}
        {data.customerNotes && (
          <div className="text-[9px] italic pt-0.5">
            NOTE: "{data.customerNotes}"
          </div>
        )}
      </div>

      {/* 3. ITEM LINE HEADERS */}
      <div className="py-1 border-b border-black">
        <div className="flex justify-between text-[10px] font-black uppercase">
          <span className="w-10">QTY</span>
          <span className="flex-1 text-left px-1">DESCRIPTION</span>
          <span className="w-16 text-right">AMOUNT</span>
        </div>
      </div>

      {/* 4. ITEMS LIST */}
      <div className="py-1.5 space-y-1.5 border-b border-dashed border-black">
        {data.items.length === 0 ? (
          <div className="text-center py-2 text-slate-500 italic text-[10px]">
            No items in receipt
          </div>
        ) : (
          data.items.map((item, idx) => (
            <div key={idx} className="space-y-0.5">
              <div className="flex items-start justify-between text-[10px] font-bold">
                <span className="w-8 shrink-0">{item.quantity}x</span>
                <span className="flex-1 px-1 break-words leading-tight">{item.productName}</span>
                <span className="w-16 text-right font-black shrink-0">
                  ${item.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[9px] text-slate-600 pl-8 pr-1">
                <span>SKU: {item.sku}</span>
                <span>@ ${item.price.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 5. TOTALS & BREAKDOWN */}
      <div className="py-1.5 space-y-1 border-b border-dashed border-black text-[10px]">
        <div className="flex justify-between">
          <span>ITEMS SUBTOTAL:</span>
          <span>${data.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>DELIVERY / DISPATCH:</span>
          <span>{data.shippingFee === 0 ? 'FREE' : `$${data.shippingFee.toFixed(2)}`}</span>
        </div>
        {data.discount !== undefined && data.discount > 0 && (
          <div className="flex justify-between font-bold">
            <span>PROMO DISCOUNT:</span>
            <span>-${data.discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-xs sm:text-sm font-black pt-1 border-t border-black text-black">
          <span>TOTAL PAYABLE:</span>
          <span>${data.total.toFixed(2)} USD</span>
        </div>
        <div className="flex justify-between text-[10px] font-bold text-slate-700">
          <span>KHR CONVERSION:</span>
          <span>{khrTotal.toLocaleString()} ៛</span>
        </div>
      </div>

      {/* 6. PAYMENT TENDER DETAILS */}
      <div className="py-1.5 border-b border-dashed border-black text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span className="font-bold">PAYMENT METHOD:</span>
          <span className="font-bold uppercase">{data.paymentMethod}</span>
        </div>
        <div className="flex justify-between">
          <span>PAYMENT STATUS:</span>
          <span className="font-bold uppercase">{data.paymentStatus}</span>
        </div>
        {data.transactionRef && (
          <div className="flex justify-between text-[9px]">
            <span>TXN REF:</span>
            <span className="font-mono">{data.transactionRef}</span>
          </div>
        )}
      </div>

      {/* 7. THERMAL SIMULATED BARCODE */}
      <div className="py-2 text-center space-y-1">
        {/* SVG Monochrome Barcode */}
        <div className="flex justify-center items-center py-1">
          <svg className="w-48 h-9" viewBox="0 0 200 36">
            <rect width="200" height="36" fill="#ffffff" />
            <g fill="#000000">
              <rect x="5" y="0" width="3" height="36" />
              <rect x="10" y="0" width="1" height="36" />
              <rect x="13" y="0" width="4" height="36" />
              <rect x="19" y="0" width="2" height="36" />
              <rect x="23" y="0" width="1" height="36" />
              <rect x="26" y="0" width="3" height="36" />
              <rect x="31" y="0" width="5" height="36" />
              <rect x="38" y="0" width="2" height="36" />
              <rect x="42" y="0" width="1" height="36" />
              <rect x="45" y="0" width="3" height="36" />
              <rect x="50" y="0" width="2" height="36" />
              <rect x="54" y="0" width="4" height="36" />
              <rect x="60" y="0" width="1" height="36" />
              <rect x="63" y="0" width="2" height="36" />
              <rect x="67" y="0" width="3" height="36" />
              <rect x="72" y="0" width="1" height="36" />
              <rect x="75" y="0" width="4" height="36" />
              <rect x="81" y="0" width="2" height="36" />
              <rect x="85" y="0" width="3" height="36" />
              <rect x="90" y="0" width="1" height="36" />
              <rect x="93" y="0" width="5" height="36" />
              <rect x="100" y="0" width="2" height="36" />
              <rect x="104" y="0" width="3" height="36" />
              <rect x="109" y="0" width="1" height="36" />
              <rect x="112" y="0" width="4" height="36" />
              <rect x="118" y="0" width="2" height="36" />
              <rect x="122" y="0" width="1" height="36" />
              <rect x="125" y="0" width="3" height="36" />
              <rect x="130" y="0" width="4" height="36" />
              <rect x="136" y="0" width="2" height="36" />
              <rect x="140" y="0" width="1" height="36" />
              <rect x="143" y="0" width="3" height="36" />
              <rect x="148" y="0" width="5" height="36" />
              <rect x="155" y="0" width="2" height="36" />
              <rect x="159" y="0" width="1" height="36" />
              <rect x="162" y="0" width="3" height="36" />
              <rect x="167" y="0" width="4" height="36" />
              <rect x="173" y="0" width="2" height="36" />
              <rect x="177" y="0" width="1" height="36" />
              <rect x="180" y="0" width="3" height="36" />
              <rect x="185" y="0" width="2" height="36" />
              <rect x="189" y="0" width="4" height="36" />
              <rect x="195" y="0" width="2" height="36" />
            </g>
          </svg>
        </div>
        <div className="text-[9px] tracking-widest font-black text-black">
          * {data.receiptNumber} *
        </div>
      </div>

      {/* 8. FOOTER POLICY & TEAR-OFF MARGIN */}
      <div className="pt-2 text-center text-[9px] text-black space-y-0.5 border-t border-dashed border-black">
        <p className="font-bold">THANK YOU FOR YOUR PURCHASE!</p>
        <p>Goods sold are returnable or exchangeable within 7 days.</p>
        <p>Please present this docket for warranty service.</p>
        <p className="font-bold pt-1">*** END OF RECEIPT ***</p>
        {/* Thermal Cutter Feed Spacer */}
        <div className="h-6 w-full" aria-hidden="true" />
      </div>
    </div>
  );

  // If this is rendered as the hidden printable DOM element
  if (!isModalPreview) {
    return (
      <div
        id="thermal-receipt-printable"
        className="hidden print:block"
        aria-hidden="true"
      >
        {receiptContent}
      </div>
    );
  }

  // Interactive Modal Preview Dialog
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Controls Bar */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Thermal Receipt Preview</h3>
              <p className="text-[11px] text-slate-300">
                Formatted for POS Thermal Printers ({paperWidth})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Paper Size Switcher Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-600">Paper Roll Width:</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPaperWidthChange && onPaperWidthChange('80mm')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                paperWidth === '80mm'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              80mm (Standard POS)
            </button>
            <button
              type="button"
              onClick={() => onPaperWidthChange && onPaperWidthChange('58mm')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                paperWidth === '58mm'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              58mm (Mobile Mini)
            </button>
          </div>
        </div>

        {/* Realistic Thermal Receipt Paper Container */}
        <div className="p-4 sm:p-6 bg-slate-200/80 overflow-y-auto flex-1 flex justify-center">
          <div
            className={`bg-white text-slate-900 p-5 rounded-sm shadow-md border-x border-slate-300 relative transition-all duration-200 ${
              paperWidth === '58mm' ? 'w-[230px]' : 'w-[310px]'
            }`}
            style={{
              backgroundImage: 'linear-gradient(to bottom, #fafafa 0%, #ffffff 100%)',
            }}
          >
            {/* Serrated Tear Edge (Top) */}
            <div
              className="absolute -top-1.5 left-0 right-0 h-1.5 overflow-hidden flex"
              style={{
                background: 'radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)',
                backgroundSize: '8px 8px',
              }}
            />

            {receiptContent}

            {/* Serrated Tear Edge (Bottom) */}
            <div
              className="absolute -bottom-1.5 left-0 right-0 h-1.5 overflow-hidden flex"
              style={{
                background: 'radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)',
                backgroundSize: '8px 8px',
              }}
            />
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            Prints continuous roll with automatic cutter margins
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleManualPrint}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-amber-500 text-white hover:text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print to Thermal Printer</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
