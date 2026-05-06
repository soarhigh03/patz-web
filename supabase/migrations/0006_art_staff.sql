-- 0006_art_staff.sql
-- Junction table: which staff can perform each art.
-- If an art has NO rows here, it means "all staff" (상관없음).

CREATE TABLE public.art_staff (
  art_id   uuid NOT NULL REFERENCES public.arts(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  PRIMARY KEY (art_id, staff_id)
);

CREATE INDEX art_staff_staff_idx ON public.art_staff (staff_id);

ALTER TABLE public.art_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY art_staff_select_public ON public.art_staff
  FOR SELECT USING (true);

CREATE POLICY art_staff_write_owner ON public.art_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.arts a
      WHERE a.id = art_id AND public.owns_shop(a.shop_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.arts a
      WHERE a.id = art_id AND public.owns_shop(a.shop_id)
    )
  );
