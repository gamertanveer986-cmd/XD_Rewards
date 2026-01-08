-- ============================================
-- SECURITY FIX: Comprehensive Security Hardening
-- ============================================

-- 1. FIX PUBLIC_DATA_EXPOSURE: Remove overly permissive leaderboard policy
-- and create a secure view with only safe fields
DROP POLICY IF EXISTS "Anyone can view leaderboard data" ON public.user_profiles;

-- Create a secure leaderboard view with only non-sensitive fields
CREATE OR REPLACE VIEW public.leaderboard_public AS
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

-- 2. FIX DEFINER_OR_RPC_BYPASS: Restrict user profile updates to safe fields only
-- Users should not be able to modify financial balances directly
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create a restrictive policy that prevents balance manipulation
CREATE POLICY "Users can update their own profile safely"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND withdrawable_balance = (SELECT withdrawable_balance FROM user_profiles WHERE user_id = auth.uid())
  AND non_withdrawable_balance = (SELECT non_withdrawable_balance FROM user_profiles WHERE user_id = auth.uid())
  AND total_earnings = (SELECT total_earnings FROM user_profiles WHERE user_id = auth.uid())
  AND ads_watched = (SELECT ads_watched FROM user_profiles WHERE user_id = auth.uid())
  AND referrals_count = (SELECT referrals_count FROM user_profiles WHERE user_id = auth.uid())
);

-- 3. FIX INPUT_VALIDATION: Add server-side constraints
-- Add username format constraint
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS username_format_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT username_format_check
CHECK (username IS NULL OR username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Add display_name length constraint
ALTER TABLE public.user_profiles
DROP CONSTRAINT IF EXISTS display_name_length_check;

ALTER TABLE public.user_profiles
ADD CONSTRAINT display_name_length_check
CHECK (display_name IS NULL OR length(display_name) <= 100);

-- 4. FIX OPEN_ENDPOINTS: Create rate limiting infrastructure
-- Create rate limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- Create index for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON public.rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_endpoint ON public.rate_limits(user_id, endpoint, window_start);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow system operations (via SECURITY DEFINER functions)
DROP POLICY IF EXISTS "No direct access to rate_limits" ON public.rate_limits;
CREATE POLICY "No direct access to rate_limits"
ON public.rate_limits
FOR ALL
USING (false);

-- Create rate limit check function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer,
  p_window_minutes integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  -- Clean up old entries (older than 24 hours)
  DELETE FROM rate_limits 
  WHERE window_start < now() - interval '24 hours';
  
  -- Calculate window start (truncate to minute for grouping)
  v_window_start := date_trunc('minute', now());
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start > now() - (p_window_minutes || ' minutes')::interval;
  
  -- Check if rate limit exceeded
  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, v_window_start, 1)
  ON CONFLICT (id) DO NOTHING;
  
  -- If insert failed due to race condition, increment existing
  IF NOT FOUND THEN
    UPDATE rate_limits 
    SET request_count = request_count + 1
    WHERE user_id = p_user_id 
      AND endpoint = p_endpoint 
      AND window_start = v_window_start;
    
    IF NOT FOUND THEN
      INSERT INTO rate_limits (user_id, endpoint, window_start, request_count)
      VALUES (p_user_id, p_endpoint, v_window_start, 1);
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Drop existing functions to avoid parameter mismatch errors
DROP FUNCTION IF EXISTS public.record_ad_completion(uuid, integer);
DROP FUNCTION IF EXISTS public.claim_daily_reward(uuid);
DROP FUNCTION IF EXISTS public.redeem_gift_card(uuid, text);
DROP FUNCTION IF EXISTS public.purchase_gift_card(uuid, uuid);
DROP FUNCTION IF EXISTS public.apply_referral_code(uuid, text);

