-- Migration: Allow Admins to pack/unpack and remove any claim in a trip
-- Issue: #47

-- 1. Update RLS for item_claims UPDATE
DROP POLICY IF EXISTS "item_claims_update" ON public.item_claims;
CREATE POLICY "item_claims_update" ON public.item_claims
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.is_admin_of(trip_id)
)
WITH CHECK (
  user_id = auth.uid()
  OR
  public.is_admin_of(trip_id)
);

-- 2. Update RLS for item_claims DELETE
DROP POLICY IF EXISTS "item_claims_delete" ON public.item_claims;
CREATE POLICY "item_claims_delete" ON public.item_claims
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR
  public.is_admin_of(trip_id)
);

-- 3. Note: item_claims_insert already allows admins to create claims for themselves,
-- but typically they claim items for themselves like any other member.
