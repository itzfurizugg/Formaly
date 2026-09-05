-- ============================================================
-- Revisi: izinkan satu akun mengerjakan form lebih dari sekali.
-- Tempel di Supabase Dashboard > SQL Editor > RUN (idempotent).
-- ============================================================

-- 1) Kolom pengaturan baru pada tabel forms.
ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS allow_multiple_submissions boolean NOT NULL DEFAULT false;

-- 2) Pastikan user hanya bisa memperbarui baris profilnya sendiri
--    (perbaikan revisi #1: update nama/email di tabel users).
--    Jalankan hanya bila kebijakan ini belum ada.
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);
