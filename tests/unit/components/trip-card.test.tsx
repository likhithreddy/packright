import React from 'react';
import { render, screen } from '@testing-library/react';
import { TripCard } from '@/components/features/trip-card';
import { Trip } from '@/types/database.types';

const mockActiveTrip: Trip = {
  id: 'trip-1',
  created_by: 'user-1',
  title: 'Summer Vacation in Paris',
  destination: 'Paris, France',
  date_start: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
  date_end: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
  created_at: new Date().toISOString(),
};

const mockPastTrip: Trip = {
  id: 'trip-2',
  created_by: 'user-1',
  title: 'Winter Ski Trip',
  destination: 'Aspen, Colorado',
  date_start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
  date_end: new Date(new Date().setDate(new Date().getDate() - 25)).toISOString(),
  created_at: new Date().toISOString(),
};

describe('TripCard Component', () => {
  it('renders active trip details correctly', () => {
    render(<TripCard trip={mockActiveTrip} />);

    expect(screen.getByText('Summer Vacation in Paris')).toBeInTheDocument();
    expect(screen.getByText('Paris, France')).toBeInTheDocument();
    expect(screen.getByText('Active Trip')).toBeInTheDocument();
  });

  it('renders past trip details correctly', () => {
    render(<TripCard trip={mockPastTrip} />);

    expect(screen.getByText('Winter Ski Trip')).toBeInTheDocument();
    expect(screen.getByText('Aspen, Colorado')).toBeInTheDocument();
    expect(screen.getByText('Past Trip')).toBeInTheDocument();
  });

  it('links to the correct trip ID', () => {
    render(<TripCard trip={mockActiveTrip} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/dashboard/trips/trip-1');
  });
});
