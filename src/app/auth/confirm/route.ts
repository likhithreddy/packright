import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Log OAuth errors for debugging
  if (error || errorDescription) {
    console.error('[OAuth Callback] Error:', {
      error,
      description: errorDescription,
      url: request.url,
    });
  }

  const supabase = await createClient();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      redirect(next);
    } else {
      console.error('[OAuth Callback] Exchange code error:', exchangeError);
      redirect('/login?message=Failed to authenticate with Google');
    }
  }

  if (token_hash && type) {
    const { error: otpError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!otpError) {
      // For password reset, we want to redirect to the reset-password page
      if (type === 'recovery') {
        redirect('/reset-password');
      }

      // otherwise, successfully confirmed email! redirect to dashboard
      redirect(next);
    } else {
      console.error('[OAuth Callback] OTP error:', otpError);
    }
  }

  // return the user to an error page with some instructions
  redirect('/login?message=Could not verify email or authenticate');
}
