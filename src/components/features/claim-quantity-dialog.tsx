'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const claimQuantitySchema = z.object({
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
});

type ClaimQuantityFormValues = z.infer<typeof claimQuantitySchema>;

interface ClaimQuantityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  remainingNeeded: number;
  onConfirm: (quantity: number) => void;
}

export function ClaimQuantityDialog({
  open,
  onOpenChange,
  itemName,
  remainingNeeded,
  onConfirm,
}: ClaimQuantityDialogProps) {
  const form = useForm<ClaimQuantityFormValues>({
    resolver: zodResolver(claimQuantitySchema),
    defaultValues: {
      quantity: remainingNeeded,
    },
  });

  const handleSubmit = (values: ClaimQuantityFormValues) => {
    onConfirm(values.quantity);
    onOpenChange(false);
    form.reset();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Claim Item</DialogTitle>
          <DialogDescription>
            How many of <span className="font-medium">"{itemName}"</span> would you like to claim?
            <br />
            <span className="text-stone-500">{remainingNeeded} more needed</span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter quantity"
                      className="text-center text-lg h-12"
                      {...field}
                      min={1}
                      max={remainingNeeded}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#a8d5a8] hover:bg-[#8bc48b] text-[#2D3A30] rounded-full"
              >
                Confirm
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
