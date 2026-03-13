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
import { Loader2 } from 'lucide-react';

interface UnclaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  claimedQuantity: number;
  onConfirm: (quantity: number) => Promise<void>;
}

export function UnclaimDialog({
  open,
  onOpenChange,
  itemName,
  claimedQuantity,
  onConfirm,
}: UnclaimDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Create schema dynamically based on claimedQuantity
  const unclaimSchema = z.object({
    quantity: z
      .number()
      .int('Quantity must be a whole number')
      .positive('Quantity must be at least 1')
      .max(claimedQuantity, `You cannot unclaim more than ${claimedQuantity}`),
  });

  type UnclaimFormValues = z.infer<typeof unclaimSchema>;

  const form = useForm<UnclaimFormValues>({
    resolver: zodResolver(unclaimSchema),
    defaultValues: {
      quantity: claimedQuantity,
    },
  });

  // Reset form when claimed quantity changes
  React.useEffect(() => {
    form.reset({
      quantity: claimedQuantity,
    });
  }, [claimedQuantity, form]);

  const handleSubmit = async (values: UnclaimFormValues) => {
    setIsSubmitting(true);
    try {
      await onConfirm(values.quantity);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Failed to unclaim item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open || !isSubmitting) {
      form.reset();
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Unclaim Item</DialogTitle>
          <DialogDescription>
            How many of <span className="font-medium">"{itemName}"</span> would you like to unclaim?
            <br />
            <span className="text-stone-500">You have claimed {claimedQuantity}</span>
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
                      max={claimedQuantity}
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
                disabled={isSubmitting}
                className="rounded-full"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant="destructive"
                className="rounded-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unclaiming...
                  </>
                ) : (
                  'Unclaim'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
