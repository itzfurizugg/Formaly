-- ============================================================
-- Fitur 3 — Mode tampilan pengerjaan form (gaya Google Forms).
--
-- 1. forms.layout_mode — enum:
--      single_question_per_page (default = perilaku lama)
--      multi_question_per_page (beberapa soal per halaman)
-- 2. Tabel form_pages — entity "halaman" per form, supaya page punya
--    metadata sendiri (title/label, urutan). Setiap form OTOMATIS punya
--    minimal 1 halaman default ("Halaman 1").
-- 3. questions.page_id — FK ke form_pages (nullable). Soal masuk ke
--    halaman default form-nya saat migrasi; soal baru yang dibuat lewat
--    RPC save_question_with_options (misal page_id belum diisi oleh RPC
--    lama) diarahkan ke halaman aktif lewat move_question_to_page.
--
-- Backward-compatible: form existing TIDAK berubah tampilan (layout_mode
-- default single), dan semua soal lama di-assign otomatis ke halaman
-- default form-nya.
--
-- Urutan apply: jalankan file ini (nomor 20260829000100) SEKALIGUS dengan
-- 20260829000000_apply_as_creator_rpc.sql lalu deploy frontend. File ini
-- aman di-run ulang (IF NOT EXISTS / DO / CREATE OR REPLACE).
-- ============================================================

-- ---------- 1. Layout mode ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'form_layout_mode') THEN
    CREATE TYPE public.form_layout_mode AS ENUM (
      'single_question_per_page',
      'multi_question_per_page'
    );
  END IF;
END $$;

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS layout_mode public.form_layout_mode NOT NULL DEFAULT 'single_question_per_page';

-- ---------- 2. Tabel form_pages ----------
CREATE TABLE IF NOT EXISTS public.form_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Halaman 1',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT form_pages_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_form_pages_form_position
  ON public.form_pages (form_id, position);

-- ---------- 3. Kolom page_id di questions ----------
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS page_id uuid REFERENCES public.form_pages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_questions_form_page
  ON public.questions (form_id, page_id, order_index);

-- ---------- 4. RLS + GRANT ----------
ALTER TABLE public.form_pages ENABLE ROW LEVEL SECURITY;

-- Select: creator form tsb atau siapa pun (authenticated) melihat page
-- dari form yang sudah dipublikasikan (responden butuh struktur halaman).
DROP POLICY IF EXISTS form_pages_authenticated_select ON public.form_pages;
CREATE POLICY form_pages_authenticated_select
  ON public.form_pages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_pages.form_id
        AND (lower(f.status) = 'published' OR f.creator_id = auth.uid())
    )
  );

-- Mutasi: hanya creator form. (Fallback langsung jarang dipakai — alur
-- normal lewat RPC di bawah, tapi policy ini menjamin konsistensi RLS.)
DROP POLICY IF EXISTS form_pages_creator_insert ON public.form_pages;
CREATE POLICY form_pages_creator_insert
  ON public.form_pages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_pages.form_id AND f.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS form_pages_creator_update ON public.form_pages;
CREATE POLICY form_pages_creator_update
  ON public.form_pages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_pages.form_id AND f.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_pages.form_id AND f.creator_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS form_pages_creator_delete ON public.form_pages;
CREATE POLICY form_pages_creator_delete
  ON public.form_pages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.forms f
      WHERE f.id = form_pages.form_id AND f.creator_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_pages TO authenticated;

-- ---------- 5. Trigger: updated_at + halaman default saat form dibuat ----------
CREATE OR REPLACE FUNCTION public.set_form_pages_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_form_pages_updated_at ON public.form_pages;
CREATE TRIGGER trg_form_pages_updated_at
  BEFORE UPDATE ON public.form_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_form_pages_updated_at();

-- Jaminan "setiap form punya 1 halaman default" berlaku juga untuk form
-- yang dibuat SETELAH migration ini (form dibuat via insert langsung).
CREATE OR REPLACE FUNCTION public.create_default_form_page()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.form_pages (form_id, title, position)
  VALUES (NEW.id, 'Halaman 1', 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_default_form_page ON public.forms;
CREATE TRIGGER trg_create_default_form_page
  AFTER INSERT ON public.forms
  FOR EACH ROW EXECUTE FUNCTION public.create_default_form_page();

-- ---------- 6. Data migration untuk form existing ----------
-- Setiap form yang sudah ada dibuatkan 1 halaman default, lalu semua
-- soal-nya diarahkan ke halaman itu. Idempotent: hanya menambah halaman
-- untuk form yang belum punya halaman sama sekali.
DO $$
DECLARE
  f record;
  v_page_id uuid;
BEGIN
  FOR f IN
    SELECT id FROM public.forms
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.form_pages WHERE form_id = f.id) THEN
      INSERT INTO public.form_pages (form_id, title, position)
      VALUES (f.id, 'Halaman 1', 0)
      RETURNING id INTO v_page_id;

      UPDATE public.questions
      SET page_id = v_page_id
      WHERE form_id = f.id AND page_id IS NULL;
    END IF;
  END LOOP;
