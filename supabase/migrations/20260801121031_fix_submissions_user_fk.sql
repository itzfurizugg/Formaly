-- Fix FK violation on submissions insert
--
-- Root cause:
--   submissions_user_id_fkey references public.users(id). Users who signed up
--   before (or during migration to Supabase Auth, before the sync trigger on
--   auth.users was in place) have an auth.users row but NO matching row in
--   public.users. When the app inserts into submissions with user.id from the
--   active Supabase session, the FK check fails.
--
-- Fix:
--   1. Backfill public.users with any missing rows from auth.users.
--   2. Recreate submissions_user_id_fkey to reference auth.users(id) directly
--      so the app no longer depends on the sync trigger.

BEGIN;

-- 1. Backfill: copy auth users that have no public.users row yet.
INSERT INTO public.users (id, name, email, role)
SELECT
    au.id,
    COALESCE(au.raw_user_meta_data ->> 'name', split_part(au.email, '@', 1)) AS name,
    au.email,
    'user' AS role
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
);

-- 2. Rewrite the foreign key to reference auth.users(id).
ALTER TABLE public.submissions
    DROP CONSTRAINT IF EXISTS submissions_user_id_fkey;

ALTER TABLE public.submissions
    ADD CONSTRAINT submissions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users (id)
    ON DELETE CASCADE;

COMMIT;
