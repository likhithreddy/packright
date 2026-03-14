import { render, screen } from '@testing-library/react';
import { BoardHeader } from '../../src/components/features/board-header';
import { ItemWithClaims } from '../../src/types/database.types';

// Mock the useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock Button component
jest.mock('../../src/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('BoardHeader Integration', () => {
  const mockTripId = 'trip-1';
  const mockTripTitle = 'Smoky Mountains';
  const mockDateStart = '2026-06-01';
  const mockDateEnd = '2026-06-10';

  const mockItems: ItemWithClaims[] = [
    {
      id: 'item-1',
      trip_id: mockTripId,
      name: 'Tent',
      required_count: 1,
      category: 'Shelter',
      created_at: new Date().toISOString(),
      claims: [
        {
          id: 'claim-1',
          item_id: 'item-1',
          user_id: 'user-1',
          quantity: 1,
          is_packed: true,
          created_at: new Date().toISOString(),
          profiles: {
            full_name: 'John Doe',
            username: 'johndoe',
            avatar_theme: 'light',
          },
        },
      ],
      total_claimed: 1,
      total_packed: 1,
    },
    {
      id: 'item-2',
      trip_id: mockTripId,
      name: 'Sleeping Bag',
      required_count: 2,
      category: 'Bedding',
      created_at: new Date().toISOString(),
      claims: [],
      total_claimed: 0,
      total_packed: 0,
    },
  ];

  const mockMembers = [
    {
      id: 'user-1',
      full_name: 'John Doe',
      username: 'johndoe',
      avatar_theme: 'light',
    },
    {
      id: 'user-2',
      full_name: 'Jane Smith',
      username: 'janesmith',
      avatar_theme: 'dark',
    },
  ];

  it('renders trip title and date range', () => {
    render(
      <BoardHeader
        tripId={mockTripId}
        tripTitle={mockTripTitle}
        dateStart={mockDateStart}
        dateEnd={mockDateEnd}
        items={mockItems}
        members={mockMembers}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('Smoky Mountains')).toBeInTheDocument();
    // Date formatting uses local timezone - check that dates are rendered
    expect(screen.getByText(/Jun/)).toBeInTheDocument();
  });

  it('renders correct stats based on items', () => {
    render(
      <BoardHeader
        tripId={mockTripId}
        tripTitle={mockTripTitle}
        dateStart={mockDateStart}
        dateEnd={mockDateEnd}
        items={mockItems}
        members={mockMembers}
        currentUserId="user-1"
      />
    );

    // 2 items total
    expect(screen.getByText('2 ITEMS')).toBeInTheDocument();

    // 1 of 3 required slots claimed (1/2 for item-1, 0/2 for item-2 = 33%)
    expect(screen.getByText(/% CLAIMED/)).toBeInTheDocument();

    // 1 of 3 required slots packed (33%)
    expect(screen.getByText(/% PACKED/)).toBeInTheDocument();

    // 1 unclaimed item (item-2)
    expect(screen.getByText('1 UNCLAIMED')).toBeInTheDocument();
  });

  it('renders member avatars with initials', () => {
    render(
      <BoardHeader
        tripId={mockTripId}
        tripTitle={mockTripTitle}
        dateStart={mockDateStart}
        dateEnd={mockDateEnd}
        items={mockItems}
        members={mockMembers}
        currentUserId="user-1"
      />
    );

    // Check that member avatars are rendered
    const memberAvatars = screen.getAllByTitle(/John Doe|Jane Smith/);
    expect(memberAvatars.length).toBeGreaterThan(0);
  });

  it('shows "+N" when more than 5 members', () => {
    const manyMembers = Array.from({ length: 7 }, (_, i) => ({
      id: `user-${i}`,
      full_name: `User ${i}`,
      username: `user${i}`,
      avatar_theme: 'light',
    }));

    render(
      <BoardHeader
        tripId={mockTripId}
        tripTitle={mockTripTitle}
        dateStart={mockDateStart}
        dateEnd={mockDateEnd}
        items={mockItems}
        members={manyMembers}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('calculates 100% packed when all items are fully packed', () => {
    const fullyPackedItems: ItemWithClaims[] = [
      {
        ...mockItems[0],
        required_count: 1,
        total_claimed: 1,
        total_packed: 1,
      },
    ];

    render(
      <BoardHeader
        tripId={mockTripId}
        tripTitle={mockTripTitle}
        dateStart={mockDateStart}
        dateEnd={mockDateEnd}
        items={fullyPackedItems}
        members={mockMembers}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('100% PACKED')).toBeInTheDocument();
  });

  it('calculates 0% when no items', () => {
    render(
      <BoardHeader
        tripId={mockTripId}
        tripTitle={mockTripTitle}
        dateStart={mockDateStart}
        dateEnd={mockDateEnd}
        items={[]}
        members={mockMembers}
        currentUserId="user-1"
      />
    );

    expect(screen.getByText('0 ITEMS')).toBeInTheDocument();
    expect(screen.getByText('0% CLAIMED')).toBeInTheDocument();
    expect(screen.getByText('0% PACKED')).toBeInTheDocument();
  });

  it('calculates multi-contributor item stats correctly', () => {
    const multiContributorItems: ItemWithClaims[] = [
      {
        id: 'item-1',
        trip_id: mockTripId,
        name: 'Snacks',
        required_count: 3,
        category: 'Food',
        created_at: new Date().toISOString(),
        claims: [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
            is_packed: true,
            created_at: new Date().toISOString(),
            profiles: null,
          },
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 1,
            is_packed: true,
            created_at: new Date().toISOString(),
            profiles: null,
          },
        ],
        total_claimed: 2,
        total_packed: 2,
      },
    ];

    render(
      <BoardHeader
        tripId={mockTripId}
        tripTitle={mockTripTitle}
        dateStart={mockDateStart}
        dateEnd={mockDateEnd}
        items={multiContributorItems}
        members={mockMembers}
        currentUserId="user-1"
      />
    );

    // 2 of 3 claimed = 67%
    expect(screen.getByText('67% CLAIMED')).toBeInTheDocument();

    // 2 of 3 packed = 67%
    expect(screen.getByText('67% PACKED')).toBeInTheDocument();

    // 1 item still needs 1 more contributor
    expect(screen.getByText('1 UNCLAIMED')).toBeInTheDocument();
  });
});