-- Update record_ad_completion with rate limiting (20 per hour)
CREATE FUNCTION public.record_ad_completion(p_user_id uuid, p_ad_duration integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earnings numeric;
BEGIN
  -- Verify user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;
  
  -- Rate limit check: 20 ads per hour
  IF NOT check_rate_limit(p_user_id, 'record_ad_completion', 20, 60) THEN
    RETURN json_build_object('success', false, 'message', 'Rate limit exceeded. Please try again later.');
  END IF;
  
  -- Calculate earnings (0.10 per ad)
  v_earnings := 0.10;
  
  -- Record the ad view
  INSERT INTO ad_views (user_id, ad_duration, earnings, completed, watched_at)
  VALUES (p_user_id, p_ad_duration, v_earnings, true, now());
  
  -- Update user profile balances
  UPDATE user_profiles
  SET 
    withdrawable_balance = withdrawable_balance + v_earnings,
    total_earnings = total_earnings + v_earnings,
    ads_watched = ads_watched + 1,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_earnings, 'ad_earnings', 'Ad watch reward');
  
  RETURN json_build_object('success', true, 'earnings', v_earnings);
END;
$$;

-- Update claim_daily_reward with rate limiting (5 attempts per day)
CREATE FUNCTION public.claim_daily_reward(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_streak integer;
  v_last_claim date;
  v_reward_amount numeric;
  v_rewards numeric[] := ARRAY[0.50, 0.75, 1.00, 1.25, 1.50, 1.75, 2.00];
  v_today date := CURRENT_DATE;
BEGIN
  -- Verify user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;
  
  -- Rate limit check: 5 attempts per day (1440 minutes)
  IF NOT check_rate_limit(p_user_id, 'claim_daily_reward', 5, 1440) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again tomorrow.');
  END IF;
  
  -- Get current streak and last claim date
  SELECT current_streak, last_claim_date INTO v_current_streak, v_last_claim
  FROM daily_rewards
  WHERE user_id = p_user_id;
  
  -- If no record exists, create one
  IF v_current_streak IS NULL THEN
    v_current_streak := 0;
  END IF;
  
  -- Check if already claimed today
  IF v_last_claim = v_today THEN
    RETURN json_build_object('success', false, 'message', 'Daily reward already claimed today');
  END IF;
  
  -- Check if streak continues or resets
  IF v_last_claim = v_today - 1 THEN
    -- Continue streak
    v_current_streak := LEAST(v_current_streak + 1, 7);
  ELSE
    -- Reset streak
    v_current_streak := 1;
  END IF;
  
  -- Get reward amount
  v_reward_amount := v_rewards[v_current_streak];
  
  -- Update or insert daily rewards
  INSERT INTO daily_rewards (user_id, current_streak, last_claim_date, total_claimed, updated_at)
  VALUES (p_user_id, v_current_streak, v_today, v_reward_amount, now())
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = v_current_streak,
    last_claim_date = v_today,
    total_claimed = daily_rewards.total_claimed + v_reward_amount,
    updated_at = now();
  
  -- Update user balance
  UPDATE user_profiles
  SET 
    non_withdrawable_balance = non_withdrawable_balance + v_reward_amount,
    total_earnings = total_earnings + v_reward_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_reward_amount, 'daily_reward', 'Day ' || v_current_streak || ' reward');
  
  RETURN json_build_object('success', true, 'streak', v_current_streak, 'reward', v_reward_amount);
END;
$$;

-- Update redeem_gift_card with rate limiting (5 attempts per hour)
CREATE FUNCTION public.redeem_gift_card(p_user_id uuid, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_card record;
BEGIN
  -- Verify user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;
  
  -- Rate limit check: 5 attempts per hour
  IF NOT check_rate_limit(p_user_id, 'redeem_gift_card', 5, 60) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again later.');
  END IF;
  
  -- Find the gift card
  SELECT * INTO v_gift_card
  FROM gift_cards
  WHERE code = p_code
    AND is_redeemed = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;
  
  IF v_gift_card IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or unavailable code');
  END IF;
  
  -- Redeem the gift card
  UPDATE gift_cards
  SET is_redeemed = true, redeemed_by = p_user_id, redeemed_at = now()
  WHERE id = v_gift_card.id;
  
  -- Add balance to user
  UPDATE user_profiles
  SET 
    withdrawable_balance = withdrawable_balance + v_gift_card.value,
    total_earnings = total_earnings + v_gift_card.value,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_gift_card.value, 'gift_card_redemption', 'Gift card redeemed');
  
  RETURN json_build_object('success', true, 'value', v_gift_card.value);
