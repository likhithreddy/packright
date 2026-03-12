CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    required_count INTEGER DEFAULT 1 NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('needed', 'claimed', 'packed')),
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Members can see all items for their trips.
CREATE POLICY "items_select" ON public.items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = items.trip_id
      AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);

-- 2. INSERT: Members can add items to trips they belong to.
CREATE POLICY "items_insert" ON public.items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = items.trip_id
      AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);

-- 3. UPDATE: Members can update items in their trips (e.g. changing category, name, or status).
CREATE POLICY "items_update" ON public.items
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = items.trip_id
      AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = items.trip_id
      AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);

-- 4. DELETE: Members can delete items in their trips.
CREATE POLICY "items_delete" ON public.items
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trip_members AS tm
    WHERE tm.trip_id = items.trip_id
      AND tm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.trips AS t
    WHERE t.id = items.trip_id
      AND t.created_by = auth.uid()
  )
);
