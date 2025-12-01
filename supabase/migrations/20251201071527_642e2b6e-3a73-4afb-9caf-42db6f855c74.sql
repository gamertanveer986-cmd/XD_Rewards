-- Create user_profiles table to store user earnings and stats
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_earnings DECIMAL(10, 2) NOT NULL DEFAULT 10.00, -- Signup bonus
  withdrawable_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  non_withdrawable_balance DECIMAL(10, 2) NOT NULL DEFAULT 10.00, -- Signup bonus
  ads_watched INTEGER NOT NULL DEFAULT 0,
  referrals_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create ad_views table to track each ad watched
CREATE TABLE public.ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_duration INTEGER NOT NULL, -- Duration in seconds
  earnings DECIMAL(10, 2) NOT NULL, -- Amount earned from this ad
  completed BOOLEAN NOT NULL DEFAULT false,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on ad_views
ALTER TABLE public.ad_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own ad views
CREATE POLICY "Users can view their own ad views"
ON public.ad_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own ad views
CREATE POLICY "Users can insert their own ad views"
ON public.ad_views
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own ad views
CREATE POLICY "Users can update their own ad views"
ON public.ad_views
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create transactions table for tracking all balance changes
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'ad_watch', 'referral', 'withdrawal', 'bonus'
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view their own transactions
CREATE POLICY "Users can view their own transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create function to handle profile creation on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id);
  
  -- Add signup bonus transaction
  INSERT INTO public.transactions (user_id, transaction_type, amount, description)
  VALUES (NEW.id, 'bonus', 10.00, 'Signup bonus (non-withdrawable)');
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created_profile
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for updated_at on user_profiles
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_ad_views_user_id ON public.ad_views(user_id);
CREATE INDEX idx_ad_views_watched_at ON public.ad_views(watched_at);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);