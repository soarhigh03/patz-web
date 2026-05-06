-- 0008_remove_etc_category.sql
-- Remove '기타' (etc) category — replaced by '기타 시술' (extra).

-- 1. Move any arts under 'etc' to 'extra' before deleting.
UPDATE public.arts
SET service_category_id = (
  SELECT sc2.id FROM public.service_categories sc2
  WHERE sc2.shop_id = arts.shop_id AND sc2.code = 'extra'
)
FROM public.service_categories sc
WHERE sc.id = arts.service_category_id
  AND sc.code = 'etc';

-- 2. Delete 'etc' categories from all shops.
DELETE FROM public.service_categories WHERE code = 'etc';

-- 3. Update trigger to no longer include 'etc'.
CREATE OR REPLACE FUNCTION public.seed_default_categories() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.service_categories (shop_id, code, name, sort_order) VALUES
    (NEW.id, 'nail-art',       '네일아트 (손)', 1),
    (NEW.id, 'one-color',      '원컬러 (손)',   2),
    (NEW.id, 'pedicure',       '페디큐어',       3),
    (NEW.id, 'hand-foot-care', '손/발 케어',     4),
    (NEW.id, 'removal-only',   '제거만 받기',     5),
    (NEW.id, 'extra',          '기타 시술',       6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
