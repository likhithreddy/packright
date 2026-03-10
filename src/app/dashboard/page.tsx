import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const signOutAction = async () => {
    'use server';
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md w-full bg-card p-8 rounded-xl border border-border shadow-sm">
        <h1 className="text-3xl font-serif font-bold text-foreground">Welcome to your Dashboard</h1>
        <div className="space-y-2">
          <p className="text-muted-foreground">You have successfully authenticated via Google!</p>
          <div className="bg-secondary/20 p-4 rounded-lg border border-border/50 text-sm text-left overflow-x-auto">
            <span className="font-mono text-primary font-medium">{user.email}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          The full interactive Kanban board will be implemented here next.
        </p>

        <form action={signOutAction}>
          <Button type="submit" variant="outline" className="w-full mt-4 h-12">
            Sign Out
          </Button>
        </form>
      </div>
    </div>
  );
}
