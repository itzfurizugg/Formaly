-- Add "text" to the question_type enum so creators can add essay (isian) questions.
--
-- Root cause:
--   The creator UI offers "Isian" (essay) questions, which are stored with
--   question_type = 'text' (see src/pages/creator/questions.tsx).
--   However, the question_type enum in the database only contains
--   'single_choice' and 'multiple_choice', so inserting an essay question
--   fails with:
--     invalid input value for enum question_type: "text"
--
-- Fix:
--   Add the missing enum value. Safe to re-run thanks to IF NOT EXISTS.

BEGIN;

ALTER TYPE question_type ADD VALUE IF NOT EXISTS 'text';

COMMIT;
