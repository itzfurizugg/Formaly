-- ============================================================
-- RPC functions — jalankan di Supabase Dashboard > SQL Editor.
-- Aman dijalankan berulang (idempotent).
-- ============================================================

-- 1) set_form_tags: ganti semua tag untuk satu form secara atomik.
DROP FUNCTION IF EXISTS public.set_form_tags(uuid, text[]);
CREATE OR REPLACE FUNCTION public.set_form_tags(
  p_form_id uuid,
  p_tag_names text[]
)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_normalized text[];
  v_tag_ids uuid[];
  v_tag_id uuid;
  v_name text;
  v_old_tag_ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT trim(t)) INTO v_normalized
  FROM unnest(p_tag_names) AS t
  WHERE trim(t) <> '';

  IF v_normalized IS NULL THEN
    v_normalized := ARRAY[]::text[];
  END IF;

  SELECT array_agg(tag_id) INTO v_old_tag_ids
  FROM public.form_tags
  WHERE form_id = p_form_id;

  DELETE FROM public.form_tags WHERE form_id = p_form_id;

  v_tag_ids := ARRAY[]::uuid[];
  FOREACH v_name IN ARRAY v_normalized LOOP
    SELECT id INTO v_tag_id FROM public.tags WHERE name = v_name LIMIT 1;
    IF v_tag_id IS NULL THEN
      INSERT INTO public.tags (name) VALUES (v_name) RETURNING id INTO v_tag_id;
    END IF;
    v_tag_ids := array_append(v_tag_ids, v_tag_id);
  END LOOP;

  IF array_length(v_tag_ids, 1) > 0 THEN
    INSERT INTO public.form_tags (form_id, tag_id)
    SELECT p_form_id, unnest(v_tag_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_old_tag_ids IS NOT NULL AND array_length(v_old_tag_ids, 1) > 0 THEN
    DELETE FROM public.tags
    WHERE id = ANY(v_old_tag_ids)
      AND id NOT IN (SELECT DISTINCT tag_id FROM public.form_tags);
  END IF;

  RETURN COALESCE(
    (SELECT array_agg(t.name)
     FROM public.form_tags ft
     JOIN public.tags t ON t.id = ft.tag_id
     WHERE ft.form_id = p_form_id),
    ARRAY[]::text[]
  );
END;
$$;

-- 2) delete_unused_tags: hapus tag yang tidak dirujuk form manapun.
DROP FUNCTION IF EXISTS public.delete_unused_tags(text[]);
CREATE OR REPLACE FUNCTION public.delete_unused_tags(
  p_tag_ids text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.tags
  WHERE id = ANY(p_tag_ids::uuid[])
    AND id NOT IN (SELECT DISTINCT tag_id FROM public.form_tags);
END;
$$;

-- 3) update_form: update data form.
DROP FUNCTION IF EXISTS public.update_form(uuid, character varying, text, integer, numeric, character varying);
DROP FUNCTION IF EXISTS public.update_form(uuid, text, text, integer, integer, text);
CREATE OR REPLACE FUNCTION public.update_form(
  p_form_id uuid,
  p_title character varying,
  p_description text DEFAULT NULL,
  p_duration integer DEFAULT NULL,
  p_passing_score numeric DEFAULT 70,
  p_status character varying DEFAULT 'draft'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.forms
  SET title = p_title,
      description = p_description,
      duration = p_duration,
      passing_score = p_passing_score,
      status = p_status,
      updated_at = now()
  WHERE id = p_form_id;
END;
$$;
