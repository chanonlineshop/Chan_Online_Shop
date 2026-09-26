import React, { useState } from 'react';
import { Product } from '../types';
import { parseProductDescription } from '../utils/descriptionFormatter';
import { 
  X, 
  AlignLeft, 
  Edit3, 
  Check, 
  Copy, 
  Sparkles, 
  Tag, 
  Layers, 
  Package, 
  Barcode, 
  Scale, 
  CheckCircle2,
  ListOrdered
} from 'lucide-react';

interface ProductDescriptionViewerModalProps {
  product: Product;
  onClose: () => void;
  onSaveDescription: (productId: string, newDescription: string) => void;
}

export const ProductDescriptionViewerModal: React.FC<ProductDescriptionViewerModalProps> = ({
  product,
  onClose,
  onSaveDescription,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(product.description || '');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const parsed = parseProductDescription(isEditing ? editedText : product.description);

  const handleCopy = () => {
    navigator.clipboard.writeText(product.description || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSaveDescription(product.id, editedText.trim());
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setIsEditing(false);
    }, 1200);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
              <img 
                src={product.images[0]} 
                alt={product.name} 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  {product.category}
                </span>
                <span className="text-[11px] font-mono text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                  {product.sku}
                </span>
              </div>
              <h3 className="font-extrabold text-base text-slate-900 leading-snug">
                {product.name}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-5 py-2.5 bg-slate-100/60 border-b border-slate-200/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <AlignLeft className="w-4 h-4 text-amber-600" />
              <span>Product Specifications &amp; Overview</span>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-[11px] text-slate-500">
              {product.description?.length || 0} chars
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
              title="Copy description to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer ${
                isEditing
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'View Mode' : 'Quick Edit'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Edit Description Text (Supports bullet points with • or -)
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditedText(prev => prev + '\n• ')}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded cursor-pointer"
                  >
                    + Add Bullet
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditedText(prev => prev + '\nWarranty: 1-Year Official Warranty\nMaterial: Premium Finish')}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded cursor-pointer"
                  >
                    + Add Spec Keys
                  </button>
                </div>
              </div>

              <textarea
                rows={10}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                placeholder="Enter rich product description..."
                className="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-300 rounded-2xl outline-none focus:bg-white focus:border-amber-500 transition-colors leading-relaxed"
              />

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  {editedText.length} characters ({editedText.split(/\s+/).filter(Boolean).length} words)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditedText(product.description || '');
                      setIsEditing(false);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-4 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Highlight Card */}
              <div className="p-4 bg-gradient-to-br from-slate-50 to-amber-50/30 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Overview &amp; Highlights</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                  {parsed.summary}
                </p>
              </div>

              {/* Bullet Points if any */}
              {parsed.bullets.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                    <ListOrdered className="w-4 h-4 text-indigo-600" />
                    <span>Key Features &amp; Capabilities</span>
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {parsed.bullets.map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="leading-snug">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Key-Value Specifications if any */}
              {parsed.specs.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
                  <h4 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-600" />
                    <span>Detailed Technical Specifications</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {parsed.specs.map((spec, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">{spec.label}</span>
                        <span className="text-xs font-extrabold text-slate-800">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Feature Tags from product.features */}
              {product.features && product.features.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>Feature Badges</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {product.features.map((feat, idx) => (
                      <span 
                        key={idx} 
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold"
                      >
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Physical Properties / Metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Retail Price</span>
                  <span className="text-xs font-black text-slate-900">${product.price.toFixed(2)}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">In Stock</span>
                  <span className="text-xs font-black text-slate-900">{product.stock} units</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Barcode / EAN</span>
                  <span className="text-xs font-mono font-bold text-slate-700 truncate block">
                    {product.barcode || 'N/A'}
                  </span>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 font-semibold block">Weight</span>
                  <span className="text-xs font-bold text-slate-700 block">
                    {product.weight ? `${product.weight} ${product.weightUnit || 'kg'}` : 'Standard'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Chan Online Shop Inventory Control System
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
