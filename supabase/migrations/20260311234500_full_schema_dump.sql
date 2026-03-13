-- [BASE SCHEMA DUMP]
-- Extracted from remote database for Testcontainers migration.
-- Last updated: 2026-03-12
-- Includes: item_claims table, updated RLS policies, search function, triggers

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles (Supabase standard)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'postgres';
  END IF;
END
$$;

GRANT anon, authenticated, service_role TO authenticator;

-- Schemas
CREATE SCHEMA IF NOT EXISTS auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  username text UNIQUE,
  avatar_theme text,
  packing_style text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Trips
CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  title text NOT NULL,
  destination text NOT NULL,
  date_start date NOT NULL,
  date_end date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  is_archived boolean DEFAULT false NOT NULL
);

-- Trip Members
CREATE TABLE IF NOT EXISTS public.trip_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(trip_id, user_id)
);

-- Items (NOTE: status and assigned_to columns removed - use item_claims instead)
CREATE TABLE IF NOT EXISTS public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  required_count integer DEFAULT 1,
  category text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Item Claims (for multi-player mode - supports multiple claims per item)
CREATE TABLE IF NOT EXISTS public.item_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  quantity integer DEFAULT 1 NOT NULL CHECK (quantity > 0),
  is_packed boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(item_id, user_id)
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Updated at trigger handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Username availability check
CREATE OR REPLACE FUNCTION public.check_username_available(username_to_check text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE LOWER(username) = LOWER(username_to_check)
  );
$function$;

-- New user profile creation handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, avatar_theme, packing_style)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'avatar_theme',
    new.raw_user_meta_data->>'packing_style'
  );
  RETURN new;
END;
$function$;

-- RLS helper: Check if user is a member of a trip
CREATE OR REPLACE FUNCTION public.is_member_of(trip_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = trip_uuid AND user_id = auth.uid()
  );
$function$;

-- RLS helper: Check if user is an admin of a trip
CREATE OR REPLACE FUNCTION public.is_admin_of(trip_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM trip_members WHERE trip_id = trip_uuid AND user_id = auth.uid() AND role = 'admin'
  );
$function$;

-- ISSUE-#45: User search function for member invite
CREATE OR REPLACE FUNCTION public.search_users_by_username(search_query TEXT)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  username TEXT,
  avatar_theme TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.username, p.avatar_theme
  FROM public.profiles p
  WHERE LENGTH(TRIM(search_query)) >= 3
    AND (
      LOWER(p.username) LIKE '%' || LOWER(TRIM(search_query)) || '%'
      OR LOWER(p.full_name) LIKE '%' || LOWER(TRIM(search_query)) || '%'
    )
    AND p.id != auth.uid()  -- Exclude current user from results
  ORDER BY
    CASE
      WHEN LOWER(p.username) = LOWER(TRIM(search_query)) THEN 1
      WHEN LOWER(p.username) LIKE LOWER(TRIM(search_query)) || '%' THEN 2
      ELSE 3
    END, p.username ASC
  LIMIT 10;
END;
$$;

-- Auto-enable RLS on new tables (event trigger)
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.search_users_by_username(TEXT) TO authenticated;

-- ============================================================================
-- RLS ACTIVATION
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_claims ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Profiles RLS Policies
-- -----------------------------------------------------------------------------

-- ISSUE-#45: Users can view own profile and trip members' profiles
CREATE POLICY "Users can view own profile and trip members' profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR
  EXISTS (
    SELECT 1
    FROM public.trip_members AS tm1
    WHERE tm1.user_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.trip_members AS tm2
        WHERE tm2.trip_id = tm1.trip_id
          AND tm2.user_id = profiles.id
      )
  )
);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
TO public
USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- Trips RLS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "trips_select" ON public.trips
FOR SELECT
TO authenticated
USING ((created_by = auth.uid()) OR (is_member_of(id) AND (is_archived = false)));

CREATE POLICY "trips_insert" ON public.trips
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trips_update" ON public.trips
FOR UPDATE
TO authenticated
USING ((created_by = auth.uid()) OR is_admin_of(id))
WITH CHECK ((created_by = auth.uid()) OR is_admin_of(id));

CREATE POLICY "trips_delete" ON public.trips
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- -----------------------------------------------------------------------------
-- Trip Members RLS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "trip_members_select" ON public.trip_members
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR is_member_of(trip_id) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_members.trip_id) AND (trips.created_by = auth.uid())))));

CREATE POLICY "trip_members_insert" ON public.trip_members
FOR INSERT
TO authenticated
WITH CHECK (is_admin_of(trip_id) OR ((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_members.trip_id) AND (trips.created_by = auth.uid()))))));

CREATE POLICY "trip_members_update" ON public.trip_members
FOR UPDATE
TO authenticated
USING (is_admin_of(trip_id))
WITH CHECK (is_admin_of(trip_id));

CREATE POLICY "trip_members_delete" ON public.trip_members
FOR DELETE
TO authenticated
USING ((user_id = auth.uid()) OR is_admin_of(trip_id) OR (EXISTS ( SELECT 1
   FROM trips
  WHERE ((trips.id = trip_members.trip_id) AND (trips.created_by = auth.uid())))));

-- -----------------------------------------------------------------------------
-- Items RLS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "items_select" ON public.items
FOR SELECT
TO authenticated
USING (is_member_of(trip_id) OR (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));

CREATE POLICY "items_insert" ON public.items
FOR INSERT
TO authenticated
WITH CHECK (is_admin_of(trip_id) OR (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));

CREATE POLICY "items_update" ON public.items
FOR UPDATE
TO authenticated
USING (is_admin_of(trip_id) OR (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))))
WITH CHECK (is_admin_of(trip_id) OR (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));

CREATE POLICY "items_delete" ON public.items
FOR DELETE
TO authenticated
USING (is_admin_of(trip_id) OR (EXISTS ( SELECT 1
   FROM trips t
  WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));

-- -----------------------------------------------------------------------------
-- Item Claims RLS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "item_claims_select" ON public.item_claims
FOR SELECT
TO authenticated
USING (EXISTS ( SELECT 1
   FROM items i
  WHERE ((i.id = item_claims.item_id) AND (is_member_of(i.trip_id) OR (EXISTS ( SELECT 1
           FROM trips t
          WHERE ((t.id = i.trip_id) AND (t.created_by = auth.uid()))))))));

CREATE POLICY "item_claims_insert" ON public.item_claims
FOR INSERT
TO authenticated
WITH CHECK (((user_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM items i
  WHERE ((i.id = item_claims.item_id) AND (is_member_of(i.trip_id) OR (EXISTS ( SELECT 1
           FROM trips t
          WHERE ((t.id = i.trip_id) AND (t.created_by = auth.uid()))))))))));

CREATE POLICY "item_claims_update" ON public.item_claims
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "item_claims_delete" ON public.item_claims
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Profile updated_at trigger
CREATE TRIGGER on_profile_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();

-- Auth user created trigger (in auth schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- EVENT TRIGGERS
-- ============================================================================

-- Auto-enable RLS on new tables
DROP EVENT TRIGGER IF EXISTS on_table_created;
CREATE EVENT TRIGGER on_table_created
ON ddl_command_end
WHEN tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
EXECUTE FUNCTION rls_auto_enable();
