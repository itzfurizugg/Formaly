-- ============================================================
-- Perbaikan: bersihkan submission IN_PROGRESS yang mangkrak.
--
-- Masalah: setiap kali user menekan "Mulai Mengerjakan", RPC
-- start_form_submission membuat baris submissions baru berstatus
-- IN_PROGRESS. Kalau user membuka lalu meninggalkan form tanpa
-- mengirim, baris itu tersangkut IN_PROGRESS selamanya, sehingga
-- daftar submissions (creator) penuh status "Proses" padahal tidak
-- pernah dikerjakan.
--
-- Perbaikan: sebelum membuat submission baru, hapus dahulu semua
-- submission IN_PROGRESS milik user yang sama untuk form tersebut.
-- Dengan begitu hanya ada satu attempt aktif per (user, form), dan
-- attempt yang ditinggalkan tidak menumpuk.
--
-- Aman dijalankan berulang (idempotent). Jalankan di Supabase
-- Dashboard > SQL Editor atau lewat CLI migration.
-- ============================================================

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

  -- Bersihkan attempt IN_PROGRESS yang mangkrak milik user ini
  -- untuk form ini, agar tidak menumpuk jadi status "Proses".
  DELETE FROM public.submissions
  WHERE form_id = p_form_id
    AND user_id = v_user_id
    AND status = 'IN_PROGRESS';

  INSERT INTO public.submissions (form_id, user_id, token_id, status)
  VALUES (p_form_id, v_user_id, v_token_id, 'IN_PROGRESS')
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_form_submission(uuid, character varying) TO authenticated;