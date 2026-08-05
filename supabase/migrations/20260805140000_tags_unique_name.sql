-- Deduplicate tags and enforce a unique name.
--
-- Root cause:
--   public.tags had no unique constraint on name. The creator UI (syncTags)
--   used .maybeSingle() to look up a tag by name; when duplicate rows already
--   existed, maybeSingle() returned a PGRST116 error, which the frontend
--   treated as "tag not found" and inserted yet another row. That snowballed
--   into many duplicates. The home page search also used .maybeSingle(), so a
--   duplicate tag name made the lookup fail entirely ("tag tidak ditemukan").
--
-- Fix:
--   1. Collapse duplicate tags: keep one id per name and re-point form_tags.
--   2. Add a unique constraint on tags.name to prevent future duplicates.

BEGIN;

-- Re-point every form_tags row at the canonical (lowest-id) tag per name.
WITH canonical AS (
    SELECT MIN(id) AS keep_id, name
    FROM public.tags
    GROUP BY name
),
repoint AS (
    SELECT ft.id AS link_id, c.keep_id
    FROM public.form_tags ft
    JOIN public.tags t ON t.id = ft.tag_id
    JOIN canonical c ON c.name = t.name
    WHERE t.id <> c.keep_id
)
UPDATE public.form_tags ft
SET tag_id = r.keep_id
FROM repoint r
WHERE ft.id = r.link_id;

-- Drop any duplicate (form_id, tag_id) links created by the re-point above.
DELETE FROM public.form_tags a
USING public.form_tags b
WHERE a.form_id = b.form_id
  AND a.tag_id = b.tag_id
  AND a.id > b.id;

-- Remove duplicate tags, keeping the canonical (lowest-id) one.
WITH canonical AS (
    SELECT MIN(id) AS keep_id, name
    FROM public.tags
    GROUP BY name
)
DELETE FROM public.tags t
USING canonical c
WHERE t.name = c.name
  AND t.id <> c.keep_id;

-- Prevent future duplicates.
ALTER TABLE public.tags
    ADD CONSTRAINT tags_name_key UNIQUE (name);

COMMIT;
