-- Enable Realtime for items and item_claims tables
-- This allows Supabase to broadcast changes to these tables in real-time

-- Enable REPLICA IDENTITY FULL to ensure that the old record is included in the payload
-- This is useful for tracking exactly what changed, though not strictly required for basic sync
ALTER TABLE public.items REPLICA IDENTITY FULL;
ALTER TABLE public.item_claims REPLICA IDENTITY FULL;

-- Add tables to the supabase_realtime publication
-- First, ensure the publication exists (it usually does by default)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_claims;
