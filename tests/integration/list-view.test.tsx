import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListView } from '../../src/components/features/list-view';
import { ItemWithClaims, KanbanColumn } from '../../src/types/database.types';

// Mock category icons
/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('../../src/lib/utils/category-icons', () => ({
  getCategoryIcon: () =>
    function PackageIcon() {
      return <div data-testid="category-icon">Icon</div>;
    },
  CATEGORY_ICONS: {
    Essentials: function Icon() {
      return <div />;
    },
  },
}));

// Mock user utils
jest.mock('../../src/lib/utils', () => ({
  getUserInitials: (profile: any, userId: string) => {
    return (
      profile?.full_name
        ?.split(' ')
        .map((n: string) => n[0])
        .join('') || userId.slice(0, 2)
    );
  },
  getUserDisplayName: (profile: any, userId: string) => {
    return profile?.full_name || profile?.username || userId;
  },
}));

// Mock Button component
jest.mock('../../src/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('ListView Integration', () => {
  const mockOnClaim = jest.fn();
  const mockOnUnclaim = jest.fn();
  const mockOnMarkPacked = jest.fn();
  const mockOnDeleteItem = jest.fn();

  const defaultProps = {
    onClaim: mockOnClaim,
    onUnclaim: mockOnUnclaim,
    onMarkPacked: mockOnMarkPacked,
    onDeleteItem: mockOnDeleteItem,
  };

  // Helper to create mock item
  const createMockItem = (
    id: string,
    name: string,
    category: string,
    quantity: number,
    /* eslint-disable @typescript-eslint/no-explicit-any */
    claims: any[] = []
    /* eslint-enable @typescript-eslint/no-explicit-any */
  ): ItemWithClaims => ({
    id,
    trip_id: 'trip-1',
    name,
    category,
    required_count: quantity,
    claim_type: 'multiple',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    claims,
    total_claimed: claims.reduce((sum, c) => sum + c.quantity, 0),
    total_packed: claims.filter((c) => c.is_packed).reduce((sum, c) => sum + c.quantity, 0),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders three accordion sections (Unassigned, Claimed, Packed)', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, []),
        createMockItem('item-2', 'Sleeping Bag', 'Essentials', 1, [
          {
            id: 'claim-1',
            item_id: 'item-2',
            user_id: 'user-1',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
            profiles: null,
          },
        ]),
        createMockItem('item-3', 'Flashlight', 'Essentials', 1, [
          {
            id: 'claim-2',
            item_id: 'item-3',
            user_id: 'user-1',
            quantity: 1,
            is_packed: true,
            created_at: new Date().toISOString(),
            profiles: null,
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: ['item-2'],
        packed: ['item-3'],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByText('Unassigned')).toBeVisible();
      expect(screen.getByText('Claimed')).toBeVisible();
      expect(screen.getAllByText('Packed').length).toBeGreaterThan(0);
    });

    it('does not render accordion section when column has no items', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Unassigned should be visible
      expect(screen.getByText('Unassigned')).toBeVisible();

      // Claimed and Packed sections should not render (empty arrays)
      // Check that the heading text doesn't appear more than once for each non-empty column
      const unassignedHeaders = screen.getAllByText('Unassigned');
      expect(unassignedHeaders.length).toBe(1);
    });

    it('displays item count badge on accordion header', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2),
        createMockItem('item-2', 'Sleeping Bag', 'Essentials', 1),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1', 'item-2'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const countBadges = screen.getAllByText('2');
      expect(countBadges.length).toBeGreaterThan(0);
    });

    it('renders item details in compact row format', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByText('Tent')).toBeVisible();
      expect(screen.getByText('Essentials')).toBeVisible();
      expect(screen.getByText('2')).toBeVisible(); // Quantity
      expect(screen.getByTestId('category-icon')).toBeVisible();
    });
  });

  describe('Accordion Expand/Collapse', () => {
    it('should expand when accordion header is clicked', async () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // By default, accordion should be expanded (items visible)
      expect(screen.getByText('Tent')).toBeVisible();

      // Click to collapse
      const unassignedHeader = screen.getByText('Unassigned').closest('button');
      await userEvent.click(unassignedHeader!);

      // Item should still be in DOM but not visible (accordion collapsed)
      await waitFor(() => {
        expect(screen.queryByText('Tent')).not.toBeInTheDocument();
      });
    });

    it('should collapse when accordion header is clicked again', async () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Click to collapse
      const unassignedHeader = screen.getByText('Unassigned').closest('button');
      await userEvent.click(unassignedHeader!);
      await userEvent.click(unassignedHeader!);

      // Should be expanded again
      await waitFor(() => {
        expect(screen.getByText('Tent')).toBeVisible();
      });
    });

    it('shows chevron up icon when expanded', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Chevron up indicates expanded state (default)
      const container = screen.getByText('Unassigned').parentElement;
      expect(container).toBeInTheDocument();
    });
  });

  describe('Action Buttons - Unassigned Column', () => {
    it('renders Claim button for unassigned items', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Claim' })).toBeVisible();
    });

    it('calls onClaim when Claim button is clicked', async () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Claim' }));

      expect(mockOnClaim).toHaveBeenCalledWith('item-1');
    });

    it('renders Delete button for admin users', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={true}
        />
      );

      expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
    });

    it('does not render Delete button for non-admin users', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    });

    it('calls onDeleteItem when Delete button is clicked', async () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={true}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(mockOnDeleteItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('Action Buttons - Claimed Column', () => {
    it('renders Unclaim and Mark Packed buttons for claimed items', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByRole('button', { name: 'Unclaim' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Mark Packed' })).toBeVisible();
    });

    it('calls onUnclaim when Unclaim button is clicked', async () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Unclaim' }));

      expect(mockOnUnclaim).toHaveBeenCalledWith('claim-1', 2);
    });

    it('calls onMarkPacked when Mark Packed button is clicked', async () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      await userEvent.click(screen.getByRole('button', { name: 'Mark Packed' }));

      expect(mockOnMarkPacked).toHaveBeenCalledWith('claim-1');
    });
  });

  describe('Action Buttons - Packed Column', () => {
    it("renders Packed status and Unclaim button for user's packed items", () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: true,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: [],
        packed: ['item-1'],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getAllByText('Packed').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Unclaim' })).toBeVisible();
    });

    it('shows Packed status without Unclaim for items packed by others', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-2', // Different user
            quantity: 2,
            is_packed: true,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: [],
        packed: ['item-1'],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getAllByText('Packed').length).toBeGreaterThan(0);
      expect(screen.queryByRole('button', { name: 'Unclaim' })).not.toBeInTheDocument();
    });
  });

  describe('Member Avatars', () => {
    it('renders avatars for items with claims', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
            profiles: [
              {
                id: 'user-2',
                full_name: 'John Doe',
                username: 'johndoe',
              },
            ],
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="all-items-view"
        />
      );

      // Avatar should show initials
      expect(screen.getByText('JD')).toBeVisible();
    });

    it('shows +N indicator when more than 3 claims', () => {
      const claims = Array.from({ length: 5 }, (_, i) => ({
        id: `claim-${i}`,
        item_id: 'item-1',
        user_id: `user-${i}`,
        quantity: 1,
        is_packed: false,
        created_at: new Date().toISOString(),
        profiles: [
          {
            id: `user-${i}`,
            full_name: `User ${i}`,
            username: `user${i}`,
          },
        ],
      }));

      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 5, claims)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="all-items-view"
        />
      );

      // Should show +2 for 5 claims (3 visible + 2 more)
      expect(screen.getByText('+2')).toBeVisible();
    });

    it('hides avatars in claimed column when boardViewMode is my-view', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
            profiles: [
              {
                id: 'user-2',
                full_name: 'John Doe',
                username: 'johndoe',
              },
            ],
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="my-view"
        />
      );

      // Avatars should be hidden in my-view for claimed column
      expect(screen.queryByText('JD')).not.toBeInTheDocument();
    });
  });

  describe('Count Calculation', () => {
    it('shows correct count for unassigned items in my-view', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 5)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="my-view"
        />
      );

      // Should show full required_count (5) for unassigned
      const quantityText = screen.getByText('5');
      expect(quantityText).toBeVisible();
    });

    it("shows user's claimed quantity in claimed column for my-view", () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 5, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 3,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="my-view"
        />
      );

      // Should show user's claimed quantity (2), not total (5)
      const quantityText = screen.getByText('2');
      expect(quantityText).toBeVisible();
    });

    it('shows aggregate claimed quantity in claimed column for all-items-view', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 5, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 3,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="all-items-view"
        />
      );

      // Should show total claimed (5)
      const quantityText = screen.getByText('5');
      expect(quantityText).toBeVisible();
    });

    it("shows user's packed quantity in packed column for my-view", () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 5, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 3,
            is_packed: true,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: [],
        packed: ['item-1'],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="my-view"
        />
      );

      // Should show user's packed quantity (2)
      const quantityText = screen.getByText('2');
      expect(quantityText).toBeVisible();
    });

    it('shows aggregate packed quantity in packed column for all-items-view', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 5, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 2,
            is_packed: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'claim-2',
            item_id: 'item-1',
            user_id: 'user-2',
            quantity: 3,
            is_packed: true,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: [],
        packed: ['item-1'],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
          boardViewMode="all-items-view"
        />
      );

      // Should show total packed (5)
      const quantityText = screen.getByText('5');
      expect(quantityText).toBeVisible();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty items array', () => {
      render(
        <ListView
          {...defaultProps}
          items={[]}
          columns={{ unassigned: [], claimed: [], packed: [] }}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Should not throw, sections should not render
      expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
    });

    it('handles null currentUserId', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId={null}
          isAdmin={false}
        />
      );

      // Should render without errors
      expect(screen.getByText('Tent')).toBeVisible();
    });

    it('handles items with no claims in claimed column', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2, [])];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: ['item-1'],
        packed: [],
      };

      render(
        <ListView
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Should render item but no action buttons (no user claim)
      expect(screen.getByText('Tent')).toBeVisible();
      expect(screen.queryByRole('button', { name: 'Unclaim' })).not.toBeInTheDocument();
    });
  });
});
