-- Create a secure function to record ad completion
-- This runs with SECURITY DEFINER so it has elevated privileges
-- but validates the user making the request

CREATE OR REPLACE FUNCTION public.record_ad_completion(
  p_user_id uuid,
  p_ad_duration integer DEFAULT 15
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earnings numeric;
  v_result json;
BEGIN
  -- Validate the user is the authenticated user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: User mismatch';
  END IF;

  -- Calculate earnings server-side (random between 0.05 and 0.10)
  v_earnings := CASE WHEN random() < 0.5 THEN 0.05 ELSE 0.10 END;

  -- Insert ad view record
  INSERT INTO public.ad_views (user_id, ad_duration, earnings, completed)
  VALUES (p_user_id, p_ad_duration, v_earnings, true);

  -- Update user profile atomically
  UPDATE public.user_profiles
  SET 
    ads_watched = ads_watched + 1,
    total_earnings = total_earnings + v_earnings,
    withdrawable_balance = withdrawable_balance + v_earnings,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert transaction record
  INSERT INTO public.transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_earnings, 'earning', 'Ad watch reward');

  -- Return the earnings amount
  v_result := json_build_object('earnings', v_earnings, 'success', true);
  RETURN v_result;
END;
$$;

-- Remove the UPDATE policy that allows users to modify their own profile
-- This prevents direct balance manipulation
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Create a restrictive UPDATE policy that only allows updating non-financial fields
-- (Currently we don't have any non-financial fields users should update, so we block all updates)
-- The record_ad_completion function uses SECURITY DEFINER to bypass RLS

-- Remove ability to INSERT transactions directly
DROP POLICY IF EXISTS "Users can insert transactions" ON public.transactions;

-- Block direct transaction inserts - they must go through the RPC function
CREATE POLICY "Block direct transaction inserts"
ON public.transactions
FOR INSERT
WITH CHECK (false);

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.record_ad_completion(uuid, integer) TO authenticated;