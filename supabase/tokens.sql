-- ============================================================
-- Fungsi memulai pengerjaan form + validasi token.
-- Tempel di Supabase Dashboard > SQL Editor > RUN (semuanya sekaligus).
--
-- Catatan versi ini:
--   - TANPA variabel record (pakai variabel skalar) sehingga error
--     'record "v_token" is not assigned yet' tidak mungkin terjadi lagi.
--   - Di awal ada DROP FUNCTION untuk membersihkan overload/versi lama.
--   - Di akhir ada NOTICE berisi cuplikan body yang ter-deploy; kalau
--     cuplikannya BUKAN versi ini, berarti kamu mengedit database lain.
-- ============================================================

DROP FUNCTION IF EXISTS public.start_form_submission(uuid, character varying);
DROP FUNCTION IF EXISTS public.start_form_submission(uuid, text);

CREATE OR REPLACE FUNCTION public.start_form_submission(
  p_form_id uuid,
  p_token_code character varying DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_form_found boolean;
  v_requires_token boolean;
  v_token_id uuid;
  v_is_active boolean;
  v_expires_at timestamptz;
  v_max_usage integer;
  v_used_count integer;
  v_submission_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  SELECT true, coalesce(requires_token, false)
  INTO v_form_found, v_requires_token
  FROM public.forms
  WHERE id = p_form_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Form tidak ditemukan';
  END IF;

  IF v_requires_token THEN
    IF p_token_code IS NULL OR btrim(p_token_code) = '' THEN
      RAISE EXCEPTION 'Token wajib diisi untuk mengerjakan form ini';
    END IF;

    SELECT id, is_active, expires_at, max_usage, used_count
    INTO v_token_id, v_is_active, v_expires_at, v_max_usage, v_used_count
    FROM public.tokens
    WHERE form_id = p_form_id
      AND token_code = p_token_code
    FOR UPDATE;

    IF v_token_id IS NULL THEN
      RAISE EXCEPTION 'Token tidak valid';
    END IF;

    IF NOT v_is_active THEN
      RAISE EXCEPTION 'Token sudah tidak aktif';
    END IF;

    IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
      RAISE EXCEPTION 'Token sudah kedaluwarsa';
    END IF;

    IF v_max_usage IS NOT NULL AND v_used_count >= v_max_usage THEN
      RAISE EXCEPTION 'Token sudah mencapai batas penggunaan';
    END IF;

    UPDATE public.tokens
    SET used_count = used_count + 1
    WHERE id = v_token_id;
  END IF;

  INSERT INTO public.submissions (form_id, user_id, token_id, status)
  VALUES (p_form_id, v_user_id, v_token_id, 'IN_PROGRESS')
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_form_submission(uuid, character varying) TO authenticated;

-- Saklar gerbang token di tabel forms (dipakai UI & RPC di atas).
alter table public.forms add column if not exists requires_token boolean not null default false;

-- Index lookup token per form.
CREATE INDEX IF NOT EXISTS idx_tokens_form_id_token_code
  ON public.tokens (form_id, token_code);

-- ===== VERIFIKASI OTOMATIS =====
-- Setelah RUN, lihat tab Messages: harus muncul NOTICE yang diawali
-- "DEPLOYED OK" dan cuplikan body tanpa kata "v_token".
do $$
declare
  src text;
begin
  select prosrc into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'start_form_submission'
  limit 1;

  if src is null then
    raise notice 'DEPLOY GAGAL: fungsi start_form_submission tidak ditemukan.';
  elsif position('v_token' in src) > 0 then
    raise notice 'MASIH VERSI LAMA! Body masih memuat "v_token": %', left(src, 160);
  else
    raise notice 'DEPLOY OK — body baru aktif: %', left(src, 160);
  end if;
end $$;
