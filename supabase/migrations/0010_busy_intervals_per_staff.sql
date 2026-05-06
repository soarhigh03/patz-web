-- Per-staff busy intervals.
--
-- The reservation flow now treats availability as per-쌤: customers picking a
-- specific staff see only that staff's bookings; "상관없음" customers see the
-- union (any staff free). The owner dashboard groups the timetable by staff
-- via the same data. To enable that, the RPC needs to return which staff_id
-- each interval belongs to (NULL = unassigned "상관없음" pending request).
--
-- A function's RETURNS TABLE shape can't be altered with CREATE OR REPLACE,
-- so we drop and recreate.

DROP FUNCTION IF EXISTS public.get_busy_intervals(uuid, date);

CREATE FUNCTION public.get_busy_intervals(
  p_shop_id uuid,
  p_date date
)
RETURNS TABLE (
  start_minutes int,
  end_minutes int,
  staff_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (EXTRACT(HOUR FROM r.reservation_time)::int * 60
       + EXTRACT(MINUTE FROM r.reservation_time)::int) AS start_minutes,
    (EXTRACT(HOUR FROM r.reservation_time)::int * 60
       + EXTRACT(MINUTE FROM r.reservation_time)::int
       + r.duration_minutes) AS end_minutes,
    r.staff_id
  FROM public.reservations r
  WHERE r.shop_id = p_shop_id
    AND r.reservation_date = p_date
    AND r.status IN ('pending', 'confirmed');
$$;

REVOKE ALL ON FUNCTION public.get_busy_intervals(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_busy_intervals(uuid, date) TO anon, authenticated;
