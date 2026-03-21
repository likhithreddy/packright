'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { KanbanBoard } from './kanban-board';
import { ListView } from './list-view';
import { ClaimQuantityDialog } from './claim-quantity-dialog';
import { EditItemDialog } from './edit-item-dialog';
import { DeleteConfirmationDialog } from './delete-confirmation-dialog';
import { UnclaimDialog } from './unclaim-dialog';
import { AddItemDialog } from './add-item-dialog';
import { useBoardStore } from '@/store/board-store';
import { AlertTriangle } from 'lucide-react';
import {
  getTripItems,
  subscribeToItemClaims,
  subscribeToTripItems,
  updateItem,
  deleteItem,
  createItem,
} from '@/lib/supabase/items';
import { Trip, KanbanColumn, ItemWithClaims, ItemClaim } from '@/types/database.types';
import { UserProfile } from '@/lib/utils';

// Type for Supabase trip_members query result
type TripMemberWithProfile = {
  user_id: string;
  profiles: Array<{
    full_name: string | null;
    username: string | null;
    avatar_theme: string | null;
  }> | null;
};

export interface PackingBoardProps {
  currentUserId?: string;
  initialTrip?: Trip | null;
  currentUserIsAdmin?: boolean;
}

export function PackingBoard({
  currentUserId: propCurrentUserId,
  initialTrip,
  currentUserIsAdmin,
}: PackingBoardProps) {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const supabase = React.useMemo(() => createClient(), []);

  const {
    items,
    columns,
    isLoading,
    error,
    currentUserId,
    viewMode,
    boardViewMode,
    isAdmin,
    setTripId,
    setItems,
    setCurrentUserId,
    setCurrentUserProfile,
    setIsAdmin,
    claimItem,
    markAsPacked,
    unclaimItem,
    moveItem,
    reorderItem,
    persistReorder,
    setLoading,
    setError,
  } = useBoardStore();

  // State for claim dialog
  const [claimDialogOpen, setClaimDialogOpen] = React.useState(false);
  const [claimingItemId, setClaimingItemId] = React.useState<string | null>(null);

  // State for edit dialog
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null);

  // State for delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [deletingItemId, setDeletingItemId] = React.useState<string | null>(null);

  // State for unclaim dialog
  const [unclaimDialogOpen, setUnclaimDialogOpen] = React.useState(false);
  const [unclaimingClaimId, setUnclaimingClaimId] = React.useState<string | null>(null);
  const [unclaimingClaimQuantity, setUnclaimingClaimQuantity] = React.useState(0);

  // State for add item dialog
  const [addItemDialogOpen, setAddItemDialogOpen] = React.useState(false);

  // State for trip data - initialize with prop if available
  const [trip, setTrip] = React.useState<Trip | null>(initialTrip || null);
  // Note: members state is kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [members, setMembers] = React.useState<Array<UserProfile & { id: string }>>([]);

  // Load trip data
  const loadTripData = React.useCallback(
    async (silent = false) => {
      if (!tripId || !currentUserId) return;

      if (!silent) setLoading(true);
      setError(null);

      try {
        // Only fetch trip details if we don't already have it from props
        if (!trip) {
          const { data: tripData, error: tripError } = await supabase
            .from('trips')
            .select('*')
            .eq('id', tripId)
            .single();

          if (tripError) {
            if (tripError.code === 'PGRST116') {
              // Trip not found
              router.push('/dashboard');
              return;
            }
            throw tripError;
          }

          setTrip(tripData as Trip);
        }

        // Only check admin status if not provided via prop
        if (currentUserIsAdmin === undefined) {
          const { data: memberData } = await supabase
            .from('trip_members')
            .select('role')
            .eq('trip_id', tripId)
            .eq('user_id', currentUserId)
            .single();

          setIsAdmin(memberData?.role === 'admin');
        }

        // Fetch trip members with their profiles
        const { data: membersData } = await supabase
          .from('trip_members')
          .select('user_id, profiles(full_name, username, avatar_theme)')
          .eq('trip_id', tripId);

        if (membersData) {
          const membersList = membersData.map((m: TripMemberWithProfile) => ({
            id: m.user_id,
            full_name: m.profiles?.[0]?.full_name || null,
            username: m.profiles?.[0]?.username || null,
            avatar_theme: m.profiles?.[0]?.avatar_theme || null,
          }));
          setMembers(membersList);

          // Sync current user's profile with store
          const currentUserProfile = membersList.find((m) => m.id === currentUserId);
          if (currentUserProfile) {
            setCurrentUserProfile({
              full_name: currentUserProfile.full_name,
              username: currentUserProfile.username,
              avatar_theme: currentUserProfile.avatar_theme,
            });
          }
        }

        // Fetch items with claims
        const { data: itemsData, error: itemsError } = await getTripItems(supabase, tripId);

        if (itemsError) {
          throw itemsError;
        }

        setItems(itemsData || []);
      } catch (err) {
        console.error('Failed to load trip data:', err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
              ? (err as { message: string }).message
              : 'Failed to load trip data';
        setError(errorMessage);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [
      tripId,
      currentUserId,
      supabase,
      setLoading,
      setError,
      setItems,
      setIsAdmin,
      setCurrentUserProfile,
      router,
    ]
  );

  // Set up trip ID on mount
  React.useEffect(() => {
    setTripId(tripId);
  }, [tripId, setTripId]);

  // Get current user with retry logic for E2E test compatibility
  // Use prop if available (server-side data), otherwise fetch client-side
  React.useEffect(() => {
    // If currentUserId is provided as prop, use it immediately
    if (propCurrentUserId) {
      setCurrentUserId(propCurrentUserId);

      // Set admin status if provided as prop
      if (currentUserIsAdmin !== undefined) {
        setIsAdmin(currentUserIsAdmin);
      }

      // Fetch profile if we have the user ID
      const fetchProfile = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_theme')
          .eq('id', propCurrentUserId)
          .single();

        if (profile) {
          setCurrentUserProfile(profile);
        }
      };
      fetchProfile();
      return;
    }

    // Otherwise, fall back to client-side fetch with retry logic
    const getCurrentUser = async (retries = 5) => {
      for (let i = 0; i < retries; i++) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);

          // Fetch profile immediately to avoid UE glitch
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username, avatar_theme')
            .eq('id', user.id)
            .single();

          if (profile) {
            setCurrentUserProfile(profile);
          }
          return;
        }
        // Wait 500ms before retrying (only if we have retries left)
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      // If we've exhausted retries, log a warning but don't throw
      // The loading state will handle showing an error to the user
      console.warn('[PackingBoard] Failed to get authenticated user after retries');
    };
    getCurrentUser();
  }, [
    supabase,
    setCurrentUserId,
    setCurrentUserProfile,
    propCurrentUserId,
    currentUserIsAdmin,
    setIsAdmin,
  ]);

  // Load trip data when tripId and currentUserId are set
  React.useEffect(() => {
    if (tripId && currentUserId) {
      loadTripData();
    }
  }, [tripId, currentUserId, loadTripData]);

  // Use a ref for debouncing loadTripData calls from subscriptions
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const debouncedLoadData = React.useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadTripData(true);
    }, 500); // 500ms debounce
  }, [loadTripData]);

  // Set up realtime subscriptions
  React.useEffect(() => {
    if (!tripId || !currentUserId) return;

    const itemsChannel = subscribeToTripItems(supabase, tripId, debouncedLoadData);
    const claimsChannel = subscribeToItemClaims(supabase, tripId, debouncedLoadData);

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(claimsChannel);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [tripId, currentUserId, supabase, debouncedLoadData]);

  // Handle claim button click
  const handleClaimClick = async (itemId: string) => {
    const item = items.find((i: ItemWithClaims) => i.id === itemId);
    if (!item) return;

    if (item.claim_type === 'single') {
      const remaining = Math.max(item.required_count - item.total_claimed, 0);
      if (remaining > 0) {
        await handleClaimConfirm(remaining, itemId);
      }
      return;
    }

    setClaimingItemId(itemId);
    setClaimDialogOpen(true);
  };

  // Handle claim confirmation
  const handleClaimConfirm = async (quantity: number, itemIdOverride?: string) => {
    const idToClaim = itemIdOverride || claimingItemId;
    if (!idToClaim) return;

    await claimItem(idToClaim, quantity);
    setClaimingItemId(null);
    setClaimDialogOpen(false);
    // Force immediate silent reload as a fallback for realtime
    await loadTripData(true);
  };

  // Handle mark packed
  const handleMarkPacked = async (claimId: string) => {
    try {
      await markAsPacked(claimId);
      await loadTripData(true);
    } catch (err) {
      console.error('Failed to mark as packed:', err);
    }
  };

  // Handle unclaim
  const handleUnclaim = async (claimId: string, quantity: number) => {
    const item = items.find((i: ItemWithClaims) =>
      i.claims.some((c: ItemClaim) => c.id === claimId)
    );

    if (item?.claim_type === 'single') {
      await handleUnclaimConfirm(quantity, claimId);
      return;
    }

    setUnclaimingClaimId(claimId);
    setUnclaimingClaimQuantity(quantity);
    setUnclaimDialogOpen(true);
  };

  // Handle unclaim confirmation
  const handleUnclaimConfirm = async (quantity: number, claimIdOverride?: string) => {
    const idToUnclaim = claimIdOverride || unclaimingClaimId;
    if (!idToUnclaim) return;

    try {
      await unclaimItem(idToUnclaim, quantity);
      setUnclaimingClaimId(null);
      setUnclaimingClaimQuantity(0);
      setUnclaimDialogOpen(false);
      // Force immediate silent reload as a fallback for realtime
      await loadTripData(true);
    } catch (err) {
      console.error('Failed to unclaim item:', err);
    }
  };

  // Handle edit item
  const handleEditItem = (itemId: string) => {
    setEditingItemId(itemId);
    setEditDialogOpen(true);
  };

  // Handle edit save
  const handleEditSave = async (
    name: string,
    requiredCount: number,
    claimType: 'single' | 'multiple'
  ) => {
    if (!editingItemId) return;

    try {
      const { error } = await updateItem(supabase, editingItemId, {
        name,
        required_count: requiredCount,
        claim_type: claimType,
      });

      if (error) {
        setError(error.message);
        throw error;
      } else {
        setEditingItemId(null);
        await loadTripData(true);
      }
    } catch (err) {
      console.error('Failed to edit item:', err);
      throw err;
    }
  };

  // Handle delete item
  const handleDeleteItem = (itemId: string) => {
    setDeletingItemId(itemId);
    setDeleteDialogOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deletingItemId) return;

    try {
      const { error } = await deleteItem(supabase, deletingItemId);
      if (error) {
        setError(error.message);
      } else {
        setDeletingItemId(null);
        await loadTripData(true);
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  // Handle add item
  const handleAddItem = async (
    name: string,
    requiredCount: number,
    category: string,
    claimType: 'single' | 'multiple'
  ) => {
    if (!tripId) {
      setError('No trip selected');
      throw new Error('No trip selected');
    }

    try {
      const { error } = await createItem(supabase, tripId, {
        name,
        required_count: requiredCount,
        category,
        claim_type: claimType,
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      // Reload trip data to show the new item
      await loadTripData(true);
    } catch (err) {
      console.error('Failed to add item:', err);
      throw err;
    }
  };

  // Handle move item (drag and drop)
  const handleMoveItem = async (itemId: string, fromColumn: string, toColumn: string) => {
    try {
      await moveItem(itemId, fromColumn as KanbanColumn, toColumn as KanbanColumn);
      await loadTripData(true);
    } catch (err) {
      console.error('Failed to move item:', err);
    }
  };

  // Calculate stats for parent component
  const totalItems = items.length;
  const totalRequiredCount = items.reduce((sum, item) => sum + item.required_count, 0);
  const totalClaimedCount = items.reduce((sum, item) => sum + item.total_claimed, 0);
  const totalPackedCount = items.reduce((sum, item) => sum + item.total_packed, 0);
  const unassignedItemsCount = items.filter(
    (item) => item.total_claimed < item.required_count
  ).length;

  const percentClaimed =
    totalRequiredCount > 0 ? Math.round((totalClaimedCount / totalRequiredCount) * 100) : 0;
  const percentPacked =
    totalRequiredCount > 0 ? Math.round((totalPackedCount / totalRequiredCount) * 100) : 0;

  // Expose stats via a ref or callback for parent (TripDashboardClient)
  React.useEffect(() => {
    if (trip) {
      window.dispatchEvent(
        new CustomEvent('tripStatsUpdate', {
          detail: {
            trip,
            totalItems,
            percentClaimed,
            percentPacked,
            unassignedItems: unassignedItemsCount,
          },
        })
      );
    }
  }, [trip, totalItems, percentClaimed, percentPacked, unassignedItemsCount]);

  // Loading state
  if (isLoading || !trip) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF8]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#2D3A30] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-stone-500">Loading packing board...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FAFAF8]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="size-8 text-red-600" />
          </div>
          <h2 className="font-serif text-xl text-[#2D3A30] mb-2">Failed to Load Board</h2>
          <p className="text-stone-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-[#2D3A30] hover:bg-[#1f2821] text-white rounded-full px-6 py-2 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get item for claim dialog
  const claimingItem = claimingItemId ? items.find((i) => i.id === claimingItemId) : null;
  const remainingNeeded = claimingItem
    ? Math.max(claimingItem.required_count - claimingItem.total_claimed, 1)
    : 1;

  // Get item for edit dialog
  const editingItem = editingItemId ? items.find((i) => i.id === editingItemId) : null;

  // Get item for delete dialog
  const deletingItem = deletingItemId ? items.find((i) => i.id === deletingItemId) : null;

  // Render board based on view mode
  const renderBoard = () => {
    if (viewMode === 'list') {
      return (
        <ListView
          items={items}
          columns={columns}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          boardViewMode={boardViewMode}
          onClaim={handleClaimClick}
          onUnclaim={handleUnclaim}
          onMarkPacked={handleMarkPacked}
          onEditItem={handleEditItem}
          onDeleteItem={handleDeleteItem}
        />
      );
    }

    return (
      <KanbanBoard
        items={items}
        columns={columns}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onClaim={handleClaimClick}
        onMarkPacked={handleMarkPacked}
        onUnclaim={handleUnclaim}
        onEditItem={handleEditItem}
        onDeleteItem={handleDeleteItem}
        onMoveItem={handleMoveItem}
        onReorderItem={reorderItem}
        onPersistReorder={persistReorder}
        onAddItem={() => setAddItemDialogOpen(true)}
      />
    );
  };

  return (
    <div className="flex-1 min-h-0 h-full overflow-hidden">
      {renderBoard()}

      {/* Claim Dialog */}
      <ClaimQuantityDialog
        open={claimDialogOpen}
        onOpenChange={setClaimDialogOpen}
        itemName={claimingItem?.name || ''}
        remainingNeeded={remainingNeeded}
        onConfirm={handleClaimConfirm}
      />

      {/* Edit Dialog */}
      <EditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        itemName={editingItem?.name || ''}
        requiredCount={editingItem?.required_count || 1}
        claimType={editingItem?.claim_type || 'single'}
        onSave={handleEditSave}
      />

      {/* Delete Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={deletingItem?.name || ''}
        requiredCount={deletingItem?.required_count || 1}
        onConfirm={handleDeleteConfirm}
      />

      {/* Unclaim Dialog */}
      <UnclaimDialog
        open={unclaimDialogOpen}
        onOpenChange={setUnclaimDialogOpen}
        itemName={
          items.find((i: ItemWithClaims) =>
            i.claims.some((c: ItemClaim) => c.id === unclaimingClaimId)
          )?.name || ''
        }
        claimedQuantity={unclaimingClaimQuantity}
        onConfirm={handleUnclaimConfirm}
      />

      {/* Add Item Dialog - Admin only */}
      {isAdmin && (
        <AddItemDialog
          open={addItemDialogOpen}
          onOpenChange={setAddItemDialogOpen}
          onSave={handleAddItem}
        />
      )}
    </div>
  );
}
