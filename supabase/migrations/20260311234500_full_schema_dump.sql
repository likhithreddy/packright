-- Full Schema Dump for E2E Infrastructure
-- Generated via Supabase MCP reconstruction from project vpfpdviewgmqcetlcxiw

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";

-- SCHEMAS
CREATE SCHEMA IF NOT EXISTS "auth";
CREATE SCHEMA IF NOT EXISTS "public";

-- TABLES: auth.users (Robust structure for GoTrue compatibility)
CREATE TABLE IF NOT EXISTS "auth"."users" (
    "id" uuid NOT NULL PRIMARY KEY,
    "instance_id" uuid,
    "email" text UNIQUE,
    "encrypted_password" text,
    "email_confirmed_at" timestamptz,
    "invited_at" timestamptz,
    "confirmation_token" text,
    "confirmation_sent_at" timestamptz,
    "recovery_token" text,
    "recovery_sent_at" timestamptz,
    "email_change_token_new" text,
    "email_change" text,
    "email_change_sent_at" timestamptz,
    "last_sign_in_at" timestamptz,
    "raw_app_meta_data" jsonb,
    "raw_user_meta_data" jsonb,
    "is_super_admin" boolean,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now(),
    "phone" text UNIQUE DEFAULT NULL,
    "phone_confirmed_at" timestamptz,
    "phone_change" text DEFAULT '',
    "phone_change_token" text DEFAULT '',
    "phone_change_sent_at" timestamptz,
    "confirmed_at" timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    "email_change_token_current" text DEFAULT '',
    "email_change_confirm_status" smallint DEFAULT 0,
    "banned_until" timestamptz,
    "reauthentication_token" text DEFAULT '',
    "reauthentication_sent_at" timestamptz,
    "is_sso_user" boolean DEFAULT false,
    "deleted_at" timestamptz,
    "is_anonymous" boolean DEFAULT false
);

ALTER TABLE "auth"."users" ENABLE ROW LEVEL SECURITY;

-- TABLES: public.profiles
CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    "full_name" text,
    "username" text UNIQUE,
    "avatar_theme" text,
    "packing_style" text,
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()),
    "updated_at" timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

-- TABLES: public.trips
CREATE TABLE IF NOT EXISTS "public"."trips" (
    "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "created_by" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "title" text NOT NULL,
    "destination" text NOT NULL,
    "date_start" date,
    "date_end" date,
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()),
    "is_archived" boolean DEFAULT false
);

ALTER TABLE "public"."trips" ENABLE ROW LEVEL SECURITY;

-- TABLES: public.trip_members
CREATE TABLE IF NOT EXISTS "public"."trip_members" (
    "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "trip_id" uuid REFERENCES public.trips(id) ON DELETE CASCADE,
    "user_id" uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    "role" text CHECK (role IN ('admin', 'member')),
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()),
    UNIQUE (trip_id, user_id)
);

ALTER TABLE "public"."trip_members" ENABLE ROW LEVEL SECURITY;

-- TABLES: public.items
CREATE TABLE IF NOT EXISTS "public"."items" (
    "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "trip_id" uuid REFERENCES public.trips(id) ON DELETE CASCADE,
    "name" text NOT NULL,
    "required_count" integer NOT NULL DEFAULT 1,
    "category" text,
    "claim_type" text DEFAULT 'single' CHECK (claim_type IN ('single', 'multiple')),
    "sort_order" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT timezone('utc'::text, now())
);

ALTER TABLE "public"."items" ENABLE ROW LEVEL SECURITY;

-- TABLES: public.item_claims
CREATE TABLE IF NOT EXISTS "public"."item_claims" (
    "id" uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "trip_id" uuid REFERENCES public.trips(id) ON DELETE CASCADE,
    "item_id" uuid REFERENCES public.items(id) ON DELETE CASCADE,
    "user_id" uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    "quantity" integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    "is_packed" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamptz DEFAULT timezone('utc'::text, now()),
    UNIQUE (item_id, user_id)
);

ALTER TABLE "public"."item_claims" ENABLE ROW LEVEL SECURITY;

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

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

CREATE OR REPLACE FUNCTION public.check_over_claim()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_required_count INTEGER;
  v_total_claimed INTEGER;
BEGIN
  SELECT required_count INTO v_required_count FROM items WHERE id = NEW.item_id;
  SELECT COALESCE(SUM(quantity), 0) INTO v_total_claimed FROM item_claims WHERE item_id = NEW.item_id AND id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid);
  IF (NEW.quantity + v_total_claimed) > v_required_count THEN
    RAISE EXCEPTION 'Cannot claim more than required' USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
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

