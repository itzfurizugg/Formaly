-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  password_hash character varying,
  role USER-DEFINED NOT NULL DEFAULT 'user'::user_role,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id)
);
CREATE TABLE public.forms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  exam_mode boolean NOT NULL DEFAULT false,
  passing_score numeric NOT NULL DEFAULT 70,
  status character varying NOT NULL DEFAULT 'draft'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  duration integer,
  CONSTRAINT forms_pkey PRIMARY KEY (id),
  CONSTRAINT forms_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id)
);
CREATE TABLE public.tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  token_code character varying NOT NULL UNIQUE,
  max_usage integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  mode character varying NOT NULL DEFAULT 'static'::character varying,
  CONSTRAINT tokens_pkey PRIMARY KEY (id),
  CONSTRAINT tokens_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id)
);
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type character varying NOT NULL DEFAULT 'single_choice'::character varying,
  score_value numeric NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  image_question text,
  is_required boolean NOT NULL DEFAULT false,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id)
);
CREATE TABLE public.question_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  CONSTRAINT question_options_pkey PRIMARY KEY (id),
  CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);
CREATE TABLE public.submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_id uuid,
  total_score numeric NOT NULL DEFAULT 0,
  status character varying NOT NULL DEFAULT 'IN_PROGRESS'::character varying,
  started_at timestamp with time zone DEFAULT now(),
  submitted_at timestamp with time zone,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id),
  CONSTRAINT submissions_token_id_fkey FOREIGN KEY (token_id) REFERENCES public.tokens(id),
  CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selected_option_id uuid,
  selected_options ARRAY,
  answer_text text,
  score_obtained numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT answers_pkey PRIMARY KEY (id),
  CONSTRAINT answers_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id),
  CONSTRAINT answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
  CONSTRAINT answers_selected_option_id_fkey FOREIGN KEY (selected_option_id) REFERENCES public.question_options(id)
);
CREATE TABLE public.tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id)
);
CREATE TABLE public.form_tags (
  form_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT form_tags_pkey PRIMARY KEY (form_id, tag_id),
  CONSTRAINT form_tags_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id),
  CONSTRAINT form_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id)
);