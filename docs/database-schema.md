# PATZ Database Schema (v1)

Canonical reference for the Supabase Postgres schema shared by **patz-web** (this repo) and the upcoming **patz-mobile** app. Keep this file in lockstep with applied migrations — every column, index, and policy here should match production.

> Style: SQL examples use `snake_case`, types are Postgres-native, RLS is named per the policy's purpose. Currency is **KRW integer** (no fractions). All timestamps are `timestamptz`. All times-of-day are `time` and interpreted in `Asia/Seoul` by app code.

---

## 1. Overview

```
┌─────────────┐  1:1  ┌────────────┐
│ auth.users  │──────▶│  profiles  │  (Kakao / Google login; 1 user)
└─────────────┘       └─────┬──────┘
                            │ 1
                            │
                            ▼ N
                       ┌────────────┐  N
                       │   shops    │──────────────────────────────────┐
                       └─────┬──────┘                                  │
                  N    ┌─────┼──────┬──────────────┬───────────────┐   │
              ┌───────▼┐ ┌──▼─────┐ ┌──▼─────┐ ┌───▼────────┐  ┌───▼───▼──────┐
              │ arts   │ │ staff  │ │service_│ │reservations│  │favorite_shops│
              └───┬────┘ └────────┘ │categories└─────┬──────┘  └──────────────┘
                  │ N                └────────┘      │ 1
            ┌─────▼────────┐                ┌────────▼────┐
            │favorite_arts │                │   reviews   │ (mobile only)
            └──────────────┘                └─────────────┘
```

### Roles
- **Customer (web)** — anonymous; submits reservations with name+phone snapshot. Can cancel via Kakao-Channel-issued one-time link.
- **Customer (mobile)** — authenticated via Kakao/Google; has `profiles` row; can favorite, leave reviews, see history.
- **Shop owner** — authenticated; owns exactly one row in `shops`; manages arts/staff/categories/reservations through the dashboard.

### Hard constraints
- One owner per shop, one shop per owner (no chains in v1).
- Reviews require login → mobile-only. Web is read-only for reviews.
- Service categories are **shop-defined** with sensible defaults seeded at shop creation.
- Reservations support both anonymous and logged-in customers in the same row.
- Multiple staff per shop = multiple concurrent slots. Slot availability is computed, not stored.

---

## 2. Conventions

| Concern             | Choice                                                 |
|---------------------|--------------------------------------------------------|
| Primary keys        | `uuid` via `gen_random_uuid()` (pgcrypto)              |
| FK on cascade       | Owner-relations cascade; reference-relations restrict  |
| Soft delete         | `archived_at timestamptz null` (where applicable)      |
| Updated tracking    | `updated_at timestamptz` + trigger                     |
| Currency            | `int` KRW                                              |
| Phone numbers       | `text`, normalized `010xxxxxxxx` (no dashes)           |
| Image references    | Storage `path` (not URL) — bucket implied by table     |
| Korean text         | UTF-8 `text`; safe in URL slugs but ASCII recommended  |
| Timezone            | All `timestamptz` UTC; `time`/`date` interpreted KST   |

---

