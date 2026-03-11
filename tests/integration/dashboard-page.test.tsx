import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardPage from '@/app/dashboard/page';
import * as tripsLib from '@/lib/supabase/trips';
import * as serverSupabaseLib from '@/lib/supabase/server';
import { Trip } from '@/types/database.types';

// Mock dependencies
jest.mock('../../src/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('../../src/lib/supabase/trips', () => ({
  getUserTrips: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

const mockTrips: Trip[] = [
  {
    id: 'trip-1',
    created_by: 'user-1',
    title: 'Active Trip to London',
    destination: 'London, UK',
    date_start: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
    date_end: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: 'trip-2',
    created_by: 'user-1',
    title: 'Past Trip to Berlin',
    destination: 'Berlin, Germany',
    date_start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
    date_end: new Date(new Date().setDate(new Date().getDate() - 25)).toISOString(),
    created_at: new Date().toISOString(),
  },
];

describe('DashboardPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock user authentication
    (serverSupabaseLib.createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
    });
  });

  it('renders trips correctly categorized into active and past', async () => {
    (tripsLib.getUserTrips as jest.Mock).mockResolvedValue({
      data: mockTrips,
      error: null,
    });

    const DashboardUI = await DashboardPage();
    render(DashboardUI as React.ReactElement); // Awaited component for RTL

    expect(screen.getByText('My Trips')).toBeInTheDocument();

    // Check if both Active and Past trip sections are rendered
    expect(screen.getByText('Active Trips')).toBeInTheDocument();
    expect(screen.getByText('Past Trips')).toBeInTheDocument();

    // Check if the individual trips are rendered
    expect(screen.getByText('Active Trip to London')).toBeInTheDocument();
    expect(screen.getByText('Past Trip to Berlin')).toBeInTheDocument();
  });

  it('renders empty state when there are no trips', async () => {
    (tripsLib.getUserTrips as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    });

    const DashboardUI = await DashboardPage();
    render(DashboardUI as React.ReactElement);

    expect(screen.getByText('No trips planned yet')).toBeInTheDocument();
    expect(screen.getByText('Plan Your First Trip')).toBeInTheDocument();

    // Sections should not exist
    expect(screen.queryByText('Active Trips')).not.toBeInTheDocument();
    expect(screen.queryByText('Past Trips')).not.toBeInTheDocument();
  });

  it('redirects to /login if user is not authenticated', async () => {
    // Mock unauthorized user
    (serverSupabaseLib.createClient as jest.Mock).mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: null },
          error: new Error('Unauthorized'),
        }),
      },
    });

    const { redirect } = require('next/navigation');

    await DashboardPage();
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('correctly categorizes a trip ending exactly at the end of today as active', async () => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const boundaryTrip: Trip = {
      ...mockTrips[0],
      id: 'boundary-trip',
      date_end: endOfToday.toISOString(),
    };

    (tripsLib.getUserTrips as jest.Mock).mockResolvedValue({
      data: [boundaryTrip],
      error: null,
    });

    const DashboardUI = await DashboardPage();
    render(DashboardUI as React.ReactElement);

    expect(screen.getByText('Active Trips')).toBeInTheDocument();
  });
});
