-- =============================================
-- GAMIFICATION SYSTEM TABLES
-- =============================================

-- 1. Gamification Configuration (Admin Editable)
CREATE TABLE public.gamification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text UNIQUE NOT NULL,
  feature_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.gamification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage gamification config"
ON public.gamification_config FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view enabled config"
ON public.gamification_config FOR SELECT
TO authenticated
USING (is_enabled = true);

-- Insert default configurations
INSERT INTO public.gamification_config (feature_key, feature_name, config_json) VALUES
('spin_wheel', 'Spin & Earn', '{"daily_spins": 2, "cooldown_hours": 12, "rewards": [100, 150, 200, 250, 300, 350, 400, 500]}'::jsonb),
('task_bonus', 'Task Performance Bonus', '{"milestones": [{"tasks": 3, "reward": 100}, {"tasks": 5, "reward": 250}, {"tasks": 10, "reward": 500}]}'::jsonb),
('badges', 'Achievement Badges', '{"badges": ["first_withdrawal", "referral_master", "login_streak", "task_champion"]}'::jsonb),
('social_tasks', 'Social Media Tasks', '{"instagram_follow_reward": 50, "instagram_like_reward": 25, "instagram_handle": "@xd_rewards_official"}'::jsonb);

-- 2. Spin History Table
CREATE TABLE public.spin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_amount integer NOT NULL,
  spun_at timestamptz DEFAULT now(),
  device_fingerprint text,
  ip_hash text
);

ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own spin history"
ON public.spin_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Block direct inserts to spin_history"
ON public.spin_history FOR INSERT
WITH CHECK (false);

-- 3. User Badges Table
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_key text NOT NULL,
  badge_name text NOT NULL,
  badge_description text,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, badge_key)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
ON public.user_badges FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Public can view all badges for leaderboard"
ON public.user_badges FOR SELECT
USING (true);

CREATE POLICY "Block direct badge inserts"
ON public.user_badges FOR INSERT
WITH CHECK (false);

-- 4. Task Progress Tracking
CREATE TABLE public.task_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tasks_completed integer DEFAULT 0,
  last_milestone_claimed integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own task progress"
ON public.task_progress FOR SELECT
USING (auth.uid() = user_id);

-- 5. Social Task Submissions
CREATE TABLE public.social_task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  screenshot_url text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reward_amount integer,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE public.social_task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own submissions"
ON public.social_task_submissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can submit social tasks"
ON public.social_task_submissions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
ON public.social_task_submissions FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update submissions"
ON public.social_task_submissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- 6. Notification Preferences Table
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  notifications_enabled boolean DEFAULT false,
  last_prompt_at timestamptz,
  prompt_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id);

-- =============================================
-- SECURE SERVER-SIDE FUNCTIONS
-- =============================================

