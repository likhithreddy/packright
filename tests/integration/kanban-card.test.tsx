import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanCard } from '../../src/components/features/kanban-card';
import { ItemWithClaims, KanbanColumn } from '../../src/types/database.types';
import { DndContext } from '@dnd-kit/core';

// Mock dnd-kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDraggable: () => ({
    attributes: { 'data-dnd': 'true' },
    listeners: { onMouseDown: jest.fn(), onTouchStart: jest.fn() },
    setNodeRef: jest.fn(),
    transform: null,
    isDragging: false,
  }),
}));
jest.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: { 'data-dnd': 'true' },
    listeners: { onMouseDown: jest.fn(), onTouchStart: jest.fn() },
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));
jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
  useLatestValue: (value: unknown) => value,
}));

// Mock UI components
jest.mock('../../src/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

// Mock utils
jest.mock('../../src/lib/utils', () => ({
  getUserDisplayName: (profile: any, userId: string) =>
    profile?.full_name || profile?.username || userId,
  getUserInitials: (profile: any, userId: string) => {
    const name = profile?.full_name || profile?.username || userId;
    return name.substring(0, 2).toUpperCase();
  },
}));

// Mock category icons
jest.mock('../../src/lib/utils/category-icons', () => ({
  getCategoryIcon: () => {
    return function CategoryIcon() {
      return <div data-testid="category-icon">Icon</div>;
    };
  },
}));

describe('KanbanCard Integration', () => {
  const createMockItem = (overrides?: Partial<ItemWithClaims>): ItemWithClaims => ({
    id: 'item-1',
    trip_id: 'trip-1',
    name: 'Test Item',
    required_count: 2,
    category: 'Essentials',
    created_at: new Date().toISOString(),
    claims: [],
    total_claimed: 0,
    total_packed: 0,
    ...overrides,
  });

  const defaultProps = {
    item: createMockItem(),
    column: 'unassigned' as KanbanColumn,
    currentUserId: 'user-1',
    isAdmin: false,
    isDragDisabled: false,
    onClaim: jest.fn(),
    onMarkPacked: jest.fn(),
    onUnclaim: jest.fn(),
    onEditItem: jest.fn(),
    onDeleteItem: jest.fn(),
  };

  const renderWithDnd = (props = defaultProps) => {
    return render(
      <DndContext>
        <KanbanCard {...props} />
      </DndContext>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders item name', () => {
      renderWithDnd();
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('renders category icon', () => {
      renderWithDnd();
      expect(screen.getByTestId('category-icon')).toBeInTheDocument();
    });

    it('renders quantity label', () => {
      renderWithDnd();
      expect(screen.getByText('Qty')).toBeInTheDocument();
    });

    it('renders quantity count', () => {
      renderWithDnd({ ...defaultProps, item: createMockItem({ required_count: 5 }) });
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('has drag attributes', () => {
      const { container } = renderWithDnd();
      const card = container.querySelector('[data-dnd="true"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Unassigned Column', () => {
    it('shows Claim button for any user', () => {
      renderWithDnd({ ...defaultProps, column: 'unassigned' });
      expect(screen.getByText('Claim')).toBeInTheDocument();
    });

    it('shows Edit and Delete buttons for admin', () => {
      renderWithDnd({ ...defaultProps, column: 'unassigned', isAdmin: true });
      expect(screen.getByTitle('Edit item')).toBeInTheDocument();
      expect(screen.getByTitle('Delete item')).toBeInTheDocument();
    });

    it('does not show Edit and Delete buttons for non-admin', () => {
      renderWithDnd({ ...defaultProps, column: 'unassigned', isAdmin: false });
      expect(screen.queryByTitle('Edit item')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Delete item')).not.toBeInTheDocument();
    });

    it('calls onClaim when Claim button is clicked', async () => {
      const onClaim = jest.fn();
      renderWithDnd({ ...defaultProps, column: 'unassigned', onClaim });

      const claimButton = screen.getByText('Claim');
      await userEvent.click(claimButton);

      expect(onClaim).toHaveBeenCalledWith('item-1');
    });

    it('calls onEditItem when Edit button is clicked', async () => {
      const onEditItem = jest.fn();
      renderWithDnd({ ...defaultProps, column: 'unassigned', isAdmin: true, onEditItem });

      const editButton = screen.getByTitle('Edit item');
      await userEvent.click(editButton);

      expect(onEditItem).toHaveBeenCalledWith('item-1');
    });

    it('calls onDeleteItem when Delete button is clicked', async () => {
      const onDeleteItem = jest.fn();
      renderWithDnd({ ...defaultProps, column: 'unassigned', isAdmin: true, onDeleteItem });

      const deleteButton = screen.getByTitle('Delete item');
      await userEvent.click(deleteButton);

      expect(onDeleteItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('Claimed Column', () => {
    const userClaimedItem = createMockItem({
      id: 'item-1',
      claims: [
        {
          id: 'claim-1',
          item_id: 'item-1',
          user_id: 'user-1',
          quantity: 1,
          is_packed: false,
          created_at: new Date().toISOString(),
        },
      ],
    });

    it('shows Unclaim and Mark Packed buttons when user has claim', () => {
      renderWithDnd({ ...defaultProps, item: userClaimedItem, column: 'claimed' });
      expect(screen.getByText('Unclaim')).toBeInTheDocument();
      expect(screen.getByText('Mark Packed')).toBeInTheDocument();
    });

    it('does not show action buttons when user does not have claim', () => {
      const otherClaimedItem = createMockItem({
        claims: [
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      renderWithDnd({ ...defaultProps, item: otherClaimedItem, column: 'claimed' });
      expect(screen.queryByText('Unclaim')).not.toBeInTheDocument();
      expect(screen.queryByText('Mark Packed')).not.toBeInTheDocument();
    });

    it('calls onUnclaim when Unclaim button is clicked', async () => {
      const onUnclaim = jest.fn();
      renderWithDnd({
        ...defaultProps,
        item: userClaimedItem,
        column: 'claimed',
        onUnclaim,
      });

      const unclaimButton = screen.getByText('Unclaim');
      await userEvent.click(unclaimButton);

      expect(onUnclaim).toHaveBeenCalledWith('claim-1', 1);
    });

    it('calls onMarkPacked when Mark Packed button is clicked', async () => {
      const onMarkPacked = jest.fn();
      renderWithDnd({
        ...defaultProps,
        item: userClaimedItem,
        column: 'claimed',
        onMarkPacked,
      });

      const markPackedButton = screen.getByText('Mark Packed');
      await userEvent.click(markPackedButton);

      expect(onMarkPacked).toHaveBeenCalledWith('claim-1');
    });
  });

  describe('Packed Column', () => {
    const userPackedItem = createMockItem({
      id: 'item-1',
      claims: [
        {
          id: 'claim-1',
          item_id: 'item-1',
          user_id: 'user-1',
          quantity: 1,
          is_packed: true,
          created_at: new Date().toISOString(),
        },
      ],
    });

    it('shows Unclaim button and Packed indicator when user has packed claim', () => {
      renderWithDnd({ ...defaultProps, item: userPackedItem, column: 'packed' });
      expect(screen.getByText('Unclaim')).toBeInTheDocument();
      expect(screen.getByText('Packed')).toBeInTheDocument();
    });

    it('shows only Packed indicator when user does not have claim', () => {
      const otherPackedItem = createMockItem({
        claims: [
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 1,
            is_packed: true,
            created_at: new Date().toISOString(),
          },
        ],
      });

      renderWithDnd({ ...defaultProps, item: otherPackedItem, column: 'packed' });
      expect(screen.queryByText('Unclaim')).not.toBeInTheDocument();
      expect(screen.getByText('Packed')).toBeInTheDocument();
    });

    it('calls onUnclaim when Unclaim button is clicked in packed column', async () => {
      const onUnclaim = jest.fn();
      renderWithDnd({
        ...defaultProps,
        item: userPackedItem,
        column: 'packed',
        onUnclaim,
      });

      const unclaimButton = screen.getByText('Unclaim');
      await userEvent.click(unclaimButton);

      expect(onUnclaim).toHaveBeenCalledWith('claim-1', 1);
    });
  });

  describe('Avatar Display', () => {
    it('shows avatars when item has claims', () => {
      const itemWithClaims = createMockItem({
        claims: [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
            profiles: [
              {
                full_name: 'John Doe',
                username: 'johndoe',
                avatar_theme: 'light',
              },
            ],
          },
        ],
      });

      const { container } = renderWithDnd({ ...defaultProps, item: itemWithClaims });
      expect(container.querySelector('.rounded-full')).toBeInTheDocument();
    });

    it('shows +N indicator when more than 3 claims', () => {
      const itemWithManyClaims = createMockItem({
        claims: Array.from({ length: 5 }, (_, i) => ({
          id: `claim-${i}`,
          item_id: 'item-1',
          user_id: `user-${i}`,
          quantity: 1,
          is_packed: false,
          created_at: new Date().toISOString(),
        })),
      });

      renderWithDnd({ ...defaultProps, item: itemWithManyClaims });
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('hides avatars in My View claimed column', () => {
      const itemWithClaims = createMockItem({
        claims: [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const { container } = renderWithDnd({
        ...defaultProps,
        item: itemWithClaims,
        column: 'claimed',
        boardViewMode: 'my-view',
      });

      // Should not show avatars in my-view claimed column
      expect(container.querySelector('.-space-x-1')).not.toBeInTheDocument();
    });

    it('shows avatars in All Items View claimed column', () => {
      const itemWithClaims = createMockItem({
        claims: [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const { container } = renderWithDnd({
        ...defaultProps,
        item: itemWithClaims,
        column: 'claimed',
        boardViewMode: 'all-items-view',
      });

      expect(container.querySelector('.-space-x-1')).toBeInTheDocument();
    });
  });

  describe('Count Calculation - My View', () => {
    it('shows required_count in unassigned column', () => {
      renderWithDnd({
        ...defaultProps,
        item: createMockItem({ required_count: 10 }),
        column: 'unassigned',
        boardViewMode: 'my-view',
      });
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows user claim quantity in claimed column', () => {
      const userClaimedItem = createMockItem({
        claims: [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 3,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      renderWithDnd({
        ...defaultProps,
        item: userClaimedItem,
        column: 'claimed',
        boardViewMode: 'my-view',
      });
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('shows 0 when user has no claim in claimed column', () => {
      const otherClaimedItem = createMockItem({
        claims: [
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 3,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      renderWithDnd({
        ...defaultProps,
        item: otherClaimedItem,
        column: 'claimed',
        boardViewMode: 'my-view',
      });
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });

  describe('Count Calculation - All Items View', () => {
    it('shows required_count in unassigned column', () => {
      renderWithDnd({
        ...defaultProps,
        item: createMockItem({ required_count: 10 }),
        column: 'unassigned',
        boardViewMode: 'all-items-view',
      });
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('shows total_claimed in claimed column', () => {
      const claimedItem = createMockItem({
        total_claimed: 7,
      });

      renderWithDnd({
        ...defaultProps,
        item: claimedItem,
        column: 'claimed',
        boardViewMode: 'all-items-view',
      });
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    it('shows total_packed in packed column', () => {
      const packedItem = createMockItem({
        total_packed: 5,
      });

      renderWithDnd({
        ...defaultProps,
        item: packedItem,
        column: 'packed',
        boardViewMode: 'all-items-view',
      });
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles item with no claims', () => {
      renderWithDnd({ ...defaultProps, item: createMockItem({ claims: [] }) });
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('handles item with multiple claims', () => {
      const multiClaimItem = createMockItem({
        claims: [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 2,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ],
      });

      renderWithDnd({ ...defaultProps, item: multiClaimItem });
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('handles null currentUserId', () => {
      renderWithDnd({ ...defaultProps, currentUserId: null });
      expect(screen.getByText('Test Item')).toBeInTheDocument();
    });

    it('handles very long item name with truncation', () => {
      const longNameItem = createMockItem({
        name: 'This is a very long item name that should be truncated',
      });

      renderWithDnd({ ...defaultProps, item: longNameItem });
      const nameElement = screen.getByText(/This is a very long/);
      expect(nameElement).toBeInTheDocument();
      expect(nameElement.className).toContain('truncate');
    });
  });
});
