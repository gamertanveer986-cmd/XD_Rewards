
-- Functions
CREATE OR REPLACE FUNCTION public.award_badge(p_user_id uuid, p_badge_key text, p_badge_name text, p_badge_description text DEFAULT NULL::text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT has_role(auth.uid(), 'admin') THEN
    RETURN false;
  END IF;
  INSERT INTO user_badges (user_id, badge_key, badge_name, badge_description)
  VALUES (p_user_id, p_badge_key, p_badge_name, p_badge_description)
  ON CONFLICT (user_id, badge_key) DO NOTHING;
  RETURN FOUND;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_profile record;
  v_badges_awarded text[] := '{}';
  v_daily_rewards record;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> p_user_id AND NOT has_role(auth.uid(), 'admin')) THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
  IF v_profile IS NULL THEN RETURN json_build_object('success', false, 'message', 'Profile not found'); END IF;
  IF EXISTS (SELECT 1 FROM transactions WHERE user_id = p_user_id AND transaction_type = 'withdrawal' LIMIT 1) THEN
    IF (SELECT award_badge(p_user_id, 'first_withdrawal', 'First Withdrawal', 'Completed your first withdrawal')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'first_withdrawal'); END IF; END IF;
  IF v_profile.referrals_count >= 5 THEN
    IF (SELECT award_badge(p_user_id, 'referral_master', 'Referral Master', 'Referred 5 or more users')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'referral_master'); END IF; END IF;
  SELECT * INTO v_daily_rewards FROM daily_rewards WHERE user_id = p_user_id;
  IF v_daily_rewards IS NOT NULL AND v_daily_rewards.current_streak >= 7 THEN
    IF (SELECT award_badge(p_user_id, 'login_streak', 'Dedicated User', 'Maintained a 7-day login streak')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'login_streak'); END IF; END IF;
  IF EXISTS (SELECT 1 FROM task_progress WHERE user_id = p_user_id AND tasks_completed >= 10) THEN
    IF (SELECT award_badge(p_user_id, 'task_champion', 'Task Champion', 'Completed 10 or more tasks')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'task_champion'); END IF; END IF;
  RETURN json_build_object('success', true, 'badges_awarded', v_badges_awarded);
END;
$function$;

-- Revokes
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_task_progress(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.verify_admin_access() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_daily_reward(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.spin_wheel(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.redeem_gift_card(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_gift_card(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.purchase_gift_card(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.record_ad_completion(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_register_device(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_and_award_badges(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_unlink_device(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_social_task(uuid, boolean, text) FROM PUBLIC, anon;

-- gift_cards: drop all SELECT policies then add admin-only
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.gift_cards'::regclass
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.gift_cards', p.polname); END LOOP;
END $$;

CREATE POLICY "Admins can manage gift cards"
ON public.gift_cards FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_badges: own badges only
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT polname FROM pg_policy WHERE polrelid = 'public.user_badges'::regclass
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_badges', p.polname); END LOOP;
END $$;

CREATE POLICY "Users view own badges"
ON public.user_badges FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage all badges"
ON public.user_badges FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- storage.objects policies for uploads bucket
DROP POLICY IF EXISTS "Public can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON storage.objects;

CREATE POLICY "Public can view uploads"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'uploads');

CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
