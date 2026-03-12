-- [BASE SCHEMA DUMP]
-- Extracted from remote database for Testcontainers migration.

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

-- Tables

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY,
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
  user_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(trip_id, user_id)
);

-- Items
CREATE TABLE IF NOT EXISTS public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  required_count integer DEFAULT 1,
  category text NOT NULL,
  status text DEFAULT 'needed'::text CHECK (status = ANY (ARRAY['needed'::text, 'claimed'::text, 'packed'::text])),
  assigned_to uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Custom Functions

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

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

-- RLS Logic Functions (Required for Policies)
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

-- RLS Activation
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trips
CREATE POLICY "trips_select" ON public.trips FOR SELECT USING (created_by = auth.uid() OR (is_member_of(id) AND is_archived = false));
CREATE POLICY "trips_insert" ON public.trips FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "trips_update" ON public.trips FOR UPDATE USING (created_by = auth.uid() OR is_admin_of(id));
CREATE POLICY "trips_delete" ON public.trips FOR DELETE USING (created_by = auth.uid());

-- Trip Members
CREATE POLICY "trip_members_select" ON public.trip_members FOR SELECT USING (user_id = auth.uid() OR is_member_of(trip_id) OR (EXISTS (SELECT 1 FROM trips WHERE id = trip_members.trip_id AND created_by = auth.uid())));
CREATE POLICY "trip_members_insert" ON public.trip_members FOR INSERT WITH CHECK (is_admin_of(trip_id) OR ((user_id = auth.uid()) AND (EXISTS (SELECT 1 FROM trips WHERE id = trip_members.trip_id AND created_by = auth.uid()))));
CREATE POLICY "trip_members_update" ON public.trip_members FOR UPDATE USING (is_admin_of(trip_id)) WITH CHECK (is_admin_of(trip_id));
CREATE POLICY "trip_members_delete" ON public.trip_members FOR DELETE USING (user_id = auth.uid() OR is_admin_of(trip_id) OR (EXISTS (SELECT 1 FROM trips WHERE id = trip_members.trip_id AND created_by = auth.uid())));

-- Items
CREATE POLICY "Users can view items of trips they are members of." ON public.items FOR SELECT USING (EXISTS (SELECT 1 FROM trip_members WHERE trip_id = items.trip_id AND user_id = auth.uid()));
CREATE POLICY "Trip members can insert items." ON public.items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM trip_members WHERE trip_id = items.trip_id AND user_id = auth.uid()));
CREATE POLICY "Trip members can update items (claiming, packing)." ON public.items FOR UPDATE USING (EXISTS (SELECT 1 FROM trip_members WHERE trip_id = items.trip_id AND user_id = auth.uid()));
CREATE POLICY "Trip members can delete items." ON public.items FOR DELETE USING (EXISTS (SELECT 1 FROM trip_members WHERE trip_id = items.trip_id AND user_id = auth.uid()));
