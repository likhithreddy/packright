-- Migration: Create trip_readiness view for group packing progress
-- Issue: #50 (Merged into #47)

CREATE OR REPLACE VIEW public.trip_readiness AS
WITH item_stats AS (
  SELECT 
    trip_id,
    SUM(required_count) as total_required
  FROM public.items
  GROUP BY trip_id
),
claim_stats AS (
  SELECT 
    trip_id,
    SUM(quantity) as total_packed
  FROM public.item_claims
  WHERE is_packed = true
  GROUP BY trip_id
)
SELECT 
  t.id as trip_id,
  COALESCE(istats.total_required, 0) as total_required,
  COALESCE(cstats.total_packed, 0) as total_packed,
  CASE 
    WHEN COALESCE(istats.total_required, 0) = 0 THEN NULL
    ELSE ROUND((COALESCE(cstats.total_packed, 0)::numeric / istats.total_required::numeric) * 100)::integer
  END as percentage
FROM public.trips t
LEFT JOIN item_stats istats ON t.id = istats.trip_id
LEFT JOIN claim_stats cstats ON t.id = cstats.trip_id;

-- Grant access to authenticated users
GRANT SELECT ON public.trip_readiness TO authenticated;
