-- ISSUE-#45: Fix trip_members.user_id foreign key to enable PostgREST nested selects
--
-- Problem: trip_members.user_id currently references auth.users(id), but PostgREST
-- requires a direct foreign key to profiles.id for nested selects to work.
--
-- Solution: Drop the existing FK to auth.users and create a new FK to profiles.id.
-- Data integrity is preserved since profiles.id already references auth.users(id).

-- Drop existing foreign key constraint to auth.users
ALTER TABLE public.trip_members
DROP CONSTRAINT IF EXISTS trip_members_user_id_fkey;

-- Add new foreign key constraint to profiles.id
ALTER TABLE public.trip_members
ADD CONSTRAINT trip_members_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add comment for documentation
COMMENT ON CONSTRAINT trip_members_user_id_fkey ON public.trip_members IS 'Links trip members to user profiles (enables PostgREST nested selects)';
