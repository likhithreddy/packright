import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripCard } from '@/components/features/trip-card';
import { Trip } from '@/types/database.types';

// Force UTC for consistent date formatting across environments
process.env.TZ = 'UTC';

const mockActiveTrip: Trip = {
  id: 'trip-1',
  created_by: 'user-1',
  title: 'Summer Vacation in Paris',
  destination: 'Paris, France',
  date_start: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
  date_end: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
  is_archived: false,
  created_at: new Date().toISOString(),
};

const mockPastTrip: Trip = {
  id: 'trip-2',
  created_by: 'user-1',
  title: 'Winter Ski Trip',
  destination: 'Aspen, Colorado',
  date_start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
  date_end: new Date(new Date().setDate(new Date().getDate() - 25)).toISOString(),
  is_archived: false,
  created_at: new Date().toISOString(),
};

describe('TripCard Component', () => {
  it('renders active trip details correctly', () => {
    render(<TripCard trip={mockActiveTrip} memberCount={2} />);

    expect(screen.getByText('Summer Vacation in Paris')).toBeInTheDocument();
    expect(screen.getByText('Paris, France')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
    // Should render 0% by default for uniformity
    expect(screen.getByText('Group Readiness')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders past trip details correctly', () => {
    render(<TripCard trip={mockPastTrip} memberCount={1} />);

    expect(screen.getByText('Winter Ski Trip')).toBeInTheDocument();
    expect(screen.getByText('Aspen, Colorado')).toBeInTheDocument();
    expect(screen.getByText('Past')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();
    // Should render 0% by default for uniformity
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders readiness progress when percentage is provided', () => {
    render(<TripCard trip={mockActiveTrip} percentage={45} />);
    expect(screen.getByText('Group Readiness')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('links to the correct trip ID', () => {
    render(<TripCard trip={mockActiveTrip} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/trips/trip-1');
  });

  it('formats dates correctly for same-month trips', () => {
    const sameMonthTrip: Trip = {
      ...mockActiveTrip,
      date_start: '2026-05-10T00:00:00Z',
      date_end: '2026-05-15T00:00:00Z',
    };
    const { format } = require('date-fns');
    const startStr = format(new Date(sameMonthTrip.date_start), 'MMM d');
    const endStr = format(new Date(sameMonthTrip.date_end), 'MMM d');

    render(<TripCard trip={sameMonthTrip} />);
    expect(screen.getByText(`${startStr} – ${endStr}`)).toBeInTheDocument();
  });

  it('formats dates correctly for trips spanning different months', () => {
    const spanningTrip: Trip = {
      ...mockActiveTrip,
      date_start: '2026-05-30T00:00:00Z',
      date_end: '2026-06-05T00:00:00Z',
    };
    const { format } = require('date-fns');
    const startStr = format(new Date(spanningTrip.date_start), 'MMM d');
    const endStr = format(new Date(spanningTrip.date_end), 'MMM d');

    render(<TripCard trip={spanningTrip} />);
    expect(screen.getByText(`${startStr} – ${endStr}`)).toBeInTheDocument();
  });

  it('has appropriate accessibility labels', () => {
    render(<TripCard trip={mockActiveTrip} />);
    const link = screen.getByRole('link');
    // The link should contain the trip title which acts as its primary label
    expect(link).toHaveTextContent('Summer Vacation in Paris');

    // Check for MapPin and Calendar icons (they should be hidden from screen readers if decorative,
    // but the text beside them matters)
    expect(screen.getByText('Paris, France')).toBeInTheDocument();
  });
});
