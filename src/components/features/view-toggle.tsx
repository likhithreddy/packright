'use client';

import * as React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/board-store';
import { cn } from '@/lib/utils';

export function ViewToggle() {
  const { viewMode, setViewMode } = useBoardStore();

  return (
    <div className="hidden md:flex items-center bg-stone-100 rounded-full p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode('kanban')}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
          viewMode === 'kanban'
            ? 'bg-white text-[#2D3A30] shadow-sm'
            : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
        <span>Kanban</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setViewMode('list')}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
          viewMode === 'list'
            ? 'bg-white text-[#2D3A30] shadow-sm'
            : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
        )}
      >
        <List className="h-3.5 w-3.5 mr-1.5" />
        <span>List</span>
      </Button>
    </div>
  );
}
