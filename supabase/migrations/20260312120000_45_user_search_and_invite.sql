-- ISSUE-#45: Create secure RPC function for user search bypassing RLS
-- This function allows authenticated users to search for other users by username or full name
-- SECURITY DEFINER bypasses RLS while maintaining security via auth.uid() filter

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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_users_by_username(TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.search_users_by_username IS 'Search users by username or full name, excluding current user. Requires minimum 3 characters.';
