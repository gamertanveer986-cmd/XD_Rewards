-- Create daily_rewards table to track user streaks
CREATE TABLE public.daily_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  current_streak integer NOT NULL DEFAULT 0,
  last_claim_date date,
  total_claimed numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Add unique constraint on user_id
ALTER TABLE public.daily_rewards ADD CONSTRAINT daily_rewards_user_id_unique UNIQUE (user_id);

-- Enable RLS
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own daily rewards"
ON public.daily_rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily rewards"
ON public.daily_rewards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily rewards"
ON public.daily_rewards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all daily rewards"
ON public.daily_rewards FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create function to claim daily reward
CREATE OR REPLACE FUNCTION public.claim_daily_reward(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak integer;
  v_last_claim date;
  v_today date := CURRENT_DATE;
  v_reward numeric;
  v_result json;
BEGIN
  -- Validate the user is the authenticated user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: User mismatch';
  END IF;

  -- Get or create daily rewards record
  INSERT INTO public.daily_rewards (user_id, current_streak, last_claim_date)
  VALUES (p_user_id, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current streak info
  SELECT current_streak, last_claim_date INTO v_current_streak, v_last_claim
  FROM public.daily_rewards WHERE user_id = p_user_id;

  -- Check if already claimed today
  IF v_last_claim = v_today THEN
    RETURN json_build_object('success', false, 'message', 'Already claimed today', 'next_claim', v_today + 1);
  END IF;

  -- Calculate new streak
  IF v_last_claim IS NULL OR v_last_claim < v_today - 1 THEN
    -- Reset streak if missed a day or first time
    v_current_streak := 1;
  ELSE
    -- Continue streak
    v_current_streak := LEAST(v_current_streak + 1, 7);
  END IF;

  -- Calculate reward based on streak day (0.10 * day)
  v_reward := v_current_streak * 0.10;

  -- Update daily rewards record
  UPDATE public.daily_rewards
  SET current_streak = v_current_streak,
      last_claim_date = v_today,
      total_claimed = total_claimed + v_reward,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Update user profile balance
  UPDATE public.user_profiles
  SET total_earnings = total_earnings + v_reward,
      withdrawable_balance = withdrawable_balance + v_reward,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert transaction record
  INSERT INTO public.transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_reward, 'daily_reward', 'Day ' || v_current_streak || ' daily reward');

  -- Reset streak to 1 after day 7
  IF v_current_streak = 7 THEN
    UPDATE public.daily_rewards
    SET current_streak = 0
    WHERE user_id = p_user_id;
  END IF;

  v_result := json_build_object(
    'success', true, 
    'reward', v_reward, 
    'day', v_current_streak,
    'message', 'Day ' || v_current_streak || ' reward claimed: ₹' || v_reward
  );
  RETURN v_result;
END;
$$;