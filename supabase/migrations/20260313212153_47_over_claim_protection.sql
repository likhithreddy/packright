-- Migration: Prevent over-claiming of items
-- Issue: #47

CREATE OR REPLACE FUNCTION public.check_over_claim()
RETURNS TRIGGER AS $$
DECLARE
  total_needed INTEGER;
  total_claimed INTEGER;
BEGIN
  -- Get the required count for the item
  SELECT required_count INTO total_needed FROM public.items WHERE id = NEW.item_id;
  
  -- Calculate total claimed including the new/updated claim
  -- (excluding the current claim's old value if it's an update)
  SELECT COALESCE(SUM(quantity), 0) INTO total_claimed 
  FROM public.item_claims 
  WHERE item_id = NEW.item_id AND id != NEW.id;
  
  IF (total_claimed + NEW.quantity) > total_needed THEN
    RAISE EXCEPTION 'Item no longer needs to be claimed' USING ERRCODE = 'P0002';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_check_over_claim ON public.item_claims;

-- Create the trigger
CREATE TRIGGER tr_check_over_claim
BEFORE INSERT OR UPDATE ON public.item_claims
FOR EACH ROW EXECUTE FUNCTION public.check_over_claim();
