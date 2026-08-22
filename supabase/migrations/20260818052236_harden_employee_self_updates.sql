revoke update on table public.employees from authenticated;
grant update (theme_preferences) on table public.employees to authenticated;

drop policy if exists employees_self_or_admin_update on public.employees;
create policy employees_self_theme_update
on public.employees
for update
to authenticated
using (auth_user_id = (select auth.uid()))
with check (auth_user_id = (select auth.uid()));
