-- Allow authenticated users to read, create, and link tags.
--
-- Root cause:
--   public.tags and public.form_tags are created with RLS enabled by default
--   in Supabase, but had no policies. Authenticated users therefore could not
--   SELECT / INSERT / DELETE, so the tag editor in the creator silently failed
--   to persist tags (the frontend swallowed the errors before).
--
-- Fix:
--   - tags:            authenticated can SELECT all rows and INSERT new tags.
--   - form_tags:       authenticated can SELECT all links and INSERT/DELETE.
--   (tags are treated as a shared, creator-curated library; form_tags links are
--    managed by whoever edits a form.)

BEGIN;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tags' AND policyname = 'tags_authenticated_select'
    ) THEN
        CREATE POLICY "tags_authenticated_select" ON public.tags
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tags' AND policyname = 'tags_authenticated_insert'
    ) THEN
        CREATE POLICY "tags_authenticated_insert" ON public.tags
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_tags' AND policyname = 'form_tags_authenticated_select'
    ) THEN
        CREATE POLICY "form_tags_authenticated_select" ON public.form_tags
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_tags' AND policyname = 'form_tags_authenticated_insert'
    ) THEN
        CREATE POLICY "form_tags_authenticated_insert" ON public.form_tags
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'form_tags' AND policyname = 'form_tags_authenticated_delete'
    ) THEN
        CREATE POLICY "form_tags_authenticated_delete" ON public.form_tags
            FOR DELETE TO authenticated USING (true);
    END IF;
END $$;

COMMIT;