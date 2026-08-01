-- Allow authenticated users to read other users' rows in public.users.
--
-- Root cause:
--   RLS on public.users only permitted a user to SELECT their own row
--   (auth.uid() = id). The app's nested query
--     forms?select=users:creator_id ( name )
--   therefore returned NULL for forms created by other users, and the UI
--   fell back to the literal "Creator" instead of the creator's real name.
--
-- Fix:
--   Add a SELECT policy for the authenticated role that can read all rows.
--   Note: this also makes the email column readable by any logged-in user.
--   The app does not display other users' emails; revisit if privacy requires
--   a dedicated user_names view instead.

BEGIN;

CREATE POLICY "authenticated_users_can_read_users"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (true);

COMMIT;
