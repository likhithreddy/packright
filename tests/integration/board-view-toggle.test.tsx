import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardViewToggle } from '../../src/components/features/board-view-toggle';
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

describe('BoardViewToggle Integration', () => {
  const mockSetBoardViewMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useBoardStore as jest.Mock).mockReturnValue({
      boardViewMode: 'my-view',
      setBoardViewMode: mockSetBoardViewMode,
    });
  });

  describe('Rendering', () => {
    it('renders toggle container', () => {
      const { container } = render(<BoardViewToggle />);
      const toggleContainer = container.firstChild;
      expect(toggleContainer).toBeInTheDocument();
    });

    it('renders My View button', () => {
      render(<BoardViewToggle />);
      expect(screen.getByText('My View')).toBeInTheDocument();
    });

    it('renders All Items button', () => {
      render(<BoardViewToggle />);
      expect(screen.getByText('All Items')).toBeInTheDocument();
    });

    it('applies active styling to My View button when boardViewMode is my-view', () => {
      (useBoardStore as jest.Mock).mockReturnValue({
        boardViewMode: 'my-view',
        setBoardViewMode: mockSetBoardViewMode,
      });

      render(<BoardViewToggle />);
      const myViewButton = screen.getByText('My View');
      expect(myViewButton.parentElement).toHaveClass('bg-white');
    });

    it('applies active styling to All Items button when boardViewMode is all-items-view', () => {
      (useBoardStore as jest.Mock).mockReturnValue({
        boardViewMode: 'all-items-view',
        setBoardViewMode: mockSetBoardViewMode,
      });

      render(<BoardViewToggle />);
      const allItemsButton = screen.getByText('All Items');
      expect(allItemsButton.parentElement).toHaveClass('bg-white');
    });
  });

  describe('Interactions', () => {
    it('calls setBoardViewMode with "my-view" when My View button is clicked', async () => {
      render(<BoardViewToggle />);
      const myViewButton = screen.getByText('My View');
      await userEvent.click(myViewButton);

      expect(mockSetBoardViewMode).toHaveBeenCalledWith('my-view');
    });

    it('calls setBoardViewMode with "all-items-view" when All Items button is clicked', async () => {
      render(<BoardViewToggle />);
      const allItemsButton = screen.getByText('All Items');
      await userEvent.click(allItemsButton);

      expect(mockSetBoardViewMode).toHaveBeenCalledWith('all-items-view');
    });
  });

  describe('Store Integration', () => {
    it('retrieves current boardViewMode from store', () => {
      (useBoardStore as jest.Mock).mockReturnValue({
        boardViewMode: 'all-items-view',
        setBoardViewMode: mockSetBoardViewMode,
      });

      render(<BoardViewToggle />);
      expect(useBoardStore).toHaveBeenCalled();
    });

    it('updates store when board view mode changes', async () => {
      render(<BoardViewToggle />);
      await userEvent.click(screen.getByText('My View'));

      expect(mockSetBoardViewMode).toHaveBeenCalledWith('my-view');
    });
  });
});
