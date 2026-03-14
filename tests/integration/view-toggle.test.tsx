import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewToggle } from '../../src/components/features/view-toggle';
import { useBoardStore } from '../../src/store/board-store';

// Mock board store
jest.mock('../../src/store/board-store', () => ({
  useBoardStore: jest.fn(),
}));

// Mock Button component
jest.mock('../../src/components/ui/button', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

describe('ViewToggle Integration', () => {
  const mockSetViewMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useBoardStore as jest.Mock).mockReturnValue({
      viewMode: 'list',
      setViewMode: mockSetViewMode,
    });
  });

  describe('Rendering', () => {
    it('renders toggle container', () => {
      const { container } = render(<ViewToggle />);
      const toggleContainer = container.firstChild;
      expect(toggleContainer).toBeInTheDocument();
    });

    it('renders Kanban button with LayoutGrid icon', () => {
      render(<ViewToggle />);
      expect(screen.getByText('Kanban')).toBeInTheDocument();
    });

    it('renders List button with List icon', () => {
      render(<ViewToggle />);
      expect(screen.getByText('List')).toBeInTheDocument();
    });

    it('applies active styling to Kanban button when viewMode is kanban', () => {
      (useBoardStore as jest.Mock).mockReturnValue({
        viewMode: 'kanban',
        setViewMode: mockSetViewMode,
      });

      render(<ViewToggle />);
      const kanbanButton = screen.getByText('Kanban');
      expect(kanbanButton.parentElement).toHaveClass('bg-white');
    });

    it('applies active styling to List button when viewMode is list', () => {
      (useBoardStore as jest.Mock).mockReturnValue({
        viewMode: 'list',
        setViewMode: mockSetViewMode,
      });

      render(<ViewToggle />);
      const listButton = screen.getByText('List');
      expect(listButton.parentElement).toHaveClass('bg-white');
    });
  });

  describe('Interactions', () => {
    it('calls setViewMode with "kanban" when Kanban button is clicked', async () => {
      render(<ViewToggle />);
      const kanbanButton = screen.getByText('Kanban');
      await userEvent.click(kanbanButton);

      expect(mockSetViewMode).toHaveBeenCalledWith('kanban');
    });

    it('calls setViewMode with "list" when List button is clicked', async () => {
      render(<ViewToggle />);
      const listButton = screen.getByText('List');
      await userEvent.click(listButton);

      expect(mockSetViewMode).toHaveBeenCalledWith('list');
    });
  });

  describe('Store Integration', () => {
    it('retrieves current viewMode from store', () => {
      (useBoardStore as jest.Mock).mockReturnValue({
        viewMode: 'kanban',
        setViewMode: mockSetViewMode,
      });

      render(<ViewToggle />);
      expect(useBoardStore).toHaveBeenCalled();
    });

    it('updates store when view mode changes', async () => {
      render(<ViewToggle />);
      await userEvent.click(screen.getByText('Kanban'));

      expect(mockSetViewMode).toHaveBeenCalledWith('kanban');
    });
  });
});
