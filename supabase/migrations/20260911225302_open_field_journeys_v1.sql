alter table public.route_plans
  add column if not exists route_mode text not null default 'PLANIFICADA';

alter table public.route_plans
  drop constraint if exists route_plans_route_mode_check,
  add constraint route_plans_route_mode_check
    check (route_mode in ('PLANIFICADA','LIBRE'));

create index if not exists route_plans_mode_date_employee_idx
  on public.route_plans(route_mode, route_date, employee_id);

create unique index if not exists route_sessions_one_active_employee_idx
  on public.route_sessions(employee_id)
  where status = 'ACTIVA' and ended_at is null;

create or replace function public.start_open_journey(
  p_start_latitude double precision default null,
  p_start_longitude double precision default null,
  p_start_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_employee_id uuid := private.current_employee_id();
  v_employee public.employees%rowtype;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_plan_id uuid;
  v_session_id uuid;
  v_plan_code text;
  v_title text;
begin
  if v_employee_id is null then
    raise exception 'No se pudo identificar al empleado autenticado.' using errcode = '42501';
  end if;

  select * into v_employee
  from public.employees
  where id = v_employee_id
    and active = true;

  if not found or v_employee.employee_type <> 'Vendedor' then
    raise exception 'La jornada libre solo está disponible para vendedores activos.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.route_sessions rs
    where rs.employee_id = v_employee_id
      and rs.status = 'ACTIVA'
      and rs.ended_at is null
  ) then
    raise exception 'Ya tienes una jornada activa. Finalízala antes de iniciar otra.';
  end if;

  if exists (
    select 1
    from public.route_plans rp
    where rp.employee_id = v_employee_id
      and rp.route_date = v_today
      and rp.route_mode = 'PLANIFICADA'
      and rp.status in ('PLANIFICADA','ACTIVA')
  ) then
    raise exception 'Tienes una ruta planificada disponible para hoy. Iníciala y usa Visita adicional para clientes fuera del plan.';
  end if;

  v_plan_code := 'OPEN-' || to_char(v_today,'YYYYMMDD') || '-' || left(replace(v_employee_id::text,'-',''),8) || '-' || upper(left(replace(gen_random_uuid()::text,'-',''),6));
  v_title := 'Jornada libre · ' || to_char(v_today,'DD/MM/YYYY');

  insert into public.route_plans(
    plan_code, employee_id, route_date, plan_type, title, objective,
    target_visits, status, notes, route_mode, created_by, updated_by
  ) values (
    v_plan_code, v_employee_id, v_today, 'MIXTA', v_title,
    'Jornada abierta de visitas no planificadas', 0, 'ACTIVA',
    'Contenedor operativo autogenerado por el vendedor.', 'LIBRE',
    auth.uid(), auth.uid()
  ) returning id into v_plan_id;

  insert into public.route_sessions(
    route_plan_id, employee_id, session_date, session_type, status,
    start_latitude, start_longitude, start_accuracy_m, created_by, updated_by
  ) values (
    v_plan_id, v_employee_id, v_today, 'MIXTA', 'ACTIVA',
    p_start_latitude, p_start_longitude, p_start_accuracy_m, auth.uid(), auth.uid()
  ) returning id into v_session_id;

  return jsonb_build_object(
    'route_plan_id', v_plan_id,
    'route_session_id', v_session_id,
    'route_mode', 'LIBRE',
    'title', v_title,
    'route_date', v_today
  );
end;
$$;

revoke all on function public.start_open_journey(double precision,double precision,numeric) from public, anon;
grant execute on function public.start_open_journey(double precision,double precision,numeric) to authenticated;

create or replace function public.start_additional_visit(
  p_route_session_id uuid,
  p_client_id uuid,
  p_start_latitude double precision default null,
  p_start_longitude double precision default null,
  p_start_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_employee_id uuid := private.current_employee_id();
  v_session public.route_sessions%rowtype;
  v_client_name text;
  v_visit_id uuid;
begin
  if v_employee_id is null then
    raise exception 'No se pudo identificar al empleado autenticado.' using errcode = '42501';
  end if;

  select * into v_session
  from public.route_sessions
  where id = p_route_session_id;

  if not found then
    raise exception 'La jornada activa no existe.';
  end if;

  if v_session.employee_id <> v_employee_id then
    raise exception 'Esta jornada pertenece a otro empleado.' using errcode = '42501';
  end if;

  perform private.assert_route_session_executable(v_session.id);

  if exists (
    select 1 from public.operational_incidents oi
    where oi.route_session_id = v_session.id
      and oi.status = 'ACTIVA'
  ) then
    raise exception 'Finaliza la eventualidad activa antes de registrar otra visita.';
  end if;

  if exists (
    select 1 from public.visits v
    where v.employee_id = v_employee_id
      and v.ended_at is null
  ) then
    raise exception 'Ya tienes una visita abierta. Finalízala antes de registrar otra llegada.';
  end if;

  select legal_name into v_client_name
  from public.clients
  where id = p_client_id;

  if v_client_name is null then
    raise exception 'El cliente seleccionado no existe.';
  end if;

  if v_session.route_plan_id is not null and exists (
    select 1 from public.route_stops st
    where st.route_plan_id = v_session.route_plan_id
      and st.client_id = p_client_id
  ) then
    raise exception 'Este cliente forma parte de la ruta planificada. Registra la llegada desde su parada para conservar la cobertura del plan.';
  end if;

  insert into public.visits(
    route_session_id, route_stop_id, client_id, employee_id,
    visit_kind, planned, started_at,
    start_latitude, start_longitude, start_accuracy_m,
    created_by, updated_by
  ) values (
    v_session.id, null, p_client_id, v_employee_id,
    'CLIENTE', false, now(),
    p_start_latitude, p_start_longitude, p_start_accuracy_m,
    auth.uid(), auth.uid()
  ) returning id into v_visit_id;

  return jsonb_build_object(
    'visit_id', v_visit_id,
    'route_session_id', v_session.id,
    'client_id', p_client_id,
    'client_name', v_client_name,
    'planned', false
  );
end;
$$;

revoke all on function public.start_additional_visit(uuid,uuid,double precision,double precision,numeric) from public, anon;
grant execute on function public.start_additional_visit(uuid,uuid,double precision,double precision,numeric) to authenticated;

create or replace view public.executive_route_journeys_v4
with (security_invoker = true)
as
with visit_modes as (
  select
    v.route_session_id,
    count(*) filter (where v.planned = true and v.ended_at is not null)::integer as planned_visit_records,
    count(*) filter (where v.planned = false and v.ended_at is not null)::integer as additional_visits,
    count(*) filter (where v.planned = false)::integer as additional_visit_records,
    count(*) filter (where v.ended_at is not null)::integer as total_completed_visits
  from public.visits v
  where v.route_session_id is not null
  group by v.route_session_id
)
select
  j.*,
  rp.route_mode,
  coalesce(vm.planned_visit_records,0) as planned_visit_records,
  coalesce(vm.additional_visits,0) as additional_visits,
  coalesce(vm.additional_visit_records,0) as additional_visit_records,
  coalesce(vm.total_completed_visits,0) as total_completed_visits
from public.executive_route_journeys_v3 j
join public.route_plans rp on rp.id = j.route_plan_id
left join visit_modes vm on vm.route_session_id = j.route_session_id;

grant select on public.executive_route_journeys_v4 to authenticated;