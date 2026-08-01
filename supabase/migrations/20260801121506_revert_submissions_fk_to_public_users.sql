-- Revert submissions FK to match documented schema:
--   submissions.user_id -> public.users(id)  (NOT auth.users directly)
--
-- The original schema (see schema docs) defines:
--   users_auth_fkey:        public.users(id) REFERENCES auth.users(id)
--   submissions_user_id_fkey: submissions(user_id) REFERENCES public.users(id)
--
-- A previous migration pointed submissions_user_id_fkey straight at
-- auth.users(id) to bypass missing public.users rows. The better fix is the
-- backfill + the auth.users->public.users sync trigger already in place.
-- This migration restores the FK to reference public.users(id).

BEGIN;

ALTER TABLE public.submissions
    DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;

ALTER TABLE public.submissions
    ADD CONSTRAINT submissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users (id)
    ON DELETE CASCADE;

COMMIT;
