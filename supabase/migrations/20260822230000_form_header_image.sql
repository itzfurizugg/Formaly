-- Header/banner gambar untuk form (sisi peserta ditampilkan di halaman deskripsi).
-- Sengaja disimpan sebagai URL eksternal (Imgur/Drive direct link, dll) karena
-- storage Supabase masih terbatas 1GB — belum ada mekanisme upload file.
alter table public.forms
  add column if not exists header_image text;
