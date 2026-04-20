
-- 1) Update record_ad_completion to also increment task progress
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
    ads_watched = ads_watched + 1,
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_earnings, 'ad_earnings', 'Ad watch reward');

  -- Tick task progress + award milestone bonuses
  PERFORM increment_task_progress(p_user_id);

  RETURN json_build_object('success', true, 'earnings', v_earnings);
END;
$function$;

-- 2) Backfill task_progress from existing ads_watched so users see accurate progress
INSERT INTO task_progress (user_id, tasks_completed, last_milestone_claimed)
SELECT user_id, ads_watched, 0
FROM user_profiles
WHERE ads_watched > 0
ON CONFLICT (user_id) DO UPDATE
SET tasks_completed = GREATEST(task_progress.tasks_completed, EXCLUDED.tasks_completed),
    updated_at = now();
