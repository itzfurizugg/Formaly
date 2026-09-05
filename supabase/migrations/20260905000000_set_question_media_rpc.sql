-- ============================================================
-- RPC set_question_media: simpan/update media_url sebuah soal.
--
-- Latar belakang: RPC save_question_with_options (dibuat manual di
-- database) tidak menerima parameter p_media_url, sehingga URL media
-- yang di-upload kreator tidak pernah tersimpan ke kolom
-- questions.media_url. Kolom questions.media_url tidak bisa di-update
-- langsung oleh client karena RLS (semua tulisan lewat RPC SECURITY
-- DEFINER). RPC ini jadi penambahan yang aman tanpa mengubah isi
-- fungsi save_question_with_options yang sudah ada.
--
-- Aman dijalankan berulang (idempotent). Jalankan di Supabase
-- Dashboard > SQL Editor atau lewat CLI migration.
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_question_media(
  p_question_id uuid,
  p_media_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_form_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  SELECT form_id INTO v_form_id
  FROM public.questions
  WHERE id = p_question_id;

  IF v_form_id IS NULL THEN
    RAISE EXCEPTION 'Soal tidak ditemukan';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.forms
    WHERE id = v_form_id AND creator_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Soal bukan milikmu';
  END IF;

  UPDATE public.questions
  SET media_url = p_media_url
  WHERE id = p_question_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_question_media(uuid, text) TO authenticated;
