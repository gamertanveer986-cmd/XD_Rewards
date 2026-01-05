-- Create gift_cards table for admin-created gift card codes
CREATE TABLE public.gift_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  value numeric NOT NULL CHECK (value > 0),
  is_redeemed boolean NOT NULL DEFAULT false,
  redeemed_by uuid REFERENCES auth.users(id),
  redeemed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

-- Create gift_card_products table for purchasable gift cards
CREATE TABLE public.gift_card_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  brand text NOT NULL,
  denomination numeric NOT NULL CHECK (denomination > 0),
  price numeric NOT NULL CHECK (price > 0),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create gift_card_purchases table for tracking user purchases
CREATE TABLE public.gift_card_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.gift_card_products(id),
  amount_paid numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  redemption_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  processed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gift_card_purchases ENABLE ROW LEVEL SECURITY;

-- Gift cards policies (admin only for management)
CREATE POLICY "Admins can manage gift cards" ON public.gift_cards
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view available gift cards for redemption" ON public.gift_cards
  FOR SELECT USING (is_redeemed = false AND (expires_at IS NULL OR expires_at > now()));

-- Gift card products policies
CREATE POLICY "Anyone can view active gift card products" ON public.gift_card_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage gift card products" ON public.gift_card_products
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Gift card purchases policies
CREATE POLICY "Users can view their own purchases" ON public.gift_card_purchases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON public.gift_card_purchases
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update purchases" ON public.gift_card_purchases
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- Function to redeem a gift card code
CREATE OR REPLACE FUNCTION public.redeem_gift_card(p_user_id uuid, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift_card record;
  v_result json;
BEGIN
  -- Validate the user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Find the gift card
  SELECT * INTO v_gift_card
  FROM public.gift_cards
  WHERE UPPER(code) = UPPER(p_code)
    AND is_redeemed = false
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF v_gift_card IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or expired gift card code');
  END IF;

  -- Mark as redeemed
  UPDATE public.gift_cards
  SET is_redeemed = true, redeemed_by = p_user_id, redeemed_at = now()
  WHERE id = v_gift_card.id;

  -- Add balance to user
  UPDATE public.user_profiles
  SET withdrawable_balance = withdrawable_balance + v_gift_card.value,
      total_earnings = total_earnings + v_gift_card.value,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, v_gift_card.value, 'gift_card', 'Gift card redeemed: ' || v_gift_card.code);

  RETURN json_build_object('success', true, 'value', v_gift_card.value, 'message', 'Gift card redeemed! ₹' || v_gift_card.value || ' added to your balance');
END;
$$;

-- Function to purchase a gift card
CREATE OR REPLACE FUNCTION public.purchase_gift_card(p_user_id uuid, p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product record;
  v_balance numeric;
  v_result json;
BEGIN
  -- Validate the user
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get product details
  SELECT * INTO v_product
  FROM public.gift_card_products
  WHERE id = p_product_id AND is_active = true;

  IF v_product IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Product not available');
  END IF;

  -- Check user balance
  SELECT withdrawable_balance INTO v_balance
  FROM public.user_profiles
  WHERE user_id = p_user_id;

  IF v_balance < v_product.price THEN
    RETURN json_build_object('success', false, 'message', 'Insufficient balance');
  END IF;

  -- Deduct balance
  UPDATE public.user_profiles
  SET withdrawable_balance = withdrawable_balance - v_product.price,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Create purchase record
  INSERT INTO public.gift_card_purchases (user_id, product_id, amount_paid, status)
  VALUES (p_user_id, p_product_id, v_product.price, 'pending');

  -- Record transaction
  INSERT INTO public.transactions (user_id, amount, transaction_type, description)
  VALUES (p_user_id, -v_product.price, 'gift_card_purchase', 'Purchased ' || v_product.brand || ' ₹' || v_product.denomination || ' gift card');

  RETURN json_build_object('success', true, 'message', 'Gift card purchase request submitted! You will receive the code shortly.');
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_gift_card_products_updated_at
  BEFORE UPDATE ON public.gift_card_products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert some default gift card products
INSERT INTO public.gift_card_products (name, brand, denomination, price, is_active) VALUES
  ('Amazon Gift Card ₹100', 'Amazon', 100, 95, true),
  ('Amazon Gift Card ₹200', 'Amazon', 200, 190, true),
  ('Amazon Gift Card ₹500', 'Amazon', 500, 475, true),
  ('Google Play ₹100', 'Google Play', 100, 95, true),
  ('Google Play ₹200', 'Google Play', 200, 190, true),
  ('Flipkart Gift Card ₹100', 'Flipkart', 100, 95, true),
  ('Flipkart Gift Card ₹200', 'Flipkart', 200, 190, true);