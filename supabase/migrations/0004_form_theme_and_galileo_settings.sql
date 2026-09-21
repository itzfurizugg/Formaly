alter table public.forms
    add column if not exists header_color text;

alter table public.forms
    add column if not exists randomize_options boolean not null default false;

alter table public.forms
    add column if not exists randomize_questions boolean not null default false;

alter table public.forms
    add column if not exists allow_multiple_submissions boolean not null default false;

alter table public.forms
    add column if not exists show_score_to_respondent boolean not null default true;

alter table public.forms
    add column if not exists show_answers_to_respondent boolean not null default false;
