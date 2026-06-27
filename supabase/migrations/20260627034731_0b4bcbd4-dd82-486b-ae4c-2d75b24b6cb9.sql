
-- 1. Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Add weekly_earnings + referral flags to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS weekly_earnings numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_bonus_paid boolean NOT NULL DEFAULT false;

-- 3. Update record_ad_completion to also bump weekly_earnings
CREATE OR REPLACE FUNCTION public.record_ad_completion(p_user_id uuid, p_ad_duration integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_earnings numeric;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;

  IF NOT check_rate_limit(p_user_id, 'record_ad_completion', 20, 60) THEN
    RETURN json_build_object('success', false, 'message', 'Rate limit exceeded. Please try again later.');
  END IF;

  v_earnings := 0.10;

  INSERT INTO ad_views (user_id, ad_duration, earnings, completed, watched_at)
  VALUES (p_user_id, p_ad_duration, v_earnings, true, now());

  UPDATE user_profiles
  SET 
    withdrawable_balance = withdrawable_balance + v_earnings,
    total_earnings = total_earnings + v_earnings,
    weekly_earnings = weekly_earnings + v_earnings,
    ads_watched = ads_watched + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_earnings, 'ad_earnings', 'Ad watch reward');

  PERFORM increment_task_progress(p_user_id);

  RETURN json_build_object('success', true, 'earnings', v_earnings);
END;
$function$;

-- 4. Update get_public_leaderboard to rank by weekly_earnings (Monday-reset board)
CREATE OR REPLACE FUNCTION public.get_public_leaderboard(limit_count integer DEFAULT 50)
 RETURNS TABLE(rank_position bigint, display_name text, avatar_url text, total_earnings numeric, referrals_count integer, ads_watched integer, is_current_user boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        ROW_NUMBER() OVER (ORDER BY up.weekly_earnings DESC, up.total_earnings DESC, up.created_at ASC) AS rank_position,
        up.display_name,
        up.avatar_url,
        up.weekly_earnings AS total_earnings,
        up.referrals_count,
        up.ads_watched,
        CASE WHEN auth.uid() IS NOT NULL AND up.user_id = auth.uid() THEN true ELSE false END AS is_current_user
    FROM public.user_profiles up
    WHERE up.display_name IS NOT NULL OR up.total_earnings > 0
    ORDER BY up.weekly_earnings DESC, up.total_earnings DESC, up.created_at ASC
    LIMIT limit_count;
$function$;

-- 5. Change apply_referral_code: link only, do NOT pay referrer yet
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_user_id uuid, p_referral_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_already_referred boolean;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;

  IF NOT check_rate_limit(p_user_id, 'apply_referral_code', 3, 1440) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again tomorrow.');
  END IF;

  SELECT referred_by IS NOT NULL INTO v_already_referred
  FROM user_profiles WHERE user_id = p_user_id;

  IF v_already_referred THEN
    RETURN json_build_object('success', false, 'message', 'Referral code already applied');
  END IF;

  SELECT user_id INTO v_referrer_id
  FROM user_profiles WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;

  IF v_referrer_id = p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot use your own referral code');
  END IF;

  UPDATE user_profiles
  SET referred_by = v_referrer_id, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Referral linked. Referrer will receive 500 XD Coins after your first successful withdrawal.'
  );
END;
$function$;

-- 6. Function that pays the pending referral bonus on first successful withdrawal
CREATE OR REPLACE FUNCTION public.pay_pending_referral_bonus(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer_id uuid;
  v_already_paid boolean;
  v_bonus numeric := 5.00; -- 500 XD coins
BEGIN
  SELECT referred_by, referral_bonus_paid
    INTO v_referrer_id, v_already_paid
  FROM user_profiles WHERE user_id = p_user_id;

  IF v_referrer_id IS NULL OR v_already_paid THEN
    RETURN;
  END IF;

  UPDATE user_profiles
  SET
    withdrawable_balance = withdrawable_balance + v_bonus,
    total_earnings = total_earnings + v_bonus,
    weekly_earnings = weekly_earnings + v_bonus,
    referrals_count = referrals_count + 1,
    updated_at = now()
  WHERE user_id = v_referrer_id;

  UPDATE user_profiles
  SET referral_bonus_paid = true, updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (v_referrer_id, v_bonus, 'referral_bonus', 'Referral bonus (friend first withdrawal)');
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.pay_pending_referral_bonus(uuid) FROM PUBLIC, anon, authenticated;

-- 7. Trigger on gift_card_purchases status -> 'completed' awards pending referral bonus
CREATE OR REPLACE FUNCTION public.trg_gift_card_completed_referral()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM public.pay_pending_referral_bonus(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS gift_card_completed_referral ON public.gift_card_purchases;
CREATE TRIGGER gift_card_completed_referral
AFTER UPDATE OF status ON public.gift_card_purchases
FOR EACH ROW EXECUTE FUNCTION public.trg_gift_card_completed_referral();

-- 8. Weekly Monday 00:00 UTC leaderboard reset
SELECT cron.unschedule('weekly_leaderboard_reset')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly_leaderboard_reset');

SELECT cron.schedule(
  'weekly_leaderboard_reset',
  '0 0 * * 1',
  $$ UPDATE public.user_profiles SET weekly_earnings = 0 WHERE weekly_earnings <> 0 $$
);
