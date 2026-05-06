-- 0005_add_etc_category.sql
-- Adds '기타' (etc) category to all existing shops and updates the trigger
-- so future shops also get it.

-- 1. Add '기타' to all existing shops that don't already have it.
INSERT INTO public.service_categories (shop_id, code, name, sort_order)
SELECT s.id, 'etc', '기타', 5
FROM public.shops s
WHERE NOT EXISTS (
  SELECT 1 FROM public.service_categories sc
  WHERE sc.shop_id = s.id AND sc.code = 'etc'
);

-- 2. Update the trigger function to include '기타' for new shops.
CREATE OR REPLACE FUNCTION public.seed_default_categories() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.service_categories (shop_id, code, name, sort_order) VALUES
    (NEW.id, 'nail-art',       '네일아트 (손)', 1),
    (NEW.id, 'one-color',      '원컬러 (손)',   2),
    (NEW.id, 'pedicure',       '페디큐어',       3),
    (NEW.id, 'hand-foot-care', '손/발 케어',     4),
    (NEW.id, 'etc',            '기타',           5);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
