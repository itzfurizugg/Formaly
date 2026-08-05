-- Allow creators to delete a single question (and its options) through an RPC.
--
-- Root cause:
--   Same as delete_form/delete_submission/update_form. RLS can block DELETE
--   on public.questions / question_options for authenticated users.
--   supabase-js does not raise an error when RLS filters out a DELETE; it
--   simply affects 0 rows, so the question keeps existing in the database
--   even though it disappears from the UI.
--
-- Fix:
--   A SECURITY DEFINER function that runs with the privileges of its owner
--   (bypassing RLS) but enforces ownership itself (creator owns the form the
--   question belongs to), then deletes options + question atomically.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_question(p_question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.questions q
        JOIN public.forms f ON f.id = q.form_id
        WHERE q.id = p_question_id
          AND f.creator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Soal tidak ditemukan atau bukan milik kamu';
    END IF;

    DELETE FROM public.question_options WHERE question_id = p_question_id;
    DELETE FROM public.questions WHERE id = p_question_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_question(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_question(uuid) TO authenticated;

COMMIT;