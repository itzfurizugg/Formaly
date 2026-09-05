-- ============================================================
-- Definisi RPC delete_form (sudah dipakai tombol Hapus di daftar form,
-- kini juga dipakai tombol Hapus Form di halaman Settings).
--
-- Di-sync ke migration supaya database baru langsung punya versi yang
-- sama. SECURITY DEFINER supaya cascade lintas tabel tidak terblokir
-- RLS; kepemilikan form diverifikasi di dalam fungsi ini.
--
-- Urutan hapus mengikuti FK: answers -> submissions ->
-- question_options -> questions -> tokens -> form_tags ->
-- tags yatim -> forms.
-- ============================================================

DROP FUNCTION IF EXISTS public.delete_form(uuid);

CREATE OR REPLACE FUNCTION public.delete_form(
  p_form_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  -- Verifikasi kepemilikan: setara dengan filter creator_id pada RLS.
  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = p_form_id AND creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Form tidak ditemukan atau bukan milikmu';
  END IF;

  DELETE FROM public.answers
  WHERE submission_id IN (SELECT id FROM public.submissions WHERE form_id = p_form_id);
  DELETE FROM public.submissions WHERE form_id = p_form_id;
  DELETE FROM public.question_options
  WHERE question_id IN (SELECT id FROM public.questions WHERE form_id = p_form_id);
  DELETE FROM public.questions WHERE form_id = p_form_id;
  DELETE FROM public.tokens WHERE form_id = p_form_id;
  DELETE FROM public.form_tags WHERE form_id = p_form_id;

  -- Tag yang ditinggalkan tanpa referensi ikut dihapus agar shortlink-nya
  -- tidak bisa dipakai lagi untuk mengakses form manapun (konsisten
  -- dengan delete_unused_tags).
  DELETE FROM public.tags t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.form_tags ft WHERE ft.tag_id = t.id
  );

  DELETE FROM public.forms WHERE id = p_form_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_form(uuid) TO authenticated;

-- ===== VERIFIKASI OTOMATIS (lihat tab Messages setelah RUN) =====
do $$
declare
  src text;
begin
  select prosrc into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'delete_form'
  limit 1;

  if src is null then
    raise notice 'DEPLOY GAGAL: fungsi delete_form tidak ditemukan.';
  elsif position('creator_id = v_user_id' in src) = 0 then
    raise notice 'MASIH VERSI LAMA! Body belum memuat verifikasi creator_id.';
  else
    raise notice 'DEPLOY OK — delete_form(uuid) versi cascade + cek pemilik aktif.';
  end if;
end $$;
