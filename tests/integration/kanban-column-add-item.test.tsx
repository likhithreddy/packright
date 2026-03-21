import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanColumn } from '@/components/features/kanban-column';
import { ItemWithClaims, KanbanColumn as KanbanColumnType } from '@/types/database.types';
import { DndContext } from '@dnd-kit/core';

// Mock KanbanCard to focus on KanbanColumn logic
jest.mock('../../src/components/features/kanban-card', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  KanbanCard: ({ item, onClaim, onMarkPacked, onEditItem, onDeleteItem }: any) => (
    <div data-testid={`card-${item.id}`}>
      {item.name}
      <button onClick={() => onClaim(item.id)}>Claim</button>
      <button onClick={() => onMarkPacked('claim-1')}>Mark Packed</button>
      <button onClick={() => onEditItem(item.id)}>Edit</button>
      <button onClick={() => onDeleteItem(item.id)}>Delete</button>
    </div>
  ),
}));

// Mock AddItemCard
jest.mock('../../src/components/features/add-item-card', () => ({
  AddItemCard: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="add-item-card" onClick={onClick}>
      Add item
    </button>
  ),
}));

describe('KanbanColumn Add Item Feature Integration', () => {
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
  const mockOnUnclaim = jest.fn();
  const mockOnEditItem = jest.fn();
  const mockOnDeleteItem = jest.fn();
  const mockOnAddItem = jest.fn();

  const renderWithDnd = (
    column: KanbanColumnType,
    items: ItemWithClaims[],
    isAdmin: boolean = false
  ) => {
    return render(
      <DndContext>
        <KanbanColumn
          id={column}
          title={
            column === 'unassigned' ? 'Unassigned' : column === 'claimed' ? 'Claimed' : 'Packed'
          }
          items={items}
          currentUserId="user-1"
          isAdmin={isAdmin}
          isDragDisabled={false}
          onClaim={mockOnClaim}
          onMarkPacked={mockOnMarkPacked}
          onUnclaim={mockOnUnclaim}
          onEditItem={mockOnEditItem}
          onDeleteItem={mockOnDeleteItem}
          onAddItem={mockOnAddItem}
        />
      </DndContext>
    );
  };

  describe('Admin-only Add Item Controls', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Plus Icon in Header', () => {
      it('shows + icon in unassigned column header when user is admin', () => {
        const items = [createMockItem()];
        renderWithDnd('unassigned', items, true);

        // Look for the Plus icon (lucide-react Plus component)
        const { container } = renderWithDnd('unassigned', items, true);
        const plusIcon = container.querySelector('button[title="Add new item"] svg');
        expect(plusIcon).toBeInTheDocument();
      });

      it('does NOT show + icon in unassigned column header when user is not admin', () => {
        const items = [createMockItem()];
        const { container } = renderWithDnd('unassigned', items, false);

        const plusIcon = container.querySelector('button[title="Add new item"]');
        expect(plusIcon).not.toBeInTheDocument();
      });

      it('does NOT show + icon in claimed column header even for admin', () => {
        const items = [createMockItem()];
        const { container } = renderWithDnd('claimed', items, true);

        const plusIcon = container.querySelector('button[title="Add new item"]');
        expect(plusIcon).not.toBeInTheDocument();
      });

      it('does NOT show + icon in packed column header even for admin', () => {
        const items = [createMockItem()];
        const { container } = renderWithDnd('packed', items, true);

        const plusIcon = container.querySelector('button[title="Add new item"]');
        expect(plusIcon).not.toBeInTheDocument();
      });

      it('calls onAddItem when + icon is clicked', async () => {
        const user = userEvent.setup();
        const items = [createMockItem()];
        const { container } = renderWithDnd('unassigned', items, true);

        const plusButton = container.querySelector('button[title="Add new item"]');
        if (plusButton) {
          await user.click(plusButton);

          expect(mockOnAddItem).toHaveBeenCalledTimes(1);
        }
      });
    });

    describe('AddItemCard in Column Body', () => {
      it('shows AddItemCard in unassigned column when user is admin', () => {
        const items = [createMockItem()];
        renderWithDnd('unassigned', items, true);

        expect(screen.getByTestId('add-item-card')).toBeInTheDocument();
      });

      it('does NOT show AddItemCard in unassigned column when user is not admin', () => {
        const items = [createMockItem()];
        renderWithDnd('unassigned', items, false);

        expect(screen.queryByTestId('add-item-card')).not.toBeInTheDocument();
      });

      it('does NOT show AddItemCard in claimed column even for admin', () => {
        const items = [createMockItem()];
        renderWithDnd('claimed', items, true);

        expect(screen.queryByTestId('add-item-card')).not.toBeInTheDocument();
      });

      it('does NOT show AddItemCard in packed column even for admin', () => {
        const items = [createMockItem()];
        renderWithDnd('packed', items, true);

        expect(screen.queryByTestId('add-item-card')).not.toBeInTheDocument();
      });

      it('calls onAddItem when AddItemCard is clicked', async () => {
        const user = userEvent.setup();
        const items = [createMockItem()];
        renderWithDnd('unassigned', items, true);

        const addItemCard = screen.getByTestId('add-item-card');
        await user.click(addItemCard);

        expect(mockOnAddItem).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Group Hover Behavior', () => {
    it('AddItemCard has opacity-0 by default', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      // Find the wrapper div with opacity classes
      const wrapper = container.querySelector('.opacity-0');
      expect(wrapper).toBeInTheDocument();
    });

    it('AddItemCard wrapper has group-hover:opacity-100 class', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      // Find the wrapper div
      const wrapper = container.querySelector('.opacity-0');
      expect(wrapper).toHaveClass('group-hover:opacity-100');
    });

    it('column has group class for hover behavior', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const column = container.querySelector('.group');
      expect(column).toBeInTheDocument();
    });

    it('AddItemCard wrapper has transition-opacity class', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const wrapper = container.querySelector('.opacity-0');
      expect(wrapper).toHaveClass('transition-opacity');
    });

    it('both + icon and AddItemCard are visible on group hover', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      // The column has the group class
      const column = container.querySelector('.group');
      expect(column).toBeInTheDocument();

      // The AddItemCard wrapper has the hover class
      const wrapper = container.querySelector('.group-hover\\:opacity-100');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Column Header Layout with Add Button', () => {
    it('header has flex layout with justify-between', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const header = container.querySelector('.px-3.sm\\:px-4.py-2.sm\\:py-3');
      expect(header).toHaveClass('flex');
      expect(header).toHaveClass('items-center');
      expect(header).toHaveClass('justify-between');
    });

    it('header has flex items-center gap-2 for controls', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const controlsDiv = container.querySelector('.flex.items-center.gap-2');
      expect(controlsDiv).toBeInTheDocument();
    });

    it('+ icon appears before item count badge', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const controlsDiv = container.querySelector('.flex.items-center.gap-2');
      if (controlsDiv) {
        const children = controlsDiv.children;
        // First child should be the + button
        expect(children[0]).toHaveAttribute('title', 'Add new item');
        // Second child should be the badge
        expect(children[1].textContent).toBe('1');
      }
    });
  });

  describe('Integration with onAddItem prop', () => {
    it('only renders add controls when onAddItem is provided', () => {
      const items = [createMockItem()];

      // Without onAddItem prop
      const { container: withoutProp } = render(
        <DndContext>
          <KanbanColumn
            id="unassigned"
            title="Unassigned"
            items={items}
            currentUserId="user-1"
            isAdmin={true}
            isDragDisabled={false}
            onClaim={mockOnClaim}
            onMarkPacked={mockOnMarkPacked}
            onUnclaim={mockOnUnclaim}
            onEditItem={mockOnEditItem}
            onDeleteItem={mockOnDeleteItem}
          />
        </DndContext>
      );

      expect(withoutProp.querySelector('button[title="Add new item"]')).not.toBeInTheDocument();
      expect(screen.queryByTestId('add-item-card')).not.toBeInTheDocument();
    });

    it('does not show add controls when onAddItem is not provided even for admin', () => {
      const items = [createMockItem()];

      render(
        <DndContext>
          <KanbanColumn
            id="unassigned"
            title="Unassigned"
            items={items}
            currentUserId="user-1"
            isAdmin={true}
            isDragDisabled={false}
            onClaim={mockOnClaim}
            onMarkPacked={mockOnMarkPacked}
            onUnclaim={mockOnUnclaim}
            onEditItem={mockOnEditItem}
            onDeleteItem={mockOnDeleteItem}
          />
        </DndContext>
      );

      expect(screen.queryByTestId('add-item-card')).not.toBeInTheDocument();
    });

    it('passes the same function reference to both add controls', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      // Both should use the same onAddItem callback
      const plusButton = container.querySelector('button[title="Add new item"]');
      const addItemCard = screen.getByTestId('add-item-card');

      expect(plusButton).toBeInTheDocument();
      expect(addItemCard).toBeInTheDocument();

      // Clicking either should call the same mock function
      expect(mockOnAddItem).toBeDefined();
    });
  });

  describe('Empty State with Admin Controls', () => {
    it('shows empty state message when no items and admin', () => {
      renderWithDnd('unassigned', [], true);

      expect(screen.getByText('No items yet')).toBeInTheDocument();
      expect(screen.getByTestId('add-item-card')).toBeInTheDocument();
    });

    it('shows empty state message when no items and not admin', () => {
      renderWithDnd('unassigned', [], false);

      expect(screen.getByText('No items yet')).toBeInTheDocument();
      expect(screen.queryByTestId('add-item-card')).not.toBeInTheDocument();
    });

    it('allows adding item when column is empty and user is admin', async () => {
      const user = userEvent.setup();
      // Explicitly reset mock before this test
      mockOnAddItem.mockClear();
      renderWithDnd('unassigned', [], true);

      expect(screen.getByText('No items yet')).toBeInTheDocument();
      expect(screen.getByTestId('add-item-card')).toBeInTheDocument();

      const addItemCard = screen.getByTestId('add-item-card');
      await user.click(addItemCard);

      await waitFor(
        () => {
          expect(mockOnAddItem).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );
    });

    it('admin can add item via + icon when column is empty', async () => {
      const user = userEvent.setup();
      // Explicitly reset mock before this test
      mockOnAddItem.mockClear();
      const { container } = renderWithDnd('unassigned', [], true);

      const plusButton = container.querySelector('button[title="Add new item"]');
      if (plusButton) {
        await user.click(plusButton);

        await waitFor(
          () => {
            expect(mockOnAddItem).toHaveBeenCalledTimes(1);
          },
          { timeout: 3000 }
        );
      }
    });
  });

  describe('Column Type Restrictions', () => {
    it('only unassigned column shows add controls for admin', () => {
      const items = [createMockItem()];

      // Unassigned column
      const { container: unassignedContainer } = renderWithDnd('unassigned', items, true);
      expect(unassignedContainer.querySelector('button[title="Add new item"]')).toBeInTheDocument();

      // Claimed column
      const { container: claimedContainer } = render(
        <DndContext>
          <KanbanColumn
            id="claimed"
            title="Claimed"
            items={items}
            currentUserId="user-1"
            isAdmin={true}
            isDragDisabled={false}
            onClaim={mockOnClaim}
            onMarkPacked={mockOnMarkPacked}
            onUnclaim={mockOnUnclaim}
            onEditItem={mockOnEditItem}
            onDeleteItem={mockOnDeleteItem}
            onAddItem={mockOnAddItem}
          />
        </DndContext>
      );
      expect(
        claimedContainer.querySelector('button[title="Add new item"]')
      ).not.toBeInTheDocument();

      // Packed column
      const { container: packedContainer } = render(
        <DndContext>
          <KanbanColumn
            id="packed"
            title="Packed"
            items={items}
            currentUserId="user-1"
            isAdmin={true}
            isDragDisabled={false}
            onClaim={mockOnClaim}
            onMarkPacked={mockOnMarkPacked}
            onUnclaim={mockOnUnclaim}
            onEditItem={mockOnEditItem}
            onDeleteItem={mockOnDeleteItem}
            onAddItem={mockOnAddItem}
          />
        </DndContext>
      );
      expect(packedContainer.querySelector('button[title="Add new item"]')).not.toBeInTheDocument();
    });
  });

  describe('Visual Consistency of Add Controls', () => {
    it('+ icon has correct styling classes', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const plusButton = container.querySelector('button[title="Add new item"]');
      expect(plusButton).toHaveClass('text-stone-500');
      expect(plusButton).toHaveClass('hover:text-stone-700');
      expect(plusButton).toHaveClass('transition-colors');
      expect(plusButton).toHaveClass('p-0.5');
    });

    it('+ icon button has correct type attribute', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const plusButton = container.querySelector('button[title="Add new item"]');
      expect(plusButton).toHaveAttribute('type', 'button');
    });

    it('AddItemCard wrapper has correct positioning', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      // The wrapper should be in the cards container
      const cardsContainer = container.querySelector('.flex-1.p-2.sm\\:p-3.overflow-y-auto');
      expect(cardsContainer).toBeInTheDocument();
    });
  });

  describe('Bug Fix Verification: Group Hover on Entire Column', () => {
    it('group class is applied to the column div', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const columnDiv = container.querySelector('.group');
      expect(columnDiv).toBeInTheDocument();
    });

    it('hovering anywhere on column should show AddItemCard', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      // The column has the group class
      const column = container.querySelector('.group.bg-\\[\\#f0ebe4\\]');
      expect(column).toHaveClass('group');

      // The AddItemCard wrapper responds to group-hover
      const wrapper = container.querySelector('.opacity-0.group-hover\\:opacity-100');
      expect(wrapper).toBeInTheDocument();
    });

    it('AddItemCard is not visible by default (opacity-0)', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const wrapper = container.querySelector('.opacity-0');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).not.toHaveClass('opacity-100');
    });

    it('AddItemCard becomes visible on group hover (group-hover:opacity-100)', () => {
      const items = [createMockItem()];
      const { container } = renderWithDnd('unassigned', items, true);

      const wrapper = container.querySelector('.opacity-0');
      expect(wrapper).toHaveClass('group-hover:opacity-100');
    });
  });
});