-- Spin Wheel Function with Anti-Cheat
CREATE OR REPLACE FUNCTION public.spin_wheel(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config jsonb;
  v_daily_spins integer;
  v_cooldown_hours integer;
  v_rewards integer[];
  v_today_spins integer;
  v_last_spin timestamptz;
  v_reward integer;
  v_random_index integer;
  v_is_enabled boolean;
BEGIN
  -- Verify user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;

  -- Rate limit: 10 attempts per hour
  IF NOT check_rate_limit(p_user_id, 'spin_wheel', 10, 60) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again later.');
  END IF;

  -- Get spin wheel config
  SELECT config_json, is_enabled INTO v_config, v_is_enabled
  FROM gamification_config
  WHERE feature_key = 'spin_wheel';

  IF NOT v_is_enabled THEN
    RETURN json_build_object('success', false, 'message', 'Spin wheel is currently disabled');
  END IF;

  v_daily_spins := COALESCE((v_config->>'daily_spins')::integer, 2);
  v_cooldown_hours := COALESCE((v_config->>'cooldown_hours')::integer, 12);
  
  -- Parse rewards array
  SELECT ARRAY(SELECT jsonb_array_elements_text(v_config->'rewards')::integer)
  INTO v_rewards;

  -- Count spins today
  SELECT COUNT(*), MAX(spun_at) INTO v_today_spins, v_last_spin
  FROM spin_history
  WHERE user_id = p_user_id
    AND spun_at > CURRENT_DATE;

  -- Check daily limit
  IF v_today_spins >= v_daily_spins THEN
    RETURN json_build_object('success', false, 'message', 'Daily spin limit reached. Try again tomorrow!', 'spins_remaining', 0);
  END IF;

  -- Check cooldown
  IF v_last_spin IS NOT NULL AND v_last_spin > now() - (v_cooldown_hours || ' hours')::interval THEN
    RETURN json_build_object('success', false, 'message', 'Please wait before spinning again', 
      'next_spin_at', v_last_spin + (v_cooldown_hours || ' hours')::interval);
  END IF;

  -- Random reward selection
  v_random_index := floor(random() * array_length(v_rewards, 1)) + 1;
  v_reward := v_rewards[v_random_index];

  -- Record spin
  INSERT INTO spin_history (user_id, reward_amount)
  VALUES (p_user_id, v_reward);

  -- Credit reward to user (non-withdrawable)
  UPDATE user_profiles
  SET 
    non_withdrawable_balance = non_withdrawable_balance + (v_reward::numeric / 100),
    total_earnings = total_earnings + (v_reward::numeric / 100),
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_reward::numeric / 100, 'spin_reward', 'Spin wheel reward: ' || v_reward || ' coins');

  -- Increment task progress
  PERFORM increment_task_progress(p_user_id);

  RETURN json_build_object('success', true, 'reward', v_reward, 'spins_remaining', v_daily_spins - v_today_spins - 1);
END;
$$;

-- Task Progress Increment Function
CREATE OR REPLACE FUNCTION public.increment_task_progress(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config jsonb;
  v_milestones jsonb;
  v_current_tasks integer;
  v_last_milestone integer;
  v_milestone record;
  v_bonus numeric;
  v_is_enabled boolean;
BEGIN
  -- Get task bonus config
  SELECT config_json, is_enabled INTO v_config, v_is_enabled
  FROM gamification_config
  WHERE feature_key = 'task_bonus';

  IF NOT v_is_enabled THEN
    RETURN;
  END IF;

  v_milestones := v_config->'milestones';

  -- Upsert task progress
  INSERT INTO task_progress (user_id, tasks_completed, last_milestone_claimed)
  VALUES (p_user_id, 1, 0)
  ON CONFLICT (user_id) DO UPDATE 
  SET tasks_completed = task_progress.tasks_completed + 1, updated_at = now()
  RETURNING tasks_completed, last_milestone_claimed INTO v_current_tasks, v_last_milestone;

  -- Check for milestone rewards
  FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_milestones) AS m
  LOOP
    IF v_current_tasks >= (v_milestone.value->>'tasks')::integer 
       AND v_last_milestone < (v_milestone.value->>'tasks')::integer THEN
      
      v_bonus := (v_milestone.value->>'reward')::numeric / 100;
      
      -- Credit bonus
      UPDATE user_profiles
      SET 
        non_withdrawable_balance = non_withdrawable_balance + v_bonus,
        total_earnings = total_earnings + v_bonus,
        updated_at = now()
      WHERE user_id = p_user_id;

      -- Record transaction
      INSERT INTO transactions (user_id, amount, transaction_type, description)
      VALUES (p_user_id, v_bonus, 'task_bonus', 'Task milestone bonus: ' || (v_milestone.value->>'tasks') || ' tasks completed');

      -- Update last milestone
      UPDATE task_progress
      SET last_milestone_claimed = (v_milestone.value->>'tasks')::integer
      WHERE user_id = p_user_id;
    END IF;
  END LOOP;
END;
$$;

