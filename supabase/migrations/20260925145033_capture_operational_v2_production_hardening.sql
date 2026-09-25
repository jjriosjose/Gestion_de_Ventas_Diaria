-- Capture Operational V2 production hardening.
-- Applied remotely as migration 20260925145033.

drop policy if exists capture_interactions_select_scope on public.capture_interactions;
create policy capture_interactions_select_scope
on public.capture_interactions
for select
to authenticated
using (
  employee_id = private.current_employee_id()
  or private.current_user_can_view_tracking()
);

create or replace function private.link_prospect_route_session()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.route_session_id is not null
     or new.captured_by_employee_id is null
     or new.captured_at is null then
    return new;
  end if;

  select rs.id
    into new.route_session_id
  from public.route_sessions rs
  join public.route_plans rp on rp.id = rs.route_plan_id
  where rs.employee_id = new.captured_by_employee_id
    and rs.started_at <= new.captured_at
    and (rs.ended_at is null or rs.ended_at >= new.captured_at)
    and (rs.session_type = 'CAPTACION' or rp.plan_type = 'CAPTACION')
  order by rs.started_at desc
  limit 1;

  return new;
end;
$function$;

create or replace function public.start_open_journey(
  p_start_latitude double precision default null,
  p_start_longitude double precision default null,
  p_start_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_employee_id uuid := private.current_employee_id();
  v_employee public.employees%rowtype;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_plan_id uuid;
  v_session_id uuid;
  v_started_at timestamptz;
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
    select 1 from public.route_sessions rs
    where rs.employee_id = v_employee_id
      and rs.status = 'ACTIVA'
      and rs.ended_at is null
  ) then
    raise exception 'Ya tienes una jornada activa. Finalízala antes de iniciar otra.';
  end if;

  if exists (
    select 1 from public.route_plans rp
    where rp.employee_id = v_employee_id
      and rp.route_date = v_today
      and rp.route_mode = 'LIBRE'
      and rp.plan_type in ('VISITAS','MIXTA')
  ) then
    raise exception 'La Jornada Libre de hoy ya fue creada. Si fue finalizada, no puede iniciarse otra hasta el próximo día.';
  end if;

  if exists (
    select 1 from public.route_plans rp
    where rp.employee_id = v_employee_id
      and rp.route_date = v_today
      and rp.route_mode = 'PLANIFICADA'
      and rp.plan_type in ('VISITAS','MIXTA')
      and rp.status in ('PLANIFICADA','ACTIVA')
  ) then
    raise exception 'Tienes una ruta planificada de visitas disponible para hoy. Iníciala y usa Visita adicional para clientes fuera del plan.';
  end if;

  v_plan_code := 'OPEN-' || to_char(v_today,'YYYYMMDD') || '-' || left(replace(v_employee_id::text,'-',''),8) || '-' || upper(left(replace(gen_random_uuid()::text,'-',''),6));
  v_title := 'Jornada libre · ' || to_char(v_today,'DD/MM/YYYY');

  insert into public.route_plans(
    plan_code, employee_id, route_date, plan_type, title, objective,
    target_visits, status, notes, route_mode, created_by, updated_by
  ) values (
    v_plan_code, v_employee_id, v_today, 'VISITAS', v_title,
    'Jornada abierta de visitas no planificadas', 0, 'PLANIFICADA',
    'Contenedor operativo autogenerado por el vendedor.', 'LIBRE',
    auth.uid(), auth.uid()
  ) returning id into v_plan_id;

  insert into public.route_sessions(
    route_plan_id, employee_id, session_date, session_type, status,
    start_latitude, start_longitude, start_accuracy_m, created_by, updated_by
  ) values (
    v_plan_id, v_employee_id, v_today, 'VISITAS', 'ACTIVA',
    p_start_latitude, p_start_longitude, p_start_accuracy_m, auth.uid(), auth.uid()
  ) returning id, started_at into v_session_id, v_started_at;

  update public.route_plans
  set status = 'ACTIVA'
  where id = v_plan_id
    and status = 'PLANIFICADA';

  return jsonb_build_object(
    'route_plan_id', v_plan_id,
    'route_session_id', v_session_id,
    'route_mode', 'LIBRE',
    'title', v_title,
    'route_date', v_today,
    'started_at', v_started_at
  );
end;
$function$;

create or replace function private.prevent_visit_during_active_capture()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.route_session_id is not null
     and new.ended_at is null
     and exists (
       select 1
       from public.capture_interactions ci
       where ci.route_session_id = new.route_session_id
         and ci.status = 'ACTIVA'
         and ci.ended_at is null
     ) then
    raise exception 'Finaliza la captación activa antes de iniciar una visita.';
  end if;
  return new;
end;
$function$;

drop trigger if exists visits_block_active_capture on public.visits;
create trigger visits_block_active_capture
before insert or update of route_session_id,ended_at
on public.visits
for each row execute function private.prevent_visit_during_active_capture();

