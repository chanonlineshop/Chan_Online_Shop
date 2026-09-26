import React from 'react';
import { useStore } from '../context/StoreContext';
import { PurchaseOrder } from '../types';
import { X, Printer, Building2, Calendar, FileText, CheckCircle2, Clock, Ban } from 'lucide-react';

interface PurchaseOrderVoucherModalProps {
  po: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseOrderVoucherModal: React.FC<PurchaseOrderVoucherModalProps> = ({
  po,
  isOpen,
  onClose
}) => {
  const { settings } = useStore();

  if (!isOpen || !po) return null;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: PurchaseOrder['status']) => {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
            RECEIVED / IN STOCK
          </span>
        );
      case 'ORDERED':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full text-xs">
            <Clock className="w-3.5 h-3.5" />
            ORDERED (PENDING DELIVERY)
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-xs">
            <FileText className="w-3.5 h-3.5" />
            DRAFT REQUISITION
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 px-3 py-1 rounded-full text-xs">
            <Ban className="w-3.5 h-3.5" />
            CANCELLED
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-sm">Purchase Order Voucher: {po.poNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print PO</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable PO Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 flex-1 bg-white">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {settings.shopName || 'Chan Online Shop'}
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                {settings.address || 'Street 271, Sangkat Boeung Tumpun, Phnom Penh'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Hotline: <strong className="text-slate-800">{settings.phone}</strong> • Email: {settings.email}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Official Purchase Order
              </span>
              <p className="text-xl font-black text-slate-950 font-mono mt-0.5">
                {po.poNumber}
              </p>
              <div className="mt-2">
                {getStatusBadge(po.status)}
              </div>
            </div>
          </div>

          {/* Supplier & Order Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Vendor / Supplier Information
              </h4>
              <p className="font-extrabold text-sm text-slate-900">{po.supplierName}</p>
              {po.supplierPhone && (
                <p className="text-slate-600 mt-0.5">Phone: {po.supplierPhone}</p>
              )}
              {po.supplierEmail && (
                <p className="text-slate-600 mt-0.5">Email: {po.supplierEmail}</p>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">
                Order Timeline &amp; Payment
              </h4>
              <p className="text-slate-700">
                Issue Date: <strong className="text-slate-900">{po.orderDate}</strong>
              </p>
              <p className="text-slate-700">
                Expected Delivery: <strong className="text-slate-900">{po.expectedDate}</strong>
              </p>
              <p className="text-slate-700">
                Payment Status: <span className="font-bold uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">{po.paymentStatus}</span>
              </p>
              {po.receivedAt && (
                <p className="text-emerald-700 font-bold">
                  Stock Received: {new Date(po.receivedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item / Description</th>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3 text-center">Ordered</th>
                  <th className="py-2.5 px-3 text-center">Received</th>
                  <th className="py-2.5 px-3 text-right">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {po.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{item.productName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{item.sku}</td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono">{item.quantityOrdered}</td>
                    <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-700">
                      {item.quantityReceived || 0}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">${item.unitCostPrice.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      ${item.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="max-w-xs text-xs">
              <h5 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                Notes &amp; Delivery Instructions
              </h5>
              <p className="text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                {po.notes || 'Goods must meet standard quality warranty. All packaging must display legible SKU barcodes.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-2">
                Recorded By: <strong className="text-slate-600">{po.recordedBy}</strong>
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Quantity:</span>
                <span className="font-bold font-mono text-slate-900">{po.totalQuantity} units</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Items:</span>
                <span className="font-bold text-slate-900">{po.items.length} SKUs</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-extrabold text-sm text-slate-900">PO Total Cost:</span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  ${po.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
            <div>
              <div className="border-b border-slate-400 w-48 mb-1"></div>
              <p className="font-bold text-slate-700">Authorized Purchasing Agent</p>
              <p className="text-[11px] text-slate-400">{settings.shopName}</p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="border-b border-slate-400 w-48 mb-1"></div>
              <p className="font-bold text-slate-700">Vendor Acceptance / Dispatch</p>
              <p className="text-[11px] text-slate-400">{po.supplierName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