END;
$$;

-- ---------- 7. RPC - add_form_page ----------
DROP FUNCTION IF EXISTS public.add_form_page(uuid);
CREATE OR REPLACE FUNCTION public.add_form_page(p_form_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_next_pos integer;
  v_page_row public.form_pages;
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id AND creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Form tidak ditemukan atau bukan milikmu';
  END IF;

  SELECT COALESCE(max(position), -1) + 1 INTO v_next_pos
  FROM public.form_pages WHERE form_id = p_form_id;

  INSERT INTO public.form_pages (form_id, title, position)
  VALUES (p_form_id, 'Halaman ' || (v_next_pos + 1)::text, v_next_pos)
  RETURNING * INTO v_page_row;

  SELECT jsonb_build_object('id', v_page_row.id, 'title', v_page_row.title, 'position', v_page_row.position)
  INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_form_page(uuid) TO authenticated;

-- ---------- 8. RPC - delete_form_page ----------
-- Hapus halaman: soal di dalamnya DIPINDAHKAN (bukan dihapus) ke halaman
-- sebelumnya. Halaman pertama atau satu-satunya tidak bisa dihapus.
DROP FUNCTION IF EXISTS public.delete_form_page(uuid);
CREATE OR REPLACE FUNCTION public.delete_form_page(p_page_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_page public.form_pages;
  v_page_count integer;
  v_prev_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  SELECT * INTO v_page FROM public.form_pages WHERE id = p_page_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Halaman tidak ditemukan';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = v_page.form_id AND creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Form tidak ditemukan atau bukan milikmu';
  END IF;

  SELECT count(*) INTO v_page_count
  FROM public.form_pages WHERE form_id = v_page.form_id;

  IF v_page_count <= 1 THEN
    RAISE EXCEPTION 'Setiap form minimal harus punya satu halaman';
  END IF;

  -- Halaman tujuan = halaman sebelum yang dihapus.
  SELECT id INTO v_prev_id
  FROM public.form_pages
  WHERE form_id = v_page.form_id AND position < v_page.position
  ORDER BY position DESC
  LIMIT 1;

  IF v_prev_id IS NULL THEN
    RAISE EXCEPTION 'Halaman pertama tidak bisa dihapus, pindahkan soal ke halaman lain dahulu';
  END IF;

  -- Pindahkan soal (bukan hapus) lalu hapus halaman dan normalisasi urutan.
  UPDATE public.questions SET page_id = v_prev_id WHERE page_id = p_page_id;
  DELETE FROM public.form_pages WHERE id = p_page_id;

  UPDATE public.form_pages p
  SET position = rn - 1
  FROM (
    SELECT id, row_number() OVER (ORDER BY position) AS rn
    FROM public.form_pages
    WHERE form_id = v_page.form_id
  ) sub
  WHERE p.id = sub.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_form_page(uuid) TO authenticated;

-- ---------- 9. RPC - move_question_to_page ----------
-- Pindahkan satu soal ke halaman tertentu (halaman harus milik form yang
-- sama dengan soal), untuk alur "Pindahkan ke Halaman X" di tab Soal dan
-- untuk "soal baru masuk ke halaman aktif editor".
DROP FUNCTION IF EXISTS public.move_question_to_page(uuid, uuid);
CREATE OR REPLACE FUNCTION public.move_question_to_page(
  p_question_id uuid,
  p_page_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_form_id uuid;
  v_page_exists boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  SELECT form_id INTO v_form_id FROM public.questions WHERE id = p_question_id;
  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'Soal tidak ditemukan';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = v_form_id AND creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Form tidak ditemukan atau bukan milikmu';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.form_pages
    WHERE id = p_page_id AND form_id = v_form_id
  ) INTO v_page_exists;

  IF NOT v_page_exists THEN
    RAISE EXCEPTION 'Halaman tujuan tidak ditemukan pada form ini';
  END IF;

  UPDATE public.questions SET page_id = p_page_id WHERE id = p_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_question_to_page(uuid, uuid) TO authenticated;

-- ---------- 10. RPC - reorder_form_pages ----------
-- Susun ulang posisi halaman: array berisi id halaman sesuai urutan baru
-- (indeks array = position). Hanya halaman milik form yang diubah.
DROP FUNCTION IF EXISTS public.reorder_form_pages(uuid, uuid[]);
CREATE OR REPLACE FUNCTION public.reorder_form_pages(
  p_form_id uuid,
  p_page_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_i integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id AND creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Form tidak ditemukan atau bukan milikmu';
  END IF;

  FOR v_i IN 1 .. array_length(p_page_ids, 1) LOOP
    IF EXISTS (
      SELECT 1 FROM public.form_pages
      WHERE id = p_page_ids[v_i] AND form_id = p_form_id
    ) THEN
      UPDATE public.form_pages
      SET position = v_i - 1
      WHERE id = p_page_ids[v_i];
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reorder_form_pages(uuid, uuid[]) TO authenticated;