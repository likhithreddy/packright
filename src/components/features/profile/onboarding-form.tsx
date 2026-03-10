'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
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
import { Loader2, UserCheck, AtSign, User, Palette, Backpack } from 'lucide-react';

const onboardingSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  avatar_theme: z.string().min(1, 'Please select an avatar color'),
  packing_style: z.string().min(1, 'Please select a packing style'),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

interface OnboardingFormProps {
  userId: string;
  existingFullName?: string | null;
}

export default function OnboardingForm({ userId, existingFullName }: OnboardingFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValues, setPendingValues] = useState<OnboardingFormValues | null>(null);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: existingFullName || '',
      username: '',
      avatar_theme: AVATAR_COLORS[0].value,
      packing_style: PACKING_STYLES[0],
    },
  });

  // Sync existingFullName if it changes (important for tests and async loads)
  const { setValue } = form;
  useEffect(() => {
    if (existingFullName) {
      setValue('full_name', existingFullName);
    }
  }, [existingFullName, setValue]);

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

  const handleFormSubmit = (values: OnboardingFormValues) => {
    // ISSUE-#36: Show AlertDialog confirmation before saving the permanent username
    setPendingValues(values);
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    if (!pendingValues) return;

    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: pendingValues.full_name,
          username: pendingValues.username.toLowerCase(),
          avatar_theme: pendingValues.avatar_theme,
          packing_style: pendingValues.packing_style,
        })
        .eq('id', userId);

      if (error) {
        if (error.code === '23505') {
          toast.error('This handle is already taken. Please choose another.');
          return;
        } else {
          toast.error('Failed to save your profile. Please try again.');
        }
        return;
      }

      toast.success('Profile created successfully! Welcome to PackRight!');
      router.push('/dashboard');
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || '?';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const watchedName = form.watch('full_name');
  const watchedColor = form.watch('avatar_theme');

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex justify-center">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg transition-all duration-300"
              style={{ backgroundColor: watchedColor }}
            >
              {getInitials(watchedName)}
            </div>
          </div>

          {/* Full Name */}
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-foreground/80">
                  <User className="h-4 w-4" />
                  Full Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your full name"
                    className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Username */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-foreground/80">
                  <AtSign className="h-4 w-4" />
                  Handle
                </FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      placeholder="your_unique_handle"
                      className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50 pr-10"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        checkUsernameAvailability(e.target.value);
                      }}
                    />
                  </FormControl>
                  {/* Username availability indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingUsername && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                    {!isCheckingUsername && usernameAvailable === true && (
                      <UserCheck className="h-4 w-4 text-primary" data-testid="user-check-icon" />
                    )}
                    {!isCheckingUsername && usernameAvailable === false && (
                      <span className="text-xs text-destructive font-medium">Taken</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  3-20 characters. Only letters, numbers, and underscores.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Avatar Color Picker */}
          <FormField
            control={form.control}
            name="avatar_theme"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-foreground/80">
                  <Palette className="h-4 w-4" />
                  Avatar Color
                </FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-3">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => field.onChange(color.value)}
                        className={`w-10 h-10 rounded-full transition-all duration-200 border-2 ${
                          field.value === color.value
                            ? 'border-foreground scale-110 shadow-md'
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                        aria-label={`Select ${color.name} avatar color`}
                      />
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Packing Style */}
          <FormField
            control={form.control}
            name="packing_style"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-2 text-foreground/80">
                  <Backpack className="h-4 w-4" />
                  Packing Style
                </FormLabel>
                <FormControl>
                  <div className="grid grid-cols-2 gap-2">
                    {PACKING_STYLES.map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => field.onChange(style)}
                        className={`py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 border ${
                          field.value === style
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-secondary/30 text-foreground/70 border-border/50 hover:bg-secondary/50'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={isSubmitting || usernameAvailable === false}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </form>
      </Form>

      {/* ISSUE-#36: AlertDialog warning that the handle is permanent */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Handle</AlertDialogTitle>
            <AlertDialogDescription>
              Your handle{' '}
              <span className="font-bold text-foreground">@{pendingValues?.username}</span> will be{' '}
              <strong>permanently locked</strong> and cannot be changed later. Other users will find
              and add you to trips using this handle. Please make sure you are entering the correct
              username.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave}>Confirm Handle</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