END;
$$;

-- Update purchase_gift_card with rate limiting (10 per hour)
CREATE FUNCTION public.purchase_gift_card(p_user_id uuid, p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product record;
  v_balance numeric;
BEGIN
  -- Verify user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;
  
  -- Rate limit check: 10 purchases per hour
  IF NOT check_rate_limit(p_user_id, 'purchase_gift_card', 10, 60) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again later.');
  END IF;
  
  -- Get product details
  SELECT * INTO v_product
  FROM gift_card_products
  WHERE id = p_product_id AND is_active = true;
  
  IF v_product IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Product not available');
  END IF;
  
  -- Get user balance
  SELECT withdrawable_balance INTO v_balance
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  IF v_balance < v_product.price THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;
  
  -- Deduct balance
  UPDATE user_profiles
  SET 
    withdrawable_balance = withdrawable_balance - v_product.price,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create purchase record
  INSERT INTO gift_card_purchases (user_id, product_id, amount_paid, status)
  VALUES (p_user_id, p_product_id, v_product.price, 'pending');
  
  -- Record transaction
  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, -v_product.price, 'gift_card_purchase', 'Purchased ' || v_product.name);
  
  RETURN json_build_object('success', true, 'product', v_product.name, 'amount', v_product.price);
END;
$$;

-- Update apply_referral_code with rate limiting (3 attempts per day)
CREATE FUNCTION public.apply_referral_code(p_user_id uuid, p_referral_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_already_referred boolean;
  v_referral_bonus numeric := 5.00;
BEGIN
  -- Verify user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;
  
  -- Rate limit check: 3 attempts per day
  IF NOT check_rate_limit(p_user_id, 'apply_referral_code', 3, 1440) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again tomorrow.');
  END IF;
  
  -- Check if user already used a referral
  SELECT referred_by IS NOT NULL INTO v_already_referred
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  IF v_already_referred THEN
    RETURN json_build_object('success', false, 'message', 'Referral code already applied');
  END IF;
  
  -- Find referrer
  SELECT user_id INTO v_referrer_id
  FROM user_profiles
  WHERE referral_code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;
  
  -- Prevent self-referral
  IF v_referrer_id = p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Cannot use your own referral code');
  END IF;
  
  -- Apply referral
  UPDATE user_profiles
  SET referred_by = v_referrer_id, updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Give referrer bonus
  UPDATE user_profiles
  SET 
    withdrawable_balance = withdrawable_balance + v_referral_bonus,
    total_earnings = total_earnings + v_referral_bonus,
    referrals_count = referrals_count + 1,
    updated_at = now()
  WHERE user_id = v_referrer_id;
  
  -- Record transaction for referrer
  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (v_referrer_id, v_referral_bonus, 'referral_bonus', 'Referral bonus');
  
  RETURN json_build_object('success', true, 'message', 'Referral code applied successfully');
END;
$$;

-- 5. FIX MISSING_RLS: Add INSERT policy for gift_card_purchases
DROP POLICY IF EXISTS "Users can create their own purchases" ON public.gift_card_purchases;
CREATE POLICY "Users can create their own purchases"
ON public.gift_card_purchases
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.gift_card_products
    WHERE id = product_id AND is_active = true
  )
);

-- 6. Add server-side admin verification function
CREATE OR REPLACE FUNCTION public.verify_admin_access()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  );
$$;