-- V0.6.5-beta.12 · Live Operations Tracking
-- Additive executive views only. No operational table behavior is changed.

create or replace view public.executive_tracking_events_v1 as
with events as (
  select
    'ROUTE_START:' || rs.id::text as event_id,
    rs.route_plan_id,
    rs.id as route_session_id,
    rs.employee_id,
    e.full_name,
    e.job_title,
    e.employee_type,
    rs.session_date as route_date,
    'ROUTE_START'::text as event_type,
    rs.started_at as event_at,
    rs.start_latitude as latitude,
    rs.start_longitude as longitude,
    rs.start_accuracy_m as accuracy_m,
    null::uuid as visit_id,
    null::uuid as incident_id,
    null::uuid as route_stop_id,
    null::uuid as client_id,
    null::uuid as prospect_id,
    null::text as subject_name,
    null::integer as stop_order,
    null::text as official_region,
    null::text as official_province,
    null::text as official_municipality,
    'Inicio de ruta'::text as event_label,
    'route_sessions'::text as source_type,
    rs.id as source_id
  from public.route_sessions rs
  join public.employees e on e.id = rs.employee_id
  where rs.started_at is not null

  union all

  select
    'VISIT_START:' || v.id::text,
    rs.route_plan_id,
    v.route_session_id,
    v.employee_id,
    e.full_name,
    e.job_title,
    e.employee_type,
    rs.session_date,
    'VISIT_START',
    v.started_at,
    v.start_latitude,
    v.start_longitude,
    v.start_accuracy_m,
    v.id,
    null::uuid,
    v.route_stop_id,
    v.client_id,
    v.prospect_id,
    coalesce(c.legal_name, p.legal_name, 'Visita'),
    st.stop_order,
    st.official_region_at_plan,
    st.official_province_at_plan,
    st.official_municipality_at_plan,
    'Inicio de visita',
    'visits',
    v.id
  from public.visits v
  join public.route_sessions rs on rs.id = v.route_session_id
  join public.employees e on e.id = v.employee_id
  left join public.route_stops st on st.id = v.route_stop_id
  left join public.clients c on c.id = v.client_id
  left join public.prospects p on p.id = v.prospect_id
  where v.started_at is not null

  union all

  select
    'VISIT_END:' || v.id::text,
    rs.route_plan_id,
    v.route_session_id,
    v.employee_id,
    e.full_name,
    e.job_title,
    e.employee_type,
    rs.session_date,
    'VISIT_END',
    v.ended_at,
    v.end_latitude,
    v.end_longitude,
    v.end_accuracy_m,
    v.id,
    null::uuid,
    v.route_stop_id,
    v.client_id,
    v.prospect_id,
    coalesce(c.legal_name, p.legal_name, 'Visita'),
    st.stop_order,
    st.official_region_at_plan,
    st.official_province_at_plan,
    st.official_municipality_at_plan,
    'Fin de visita',
    'visits',
    v.id
  from public.visits v
  join public.route_sessions rs on rs.id = v.route_session_id
  join public.employees e on e.id = v.employee_id
  left join public.route_stops st on st.id = v.route_stop_id
  left join public.clients c on c.id = v.client_id
  left join public.prospects p on p.id = v.prospect_id
  where v.ended_at is not null

  union all

  select
    'INCIDENT_START:' || oi.id::text,
    rs.route_plan_id,
    oi.route_session_id,
    oi.employee_id,
    e.full_name,
    e.job_title,
    e.employee_type,
    rs.session_date,
    'INCIDENT_START',
    oi.started_at,
    oi.latitude,
    oi.longitude,
    oi.accuracy_m,
    null::uuid,
    oi.id,
    null::uuid,
    null::uuid,
    null::uuid,
    oi.incident_type,
    null::integer,
    null::text,
    null::text,
    null::text,
    'Inicio de eventualidad',
    'operational_incidents',
    oi.id
  from public.operational_incidents oi
  join public.route_sessions rs on rs.id = oi.route_session_id
  join public.employees e on e.id = oi.employee_id
  where oi.started_at is not null

  union all

  select
    'INCIDENT_END:' || oi.id::text,
    rs.route_plan_id,
    oi.route_session_id,
    oi.employee_id,
    e.full_name,
    e.job_title,
    e.employee_type,
    rs.session_date,
    'INCIDENT_END',
    oi.ended_at,
    oi.latitude,
    oi.longitude,
    oi.accuracy_m,
    null::uuid,
    oi.id,
    null::uuid,
    null::uuid,
    null::uuid,
    oi.incident_type,
    null::integer,
    null::text,
    null::text,
    null::text,
    'Fin de eventualidad',
    'operational_incidents',
    oi.id
  from public.operational_incidents oi
  join public.route_sessions rs on rs.id = oi.route_session_id
  join public.employees e on e.id = oi.employee_id
  where oi.ended_at is not null

  union all

  select
    'ROUTE_END:' || rs.id::text,
    rs.route_plan_id,
    rs.id,
    rs.employee_id,
    e.full_name,
    e.job_title,
    e.employee_type,
    rs.session_date,
    'ROUTE_END',
    rs.ended_at,
    rs.end_latitude,
    rs.end_longitude,
    rs.end_accuracy_m,
    null::uuid,
    null::uuid,
    null::uuid,
    null::uuid,
    null::uuid,
    null::text,
    null::integer,
    null::text,
    null::text,
    null::text,
    'Fin de ruta',
    'route_sessions',
    rs.id
  from public.route_sessions rs
  join public.employees e on e.id = rs.employee_id
  where rs.ended_at is not null
)
select
  events.*,
  (events.latitude is not null and events.longitude is not null) as has_gps
