-- Hapus submission beserta semua jawabannya langsung di database, dan
-- pastikan pemilik form bisa mengubah status form (draft / public).
--
-- Root cause:
--   Sama seperti masalah DELETE pada public.forms, RLS menghalangi
--   DELETE/UPDATE untuk authenticated user di tabel submission/answers
--   (dan forms). supabase-js tidak melempar error ketika RLS memfilter
--   operasi tersebut; ia hanya mempengaruhi 0 baris, sehingga tombol
--   "Hapus" seolah tidak melakukan apa-apa dan status tidak pernah berubah.
--
-- Fix:
--   1. RPC public.delete_submission(p_submission_id) — SECURITY DEFINER yang
--      bypass RLS tetapi tetap memvalidasi kepemilikan (form milik
--      auth.uid()), lalu menghapus answers + submission secara atomik.
--   2. Policy forms_creator_update agar pemilik form bisa UPDATE status
--      dan kolom lainnya. Idempotent (aman dijalankan ulang).

BEGIN;

-- 1. RPC untuk menghapus submission beserta jawabannya.
CREATE OR REPLACE FUNCTION public.delete_submission(p_submission_id uuid)
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
        SELECT 1
        FROM public.submissions s
        JOIN public.forms f ON f.id = s.form_id
        WHERE s.id = p_submission_id
          AND f.creator_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Submission tidak ditemukan atau bukan milik kamu';
    END IF;

    DELETE FROM public.answers WHERE submission_id = p_submission_id;
    DELETE FROM public.submissions WHERE id = p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_submission(uuid) TO authenticated;

-- 2. Policy UPDATE untuk pemilik form (status draft/public, title, dll).
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'forms'
          AND policyname = 'forms_creator_update'
    ) THEN
        CREATE POLICY "forms_creator_update" ON public.forms
            FOR UPDATE TO authenticated
            USING (creator_id = auth.uid())
            WITH CHECK (creator_id = auth.uid());
    END IF;
END $$;

COMMIT;
