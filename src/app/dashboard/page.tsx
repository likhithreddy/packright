import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return (
    <div className="flex items-center justify-center p-8 h-full">
      <div className="text-center space-y-6 max-w-md w-full bg-card p-8 rounded-xl border border-border shadow-sm">
        <h1 className="text-3xl font-serif font-bold text-foreground">Welcome to your Dashboard</h1>
        <p className="text-muted-foreground">You have successfully authenticated!</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          The full interactive Kanban board will be implemented here next.
        </p>
      </div>
    </div>
  );
}
