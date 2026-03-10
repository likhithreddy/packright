import { AuthCard } from '@/components/features/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | PackRight',
  description: 'Reset your PackRight password.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuthCard
        title="Reset Password"
        description="Enter your email to receive a password reset link."
      >
        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}
