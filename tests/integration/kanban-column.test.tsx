import { render, screen } from '@testing-library/react';
import { KanbanColumn } from '@/components/features/kanban-column';
import { ItemWithClaims, KanbanColumn as KanbanColumnType } from '@/types/database.types';
import { DndContext } from '@dnd-kit/core';
import userEvent from '@testing-library/user-event';

// Mock KanbanCard to focus on KanbanColumn logic
jest.mock('../../src/components/features/kanban-card', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  KanbanCard: ({ item, onClaim, onMarkPacked }: any) => (
    <div data-testid={`card-${item.id}`}>
      {item.name}
      <button onClick={() => onClaim(item.id)}>Claim</button>
      <button onClick={() => onMarkPacked('claim-1')}>Mark Packed</button>
    </div>
  ),
}));

describe('KanbanColumn Integration', () => {
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

  const mockOnClaim = jest.fn();
  const mockOnMarkPacked = jest.fn();

  const renderWithDnd = (column: KanbanColumnType, items: ItemWithClaims[]) => {
    return render(
      <DndContext>
        <KanbanColumn
          id={column}
          title={column === 'needed' ? 'Needed' : column === 'claimed' ? 'Claimed' : 'Packed'}
          items={items}
          currentUserId="user-1"
          onClaim={mockOnClaim}
          onMarkPacked={mockOnMarkPacked}
        />
      </DndContext>
    );
  };

  describe('Needed Column', () => {
    it('renders column header and item count', () => {
      const items = [createMockItem({ id: 'item-1' }), createMockItem({ id: 'item-2' })];

      renderWithDnd('needed', items);

      expect(screen.getByText('Needed')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders items in the column', () => {
      const items = [createMockItem({ id: 'item-1', name: 'Tent' })];

      renderWithDnd('needed', items);

      expect(screen.getByTestId('card-item-1')).toBeInTheDocument();
      expect(screen.getByText('Tent')).toBeInTheDocument();
    });

    it('shows empty state when no items', () => {
      renderWithDnd('needed', []);

      expect(screen.getByText('No items yet')).toBeInTheDocument();
    });

    it('uses amber color scheme for needed column', () => {
      const { container } = renderWithDnd('needed', [createMockItem()]);

      const column = container.querySelector('.bg-amber-50');
      expect(column).toBeInTheDocument();
    });
  });

  describe('Claimed Column', () => {
    it('renders claimed column header', () => {
      const items = [createMockItem({ id: 'item-1' })];

      renderWithDnd('claimed', items);

      expect(screen.getByText('Claimed')).toBeInTheDocument();
    });

    it('uses blue color scheme for claimed column', () => {
      const { container } = renderWithDnd('claimed', [createMockItem()]);

      const column = container.querySelector('.bg-blue-50');
      expect(column).toBeInTheDocument();
    });
  });

  describe('Packed Column', () => {
    it('renders packed column header', () => {
      const items = [createMockItem({ id: 'item-1' })];

      renderWithDnd('packed', items);

      expect(screen.getByText('Packed')).toBeInTheDocument();
    });

    it('uses green color scheme for packed column', () => {
      const { container } = renderWithDnd('packed', [createMockItem()]);

      const column = container.querySelector('.bg-green-50');
      expect(column).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('passes onClaim callback to child cards', async () => {
      const items = [createMockItem({ id: 'item-1', name: 'Tent' })];

      renderWithDnd('needed', items);

      const claimButton = screen.getByText('Claim');
      await userEvent.click(claimButton);

      expect(mockOnClaim).toHaveBeenCalledWith('item-1');
    });

    it('passes onMarkPacked callback to child cards', async () => {
      const items = [createMockItem({ id: 'item-1', name: 'Tent' })];

      renderWithDnd('claimed', items);

      const markPackedButton = screen.getByText('Mark Packed');
      await userEvent.click(markPackedButton);

      expect(mockOnMarkPacked).toHaveBeenCalledWith('claim-1');
    });
  });

  describe('Sortable Context', () => {
    it('provides item IDs to SortableContext', () => {
      const items = [
        createMockItem({ id: 'item-1' }),
        createMockItem({ id: 'item-2' }),
        createMockItem({ id: 'item-3' }),
      ];

      renderWithDnd('needed', items);

      // Verify all cards are rendered
      expect(screen.getByTestId('card-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('card-item-2')).toBeInTheDocument();
      expect(screen.getByTestId('card-item-3')).toBeInTheDocument();
    });
  });
});
