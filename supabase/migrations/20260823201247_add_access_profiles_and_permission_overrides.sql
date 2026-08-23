alter table public.employees
  add column if not exists access_profile text,
  add column if not exists permission_overrides jsonb not null default '{}'::jsonb;

update public.employees
set access_profile = case
  when app_role = 'Administrador' then 'Administrador'
  when app_role = 'Supervisor' then 'Supervisor'
  when app_role = 'Recepcionista' or employee_type = 'Recepcion' then 'Recepcion'
  when employee_type = 'Gestor' then 'Gestor'
  when employee_type = 'Vendedor' then 'Vendedor'
  when app_role = 'SoloLectura' then 'SoloLectura'
  else 'SoloLectura'
end
where access_profile is null or btrim(access_profile) = '';

alter table public.employees
  alter column access_profile set default 'SoloLectura',
  alter column access_profile set not null;

alter table public.employees
  drop constraint if exists employees_access_profile_check;

alter table public.employees
  add constraint employees_access_profile_check
  check (access_profile in ('Administrador','Supervisor','Gestor','Vendedor','Recepcion','SoloLectura'));

create or replace function private.permission_defaults(p_profile text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case p_profile
    when 'Administrador' then jsonb_build_object(
      'dashboard.view',true,'clients.view',true,'clients.edit',true,'map.view',true,
      'planning.view',true,'planning.manage',true,'routes.view',true,'routes.execute',true,
      'capture.view',true,'capture.create',true,'coverage.view',true,'visits.view',true,
      'visits.execute',true,'calls.view',true,'calls.manage',true,'agenda.view',true,
      'agenda.manage',true,'reception.view',true,'reception.manage',true,'reports.view',true,
      'data_quality.view',true,'admin.import',true,'admin.portfolio',true,
      'admin.users.manage',true,'settings.view',true
    )
    when 'Supervisor' then jsonb_build_object(
      'dashboard.view',true,'clients.view',true,'clients.edit',true,'map.view',true,
      'planning.view',true,'planning.manage',true,'routes.view',true,'routes.execute',true,
      'capture.view',true,'capture.create',true,'coverage.view',true,'visits.view',true,
      'visits.execute',true,'calls.view',true,'calls.manage',true,'agenda.view',true,
      'agenda.manage',true,'reception.view',true,'reception.manage',true,'reports.view',true,
      'data_quality.view',true,'admin.import',true,'admin.portfolio',true,
      'admin.users.manage',false,'settings.view',true
    )
    when 'Gestor' then jsonb_build_object(
      'dashboard.view',true,'clients.view',true,'clients.edit',false,'map.view',true,
      'planning.view',true,'planning.manage',false,'routes.view',true,'routes.execute',false,
      'capture.view',true,'capture.create',true,'coverage.view',true,'visits.view',true,
      'visits.execute',true,'calls.view',true,'calls.manage',true,'agenda.view',true,
      'agenda.manage',true,'reception.view',false,'reception.manage',false,'reports.view',true,
      'data_quality.view',false,'admin.import',false,'admin.portfolio',false,
      'admin.users.manage',false,'settings.view',true
    )
    when 'Vendedor' then jsonb_build_object(
      'dashboard.view',true,'clients.view',true,'clients.edit',false,'map.view',true,
      'planning.view',true,'planning.manage',false,'routes.view',true,'routes.execute',true,
      'capture.view',true,'capture.create',true,'coverage.view',true,'visits.view',true,
      'visits.execute',true,'calls.view',true,'calls.manage',true,'agenda.view',true,
      'agenda.manage',false,'reception.view',false,'reception.manage',false,'reports.view',true,
      'data_quality.view',false,'admin.import',false,'admin.portfolio',false,
      'admin.users.manage',false,'settings.view',true
    )
    when 'Recepcion' then jsonb_build_object(
      'dashboard.view',true,'clients.view',true,'clients.edit',false,'map.view',false,
      'planning.view',false,'planning.manage',false,'routes.view',false,'routes.execute',false,
      'capture.view',false,'capture.create',false,'coverage.view',false,'visits.view',false,
      'visits.execute',false,'calls.view',false,'calls.manage',false,'agenda.view',true,
      'agenda.manage',true,'reception.view',true,'reception.manage',true,'reports.view',true,
      'data_quality.view',false,'admin.import',false,'admin.portfolio',false,
      'admin.users.manage',false,'settings.view',true
    )
    else jsonb_build_object(
      'dashboard.view',true,'clients.view',true,'clients.edit',false,'map.view',true,
      'planning.view',true,'planning.manage',false,'routes.view',true,'routes.execute',false,
      'capture.view',false,'capture.create',false,'coverage.view',true,'visits.view',true,
      'visits.execute',false,'calls.view',true,'calls.manage',false,'agenda.view',true,
      'agenda.manage',false,'reception.view',false,'reception.manage',false,'reports.view',true,
      'data_quality.view',true,'admin.import',false,'admin.portfolio',false,
      'admin.users.manage',false,'settings.view',true
    )
  end;
$$;

create or replace function private.employee_has_permission(p_employee_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case when e.permission_overrides ? p_permission
      then (e.permission_overrides ->> p_permission)::boolean
      else (private.permission_defaults(e.access_profile) ->> p_permission)::boolean
    end,
    false
  )
  from public.employees e
  where e.id = p_employee_id and e.active = true;
$$;

create or replace function private.current_user_has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.employee_has_permission(e.id, p_permission), false)
  from public.employees e
  where e.auth_user_id = (select auth.uid()) and e.active = true
  limit 1;
$$;

revoke all on function private.permission_defaults(text) from public, anon;
revoke all on function private.employee_has_permission(uuid,text) from public, anon;
revoke all on function private.current_user_has_permission(text) from public, anon;
grant execute on function private.current_user_has_permission(text) to authenticated, service_role;
grant execute on function private.employee_has_permission(uuid,text) to service_role;
