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
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { CATEGORY_ICONS } from '@/lib/utils/category-icons';

const addItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Item name is required')
    .max(100, 'Item name cannot exceed 100 characters'),
  required_count: z
    .number()
    .min(1, 'Quantity must be at least 1')
    .max(1000, 'Quantity cannot exceed 1000'),
  category: z.string().min(1, 'Category is required'),
  claim_type: z.enum(['single', 'multiple']),
});

type AddItemFormValues = z.infer<typeof addItemSchema>;

// Predefined categories from category-icons.tsx
const CATEGORY_OPTIONS: ComboboxOption[] = Object.keys(CATEGORY_ICONS).map((cat) => ({
  value: cat,
  label: cat,
}));

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    name: string,
    requiredCount: number,
    category: string,
    claimType: 'single' | 'multiple'
  ) => Promise<void>;
}

export function AddItemDialog({ open, onOpenChange, onSave }: AddItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<AddItemFormValues>({
    resolver: zodResolver(addItemSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      required_count: 1,
      category: '',
      claim_type: 'single',
    },
  });

  const handleSubmit = async (values: AddItemFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values.name, values.required_count, values.category, values.claim_type);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handling is done by the parent component
      console.error('Failed to create item:', error);
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
          <DialogTitle className="font-serif text-xl">Add New Item</DialogTitle>
          <DialogDescription>
            Add a new item to the trip. This will be visible to all trip members.
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
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const stringValue = e.target.value;
                        if (stringValue === '') {
                          // Empty input - pass 0 which will fail validation
                          field.onChange(0);
                        } else {
                          const numValue = parseInt(stringValue, 10);
                          field.onChange(isNaN(numValue) ? 0 : numValue);
                        }
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Category</FormLabel>
                  <FormControl>
                    <Combobox
                      options={CATEGORY_OPTIONS}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select or type a category"
                      allowNew
                      newLabelFormat={(v) => `Use "${v}"`}
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
                    Adding...
                  </>
                ) : (
                  'Add Item'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