## 3. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS postgis;    -- shops.location, "near me"
CREATE EXTENSION IF NOT EXISTS pg_cron;    -- auto-completion job
```

---

## 4. Enums

```sql
CREATE TYPE reservation_status AS ENUM (
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'no_show',
  'completed'
);
```

State machine: see §10.3.

---

## 5. Tables

### 5.1 `profiles`

1:1 extension of `auth.users`. Created automatically by trigger on user signup; phone + nickname + depositor_name collected during onboarding immediately after social login.

```sql
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname        text,
  phone           text,                  -- 010xxxxxxxx (no dashes); REQUIRED before bookings/reviews
  depositor_name  text,                  -- 입금자명 — bank-statement name
  avatar_url      text,
  onboarded_at    timestamptz,           -- NULL = social login complete but profile fields not yet collected
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX profiles_phone_idx ON profiles (phone) WHERE phone IS NOT NULL;
```

**Onboarding rule (app-enforced):** after first Kakao/Google login, user is redirected to a profile-completion screen. `onboarded_at` is set when name + phone + depositor_name are filled in. Any reservation/review/favorite action requires `onboarded_at IS NOT NULL`.

**RLS:**
- `SELECT` — `auth.uid() = id` (own row only — protects phone)
- `UPDATE` — `auth.uid() = id`
- `INSERT` — by trigger, never directly
- A separate **public profile** view exposes only `id`, `nickname`, `avatar_url` for review authors.

---

### 5.2 `shops`

```sql
CREATE TABLE shops (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle                   text NOT NULL UNIQUE,        -- /shops/<handle>
  name                     text NOT NULL,
  owner_id                 uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE RESTRICT,
                                                        -- UNIQUE enforces "one shop per owner"
  phone                    text,
  address                  text,
  location                 geography(Point, 4326),      -- WGS84 lat/lng for "near me"
  hours_open               time,
  hours_close              time,
  hours_break_start        time,
  hours_break_end          time,
  closed_weekdays          smallint[] DEFAULT '{}',     -- 0=Sun .. 6=Sat
  hours_note               text,                        -- e.g. "*매주 일요일 휴무, 휴게시간 14:00-15:00"
  caution_note             text,
  parking_info             text,
  map_badge                text,                        -- e.g. "홍대입구역에서 3분 거리에요!"
  account_bank             text,
  account_number           text,
  deposit_amount           int,                         -- KRW; NULL = no deposit policy
  profile_image_path       text,                        -- shop-assets bucket
  background_image_path    text,                        -- shop-assets bucket
  kakao_channel_id         text,                        -- per-shop Kakao Channel ("@orrnnail")
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  archived_at              timestamptz,

  CONSTRAINT handle_format CHECK (handle ~ '^[a-z0-9][a-z0-9-]{1,30}$')
);

CREATE INDEX shops_location_gix ON shops USING gist (location);
CREATE INDEX shops_owner_idx ON shops (owner_id);
```

`UNIQUE(owner_id)` is the schema-level guarantee of "one shop per owner" — enforces (1) from your answers.

**RLS:**
- `SELECT` — public (anyone can browse shop profiles)
- `UPDATE` / `DELETE` — `auth.uid() = owner_id`
- `INSERT` — `auth.uid() = owner_id` AND no existing row with that owner

---

### 5.3 `service_categories`

Shop-defined service categories — replaces the previous fixed enum. Default seed runs on shop creation (see §8.2).

```sql
CREATE TABLE service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code        text NOT NULL,              -- URL slug; ASCII recommended
  name        text NOT NULL,              -- "네일아트 (손)" etc.
  sort_order  int  NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (shop_id, code),
  CONSTRAINT code_format CHECK (code ~ '^[a-zA-Z0-9_-]+$')
);

CREATE INDEX service_categories_shop_sort_idx ON service_categories (shop_id, sort_order)
  WHERE archived_at IS NULL;
```

**Default seed** (per §8.2 trigger): `nail-art` → 네일아트 (손), `one-color` → 원컬러 (손), `pedicure` → 페디큐어, `hand-foot-care` → 손/발 케어. Shop owner can rename, reorder, archive, or add custom categories (e.g., "왁싱", "아이래시").

URL pattern: `/shops/<handle>/reserve/<category.code>/<art.code>`.

**RLS:**
- `SELECT` — public
- All writes — shop owner only

---

### 5.4 `arts`

```sql
CREATE TABLE arts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  service_category_id   uuid NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  code                  text NOT NULL,                  -- shop-scoped URL slug, e.g. "4" or "feb-1"
  name                  text NOT NULL,                  -- default at insert; shop can override
  description           text,
  price                 int  NOT NULL,                  -- KRW
  duration_minutes      int  NOT NULL,
  image_path            text,                           -- shop-assets bucket
  is_this_month         boolean NOT NULL DEFAULT false, -- "이달의 아트" feature flag
  sort_order            int NOT NULL DEFAULT 0,
  archived_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  UNIQUE (shop_id, code)
);

CREATE INDEX arts_feed_idx ON arts (shop_id, service_category_id, is_this_month, sort_order)
  WHERE archived_at IS NULL;
