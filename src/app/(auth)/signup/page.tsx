import { AuthCard } from '@/components/features/auth/AuthCard';
import { SignupForm } from '@/components/features/auth/SignupForm';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create an Account | PackRight',
  description: 'Join PackRight to plan your next group trip.',
};

export default function SignupPage() {
  return (
    <div className="h-full max-h-full min-h-0 flex flex-col justify-center gap-6">
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <AuthCard title="Create an account" description="Enter your details below to get started">
          <SignupForm />
        </AuthCard>
      </div>

      <div className="text-center text-sm text-muted-foreground shrink-0 pb-4">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
