import { AuthCard } from '@/components/features/auth/AuthCard';
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | PackRight',
  description: 'Reset your PackRight password.',
};

export default function ForgotPasswordPage() {
  return (
    <div className="h-full max-h-full min-h-0 flex flex-col justify-center gap-6">
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <AuthCard
          title="Reset Password"
          description="Enter your email to receive a password reset link."
        >
          <ForgotPasswordForm />
        </AuthCard>
      </div>
    </div>
  );
}
