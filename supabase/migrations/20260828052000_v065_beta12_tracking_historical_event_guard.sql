-- Beta12 tracking guard: a technical/admin route close performed on a later day
-- must not be interpreted as physical movement on the original operational day.

create or replace view public.executive_tracking_events_v1 as
with events as (
  select 'ROUTE_START:' || rs.id::text as event_id, rs.route_plan_id, rs.id as route_session_id, rs.employee_id,
    e.full_name,e.job_title,e.employee_type,rs.session_date as route_date,'ROUTE_START'::text as event_type,rs.started_at as event_at,
    rs.start_latitude as latitude,rs.start_longitude as longitude,rs.start_accuracy_m as accuracy_m,
    null::uuid as visit_id,null::uuid as incident_id,null::uuid as route_stop_id,null::uuid as client_id,null::uuid as prospect_id,
    null::text as subject_name,null::integer as stop_order,null::text as official_region,null::text as official_province,null::text as official_municipality,
    'Inicio de ruta'::text as event_label,'route_sessions'::text as source_type,rs.id as source_id
  from public.route_sessions rs join public.employees e on e.id=rs.employee_id where rs.started_at is not null

  union all

  select 'VISIT_START:' || v.id::text,rs.route_plan_id,v.route_session_id,v.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'VISIT_START',v.started_at,v.start_latitude,v.start_longitude,v.start_accuracy_m,v.id,null::uuid,v.route_stop_id,v.client_id,v.prospect_id,
    coalesce(c.legal_name,p.legal_name,'Visita'),st.stop_order,st.official_region_at_plan,st.official_province_at_plan,st.official_municipality_at_plan,
    'Inicio de visita','visits',v.id
  from public.visits v join public.route_sessions rs on rs.id=v.route_session_id join public.employees e on e.id=v.employee_id
  left join public.route_stops st on st.id=v.route_stop_id left join public.clients c on c.id=v.client_id left join public.prospects p on p.id=v.prospect_id
  where v.started_at is not null

  union all

  select 'VISIT_END:' || v.id::text,rs.route_plan_id,v.route_session_id,v.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'VISIT_END',v.ended_at,v.end_latitude,v.end_longitude,v.end_accuracy_m,v.id,null::uuid,v.route_stop_id,v.client_id,v.prospect_id,
    coalesce(c.legal_name,p.legal_name,'Visita'),st.stop_order,st.official_region_at_plan,st.official_province_at_plan,st.official_municipality_at_plan,
    'Fin de visita','visits',v.id
  from public.visits v join public.route_sessions rs on rs.id=v.route_session_id join public.employees e on e.id=v.employee_id
  left join public.route_stops st on st.id=v.route_stop_id left join public.clients c on c.id=v.client_id left join public.prospects p on p.id=v.prospect_id
  where v.ended_at is not null

  union all

  select 'INCIDENT_START:' || oi.id::text,rs.route_plan_id,oi.route_session_id,oi.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'INCIDENT_START',oi.started_at,oi.latitude,oi.longitude,oi.accuracy_m,null::uuid,oi.id,null::uuid,null::uuid,null::uuid,oi.incident_type,
    null::integer,null::text,null::text,null::text,'Inicio de eventualidad','operational_incidents',oi.id
  from public.operational_incidents oi join public.route_sessions rs on rs.id=oi.route_session_id join public.employees e on e.id=oi.employee_id
  where oi.started_at is not null

  union all

  select 'INCIDENT_END:' || oi.id::text,rs.route_plan_id,oi.route_session_id,oi.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'INCIDENT_END',oi.ended_at,oi.latitude,oi.longitude,oi.accuracy_m,null::uuid,oi.id,null::uuid,null::uuid,null::uuid,oi.incident_type,
    null::integer,null::text,null::text,null::text,'Fin de eventualidad','operational_incidents',oi.id
  from public.operational_incidents oi join public.route_sessions rs on rs.id=oi.route_session_id join public.employees e on e.id=oi.employee_id
  where oi.ended_at is not null

  union all

  select 'ROUTE_END:' || rs.id::text,rs.route_plan_id,rs.id,rs.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'ROUTE_END',rs.ended_at,rs.end_latitude,rs.end_longitude,rs.end_accuracy_m,null::uuid,null::uuid,null::uuid,null::uuid,null::uuid,null::text,
    null::integer,null::text,null::text,null::text,'Fin de ruta','route_sessions',rs.id
  from public.route_sessions rs join public.employees e on e.id=rs.employee_id
  where rs.ended_at is not null
    and (timezone('America/Santo_Domingo',rs.ended_at))::date = rs.session_date
)
select events.*,(events.latitude is not null and events.longitude is not null) as has_gps
from events
where private.is_admin() or events.employee_id=private.current_employee_id();

grant select on public.executive_tracking_events_v1 to authenticated;

comment on view public.executive_tracking_events_v1 is 'Beta12 scoped operational GPS timeline. Cross-day technical route closures are excluded from movement playback.';
