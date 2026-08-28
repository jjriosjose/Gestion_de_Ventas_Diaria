-- V0.6.5-beta.9 — lifecycle de jornadas y base ejecutiva multiperíodo
-- Regla: una jornada de ruta solo puede ejecutarse en su fecha operativa.

alter table public.route_sessions
  drop constraint if exists route_sessions_closure_reason_code_check,
  add constraint route_sessions_closure_reason_code_check
    check (
      closure_reason_code is null or closure_reason_code in (
        'SIN_PENDIENTES',
        'FIN_JORNADA',
        'TRAFICO_RETRASO',
        'CAMBIO_PRIORIDAD',
        'EVENTUALIDAD',
        'SUSPENSION_SUPERVISOR',
        'REPROGRAMACION',
        'JORNADA_VENCIDA',
        'OTRO'
      )
    );

create or replace function private.assert_route_session_executable(p_route_session_id uuid)
returns void
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_session public.route_sessions%rowtype;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
begin
  if p_route_session_id is null then
    return;
  end if;

  select * into v_session
  from public.route_sessions
  where id = p_route_session_id;

  if not found then
    raise exception 'La jornada asociada no existe.';
  end if;

  if v_session.status <> 'ACTIVA' or v_session.ended_at is not null then
    raise exception 'La jornada ya no está activa.';
  end if;

  if v_session.session_date is distinct from v_today then
    raise exception 'La jornada pertenece al %. Hoy es %. Una jornada no puede continuar en días posteriores.', v_session.session_date, v_today;
  end if;
end;
$$;

