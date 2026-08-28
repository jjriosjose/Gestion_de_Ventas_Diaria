-- Finalize beta12 stable v1 tracking views with backend tracking.view enforcement.

drop view if exists public.executive_tracking_snapshot_v2;
drop view if exists public.executive_tracking_stops_v2;
drop view if exists public.executive_tracking_events_v2;

create or replace view public.executive_tracking_events_v1 as
with events as (
  select 'ROUTE_START:'||rs.id::text event_id,rs.route_plan_id,rs.id route_session_id,rs.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date route_date,'ROUTE_START'::text event_type,rs.started_at event_at,rs.start_latitude latitude,rs.start_longitude longitude,rs.start_accuracy_m accuracy_m,null::uuid visit_id,null::uuid incident_id,null::uuid route_stop_id,null::uuid client_id,null::uuid prospect_id,null::text subject_name,null::integer stop_order,null::text official_region,null::text official_province,null::text official_municipality,'Inicio de ruta'::text event_label,'route_sessions'::text source_type,rs.id source_id
  from public.route_sessions rs join public.employees e on e.id=rs.employee_id where rs.started_at is not null
  union all
  select 'VISIT_START:'||v.id::text,rs.route_plan_id,v.route_session_id,v.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,'VISIT_START',v.started_at,v.start_latitude,v.start_longitude,v.start_accuracy_m,v.id,null::uuid,v.route_stop_id,v.client_id,v.prospect_id,coalesce(c.legal_name,p.legal_name,'Visita'),st.stop_order,st.official_region_at_plan,st.official_province_at_plan,st.official_municipality_at_plan,'Inicio de visita','visits',v.id
  from public.visits v join public.route_sessions rs on rs.id=v.route_session_id join public.employees e on e.id=v.employee_id left join public.route_stops st on st.id=v.route_stop_id left join public.clients c on c.id=v.client_id left join public.prospects p on p.id=v.prospect_id where v.started_at is not null
  union all
  select 'VISIT_END:'||v.id::text,rs.route_plan_id,v.route_session_id,v.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,'VISIT_END',v.ended_at,v.end_latitude,v.end_longitude,v.end_accuracy_m,v.id,null::uuid,v.route_stop_id,v.client_id,v.prospect_id,coalesce(c.legal_name,p.legal_name,'Visita'),st.stop_order,st.official_region_at_plan,st.official_province_at_plan,st.official_municipality_at_plan,'Fin de visita','visits',v.id
  from public.visits v join public.route_sessions rs on rs.id=v.route_session_id join public.employees e on e.id=v.employee_id left join public.route_stops st on st.id=v.route_stop_id left join public.clients c on c.id=v.client_id left join public.prospects p on p.id=v.prospect_id where v.ended_at is not null
  union all
  select 'INCIDENT_START:'||oi.id::text,rs.route_plan_id,oi.route_session_id,oi.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,'INCIDENT_START',oi.started_at,oi.latitude,oi.longitude,oi.accuracy_m,null::uuid,oi.id,null::uuid,null::uuid,null::uuid,oi.incident_type,null::integer,null::text,null::text,null::text,'Inicio de eventualidad','operational_incidents',oi.id
  from public.operational_incidents oi join public.route_sessions rs on rs.id=oi.route_session_id join public.employees e on e.id=oi.employee_id where oi.started_at is not null
  union all
  select 'INCIDENT_END:'||oi.id::text,rs.route_plan_id,oi.route_session_id,oi.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,'INCIDENT_END',oi.ended_at,oi.latitude,oi.longitude,oi.accuracy_m,null::uuid,oi.id,null::uuid,null::uuid,null::uuid,oi.incident_type,null::integer,null::text,null::text,null::text,'Fin de eventualidad','operational_incidents',oi.id
  from public.operational_incidents oi join public.route_sessions rs on rs.id=oi.route_session_id join public.employees e on e.id=oi.employee_id where oi.ended_at is not null
  union all
  select 'ROUTE_END:'||rs.id::text,rs.route_plan_id,rs.id,rs.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,'ROUTE_END',rs.ended_at,rs.end_latitude,rs.end_longitude,rs.end_accuracy_m,null::uuid,null::uuid,null::uuid,null::uuid,null::uuid,null::text,null::integer,null::text,null::text,null::text,'Fin de ruta','route_sessions',rs.id
  from public.route_sessions rs join public.employees e on e.id=rs.employee_id where rs.ended_at is not null and (timezone('America/Santo_Domingo',rs.ended_at))::date=rs.session_date
)
select events.*,(events.latitude is not null and events.longitude is not null) has_gps
from events
where private.current_user_can_view_tracking()
  and (private.is_admin() or events.employee_id=private.current_employee_id());

