-- Migration: Design Trip Members & Item Claims Schema
-- Issue: #44
-- Description: Supports multi-player mode by introducing item_claims and restricting item metadata management to admins.

-- 1. Create item_claims table to handle multi-contributions
CREATE TABLE IF NOT EXISTS public.item_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
    is_packed BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(item_id, user_id)
);

-- 2. Enable RLS on item_claims
ALTER TABLE public.item_claims ENABLE ROW LEVEL SECURITY;

-- 3. Decommission legacy singular assignment/status fields from items
ALTER TABLE public.items DROP COLUMN IF EXISTS assigned_to;
ALTER TABLE public.items DROP COLUMN IF EXISTS status;

-- 4. Update RLS Policies for items
-- Dropping existing policies to redefine with admin-only write restrictions
DROP POLICY IF EXISTS "items_select" ON public.items;
DROP POLICY IF EXISTS "items_insert" ON public.items;
DROP POLICY IF EXISTS "items_update" ON public.items;
DROP POLICY IF EXISTS "items_delete" ON public.items;

-- SELECT: Members of a trip can view all items (Using is_member_of helper)
CREATE POLICY "items_select" ON public.items
FOR SELECT
TO authenticated
USING (
  public.is_member_of(trip_id)
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);

-- INSERT: Only admins can add items to trips
CREATE POLICY "items_insert" ON public.items
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_of(trip_id)
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);

-- UPDATE: Only admins can manage item metadata (name, category, quantity)
CREATE POLICY "items_update" ON public.items
FOR UPDATE
TO authenticated
USING (
  public.is_admin_of(trip_id)
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
)
WITH CHECK (
  public.is_admin_of(trip_id)
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);

-- DELETE: Only admins can remove items
CREATE POLICY "items_delete" ON public.items
FOR DELETE
TO authenticated
USING (
  public.is_admin_of(trip_id)
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);

-- 5. RLS Policies for item_claims

-- SELECT: Trip members can view all claims for their trip
CREATE POLICY "item_claims_select" ON public.item_claims
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.items AS i
    WHERE i.id = item_claims.item_id
      AND (
        public.is_member_of(i.trip_id)
        OR
        EXISTS (
          SELECT 1 FROM public.trips AS t
          WHERE t.id = i.trip_id
            AND t.created_by = auth.uid()
        )
      )
  )
);

-- INSERT: Members can claim items as themselves
CREATE POLICY "item_claims_insert" ON public.item_claims
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  AND
  EXISTS (
    SELECT 1 FROM public.items AS i
    WHERE i.id = item_claims.item_id
      AND (
        public.is_member_of(i.trip_id)
        OR
        EXISTS (
          SELECT 1 FROM public.trips AS t
          WHERE t.id = i.trip_id
            AND t.created_by = auth.uid()
        )
      )
  )
);

-- UPDATE: Users can modify their own claims (e.g., mark is_packed or update quantity)
CREATE POLICY "item_claims_update" ON public.item_claims
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Users can remove their own claims
CREATE POLICY "item_claims_delete" ON public.item_claims
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
