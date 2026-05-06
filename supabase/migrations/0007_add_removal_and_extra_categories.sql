-- 0007_add_removal_and_extra_categories.sql
-- Adds '제거만 받기' and '기타 시술' categories to all existing shops
-- and updates the trigger for new shops.

-- 1. Add to existing shops.
INSERT INTO public.service_categories (shop_id, code, name, sort_order)
SELECT s.id, 'removal-only', '제거만 받기', 6
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_categories sc
  WHERE sc.shop_id = s.id AND sc.code = 'removal-only'
);

INSERT INTO public.service_categories (shop_id, code, name, sort_order)
SELECT s.id, 'extra', '기타 시술', 7
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_categories sc
  WHERE sc.shop_id = s.id AND sc.code = 'extra'
);

-- 2. Update the trigger function.
CREATE OR REPLACE FUNCTION public.seed_default_categories() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.service_categories (shop_id, code, name, sort_order) VALUES
    (NEW.id, 'nail-art',       '네일아트 (손)', 1),
    (NEW.id, 'one-color',      '원컬러 (손)',   2),
    (NEW.id, 'pedicure',       '페디큐어',       3),
    (NEW.id, 'hand-foot-care', '손/발 케어',     4),
    (NEW.id, 'etc',            '기타',           5),
    (NEW.id, 'removal-only',   '제거만 받기',     6),
    (NEW.id, 'extra',          '기타 시술',       7);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
