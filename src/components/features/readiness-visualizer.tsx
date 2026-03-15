'use client';

import * as React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ReadinessVisualizerProps {
  percentage: number | null;
  className?: string;
  showLabel?: boolean;
}

export function ReadinessVisualizer({
  percentage,
  className,
  showLabel = true,
}: ReadinessVisualizerProps) {
  if (percentage === null) return null;

  // Define color based on thresholds:
  // Red < 20%
  // Yellow < 100%
  // Green = 100%
  const getProgressColor = (pct: number) => {
    if (pct < 20) return 'bg-red-500';
    if (pct < 100) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {showLabel && (
        <div className="flex justify-between items-end text-sm">
          <span className="text-muted-foreground font-medium">Group Readiness</span>
          <span
            className={cn(
              'font-bold tabular-nums',
              percentage < 20
                ? 'text-red-500'
                : percentage < 100
                  ? 'text-yellow-600'
                  : 'text-emerald-600'
            )}
          >
            {percentage}%
          </span>
        </div>
      )}
      <Progress
        value={percentage}
        aria-label="Group packing readiness"
        aria-valuetext={`${percentage}% packed`}
        className="h-2 w-full bg-secondary/50 overflow-hidden"
        indicatorClassName={cn(
          'transition-all duration-500 ease-in-out h-full w-full',
          getProgressColor(percentage)
        )}
      />
    </div>
  );
}
