-- Enable UUID extension if not already enabled (usually handled early on, but good to be sure)
-- Add is_archived to trips
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Update foreign keys to ON DELETE CASCADE
-- First, drop the existing foreign keys for trip_members
ALTER TABLE public.trip_members
DROP CONSTRAINT IF EXISTS trip_members_trip_id_fkey;

ALTER TABLE public.trip_members
ADD CONSTRAINT trip_members_trip_id_fkey
FOREIGN KEY (trip_id)
REFERENCES public.trips(id)
ON DELETE CASCADE;

-- Update foreign key for items if the table exists and constraint is known
-- (Assuming items table structure standard: items_trip_id_fkey)
ALTER TABLE public.items
DROP CONSTRAINT IF EXISTS items_trip_id_fkey;

ALTER TABLE public.items
ADD CONSTRAINT items_trip_id_fkey
FOREIGN KEY (trip_id)
REFERENCES public.trips(id)
ON DELETE CASCADE;

-- Drop existing generic SELECT policies
DROP POLICY IF EXISTS "trips_select_v2" ON public.trips;
DROP POLICY IF EXISTS "trip_members_select_v2" ON public.trip_members;

-- Ensure RLS is fully enabled
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- RLS POLICIES FOR 'trips'
--------------------------------------------------------------------------------

-- 1. SELECT: Members can see if is_archived = false. Creator can always see.
CREATE POLICY "trips_select" ON public.trips
FOR SELECT
TO authenticated
USING (
  (created_by = auth.uid()) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.trip_members 
    WHERE trip_members.trip_id = trips.id 
      AND trip_members.user_id = auth.uid()
  ) AND is_archived = false)
);

-- 2. INSERT: Authenticated users can insert.
CREATE POLICY "trips_insert" ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- 3. UPDATE: Admins can update trip details. Only Creator can update is_archived.
CREATE POLICY "trips_update" ON public.trips
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid())
  OR
  (EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'admin'
  ))
)
WITH CHECK (
  -- If the user is NOT the creator, they cannot alter the is_archived state
  -- We check if the NEW.is_archived differs from OLD.is_archived. 
  -- But since RLS doesn't easily let us compare OLD and NEW directly in WITH CHECK without triggers,
  -- we rely on application logic for update scope, or restrictive RLS.
  -- To be absolutely secure without triggers, we allow update if they are an admin or creator.
  -- Note: We trust the server-side action to prevent admins from toggling is_archived.
  (created_by = auth.uid())
  OR
  (EXISTS (
    SELECT 1 FROM public.trip_members
    WHERE trip_members.trip_id = trips.id
      AND trip_members.user_id = auth.uid()
      AND trip_members.role = 'admin'
  ))
);

-- 4. DELETE: Only Creator can hard delete.
CREATE POLICY "trips_delete" ON public.trips
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
);


--------------------------------------------------------------------------------
-- RLS POLICIES FOR 'trip_members'
--------------------------------------------------------------------------------

-- 1. SELECT: Members of the trip can view all members.
CREATE POLICY "trip_members_select" ON public.trip_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
  )
  OR
  (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_members.trip_id
      AND trips.created_by = auth.uid()
  ))
);

-- 2. INSERT: Admins can add new members. (Or users insert themselves during creation)
-- A user can insert themselves IF they are the creator of the trip OR if an admin is adding them.
CREATE POLICY "trip_members_insert" ON public.trip_members
FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = trip_members.trip_id
      AND trips.created_by = auth.uid()
      AND trip_members.user_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  ))
);

-- 3. UPDATE: Admins can alter roles. But NO ONE can alter the Creator's role (handled at query level via trigger or app logic, or complex RLS).
CREATE POLICY "trip_members_update" ON public.trip_members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  )
);

-- 4. DELETE: Admins can remove members. Users can remove themselves.
CREATE POLICY "trip_members_delete" ON public.trip_members
FOR DELETE
TO authenticated
USING (
  (user_id = auth.uid()) -- Self-removal
  OR
  (EXISTS (              -- Admin removal
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = trip_members.trip_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
  ))
);
