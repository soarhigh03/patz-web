-- Returns the (start, end) windows occupied by pending + confirmed
-- reservations on a given date for a shop. Anonymous customers calling
-- the reservation form need this to render "불가" pills, but RLS hides
-- reservations.* from anon — so the data is exposed via this
-- SECURITY DEFINER function which only returns minutes-of-day, no PII.

CREATE OR REPLACE FUNCTION public.get_busy_intervals(
  p_shop_id uuid,
  p_date date
)
RETURNS TABLE (start_minutes int, end_minutes int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (EXTRACT(HOUR FROM reservation_time)::int * 60
       + EXTRACT(MINUTE FROM reservation_time)::int) AS start_minutes,
    (EXTRACT(HOUR FROM reservation_time)::int * 60
       + EXTRACT(MINUTE FROM reservation_time)::int
       + duration_minutes) AS end_minutes
  FROM public.reservations
  WHERE shop_id = p_shop_id
    AND reservation_date = p_date
    AND status IN ('pending', 'confirmed');
$$;

REVOKE ALL ON FUNCTION public.get_busy_intervals(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_busy_intervals(uuid, date) TO anon, authenticated;
