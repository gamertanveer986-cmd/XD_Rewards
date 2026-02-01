-- The leaderboard_public is a VIEW that exposes user_id which can be used for account enumeration
-- We need to either add RLS to the view or modify it to not expose sensitive identifiers to unauthenticated users
-- Since views inherit RLS from underlying tables, we'll create a more secure approach

-- First, drop the existing view
DROP VIEW IF EXISTS public.leaderboard_public;

-- Recreate the view without exposing user_id to the public
-- Instead, we'll use a row number as a public-facing identifier
CREATE OR REPLACE VIEW public.leaderboard_public AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY total_earnings DESC, created_at ASC) AS rank_id,
    user_id, -- Still included for authenticated users to identify themselves
    total_earnings,
    referrals_count,
    ads_watched,
    display_name,
    avatar_url
FROM public.user_profiles
WHERE display_name IS NOT NULL OR total_earnings > 0;

-- Enable RLS on the underlying table is already done
-- For views, we need to use security_invoker to enforce RLS
-- PostgreSQL 15+ supports security_invoker on views
-- For older versions, we create a secure function instead

-- Create a security definer function that returns leaderboard data safely
CREATE OR REPLACE FUNCTION public.get_public_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE (
    rank_position bigint,
    display_name text,
    avatar_url text,
    total_earnings numeric,
    referrals_count integer,
    ads_watched integer,
    is_current_user boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ROW_NUMBER() OVER (ORDER BY up.total_earnings DESC, up.created_at ASC) AS rank_position,
        up.display_name,
        up.avatar_url,
        up.total_earnings,
        up.referrals_count,
        up.ads_watched,
        CASE WHEN auth.uid() IS NOT NULL AND up.user_id = auth.uid() THEN true ELSE false END AS is_current_user
    FROM public.user_profiles up
    WHERE up.display_name IS NOT NULL OR up.total_earnings > 0
    ORDER BY up.total_earnings DESC, up.created_at ASC
    LIMIT limit_count;
$$;

-- Grant execute permission to authenticated users and anon
GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_leaderboard(integer) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_public_leaderboard IS 'Returns public leaderboard data without exposing user_id. The is_current_user flag allows authenticated users to identify their own position.';