-- Fix SECURITY DEFINER view issue by using SECURITY INVOKER
-- Drop and recreate the view with explicit SECURITY INVOKER

DROP VIEW IF EXISTS public.leaderboard_public;

-- Create view with SECURITY INVOKER (default, but being explicit)
CREATE VIEW public.leaderboard_public 
WITH (security_invoker = true) AS
SELECT 
  user_id,
  display_name,
  avatar_url,
  total_earnings,
  referrals_count,
  ads_watched
FROM public.user_profiles
WHERE profile_completed = true;

-- Grant access to the view
GRANT SELECT ON public.leaderboard_public TO authenticated, anon;