create or replace function public.admin_delete_user(
    p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not exists (
        select 1
        from public.users current_user_row
        where current_user_row.id = auth.uid()
          and current_user_row.role = 'admin'::user_role
    ) then
        raise exception 'Only admins can delete users';
    end if;

    delete from public.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
