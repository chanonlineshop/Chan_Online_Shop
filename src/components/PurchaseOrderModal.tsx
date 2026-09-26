import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from '../types';
import { X, Plus, Trash2, Package, Building2, Calendar, FileText, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose }) => {
  const { products, createPurchaseOrder, currentUser } = useStore();

  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<PurchaseOrderStatus>('ORDERED');
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PARTIAL' | 'PAID'>('UNPAID');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Line Items
  const [items, setItems] = useState<Array<{
    productId: string;
    quantityOrdered: number;
    unitCostPrice: number;
  }>>(() => {
    if (products.length > 0) {
      return [{
        productId: products[0].id,
        quantityOrdered: 20,
        unitCostPrice: products[0].costPrice || Number((products[0].price * 0.6).toFixed(2)),
      }];
    }
    return [];
  });

  if (!isOpen) return null;

  const handleAddItem = () => {
    if (products.length === 0) return;
    // Pick first product not already in items, or default to first product
    const available = products.find(p => !items.some(i => i.productId === p.id)) || products[0];
    setItems(prev => [
      ...prev,
      {
        productId: available.id,
        quantityOrdered: 10,
        unitCostPrice: available.costPrice || Number((available.price * 0.6).toFixed(2)),
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('A purchase order must have at least one product item.');
      return;
    }
    setError(null);
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProdId: string) => {
    const prod = products.find(p => p.id === newProdId);
    setItems(prev => prev.map((item, i) => {
      if (i === index && prod) {
        return {
          ...item,
          productId: newProdId,
          unitCostPrice: prod.costPrice || Number((prod.price * 0.6).toFixed(2)),
        };
      }
      return item;
    }));
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          quantityOrdered: Math.max(1, qty),
        };
      }
      return item;
    }));
  };

  const handleCostChange = (index: number, cost: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i === index) {
        return {
          ...item,
          unitCostPrice: Math.max(0, cost),
        };
      }
      return item;
    }));
  };

  // Calculations
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantityOrdered) || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantityOrdered) || 0) * (Number(item.unitCostPrice) || 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplierName.trim()) {
      setError('Please provide the supplier or vendor name.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item to this purchase order.');
      return;
    }

    for (const item of items) {
      if (item.quantityOrdered <= 0) {
        setError('All ordered quantities must be greater than 0.');
        return;
      }
    }

    // Build PO items
    const formattedItems: PurchaseOrderItem[] = items.map(it => {
      const prod = products.find(p => p.id === it.productId);
      return {
        productId: it.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        quantityOrdered: it.quantityOrdered,
        quantityReceived: status === 'RECEIVED' ? it.quantityOrdered : 0,
        unitCostPrice: it.unitCostPrice,
        totalCost: Number((it.quantityOrdered * it.unitCostPrice).toFixed(2)),
      };
    });

    createPurchaseOrder({
      supplierName: supplierName.trim(),
      supplierPhone: supplierPhone.trim() || undefined,
      supplierEmail: supplierEmail.trim() || undefined,
      orderDate,
      expectedDate,
      status,
      paymentStatus,
      items: formattedItems,
      totalAmount: Number(totalAmount.toFixed(2)),
      totalQuantity,
      notes: notes.trim() || undefined,
      recordedBy: currentUser?.name || 'Authorized Staff',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black">Create Purchase Order (PO)</h3>
              <p className="text-xs text-slate-300">
                Procure stock from suppliers with automatic real-time inventory synchronization.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Supplier Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Building2 className="w-4 h-4 text-amber-500" />
              <span>Supplier &amp; Vendor Information</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block font-bold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shenzhen Acoustic Audio Ltd."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phone / Telegram</label>
                <input
                  type="text"
                  placeholder="+855 ... or +86 ..."
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Supplier Email</label>
                <input
                  type="email"
                  placeholder="b2b@supplier.com"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Dates & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Order Date</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Expected Delivery</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none focus:border-amber-500"
              >
                <option value="ORDERED">ORDERED (Pending Delivery)</option>
                <option value="DRAFT">DRAFT (Requisition)</option>
                <option value="RECEIVED">RECEIVED (Stock In Immediately)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as 'UNPAID' | 'PARTIAL' | 'PAID')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none focus:border-amber-500"
              >
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIAL">PARTIAL DEPOSIT</option>
                <option value="PAID">PAID FULL</option>
              </select>
            </div>
          </div>

          {/* Real-time Notice Banner */}
          {status === 'RECEIVED' && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-2.5 text-emerald-900 text-[11px] font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Real-Time Stock IN Enabled:</strong> Saving this purchase order as &quot;RECEIVED&quot; will immediately increase the warehouse inventory stock for all selected products and post a Restock audit log!
              </span>
            </div>
          )}

          {/* Line Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-500" />
                  <span>Order Items &amp; Real-Time Stock Impact</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select products to purchase. Current inventory count and projected stock after receipt are displayed live.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const product = products.find(p => p.id === item.productId);
                const currentStock = product?.stock || 0;
                const projectedStock = currentStock + (Number(item.quantityOrdered) || 0);

                return (
                  <div key={idx} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition-all flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {/* Product Selection */}
                    <div className="flex-1 w-full sm:w-auto">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          Product #{idx + 1}
                        </label>
                        {product && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            Current Stock: {currentStock}
                          </span>
                        )}
                      </div>
                      <select
                        value={item.productId}
                        onChange={(e) => handleProductChange(idx, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 outline-none focus:border-amber-500"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.sku}] {p.name} (Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="w-full sm:w-28">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Qty to Order
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantityOrdered}
                        onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-center outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="w-full sm:w-28">
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Unit Cost ($)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitCostPrice}
                        onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-center outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Real-time stock change preview & line subtotal */}
                    <div className="w-full sm:w-36 text-right">
                      <span className="block text-[10px] font-bold uppercase text-slate-500">
                        Line Total
                      </span>
                      <span className="block font-black text-slate-900 text-xs font-mono">
                        ${((Number(item.quantityOrdered) || 0) * (Number(item.unitCostPrice) || 0)).toFixed(2)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        <span>Stock: {currentStock}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                        <span>{projectedStock}</span>
                      </span>
                    </div>

                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all self-end sm:self-center cursor-pointer"
                      title="Remove product from PO"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes & Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Notes / Shipping Terms</label>
              <textarea
                rows={2}
                placeholder="e.g. Standard sea freight container import. Warranty terms verified."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl outline-none focus:border-amber-500 text-xs"
              />
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Total Ordered Units:</span>
                  <span className="font-bold text-white font-mono">{totalQuantity} units</span>
                </div>
                <div className="flex justify-between text-slate-400 text-xs">
                  <span>Unique Items:</span>
                  <span className="font-bold text-white">{items.length} SKUs</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline mt-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Estimated PO Total:</span>
                <span className="text-xl font-black text-amber-400 font-mono">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 font-black rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {status === 'RECEIVED' ? 'Create & Stock In Real-Time' : 'Save Purchase Order'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
