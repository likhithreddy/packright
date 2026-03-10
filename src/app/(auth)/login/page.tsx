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
    <div className="flex flex-col gap-6">
      <AuthCard title="Welcome back" description="Sign in to your account to continue">
        <LoginForm />
      </AuthCard>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </div>
    </div>
  );
}
