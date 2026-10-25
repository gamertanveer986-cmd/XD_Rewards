CREATE TABLE public.survey_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL DEFAULT 'survey' CHECK (task_type IN ('survey','time_task')),
  title text NOT NULL,
  description text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  reward_coins integer NOT NULL DEFAULT 50,
  time_limit_seconds integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.survey_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.survey_tasks(id) ON DELETE CASCADE,
  answers jsonb,
  reward_coins integer NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_id)
);

CREATE INDEX idx_survey_tasks_active ON public.survey_tasks (is_active, task_type);
CREATE INDEX idx_survey_completions_user ON public.survey_completions (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.survey_tasks TO authenticated;
GRANT ALL ON public.survey_tasks TO service_role;
GRANT SELECT ON public.survey_completions TO authenticated;
GRANT ALL ON public.survey_completions TO service_role;

ALTER TABLE public.survey_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view active earning tasks" ON public.survey_tasks
  FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage earning tasks" ON public.survey_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own completions" ON public.survey_completions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_survey_tasks_updated_at
  BEFORE UPDATE ON public.survey_tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE FUNCTION private.complete_survey(p_user_id uuid, p_task_id uuid, p_answers jsonb DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_task record;
  v_reward integer;
BEGIN
  IF p_user_id IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF NOT public.check_rate_limit(p_user_id, 'complete_survey', 20, 60) THEN
    RETURN json_build_object('success', false, 'error', 'rate_limited');
  END IF;

  SELECT * INTO v_task FROM survey_tasks WHERE id = p_task_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'task_not_found');
  END IF;

  IF v_task.task_type = 'survey' AND (p_answers IS NULL OR jsonb_typeof(p_answers) <> 'object') THEN
    RETURN json_build_object('success', false, 'error', 'answers_required');
  END IF;

  v_reward := v_task.reward_coins;

  INSERT INTO survey_completions (user_id, task_id, answers, reward_coins)
  VALUES (p_user_id, p_task_id, p_answers, v_reward);

  UPDATE user_profiles
  SET non_withdrawable_balance = non_withdrawable_balance + (v_reward / 100.0),
      total_earnings = total_earnings + (v_reward / 100.0),
      weekly_earnings = weekly_earnings + (v_reward / 100.0),
      updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO transactions (user_id, amount, transaction_type, description)
  VALUES (
    p_user_id,
    v_reward / 100.0,
    CASE WHEN v_task.task_type = 'time_task' THEN 'time_task_reward' ELSE 'survey_reward' END,
    CASE WHEN v_task.task_type = 'time_task' THEN 'Time task completed: ' ELSE 'Survey completed: ' END || v_task.title
  );

  RETURN json_build_object('success', true, 'reward_coins', v_reward);
EXCEPTION WHEN unique_violation THEN
  RETURN json_build_object('success', false, 'error', 'already_completed');
END;
$$;

REVOKE ALL ON FUNCTION private.complete_survey(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_survey(p_user_id uuid, p_task_id uuid, p_answers jsonb DEFAULT NULL)
RETURNS json
LANGUAGE sql
SET search_path TO 'public'
AS $$ SELECT private.complete_survey(p_user_id, p_task_id, p_answers); $$;

GRANT EXECUTE ON FUNCTION public.complete_survey(uuid, uuid, jsonb) TO anon, authenticated;
COMMENT ON FUNCTION public.complete_survey IS 'Public entry point for survey/time-task rewards; validates the caller session inside private.complete_survey.';