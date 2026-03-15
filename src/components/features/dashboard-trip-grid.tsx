'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TripCard } from './trip-card';
import { Trip } from '@/types/database.types';
import { createClient } from '@/lib/supabase/client';

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
  const [memberCounts, setMemberCounts] = React.useState<Record<string, number>>({});
  const supabase = React.useMemo(() => createClient(), []);

  const fetchData = React.useCallback(async () => {
    // Fetch readiness
    const { data: readiness, error: readinessError } = await supabase
      .from('trip_readiness')
      .select('trip_id, percentage');

    if (readinessError) {
      console.error('Error fetching readiness:', readinessError);
    } else {
      const mapping = (readiness || []).reduce(
        (acc, curr) => ({
          ...acc,
          [curr.trip_id]: curr.percentage,
        }),
        {}
      );
      setReadinessData(mapping);
    }

    // Fetch member counts
    const { data: counts, error: countsError } = await supabase
      .from('trip_members')
      .select('trip_id');

    if (countsError) {
      console.error('Error fetching member counts:', countsError);
    } else {
      const mapping = (counts || []).reduce((acc: Record<string, number>, curr) => {
        acc[curr.trip_id] = (acc[curr.trip_id] || 0) + 1;
        return acc;
      }, {});
      setMemberCounts(mapping);
    }
  }, [supabase]);

  React.useEffect(() => {
    fetchData();

    // Subscribe to item_claims changes to trigger recalculation of readiness
    const claimsChannel = supabase
      .channel('dashboard-readiness')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_claims' }, () => {
        fetchData();
      })
      .subscribe();

    // Subscribe to trip_members changes to update counts
    const membersChannel = supabase
      .channel('dashboard-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_members' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(claimsChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [supabase, fetchData]);

  return (
    <motion.div
      variants={container}
      initial="show"
      className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 auto-rows-max"
    >
      {initialTrips.map((trip) => (
        <motion.div key={trip.id} variants={itemVariants} className="flex flex-col gap-2">
          <TripCard
            trip={trip}
            percentage={readinessData[trip.id] ?? null}
            memberCount={memberCounts[trip.id] ?? 1}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
