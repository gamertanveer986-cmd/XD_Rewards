GRANT SELECT ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.check_and_register_device(
  p_device_id_hash text,
  p_platform text DEFAULT 'unknown'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_user uuid;
  v_user_existing_device text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'AUTH_REQUIRED', 'message', 'Authentication required');
  END IF;

  -- Administrators are authenticated and authorized by their database role.
  -- They must remain able to access the admin portal from managed devices.
  IF public.has_role(v_user_id, 'admin'::public.app_role) THEN
    RETURN json_build_object('success', true, 'code', 'ADMIN_EXEMPT');
  END IF;

  IF p_device_id_hash IS NULL OR length(p_device_id_hash) < 8 THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_DEVICE', 'message', 'Invalid device identifier');
  END IF;

  SELECT user_id INTO v_existing_user
  FROM public.device_registrations
  WHERE device_id_hash = p_device_id_hash
    AND unlinked_at IS NULL;

  SELECT device_id_hash INTO v_user_existing_device
  FROM public.device_registrations
  WHERE user_id = v_user_id
    AND unlinked_at IS NULL;

  IF v_existing_user IS NOT NULL AND v_existing_user <> v_user_id THEN
    RETURN json_build_object(
      'success', false,
      'code', 'DEVICE_IN_USE',
      'message', 'This device is already registered to another account. Only one account per device is allowed.'
    );
  END IF;

  IF v_user_existing_device IS NOT NULL AND v_user_existing_device <> p_device_id_hash THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ACCOUNT_LOCKED_TO_OTHER_DEVICE',
      'message', 'Your account is locked to a different device. Please use your original device or contact support.'
    );
  END IF;

  IF v_existing_user = v_user_id THEN
    RETURN json_build_object('success', true, 'code', 'ALREADY_REGISTERED');
  END IF;

  INSERT INTO public.device_registrations (user_id, device_id_hash, platform)
  VALUES (v_user_id, p_device_id_hash, p_platform);

  RETURN json_build_object('success', true, 'code', 'REGISTERED');
END;
$function$;