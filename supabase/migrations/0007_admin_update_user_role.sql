create or replace function public.admin_update_user_role(
    p_user_id uuid,
    p_role user_role
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
    updated_user public.users;
begin
    if not exists (
        select 1
        from public.users current_user_row
        where current_user_row.id = auth.uid()
          and current_user_row.role = 'admin'::user_role
    ) then
        raise exception 'Only admins can update user roles';
    end if;

    update public.users
    set role = p_role,
        updated_at = now()
    where id = p_user_id
    returning * into updated_user;

    if updated_user.id is null then
        raise exception 'User not found';
    end if;

    return updated_user;
end;
$$;

revoke all on function public.admin_update_user_role(uuid, user_role) from public;
grant execute on function public.admin_update_user_role(uuid, user_role) to authenticated;
