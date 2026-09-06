-- ============================================================
-- Migrasi pendukung tipe soal baru: dropdown, file_upload, date_time
-- + media pada opsi jawaban (question_options.media_url).
--
-- Cara pakai: salin & jalankan seluruh isi file ini di Supabase
-- Dashboard > SQL Editor. Idempotent — aman dijalankan berulang.
--
-- Yang masih perlu dikerjakan di frontend (tahap lanjutan, bukan SQL):
--   1. Media opsi: panggil RPC set_question_option_media SETELAH
--      save_question_with_options (pola sama seperti set_question_media).
--   2. Soal file_upload: upload file ke storage server
--      (storage.formaly.my.id/upload) untuk mendapat URL, lalu sisipkan
--      baris answers dengan kolom file_url/file_name/file_size/file_mime
--      (bukan answer_text). Kolom sudah disediakan di bagian C.
--   3. Konfigurasi per-soal: panggil RPC set_question_config lalu hentikan
--      penyisipan <span data-fml-config> di question_text. Bagian F hanya
--      memigrasi data lama yang sudah terlanjur ter-embed.
-- ============================================================

-- ------------------------------------------------------------
-- A) Media pada opsi jawaban (gambar/audio/video per opsi).
-- ------------------------------------------------------------
alter table public.question_options
  add column if not exists media_url text;

-- ------------------------------------------------------------
-- B) Konfigurasi per soal (jsonb): sub-tipe date_time, batas file, dll.
--    Isi diatur lewat RPC set_question_config (bagian E).
-- ------------------------------------------------------------
alter table public.questions
  add column if not exists config jsonb;

-- ------------------------------------------------------------
-- C) Penyimpanan file jawaban pada tabel answers.
--    Satu jawaban file_upload = satu baris answers + kolom file_*.
-- ------------------------------------------------------------
alter table public.answers
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_mime text;

-- ------------------------------------------------------------
-- D) set_question_option_media: simpan media_url per opsi jawaban.
--    SECURITY DEFINER agar bisa memutakhirkan opsi milik kreator
--    (bypass RLS, sama seperti RPC RPC lama). p_items berbentuk
--    jsonb array: [{"id": "<option_id>", "media_url": "https://..." | ""}]
-- ------------------------------------------------------------
drop function if exists public.set_question_option_media(uuid, jsonb);
create or replace function public.set_question_option_media(
  p_question_id uuid,
  p_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
begin
  for v_item in
    select j.value from jsonb_array_elements(p_items) as j(value)
  loop
    update public.question_options
       set media_url = nullif(v_item ->> 'media_url', '')
     where id = (v_item ->> 'id')::uuid
       and question_id = p_question_id;
  end loop;
end;
$$;

grant execute on function public.set_question_option_media(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- E) set_question_config: simpan konfigurasi per soal (jsonb).
--    Hanya kunci yang dikenal yang disimpan (dipancarkan);
--    nilai kosong dinormalisasi menjadi NULL / {}.
--    Contoh: {"dateTimeVariant":"date_only","fileMaxMB":10,"fileTypes":[...]}
-- ------------------------------------------------------------
drop function if exists public.set_question_config(uuid, jsonb);
create or replace function public.set_question_config(
  p_question_id uuid,
  p_config jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config jsonb;
begin
  select jsonb_strip_nulls(jsonb_build_object(
      'dateTimeVariant', p_config -> 'dateTimeVariant',
      'fileMaxMB', p_config -> 'fileMaxMB',
      'fileTypes', p_config -> 'fileTypes'
    ))
    into v_config;

  update public.questions
     set config = nullif(v_config, '{}'::jsonb)
   where id = p_question_id;
end;
$$;

grant execute on function public.set_question_config(uuid, jsonb) to authenticated;

-- ------------------------------------------------------------
-- F) Migrasi data lama: pindahkan konfigurasi yang masih disisipkan
--    sebagai <span data-fml-config="..."> di question_text (embed
--    lama dari frontend) ke kolom questions.config, lalu buang span
--    tersebut dari teks soal. Hanya menyentuh baris yang config-nya
--    masih kosong, jadi aman dijalankan ulang.
-- ------------------------------------------------------------
do $$
declare
  r record;
  v_raw text;
  v_json jsonb;
  v_config jsonb;
  v_clean text;
begin
  for r in
    select q.id, q.question_text
      from public.questions q
     where q.question_text like '%data-fml-config=%'
       and q.config is null
  loop
    v_raw := substring(r.question_text from 'data-fml-config="([^"]*)"');
    continue when v_raw is null;

    -- Decode entity HTML hasil embedQuestionConfig di frontend.
    v_raw := replace(v_raw, '&amp;', '&');
    v_raw := replace(v_raw, '&quot;', '"');
    v_raw := replace(v_raw, '&lt;', '<');
    v_raw := replace(v_raw, '&gt;', '>');

    begin
      v_json := v_raw::jsonb;
    exception when others then
      v_json := null;
    end;
    continue when v_json is null;

    v_config := v_json -> 'config';
    continue when v_config is null or v_config = 'null'::jsonb;

    v_config := jsonb_strip_nulls(jsonb_build_object(
      'dateTimeVariant', v_config -> 'dateTimeVariant',
      'fileMaxMB', v_config -> 'fileMaxMB',
      'fileTypes', v_config -> 'fileTypes'
    ));

    v_clean := regexp_replace(
      r.question_text,
      '\s*<span[^>]*data-fml-config="[^"]*"[^>]*></span>',
      '',
      'g'
    );

    update public.questions
       set config = nullif(v_config, '{}'::jsonb),
           question_text = btrim(v_clean)
     where id = r.id;
  end loop;
end $$;

-- ------------------------------------------------------------
-- G) Verifikasi (opsional) — daftar soal + config + media opsinya.
-- ------------------------------------------------------------
-- select
--    q.id,
--    q.question_type,
--    q.config,
--    coalesce(
--      jsonb_agg(o.media_url) filter (where o.media_url is not null),
--      '[]'::jsonb
--    ) as option_media
--  from public.questions q
--  left join public.question_options o on o.question_id = q.id
--  group by q.id;