create or replace function private.prevent_incident_during_active_capture()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if new.route_session_id is not null
     and new.status = 'ACTIVA'
     and new.ended_at is null
     and exists (
       select 1
       from public.capture_interactions ci
       where ci.route_session_id = new.route_session_id
         and ci.status = 'ACTIVA'
         and ci.ended_at is null
     ) then
    raise exception 'Finaliza la captación activa antes de iniciar una eventualidad.';
  end if;
  return new;
end;
$function$;

drop trigger if exists incidents_block_active_capture on public.operational_incidents;
create trigger incidents_block_active_capture
before insert or update of route_session_id,status,ended_at
on public.operational_incidents
for each row execute function private.prevent_incident_during_active_capture();

create or replace function private.prevent_route_close_with_active_capture()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if old.status = 'ACTIVA'
     and (new.status = 'FINALIZADA' or new.ended_at is not null)
     and exists (
       select 1
       from public.capture_interactions ci
       where ci.route_session_id = old.id
         and ci.status = 'ACTIVA'
         and ci.ended_at is null
     ) then
    raise exception 'Existe una captación activa. Finalízala o cancélala antes de cerrar la jornada.';
  end if;
  return new;
end;
$function$;

drop trigger if exists route_sessions_block_close_with_capture on public.route_sessions;
create trigger route_sessions_block_close_with_capture
before update of status,ended_at
on public.route_sessions
for each row execute function private.prevent_route_close_with_active_capture();

do $block$
declare
  v_sql text;
begin
  select pg_get_viewdef('public.executive_tracking_events_v2_test'::regclass,true) into v_sql;
  v_sql := replace(
    v_sql,
    'private.current_user_can_view_tracking() AND (private.is_admin() OR ci.employee_id = private.current_employee_id())',
    '(private.current_user_can_view_tracking() OR ci.employee_id = private.current_employee_id())'
  );
  execute 'create or replace view public.executive_tracking_events_v2 with (security_invoker=true) as ' || v_sql;

  select pg_get_viewdef('public.executive_route_journeys_v5_test'::regclass,true) into v_sql;
  execute 'create or replace view public.executive_route_journeys_v5 with (security_invoker=true) as ' || v_sql;
end;
$block$;

grant select on public.executive_tracking_events_v2 to authenticated;
grant select on public.executive_route_journeys_v5 to authenticated;

create or replace function public.start_route_capture_interaction(
  p_route_session_id uuid,
  p_subject_name text,
  p_start_latitude double precision default null,
  p_start_longitude double precision default null,
  p_start_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_employee_id uuid := private.current_employee_id();
  v_session public.route_sessions%rowtype;
  v_plan public.route_plans%rowtype;
  v_id uuid;
  v_started timestamptz;
begin
  if v_employee_id is null then
    raise exception 'No se pudo identificar al empleado autenticado.' using errcode='42501';
  end if;

  if coalesce(trim(p_subject_name),'')='' then
    raise exception 'Indica el nombre del negocio o referencia de la captación.';
  end if;

  select * into v_session
  from public.route_sessions
  where id=p_route_session_id
    and employee_id=v_employee_id
    and status='ACTIVA'
    and ended_at is null
  for update;

  if not found then
    raise exception 'No existe una jornada activa válida para iniciar la captación.';
  end if;

  select * into v_plan
  from public.route_plans
  where id=v_session.route_plan_id;

  if v_plan.plan_type not in ('VISITAS','MIXTA') then
    raise exception 'La captación dentro de Rutas solo aplica a jornadas de visitas.';
  end if;

  if exists(
    select 1 from public.visits
    where route_session_id=v_session.id and ended_at is null
  ) then
    raise exception 'Finaliza la visita actual antes de iniciar una captación.';
  end if;

  if exists(
    select 1 from public.operational_incidents
    where route_session_id=v_session.id and status='ACTIVA' and ended_at is null
  ) then
    raise exception 'Finaliza la eventualidad activa antes de iniciar una captación.';
  end if;

  if exists(
    select 1 from public.capture_interactions
    where route_session_id=v_session.id and status='ACTIVA' and ended_at is null
  ) then
    raise exception 'Ya existe una captación en curso en esta jornada.';
  end if;

  insert into public.capture_interactions(
    route_session_id,route_plan_id,employee_id,source_context,status,
    subject_name,start_latitude,start_longitude,start_accuracy_m
  ) values (
    v_session.id,v_plan.id,v_employee_id,'ROUTE','ACTIVA',
    trim(p_subject_name),p_start_latitude,p_start_longitude,p_start_accuracy_m
  )
  returning id,started_at into v_id,v_started;

  return jsonb_build_object(
    'id',v_id,'route_session_id',v_session.id,'route_plan_id',v_plan.id,
    'subject_name',trim(p_subject_name),'status','ACTIVA','started_at',v_started
  );
end;
$function$;
