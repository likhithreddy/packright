'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TripCard } from './trip-card';
import { Trip } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';
import { ReadinessVisualizer } from './readiness-visualizer';

interface DashboardTripGridProps {
  initialTrips: Trip[];
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    } as const,
  },
};

export function DashboardTripGrid({ initialTrips }: DashboardTripGridProps) {
  const [readinessData, setReadinessData] = React.useState<Record<string, number | null>>({});
  const supabase = React.useMemo(() => createClient(), []);

  const fetchReadiness = React.useCallback(async () => {
    const { data, error } = await supabase.from('trip_readiness').select('trip_id, percentage');

    if (error) {
      console.error('Error fetching readiness:', error);
      return;
    }

    const mapping = (data || []).reduce(
      (acc, curr) => ({
        ...acc,
        [curr.trip_id]: curr.percentage,
      }),
      {}
    );

    setReadinessData(mapping);
  }, [supabase]);

  React.useEffect(() => {
    fetchReadiness();

    // Subscribe to item_claims changes to trigger recalculation
    const channel = supabase
      .channel('dashboard-readiness')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_claims' }, () => {
        fetchReadiness();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchReadiness]);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-max"
    >
      {initialTrips.map((trip) => (
        <motion.div key={trip.id} variants={itemVariants} className="flex flex-col gap-2">
          <TripCard trip={trip} />
          <div className="px-1">
            <ReadinessVisualizer
              percentage={readinessData[trip.id] ?? null}
              showLabel={false}
              className="h-1.5"
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
