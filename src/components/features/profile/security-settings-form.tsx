'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Shield, KeyRound, Eye, EyeOff } from 'lucide-react';

// ISSUE-#36: Password validation schema (same as signup)
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

// Schema for Email/Password users who need to provide their current password
const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

// Schema for OAuth users who are setting a password for the first time
const setPasswordSchema = z
  .object({
    new_password: passwordSchema,
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

interface SecuritySettingsFormProps {
  email: string;
  providers: string[];
}

export default function SecuritySettingsForm({ email, providers }: SecuritySettingsFormProps) {
  // ISSUE-#36: Determine if the user has a password identity
  const hasPasswordIdentity = providers.includes('email');
  const hasOAuthIdentity = providers.some((p) => p !== 'email');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
      {/* Account Information */}
      <Card className="p-6 border-border/50 lg:col-span-2">
        <h3 className="text-lg font-serif font-semibold text-foreground mb-4">
          Account Information
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium">{email}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sign-in Methods</span>
            <div className="flex gap-2">
              {hasPasswordIdentity && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  Email/Password
                </span>
              )}
              {hasOAuthIdentity && (
                <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  Google
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Password Section - Conditional UI */}
      <Card className="p-6 border-border/50 lg:col-span-3">
        {hasPasswordIdentity ? <ChangePasswordForm email={email} /> : <SetPasswordForm />}
      </Card>
    </div>
  );
}

// ISSUE-#36: Form for Email/Password users (requires current password)
function ChangePasswordForm({ email }: { email: string }) {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  const handleSubmit = async (values: ChangePasswordFormValues) => {
    setIsSubmitting(true);

    try {
      // Verify current password by attempting a sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: values.current_password,
      });

      if (signInError) {
        toast.error('Incorrect current password.');
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.new_password,
      });

      if (updateError) {
        toast.error('Failed to update password. Please try again.');
        return;
      }

      toast.success('Password changed successfully!');
      form.reset();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-serif font-semibold text-foreground">Change Password</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Enter your current password and choose a new one.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="current_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="Enter current password"
                      className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle current password visibility"
                  >
                    {showCurrentPassword ? (
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

          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter new password"
                      className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle confirm password visibility"
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

          <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Change Password'
            )}
          </Button>
        </form>
      </Form>
    </>
  );
}

// ISSUE-#36: Form for OAuth users setting a password for the first time
function SetPasswordForm() {
  const supabase = createClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<SetPasswordFormValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: {
      new_password: '',
      confirm_password: '',
    },
  });

  const handleSubmit = async (values: SetPasswordFormValues) => {
    setIsSubmitting(true);

    try {
      // ISSUE-#36: Directly update to set a password (no current password needed for OAuth-only users)
      const { error } = await supabase.auth.updateUser({
        password: values.new_password,
      });

      if (error) {
        toast.error('Failed to set password. Please try again.');
        return;
      }

      toast.success('Password set successfully! You can now sign in with your email and password.');
      form.reset();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-serif font-semibold text-foreground">Set Password</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        You signed in with Google. Set a password to also sign in with your email and password.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="new_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter your new password"
                      className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle new password visibility"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <div className="relative">
                  <FormControl>
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your new password"
                      className="h-12 bg-secondary/30 border-border/50 focus-visible:ring-0 focus:ring-0 focus:border-primary/50 pr-10"
                      {...field}
                    />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle confirm password visibility"
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

          <div className="bg-secondary/30 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground/70">Password must contain:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
              <li>One special character</li>
            </ul>
          </div>

          <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting Password...
              </>
            ) : (
              'Set Password'
            )}
          </Button>
        </form>
      </Form>
    </>
  );
}