```

**Default name template** (computed app-side at insert; see §10.2):
- If `is_this_month = true`: `이달의 아트 N` where N counts existing this-month arts at this shop
- Else: `<category.name> N` where N counts existing non-this-month arts in this shop+category

Custom names (e.g., `2월의 아트 1`) override the default. Toggling `is_this_month` does **not** auto-rename — shops manage their copy explicitly.

**Soft delete (`archived_at`)** keeps historical reservations resolvable to the original art.

**RLS:**
- `SELECT` — public (where `archived_at IS NULL`)
- All writes — shop owner only

---

### 5.5 `staff` (쌤)

```sql
CREATE TABLE staff (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name        text NOT NULL,
  bio         text,
  avatar_path text,
  sort_order  int  NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX staff_shop_idx ON staff (shop_id, active, sort_order);
```

V1: staff inherit shop hours. Per-staff schedule deferred to a follow-up `staff_availability` table when needed.

**Multi-staff slot rule:** when computing availability for a date+time, count **active staff** vs **concurrent confirmed reservations** in that slot. If a customer requested `staff_id IS NULL` ("상관없음"), the slot is open as long as `active_staff_count > confirmed_count_in_slot`. If a specific staff was requested, that staff must not be booked.

**RLS:** SELECT public; writes shop-owner only. Soft archive via `active = false` rather than delete.

---

### 5.6 `reservations`

The hot table — read by both web (anon insert + token-based cancel) and mobile (auth'd insert + history view) and shop dashboard (manage status + deposit).

```sql
CREATE TABLE reservations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id                 uuid NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  service_category_id     uuid NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  art_id                  uuid NOT NULL REFERENCES arts(id) ON DELETE RESTRICT,
  staff_id                uuid REFERENCES staff(id) ON DELETE SET NULL,  -- NULL = "상관없음"

  -- Customer (anonymous web OR logged-in mobile)
  customer_user_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  customer_name           text NOT NULL,        -- snapshot, even when logged in
  customer_phone          text NOT NULL,        -- 010xxxxxxxx
  depositor_name          text,                 -- snapshot (mobile pulls from profile)

  -- Schedule
  reservation_date        date NOT NULL,
  reservation_time        time NOT NULL,
  duration_minutes        int  NOT NULL,        -- snapshot from art at booking

  -- Options
  gel_self_removal        boolean NOT NULL DEFAULT false,    -- 자샵 제거 checkbox
  gel_other_removal       boolean NOT NULL DEFAULT false,    -- 타샵 제거 checkbox (gel from another shop)
  extension_count         int     NOT NULL DEFAULT 0,        -- 연장 (개수); 0 = none
  reference_image_path    text,                              -- reservation-photos bucket
  notes                   text,                              -- 추가 요청사항

  -- Pricing snapshot
  art_name                text NOT NULL,        -- snapshot in case art renamed/archived
  total_price             int  NOT NULL,
  deposit_amount          int  NOT NULL,
  deposit_paid_at         timestamptz,          -- shop marks manually

  -- Lifecycle
  status                  reservation_status NOT NULL DEFAULT 'pending',
  status_changed_at       timestamptz NOT NULL DEFAULT now(),
  status_changed_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,

  -- Anonymous-customer cancellation token (sent via Kakao Channel)
  cancel_token            uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT extension_range CHECK (extension_count BETWEEN 0 AND 10),
  CONSTRAINT phone_format    CHECK (customer_phone ~ '^010[0-9]{7,8}$')
);

-- Slot availability lookups
CREATE INDEX reservations_slot_idx
  ON reservations (shop_id, reservation_date, status)
  WHERE status IN ('pending', 'confirmed');

-- Mobile "my reservations"
CREATE INDEX reservations_customer_idx
  ON reservations (customer_user_id, created_at DESC)
  WHERE customer_user_id IS NOT NULL;

-- Cancel-link lookup
CREATE INDEX reservations_cancel_token_idx ON reservations (cancel_token);

-- Shop dashboard inbox
CREATE INDEX reservations_shop_status_idx
  ON reservations (shop_id, status, created_at DESC);
