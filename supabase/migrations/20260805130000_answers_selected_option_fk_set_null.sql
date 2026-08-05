-- Allow deleting/updating question_options that have been selected in answers.
--
-- Root cause:
--   answers.selected_option_id has a FK (answers_selected_option_id_fkey) to
--   question_options(id) that defaults to NO ACTION. PostgreSQL therefore
--   rejects any DELETE (or UPDATE of the referenced key) on a question_option
--   that some answer has selected, e.g. when the creator removes an option or
--   deletes a whole question via delete_question(). Since a selected_option_id
--   no longer being among the options is a valid, meaningful state (the option
--   was just removed), we let the reference become NULL instead of blocking.
--
-- Fix:
--   Recreate the FK with ON DELETE SET NULL so option deletions clear the
--   reference instead of failing.

BEGIN;

ALTER TABLE public.answers
    DROP CONSTRAINT IF EXISTS answers_selected_option_id_fkey,
    ADD CONSTRAINT answers_selected_option_id_fkey
        FOREIGN KEY (selected_option_id)
        REFERENCES public.question_options(id)
        ON DELETE SET NULL;

COMMIT;