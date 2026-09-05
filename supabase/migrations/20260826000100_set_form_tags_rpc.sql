-- ============================================================
-- RPC atomik untuk mengelola tag form secara menyeluruh.
--
-- Menggantikan semua operasi langsung client terhadap form_tags/tags
-- yang sebelumnya terblokir RLS secara diam-diam (PostgREST mengembalikan
-- 204 sukses meskipun tidak ada baris yang benar-benar terhapus/ditambah).
--
-- Urutan operasi dalam satu transaksi SECURITY DEFINER:
--   1. Verifikasi pemilik form (creator_id = auth.uid()).
--   2. Hapus SEMUA relasi form_tags lama untuk form ini.
--   3. Untuk tiap nama tag: buat baris tags jika belum ada, tautkan.
--   4. Bersihkan tag yatim (tidak direferensikan form manapun).
--   5. Kembalikan daftar nama tag aktual dari database.
--
-- Return value text[] membuat client langsung sinkron dengan kebenaran
-- database — tidak perlu lagi menebak apakah operasi berhasil atau tidak.
--
-- Tempel di Supabase Dashboard > SQL Editor > RUN.
-- ============================================================

DROP FUNCTION IF EXISTS public.set_form_tags(uuid, text[]);

CREATE OR REPLACE FUNCTION public.set_form_tags(
  p_form_id uuid,
  p_tag_names text[]
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text;
  v_result text[];
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

  -- Hapus semua relasi lama; mulai dari nol supaya urutan akhir stabil.
  DELETE FROM public.form_tags WHERE form_id = p_form_id;

  -- Untuk tiap nama tag: pastikan baris ada di tabel tags (insert jika
  -- belum), lalu tautkan ke form. ON CONFLICT DO NOTHING menangani
  -- composite PK (form_id, tag_id) bila terjadi race condition lintas tab.
  FOR v_name IN
    SELECT DISTINCT btrim(x)
    FROM unnest(p_tag_names) AS x
    WHERE btrim(x) <> ''
  LOOP
    INSERT INTO public.tags (name)
    SELECT v_name
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tags WHERE name = v_name
    );

    INSERT INTO public.form_tags (form_id, tag_id)
    SELECT p_form_id, t.id
    FROM public.tags t
    WHERE t.name = v_name
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Tag yang ditinggalkan tanpa referensi ikut dihapus agar shortlink-nya
  -- tidak bisa dipakai lagi untuk mengakses form manapun.
  DELETE FROM public.tags t
  WHERE NOT EXISTS (
    SELECT 1 FROM public.form_tags ft WHERE ft.tag_id = t.id
  );

  -- Kembalikan daftar nama tag aktual dari database sebagai single source
  -- of truth; client langsung sinkron tanpa menebak.
  SELECT array_agg(t.name ORDER BY t.name) INTO v_result
  FROM public.form_tags ft
  JOIN public.tags t ON t.id = ft.tag_id
  WHERE ft.form_id = p_form_id;

  RETURN coalesce(v_result, '{}');
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_form_tags(uuid, text[]) TO authenticated;

-- ===== VERIFIKASI OTOMATIS (lihat tab Messages setelah RUN) =====
do $$
declare
  src text;
begin
  select prosrc into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'set_form_tags'
  limit 1;

  if src is null then
    raise notice 'DEPLOY GAGAL: fungsi set_form_tags tidak ditemukan.';
  elsif position('creator_id = v_user_id' in src) = 0 then
    raise notice 'MASIH VERSI LAMA! Body belum memuat verifikasi pemilik.';
  else
    raise notice 'DEPLOY OK — set_form_tags(uuid, text[]) aktif.';
  end if;
end $$;
