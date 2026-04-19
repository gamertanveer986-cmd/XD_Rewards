
-- 1. Enable RLS on admin_users and add restrictive policies
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view admin_users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert admin_users"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update admin_users"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete admin_users"
ON public.admin_users
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Remove duplicate permissive INSERT policy on user_profiles
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_profiles;

-- 3. Restrict user_badges public read to authenticated users only
DROP POLICY IF EXISTS "Public can view all badges for leaderboard" ON public.user_badges;

CREATE POLICY "Authenticated users can view badges for leaderboard"
ON public.user_badges
FOR SELECT
TO authenticated
USING (true);

-- 4. Block direct INSERT on gift_card_purchases - force usage of purchase_gift_card RPC
DROP POLICY IF EXISTS "Users can create their own purchases" ON public.gift_card_purchases;

CREATE POLICY "Block direct gift card purchase inserts"
ON public.gift_card_purchases
FOR INSERT
TO authenticated
WITH CHECK (false);