grant select on public.executive_tracking_events_v1 to authenticated;

create or replace view public.executive_tracking_stops_v1 as
select st.id route_stop_id,st.route_plan_id,rp.route_date,rp.employee_id,e.full_name,e.job_title,e.employee_type,st.stop_order,st.status stop_status,st.priority,st.planned_time,st.expected_duration_min,st.client_id,st.prospect_id,coalesce(c.legal_name,p.legal_name,'Parada') subject_name,coalesce(c.latitude,p.latitude) latitude,coalesce(c.longitude,p.longitude) longitude,st.official_region_at_plan official_region,st.official_province_at_plan official_province,st.official_municipality_at_plan official_municipality,st.reason_not_visited,st.exception_reason_code,st.visit_id
from public.route_stops st join public.route_plans rp on rp.id=st.route_plan_id join public.employees e on e.id=rp.employee_id left join public.clients c on c.id=st.client_id left join public.prospects p on p.id=st.prospect_id
where private.current_user_can_view_tracking()
  and (private.is_admin() or rp.employee_id=private.current_employee_id());

grant select on public.executive_tracking_stops_v1 to authenticated;

create or replace view public.executive_tracking_snapshot_v1 as
select j.route_plan_id,j.route_session_id,j.employee_id,j.full_name,j.job_title,j.employee_type,j.route_date,j.plan_type,j.title,j.derived_status journey_status,
  case when j.derived_status='PENDIENTE_CIERRE' then 'PENDIENTE_CIERRE' when j.ended_at is not null then 'FINALIZADA' when coalesce(j.active_incident_count,0)>0 then 'EVENTUALIDAD' when coalesce(j.open_visit_count,0)>0 then 'EN_VISITA' when j.route_session_id is not null and j.ended_at is null then 'EN_TRASLADO' when j.route_session_id is null and j.route_date<(timezone('America/Santo_Domingo',now()))::date then 'NO_EJECUTADA' else 'PLANIFICADA' end tracking_status,
  j.started_at,j.ended_at,j.planned_clients,j.visited_clients,j.resolved_clients,j.coverage_pct,j.resolution_pct,j.route_window_seconds,j.visit_seconds,j.incident_seconds,j.transit_wait_estimated_seconds,j.estimated_distance_m,j.open_visit_count,j.incident_count,j.active_incident_count,j.official_regions,j.official_provinces,j.official_municipalities,
  le.event_id last_event_id,le.event_type last_event_type,le.event_at last_event_at,le.latitude last_latitude,le.longitude last_longitude,le.accuracy_m last_accuracy_m,le.subject_name last_subject_name,le.stop_order last_stop_order,le.event_label last_event_label,
  case when le.event_at is null then null else greatest(0,floor(extract(epoch from(now()-le.event_at))/60.0))::integer end last_event_age_minutes,
  case when le.event_at is null then 'SIN_REGISTRO' when extract(epoch from(now()-le.event_at))/60.0<=15 then 'RECIENTE' when extract(epoch from(now()-le.event_at))/60.0<=30 then 'ATENCION' else 'ANTIGUO' end freshness_status,
  ns.route_stop_id next_route_stop_id,ns.stop_order next_stop_order,ns.subject_name next_subject_name,ns.latitude next_latitude,ns.longitude next_longitude,ns.official_region next_official_region,ns.official_province next_official_province,ns.official_municipality next_official_municipality
from public.executive_route_journeys_v3 j
left join lateral(select ev.* from public.executive_tracking_events_v1 ev where ev.route_plan_id=j.route_plan_id order by ev.event_at desc nulls last limit 1) le on true
left join lateral(select st.* from public.executive_tracking_stops_v1 st where st.route_plan_id=j.route_plan_id and st.stop_status='PENDIENTE' order by st.stop_order limit 1) ns on true
where private.current_user_can_view_tracking();

grant select on public.executive_tracking_snapshot_v1 to authenticated;

comment on view public.executive_tracking_events_v1 is 'Beta12 permission-guarded scoped operational GPS timeline; cross-day technical closures excluded.';
comment on view public.executive_tracking_stops_v1 is 'Beta12 permission-guarded scoped planned stops.';
comment on view public.executive_tracking_snapshot_v1 is 'Beta12 permission-guarded scoped tracking snapshot.';
