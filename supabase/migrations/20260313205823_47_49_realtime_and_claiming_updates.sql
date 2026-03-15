-- Migration: Add trip_id to item_claims and sort_order to items/item_claims
-- Issue #47: Vertical reordering persistence
-- Issue #49: Realtime subscription efficiency

-- 1. Add sort_order to items
ALTER TABLE public.items ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL;

-- 2. Add trip_id and sort_order to item_claims
ALTER TABLE public.item_claims ADD COLUMN trip_id UUID;
ALTER TABLE public.item_claims ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL;

-- Populate trip_id from items
UPDATE public.item_claims
SET trip_id = items.trip_id
FROM public.items
WHERE item_claims.item_id = items.id;

-- Make trip_id NOT NULL and add FK
ALTER TABLE public.item_claims ALTER COLUMN trip_id SET NOT NULL;
ALTER TABLE public.item_claims ADD CONSTRAINT item_claims_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id) ON DELETE CASCADE;

-- 3. Update RLS Policies for item_claims to use trip_id directly
-- This enables efficient server-side filtering for Realtime subscriptions
DROP POLICY IF EXISTS "item_claims_select" ON public.item_claims;
CREATE POLICY "item_claims_select" ON public.item_claims
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members tm
    WHERE tm.trip_id = item_claims.trip_id
      AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips t
    WHERE t.id = item_claims.trip_id
      AND t.created_by = auth.uid()
  )
);

-- Similarly update INSERT policy
DROP POLICY IF EXISTS "item_claims_insert" ON public.item_claims;
CREATE POLICY "item_claims_insert" ON public.item_claims
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND (
    EXISTS (
      SELECT 1 FROM public.trip_members tm
      WHERE tm.trip_id = item_claims.trip_id
        AND tm.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = item_claims.trip_id
        AND t.created_by = auth.uid()
    )
  )
);

-- Add index for performance on realtime filter
CREATE INDEX IF NOT EXISTS idx_item_claims_trip_id ON public.item_claims(trip_id);
