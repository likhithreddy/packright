-- Fix items_insert RLS policy to enforce admin-only access
-- This addresses the security vulnerability where ANY trip member could create items

-- Drop the existing insecure policy
DROP POLICY IF EXISTS "items_insert" ON public.items;

-- Create admin-only policy
CREATE POLICY "items_insert" ON public.items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = items.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  )
);

-- Verify the new policy
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'items';
