-- AI bot settings
CREATE TABLE public.ai_bot_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_bot_settings TO authenticated;
GRANT ALL ON public.ai_bot_settings TO service_role;
ALTER TABLE public.ai_bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai bot settings" ON public.ai_bot_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_bot_settings_updated
BEFORE UPDATE ON public.ai_bot_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- User bans
CREATE TABLE public.user_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  banned_by text NOT NULL DEFAULT 'ai_bot',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  lifted_at timestamptz,
  lifted_by uuid
);
CREATE UNIQUE INDEX user_bans_active_unique ON public.user_bans (user_id) WHERE is_active;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_bans TO authenticated;
GRANT ALL ON public.user_bans TO service_role;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage bans" ON public.user_bans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own ban" ON public.user_bans
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_user_bans_updated
BEFORE UPDATE ON public.user_bans
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- AI bot alerts
CREATE TABLE public.ai_bot_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'fraud',
  severity text NOT NULL DEFAULT 'medium',
  title text NOT NULL,
  details text NOT NULL,
  ai_reasoning text,
  user_id uuid,
  action_taken text NOT NULL DEFAULT 'none',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_bot_alerts TO authenticated;
GRANT ALL ON public.ai_bot_alerts TO service_role;
ALTER TABLE public.ai_bot_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ai bot alerts" ON public.ai_bot_alerts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_ai_bot_alerts_updated
BEFORE UPDATE ON public.ai_bot_alerts
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Am I banned? (self check)
CREATE OR REPLACE FUNCTION public.is_current_user_banned()
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT json_build_object('banned', true, 'reason', reason, 'since', created_at)
     FROM public.user_bans WHERE user_id = auth.uid() AND is_active LIMIT 1),
    json_build_object('banned', false)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_current_user_banned() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_current_user_banned() TO authenticated;

-- Admin lifts a ban
CREATE OR REPLACE FUNCTION public.admin_lift_ban(p_ban_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Admin access required');
  END IF;
  UPDATE public.user_bans
    SET is_active = false, lifted_at = now(), lifted_by = auth.uid()
  WHERE id = p_ban_id AND is_active;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Active ban not found');
  END IF;
  RETURN json_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_lift_ban(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_lift_ban(uuid) TO authenticated;

-- Default bot configuration
INSERT INTO public.ai_bot_settings (setting_key, setting_name, is_enabled, config_json) VALUES
('guardian', 'AI Guardian', true, jsonb_build_object(
  'auto_ban', true,
  'sensitivity', 'balanced',
  'min_confidence_to_ban', 80,
  'scan_window_hours', 24,
  'max_users_per_scan', 40,
  'model', 'google/gemini-3.5-flash',
  'detect_bugs', true,
  'auto_fix_settings', true,
  'notify_admin', true,
  'rules', jsonb_build_array(
    'More than 200 ad completions in 24 hours is not humanly plausible',
    'Ad completions with duration far below the required watch time indicate skipping',
    'Many ad rewards within a few seconds of each other indicate automation/scripting',
    'Multiple accounts sharing the same device fingerprint indicate multi-accounting',
    'Referral bonuses without any real earning activity indicate fake referrals',
    'Balance growing faster than the sum of legitimate reward events indicates exploitation'
  ),
  'custom_instructions', ''
));