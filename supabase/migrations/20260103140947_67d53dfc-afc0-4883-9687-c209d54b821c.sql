-- Create admob_config table to store AdMob settings
CREATE TABLE public.admob_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id text NOT NULL,
  rewarded_ad_unit_id text NOT NULL,
  banner_ad_unit_id text,
  interstitial_ad_unit_id text,
  is_testing boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.admob_config ENABLE ROW LEVEL SECURITY;

-- Only admins can view config
CREATE POLICY "Admins can view admob config"
ON public.admob_config
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert config
CREATE POLICY "Admins can insert admob config"
ON public.admob_config
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can update config
CREATE POLICY "Admins can update admob config"
ON public.admob_config
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete config
CREATE POLICY "Admins can delete admob config"
ON public.admob_config
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default config with current hardcoded values
INSERT INTO public.admob_config (app_id, rewarded_ad_unit_id, is_testing)
VALUES ('ca-app-pub-3054032487800382~8724927542', 'ca-app-pub-3054032487800382/2547473951', false);