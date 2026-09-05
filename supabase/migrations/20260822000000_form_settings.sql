-- Pengaturan form: kontrol apa yang dilihat responden & perilaku pengerjaan.
-- Kolom boleh NULL-safe: aplikasi memakai default (lihat formSettings.tsx)
-- jika kolom belum diterapkan ke database.

ALTER TABLE public.forms
  ADD COLUMN IF NOT EXISTS show_score_to_respondent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_answers_to_respondent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_correct_filter_to_respondent boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS randomize_questions boolean NOT NULL DEFAULT false;