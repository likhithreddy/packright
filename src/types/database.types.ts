export interface Trip {
  id: string;
  created_by: string;
  title: string;
  destination: string;
  date_start: string;
  date_end: string;
  is_archived: boolean;
  created_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
}

export interface Item {
  id: string;
  trip_id: string;
  name: string;
  required_count: number;
  category: string;
  claim_type: 'single' | 'multiple';
  sort_order: number;
  created_at: string;
}

export interface ItemClaim {
  id: string;
  item_id: string;
  trip_id: string;
  user_id: string;
  quantity: number;
  is_packed: boolean;
  sort_order: number;
  created_at: string;
  // Profile information joined from profiles table (array to match Supabase nested select format)
  profiles?: Array<{
    full_name: string | null;
    username: string | null;
    avatar_theme: string | null;
  }> | null;
}

export interface ItemWithClaims extends Item {
  claims: ItemClaim[];
  total_claimed: number;
  total_packed: number;
}

export type KanbanColumn = 'unassigned' | 'claimed' | 'packed';
