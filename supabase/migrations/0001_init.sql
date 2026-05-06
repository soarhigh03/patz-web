-- ============================================================================
-- PATZ initial schema (v1)
--
-- Source of truth: docs/database-schema.md
-- Apply once via Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Order matches §11 of the schema doc.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Extensions
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;       -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;        -- shops.location, "near me"
-- pg_cron must be enabled via Dashboard → Database → Extensions before the
-- complete_finished_reservations() schedule call further down. If it's not
-- enabled yet, the cron.schedule() call will error — comment it out, run
-- the rest, then enable pg_cron and re-run the schedule call.
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ----------------------------------------------------------------------------
-- 2. Enums
-- ----------------------------------------------------------------------------

CREATE TYPE reservation_status AS ENUM (
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'no_show',
  'completed'
);


-- ----------------------------------------------------------------------------
-- 3. Generic helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ----------------------------------------------------------------------------
-- 4. profiles
-- ----------------------------------------------------------------------------

CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        text,
  phone           text,
  depositor_name  text,
  avatar_url      text,
  onboarded_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_phone_idx ON public.profiles (phone) WHERE phone IS NOT NULL;

CREATE TRIGGER profiles_touch
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile row on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);


-- ----------------------------------------------------------------------------
-- 5. shops
-- ----------------------------------------------------------------------------

CREATE TABLE public.shops (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle                   text NOT NULL UNIQUE,
  name                     text NOT NULL,
  owner_id                 uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  phone                    text,
  address                  text,
  location                 geography(Point, 4326),
  hours_open               time,
  hours_close              time,
  hours_break_start        time,
  hours_break_end          time,
  closed_weekdays          smallint[] NOT NULL DEFAULT '{}',
  hours_note               text,
  caution_note             text,
  parking_info             text,
  map_badge                text,
  account_bank             text,
  account_number           text,
  deposit_amount           int,
  profile_image_path       text,
  background_image_path    text,
  kakao_channel_id         text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  archived_at              timestamptz,

  CONSTRAINT handle_format CHECK (handle ~ '^[a-z0-9][a-z0-9-]{1,30}$')
);

CREATE INDEX shops_location_gix ON public.shops USING gist (location);
CREATE INDEX shops_owner_idx ON public.shops (owner_id);

CREATE TRIGGER shops_touch
  BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY shops_select_public ON public.shops
  FOR SELECT USING (true);

CREATE POLICY shops_insert_own ON public.shops
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY shops_update_own ON public.shops
  FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY shops_delete_own ON public.shops
  FOR DELETE USING (auth.uid() = owner_id);

-- Helper used by downstream policies
CREATE OR REPLACE FUNCTION public.owns_shop(target_shop uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops WHERE id = target_shop AND owner_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;


-- ----------------------------------------------------------------------------
-- 6. service_categories
-- ----------------------------------------------------------------------------

CREATE TABLE public.service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code        text NOT NULL,
  name        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (shop_id, code),
  CONSTRAINT code_format CHECK (code ~ '^[a-zA-Z0-9_-]+$')
);

CREATE INDEX service_categories_shop_sort_idx
  ON public.service_categories (shop_id, sort_order)
  WHERE archived_at IS NULL;

CREATE TRIGGER service_categories_touch
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Default-seed on shop creation
CREATE OR REPLACE FUNCTION public.seed_default_categories() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.service_categories (shop_id, code, name, sort_order) VALUES
    (NEW.id, 'nail-art',       '네일아트 (손)', 1),
    (NEW.id, 'one-color',      '원컬러 (손)',   2),
    (NEW.id, 'pedicure',       '페디큐어',       3),
    (NEW.id, 'hand-foot-care', '손/발 케어',     4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER shops_seed_categories
  AFTER INSERT ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_categories_select_public ON public.service_categories
  FOR SELECT USING (true);

CREATE POLICY service_categories_write_owner ON public.service_categories
  FOR ALL USING (public.owns_shop(shop_id)) WITH CHECK (public.owns_shop(shop_id));


-- ----------------------------------------------------------------------------
-- 7. arts
-- ----------------------------------------------------------------------------

CREATE TABLE public.arts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  service_category_id   uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  code                  text NOT NULL,
  name                  text NOT NULL,
  description           text,
  price                 int  NOT NULL,
  duration_minutes      int  NOT NULL,
  image_path            text,
  is_this_month         boolean NOT NULL DEFAULT false,
  sort_order            int NOT NULL DEFAULT 0,
  archived_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE (shop_id, code)
);

CREATE INDEX arts_feed_idx
  ON public.arts (shop_id, service_category_id, is_this_month, sort_order)
  WHERE archived_at IS NULL;

CREATE TRIGGER arts_touch
  BEFORE UPDATE ON public.arts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY arts_select_public ON public.arts
  FOR SELECT USING (archived_at IS NULL);

