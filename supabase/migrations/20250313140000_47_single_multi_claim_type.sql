-- Add claim_type column to items table
-- ISSUE-#47: Configure whether items can be claimed by single person (gets all) or multiple people (split quantity)

ALTER TABLE items ADD COLUMN claim_type TEXT DEFAULT 'single';

-- Add check constraint to ensure only valid values
ALTER TABLE items ADD CONSTRAINT items_claim_type_check
  CHECK (claim_type IN ('single', 'multiple'));

-- Add comment for documentation
COMMENT ON COLUMN items.claim_type IS 'Claim type: single=one person gets all quantity, multiple=allow splitting between members';
