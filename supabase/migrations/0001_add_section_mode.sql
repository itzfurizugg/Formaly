-- Migration: Add section-based form mode
-- Adds 'multiple_questions_per_page' to form_layout_mode enum
-- Backfills existing questions with page_id (1 page per question = quiz mode default)

-- 1. Add enum value (safe: skips if already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'multiple_questions_per_page'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'form_layout_mode')
    ) THEN
        ALTER TYPE form_layout_mode ADD VALUE 'multiple_questions_per_page';
    END IF;
END
$$;

-- 2. Ensure form_pages table exists (matches table.sql schema)
CREATE TABLE IF NOT EXISTS public.form_pages (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    form_id uuid NOT NULL,
    title text NOT NULL DEFAULT 'Halaman 1'::text,
    position integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT form_pages_pkey PRIMARY KEY (id),
    CONSTRAINT form_pages_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE
);

-- 3. Ensure questions.page_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'page_id'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN page_id uuid REFERENCES public.form_pages(id);
    END IF;
END
$$;

-- 4. Ensure questions.order_index column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'questions' AND column_name = 'order_index'
    ) THEN
        ALTER TABLE public.questions ADD COLUMN order_index integer NOT NULL DEFAULT 0;
    END IF;
END
$$;

-- 5. Backfill: create 1 form_page per question for existing questions without page_id
-- This preserves quiz-mode behavior (1 question = 1 page) for existing data.
DO $$
DECLARE
    rec RECORD;
    q_rec RECORD;
    page_uuid uuid;
    pos integer;
BEGIN
    FOR rec IN
        SELECT f.id AS form_id
        FROM public.forms f
        WHERE EXISTS (
            SELECT 1 FROM public.questions q
            WHERE q.form_id = f.id AND q.page_id IS NULL
        )
    LOOP
        pos := 0;
        FOR q_rec IN
            SELECT q.id
            FROM public.questions q
            WHERE q.form_id = rec.form_id AND q.page_id IS NULL
            ORDER BY q.order_index ASC
        LOOP
            INSERT INTO public.form_pages (form_id, title, position)
            VALUES (rec.form_id, 'Halaman ' || (pos + 1), pos)
            RETURNING id INTO page_uuid;

            UPDATE public.questions
            SET page_id = page_uuid
            WHERE id = q_rec.id;

            pos := pos + 1;
        END LOOP;
    END LOOP;
END
$$;

-- 6. RLS for form_pages
ALTER TABLE public.form_pages ENABLE ROW LEVEL SECURITY;

-- Creator can manage their own form pages
CREATE POLICY "creator_manage_form_pages"
    ON public.form_pages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_pages.form_id
            AND forms.creator_id = auth.uid()
        )
    );

-- Anyone can read pages of published forms (for respondent form filling)
CREATE POLICY "public_read_published_form_pages"
    ON public.form_pages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.forms
            WHERE forms.id = form_pages.form_id
            AND forms.status = 'published'
        )
    );
