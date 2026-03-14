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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';

const editItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(100, 'Item name cannot exceed 100 characters'),
  required_count: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000'),
  claim_type: z.enum(['single', 'multiple']),
});

type EditItemFormValues = z.infer<typeof editItemSchema>;

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  requiredCount: number;
  claimType: 'single' | 'multiple';
  onSave: (name: string, requiredCount: number, claimType: 'single' | 'multiple') => Promise<void>;
}

export function EditItemDialog({
  open,
  onOpenChange,
  itemName,
  requiredCount,
  claimType,
  onSave,
}: EditItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<EditItemFormValues>({
    resolver: zodResolver(editItemSchema),
    defaultValues: {
      name: itemName,
      required_count: requiredCount,
      claim_type: claimType,
    },
  });

  // Reset form when item data changes
  React.useEffect(() => {
    form.reset({
      name: itemName,
      required_count: requiredCount,
      claim_type: claimType,
    });
  }, [itemName, requiredCount, claimType, form]);

  const handleSubmit = async (values: EditItemFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values.name, values.required_count, values.claim_type);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Failed to update item:', error);
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
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Edit Item</DialogTitle>
          <DialogDescription>
            Update the item name, quantity, and claim type. This will be visible to all trip
            members.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Item Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter item name" className="h-10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="required_count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Required Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter quantity"
                      className="h-10"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      min={1}
                      max={1000}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="claim_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Claim Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <Label htmlFor="single" className="font-normal cursor-pointer">
                          Single person
                          <p className="text-xs text-stone-500">One person claims all items</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple" id="multiple" />
                        <Label htmlFor="multiple" className="font-normal cursor-pointer">
                          Multiple people
                          <p className="text-xs text-stone-500">Allow quantity splitting</p>
                        </Label>
                      </div>
                    </RadioGroup>
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
                className="bg-[#a8d5a8] hover:bg-[#8bc48b] text-[#2D3A30] rounded-full"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
