import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getUserTrips } from '@/lib/supabase/trips';
import { TripGrid } from '@/components/features/trip-grid';
import { Button } from '@/components/ui/button';
import { NewTripModal } from '@/components/features/trips/new-trip-modal';
import { Plus, Compass } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const { data: trips } = await getUserTrips(supabase);
  const allTrips = trips || [];

  // Set end of today for active vs past trips comparison
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const activeTrips = allTrips.filter((t) => new Date(t.date_end) >= now);
  const pastTrips = allTrips.filter((t) => new Date(t.date_end) < now);

  return (
    <div className="flex-1 flex flex-col h-full w-full overflow-y-auto bg-background/50">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 p-6 md:p-8 lg:p-12">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif text-foreground tracking-tight">
              My Trips
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage all your packing lists and upcoming adventures.
            </p>
          </div>
          <NewTripModal>
            <Button className="gap-2 shrink-0 shadow-sm rounded-full pl-4 pr-6">
              <Plus className="h-5 w-5" />
              <span className="font-medium text-base">New Trip</span>
            </Button>
          </NewTripModal>
        </div>

        {/* Empty State */}
        {allTrips.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 mt-8 text-center border border-dashed border-border/60 rounded-3xl bg-card/30">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary shadow-sm border border-primary/20">
              <Compass className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-serif mb-3 text-foreground">No trips planned yet</h2>
            <p className="text-muted-foreground text-lg max-w-md mb-8">
              You don&apos;t have any active or past trips. Create your first trip to start
              organizing your packing lists!
            </p>
            <NewTripModal>
              <Button size="lg" className="rounded-full shadow-md text-base px-8">
                Plan Your First Trip
              </Button>
            </NewTripModal>
          </div>
        ) : (
          <div className="space-y-12 mt-4">
            {/* Active Trips Grid */}
            {activeTrips.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-serif text-foreground tracking-wide">
                    Active Trips
                  </h2>
                  <div className="h-px flex-1 bg-border/60" />
                </div>
                <TripGrid trips={activeTrips} />
              </section>
            )}

            {/* Past Trips Grid */}
            {pastTrips.length > 0 && (
              <section className="opacity-80 hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-2xl font-serif text-muted-foreground tracking-wide">
                    Past Trips
                  </h2>
                  <div className="h-px flex-1 bg-border/40" />
                </div>
                <TripGrid trips={pastTrips} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
