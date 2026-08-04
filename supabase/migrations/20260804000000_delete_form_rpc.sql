-- Allow creators to fully delete their own form through an RPC.
--
-- Root cause:
--   RLS blocks DELETE on public.forms (and child tables) for authenticated
--   users. supabase-js does not raise an error when RLS filters out a DELETE;
--   it simply deletes 0 rows, so the form kept appearing after "deletion".
--
-- Fix:
--   A SECURITY DEFINER function that runs with the privileges of its owner
--   (bypassing RLS), but enforces ownership itself (creator_id = auth.uid()).
--   It deletes all dependents (answers, submissions, question_options,
--   questions, form_tags, tokens) and the form atomically.

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_form(p_form_id uuid)
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
        SELECT 1 FROM public.forms
        WHERE id = p_form_id AND creator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Form tidak ditemukan atau bukan milik kamu';
    END IF;

    DELETE FROM public.answers
    WHERE submission_id IN (
        SELECT id FROM public.submissions WHERE form_id = p_form_id
    );

    DELETE FROM public.submissions WHERE form_id = p_form_id;

    DELETE FROM public.question_options
    WHERE question_id IN (
        SELECT id FROM public.questions WHERE form_id = p_form_id
    );

    DELETE FROM public.questions WHERE form_id = p_form_id;

    DELETE FROM public.form_tags WHERE form_id = p_form_id;

    DELETE FROM public.tokens WHERE form_id = p_form_id;

    DELETE FROM public.forms WHERE id = p_form_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_form(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_form(uuid) TO authenticated;

COMMIT;
