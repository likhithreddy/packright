export interface Trip {
  id: string;
  created_by: string;
  title: string;
  destination: string;
  date_start: string;
  date_end: string;
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
  status: 'needed' | 'claimed' | 'packed';
  assigned_to: string | null;
  created_at: string;
}