```

**Snapshot columns** (`art_name`, `total_price`, `deposit_amount`, `duration_minutes`) are populated at insert and never touched. They survive art renames, price changes, or art archival.

**RLS:**
- `INSERT` — open to `anon` and `authenticated`. App-side requirement: `customer_user_id = auth.uid()` when authenticated, otherwise `NULL`.
- `SELECT` — `customer_user_id = auth.uid()` (mobile customer's own) **OR** `shop_id` is owned by `auth.uid()` (shop owner) **OR** lookup-by-`cancel_token` via a SECURITY DEFINER RPC (`get_reservation_by_cancel_token(token uuid)`) that returns a sanitized payload (no other people's data).
- `UPDATE`:
  - Customer (auth or via cancel_token): can move `pending|confirmed → cancelled` only.
  - Shop owner: can move within the state machine in §10.3.
  - Both: cannot edit fields outside `status`, `status_changed_*`, `deposit_paid_at`.

---

### 5.7 `reviews` (mobile only)

```sql
CREATE TABLE reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id  uuid NOT NULL UNIQUE REFERENCES reservations(id) ON DELETE CASCADE,
  shop_id         uuid NOT NULL,                 -- denormalized for shop-page query
  art_id          uuid NOT NULL,                 -- denormalized for art-detail query
  author_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content         text NOT NULL,
  photo_paths     text[] NOT NULL DEFAULT '{}',  -- review-photos bucket
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reviews_shop_idx ON reviews (shop_id, created_at DESC);
CREATE INDEX reviews_art_idx  ON reviews (art_id, created_at DESC);
```

**Authorship rule:** the `author_id` must match `reservations.customer_user_id` of the linked reservation, AND the reservation status must be `completed`. Enforced by a CHECK function in the INSERT policy.

**RLS:**
- `SELECT` — public
- `INSERT` — `auth.uid() = author_id` AND linked reservation belongs to author AND reservation is `completed`
- `UPDATE` / `DELETE` — `auth.uid() = author_id`

---

### 5.8 `favorite_shops`, `favorite_arts` (mobile only)

```sql
CREATE TABLE favorite_shops (
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shop_id     uuid NOT NULL REFERENCES shops(id)    ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, shop_id)
);

CREATE TABLE favorite_arts (
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  art_id      uuid NOT NULL REFERENCES arts(id)     ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, art_id)
);

CREATE INDEX favorite_shops_shop_idx ON favorite_shops (shop_id);
CREATE INDEX favorite_arts_art_idx   ON favorite_arts (art_id);
```

**RLS:** `auth.uid() = user_id` for everything. No public read (privacy).

---

## 6. Storage buckets

| Bucket              | Public read | Path pattern                                  | RLS write rule                             |
|---------------------|-------------|-----------------------------------------------|--------------------------------------------|
| `shop-assets`       | yes         | `<shop_id>/profile.<ext>`                     | shop owner of `<shop_id>` only             |
|                     |             | `<shop_id>/background.<ext>`                  |                                            |
|                     |             | `<shop_id>/arts/<art_id>.<ext>`               |                                            |
|                     |             | `<shop_id>/staff/<staff_id>.<ext>`            |                                            |
| `reservation-photos`| **no**      | `<reservation_id>/reference.<ext>`            | inserter who matches the reservation owner |
| `review-photos`     | yes         | `<review_id>/<n>.<ext>`                       | review author only                         |

DB columns store the **path within the bucket** (`<shop_id>/profile.jpg`), not the full URL. App code resolves to a URL via the Supabase client at render time.

`reservation-photos` is private — clients must request a short-lived signed URL via an authenticated RPC that validates `auth.uid()` against the reservation owner OR the shop owner.

---

## 7. Triggers

### 7.1 Auto-create profile on signup
```sql
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 7.2 Seed default service categories on shop creation
```sql
CREATE FUNCTION seed_default_categories() RETURNS trigger AS $$
BEGIN
  INSERT INTO service_categories (shop_id, code, name, sort_order) VALUES
    (NEW.id, 'nail-art',       '네일아트 (손)', 1),
    (NEW.id, 'one-color',      '원컬러 (손)',   2),
    (NEW.id, 'pedicure',       '페디큐어',       3),
    (NEW.id, 'hand-foot-care', '손/발 케어',     4);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shops_seed_categories
  AFTER INSERT ON shops
  FOR EACH ROW EXECUTE FUNCTION seed_default_categories();
```

