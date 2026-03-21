'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';

interface AddItemCardProps {
  onClick: () => void;
}

export function AddItemCard({ onClick }: AddItemCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-transparent border border-dashed border-stone-300 rounded-xl p-3 sm:p-4 shadow-sm hover:bg-stone-50/80 hover:border-stone-400 transition-all cursor-pointer group flex items-center justify-center gap-2 h-[80px] sm:h-[88px]"
    >
      <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-stone-400 group-hover:text-stone-600 transition-colors" />
      <span className="text-sm sm:text-base text-stone-500 group-hover:text-stone-700 transition-colors">
        Add item
      </span>
    </button>
  );
}
