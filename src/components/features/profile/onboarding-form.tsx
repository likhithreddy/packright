'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AVATAR_COLORS, PACKING_STYLES } from '@/types/profile.types';
import {
  Check,
  Loader2,
  UserCheck,
  AtSign,
  User,
  Compass,
  Backpack,
  ArrowRight,
  ArrowLeft,
  Palette
} from 'lucide-react';
import { getInitials } from '@/lib/profile-utils';
import { onboardingSchema, type OnboardingFormValues } from '@/types/onboarding.schema';


interface OnboardingFormProps {
  userId: string;
  existingFullName?: string | null;
}

export default function OnboardingForm({ userId, existingFullName }: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<OnboardingFormValues | null>(null);
  const [canSubmit, setCanSubmit] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: existingFullName || '',
      username: '',
      avatar_theme: AVATAR_COLORS[0].value,
      packing_style: PACKING_STYLES[0],
    },
    mode: 'onChange',
  });

  const { getValues, setValue, watch, trigger, formState: { errors, isValid } } = form;

  useEffect(() => {
    if (existingFullName) {
      setValue('full_name', existingFullName);
    }
  }, [existingFullName, setValue]);

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => setCanSubmit(true), 400);
      return () => clearTimeout(timer);
    } else {
      setCanSubmit(false);
    }
  }, [step]);

  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      if (username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const { data, error } = await supabase.rpc('check_username_available', {
          username_to_check: username,
        });

        if (error) {
          setUsernameAvailable(null);
          return;
        }

        setUsernameAvailable(data as boolean);
      } catch {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    },
    [supabase]
  );

  const handleNext = async () => {
    let fieldsToValidate: (keyof OnboardingFormValues)[] = [];
    if (step === 1) fieldsToValidate = ['full_name', 'username'];
    if (step === 2) fieldsToValidate = ['avatar_theme'];
    if (step === 3) fieldsToValidate = ['packing_style'];


    const isStepValid = await trigger(fieldsToValidate);

    if (isStepValid) {
      if (step === 1 && usernameAvailable === true) {
        setPendingValues(getValues());
        setShowConfirmDialog(true);
      } else {
        setStep((s) => s + 1);
      }
    }
  };

  const handleBack = () => {
    setCanSubmit(false);
    setStep((s) => s - 1);
  };

  const handleConfirmHandle = async () => {
    setIsCheckingUsername(true); // Re-use loading state or add new one
    // Simulate a brief check/processing delay for premium feel
    await new Promise((resolve) => setTimeout(resolve, 800));
    setShowConfirmDialog(false);
    setIsCheckingUsername(false);
    setStep(2);
  };

  const onSubmit = async (values: OnboardingFormValues) => {
    // If user hits Enter on earlier steps, just move forward
    if (step < 3) {
      handleNext();
      return;
    }

    // Guard against "ghost clicks" or premature submissions during transition
    if (step !== 3 || !canSubmit) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: values.full_name,
          username: values.username.toLowerCase(),
          avatar_theme: values.avatar_theme,
          packing_style: values.packing_style,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('This handle is already taken. Please choose another.');
          setStep(1);
          return;
        }
        throw error;
      }

      toast.success('Profile created successfully! Welcome to PackRight!');

      // Delay redirect for transition
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error('Onboarding error detailed:', err);
      const errorMessage = (err as any)?.message || 'An unexpected error occurred. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedFullName = watch('full_name');
  const watchedColor = watch('avatar_theme');
  const initials = getInitials(watchedFullName || existingFullName);

  return (
    <div className="relative">
      {/* Loading Overlay */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm rounded-2xl"
          >
            <div className="bg-background p-6 rounded-full shadow-2xl border border-border">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <p className="mt-4 font-medium text-foreground animate-pulse tracking-wide">
              Finalizing your setup...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8">
        {/* Progress Tracker */}
        <div className="relative flex items-center justify-between w-full px-5 mb-8">
          {/* Background Line */}
          {/* Line Segment 1 (Step 1 to 2) */}
          <div className="absolute top-1/2 left-[72px] right-[calc(50%+32px)] h-[2px] bg-secondary/30 -translate-y-1/2">
            <motion.div
              className="h-full bg-primary origin-left"
              initial={false}
              animate={{ scaleX: step >= 2 ? 1 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          {/* Line Segment 2 (Step 2 to 3) */}
          <div className="absolute top-1/2 left-[calc(50%+32px)] right-[72px] h-[2px] bg-secondary/30 -translate-y-1/2">
            <motion.div
              className="h-full bg-primary origin-left"
              initial={false}
              animate={{ scaleX: step >= 3 ? 1 : 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>

          {[1, 2, 3].map((s) => (
            <div key={s} className="relative z-10 flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: step >= s ? 'var(--primary)' : 'var(--background)',
                  borderColor: step >= s ? 'var(--primary)' : 'var(--secondary)',
                  color: step >= s ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${step === s ? 'ring-4 ring-primary/20 ring-offset-2 ring-offset-background scale-110' : ''
                  }`}
              >
                {step > s ? <Check className="h-5 w-5" /> : s}
              </motion.div>
            </div>
          ))}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="min-h-[320px] flex flex-col">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-6 flex-1"
                >
                  <div className="space-y-2">
                    <h2 className="text-2xl font-serif font-bold text-foreground">Tell us about yourself</h2>
                    <p className="text-sm text-muted-foreground">This is how friends will find you on PackRight.</p>
                  </div>

                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" /> Full Name
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Alex Johnson"
                              className="h-12 bg-secondary/20 border-border/50 focus:border-primary/50 transition-colors"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <AtSign className="h-4 w-4 text-primary" /> Unique Handle
                          </FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                placeholder="alex_packer"
                                className="h-12 bg-secondary/20 border-border/50 focus:border-primary/50 transition-colors pr-10"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  checkUsernameAvailability(e.target.value);
                                }}
                              />
                            </FormControl>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {isCheckingUsername && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              {!isCheckingUsername && usernameAvailable === true && (
                                <UserCheck className="h-5 w-5 text-emerald-500" data-testid="user-check-icon" />
                              )}
                              {!isCheckingUsername && usernameAvailable === false && (
                                <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-bold uppercase">Taken</span>
                              )}
                            </div>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-8 flex-1"
                >
                  <div className="flex flex-col items-center gap-6">
                    {/* Main Preview */}
                    <div
                      className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold text-white shadow-2xl ring-4 ring-background transition-all duration-500"
                      style={{ backgroundColor: watchedColor }}
                    >
                      {initials}
                    </div>

                    <div className="text-center space-y-1">
                      <h2 className="text-2xl font-serif font-bold text-foreground">Choose your vibe</h2>
                      <p className="text-sm text-muted-foreground">Pick a color that represents you.</p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="avatar_theme"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="grid grid-cols-4 md:grid-cols-8 gap-4 justify-items-center">
                            {AVATAR_COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => field.onChange(color.value)}
                                className={`group relative w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${field.value === color.value
                                  ? 'border-primary ring-4 ring-primary/10 scale-110'
                                  : 'border-transparent hover:scale-105 hover:border-gray-300'
                                  } shadow-sm`}
                                style={{ backgroundColor: color.value }}
                              >
                                <span className="text-[10px] md:text-xs font-bold text-white/90 uppercase tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">
                                  {initials}
                                </span>
                                {field.value === color.value && (
                                  <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-lg">
                                    <Check className="h-3 w-3" />
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-8 flex-1"
                >
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-primary/10 rounded-2xl">
                      <Backpack className="h-10 w-10 text-primary" />
                    </div>
                    <div className="text-center space-y-1">
                      <h2 className="text-2xl font-serif font-bold text-foreground">Packing Style</h2>
                      <p className="text-sm text-muted-foreground">How do you usually prepare for a trip?</p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="packing_style"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {PACKING_STYLES.map((style) => (
                              <button
                                key={style}
                                type="button"
                                onClick={() => field.onChange(style)}
                                className={`relative py-5 px-6 rounded-xl text-left transition-all duration-300 border-2 ${field.value === style
                                  ? 'bg-primary/5 border-primary shadow-sm'
                                  : 'bg-secondary/20 border-transparent hover:border-border/50'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`font-semibold ${field.value === style ? 'text-primary' : 'text-foreground/70'}`}>
                                    {style}
                                  </span>
                                  {field.value === style && <Check className="h-5 w-5 text-primary" />}
                                </div>
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="mt-10 flex items-center justify-between gap-4">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="px-6 border-border/50 hover:bg-secondary/50"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
              ) : (
                <div /> // Spacer
              )}

              {step < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="px-8 font-semibold"
                  disabled={isSubmitting || (step === 1 && (!watchedFullName || watchedFullName.length < 3 || usernameAvailable !== true || isCheckingUsername))}
                >
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="px-10 font-bold bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                  disabled={isSubmitting || !canSubmit}
                >
                  Complete Setup <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <AtSign className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-xl font-serif">Confirm your handle</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Your handle <span className="font-bold text-foreground italic">@{pendingValues?.username}</span> will be permanently locked.
              <br /><br />
              Friends will use this to find you and collaborate on packing lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Wait, let me change it</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmHandle} className="rounded-xl font-bold">
              Yes, I'm sure
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
