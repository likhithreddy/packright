-- Migration: Fix Profiles RLS to Allow Viewing Trip Members' Profiles
-- Issue: #45
-- Description: Allow users to view profiles of other trip members they share trips with
-- Root Cause: The inner join in getTripMembers() fails when profiles of other trip members
-- are blocked by the restrictive RLS policy that only allows viewing own profile

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create new policy that allows viewing:
-- 1. Your own profile (existing behavior)
-- 2. Profiles of users you share trips with (NEW - enables member list display)
CREATE POLICY "Users can view own profile and trip members' profiles" ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Can always view own profile
  auth.uid() = id
  OR
  -- Can view profiles of users you share trips with
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
