import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Calendar, Users } from 'lucide-react';
import { Trip } from '@/types/database.types';
import { cn } from '@/lib/utils';

interface TripCardProps {
  trip: Trip;
  percentage?: number | null;
  memberCount?: number;
}

export function TripCard({ trip, percentage = 0, memberCount = 0 }: TripCardProps) {
  const startDate = new Date(trip.date_start);
  const endDate = new Date(trip.date_end);
  const isPast = endDate < new Date();

  const displayPercentage = percentage ?? 0;

  const getProgressColor = (pct: number) => {
    if (pct < 20) return 'bg-red-500';
    if (pct < 100) return 'bg-amber-500';
    return 'bg-emerald-600';
  };

  const getPercentageColor = (pct: number) => {
    if (pct < 20) return 'text-red-500';
    if (pct < 100) return 'text-amber-600';
    return 'text-emerald-700';
  };

  return (
    <Link
      href={`/dashboard/trips/${trip.id}`}
      className="block w-full h-full aspect-[4/5] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl relative shadow-primary/5 border border-border/50 transition-all duration-300 hover:shadow-primary/10 hover:border-primary/20 bg-card group"
    >
      {/* Top Banner (Header Graphic) - 40% split across all screen sizes */}
      <div className="h-2/5 w-full bg-gradient-to-br from-primary/80 to-primary relative flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 to-transparent pointer-events-none" />
        <MapPin className="h-8 w-8 sm:h-12 sm:w-12 text-primary-foreground/90 absolute drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
      </div>

      {/* Bottom Content Area - 60% split across all screen sizes */}
      <div className="h-3/5 w-full bg-card pt-4 px-4 pb-8 sm:pt-6 sm:px-6 sm:pb-12 flex flex-col justify-between overflow-hidden relative">
        <div className="space-y-2 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-foreground leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
              {trip.title}
            </h3>
            <span
              className={cn(
                'shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold tracking-widest uppercase font-sans border shadow-sm',
                isPast
                  ? 'bg-muted/50 text-muted-foreground border-border'
                  : 'bg-emerald-500 text-white border-emerald-600'
              )}
            >
              {isPast ? 'Past' : 'Active'}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:gap-3 text-[11px] sm:text-sm font-medium text-muted-foreground/70">
            {/* Metadata Row - Airy and Horizontal */}
            <div className="flex items-center gap-x-3 sm:gap-x-5 flex-wrap">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary/40" />
                <span className="whitespace-nowrap font-sans tracking-tight">
                  {format(startDate, 'MMM d')} – {format(endDate, 'MMM d')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary/40" />
                <span className="whitespace-nowrap font-sans tracking-tight">
                  {memberCount || 1} {memberCount === 1 ? 'member' : 'members'}
                </span>
              </div>
            </div>

            {/* Destination - Inline or Subtle */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary/40" />
              <span className="truncate font-sans tracking-tight">{trip.destination}</span>
            </div>
          </div>
        </div>

        {/* Integrated Progress Section - Precise Mock Scaling */}
        <div className="mt-auto pt-2 sm:pt-4">
          <div className="flex justify-between items-end mb-1.5 sm:mb-2 text-[10px] sm:text-xs">
            <span className="font-bold tracking-wider uppercase text-muted-foreground/50 font-sans">
              Group Readiness
            </span>
            <span
              className={cn(
                'font-bold tabular-nums font-sans',
                getPercentageColor(displayPercentage)
              )}
            >
              {displayPercentage}%
            </span>
          </div>
          <div className="h-1.5 sm:h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1)',
                getProgressColor(displayPercentage)
              )}
              style={{ width: `${displayPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