CREATE POLICY arts_write_owner ON public.arts
  FOR ALL USING (public.owns_shop(shop_id)) WITH CHECK (public.owns_shop(shop_id));


-- ----------------------------------------------------------------------------
-- 8. staff
-- ----------------------------------------------------------------------------

CREATE TABLE public.staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        text NOT NULL,
  bio         text,
  avatar_path text,
  sort_order  int  NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX staff_shop_idx ON public.staff (shop_id, active, sort_order);

CREATE TRIGGER staff_touch
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_select_public ON public.staff
  FOR SELECT USING (active);

CREATE POLICY staff_write_owner ON public.staff
  FOR ALL USING (public.owns_shop(shop_id)) WITH CHECK (public.owns_shop(shop_id));


-- ----------------------------------------------------------------------------
-- 9. reservations
-- ----------------------------------------------------------------------------

CREATE TABLE public.reservations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                 uuid NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
  service_category_id     uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  art_id                  uuid NOT NULL REFERENCES public.arts(id) ON DELETE RESTRICT,
  staff_id                uuid REFERENCES public.staff(id) ON DELETE SET NULL,

  customer_user_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name           text NOT NULL,
  customer_phone          text NOT NULL,
  depositor_name          text,

  reservation_date        date NOT NULL,
  reservation_time        time NOT NULL,
  duration_minutes        int  NOT NULL,

  gel_self_removal        boolean NOT NULL DEFAULT false,
  gel_other_removal       boolean NOT NULL DEFAULT false,
  extension_count         int     NOT NULL DEFAULT 0,
  reference_image_path    text,
  notes                   text,

  art_name                text NOT NULL,
  total_price             int  NOT NULL,
  deposit_amount          int  NOT NULL,
  deposit_paid_at         timestamptz,

  status                  reservation_status NOT NULL DEFAULT 'pending',
  status_changed_at       timestamptz NOT NULL DEFAULT now(),
  status_changed_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  cancel_token            uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT extension_range CHECK (extension_count BETWEEN 0 AND 10),
  CONSTRAINT phone_format    CHECK (customer_phone ~ '^010[0-9]{7,8}$')
);

CREATE INDEX reservations_slot_idx
  ON public.reservations (shop_id, reservation_date, status)
  WHERE status IN ('pending', 'confirmed');

CREATE INDEX reservations_customer_idx
  ON public.reservations (customer_user_id, created_at DESC)
  WHERE customer_user_id IS NOT NULL;

CREATE INDEX reservations_cancel_token_idx ON public.reservations (cancel_token);

CREATE INDEX reservations_shop_status_idx
  ON public.reservations (shop_id, status, created_at DESC);

CREATE TRIGGER reservations_touch
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Stamp status_changed_* whenever status changes
CREATE OR REPLACE FUNCTION public.track_reservation_status_change() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
    NEW.status_changed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_status_change
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.track_reservation_status_change();

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or auth) may insert. Customer info is captured snapshot-style;
-- when authenticated, the app sets customer_user_id to auth.uid().
CREATE POLICY reservations_insert_anyone ON public.reservations
  FOR INSERT WITH CHECK (
    customer_user_id IS NULL OR customer_user_id = auth.uid()
  );

-- Read access: own customer, or shop owner.
-- (Anon cancel-by-token reads happen via the SECURITY DEFINER RPC below.)
CREATE POLICY reservations_select_owner_or_customer ON public.reservations
  FOR SELECT USING (
    (customer_user_id IS NOT NULL AND customer_user_id = auth.uid())
    OR public.owns_shop(shop_id)
  );

-- Update policy: shop owner can change anything, customer (auth) can only
-- cancel their own pending/confirmed reservations.
CREATE POLICY reservations_update_owner ON public.reservations
  FOR UPDATE USING (public.owns_shop(shop_id))
  WITH CHECK (public.owns_shop(shop_id));

CREATE POLICY reservations_update_customer_cancel ON public.reservations
  FOR UPDATE USING (
    customer_user_id IS NOT NULL
    AND customer_user_id = auth.uid()
    AND status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    customer_user_id = auth.uid()
    AND status = 'cancelled'
  );

-- Cancel-by-token RPC for anonymous web customers
CREATE OR REPLACE FUNCTION public.cancel_reservation(p_token uuid) RETURNS void AS $$
DECLARE r public.reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.reservations
   WHERE cancel_token = p_token
     AND status IN ('pending', 'confirmed');
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation_not_cancellable'; END IF;

  UPDATE public.reservations
     SET status = 'cancelled'
   WHERE id = r.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid) TO anon, authenticated;


-- ----------------------------------------------------------------------------
-- 10. reviews (mobile-only behavior, but table lives here)
-- ----------------------------------------------------------------------------

