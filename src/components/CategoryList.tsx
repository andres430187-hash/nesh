import React from 'react';
import { Folder, Layers, Sparkles } from 'lucide-react';
import { NeshCategory, NeshContentType } from '../types';

interface CategoryListProps {
  categories: NeshCategory[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  type: NeshContentType;
  totalItemsCount: number;
}

export const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  activeCategoryId,
  onSelectCategory,
  totalItemsCount,
}) => {
  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs uppercase tracking-wider font-bold text-neutral-400 flex items-center gap-2">
          <Folder className="w-4 h-4 text-[#00ff66]" />
          <span>Categorías ({categories.length})</span>
        </h2>
      </div>

      {/* Horizontal scrolling pill list for quick category browsing */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {/* All items category */}
        <button
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
            activeCategoryId === 'all'
              ? 'bg-[#00ff66] text-black border-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)] font-bold'
              : 'bg-[#121212] text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Todos</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              activeCategoryId === 'all'
                ? 'bg-black/20 text-black font-extrabold'
                : 'bg-neutral-800 text-neutral-400'
            }`}
          >
            {totalItemsCount}
          </span>
        </button>

        {/* Categories list */}
        {categories.map((cat) => {
          const isSelected = activeCategoryId === cat.category_id;
          return (
            <button
              key={cat.category_id}
              onClick={() => onSelectCategory(cat.category_id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                isSelected
                  ? 'bg-[#00ff66] text-black border-[#00ff66] shadow-[0_0_15px_rgba(0,255,102,0.3)] font-bold'
                  : 'bg-[#121212] text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:text-white'
              }`}
            >
              <Folder className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-[#00ff66]'}`} />
              <span>{cat.category_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
