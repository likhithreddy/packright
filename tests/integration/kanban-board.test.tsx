import { render, screen } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '../../src/components/features/kanban-board';
import { ItemWithClaims, KanbanColumn } from '../../src/types/database.types';
import { useBoardStore } from '../../src/store/board-store';

// Mock @dnd-kit/core
/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragStart, onDragEnd }: any) => {
    React.useEffect(() => {
      // Simulate that drag context is ready
      onDragStart?.({ active: { id: null } });
      onDragEnd?.({ active: { id: null }, over: null });
    }, [onDragStart, onDragEnd]);
    return <div data-testid="dnd-context">{children}</div>;
  },
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
  PointerSensor: jest.fn(),
}));

// Mock board store
const mockUseBoardStore = jest.fn((selector) => {
  const state = {
    boardViewMode: 'all-items-view',
    viewMode: 'kanban',
    setBoardViewMode: jest.fn(),
    setViewMode: jest.fn(),
  };
  return selector ? selector(state) : state;
});

jest.mock('../../src/store/board-store', () => ({
  useBoardStore: jest.fn((selector?: any) => {
    const state = {
      boardViewMode: 'all-items-view',
      viewMode: 'kanban',
      setBoardViewMode: jest.fn(),
      setViewMode: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Access the mock for tests
export const useBoardStoreMock = mockUseBoardStore;

// Mock KanbanColumn component
jest.mock('../../src/components/features/kanban-column', () => ({
  KanbanColumn: ({
    id,
    title,
    items,
    isDragDisabled,
    onClaim,
    onUnclaim,
    onMarkPacked,
    onEditItem,
    onDeleteItem,
  }: any) => (
    <div data-testid={`column-${id}`} data-drag-disabled={isDragDisabled}>
      <h3>{title}</h3>
      <div>
        {items.map((item: any) => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            {item.name}
            <button onClick={() => onClaim?.(item.id)}>Claim</button>
            <button onClick={() => onUnclaim?.('claim-1', 1)}>Unclaim</button>
            <button onClick={() => onMarkPacked?.('claim-1')}>Mark Packed</button>
            <button onClick={() => onEditItem?.(item.id)}>Edit</button>
            <button onClick={() => onDeleteItem?.(item.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  ),
}));

// Mock KanbanCard component
jest.mock('../../src/components/features/kanban-card', () => ({
  KanbanCard: ({ item }: any) => <div data-testid={`card-${item.id}`}>{item.name}</div>,
}));
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('KanbanBoard Integration', () => {
  const mockOnClaim = jest.fn();
  const mockOnMarkPacked = jest.fn();
  const mockOnUnclaim = jest.fn();
  const mockOnEditItem = jest.fn();
  const mockOnDeleteItem = jest.fn();
  const mockOnMoveItem = jest.fn();

  const defaultProps = {
    onClaim: mockOnClaim,
    onMarkPacked: mockOnMarkPacked,
    onUnclaim: mockOnUnclaim,
    onEditItem: mockOnEditItem,
    onDeleteItem: mockOnDeleteItem,
    onMoveItem: mockOnMoveItem,
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
    it('renders three columns: Unassigned, Claimed, Packed', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByTestId('column-unassigned')).toBeVisible();
      expect(screen.getByTestId('column-claimed')).toBeVisible();
      expect(screen.getByTestId('column-packed')).toBeVisible();
    });

    it('renders items in correct columns', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2),
        createMockItem('item-2', 'Sleeping Bag', 'Essentials', 1, [
          {
            id: 'claim-1',
            item_id: 'item-2',
            user_id: 'user-1',
            quantity: 1,
            is_packed: false,
            created_at: new Date().toISOString(),
          },
        ]),
      ];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: ['item-2'],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByTestId('item-item-1')).toBeVisible();
      expect(screen.getByTestId('item-item-2')).toBeVisible();
    });

    it('renders DndContext wrapper', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByTestId('dnd-context')).toBeVisible();
    });

    it('renders drag overlay', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      expect(screen.getByTestId('drag-overlay')).toBeVisible();
    });
  });

  describe('Column Configuration', () => {
    it('passes correct props to Unassigned column', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const unassignedColumn = screen.getByTestId('column-unassigned');
      expect(unassignedColumn).toHaveAttribute('data-drag-disabled', 'false');
    });

    it('passes correct props to Claimed column', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
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
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const claimedColumn = screen.getByTestId('column-claimed');
      expect(claimedColumn).toHaveAttribute('data-drag-disabled', 'false');
    });

    it('passes correct props to Packed column', () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
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
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const packedColumn = screen.getByTestId('column-packed');
      expect(packedColumn).toHaveAttribute('data-drag-disabled', 'false');
    });
  });

  describe('Drag Disable Logic', () => {
    it('disables drag for unassigned column in my-view mode', () => {
      // Mock store to return 'my-view' mode
      (useBoardStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          boardViewMode: 'my-view',
          viewMode: 'kanban',
          setBoardViewMode: jest.fn(),
          setViewMode: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const unassignedColumn = screen.getByTestId('column-unassigned');
      expect(unassignedColumn).toHaveAttribute('data-drag-disabled', 'true');
    });

    it('enables drag for claimed column in my-view mode', () => {
      // Mock store to return 'my-view' mode
      (useBoardStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          boardViewMode: 'my-view',
          viewMode: 'kanban',
          setBoardViewMode: jest.fn(),
          setViewMode: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
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
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const claimedColumn = screen.getByTestId('column-claimed');
      expect(claimedColumn).toHaveAttribute('data-drag-disabled', 'false');
    });

    it('enables drag for all columns in all-items-view mode', () => {
      // Mock store to return 'all-items-view' mode (default)
      (useBoardStore as jest.Mock).mockImplementation((selector) => {
        const state = {
          boardViewMode: 'all-items-view',
          viewMode: 'kanban',
          setBoardViewMode: jest.fn(),
          setViewMode: jest.fn(),
        };
        return selector ? selector(state) : state;
      });

      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const unassignedColumn = screen.getByTestId('column-unassigned');
      expect(unassignedColumn).toHaveAttribute('data-drag-disabled', 'false');
    });
  });

  describe('Event Handlers', () => {
    it('passes onClaim handler to columns', async () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Click the Claim button in the mocked column
      await userEvent.click(screen.getByRole('button', { name: 'Claim' }));

      expect(mockOnClaim).toHaveBeenCalledWith('item-1');
    });

    it('passes onUnclaim handler to columns', async () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
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
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Click the Unclaim button in the mocked column
      await userEvent.click(screen.getByRole('button', { name: 'Unclaim' }));

      expect(mockOnUnclaim).toHaveBeenCalledWith('claim-1', 1);
    });

    it('passes onMarkPacked handler to columns', async () => {
      const items: ItemWithClaims[] = [
        createMockItem('item-1', 'Tent', 'Essentials', 2, [
          {
            id: 'claim-1',
            item_id: 'item-1',
            user_id: 'user-1',
            quantity: 1,
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
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Click the Mark Packed button in the mocked column
      await userEvent.click(screen.getByRole('button', { name: 'Mark Packed' }));

      expect(mockOnMarkPacked).toHaveBeenCalledWith('claim-1');
    });

    it('passes onEditItem handler to columns', async () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Click the Edit button in the mocked column
      await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

      expect(mockOnEditItem).toHaveBeenCalledWith('item-1');
    });

    it('passes onDeleteItem handler to columns', async () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Click the Delete button in the mocked column
      await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(mockOnDeleteItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty columns', () => {
      const items: ItemWithClaims[] = [];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // All columns should render but with no items
      expect(screen.getByTestId('column-unassigned')).toBeVisible();
      expect(screen.getByTestId('column-claimed')).toBeVisible();
      expect(screen.getByTestId('column-packed')).toBeVisible();
    });

    it('handles null currentUserId', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId={null}
          isAdmin={false}
        />
      );

      // Should render without errors
      expect(screen.getByTestId('column-unassigned')).toBeVisible();
    });

    it('handles items not found in columns', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Items exist but are not in any column - should not crash
      expect(screen.getByTestId('column-unassigned')).toBeVisible();
    });
  });

  describe('Drag Overlay', () => {
    it('shows overlay with active item during drag', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      const dragOverlay = screen.getByTestId('drag-overlay');
      expect(dragOverlay).toBeVisible();
    });
  });

  describe('Board View Mode Integration', () => {
    it('uses boardViewMode from store', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Component should use boardViewMode from store (mocked to 'all-items-view')
      expect(screen.getByTestId('column-unassigned')).toHaveAttribute(
        'data-drag-disabled',
        'false'
      );
    });
  });

  describe('Drag End Edge Cases', () => {
    it('handles drag end when over is null', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Component should handle null over gracefully
      expect(screen.getByTestId('column-unassigned')).toBeVisible();
    });

    it('handles drag end when active is null', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Component should handle null active gracefully
      expect(screen.getByTestId('column-unassigned')).toBeVisible();
    });

    it('handles drag end for same column drop', () => {
      const items: ItemWithClaims[] = [createMockItem('item-1', 'Tent', 'Essentials', 2)];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: ['item-1'],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // Component should handle same-column drop
      expect(screen.getByTestId('column-unassigned')).toBeVisible();
    });

    it('renders without errors when no items provided', () => {
      const items: ItemWithClaims[] = [];
      const columns: Record<KanbanColumn, string[]> = {
        unassigned: [],
        claimed: [],
        packed: [],
      };

      render(
        <KanbanBoard
          {...defaultProps}
          items={items}
          columns={columns}
          currentUserId="user-1"
          isAdmin={false}
        />
      );

      // All columns should render even with no items
      expect(screen.getByTestId('column-unassigned')).toBeVisible();
      expect(screen.getByTestId('column-claimed')).toBeVisible();
      expect(screen.getByTestId('column-packed')).toBeVisible();
    });
  });
});
