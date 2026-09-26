import React, { useState, useMemo } from 'react';
import { ProductCategory } from '../types';
import { useStore } from '../context/StoreContext';
import { 
  Smartphone, 
  Headphones, 
  Shirt, 
  Home, 
  Sparkles, 
  LayoutGrid, 
  Plus, 
  Tag,
  Layers
} from 'lucide-react';
import { CategoryManagerModal } from './CategoryManagerModal';

export const CategoryFilter: React.FC = () => {
  const { selectedCategory, setSelectedCategory, categories, products } = useStore();
  const [isManagerOpen, setIsManagerOpen] = useState(false);

  const getCount = (cat: ProductCategory) => {
    if (cat === 'All') return products.length;
    return products.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length;
  };

  const getCategoryIcon = (categoryName: string) => {
    const lower = categoryName.toLowerCase();
    if (lower.includes('audio') || lower.includes('headphone') || lower.includes('speaker')) return Headphones;
    if (lower.includes('smart') || lower.includes('phone') || lower.includes('watch') || lower.includes('tech')) return Smartphone;
    if (lower.includes('fashion') || lower.includes('cloth') || lower.includes('shirt')) return Shirt;
    if (lower.includes('home') || lower.includes('decor')) return Home;
    if (lower.includes('beauty') || lower.includes('care')) return Sparkles;
    return Tag;
  };

  const allCategoryList = useMemo(() => {
    const filtered = (categories || []).filter(c => typeof c === 'string' && c.trim().toLowerCase() !== 'all');
    return ['All', ...Array.from(new Set(filtered))];
  }, [categories]);

  return (
    <>
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-6">
        {allCategoryList.map((categoryName) => {
          const isSelected = selectedCategory.toLowerCase() === categoryName.toLowerCase();
          const count = getCount(categoryName);
          const Icon = categoryName === 'All' ? LayoutGrid : getCategoryIcon(categoryName);

          return (
            <button
              key={`cat-filter-btn-${categoryName}`}
              id={`category-tab-${categoryName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => setSelectedCategory(categoryName)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all select-none ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                  : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{categoryName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isSelected
                    ? 'bg-slate-800 text-amber-300'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* "+ Add Category" button */}
        <button
          type="button"
          id="btn-open-category-manager"
          onClick={() => setIsManagerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-xs"
          title="Add or manage product categories"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Category</span>
        </button>
      </div>

      <CategoryManagerModal
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        onCategoryCreated={(newCat) => setSelectedCategory(newCat)}
      />
    </>
  );
};
