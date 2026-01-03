-- Add profile fields and referral system columns to user_profiles
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS display_name text,
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS birthday date,
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.user_profiles(user_id),
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Generate unique referral codes for existing users
UPDATE public.user_profiles 
SET referral_code = UPPER(SUBSTRING(MD5(user_id::text || NOW()::text) FROM 1 FOR 8))
WHERE referral_code IS NULL;

-- Create function to generate referral code for new users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTRING(MD5(NEW.user_id::text || NOW()::text) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating referral codes
DROP TRIGGER IF EXISTS generate_referral_code_trigger ON public.user_profiles;
CREATE TRIGGER generate_referral_code_trigger
BEFORE INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_referral_code();

-- Create function to process referral
CREATE OR REPLACE FUNCTION public.apply_referral_code(p_user_id uuid, p_referral_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
  v_result json;
BEGIN
  -- Find the referrer
  SELECT user_id INTO v_referrer_id
  FROM public.user_profiles
  WHERE referral_code = UPPER(p_referral_code)
    AND user_id != p_user_id;
  
  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid referral code');
  END IF;
  
  -- Check if user already has a referrer
  IF EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = p_user_id AND referred_by IS NOT NULL) THEN
    RETURN json_build_object('success', false, 'message', 'Already used a referral code');
  END IF;
  
  -- Update user's referred_by
  UPDATE public.user_profiles
  SET referred_by = v_referrer_id
  WHERE user_id = p_user_id;
  
  -- Increment referrer's referral count
  UPDATE public.user_profiles
  SET referrals_count = referrals_count + 1
  WHERE user_id = v_referrer_id;
  
  -- Add bonus to referrer (₹5 bonus)
  INSERT INTO public.transactions (user_id, amount, transaction_type, description)
  VALUES (v_referrer_id, 5.00, 'referral', 'Referral bonus');
  
  UPDATE public.user_profiles
  SET total_earnings = total_earnings + 5.00,
      withdrawable_balance = withdrawable_balance + 5.00
  WHERE user_id = v_referrer_id;
  
  RETURN json_build_object('success', true, 'message', 'Referral code applied successfully');
END;
$$;

-- Allow users to read leaderboard data (limited fields)
CREATE POLICY "Anyone can view leaderboard data"
ON public.user_profiles
FOR SELECT
USING (true);

-- Drop the restrictive select policy and keep admin one
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;

-- Recreate user profile view policy
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);