from events
where private.is_admin() or events.employee_id = private.current_employee_id();

grant select on public.executive_tracking_events_v1 to authenticated;

create or replace view public.executive_tracking_stops_v1 as
select
  st.id as route_stop_id,
  st.route_plan_id,
  rp.route_date,
  rp.employee_id,
  e.full_name,
  e.job_title,
  e.employee_type,
  st.stop_order,
  st.status as stop_status,
  st.priority,
  st.planned_time,
  st.expected_duration_min,
  st.client_id,
  st.prospect_id,
  coalesce(c.legal_name, p.legal_name, 'Parada') as subject_name,
  coalesce(c.latitude, p.latitude) as latitude,
  coalesce(c.longitude, p.longitude) as longitude,
  st.official_region_at_plan as official_region,
  st.official_province_at_plan as official_province,
  st.official_municipality_at_plan as official_municipality,
  st.reason_not_visited,
  st.exception_reason_code,
  st.visit_id
from public.route_stops st
join public.route_plans rp on rp.id = st.route_plan_id
join public.employees e on e.id = rp.employee_id
left join public.clients c on c.id = st.client_id
left join public.prospects p on p.id = st.prospect_id
where private.is_admin() or rp.employee_id = private.current_employee_id();

grant select on public.executive_tracking_stops_v1 to authenticated;

create or replace view public.executive_tracking_snapshot_v1 as
select
  j.route_plan_id,
  j.route_session_id,
  j.employee_id,
  j.full_name,
  j.job_title,
  j.employee_type,
  j.route_date,
  j.plan_type,
  j.title,
  j.derived_status as journey_status,
  case
    when j.derived_status = 'PENDIENTE_CIERRE' then 'PENDIENTE_CIERRE'
    when j.ended_at is not null then 'FINALIZADA'
    when coalesce(j.active_incident_count,0) > 0 then 'EVENTUALIDAD'
    when coalesce(j.open_visit_count,0) > 0 then 'EN_VISITA'
    when j.route_session_id is not null and j.ended_at is null then 'EN_TRASLADO'
    when j.route_session_id is null and j.route_date < (timezone('America/Santo_Domingo', now()))::date then 'NO_EJECUTADA'
    else 'PLANIFICADA'
  end as tracking_status,
  j.started_at,
  j.ended_at,
  j.planned_clients,
  j.visited_clients,
  j.resolved_clients,
  j.coverage_pct,
  j.resolution_pct,
  j.route_window_seconds,
  j.visit_seconds,
  j.incident_seconds,
  j.transit_wait_estimated_seconds,
  j.estimated_distance_m,
  j.open_visit_count,
  j.incident_count,
  j.active_incident_count,
  j.official_regions,
  j.official_provinces,
  j.official_municipalities,
  le.event_id as last_event_id,
  le.event_type as last_event_type,
  le.event_at as last_event_at,
  le.latitude as last_latitude,
  le.longitude as last_longitude,
  le.accuracy_m as last_accuracy_m,
  le.subject_name as last_subject_name,
  le.stop_order as last_stop_order,
  le.event_label as last_event_label,
  case when le.event_at is null then null else greatest(0, floor(extract(epoch from (now() - le.event_at))/60.0))::integer end as last_event_age_minutes,
  case
    when le.event_at is null then 'SIN_REGISTRO'
    when extract(epoch from (now() - le.event_at))/60.0 <= 15 then 'RECIENTE'
    when extract(epoch from (now() - le.event_at))/60.0 <= 30 then 'ATENCION'
    else 'ANTIGUO'
  end as freshness_status,
  ns.route_stop_id as next_route_stop_id,
  ns.stop_order as next_stop_order,
  ns.subject_name as next_subject_name,
  ns.latitude as next_latitude,
  ns.longitude as next_longitude,
  ns.official_region as next_official_region,
  ns.official_province as next_official_province,
  ns.official_municipality as next_official_municipality
from public.executive_route_journeys_v3 j
left join lateral (
  select ev.*
  from public.executive_tracking_events_v1 ev
  where ev.route_plan_id = j.route_plan_id
  order by ev.event_at desc nulls last
  limit 1
) le on true
left join lateral (
  select st.*
  from public.executive_tracking_stops_v1 st
  where st.route_plan_id = j.route_plan_id
    and st.stop_status = 'PENDIENTE'
  order by st.stop_order asc
  limit 1
) ns on true;

grant select on public.executive_tracking_snapshot_v1 to authenticated;

comment on view public.executive_tracking_events_v1 is 'Beta12 scoped operational GPS event timeline. Coordinates are recorded event points, not continuous tracking.';
comment on view public.executive_tracking_stops_v1 is 'Beta12 scoped planned route stops for tracking visualization.';
comment on view public.executive_tracking_snapshot_v1 is 'Beta12 scoped tracking snapshot per route plan with inferred operational state and last recorded GPS event.';