CREATE OR REPLACE FUNCTION public.search_users_by_username(search_query text)
 RETURNS TABLE(id uuid, full_name text, username text, avatar_theme text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.full_name, p.username, p.avatar_theme
  FROM public.profiles p
  WHERE LENGTH(TRIM(search_query)) >= 3
    AND (
      LOWER(p.username) LIKE '%' || LOWER(TRIM(search_query)) || '%'
      OR LOWER(p.full_name) LIKE '%' || LOWER(TRIM(search_query)) || '%'
    )
    AND p.id != auth.uid()
  ORDER BY
    CASE
      WHEN LOWER(p.username) = LOWER(TRIM(search_query)) THEN 1
      WHEN LOWER(p.username) LIKE LOWER(TRIM(search_query)) || '%' THEN 2
      ELSE 3
    END, p.username ASC
  LIMIT 10;
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

-- TRIGGERS
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_profile_updated
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER tr_check_over_claim
BEFORE INSERT OR UPDATE ON public.item_claims
FOR EACH ROW EXECUTE FUNCTION check_over_claim();

-- VIEWS
CREATE OR REPLACE VIEW public.trip_readiness AS
 WITH item_stats AS (
         SELECT items.trip_id,
            sum(items.required_count) AS total_required
           FROM items
          GROUP BY items.trip_id
        ), claim_stats AS (
         SELECT item_claims.trip_id,
            sum(item_claims.quantity) AS total_packed
           FROM item_claims
          WHERE (item_claims.is_packed = true)
          GROUP BY item_claims.trip_id
        )
 SELECT t.id AS trip_id,
    COALESCE(istats.total_required, (0)::bigint) AS total_required,
    COALESCE(cstats.total_packed, (0)::bigint) AS total_packed,
        CASE
            WHEN (COALESCE(istats.total_required, (0)::bigint) = 0) THEN NULL::integer
            ELSE (round((((COALESCE(cstats.total_packed, (0)::bigint))::numeric / (istats.total_required)::numeric) * (100)::numeric)))::integer
        END AS percentage
   FROM ((trips t
     LEFT JOIN item_stats istats ON ((t.id = istats.trip_id)))
     LEFT JOIN claim_stats cstats ON ((t.id = cstats.trip_id)));

-- RLS POLICIES
-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO public USING ((id = auth.uid()) OR (EXISTS ( SELECT 1 FROM trip_members WHERE (trip_members.user_id = auth.uid()) )));
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO public WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO public USING (auth.uid() = id);

-- Trips
CREATE POLICY "trips_select" ON public.trips FOR SELECT TO public USING ((created_by = auth.uid()) OR (is_member_of(id) AND (is_archived = false)));
CREATE POLICY "trips_insert" ON public.trips FOR INSERT TO public WITH CHECK (auth.uid() = created_by);
CREATE POLICY "trips_update" ON public.trips FOR UPDATE TO public USING ((created_by = auth.uid()) OR is_admin_of(id));
CREATE POLICY "trips_delete" ON public.trips FOR DELETE TO public USING (created_by = auth.uid());

-- Trip Members
CREATE POLICY "trip_members_select" ON public.trip_members FOR SELECT TO public USING ((user_id = auth.uid()) OR is_member_of(trip_id) OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.created_by = auth.uid())))));
CREATE POLICY "trip_members_insert" ON public.trip_members FOR INSERT TO public WITH CHECK (is_admin_of(trip_id) OR ((user_id = auth.uid()) AND (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.created_by = auth.uid()))))));
CREATE POLICY "trip_members_update" ON public.trip_members FOR UPDATE TO public USING (is_admin_of(trip_id));
CREATE POLICY "trip_members_delete" ON public.trip_members FOR DELETE TO public USING ((user_id = auth.uid()) OR is_admin_of(trip_id) OR (EXISTS ( SELECT 1 FROM trips WHERE ((trips.id = trip_members.trip_id) AND (trips.created_by = auth.uid())))));

-- Items
CREATE POLICY "items_select" ON public.items FOR SELECT TO public USING (is_member_of(trip_id) OR (EXISTS ( SELECT 1 FROM trips t WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));
CREATE POLICY "items_insert" ON public.items FOR INSERT TO public WITH CHECK (is_admin_of(trip_id) OR (EXISTS ( SELECT 1 FROM trips t WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));
CREATE POLICY "items_update" ON public.items FOR UPDATE TO public USING (is_admin_of(trip_id) OR (EXISTS ( SELECT 1 FROM trips t WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));
CREATE POLICY "items_delete" ON public.items FOR DELETE TO public USING (is_admin_of(trip_id) OR (EXISTS ( SELECT 1 FROM trips t WHERE ((t.id = items.trip_id) AND (t.created_by = auth.uid())))));

-- Item Claims
CREATE POLICY "item_claims_select" ON public.item_claims FOR SELECT TO public USING (EXISTS ( SELECT 1 FROM items i WHERE ((i.id = item_claims.item_id) AND (is_member_of(i.trip_id) OR (EXISTS ( SELECT 1 FROM trips t WHERE ((t.id = i.trip_id) AND (t.created_by = auth.uid()))))))));
CREATE POLICY "item_claims_insert" ON public.item_claims FOR INSERT TO public WITH CHECK ((user_id = auth.uid()) OR is_admin_of(trip_id));
CREATE POLICY "item_claims_update" ON public.item_claims FOR UPDATE TO public USING (user_id = auth.uid());
CREATE POLICY "item_claims_delete" ON public.item_claims FOR DELETE TO public USING (user_id = auth.uid());

-- GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.search_users_by_username(TEXT) TO authenticated;
