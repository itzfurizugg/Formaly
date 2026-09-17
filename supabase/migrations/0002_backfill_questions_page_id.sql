-- Migration: Assign orphan questions (page_id NULL) to a form_page each
-- Soal yang dibuat tanpa page_id (mis. via Galileo/import setelah migration
-- 0001) tidak terlihat di editor dan tidak bisa di-reorder. Migration ini
-- memberi halaman ("Halaman N") untuk tiap soal tersebut — 1 soal = 1 halaman,
-- konsisten dengan mode quiz — dan melampirkan ke form_pages yang ada.

DO $$
DECLARE
    rec RECORD;
    q_rec RECORD;
    page_uuid uuid;
    pos integer;
BEGIN
    FOR rec IN
        SELECT DISTINCT q.form_id
        FROM public.questions q
        WHERE q.page_id IS NULL
    LOOP
        pos := COALESCE((SELECT MAX(position) + 1 FROM public.form_pages WHERE form_id = rec.form_id), 0);
        FOR q_rec IN
            SELECT q.id
            FROM public.questions q
            WHERE q.form_id = rec.form_id AND q.page_id IS NULL
            ORDER BY q.order_index ASC, q.created_at ASC
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