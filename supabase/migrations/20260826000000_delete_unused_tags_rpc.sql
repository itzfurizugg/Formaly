-- ============================================================
-- RPC penghapusan tag yang sudah tidak dipakai form manapun.
--
-- Tempel di Supabase Dashboard > SQL Editor > RUN bila migrasi tidak
-- dijalankan otomatis (mengikuti pola supabase/tokens.sql).
--
-- Latar belakang: sebelumnya client menghapus tag lewat loop per-tag
-- (hitung form_tags lalu DELETE ke tags). Bila policy RLS memblokir
-- DELETE di tabel tags, operasi itu gagal diam-diam sehingga tag
-- "hantu" tetap ada dan shortlink-nya masih bisa dipakai mengakses
-- form lain. RPC SECURITY DEFINER berikut memverifikasi referensi di
-- sisi database baru kemudian menghapus, jadi hasilnya konsisten dan
-- tidak bergantung pada policy RLS tabel tags.
-- ============================================================

DROP FUNCTION IF EXISTS public.delete_unused_tags(uuid[]);
DROP FUNCTION IF EXISTS public.delete_unused_tags(text[]);

CREATE OR REPLACE FUNCTION public.delete_unused_tags(
  p_tag_ids text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_deleted integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  -- Hapus hanya tag yang benar-benar yatim: tidak direferensikan
  -- form_tags manapun. Tag yang masih dipakai form lain otomatis aman.
  WITH deleted AS (
    DELETE FROM public.tags t
    WHERE t.id::text = ANY (p_tag_ids)
      AND NOT EXISTS (
        SELECT 1 FROM public.form_tags ft WHERE ft.tag_id = t.id
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM deleted;

  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_unused_tags(text[]) TO authenticated;

-- ===== VERIFIKASI OTOMATIS (lihat tab Messages setelah RUN) =====
do $$
declare
  src text;
begin
  select prosrc into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'delete_unused_tags'
  limit 1;

  if src is null then
    raise notice 'DEPLOY GAGAL: fungsi delete_unused_tags tidak ditemukan.';
  else
    raise notice 'DEPLOY OK — delete_unused_tags(text[]) aktif.';
  end if;
end $$;