### 7.3 Generic `updated_at`
```sql
CREATE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to: profiles, shops, service_categories, arts, staff, reservations, reviews
```

### 7.4 Track reservation status changes
```sql
CREATE FUNCTION track_status_change() RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at := now();
    NEW.status_changed_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_status_change
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION track_status_change();
```

---

## 8. Cron jobs

### 8.1 Auto-complete finished reservations
Runs every 15 minutes via `pg_cron`. Transitions `confirmed → completed` once the appointment end time has passed.

```sql
CREATE FUNCTION complete_finished_reservations() RETURNS void AS $$
BEGIN
  UPDATE reservations
  SET status = 'completed'
  WHERE status = 'confirmed'
    AND (
      (reservation_date + reservation_time)
      + (duration_minutes || ' minutes')::interval
    ) < (now() AT TIME ZONE 'Asia/Seoul');
END;
$$ LANGUAGE plpgsql;

SELECT cron.schedule(
  'complete-finished-reservations',
  '*/15 * * * *',
  $$ SELECT complete_finished_reservations(); $$
);
```

A shop owner can pre-empt this by setting `status = 'no_show'` before the appointment end time.

---

## 9. RLS strategy

### Anon key threat model
The anon key ships in the browser. **Every table** has RLS enabled, with explicit policies. No "service role" usage on the client. Default-deny on every table — policies open the doors.

### Public-read tables
`shops`, `service_categories`, `arts`, `staff`, `reviews`. The web pages render server-side under anon and need these.

### Private tables
`profiles` (own row only), `favorite_shops`, `favorite_arts` (own rows only), `reservations` (own + owner + token RPC).

### Helper SQL function
```sql
CREATE FUNCTION owns_shop(target_shop uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM shops WHERE id = target_shop AND owner_id = auth.uid()
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```
Used in policies on `arts`, `staff`, `service_categories`, and `reservations.UPDATE`.

### Cancel-by-token RPC
Anonymous customers cancel via:
```sql
CREATE FUNCTION cancel_reservation(p_token uuid) RETURNS void AS $$
DECLARE r reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM reservations
   WHERE cancel_token = p_token
     AND status IN ('pending', 'confirmed');
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation_not_cancellable'; END IF;

  UPDATE reservations
     SET status = 'cancelled'
   WHERE id = r.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION cancel_reservation(uuid) TO anon, authenticated;
```

---

## 10. Application logic

### 10.1 Time-slot availability

For a `(shop_id, date, candidate_time, duration)` query:

1. Fetch shop hours; reject if outside open/close or in break window.
2. Reject if `date.weekday() ∈ closed_weekdays`.
3. Fetch active staff count `S`.
4. If a specific `staff_id` was requested:
   - reject if that staff has any `pending|confirmed` reservation overlapping `[candidate_time, candidate_time + duration)`.
5. If `staff_id IS NULL` ("상관없음"):
   - count overlapping `pending|confirmed` reservations in the window: `B`.
   - reject if `B >= S`.

This lives in app code (a Postgres function `get_available_times(shop_id, date, art_id, staff_id)` is reasonable; can return a `text[]` of HH:mm).

### 10.2 Art default naming

Computed app-side at insert (or in a `BEFORE INSERT` trigger). Pseudocode:
```
if name was provided manually:
  use it
elif is_this_month:
  N = count(arts WHERE shop_id = $1 AND is_this_month) + 1
  name = `이달의 아트 ${N}`
else:
  N = count(arts WHERE shop_id = $1 AND service_category_id = $2 AND NOT is_this_month) + 1
  name = `${category.name} ${N}`
```

Toggling `is_this_month` later does **not** rename — shops manage their copy explicitly.

### 10.3 Reservation state machine

