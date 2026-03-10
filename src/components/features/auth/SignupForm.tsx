'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Utility to generate initials
function getInitials(name: string) {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

const THEMES = [
  { id: 'theme-brown', color: 'bg-[#A87B5B]' },
  { id: 'theme-blue', color: 'bg-[#5B8BA8]' },
  { id: 'theme-green', color: 'bg-[#3D5A46]' },
  { id: 'theme-purple', color: 'bg-[#8A5B73]' },
  { id: 'theme-indigo', color: 'bg-[#5B5BA8]' },
];

const PACKING_STYLES = ['Light Packer', 'Prepared', 'Overpacker'];

// Validation Schema
const signupSchema = z.object({
  fullName: z.string().min(2, 'Full Name must be at least 2 characters.'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character.'),
  avatarTheme: z.string().min(1, 'Please pick an avatar theme.'),
  packingStyle: z.string().min(1, 'Please pick a packing style.'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      username: '',
      email: '',
      password: '',
      avatarTheme: 'theme-brown',
      packingStyle: 'Prepared',
    },
  });

  const currentFullName = form.watch('fullName');
  const initials = getInitials(currentFullName);

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    const supabase = createClient();

    // 1. Check if username is already taken BEFORE creating the user
    // Since we created the profiles table, we can query it directly
    const { data: existingUser, error: existingUserError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', data.username.toLowerCase())
      .single();

    if (existingUserError && existingUserError.code !== 'PGRST116') {
      toast.error('An error occurred while checking username availability.');
      setIsLoading(false);
      return;
    }

    if (existingUser) {
      toast.error('An account with this username already exists.');
      form.setError('username', { type: 'manual', message: 'Username is already taken' });
      setIsLoading(false);
      return;
    }

    // 2. Proceed with Supabase Auth Sign Up
    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          username: data.username.toLowerCase(),
          avatar_theme: data.avatarTheme,
          packing_style: data.packingStyle,
        },
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        toast.error('An account with this email already exists.');
      } else {
        toast.error(authError.message);
      }
      setIsLoading(false);
      return;
    }

    toast.success(
      'Account created successfully! Please check your email for the verification link.'
    );

    // In strict email confirmation mode, the user isn't logged in yet.
    // We send them to login with a success suggestion.
    router.push('/login?message=Check your email to confirm your account');
    setIsLoading(false);
  }

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/confirm`,
        queryParams: {
          prompt: 'consent',
        },
      },
    });

    if (error) {
      toast.error('Failed to sign up with Google');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Full Name */}
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Full Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Likhith Reddy"
                    {...field}
                    className="h-12 bg-background border-border"
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
                <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Username — Unique, used to search you
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="likhith_r"
                    {...field}
                    className="h-12 bg-background border-border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Email
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="likhith@example.com"
                    {...field}
                    className="h-12 bg-background border-border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Password
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    {...field}
                    className="h-12 bg-background border-border"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Avatar Theme Picker */}
          <FormField
            control={form.control}
            name="avatarTheme"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Pick an avatar
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-wrap gap-4"
                  >
                    {THEMES.map((theme) => (
                      <FormItem key={theme.id} className="flex items-center space-x-0 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={theme.id} className="peer sr-only" />
                        </FormControl>
                        <div
                          onClick={() => form.setValue('avatarTheme', theme.id)}
                          className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg cursor-pointer transition-all border-4 ${
                            field.value === theme.id
                              ? 'border-primary/80 scale-110 shadow-md'
                              : 'border-transparent hover:scale-105 opacity-80 hover:opacity-100'
                          } ${theme.color}`}
                        >
                          {initials || 'LR'}
                        </div>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Packing Style */}
          <FormField
            control={form.control}
            name="packingStyle"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                  Packing Style
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-wrap gap-3"
                  >
                    {PACKING_STYLES.map((style) => (
                      <FormItem key={style} className="flex items-center space-x-0 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={style} className="peer sr-only" />
                        </FormControl>
                        <FormLabel
                          className={`cursor-pointer px-4 py-2 rounded-full font-medium text-sm transition-all border ${
                            field.value === style
                              ? 'bg-foreground text-background border-foreground shadow-sm'
                              : 'bg-secondary text-secondary-foreground border-transparent hover:bg-secondary/80'
                          }`}
                        >
                          {style}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold mt-4 shadow-md hidden sm:flex"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Create Account →
          </Button>
          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold mt-4 shadow-md sm:hidden"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Create Account
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-semibold">Or</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-12 font-medium bg-background border-border/80 hover:bg-secondary/50"
        onClick={handleGoogleSignup}
        disabled={isLoading}
      >
        <svg
          className="w-5 h-5 mr-3"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </Button>
    </div>
  );
}
