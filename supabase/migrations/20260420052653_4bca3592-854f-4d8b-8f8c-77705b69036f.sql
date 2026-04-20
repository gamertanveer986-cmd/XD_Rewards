
-- Retroactively award missed milestone bonuses for users with existing task progress
DO $$
DECLARE
  v_user record;
  v_config jsonb;
  v_milestones jsonb;
  v_milestone record;
  v_bonus numeric;
  v_new_last_milestone integer;
BEGIN
  SELECT config_json INTO v_config FROM gamification_config WHERE feature_key = 'task_bonus' AND is_enabled = true;
  IF v_config IS NULL THEN RETURN; END IF;
  v_milestones := v_config->'milestones';

  FOR v_user IN 
    SELECT user_id, tasks_completed, last_milestone_claimed FROM task_progress WHERE tasks_completed > 0
  LOOP
    v_new_last_milestone := v_user.last_milestone_claimed;
    FOR v_milestone IN SELECT * FROM jsonb_array_elements(v_milestones) AS m
    LOOP
      IF v_user.tasks_completed >= (v_milestone.value->>'tasks')::integer 
         AND v_new_last_milestone < (v_milestone.value->>'tasks')::integer THEN
        v_bonus := (v_milestone.value->>'reward')::numeric / 100;
        UPDATE user_profiles
          SET non_withdrawable_balance = non_withdrawable_balance + v_bonus,
              total_earnings = total_earnings + v_bonus,
              updated_at = now()
          WHERE user_id = v_user.user_id;
        INSERT INTO transactions (user_id, amount, transaction_type, description)
          VALUES (v_user.user_id, v_bonus, 'task_bonus', 'Task milestone bonus (backfill): ' || (v_milestone.value->>'tasks') || ' tasks completed');
        v_new_last_milestone := (v_milestone.value->>'tasks')::integer;
      END IF;
    END LOOP;
    IF v_new_last_milestone <> v_user.last_milestone_claimed THEN
      UPDATE task_progress SET last_milestone_claimed = v_new_last_milestone, updated_at = now() WHERE user_id = v_user.user_id;
    END IF;
  END LOOP;
END $$;
