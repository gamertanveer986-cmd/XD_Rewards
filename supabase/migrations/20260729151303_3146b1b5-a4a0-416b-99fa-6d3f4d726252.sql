
-- 1) Storage: drop broad public SELECT on uploads bucket; add owner + admin SELECT
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;

CREATE POLICY "Owners can view their own uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads'
  AND public.has_role(auth.uid(), 'admin')
);

-- 2) Gift card purchases: hide redemption_code from end users (admins still see via table SELECT ALL)
REVOKE SELECT (redemption_code) ON public.gift_card_purchases FROM authenticated, anon, PUBLIC;

-- 3) SECURITY DEFINER function executability: revoke from anon/PUBLIC on functions
--    that should not be publicly callable. Trigger functions never need role grants.
REVOKE ALL ON FUNCTION public.get_public_leaderboard(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trg_gift_card_completed_referral() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;

-- 4) user_profiles.upi_id: ensure no anon SELECT exposure (owner-only remains via RLS)
REVOKE SELECT (upi_id) ON public.user_profiles FROM anon, PUBLIC;
