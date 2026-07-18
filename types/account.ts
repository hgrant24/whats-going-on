// Personal-features data shapes (Supabase tables)

export interface Tracker {
  id: string;
  name: string;      // human town name, e.g. "Warren, RI" (2–27 chars)
  region: string | null;
  tag: string;       // immutable submission tag, e.g. "trk_ab12cd34"
  created_at: string;
}

export interface TownRequest {
  id: string;
  town_name: string;
  region: string | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
