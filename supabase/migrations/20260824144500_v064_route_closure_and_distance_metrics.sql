-- V0.6.4 — cierre parcial controlado y distancia estimada por puntos GPS
-- Cambio aditivo y compatible con V0.6.3.

alter table public.route_sessions
  add column if not exists closure_mode text,
  add column if not exists closure_reason_code text,
  add column if not exists closure_reason_text text,
  add column if not exists closure_notes text,
  add column if not exists closed_pending_count integer not null default 0;

alter table public.route_sessions
  drop constraint if exists route_sessions_closure_mode_check,
  add constraint route_sessions_closure_mode_check
    check (closure_mode is null or closure_mode in ('NORMAL','PARCIAL')),
  drop constraint if exists route_sessions_closed_pending_count_check,
  add constraint route_sessions_closed_pending_count_check
    check (closed_pending_count >= 0),
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
        'OTRO'
      )
    );

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
  v_reason_text text;
  v_target_status text;
  v_closed_at timestamptz := now();
  v_mode text;
begin
  select *
    into v_session
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

  if exists (
    select 1
    from public.visits v
    where v.employee_id = v_session.employee_id
      and v.ended_at is null
  ) then
    raise exception 'Existe una visita abierta. Registra la salida antes de cerrar la jornada.';
  end if;

  if exists (
    select 1
    from public.operational_incidents oi
    where oi.route_session_id = v_session.id
      and oi.status = 'ACTIVA'
  ) then
    raise exception 'Existe una eventualidad activa. Finalízala antes de cerrar la jornada.';
  end if;

  select count(*)::integer
    into v_in_visit_count
  from public.route_stops rs
  where rs.route_plan_id = v_session.route_plan_id
    and rs.status = 'EN_VISITA';

  if v_in_visit_count > 0 then
    raise exception 'Existe una parada marcada EN VISITA. Debe resolverse antes de cerrar la jornada.';
  end if;

  select count(*)::integer
    into v_pending_count
  from public.route_stops rs
  where rs.route_plan_id = v_session.route_plan_id
    and rs.status = 'PENDIENTE';

  if v_pending_count > 0 then
    if p_reason_code is null or btrim(p_reason_code) = '' then
      raise exception 'Debes indicar el motivo para las paradas pendientes.';
    end if;

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

    update public.route_stops
       set status = v_target_status,
           exception_reason_code = p_reason_code,
           reason_not_visited = v_reason_text,
           notes = case
             when nullif(btrim(coalesce(p_notes,'')), '') is null then notes
             when nullif(btrim(coalesce(notes,'')), '') is null then 'Cierre de jornada: ' || btrim(p_notes)
             else notes || E'\nCierre de jornada: ' || btrim(p_notes)
           end
     where route_plan_id = v_session.route_plan_id
       and status = 'PENDIENTE';

    v_mode := 'PARCIAL';
  else
    v_reason_text := 'Sin paradas pendientes al cerrar';
    v_mode := 'NORMAL';
  end if;

  update public.route_sessions
     set ended_at = v_closed_at,
         end_latitude = p_end_latitude,
         end_longitude = p_end_longitude,
         end_accuracy_m = p_end_accuracy_m,
         status = 'FINALIZADA',
         closure_mode = v_mode,
         closure_reason_code = case when v_pending_count > 0 then p_reason_code else 'SIN_PENDIENTES' end,
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
    'closure_reason_code', case when v_pending_count > 0 then p_reason_code else 'SIN_PENDIENTES' end,
    'closure_reason_text', v_reason_text,
    'closed_pending_count', v_pending_count
  );
end;
$$;

revoke all on function public.finalize_route_session(uuid,text,text,double precision,double precision,numeric) from public;
grant execute on function public.finalize_route_session(uuid,text,text,double precision,double precision,numeric) to authenticated;

