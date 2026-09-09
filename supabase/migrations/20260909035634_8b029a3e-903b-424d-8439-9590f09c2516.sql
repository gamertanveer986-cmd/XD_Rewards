CREATE TABLE public.admin_auth_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google')),
  email TEXT,
  action TEXT NOT NULL DEFAULT 'sign_in' CHECK (action IN ('sign_in')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT ON TABLE public.admin_auth_reports TO authenticated;
GRANT ALL ON TABLE public.admin_auth_reports TO service_role;

ALTER TABLE public.admin_auth_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view Google sign-in reports"
ON public.admin_auth_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.record_google_sign_in_report()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_report_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'AUTH_REQUIRED');
  END IF;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  INSERT INTO public.admin_auth_reports (user_id, provider, email, action)
  VALUES (v_user_id, 'google', v_email, 'sign_in')
  RETURNING id INTO v_report_id;

  RETURN json_build_object('success', true, 'report_id', v_report_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_google_sign_in_report() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.record_google_sign_in_report() FROM PUBLIC, anon;