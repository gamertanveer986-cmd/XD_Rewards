
-- Device registrations: one device <-> one user
CREATE TABLE public.device_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  device_id_hash text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  unlinked_at timestamptz
);

GRANT SELECT ON public.device_registrations TO authenticated;
GRANT ALL ON public.device_registrations TO service_role;

ALTER TABLE public.device_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own device registration"
ON public.device_registrations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all device registrations"
ON public.device_registrations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage device registrations"
ON public.device_registrations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_device_registrations_hash ON public.device_registrations(device_id_hash);

-- Register or verify the calling user's device
CREATE OR REPLACE FUNCTION public.check_and_register_device(
  p_device_id_hash text,
  p_platform text DEFAULT 'unknown'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_user uuid;
  v_user_existing_device text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'AUTH_REQUIRED', 'message', 'Authentication required');
  END IF;

  IF p_device_id_hash IS NULL OR length(p_device_id_hash) < 8 THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_DEVICE', 'message', 'Invalid device identifier');
  END IF;

  -- Is this device already linked to someone?
  SELECT user_id INTO v_existing_user
  FROM device_registrations
  WHERE device_id_hash = p_device_id_hash;

  -- Is the current user already linked to a device?
  SELECT device_id_hash INTO v_user_existing_device
  FROM device_registrations
  WHERE user_id = v_user_id;

  -- Case 1: device exists, belongs to a different user -> block
  IF v_existing_user IS NOT NULL AND v_existing_user <> v_user_id THEN
    RETURN json_build_object(
      'success', false,
      'code', 'DEVICE_IN_USE',
      'message', 'This device is already registered to another account. Only one account per device is allowed.'
    );
  END IF;

  -- Case 2: user already linked to a different device -> block
  IF v_user_existing_device IS NOT NULL AND v_user_existing_device <> p_device_id_hash THEN
    RETURN json_build_object(
      'success', false,
      'code', 'ACCOUNT_LOCKED_TO_OTHER_DEVICE',
      'message', 'Your account is locked to a different device. Please use your original device or contact support.'
    );
  END IF;

  -- Case 3: already matched -> OK
  IF v_existing_user = v_user_id THEN
    RETURN json_build_object('success', true, 'code', 'ALREADY_REGISTERED');
  END IF;

  -- Case 4: register fresh
  INSERT INTO device_registrations (user_id, device_id_hash, platform)
  VALUES (v_user_id, p_device_id_hash, p_platform);

  RETURN json_build_object('success', true, 'code', 'REGISTERED');
END;
$$;

-- Admin: unlink a device (allows a phone to be reused, or an account to migrate)
CREATE OR REPLACE FUNCTION public.admin_unlink_device(p_registration_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'message', 'Admin access required');
  END IF;

  DELETE FROM device_registrations WHERE id = p_registration_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Registration not found');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Device unlinked');
END;
$$;
