import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SecuritySettingsForm from '@/components/features/profile/security-settings-form';

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 min-h-0">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Account Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage your account security and sign-in methods.
            </p>
          </div>

          {/* Security Form */}
          <SecuritySettingsForm
            email={user.email || ''}
            providers={user.app_metadata?.providers || []}
          />
        </div>
      </div>
    </div>
  );
}
