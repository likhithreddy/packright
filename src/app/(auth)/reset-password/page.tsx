import { AuthCard } from '@/components/features/auth/AuthCard';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Update Password | PackRight',
  description: 'Set a new password for your PackRight account.',
};

export default function ResetPasswordPage() {
  return (
    <div className="h-full max-h-full min-h-0 flex flex-col justify-center gap-6">
      <div className="flex-1 min-h-0 flex flex-col justify-center">
        <AuthCard
          title="Create New Password"
          description="Please enter and confirm your new password below."
        >
          <ResetPasswordForm />
        </AuthCard>
      </div>
    </div>
  );
}
