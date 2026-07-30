-- Revoke direct execution of internal-only SECURITY DEFINER helpers from client roles
REVOKE EXECUTE ON FUNCTION public.award_badge(uuid, text, text, text) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_task_progress(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pay_pending_referral_bonus(uuid) FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_profile() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.trg_gift_card_completed_referral() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_admin_access() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.award_badge(uuid, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_task_progress(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.pay_pending_referral_bonus(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_admin_access() TO service_role;
