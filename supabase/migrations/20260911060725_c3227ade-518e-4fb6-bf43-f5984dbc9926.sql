CREATE OR REPLACE FUNCTION public.secure_admin_lift_ban(p_actor_id uuid, p_ban_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.admin_lift_ban(p_ban_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_admin_unlink_device(p_actor_id uuid, p_registration_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.admin_unlink_device(p_registration_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_apply_referral_code(p_actor_id uuid, p_user_id uuid, p_referral_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.apply_referral_code(p_user_id, p_referral_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_approve_social_task(p_actor_id uuid, p_submission_id uuid, p_approved boolean, p_admin_notes text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.approve_social_task(p_submission_id, p_approved, p_admin_notes);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_check_and_award_badges(p_actor_id uuid, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.check_and_award_badges(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_check_and_register_device(p_actor_id uuid, p_device_id_hash text, p_platform text DEFAULT 'unknown')
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.check_and_register_device(p_device_id_hash, p_platform);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_claim_daily_reward(p_actor_id uuid, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.claim_daily_reward(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_get_public_leaderboard(p_actor_id uuid, limit_count integer DEFAULT 50)
RETURNS TABLE(rank_position bigint, display_name text, avatar_url text, total_earnings numeric, referrals_count integer, ads_watched integer, is_current_user boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_actor_id IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  END IF;
  RETURN QUERY SELECT * FROM public.get_public_leaderboard(limit_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_is_current_user_banned(p_actor_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.is_current_user_banned();
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_purchase_gift_card(p_actor_id uuid, p_user_id uuid, p_product_id uuid, p_email text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.purchase_gift_card(p_user_id, p_product_id, p_email);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_record_ad_completion(p_actor_id uuid, p_user_id uuid, p_ad_duration integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.record_ad_completion(p_user_id, p_ad_duration);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_redeem_gift_card(p_actor_id uuid, p_user_id uuid, p_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.redeem_gift_card(p_user_id, p_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.secure_spin_wheel(p_actor_id uuid, p_user_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', p_actor_id::text, true);
  RETURN public.spin_wheel(p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.secure_admin_lift_ban(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_admin_unlink_device(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_apply_referral_code(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_approve_social_task(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_check_and_award_badges(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_check_and_register_device(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_claim_daily_reward(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_get_public_leaderboard(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_is_current_user_banned(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_purchase_gift_card(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_record_ad_completion(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_redeem_gift_card(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.secure_spin_wheel(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.secure_admin_lift_ban(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_admin_unlink_device(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_apply_referral_code(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_approve_social_task(uuid, uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_check_and_award_badges(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_check_and_register_device(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_claim_daily_reward(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_get_public_leaderboard(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_is_current_user_banned(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_purchase_gift_card(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_record_ad_completion(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_redeem_gift_card(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_spin_wheel(uuid, uuid) TO service_role;