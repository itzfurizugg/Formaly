-- ============================================================
-- Perbaikan revisi #1: update profil (nama/email) benar-benar tersimpan.
--
-- Penyebab: menulis langsung ke tabel users lewat supabase.from("users")
-- sering digagalkan RLS (upsert butuh izin INSERT) sehingga perubahan
-- hilang setelah refresh.
--
-- Solusi (mengikuti pola SECURITY DEFINER yang sudah dipakai di proyek ini:
-- apply_as_creator, set_form_tags, delete_form): pindahkan penulisan ke
-- sebuah RPC SECURITY DEFINER. RLS di-skip dengan aman karena fungsi
-- memverifikasi auth.uid() di sisi server, dan hanya mengubah baris milik
-- user yang sedang login.
--
-- Tempel di Supabase Dashboard > SQL Editor > RUN (aman diulang).
-- ============================================================

DROP FUNCTION IF EXISTS public.update_my_profile(text, text);

CREATE OR REPLACE FUNCTION public.update_my_profile(
  p_name text,
  p_email text
)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  role text,
  created_at timestamptz
)
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

  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'Nama tidak boleh kosong';
  END IF;

  UPDATE public.users u
  SET name = btrim(p_name),
      email = btrim(coalesce(p_email, u.email)),
      updated_at = now()
  WHERE u.id = v_user_id;

  IF NOT FOUND THEN
    -- Baris profil belum ada: buat dengan role default 'user'.
    INSERT INTO public.users (id, name, email, role)
    VALUES (v_user_id, btrim(p_name), btrim(coalesce(p_email, '')), 'user');
  END IF;

  RETURN QUERY
    SELECT u.id, u.name::text, u.email::text, u.role::text, u.created_at
    FROM public.users u
    WHERE u.id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_my_profile(text, text) TO authenticated;

-- ===== VERIFIKASI OTOMATIS (lihat tab Messages setelah RUN) =====
do $$
declare
  src text;
begin
  select prosrc into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'update_my_profile'
  limit 1;

  if src is null then
    raise notice 'DEPLOY GAGAL: fungsi update_my_profile tidak ditemukan.';
  else
    raise notice 'DEPLOY OK — update_my_profile() aktif (SECURITY DEFINER).';
  end if;
end $$;
