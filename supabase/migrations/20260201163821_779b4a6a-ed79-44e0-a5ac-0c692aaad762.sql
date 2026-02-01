-- Fix the security definer view issue by using SECURITY INVOKER instead
-- Drop the current view and recreate with proper security settings
DROP VIEW IF EXISTS public.leaderboard_public;

-- Recreate the view with SECURITY INVOKER (default, but explicit)
-- This ensures the view runs with the permissions of the querying user
-- Note: We remove user_id from the view to prevent account enumeration for anonymous users
CREATE VIEW public.leaderboard_public 
WITH (security_invoker = true)
AS
SELECT 
    display_name,
    avatar_url,
    total_earnings,
    referrals_count,
    ads_watched
FROM public.user_profiles
WHERE display_name IS NOT NULL OR total_earnings > 0;