'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PlaneTakeoff, MapPin, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';

import { newTripSchema, NewTripInput } from '@/types/new-trip.schema';
import { createTripAction } from '@/app/actions/trips';

const MOCK_ITEMS = [
  'Sunscreen',
  'First Aid Kit',
  'Portable Charger',
  'Water Bottles',
  'Rain Jacket',
  'Snacks',
  'Camera',
  'Torch / Flashlight',
  'Insect Repellent',
  'Hand Sanitizer',
  'Medications',
  'Cash',
  'Power Bank',
  'Travel Pillow',
  'Reusable Bag',
  'Sunglasses',
];

export function NewTripModal({ children }: { children?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  // Multistep Form State
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [selectedItems, setSelectedItems] = React.useState<string[]>([]);

  const form = useForm<NewTripInput>({
    resolver: zodResolver(newTripSchema),
    defaultValues: {
      title: '',
      destination: '',
      aiPrompt: '',
      items: [],
    },
    mode: 'onTouched',
  });

  const promptValue = form.watch('aiPrompt') || '';
  const titleValue = form.watch('title') || '';

  // Step Navigators
  const goToStep2 = async () => {
    // Validate Step 1 fields
    const isValid = await form.trigger(['title', 'destination', 'dateRange']);
    if (isValid) setStep(2);
  };

  const skipAndCreate = async () => {
    form.setValue('items', []);
    form.handleSubmit(onSubmit)();
  };

  const getSuggestions = () => {
    if (promptValue.length >= 20) {
      // Transition to suggestion selection screen
      setStep(3);
    }
  };

  async function onSubmit(data: NewTripInput) {
    setIsPending(true);
    try {
      // In a real scenario, we would map the selectedItems array to the final payload.
      // But we can just use the state variable override or let RHF handle it.
      // Actually let's manually combine just in case RHF gets out of sync from state:
      data.items = step === 3 ? selectedItems : [];

      const response = await createTripAction(data);

      if (response.success && response.data) {
        if (response.warning) {
          toast.warning(response.warning);
        } else {
          toast.success(`Trip to ${data.destination} created successfully!`);
        }
        setOpen(false);
        form.reset();
        setStep(1);
        setSelectedItems([]);
        router.push(`/dashboard/trips/${response.data.tripId}`);
      } else {
        toast.error(response.error || 'Failed to create trip');
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  // Handle dialog open/close manually to reset form if canceled
  const onOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setStep(1);
      setSelectedItems([]);
    }
    setOpen(newOpen);
  };

  const toggleItem = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  // Motion variants for smooth slide transitions
  const stepVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? (
        <DialogTrigger render={children as React.ReactElement} />
      ) : (
        <DialogTrigger
          render={
            <Button className="bg-[#2D3A30] hover:bg-[#1f2821] text-white rounded-full px-6 transition-all duration-300 shadow-md flex items-center gap-2">
              <PlaneTakeoff className="w-4 h-4" />
              Plan New Trip
            </Button>
          }
        />
      )}
      <DialogContent className="sm:max-w-fit md:min-w-[500px] max-w-[95vw] p-0 overflow-hidden border-stone-200 bg-[#FAFAF8] rounded-2xl shadow-xl flex flex-col max-h-[90vh] transition-all duration-300">
        <div className="px-6 pt-6 pb-2 shrink-0">
          <DialogHeader className="flex flex-row justify-between items-start">
            <div>
              <DialogTitle className="font-serif text-2xl text-[#2D3A30]">
                {step === 3 ? 'Choose Suggested Items' : 'Plan a New Trip'}
              </DialogTitle>
              <DialogDescription className="text-stone-500 font-sans mt-1">
                {step === 3
                  ? 'Pick what to add to your board — you can always add more later.'
                  : 'Fill in trip details. Optionally let AI suggest what to pack.'}
              </DialogDescription>
            </div>
            {/* Shadcn automatically includes a close X icon by default but we can hide it via CSS if we prefer our own header layout */}
          </DialogHeader>
        </div>

        <Form {...form}>
          <form className="flex-1 overflow-y-auto px-6 pb-6 font-sans scrollbar-hide">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="space-y-4 pt-2"
                >
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-stone-700 font-bold text-xs uppercase tracking-wider">
                          TRIP NAME
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Smoky Mountains Adventure"
                            {...field}
                            className="h-11 border-stone-200 focus-visible:ring-0 focus:border-[#4A5D4E] bg-white transition-colors text-base"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 font-medium text-xs mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1.5 text-stone-700 font-bold text-xs uppercase tracking-wider">
                          <MapPin className="w-3.5 h-3.5" />
                          DESTINATION
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Gatlinburg, TN"
                            {...field}
                            className="h-11 border-stone-200 focus-visible:ring-0 focus:border-[#4A5D4E] bg-white transition-colors text-base"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 font-medium text-xs mt-1" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateRange"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-1.5 w-full">
                        <FormLabel className="text-stone-700 font-bold text-xs uppercase tracking-wider mb-2">
                          TRAVEL DATES
                        </FormLabel>
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                          <div className="flex-1 w-full space-y-1.5">
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block pl-1">
                              START DATE
                            </span>
                            <DatePicker
                              date={field.value?.from}
                              setDate={(d) => field.onChange({ ...field.value, from: d })}
                              placeholder="Start Date"
                            />
                          </div>
                          <div className="flex-1 w-full space-y-1.5">
                            <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider block pl-1">
                              END DATE
                            </span>
                            <DatePicker
                              date={field.value?.to}
                              setDate={(d) => field.onChange({ ...field.value, to: d })}
                              placeholder="End Date"
                              minDate={field.value?.from}
                            />
                          </div>
                        </div>
                        <FormMessage className="text-red-500 font-medium text-xs mt-2" />
                      </FormItem>
                    )}
                  />

                  <div className="pt-6 flex justify-end gap-3 border-t border-stone-100 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-0 px-6"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={goToStep2}
                      disabled={titleValue.trim().length === 0}
                      className="bg-[#3D2925] hover:bg-[#2b1d1a] disabled:bg-[#d6d3d1] disabled:text-[#78716c] text-white focus-visible:ring-0 transition-colors px-6 flex items-center gap-2"
                    >
                      Next <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="space-y-4 pt-2"
                >
                  <div className="bg-[#FAF9FF] border border-[#E7E2FA] rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[#7A6EC2]" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-[#6355B5]">
                        AI Packing Suggestions — Optional
                      </h3>
                    </div>
                    <p className="text-[#3A3266] text-sm mb-4 font-medium leading-relaxed">
                      Describe your trip and we will suggest a categorized packing list to get you
                      started.
                    </p>
                    <FormField
                      control={form.control}
                      name="aiPrompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <textarea
                              placeholder="e.g. 5 day hiking trip to Smoky Mountains in March with 4 friends, mix of trail hiking and camping..."
                              {...field}
                              className="w-full min-h-[110px] resize-none border border-[#CBD5E1] rounded-lg p-3 text-sm outline-none focus:border-[#7A6EC2] focus:ring-1 focus:ring-[#7A6EC2]/20 transition-all bg-white text-stone-700"
                            />
                          </FormControl>
                          {promptValue.length > 0 && promptValue.length < 20 && (
                            <p className="text-orange-500 font-medium text-xs mb-1">
                              Please enter at least 20 characters for better AI results.
                            </p>
                          )}
                          <p className="text-[#8881B5] text-xs font-medium mt-3">
                            Sent to AI only if you click Get Suggestions. Skip to build manually.
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="pt-6 flex justify-between items-center border-t border-stone-100 mt-6 gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep(1)}
                      className="text-stone-500 hover:text-stone-800 focus-visible:ring-0 px-2 -ml-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={skipAndCreate}
                        disabled={isPending}
                        className="bg-white border-stone-200 text-stone-700 font-bold hover:bg-stone-50 focus-visible:ring-0 px-6 rounded-lg shadow-sm"
                      >
                        Skip & Create
                      </Button>
                      <Button
                        type="button"
                        onClick={getSuggestions}
                        disabled={promptValue.length < 20 || isPending}
                        className="bg-[#3D2925] hover:bg-[#2b1d1a] disabled:bg-stone-300 disabled:text-stone-500 text-white font-bold focus-visible:ring-0 transition-colors px-6 rounded-lg shadow-sm"
                      >
                        Get Suggestions <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  className="flex flex-col h-full pt-1"
                >
                  <p className="text-stone-600 mb-5 text-sm">
                    Based on your trip description, here are suggested items.
                  </p>

                  <div className="flex flex-wrap gap-2.5 mb-6">
                    {MOCK_ITEMS.map((item) => {
                      const isSelected = selectedItems.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleItem(item)}
                          className={cn(
                            'px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ease-in-out border-2',
                            isSelected
                              ? 'bg-[#3D2925] text-[#FAFAF8] border-[#3D2925] shadow-sm transform scale-100'
                              : 'bg-[#EAE4D9]/50 text-[#5C4D4A] border-transparent hover:bg-[#EAE4D9] hover:border-[#EAE4D9] transform scale-100'
                          )}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between pb-6 border-b border-stone-100 mb-6">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedItems([...MOCK_ITEMS])}
                        className="border-stone-800 text-stone-800 rounded-lg hover:bg-stone-100 focus-visible:ring-0 h-9 font-bold"
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setSelectedItems([])}
                        className="border-stone-800 text-stone-800 rounded-lg hover:bg-stone-100 focus-visible:ring-0 h-9 font-bold"
                      >
                        Clear
                      </Button>
                    </div>
                    <span className="text-stone-500 font-medium text-sm">
                      {selectedItems.length} selected
                    </span>
                  </div>

                  <div className="flex justify-between items-center gap-3 mt-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(2)}
                      className="border-stone-800 text-stone-800 font-bold hover:bg-stone-50 focus-visible:ring-0 rounded-lg px-6"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                    <Button
                      type="button"
                      onClick={() => form.handleSubmit(onSubmit)()}
                      disabled={isPending}
                      className="bg-[#415C49] hover:bg-[#324738] text-white font-bold focus-visible:ring-0 transition-colors px-6 rounded-lg shadow-sm"
                    >
                      {isPending ? 'Creating...' : `Add ${selectedItems.length} Items & Create`}
                      {!isPending && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
