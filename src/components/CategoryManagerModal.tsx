import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Tag, Plus, Trash2, X, Check, AlertCircle, Layers } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (newCategory: string) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  onCategoryCreated,
}) => {
  const { categories, addCategory, deleteCategory, products } = useStore();
  const [newCatName, setNewCatName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg('Category name cannot be empty.');
      return;
    }

    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg(`Category "${trimmed}" already exists.`);
      return;
    }

    const ok = addCategory(trimmed);
    if (ok) {
      setSuccessMsg(`Category "${trimmed}" successfully added!`);
      setNewCatName('');
      if (onCategoryCreated) {
        onCategoryCreated(trimmed);
      }
      setTimeout(() => setSuccessMsg(null), 2500);
    } else {
      setErrorMsg('Failed to add category.');
    }
  };

  const getCategoryCount = (categoryName: string) => {
    return products.filter(p => p.category.toLowerCase() === categoryName.toLowerCase()).length;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        id="category-manager-modal"
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Manage Product Categories</h3>
              <p className="text-xs text-slate-400">Add, organize, or remove store categories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Add New Category
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Smart Watch, Gaming Gear..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 focus:border-amber-500 focus:bg-white rounded-xl text-xs sm:text-sm font-bold outline-none transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Existing Categories List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider">Active Categories ({categories.length})</span>
              <span>Products Linked</span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
              {categories.map((cat, idx) => {
                const count = getCategoryCount(cat);
                const isDefault = ['Headphones', 'Smartwatches', 'Power Banks', 'Speakers', 'Chargers', 'Accessories'].includes(cat);

                return (
                  <div key={`cat-mgr-${cat}-${idx}`} className="flex items-center justify-between px-3.5 py-2.5 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800">{cat}</span>
                      {isDefault && (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {count} items
                      </span>

                      {!isDefault && (
                        categoryToDelete === cat ? (
                          <div className="flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 animate-in fade-in duration-100">
                            <span className="text-[10px] font-bold text-rose-700 mr-0.5">Delete?</span>
                            <button
                              type="button"
                              onClick={() => {
                                deleteCategory(cat);
                                setCategoryToDelete(null);
                                setSuccessMsg(`Deleted category "${cat}"`);
                                setTimeout(() => setSuccessMsg(null), 3000);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setCategoryToDelete(null)}
                              className="px-2 py-0.5 bg-white text-slate-600 rounded text-[10px] font-semibold hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(cat)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
