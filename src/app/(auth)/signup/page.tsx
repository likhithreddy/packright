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
    <div className="flex flex-col gap-6">
      <AuthCard title="Create an account" description="Enter your details below to get started">
        <SignupForm />
      </AuthCard>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
