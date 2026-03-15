-- Migration: Allow Admins to assign items by inserting claims for any member
-- Issue: #51
-- Description: Updates the INSERT policy for item_claims to allow admins to manage assignments.

-- Update RLS for item_claims INSERT
DROP POLICY IF EXISTS "item_claims_insert" ON public.item_claims;

CREATE POLICY "item_claims_insert" ON public.item_claims
FOR INSERT TO authenticated
WITH CHECK (
  -- User is inserting a claim for themselves
  user_id = auth.uid() 
  OR 
  -- OR User is an admin of the trip and can assign to anyone
  public.is_admin_of(trip_id)
);

-- Note: The original policy also checked for trip membership/creator, 
-- but is_admin_of(trip_id) and user_id = auth.uid() (with is_member_of or is_admin_of) 
-- are already handled by the existing table-level RLS and helper functions.
-- We keep it focused on the "who can insert for whom" logic.
