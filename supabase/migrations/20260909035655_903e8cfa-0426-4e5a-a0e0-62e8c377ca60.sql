DROP FUNCTION IF EXISTS public.record_google_sign_in_report();

GRANT INSERT ON TABLE public.admin_auth_reports TO authenticated;

CREATE POLICY "Users can record their own Google sign-in"
ON public.admin_auth_reports
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND provider = 'google'
  AND action = 'sign_in'
);

CREATE OR REPLACE FUNCTION public.record_google_sign_in_report()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_report_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'AUTH_REQUIRED');
  END IF;

  INSERT INTO public.admin_auth_reports (user_id, provider, email, action)
  SELECT v_user_id, 'google', email, 'sign_in'
  FROM auth.users
  WHERE id = v_user_id
  RETURNING id INTO v_report_id;

  IF v_report_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'USER_NOT_FOUND');
  END IF;

  RETURN json_build_object('success', true, 'report_id', v_report_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_google_sign_in_report() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_google_sign_in_report() FROM PUBLIC, anon;