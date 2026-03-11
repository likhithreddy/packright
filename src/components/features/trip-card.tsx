import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { Trip } from '@/types/database.types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

interface TripCardProps {
  trip: Trip;
}

export function TripCard({ trip }: TripCardProps) {
  const startDate = new Date(trip.date_start);
  const endDate = new Date(trip.date_end);
  const isPast = endDate < new Date();

  return (
    <Link
      href={`/dashboard/trips/${trip.id}`}
      className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="h-full flex flex-col transition-all duration-200 hover:shadow-md hover:border-primary/20 group cursor-pointer relative overflow-hidden">
        {/* Subtle top border accent for active trips */}
        {!isPast && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/60 to-primary/40" />
        )}

        <CardHeader className="pb-4">
          <div className="flex justify-between items-start gap-4">
            <CardTitle className="text-xl font-serif line-clamp-1 group-hover:text-primary transition-colors">
              {trip.title}
            </CardTitle>
            <div className="bg-primary/5 text-primary rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow flex flex-col gap-3">
          <div className="flex items-center text-sm text-foreground/80">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            <span className="line-clamp-1">{trip.destination}</span>
          </div>

          <div className="flex items-center text-sm text-foreground/80">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground shrink-0" />
            <span>
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </span>
          </div>
        </CardContent>

        <CardFooter className="pt-4 border-t border-border/50 bg-muted/20 mt-auto">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {isPast ? 'Past Trip' : 'Active Trip'}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
