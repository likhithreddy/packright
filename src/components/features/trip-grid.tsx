'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TripCard } from './trip-card';
import { Trip } from '@/types/database.types';

interface TripGridProps {
  trips: Trip[];
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

const item = {
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

export function TripGrid({ trips }: TripGridProps) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 auto-rows-max"
    >
      {trips.map((trip) => (
        <motion.div key={trip.id} variants={item}>
          <TripCard trip={trip} />
        </motion.div>
      ))}
    </motion.div>
  );
}
