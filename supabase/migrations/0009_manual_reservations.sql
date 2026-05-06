-- Manual ("blockout") reservations.
--
-- New shop owners often arrive with a stack of bookings made on paper before
-- they joined the platform. They want to add those into the timetable so the
-- public reservation form sees those slots as 불가, but they don't want to
-- re-enter art / customer / option metadata they may not even remember.
--
-- A row with is_manual = true relaxes the snapshot fields that the customer
-- booking flow always populates. The CHECK constraint below preserves the
-- original NOT-NULL contract for non-manual rows so the customer flow stays
-- exactly as strict as before.

ALTER TABLE public.reservations
  ADD COLUMN is_manual boolean NOT NULL DEFAULT false;

ALTER TABLE public.reservations
  ALTER COLUMN service_category_id DROP NOT NULL,
  ALTER COLUMN art_id              DROP NOT NULL,
  ALTER COLUMN customer_name       DROP NOT NULL,
  ALTER COLUMN customer_phone      DROP NOT NULL,
  ALTER COLUMN art_name            DROP NOT NULL,
  ALTER COLUMN total_price         DROP NOT NULL,
  ALTER COLUMN deposit_amount      DROP NOT NULL;

-- Phone format check now also permits NULL (manual rows have no phone).
ALTER TABLE public.reservations DROP CONSTRAINT phone_format;
ALTER TABLE public.reservations ADD CONSTRAINT phone_format
  CHECK (customer_phone IS NULL OR customer_phone ~ '^010[0-9]{7,8}$');

-- Non-manual rows still require everything the customer flow snapshots.
ALTER TABLE public.reservations ADD CONSTRAINT manual_or_full
  CHECK (
    is_manual
    OR (
      service_category_id IS NOT NULL
      AND art_id              IS NOT NULL
      AND customer_name       IS NOT NULL
      AND customer_phone      IS NOT NULL
      AND art_name            IS NOT NULL
      AND total_price         IS NOT NULL
      AND deposit_amount      IS NOT NULL
    )
  );