-- Award Badge Function
CREATE OR REPLACE FUNCTION public.award_badge(
  p_user_id uuid, 
  p_badge_key text, 
  p_badge_name text, 
  p_badge_description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_key, badge_name, badge_description)
  VALUES (p_user_id, p_badge_key, p_badge_name, p_badge_description)
  ON CONFLICT (user_id, badge_key) DO NOTHING;
  
  RETURN FOUND;
END;
$$;

-- Check and Award Badges Function
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_badges_awarded text[] := '{}';
  v_daily_rewards record;
BEGIN
  -- Get user profile
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = p_user_id;
  
  IF v_profile IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;

  -- Check First Withdrawal Badge
  IF EXISTS (SELECT 1 FROM transactions WHERE user_id = p_user_id AND transaction_type = 'withdrawal' LIMIT 1) THEN
    IF (SELECT award_badge(p_user_id, 'first_withdrawal', 'First Withdrawal', 'Completed your first withdrawal')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'first_withdrawal');
    END IF;
  END IF;

  -- Check Referral Master Badge (5+ referrals)
  IF v_profile.referrals_count >= 5 THEN
    IF (SELECT award_badge(p_user_id, 'referral_master', 'Referral Master', 'Referred 5 or more users')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'referral_master');
    END IF;
  END IF;

  -- Check Login Streak Badge (7 day streak)
  SELECT * INTO v_daily_rewards FROM daily_rewards WHERE user_id = p_user_id;
  IF v_daily_rewards IS NOT NULL AND v_daily_rewards.current_streak >= 7 THEN
    IF (SELECT award_badge(p_user_id, 'login_streak', 'Dedicated User', 'Maintained a 7-day login streak')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'login_streak');
    END IF;
  END IF;

  -- Check Task Champion Badge (10+ tasks)
  IF EXISTS (SELECT 1 FROM task_progress WHERE user_id = p_user_id AND tasks_completed >= 10) THEN
    IF (SELECT award_badge(p_user_id, 'task_champion', 'Task Champion', 'Completed 10 or more tasks')) THEN
      v_badges_awarded := array_append(v_badges_awarded, 'task_champion');
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'badges_awarded', v_badges_awarded);
END;
$$;

-- Approve Social Task Submission (Admin Only)
CREATE OR REPLACE FUNCTION public.approve_social_task(
  p_submission_id uuid,
  p_approved boolean,
  p_admin_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission record;
  v_config jsonb;
  v_reward integer;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Admin access required');
  END IF;

  -- Get submission
  SELECT * INTO v_submission FROM social_task_submissions WHERE id = p_submission_id;
  
  IF v_submission IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Submission not found');
  END IF;

  IF v_submission.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Submission already processed');
  END IF;

  -- Get reward config
  SELECT config_json INTO v_config FROM gamification_config WHERE feature_key = 'social_tasks';
  
  IF v_submission.task_type = 'follow' THEN
    v_reward := COALESCE((v_config->>'instagram_follow_reward')::integer, 50);
  ELSE
    v_reward := COALESCE((v_config->>'instagram_like_reward')::integer, 25);
  END IF;

  -- Update submission
  UPDATE social_task_submissions
  SET 
    status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
    reward_amount = CASE WHEN p_approved THEN v_reward ELSE NULL END,
    admin_notes = p_admin_notes,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_submission_id;

  -- Credit reward if approved
  IF p_approved THEN
    UPDATE user_profiles
    SET 
      non_withdrawable_balance = non_withdrawable_balance + (v_reward::numeric / 100),
      total_earnings = total_earnings + (v_reward::numeric / 100),
      updated_at = now()
    WHERE user_id = v_submission.user_id;

    INSERT INTO transactions (user_id, amount, transaction_type, description)
    VALUES (v_submission.user_id, v_reward::numeric / 100, 'social_reward', 'Social task reward: ' || v_submission.task_type);

    -- Increment task progress
    PERFORM increment_task_progress(v_submission.user_id);
  END IF;

  RETURN json_build_object('success', true, 'status', CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END);
END;
$$;