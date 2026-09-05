-- ============================================================
-- Tambah kolom media_url untuk soal dan header form.
-- Media di-upload ke storage server custom (bukan Supabase Storage).
-- URL hasil upload disimpan di kolom ini dan ditampilkan di form.
-- ============================================================

-- 1. Kolom media_url untuk tabel soal (questions)
-- Digunakan untuk menyimpan URL media (gambar/video/audio) yang di-upload
-- untuk soal tertentu. NULL = tidak ada media tambahan.
alter table public.questions
  add column if not exists media_url text;

-- 2. Kolom media_url untuk tabel form/header (forms)
-- Digunakan untuk menyimpan URL media (gambar/video/audio) header form.
-- NULL = tidak ada media header, fallback ke header_image / header_color.
alter table public.forms
  add column if not exists media_url text;