import { AuthCard } from '@/components/features/auth/AuthCard';
import { LoginForm } from '@/components/features/auth/LoginForm';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | PackRight',
  description: 'Log in to your PackRight account.',
};

export default function LoginPage() {
  return (
    <div className="h-full max-h-full min-h-0 flex flex-col justify-center gap-6">
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <AuthCard title="Welcome back" description="Sign in to your account to continue">
          <LoginForm />
        </AuthCard>
      </div>

      <div className="text-center text-sm text-muted-foreground shrink-0 pb-4">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </div>
    </div>
  );
}
