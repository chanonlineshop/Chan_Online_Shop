import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { PurchaseOrder } from '../types';
import { X, CheckCircle2, PackageCheck, AlertCircle, ArrowRight, Building2, Calendar, ShieldCheck } from 'lucide-react';

interface ReceivePOModalProps {
  po: PurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessNotice?: (msg: string) => void;
}

export const ReceivePOModal: React.FC<ReceivePOModalProps> = ({
  po,
  isOpen,
  onClose,
  onSuccessNotice
}) => {
  const { products, receivePurchaseOrder } = useStore();

  // State for quantity receiving for each product
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset when PO opens
  React.useEffect(() => {
    if (po) {
      const initial: Record<string, number> = {};
      po.items.forEach(item => {
        const remaining = Math.max(0, item.quantityOrdered - (item.quantityReceived || 0));
        initial[item.productId] = remaining;
      });
      setQuantities(initial);
      setError(null);
    }
  }, [po]);

  if (!isOpen || !po) return null;

  const handleQtyChange = (productId: string, val: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, val)
    }));
  };

  const totalReceivingNow: number = Object.values(quantities).reduce<number>((sum: number, q: unknown) => sum + (Number(q) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (totalReceivingNow <= 0) {
      setError('Please specify at least 1 unit to receive into inventory.');
      return;
    }

    const itemsToReceive = po.items
      .map(item => ({
        productId: item.productId,
        quantityReceived: quantities[item.productId] || 0,
      }))
      .filter(i => i.quantityReceived > 0);

    const res = receivePurchaseOrder(po.id, itemsToReceive);
    if (res.success) {
      if (onSuccessNotice) {
        onSuccessNotice(res.message);
      }
      onClose();
    } else {
      setError(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-900 to-emerald-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-400 text-emerald-950 rounded-2xl shadow-xs">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black">Receive Goods (Purchase IN)</h3>
                <span className="font-mono text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  {po.poNumber}
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Confirm shipment arrival. Inventory stock levels will update automatically in real time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-emerald-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PO Metadata Summary */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span className="text-slate-600">Supplier:</span>
            <span className="font-bold text-slate-900">{po.supplierName}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="text-slate-600">Order Date:</span>
            <span className="font-semibold text-slate-900">{po.orderDate}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-100/70 text-emerald-800 px-2.5 py-1 rounded-full font-bold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Real-Time Catalog Sync</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-sm">
                Items to Stock In
              </h4>
              <span className="text-[11px] text-slate-500 font-semibold">
                Total Receiving Now: <strong className="text-emerald-700 font-mono text-xs">{totalReceivingNow} units</strong>
              </span>
            </div>

            <div className="space-y-2.5">
              {po.items.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                const currentStock = product?.stock || 0;
                const qtyReceiving = Number(quantities[item.productId]) || 0;
                const projectedStock = currentStock + qtyReceiving;
                const remaining = Math.max(0, item.quantityOrdered - (item.quantityReceived || 0));

                return (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{item.productName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                        <span className="font-mono bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-700 font-bold">
                          {item.sku}
                        </span>
                        <span>•</span>
                        <span>Ordered: <strong className="text-slate-800">{item.quantityOrdered}</strong></span>
                        <span>•</span>
                        <span>Received: <strong className="text-emerald-700">{item.quantityReceived || 0}</strong></span>
                        <span>•</span>
                        <span>Remaining: <strong className="text-amber-700">{remaining}</strong></span>
                      </div>
                    </div>

                    {/* Stock comparison & Receiving Input */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Live stock before & after */}
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Stock Impact
                        </span>
                        <div className="inline-flex items-center gap-1.5 font-bold font-mono text-xs bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-slate-600">{currentStock}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-emerald-600 font-black">
                            {projectedStock}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">
                            (+{qtyReceiving})
                          </span>
                        </div>
                      </div>

                      {/* Receive Input */}
                      <div className="w-24">
                        <label className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5 text-center">
                          Receive Qty
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantityOrdered * 2}
                          value={quantities[item.productId] ?? remaining}
                          onChange={(e) => handleQtyChange(item.productId, Number(e.target.value))}
                          className="w-full px-2 py-1.5 bg-white border border-emerald-300 rounded-xl font-mono font-bold text-slate-900 text-center outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real time confirmation callout */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-950 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Immediate Warehouse Stock Synchronization</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Upon confirmation, {totalReceivingNow} units will instantly be added to your live inventory. 
                Product stock levels across the Admin Catalog, POS Checkout, and Online Store will reflect the change immediately.
              </p>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={totalReceivingNow <= 0}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm &amp; Stock In ({totalReceivingNow} Units)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
