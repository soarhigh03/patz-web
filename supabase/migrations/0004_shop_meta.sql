-- Adds the structural fields that the new "샵 만들기" form captures:
--   shop_type          : 1인 vs 여러 명 운영 (drives staff list visibility)
--   hours_mode         : 정기적 / 요일마다 / 예약 일정 mode for 영업 시간
--   hours_per_weekday  : per-weekday open/close map, used only in 'per_weekday'
--
-- 휴게 / 예약금 활성 여부는 별도 플래그를 두지 않고 기존 nullable 컬럼
-- (hours_break_start, deposit_amount) 의 NULL 여부로 표현합니다.

ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS shop_type text NOT NULL DEFAULT 'solo',
  ADD COLUMN IF NOT EXISTS hours_mode text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS hours_per_weekday jsonb;

ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS shop_type_valid,
  ADD CONSTRAINT shop_type_valid CHECK (shop_type IN ('solo', 'multi'));

ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS hours_mode_valid,
  ADD CONSTRAINT hours_mode_valid CHECK (hours_mode IN ('fixed', 'per_weekday', 'by_reservation'));

-- Shape sanity-check for hours_per_weekday: keys are "0".."6" (Sun..Sat),
-- values are objects with optional "open" / "close" "HH:mm" strings.
-- We only enforce the top-level type; field-level validation lives in app code.
ALTER TABLE public.shops
  DROP CONSTRAINT IF EXISTS hours_per_weekday_is_object,
  ADD CONSTRAINT hours_per_weekday_is_object CHECK (
    hours_per_weekday IS NULL
    OR jsonb_typeof(hours_per_weekday) = 'object'
  );