create or replace function private.guard_visit_route_day()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if new.route_session_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform private.assert_route_session_executable(new.route_session_id);
  elsif tg_op = 'UPDATE' and (
       new.route_session_id is distinct from old.route_session_id
    or new.ended_at is distinct from old.ended_at
    or new.end_latitude is distinct from old.end_latitude
    or new.end_longitude is distinct from old.end_longitude
    or new.received is distinct from old.received
    or new.purchase_result is distinct from old.purchase_result
    or new.purchase_amount is distinct from old.purchase_amount
    or new.result is distinct from old.result
  ) then
    perform private.assert_route_session_executable(new.route_session_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_visits_route_day_guard on public.visits;
create trigger trg_visits_route_day_guard
before insert or update on public.visits
for each row execute function private.guard_visit_route_day();

create or replace function private.guard_incident_route_day()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if new.route_session_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform private.assert_route_session_executable(new.route_session_id);
  elsif tg_op = 'UPDATE' and (
       new.route_session_id is distinct from old.route_session_id
    or new.started_at is distinct from old.started_at
    or new.ended_at is distinct from old.ended_at
    or new.status is distinct from old.status
    or new.incident_type is distinct from old.incident_type
    or new.impact is distinct from old.impact
  ) then
    perform private.assert_route_session_executable(new.route_session_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_incidents_route_day_guard on public.operational_incidents;
create trigger trg_incidents_route_day_guard
before insert or update on public.operational_incidents
for each row execute function private.guard_incident_route_day();

create or replace function private.guard_route_stop_stale_execution()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_session_id uuid;
  v_session_date date;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if coalesce(current_setting('app.allow_stale_route_close', true), '') = '1' then
    return new;
  end if;

  select rs.id, rs.session_date
    into v_session_id, v_session_date
  from public.route_sessions rs
  where rs.route_plan_id = new.route_plan_id
    and rs.status = 'ACTIVA'
    and rs.ended_at is null
  order by rs.started_at desc
  limit 1;

  if v_session_id is not null and v_session_date < v_today then
    raise exception 'La jornada del % está vencida. No se pueden modificar paradas para continuar su ejecución.', v_session_date;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_route_stops_stale_execution_guard on public.route_stops;
create trigger trg_route_stops_stale_execution_guard
before update on public.route_stops
for each row execute function private.guard_route_stop_stale_execution();

create or replace function public.finalize_route_session(
  p_route_session_id uuid,
  p_reason_code text default null,
  p_notes text default null,
  p_end_latitude double precision default null,
  p_end_longitude double precision default null,
  p_end_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_session public.route_sessions%rowtype;
  v_pending_count integer := 0;
  v_in_visit_count integer := 0;
  v_reason_code text;
  v_reason_text text;
  v_target_status text;
  v_closed_at timestamptz := now();
  v_mode text;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_expired boolean := false;
begin
  select * into v_session
  from public.route_sessions
  where id = p_route_session_id
  for update;

  if not found then
    raise exception 'La jornada de ruta no existe.';
  end if;

  if v_session.status <> 'ACTIVA' or v_session.ended_at is not null then
    raise exception 'La jornada ya no está activa.';
  end if;

  if not coalesce(private.can_manage_employee(v_session.employee_id), false) then
    raise exception 'No tienes permiso para cerrar esta jornada.' using errcode = '42501';
  end if;

  if v_session.route_plan_id is null then
    raise exception 'La jornada no está vinculada a una planificación de ruta.';
  end if;

  v_expired := v_session.session_date < v_today;

  if exists (
    select 1 from public.visits v
    where v.employee_id = v_session.employee_id
      and v.ended_at is null
  ) then
    if v_expired then
      raise exception 'La jornada vencida conserva una visita abierta. Dirección debe revisar esa visita antes de cerrar la jornada para no falsear la atención.';
    end if;
    raise exception 'Existe una visita abierta. Registra la salida antes de cerrar la jornada.';
  end if;

  if exists (
    select 1 from public.operational_incidents oi
    where oi.route_session_id = v_session.id
      and oi.status = 'ACTIVA'
  ) then
    if v_expired then
      raise exception 'La jornada vencida conserva una eventualidad activa. Dirección debe revisarla antes del cierre.';
    end if;
    raise exception 'Existe una eventualidad activa. Finalízala antes de cerrar la jornada.';
  end if;

  select count(*)::integer into v_in_visit_count
  from public.route_stops rs
  where rs.route_plan_id = v_session.route_plan_id
    and rs.status = 'EN_VISITA';

  if v_in_visit_count > 0 then
    raise exception 'Existe una parada marcada EN VISITA. Debe revisarse antes de cerrar la jornada.';
  end if;

  select count(*)::integer into v_pending_count
  from public.route_stops rs
  where rs.route_plan_id = v_session.route_plan_id
    and rs.status = 'PENDIENTE';

  if v_expired then
    v_reason_code := 'JORNADA_VENCIDA';
    v_reason_text := 'Cierre posterior de jornada vencida';
    v_target_status := 'NO_VISITADO';
    v_mode := case when v_pending_count > 0 then 'PARCIAL' else 'NORMAL' end;
  elsif v_pending_count > 0 then
    if p_reason_code is null or btrim(p_reason_code) = '' then
      raise exception 'Debes indicar el motivo para las paradas pendientes.';
    end if;

    v_reason_code := p_reason_code;
    v_reason_text := case p_reason_code
      when 'FIN_JORNADA' then 'Fin de jornada / tiempo agotado'
      when 'TRAFICO_RETRASO' then 'Tráfico o retrasos'
      when 'CAMBIO_PRIORIDAD' then 'Cambio de prioridad autorizado'
      when 'EVENTUALIDAD' then 'Eventualidad de jornada'
      when 'SUSPENSION_SUPERVISOR' then 'Suspensión por supervisor'
      when 'REPROGRAMACION' then 'Reprogramación de pendientes'
      when 'OTRO' then 'Otro'
      else null
    end;

    if v_reason_text is null then
      raise exception 'El motivo de cierre no es válido.';
    end if;

    if p_reason_code = 'OTRO' and nullif(btrim(coalesce(p_notes,'')), '') is null then
      raise exception 'Describe el motivo de cierre cuando seleccionas Otro.';
    end if;

    v_target_status := case when p_reason_code = 'REPROGRAMACION' then 'REPROGRAMADO' else 'NO_VISITADO' end;
    v_mode := 'PARCIAL';
  else
    v_reason_code := 'SIN_PENDIENTES';
    v_reason_text := 'Sin paradas pendientes al cerrar';
    v_target_status := null;
    v_mode := 'NORMAL';
  end if;

  if v_pending_count > 0 then
    if v_expired then perform set_config('app.allow_stale_route_close','1',true); end if;

    update public.route_stops
       set status = v_target_status,
           exception_reason_code = v_reason_code,
           reason_not_visited = v_reason_text,
           notes = case
             when nullif(btrim(coalesce(p_notes,'')), '') is null then notes
             when nullif(btrim(coalesce(notes,'')), '') is null then 'Cierre de jornada: ' || btrim(p_notes)
             else notes || E'\nCierre de jornada: ' || btrim(p_notes)
           end
     where route_plan_id = v_session.route_plan_id
       and status = 'PENDIENTE';
  end if;

  update public.route_sessions
     set ended_at = v_closed_at,
         end_latitude = case when v_expired then null else p_end_latitude end,
         end_longitude = case when v_expired then null else p_end_longitude end,
         end_accuracy_m = case when v_expired then null else p_end_accuracy_m end,
         status = 'FINALIZADA',
         closure_mode = v_mode,
         closure_reason_code = v_reason_code,
         closure_reason_text = v_reason_text,
         closure_notes = nullif(btrim(coalesce(p_notes,'')), ''),
         closed_pending_count = v_pending_count
   where id = v_session.id;

  update public.route_plans
     set status = 'FINALIZADA'
   where id = v_session.route_plan_id;

  return jsonb_build_object(
    'route_session_id', v_session.id,
    'route_plan_id', v_session.route_plan_id,
    'ended_at', v_closed_at,
    'closure_mode', v_mode,
    'closure_reason_code', v_reason_code,
    'closure_reason_text', v_reason_text,
    'closed_pending_count', v_pending_count,
    'expired', v_expired
  );
end;
$$;

revoke all on function public.finalize_route_session(uuid,text,text,double precision,double precision,numeric) from public;
grant execute on function public.finalize_route_session(uuid,text,text,double precision,double precision,numeric) to authenticated;

create index if not exists route_plans_date_employee_idx on public.route_plans(route_date, employee_id);
create index if not exists route_sessions_date_employee_idx on public.route_sessions(session_date, employee_id);
create index if not exists route_stops_plan_status_idx on public.route_stops(route_plan_id, status);
create index if not exists visits_session_started_idx on public.visits(route_session_id, started_at);
create index if not exists incidents_session_started_idx on public.operational_incidents(route_session_id, started_at);

create or replace view public.executive_route_journeys
with (security_invoker = true)
as
with stop_stats as (
  select
    rp.id as route_plan_id,
    count(st.id)::integer as planned_clients,
    count(st.id) filter (where st.status = 'VISITADO')::integer as visited_clients,
    count(st.id) filter (where st.status = 'EN_VISITA')::integer as in_visit_clients,
    count(st.id) filter (where st.status = 'PENDIENTE')::integer as pending_clients,
    count(st.id) filter (where st.status = 'NO_VISITADO')::integer as not_visited_clients,
    count(st.id) filter (where st.status = 'REPROGRAMADO')::integer as reprogrammed_clients,
    count(st.id) filter (where st.status = 'CANCELADO')::integer as cancelled_clients,
    count(st.id) filter (where st.status in ('VISITADO','NO_VISITADO','REPROGRAMADO','CANCELADO'))::integer as resolved_clients,
    array_remove(array_agg(distinct c.region), null) as regions,
    array_remove(array_agg(distinct c.province), null) as provinces,
    array_remove(array_agg(distinct c.municipality), null) as municipalities,
    array_remove(array_agg(distinct c.client_type), null) as client_types
  from public.route_plans rp
  left join public.route_stops st on st.route_plan_id = rp.id
  left join public.clients c on c.id = st.client_id
  where rp.plan_type in ('VISITAS','MIXTA')
  group by rp.id
), visit_stats as (
  select
    v.route_session_id,
    count(*) filter (where v.ended_at is null)::integer as open_visit_count,
    coalesce(sum(extract(epoch from (coalesce(v.ended_at, least(now(), ((rs.session_date + 1)::timestamp at time zone 'America/Santo_Domingo'))) - v.started_at))),0)::bigint as visit_seconds
  from public.visits v
  join public.route_sessions rs on rs.id = v.route_session_id
  group by v.route_session_id
), incident_stats as (
  select
    oi.route_session_id,
    count(*) filter (where oi.status <> 'CANCELADA')::integer as incident_count,
    count(*) filter (where oi.status = 'ACTIVA')::integer as active_incident_count,
    coalesce(sum(extract(epoch from (coalesce(oi.ended_at, least(now(), ((rs.session_date + 1)::timestamp at time zone 'America/Santo_Domingo'))) - oi.started_at))) filter (where oi.status <> 'CANCELADA'),0)::bigint as incident_seconds
  from public.operational_incidents oi
  join public.route_sessions rs on rs.id = oi.route_session_id
  group by oi.route_session_id
), ordered_visits as (
  select
    v.route_session_id,
    v.id,
    v.started_at,
    v.start_latitude,
    v.start_longitude,
    v.end_latitude,
    v.end_longitude,
    row_number() over (partition by v.route_session_id order by v.started_at, v.id) as rn,
    count(*) over (partition by v.route_session_id) as visit_count,
    lag(v.end_latitude) over (partition by v.route_session_id order by v.started_at, v.id) as prev_end_latitude,
    lag(v.end_longitude) over (partition by v.route_session_id order by v.started_at, v.id) as prev_end_longitude
  from public.visits v
  where v.route_session_id is not null
), journey_distance as (
  select
    rs.id as route_session_id,
    coalesce(sum(case
      when ov.rn = 1 and rs.start_latitude is not null and rs.start_longitude is not null and ov.start_latitude is not null and ov.start_longitude is not null
      then extensions.ST_DistanceSphere(extensions.ST_SetSRID(extensions.ST_MakePoint(rs.start_longitude,rs.start_latitude),4326),extensions.ST_SetSRID(extensions.ST_MakePoint(ov.start_longitude,ov.start_latitude),4326)) else 0 end),0)::numeric
    + coalesce(sum(case
      when ov.rn > 1 and ov.prev_end_latitude is not null and ov.prev_end_longitude is not null and ov.start_latitude is not null and ov.start_longitude is not null
      then extensions.ST_DistanceSphere(extensions.ST_SetSRID(extensions.ST_MakePoint(ov.prev_end_longitude,ov.prev_end_latitude),4326),extensions.ST_SetSRID(extensions.ST_MakePoint(ov.start_longitude,ov.start_latitude),4326)) else 0 end),0)::numeric
    + coalesce(max(case
      when ov.rn = ov.visit_count and rs.ended_at is not null and ov.end_latitude is not null and ov.end_longitude is not null and rs.end_latitude is not null and rs.end_longitude is not null
      then extensions.ST_DistanceSphere(extensions.ST_SetSRID(extensions.ST_MakePoint(ov.end_longitude,ov.end_latitude),4326),extensions.ST_SetSRID(extensions.ST_MakePoint(rs.end_longitude,rs.end_latitude),4326)) else 0 end),0)::numeric as estimated_distance_m
  from public.route_sessions rs
  left join ordered_visits ov on ov.route_session_id = rs.id
  group by rs.id,rs.start_latitude,rs.start_longitude,rs.end_latitude,rs.end_longitude,rs.ended_at
)
select
  rp.id as route_plan_id,
  rs.id as route_session_id,
  rp.employee_id,
  e.full_name,
  e.job_title,
  e.employee_type,
  rp.route_date,
  rp.plan_type,
  rp.title,
  rp.status as plan_status,
  rs.status as session_status,
  rs.started_at,
  rs.ended_at,
  rs.closure_mode,
  rs.closure_reason_code,
  rs.closure_reason_text,
  rs.closed_pending_count,
  case
    when rs.id is null and rp.route_date < (now() at time zone 'America/Santo_Domingo')::date then 'NO_INICIADA'
    when rs.id is null and rp.route_date = (now() at time zone 'America/Santo_Domingo')::date then 'PLANIFICADA'
    when rs.id is null then 'PROGRAMADA'
    when rs.ended_at is not null and rs.closure_mode = 'PARCIAL' then 'FINALIZADA_PARCIAL'
    when rs.ended_at is not null then 'FINALIZADA'
    when rs.session_date < (now() at time zone 'America/Santo_Domingo')::date then 'PENDIENTE_CIERRE'
    else 'ACTIVA'
  end as derived_status,
  coalesce(ss.planned_clients,0) as planned_clients,
  coalesce(ss.visited_clients,0) as visited_clients,
  coalesce(ss.in_visit_clients,0) as in_visit_clients,
  coalesce(ss.pending_clients,0) as pending_clients,
  coalesce(ss.not_visited_clients,0) as not_visited_clients,
  coalesce(ss.reprogrammed_clients,0) as reprogrammed_clients,
  coalesce(ss.cancelled_clients,0) as cancelled_clients,
  coalesce(ss.resolved_clients,0) as resolved_clients,
  case when coalesce(ss.planned_clients,0)>0 then round(100.0*coalesce(ss.visited_clients,0)/ss.planned_clients,1) else 0 end as coverage_pct,
  case when coalesce(ss.planned_clients,0)>0 then round(100.0*coalesce(ss.resolved_clients,0)/ss.planned_clients,1) else 0 end as resolution_pct,
  case when rs.id is null then 0 else greatest(0,extract(epoch from (least(coalesce(rs.ended_at,now()),((rs.session_date+1)::timestamp at time zone 'America/Santo_Domingo'))-rs.started_at)))::bigint end as route_window_seconds,
  coalesce(vs.visit_seconds,0) as visit_seconds,
  coalesce(ins.incident_seconds,0) as incident_seconds,
  greatest(0,(case when rs.id is null then 0 else greatest(0,extract(epoch from (least(coalesce(rs.ended_at,now()),((rs.session_date+1)::timestamp at time zone 'America/Santo_Domingo'))-rs.started_at)))::bigint end)-coalesce(vs.visit_seconds,0)-coalesce(ins.incident_seconds,0)) as transit_wait_estimated_seconds,
  coalesce(jd.estimated_distance_m,0) as estimated_distance_m,
  coalesce(vs.open_visit_count,0) as open_visit_count,
  coalesce(ins.incident_count,0) as incident_count,
  coalesce(ins.active_incident_count,0) as active_incident_count,
  coalesce(ss.regions,array[]::text[]) as regions,
  coalesce(ss.provinces,array[]::text[]) as provinces,
  coalesce(ss.municipalities,array[]::text[]) as municipalities,
  coalesce(ss.client_types,array[]::text[]) as client_types,
  rp.official_area_id,
  rp.official_area_name,
  rp.official_area_level
from public.route_plans rp
join public.employees e on e.id = rp.employee_id
left join public.route_sessions rs on rs.route_plan_id = rp.id
left join stop_stats ss on ss.route_plan_id = rp.id
left join visit_stats vs on vs.route_session_id = rs.id
left join incident_stats ins on ins.route_session_id = rs.id
left join journey_distance jd on jd.route_session_id = rs.id
where rp.plan_type in ('VISITAS','MIXTA');

grant select on public.executive_route_journeys to authenticated;
