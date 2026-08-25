-- ============================================================
-- Skrip lengkap untuk ditempel di Supabase Dashboard > SQL Editor.
-- Aman dijalankan berulang (idempotent).
-- ============================================================

-- 1) Pengaturan form (halaman Form Settings)
alter table public.forms
  add column if not exists show_score_to_respondent boolean not null default true,
  add column if not exists show_answers_to_respondent boolean not null default false,
  add column if not exists show_correct_filter_to_respondent boolean not null default true,
  add column if not exists randomize_questions boolean not null default false;

-- 2) Header/banner gambar form (URL eksternal)
alter table public.forms
  add column if not exists header_image text;