```
                (insert)
                   │
                   ▼
              ┌──────────┐
              │ pending  │
              └────┬─────┘
        ┌─────────┼─────────────┐
   shop confirms  │   shop rejects │
        │         │      │         │
        ▼         │      ▼         │
   ┌──────────┐   │ ┌──────────┐   │
   │confirmed │   │ │rejected  │   │
   └────┬─────┘   │ └──────────┘   │
        │         │                │
   ┌────┼────────┼─────┐         (cancel via token / mobile customer)
   │    │        │     │            │
   │ shop marks  │  cron auto-      │
   │ no_show     │  completes       │
   │    │        │     │            │
   ▼    ▼        ▼     ▼            ▼
┌────────┐  ┌──────────┐      ┌──────────┐
│no_show │  │completed │      │cancelled │
└────────┘  └────┬─────┘      └──────────┘
                 │
            (review eligible)
```

Allowed transitions:
- `pending → confirmed` — shop owner
- `pending → rejected` — shop owner
- `pending|confirmed → cancelled` — customer (auth or token)
- `confirmed → no_show` — shop owner, before `(reservation_date + reservation_time + duration_minutes)`
- `confirmed → completed` — `pg_cron` (or shop owner manually)
- All other transitions are blocked by RLS-side CHECK in the UPDATE policy.

### 10.4 Cancellation (anonymous web)
1. On `pending → confirmed` (via Kakao Channel webhook handoff), backend sends a Kakao message to `customer_phone`:
   ```
   예약이 확정되었습니다.
   취소 링크: https://patz.app/r/cancel/<cancel_token>
   ```
2. Web `/r/cancel/[token]/page.tsx` looks up via `get_reservation_by_cancel_token`, shows a summary, and calls `cancel_reservation(p_token)` on confirm.

### 10.5 Onboarding (mobile / shop owner)
1. Kakao or Google login completes; Supabase issues a session, trigger creates `profiles` row.
2. Client checks `profiles.onboarded_at IS NULL` → pushes user to onboarding screen.
3. Onboarding collects `nickname`, `phone`, `depositor_name`. On save, `onboarded_at = now()`.
4. Without `onboarded_at`, all booking/review/favorite endpoints reject (app-side guard, not a DB constraint — keeps the trigger simple).

### 10.6 Slot conflict during checkout (race)
Slot availability is computed at form render time, but the customer takes time to fill the form. Two customers might submit overlapping reservations. Mitigation:
- On INSERT, a Postgres CHECK function re-validates `staff_id × time × duration` is still free.
- On conflict, return a typed error so the client can refetch availability and ask the customer to reselect.
- Could add a short-lived "slot hold" table later if conflicts become frequent.

---

## 11. Migration order

When applying from a clean Supabase project:

1. Enable extensions (§3)
2. Create enums (§4)
3. `profiles` table + `handle_new_user()` trigger
4. `shops` table + `seed_default_categories()` trigger
5. `service_categories` table
6. `arts`, `staff` tables
7. `reservations` table + `track_status_change()` trigger
8. `reviews` table
9. `favorite_shops`, `favorite_arts`
10. `complete_finished_reservations()` function + `pg_cron` schedule
11. `cancel_reservation` RPC
12. `owns_shop` helper + RLS policies on every table
13. Storage buckets (§6) + bucket-level RLS
14. Apply `touch_updated_at` trigger to all writeable tables
15. Seed development shops (`scripts/seed.ts` reads `public/mockups/<handle>/mockup.ts`)

---

## 12. Future / deferred

- **Multi-shop chains** — drop the `UNIQUE(owner_id)` constraint and add a join table when needed.
- **Per-staff schedule** — `staff_availability(staff_id, weekday, work_start, work_end, day_off)`.
- **Slot holds** — short-lived row to reserve a time during checkout.
- **Reservation reminders** — `pg_cron` job sending Kakao messages 24h / 1h before appointment.
- **Custom hour overrides per date** — `shop_hour_exceptions(shop_id, date, hours...)` for holidays.
- **Reviews with replies** — `review_replies` table for shop owner responses.
- **Coupons / loyalty** — `coupons`, `coupon_redemptions`.
- **In-app payment** — replace manual deposit verification with PG integration; new `payments` table.
