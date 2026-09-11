CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.admin_lift_ban(uuid) SET SCHEMA private;
ALTER FUNCTION public.admin_unlink_device(uuid) SET SCHEMA private;
ALTER FUNCTION public.apply_referral_code(uuid, text) SET SCHEMA private;
ALTER FUNCTION public.approve_social_task(uuid, boolean, text) SET SCHEMA private;
ALTER FUNCTION public.check_and_award_badges(uuid) SET SCHEMA private;
ALTER FUNCTION public.check_and_register_device(text, text) SET SCHEMA private;
ALTER FUNCTION public.claim_daily_reward(uuid) SET SCHEMA private;
ALTER FUNCTION public.get_public_leaderboard(integer) SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_current_user_banned() SET SCHEMA private;
ALTER FUNCTION public.purchase_gift_card(uuid, uuid, text) SET SCHEMA private;
ALTER FUNCTION public.record_ad_completion(uuid, integer) SET SCHEMA private;
ALTER FUNCTION public.redeem_gift_card(uuid, text) SET SCHEMA private;
ALTER FUNCTION public.spin_wheel(uuid) SET SCHEMA private;

GRANT EXECUTE ON FUNCTION private.admin_lift_ban(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.admin_unlink_device(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.apply_referral_code(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.approve_social_task(uuid, boolean, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.check_and_award_badges(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.check_and_register_device(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.claim_daily_reward(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_public_leaderboard(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_current_user_banned() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.purchase_gift_card(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.record_ad_completion(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.redeem_gift_card(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.spin_wheel(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_lift_ban(p_ban_id uuid)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.admin_lift_ban(p_ban_id); $$;

CREATE OR REPLACE FUNCTION public.admin_unlink_device(p_registration_id uuid)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.admin_unlink_device(p_registration_id); $$;

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_user_id uuid, p_referral_code text)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.apply_referral_code(p_user_id, p_referral_code); $$;

CREATE OR REPLACE FUNCTION public.approve_social_task(p_submission_id uuid, p_approved boolean, p_admin_notes text DEFAULT NULL)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.approve_social_task(p_submission_id, p_approved, p_admin_notes); $$;

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.check_and_award_badges(p_user_id); $$;

CREATE OR REPLACE FUNCTION public.check_and_register_device(p_device_id_hash text, p_platform text DEFAULT 'unknown')
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.check_and_register_device(p_device_id_hash, p_platform); $$;

CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id uuid)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.claim_daily_reward(p_user_id); $$;

CREATE OR REPLACE FUNCTION public.get_public_leaderboard(limit_count integer DEFAULT 50)
RETURNS TABLE(rank_position bigint, display_name text, avatar_url text, total_earnings numeric, referrals_count integer, ads_watched integer, is_current_user boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT * FROM private.get_public_leaderboard(limit_count); $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT private.has_role(_user_id, _role); $$;

CREATE OR REPLACE FUNCTION public.is_current_user_banned()
RETURNS json LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT private.is_current_user_banned(); $$;

CREATE OR REPLACE FUNCTION public.purchase_gift_card(p_user_id uuid, p_product_id uuid, p_email text DEFAULT NULL)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.purchase_gift_card(p_user_id, p_product_id, p_email); $$;

CREATE OR REPLACE FUNCTION public.record_ad_completion(p_user_id uuid, p_ad_duration integer)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.record_ad_completion(p_user_id, p_ad_duration); $$;

CREATE OR REPLACE FUNCTION public.redeem_gift_card(p_user_id uuid, p_code text)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.redeem_gift_card(p_user_id, p_code); $$;

CREATE OR REPLACE FUNCTION public.spin_wheel(p_user_id uuid)
RETURNS json LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT private.spin_wheel(p_user_id); $$;

DROP POLICY IF EXISTS "Users can insert their own ad views" ON public.ad_views;
DROP POLICY IF EXISTS "Users can update their own ad views" ON public.ad_views;

DROP POLICY IF EXISTS "Users can update their own daily rewards" ON public.daily_rewards;

DROP POLICY IF EXISTS "Users can submit social tasks" ON public.social_task_submissions;
CREATE POLICY "Users can submit social tasks"
ON public.social_task_submissions
FOR INSERT TO public
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND reward_amount IS NULL
);

DROP POLICY IF EXISTS "Users can update their own profile safely" ON public.user_profiles;
CREATE POLICY "Users can update their own profile safely"
ON public.user_profiles
FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND withdrawable_balance = (SELECT p.withdrawable_balance FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
  AND non_withdrawable_balance = (SELECT p.non_withdrawable_balance FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
  AND total_earnings = (SELECT p.total_earnings FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
  AND ads_watched = (SELECT p.ads_watched FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
  AND referrals_count = (SELECT p.referrals_count FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
  AND payment_status = (SELECT p.payment_status FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
  AND referral_bonus_paid = (SELECT p.referral_bonus_paid FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
  AND weekly_earnings = (SELECT p.weekly_earnings FROM public.user_profiles AS p WHERE p.user_id = auth.uid())
);