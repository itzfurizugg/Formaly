alter table public.forms
    add column if not exists randomize_options boolean not null default false;
