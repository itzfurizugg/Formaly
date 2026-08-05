-- Allow creators to update their own form (title, description, duration,
-- passing_score, and status draft/public) through an RPC.
--
-- Root cause:
--   Same as delete_form/delete_submission. RLS can block UPDATE on
--   public.forms for authenticated users. supabase-js does not raise an
--   error when RLS filters out an UPDATE; it simply affects 0 rows, so the
--   status never changes ("form di set public tetap ga berubah") while the
--   UI shows a success toast.
--
-- Fix:
--   A SECURITY DEFINER function that runs with the privileges of its owner
--   (bypassing RLS) but enforces ownership itself (creator_id = auth.uid()).
--   The web app calls this RPC instead of a raw UPDATE.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_form(
    p_form_id uuid,
    p_title text,
    p_description text,
    p_duration integer,
    p_passing_score integer,
    p_status text
) RETURNS void
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

    UPDATE public.forms
    SET title           = COALESCE(NULLIF(p_title, ''), title),
        description     = p_description,
        duration        = p_duration,
        passing_score   = p_passing_score,
        status          = p_status::form_status
    WHERE id = p_form_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_form(uuid, text, text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_form(uuid, text, text, integer, integer, text) TO authenticated;

COMMIT;