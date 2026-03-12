-- Create non-recursive security definer functions to look up trip membership securely
CREATE OR REPLACE FUNCTION public.is_member_of(trip_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = trip_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(trip_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = trip_uuid AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- TRIPS POLICIES
DROP POLICY IF EXISTS "trips_select" ON public.trips;
DROP POLICY IF EXISTS "trips_insert" ON public.trips;
DROP POLICY IF EXISTS "trips_update" ON public.trips;
DROP POLICY IF EXISTS "trips_delete" ON public.trips;

-- 1. SELECT: Members can see if is_archived = false. Creator can always see.
CREATE POLICY "trips_select" ON public.trips
FOR SELECT
TO authenticated
USING (
  (created_by = auth.uid()) 
  OR 
  (public.is_member_of(id) AND is_archived = false)
);

-- 2. INSERT: Authenticated users can insert if they set themselves as creator.
CREATE POLICY "trips_insert" ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- 3. UPDATE: Admins can update trip details.
CREATE POLICY "trips_update" ON public.trips
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid()) OR public.is_admin_of(id)
)
WITH CHECK (
  (created_by = auth.uid()) OR public.is_admin_of(id)
);

-- 4. DELETE: Only Creator can hard delete.
CREATE POLICY "trips_delete" ON public.trips
FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
);

-- TRIP MEMBERS POLICIES
DROP POLICY IF EXISTS "trip_members_select" ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_insert" ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_update" ON public.trip_members;
DROP POLICY IF EXISTS "trip_members_delete" ON public.trip_members;

-- 1. SELECT: Members of the trip or the creator of the trip can view all members.
CREATE POLICY "trip_members_select" ON public.trip_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_member_of(trip_id) 
  OR EXISTS (SELECT 1 FROM trips WHERE id = trip_members.trip_id AND created_by = auth.uid())
);

-- 2. INSERT: Users can be added by an admin, OR can insert themselves if they created the trip.
CREATE POLICY "trip_members_insert" ON public.trip_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin_of(trip_id)
  OR
  (user_id = auth.uid() AND EXISTS (SELECT 1 FROM trips WHERE id = trip_members.trip_id AND created_by = auth.uid()))
);

-- 3. UPDATE: Admins can alter roles.
CREATE POLICY "trip_members_update" ON public.trip_members
FOR UPDATE
TO authenticated
USING (
  public.is_admin_of(trip_id)
)
WITH CHECK (
  public.is_admin_of(trip_id)
);

-- 4. DELETE: Admins can remove members. Users can remove themselves.
CREATE POLICY "trip_members_delete" ON public.trip_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.is_admin_of(trip_id)
  OR EXISTS (SELECT 1 FROM trips WHERE id = trip_members.trip_id AND created_by = auth.uid())
);
