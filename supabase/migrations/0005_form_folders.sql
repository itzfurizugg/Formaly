-- Folder (kategori) untuk mengelompokkan form milik creator.

create table if not exists public.folders (
  id uuid not null default gen_random_uuid(),
  creator_id uuid not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint folders_pkey primary key (id),
  constraint folders_creator_id_fkey foreign key (creator_id)
    references public.users (id) on delete cascade
);

alter table public.forms
  add column if not exists folder_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'forms_folder_id_fkey'
  ) then
    alter table public.forms
      add constraint forms_folder_id_fkey foreign key (folder_id)
        references public.folders (id) on delete set null;
  end if;
end $$;

alter table public.folders enable row level security;

drop policy if exists "folders_creator_all" on public.folders;
create policy "folders_creator_all" on public.folders
  for all
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);