CREATE TABLE public.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL UNIQUE REFERENCES public.reservations(id) ON DELETE CASCADE,
  shop_id         uuid NOT NULL,
  art_id          uuid NOT NULL,
  author_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content         text NOT NULL,
  photo_paths     text[] NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_shop_idx ON public.reviews (shop_id, created_at DESC);
CREATE INDEX reviews_art_idx  ON public.reviews (art_id, created_at DESC);

CREATE TRIGGER reviews_touch
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY reviews_select_public ON public.reviews
  FOR SELECT USING (true);

-- Author must be the customer of a completed reservation
CREATE POLICY reviews_insert_author ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.id = reviews.reservation_id
        AND r.customer_user_id = auth.uid()
        AND r.status = 'completed'
    )
  );

CREATE POLICY reviews_update_author ON public.reviews
  FOR UPDATE USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);

CREATE POLICY reviews_delete_author ON public.reviews
  FOR DELETE USING (auth.uid() = author_id);


-- ----------------------------------------------------------------------------
-- 11. favorites (mobile-only)
-- ----------------------------------------------------------------------------

CREATE TABLE public.favorite_shops (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_id     uuid NOT NULL REFERENCES public.shops(id)    ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE INDEX favorite_shops_shop_idx ON public.favorite_shops (shop_id);

ALTER TABLE public.favorite_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY favorite_shops_self ON public.favorite_shops
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


CREATE TABLE public.favorite_arts (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  art_id      uuid NOT NULL REFERENCES public.arts(id)     ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, art_id)
);

CREATE INDEX favorite_arts_art_idx ON public.favorite_arts (art_id);

ALTER TABLE public.favorite_arts ENABLE ROW LEVEL SECURITY;

CREATE POLICY favorite_arts_self ON public.favorite_arts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 12. Auto-completion job (pg_cron)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.complete_finished_reservations() RETURNS void AS $$
BEGIN
  UPDATE public.reservations
  SET status = 'completed'
  WHERE status = 'confirmed'
    AND (
      (reservation_date + reservation_time)
      + (duration_minutes || ' minutes')::interval
    ) < (now() AT TIME ZONE 'Asia/Seoul');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Schedule every 15 min. If pg_cron isn't enabled yet, this errors — enable
-- the extension via Dashboard → Database → Extensions and re-run this stmt.
SELECT cron.schedule(
  'complete-finished-reservations',
  '*/15 * * * *',
  $$ SELECT public.complete_finished_reservations(); $$
);


-- ----------------------------------------------------------------------------
-- 13. Storage buckets + RLS
-- ----------------------------------------------------------------------------
-- "public" on a bucket means public READ. Writes (insert/update/delete) are
-- always gated by storage.objects policies. Default state with RLS-on and no
-- policies = deny-all writes, so we explicitly grant shop owners write access
-- to their own folder under shop-assets.
--
-- Path conventions (enforced by policies via storage.foldername()):
--   shop-assets/<shop_id>/profile.<ext>
--   shop-assets/<shop_id>/background.<ext>
--   shop-assets/<shop_id>/arts/<art_id>.<ext>
--   shop-assets/<shop_id>/staff/<staff_id>.<ext>
--   reservation-photos/<reservation_id>/reference.<ext>      (Step 7)
--   review-photos/<review_id>/<n>.<ext>                       (mobile)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('shop-assets',         'shop-assets',         true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('reservation-photos',  'reservation-photos',  false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('review-photos',       'review-photos',       true,  10485760, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- shop-assets ----------------------------------------------------------------
-- Public READ for everyone (so shop profile pages render under anon).
-- Write/update/delete: only the owner of the shop in the first path segment.

CREATE POLICY shop_assets_select_public ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'shop-assets');

CREATE POLICY shop_assets_insert_owner ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'shop-assets'
    AND public.owns_shop(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY shop_assets_update_owner ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND public.owns_shop(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'shop-assets'
    AND public.owns_shop(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY shop_assets_delete_owner ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'shop-assets'
    AND public.owns_shop(((storage.foldername(name))[1])::uuid)
  );

-- reservation-photos ---------------------------------------------------------
-- Bucket is private — no SELECT policy = nobody can list/read directly.
-- Reads for the customer + shop owner happen via short-lived signed URLs
-- minted by an authenticated server function (added in Step 7 with the real
-- reservation submit flow). Insert policy is added in Step 7 too — the
-- anonymous-customer upload flow needs care (path handoff, malicious-file
-- rejection) so we leave writes denied until then.

-- review-photos --------------------------------------------------------------
-- Public READ for everyone (mirrors shop-assets — review photos are shown
-- on the public art/shop pages). Writes are deferred until the mobile review
-- flow is built; the write policy needs to validate that the path's
-- <review_id> belongs to the uploader, which depends on the reviews INSERT
-- shape we'll finalize then.

CREATE POLICY review_photos_select_public ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-photos');


-- ============================================================================
-- End of 0001_init.sql
-- ============================================================================