create or replace view public.executive_daily_route_metrics
with (security_invoker = true)
as
with ordered_visits as (
  select
    v.route_session_id,
    v.id as visit_id,
    v.started_at,
    v.ended_at,
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
), session_metrics as (
  select
    rs.id as route_session_id,
    rs.employee_id,
    rs.session_date as day,
    rs.status,
    rs.started_at,
    rs.ended_at,
    coalesce(sum(
      case
        when ov.rn = 1
         and rs.start_latitude is not null and rs.start_longitude is not null
         and ov.start_latitude is not null and ov.start_longitude is not null
        then extensions.ST_DistanceSphere(
          extensions.ST_SetSRID(extensions.ST_MakePoint(rs.start_longitude, rs.start_latitude),4326),
          extensions.ST_SetSRID(extensions.ST_MakePoint(ov.start_longitude, ov.start_latitude),4326)
        )
        else 0
      end
    ),0)::numeric as start_to_first_m,
    coalesce(sum(
      case
        when ov.rn > 1
         and ov.prev_end_latitude is not null and ov.prev_end_longitude is not null
         and ov.start_latitude is not null and ov.start_longitude is not null
        then extensions.ST_DistanceSphere(
          extensions.ST_SetSRID(extensions.ST_MakePoint(ov.prev_end_longitude, ov.prev_end_latitude),4326),
          extensions.ST_SetSRID(extensions.ST_MakePoint(ov.start_longitude, ov.start_latitude),4326)
        )
        else 0
      end
    ),0)::numeric as between_visits_m,
    coalesce(max(
      case
        when ov.rn = ov.visit_count
         and rs.ended_at is not null
         and ov.end_latitude is not null and ov.end_longitude is not null
         and rs.end_latitude is not null and rs.end_longitude is not null
        then extensions.ST_DistanceSphere(
          extensions.ST_SetSRID(extensions.ST_MakePoint(ov.end_longitude, ov.end_latitude),4326),
          extensions.ST_SetSRID(extensions.ST_MakePoint(rs.end_longitude, rs.end_latitude),4326)
        )
        else 0
      end
    ),0)::numeric as last_to_end_m,
    count(*) filter (
      where (
        ov.rn = 1
        and rs.start_latitude is not null and rs.start_longitude is not null
        and ov.start_latitude is not null and ov.start_longitude is not null
      ) or (
        ov.rn > 1
        and ov.prev_end_latitude is not null and ov.prev_end_longitude is not null
        and ov.start_latitude is not null and ov.start_longitude is not null
      )
    )::integer
    + case
        when rs.ended_at is not null
         and max(case when ov.rn = ov.visit_count then ov.end_latitude end) is not null
         and max(case when ov.rn = ov.visit_count then ov.end_longitude end) is not null
         and rs.end_latitude is not null and rs.end_longitude is not null
        then 1 else 0
      end as gps_segments
  from public.route_sessions rs
  left join ordered_visits ov on ov.route_session_id = rs.id
  group by rs.id, rs.employee_id, rs.session_date, rs.status, rs.started_at, rs.ended_at,
           rs.start_latitude, rs.start_longitude, rs.end_latitude, rs.end_longitude
)
select
  employee_id,
  day,
  count(*)::integer as route_sessions,
  count(*) filter (where status = 'FINALIZADA')::integer as route_sessions_completed,
  round(sum(start_to_first_m),1) as start_to_first_m,
  round(sum(between_visits_m),1) as between_visits_m,
  round(sum(last_to_end_m),1) as last_to_end_m,
  round(sum(start_to_first_m + between_visits_m + last_to_end_m),1) as estimated_distance_m,
  sum(gps_segments)::integer as gps_segments
from session_metrics
group by employee_id, day;

grant select on public.executive_daily_route_metrics to authenticated;

comment on view public.executive_daily_route_metrics is
  'Distancia geodésica estimada entre puntos GPS operativos de ruta. No representa odómetro ni recorrido vial exacto.';
