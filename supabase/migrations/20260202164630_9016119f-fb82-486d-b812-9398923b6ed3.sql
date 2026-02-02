-- Drop and recreate the trigger function with conflict handling
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile with ON CONFLICT to handle duplicates gracefully
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Add signup bonus transaction only if profile was just created
  -- Check if a bonus transaction already exists for this user
  IF NOT EXISTS (
    SELECT 1 FROM public.transactions 
    WHERE user_id = NEW.id 
    AND transaction_type = 'bonus' 
    AND description = 'Signup bonus (non-withdrawable)'
  ) THEN
    INSERT INTO public.transactions (user_id, transaction_type, amount, description)
    VALUES (NEW.id, 'bonus', 10.00, 'Signup bonus (non-withdrawable)');
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();