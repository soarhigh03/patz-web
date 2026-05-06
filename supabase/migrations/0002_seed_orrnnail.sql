-- ============================================================================
-- 0002_seed_orrnnail.sql
--
-- DEV-ONLY seed. Creates a placeholder shop owner + the 오른네일 shop with
-- categories, arts, and staff so the web pages can read live data.
--
-- Production owners sign up via Kakao/Google (Step 5). The dev owner created
-- here can be deleted later via:
--   DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-000000000001';
--
-- Idempotent — re-runnable. Safe to paste in Supabase Dashboard → SQL Editor.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Schema additions: lat/lng for easier app-side reads.
-- (Keeps the existing `location geography` column for future PostGIS queries.)
-- ----------------------------------------------------------------------------

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS latitude  numeric(9,6),
  ADD COLUMN IF NOT EXISTS longitude numeric(9,6);


-- ----------------------------------------------------------------------------
-- 2. Dev auth user.
-- Direct insert to auth.users — only safe in dev. Real owners come via
-- Supabase Auth's Kakao/Google providers in Step 5.
-- ----------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated',
  'dev-owner@patz.dev',
  crypt('dev-only-not-real', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(), now(),
  '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- The handle_new_user() trigger has now created a profiles row.
UPDATE public.profiles
SET nickname       = '오른네일 사장님',
    phone          = '01000000000',
    depositor_name = '오른네일',
    onboarded_at   = now()
WHERE id = '00000000-0000-4000-8000-000000000001';


-- ----------------------------------------------------------------------------
-- 3. Shop. The seed_default_categories trigger fires automatically and inserts
-- the 4 default service_categories (codes: nail-art / one-color / pedicure /
-- hand-foot-care) — no separate insert needed.
-- ----------------------------------------------------------------------------

INSERT INTO public.shops (
  id, handle, name, owner_id,
  phone, address,
  latitude, longitude, location,
  hours_open, hours_close, hours_break_start, hours_break_end,
  closed_weekdays, hours_note, caution_note,
  map_badge,
  account_bank, account_number, deposit_amount
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'orrnnail',
  '오른네일',
  '00000000-0000-4000-8000-000000000001',
  '0507-1330-8551',
  '서울 마포구 동교로38길 42-5 3층',
  37.5563, 126.9236,
  ST_SetSRID(ST_MakePoint(126.9236, 37.5563), 4326)::geography,
  '11:00', '21:00', '14:00', '15:00',
  ARRAY[0]::smallint[],
  '*매주 일요일 휴무, 휴게시간 14:00-15:00',
  '타샵 디자인의 경우 미리 보내주셔야 가능하며, 샵에 있는 재고로 진행되어 완벽히 똑같기는 어렵습니다. 또한, 이달의 아트와 달리 재료 원가가 그대로 책정되어 조금 더 가격이 나갈 수 있습니다.',
  '홍대입구역에서 3분 거리에요!',
  '국민은행', '000-0000000-00-00000', 20000
)
ON CONFLICT (id) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 4. Arts. JOIN onto auto-seeded service_categories by (shop_id, code) so we
-- never hard-code the category UUIDs.
-- ----------------------------------------------------------------------------

INSERT INTO public.arts (
  shop_id, service_category_id,
  code, name, price, duration_minutes, sort_order, is_this_month
)
SELECT
  '11111111-1111-4111-8111-111111111111',
  sc.id,
  v.code, v.name, v.price, v.duration_minutes, v.sort_order, v.is_this_month
FROM (
  VALUES
    ('1',    'nail-art',       '이달의 아트 1',  60000, 60,  1, true),
    ('2',    'nail-art',       '이달의 아트 2',  60000, 60,  2, true),
    ('3',    'nail-art',       '이달의 아트 3',  65000, 60,  3, true),
    ('4',    'nail-art',       '이달의 아트 4',  65000, 60,  4, true),
    ('5',    'nail-art',       '이달의 아트 5',  65000, 60,  5, true),
    ('6',    'nail-art',       '이달의 아트 6',  65000, 60,  6, true),
    ('7',    'nail-art',       '이달의 아트 7',  70000, 75,  7, true),
    ('8',    'nail-art',       '이달의 아트 8',  70000, 75,  8, true),
    ('9',    'nail-art',       '이달의 아트 9',  70000, 75,  9, true),
    ('10',   'nail-art',       '이달의 아트 10', 70000, 75, 10, true),
    ('11',   'nail-art',       '이달의 아트 11', 75000, 90, 11, true),
    ('oc_1', 'one-color',      '원컬러 - 누드',     45000, 60,  1, false),
    ('oc_2', 'one-color',      '원컬러 - 자주',     45000, 60,  2, false),
    ('oc_3', 'one-color',      '원컬러 - 화이트',   45000, 60,  3, false),
    ('pd_1', 'pedicure',       '페디큐어 기본',     55000, 90,  1, false),
    ('pd_2', 'pedicure',       '페디큐어 + 큐티클', 65000, 105, 2, false),
    ('hc_1', 'hand-foot-care', '손 케어',           35000, 45,  1, false),
    ('hc_2', 'hand-foot-care', '발 케어',           40000, 60,  2, false)
) AS v(code, category_code, name, price, duration_minutes, sort_order, is_this_month)
JOIN public.service_categories sc
  ON sc.shop_id = '11111111-1111-4111-8111-111111111111'
 AND sc.code    = v.category_code
ON CONFLICT (shop_id, code) DO NOTHING;


-- ----------------------------------------------------------------------------
-- 5. Staff
-- ----------------------------------------------------------------------------

INSERT INTO public.staff (id, shop_id, name, sort_order, active) VALUES
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-111111111111', '오른쌤', 1, true),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-111111111111', '유리쌤', 2, true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- End of 0002_seed_orrnnail.sql
-- ============================================================================
