-- Remove insecure legacy overload (no auth check)
DROP FUNCTION IF EXISTS public.purchase_gift_card(uuid, uuid);

-- Harden the active overload with auth + rate limit + input validation
CREATE OR REPLACE FUNCTION public.purchase_gift_card(p_user_id uuid, p_product_id uuid, p_email text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_product gift_card_products%ROWTYPE;
  v_balance numeric;
  v_purchase_id uuid;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RETURN json_build_object('success', false, 'message', 'Authentication required');
  END IF;

  IF NOT check_rate_limit(p_user_id, 'purchase_gift_card', 10, 60) THEN
    RETURN json_build_object('success', false, 'message', 'Too many attempts. Please try again later.');
  END IF;

  IF p_email IS NOT NULL AND (length(p_email) > 254 OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') THEN
    RETURN json_build_object('success', false, 'message', 'Invalid email address');
  END IF;

  SELECT * INTO v_product
  FROM gift_card_products
  WHERE id = p_product_id AND is_active = true;

  IF v_product.id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Product not found or inactive');
  END IF;

  SELECT total_earnings INTO v_balance
  FROM user_profiles
  WHERE user_id = p_user_id;

  IF v_balance IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User profile not found');
  END IF;

  IF v_balance < v_product.price THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  UPDATE user_profiles
  SET
    total_earnings = total_earnings - v_product.price,
    non_withdrawable_balance = GREATEST(0, non_withdrawable_balance - v_product.price),
    updated_at = now()
  WHERE user_id = p_user_id;

  INSERT INTO gift_card_purchases (user_id, product_id, amount_paid, status, email)
  VALUES (p_user_id, p_product_id, v_product.price, 'pending', p_email)
  RETURNING id INTO v_purchase_id;

  INSERT INTO transactions (user_id, transaction_type, amount, description)
  VALUES (p_user_id, 'redemption', -v_product.price, 'Redeemed: ' || v_product.name);

  RETURN json_build_object('success', true, 'message', 'Redemption request submitted', 'purchase_id', v_purchase_id);
END;
$function$;

REVOKE ALL ON FUNCTION public.purchase_gift_card(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_gift_card(uuid, uuid, text) TO authenticated;

-- Internal helpers: not callable directly by clients
REVOKE ALL ON FUNCTION public.get_user_roles(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.verify_admin_access() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.verify_admin_access() TO service_role;