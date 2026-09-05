-- Warna latar header form (hex, mis. #007DCC). Dipakai FormHeader bila
-- header_image tidak diatur; kosong/NULL = gradien acak seperti sebelumnya.
alter table public.forms
  add column if not exists header_color text;
