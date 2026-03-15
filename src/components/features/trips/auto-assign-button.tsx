'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Shuffle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AutoAssignButtonProps {
  tripId: string;
  className?: string;
  onSuccess?: () => void;
}

export function AutoAssignButton({ tripId, className, onSuccess }: AutoAssignButtonProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const router = useRouter();

  const handleAutoAssign = async () => {
    setIsPending(true);
    try {
      const response = await fetch(`/api/trips/${tripId}/auto-assign`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to auto-assign items');
      }

      toast.success(result.message || 'Items assigned successfully!');
      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      }

      // Refresh the page to show updated claims
      router.refresh();

      // Also trigger a custom event for stats if needed,
      // but router.refresh + realtime should handle most things
    } catch (error) {
      console.error('Auto-assign error:', error);
      toast.error(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className={`bg-stone-900 hover:bg-stone-800 text-white gap-2 h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm ${className}`}
          data-testid="auto-assign-button"
        >
          <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>Assign Randomly</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl border-b border-stone-100 pb-2">
            Assign Items Randomly?
          </DialogTitle>
          <DialogDescription className="text-stone-600 pt-2">
            This will distribute all remaining items in the "Needed" column among trip members to
            ensure everyone has a fair amount of items to pack.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-sm text-stone-500 italic">
          Note: This action uses a quantity-based balancing algorithm and will create or update
          claims for items.
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="text-stone-500 hover:text-stone-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAutoAssign}
            disabled={isPending}
            className="bg-stone-900 hover:bg-stone-800 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Confirm Assignment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
