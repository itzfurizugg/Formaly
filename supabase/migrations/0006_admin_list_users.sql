create or replace function public.admin_list_users()
returns setof public.users
language sql
security definer
set search_path = public
as $$
    select target.*
    from public.users target
    where exists (
        select 1
        from public.users current_user_row
        where current_user_row.id = auth.uid()
          and current_user_row.role = 'admin'::user_role
    )
    order by target.created_at desc;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
