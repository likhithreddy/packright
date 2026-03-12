import { render, screen } from '@testing-library/react';
import { TripGrid } from '@/components/features/trip-grid';
import { Trip } from '@/types/database.types';

// Mock TripCard to focus on TripGrid logic
jest.mock('../../src/components/features/trip-card', () => ({
  TripCard: ({ trip }: { trip: Trip }) => <div data-testid="trip-card">{trip.title}</div>,
}));

describe('TripGrid Integration', () => {
  const mockTrips: Trip[] = [
    {
      id: '1',
      title: 'Summer Trip',
      destination: 'Hawaii',
      date_start: '2026-06-01',
      date_end: '2026-06-10',
      created_by: 'u1',
      is_archived: false,
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Winter Trip',
      destination: 'Aspen',
      date_start: '2026-12-01',
      date_end: '2026-12-10',
      created_by: 'u1',
      is_archived: false,
      created_at: new Date().toISOString(),
    },
  ];

  it('renders a list of trip cards', () => {
    render(<TripGrid trips={mockTrips} />);

    const cards = screen.getAllByTestId('trip-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('Summer Trip')).toBeInTheDocument();
    expect(screen.getByText('Winter Trip')).toBeInTheDocument();
  });

  it('renders nothing when trips array is empty', () => {
    const { container } = render(<TripGrid trips={[]} />);
    expect(container.firstChild).toBeEmptyDOMElement;
  });
});
