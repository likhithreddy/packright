'use client';

import * as React from 'react';
import { Eye, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBoardStore } from '@/store/board-store';
import { cn } from '@/lib/utils';

export function BoardViewToggle() {
  const { boardViewMode, setBoardViewMode } = useBoardStore();

  return (
    <div className="hidden md:flex items-center bg-stone-100 rounded-full p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setBoardViewMode('my-view')}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
          boardViewMode === 'my-view'
            ? 'bg-white text-[#2D3A30] shadow-sm'
            : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
        )}
      >
        <Eye className="h-3.5 w-3.5 mr-1.5" />
        <span>My View</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setBoardViewMode('all-items-view')}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
          boardViewMode === 'all-items-view'
            ? 'bg-white text-[#2D3A30] shadow-sm'
            : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
        )}
      >
        <Users className="h-3.5 w-3.5 mr-1.5" />
        <span>All Items</span>
      </Button>
    </div>
  );
}
