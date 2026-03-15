'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Loader2, Check, X, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Validation Schema
const signupSchema = z
  .object({
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
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onChange', // Enable real-time validation for password checks
  });

  const watchPassword = form.watch('password');
  const passwordReqs = [
    { req: 'At least 8 characters', met: watchPassword.length >= 8 },
    { req: 'One lowercase letter', met: /[a-z]/.test(watchPassword) },
    { req: 'One uppercase letter', met: /[A-Z]/.test(watchPassword) },
    { req: 'One number', met: /[0-9]/.test(watchPassword) },
    { req: 'One special character', met: /[^a-zA-Z0-9]/.test(watchPassword) },
  ];

  async function onSubmit(data: SignupFormValues) {
    setIsLoading(true);
    const supabase = createClient();

    // 1. Check if username is already taken BEFORE creating the user
    // We use a securely defined Postgres function (RPC) to bypass the RLS restrictions
    // since users cannot freely query the profiles table for other users.
    const { data: isAvailable, error: lookupError } = await supabase.rpc(
      'check_username_available',
      {
        username_to_check: data.username.toLowerCase(),
      }
    );

    if (lookupError) {
      toast.error('An error occurred while checking username availability.');
      setIsLoading(false);
      return;
    }

    if (!isAvailable) {
      toast.error('An account with this username already exists.');
      form.setError('username', { type: 'manual', message: 'Username is already taken' });
      setIsLoading(false);
      return;
    }

    // 2. Proceed with Supabase Auth Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username.toLowerCase(),
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

    // Check for email enumeration protection fake success
    // When signing up with an existing email, Supabase returns a user with empty identities
    if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
      toast.error('An account with this email already exists. Please sign in instead.');
      form.setError('email', { type: 'manual', message: 'Email is already registered.' });
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
    <div className="space-y-4 sm:space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 sm:space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-5">
            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Username
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="alex_t"
                      {...field}
                      className="h-9 text-[13px] sm:text-base sm:h-12 bg-background border-border"
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
                      placeholder="name@example.com"
                      {...field}
                      className="h-9 text-[13px] sm:text-base sm:h-12 bg-background border-border"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-5">
            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Password
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        {...field}
                        className="h-9 text-[13px] sm:text-base sm:h-12 bg-background border-border pr-10"
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    Confirm Password
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••••••"
                        {...field}
                        className="h-9 text-[13px] sm:text-base sm:h-12 bg-background border-border pr-10"
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Visual Password Requirements */}
          <div className="flex flex-col space-y-1 mt-1 p-2 bg-secondary/30 rounded-lg border border-border/50">
            {passwordReqs.map((rule, idx) => (
              <div
                key={idx}
                className={`flex items-center text-[10px] font-medium uppercase tracking-wider ${
                  rule.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                }`}
              >
                {rule.met ? (
                  <Check className="w-3 h-3 mr-1.5 shrink-0" />
                ) : (
                  <X className="w-3 h-3 mr-1.5 shrink-0" />
                )}
                {rule.req}
              </div>
            ))}
          </div>

          <Button
            type="submit"
            className="w-full h-9 sm:h-12 text-[13px] sm:text-base font-semibold mt-2 sm:mt-4 shadow-md hidden sm:flex"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
            Create Account →
          </Button>
          <Button
            type="submit"
            className="w-full h-9 sm:h-12 text-[13px] sm:text-base font-semibold mt-2 sm:mt-4 shadow-md sm:hidden"
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
        className="w-full h-9 sm:h-12 text-[13px] sm:text-base font-medium bg-background border-border/80 hover:bg-secondary/50"
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
