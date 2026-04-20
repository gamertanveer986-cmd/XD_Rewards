CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_streak integer;
  v_last_claim date;
  v_reward_amount numeric;
  -- XD Coin rewards: 10,20,30,40,50,60,70 (stored as value: coins/100)
  v_rewards numeric[] := ARRAY[0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70];
  v_today date := CURRENT_DATE;
  v_days_diff integer;
BEGIN
  -- Verify user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;
  
  -- Rate limit check: 5 attempts per day
  IF NOT check_rate_limit(p_user_id, 'claim_daily_reward', 5, 1440) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again tomorrow.');
  END IF;
  
  -- Get current streak and last claim date
  SELECT current_streak, last_claim_date INTO v_current_streak, v_last_claim
  FROM daily_rewards
  WHERE user_id = p_user_id;
  
  IF v_current_streak IS NULL THEN
    v_current_streak := 0;
  END IF;
  
  -- Already claimed today
  IF v_last_claim = v_today THEN
    RETURN json_build_object('success', false, 'message', 'Daily reward already claimed today');
  END IF;
  
  -- Determine streak continuation
  IF v_last_claim IS NULL THEN
    v_current_streak := 1;
  ELSE
    v_days_diff := v_today - v_last_claim;
    IF v_days_diff = 1 THEN
      -- Next consecutive day
      v_current_streak := v_current_streak + 1;
      -- Reset cycle after day 7
      IF v_current_streak > 7 THEN
        v_current_streak := 1;
      END IF;
    ELSE
      -- Missed a day -> reset
      v_current_streak := 1;
    END IF;
  END IF;
  
  v_reward_amount := v_rewards[v_current_streak];
  
  INSERT INTO daily_rewards (user_id, current_streak, last_claim_date, total_claimed, updated_at)
  VALUES (p_user_id, v_current_streak, v_today, v_reward_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = v_current_streak,
    last_claim_date = v_today,
    total_claimed = daily_rewards.total_claimed + v_reward_amount,
    updated_at = now();
  
  UPDATE user_profiles
  SET 
    non_withdrawable_balance = non_withdrawable_balance + v_reward_amount,
    total_earnings = total_earnings + v_reward_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_reward_amount, 'daily_reward', 'Day ' || v_current_streak || ' daily bonus');
  
  RETURN json_build_object(
    'success', true,
    'streak', v_current_streak,
    'day', v_current_streak,
    'reward', v_reward_amount
  );
END;
$function$;