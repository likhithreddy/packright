import type { ItemWithClaims, KanbanColumn } from './database.types';

export type ViewMode = 'kanban' | 'list';
export type BoardViewMode = 'my-view' | 'all-items-view';

export interface BoardState {
  tripId: string | null;
  items: ItemWithClaims[];
  columns: Record<KanbanColumn, string[]>;
  isLoading: boolean;
  error: string | null;
  currentUserId: string | null;
  viewMode: ViewMode;
  boardViewMode: BoardViewMode;
  isAdmin: boolean;
  readinessPercentage: number | null;
  currentUserProfile: {
    full_name: string | null;
    username: string | null;
    avatar_theme: string | null;
  } | null;
}

export interface BoardActions {
  setTripId: (tripId: string) => void;
  setItems: (items: ItemWithClaims[]) => void;
  moveItem: (itemId: string, fromColumn: KanbanColumn, toColumn: KanbanColumn) => void;
  reorderItem: (itemId: string, column: KanbanColumn, newIndex: number) => void;
  persistReorder: (column: KanbanColumn) => Promise<void>;
  claimItem: (itemId: string, quantity: number) => Promise<void>;
  markAsPacked: (claimId: string) => Promise<void>;
  markAsNotPacked: (claimId: string) => Promise<void>;
  unclaimItem: (claimId: string, quantity: number) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCurrentUserId: (userId: string) => void;
  setCurrentUserProfile: (
    profile: {
      full_name: string | null;
      username: string | null;
      avatar_theme: string | null;
    } | null
  ) => void;
  setViewMode: (mode: ViewMode) => void;
  setBoardViewMode: (mode: BoardViewMode) => void;
  setIsAdmin: (isAdmin: boolean) => void;
}

export type BoardStore = BoardState & BoardActions;
