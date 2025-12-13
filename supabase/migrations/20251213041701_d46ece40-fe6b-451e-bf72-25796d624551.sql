-- Create notifications table for admin broadcast messages
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_notifications table to track read status per user
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE CASCADE NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- Add UPI ID and payment status to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN upi_id TEXT,
ADD COLUMN payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'processing'));

-- Enable RLS on notifications tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can create notifications
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Users can view notifications sent to them
CREATE POLICY "Users can view their notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can insert user notifications
CREATE POLICY "Admins can insert user notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Users can update their own notification read status
CREATE POLICY "Users can update read status"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all user profiles for payment management
CREATE POLICY "Admins can view all profiles"
ON public.user_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update payment status
CREATE POLICY "Admins can update payment status"
ON public.user_profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));