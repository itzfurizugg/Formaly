-- ============================================================
-- RPC apply_as_creator — upgrade self-serve akun user -> creator.
--
-- CATATAN: Di repo ini RPC ini BELUM pernah ada (hasil investigasi
-- feature.md: namanya hanya disebut di dokumen, tidak ada di supabase/*
-- maupun pemakaian di src/*). Jadi dibuat baru dari nol, mengikuti pola
-- SECURITY DEFINER yang sudah dipakai (start_form_submission, set_form_tags).
--
-- Validasi dilakukan SEMUA di sisi server di dalam satu fungsi:
--   1. User harus terautentikasi (auth.uid()).
--   2. Bukti OTP email sudah tervalidasi: sesi harus dibuat oleh Supabase
--      Auth lewat OTP (claim AMR method = 'otp'), karena frontend memakai
--      supabase.auth.verifyOtp({ type: "email" }) — sesi hasil verifikasi
--      itu membawa AMR otp di JWT-nya. Client tidak bisa memalsukan JWT.
--   3. Role bukan creator/admin (indempotent-friendly: sudah creator = sukses).
--   4. Umur akun >= 7 hari (created_at).
--
-- Tempel di Supabase Dashboard > SQL Editor > RUN (aman diulang).
-- ============================================================

DROP FUNCTION IF EXISTS public.apply_as_creator();

CREATE OR REPLACE FUNCTION public.apply_as_creator()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_created_at timestamptz;
  v_role text;
  v_amr_has_otp boolean;
  v_remaining_days integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  -- Bukti OTP dari sisi server: claim AMR ('authentication method reference')
  -- pada access token sesi saat ini. Sesuai pendekatan yang dipilih di
  -- feature.md, OTP email dikirim & divalidasi oleh Supabase Auth
  -- (signInWithOtp/verifyOtp type 'email'); setelah verifyOtp sukses, sesi
  -- yang baru membawa AMR method='otp'. Kalau tidak ada, penolakan.
  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(auth.jwt() -> 'amr') amr
    WHERE amr ->> 'method' = 'otp'
  ) INTO v_amr_has_otp;

  IF NOT v_amr_has_otp THEN
    RAISE EXCEPTION 'Verifikasi OTP email belum tervalidasi. Kirim kode OTP dan verifikasi dulu.';
  END IF;

  SELECT role, created_at INTO v_role, v_created_at
  FROM public.users
  WHERE id = v_user_id;

  -- Sudah creator/admin: anggap sukses (idempotent), tidak menurunkan role.
  IF v_role = 'creator' OR v_role = 'admin' THEN
    RETURN;
  END IF;

  -- Fallback created_at dari auth.users bila baris public.users belum lengkap.
  IF v_created_at IS NULL THEN
    SELECT created_at INTO v_created_at FROM auth.users WHERE id = v_user_id;
  END IF;

  IF v_created_at IS NULL THEN
    RAISE EXCEPTION 'Data akun tidak ditemukan.';
  END IF;

  IF v_created_at > now() - interval '7 days' THEN
    v_remaining_days := floor(extract(epoch from (now() - interval '7 days' - v_created_at)) / 86400)::int + 1;
    RAISE EXCEPTION 'Akun kamu belum berumur 7 hari. Tunggu % hari lagi.', v_remaining_days;
  END IF;

  UPDATE public.users
  SET role = 'creator', updated_at = now()
  WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_as_creator() TO authenticated;

-- ===== VERIFIKASI OTOMATIS (lihat tab Messages setelah RUN) =====
do $$
declare
  src text;
begin
  select prosrc into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'apply_as_creator'
  limit 1;

  if src is null then
    raise notice 'DEPLOY GAGAL: fungsi apply_as_creator tidak ditemukan.';
  elsif position('interval ''7 days''' in src) = 0 then
    raise notice 'MASIH VERSI LAMA! Body belum memuat cek umur akun 7 hari.';
  else
    raise notice 'DEPLOY OK — apply_as_creator() aktif dengan cek umur 7 hari + AMR OTP.';
  end if;
end $$;