-- V0.6.5-beta.12.1 · GPS Quality Guard
-- Principle: location quality and distance are auditable signals, never automatic blockers.

alter table public.visits
  add column if not exists start_gps_quality text,
  add column if not exists end_gps_quality text,
  add column if not exists start_location_exception_code text,
  add column if not exists start_location_exception_text text,
  add column if not exists end_location_exception_code text,
  add column if not exists end_location_exception_text text;

create or replace function private.gps_quality_from_accuracy(p_accuracy numeric)
returns text
language sql
immutable
as $$
  select case
    when p_accuracy is null or p_accuracy <= 0 then 'UNKNOWN'
    when p_accuracy <= 50 then 'EXCELLENT'
    when p_accuracy <= 150 then 'GOOD'
    when p_accuracy <= 500 then 'APPROXIMATE'
    when p_accuracy <= 1000 then 'LOW'
    else 'UNRELIABLE'
  end;
$$;

create or replace function private.distance_m(
  p_lat1 double precision,p_lon1 double precision,
  p_lat2 double precision,p_lon2 double precision
)
returns numeric
language sql
immutable
as $$
  select case
    when p_lat1 is null or p_lon1 is null or p_lat2 is null or p_lon2 is null then null
    else round(ST_DistanceSphere(
      ST_SetSRID(ST_MakePoint(p_lon1,p_lat1),4326),
      ST_SetSRID(ST_MakePoint(p_lon2,p_lat2),4326)
    )::numeric,1)
  end;
$$;

create or replace function private.enrich_visit_location_quality()
returns trigger
language plpgsql
security definer
set search_path = public,private,extensions
as $$
declare
  v_target_lat double precision;
  v_target_lon double precision;
  v_start_distance numeric;
  v_end_distance numeric;
begin
  if new.client_id is not null then
    select latitude,longitude into v_target_lat,v_target_lon from public.clients where id=new.client_id;
  elsif new.prospect_id is not null then
    select latitude,longitude into v_target_lat,v_target_lon from public.prospects where id=new.prospect_id;
  end if;

  new.start_gps_quality := private.gps_quality_from_accuracy(new.start_accuracy_m);
  new.end_gps_quality := private.gps_quality_from_accuracy(new.end_accuracy_m);

  v_start_distance := private.distance_m(new.start_latitude,new.start_longitude,v_target_lat,v_target_lon);
  v_end_distance := private.distance_m(new.end_latitude,new.end_longitude,v_target_lat,v_target_lon);
  new.distance_to_target_start_m := v_start_distance;
  new.distance_to_target_end_m := v_end_distance;

  -- Auto-clasificación no bloqueante. Nunca se rechaza la visita por GPS/distancia.
  if new.start_latitude is not null and new.start_longitude is not null then
    if new.start_gps_quality in ('UNRELIABLE','UNKNOWN') then
      if new.start_location_exception_code is null or new.start_location_exception_code in ('GPS_UNRELIABLE','DISTANT_REGISTRATION') then
        new.start_location_exception_code := 'GPS_UNRELIABLE';
        new.start_location_exception_text := 'Coordenada registrada con precisión insuficiente; no usar como evidencia geográfica exacta.';
      end if;
    elsif v_start_distance is not null and v_start_distance > 1000 then
      if new.start_location_exception_code is null or new.start_location_exception_code in ('GPS_UNRELIABLE','DISTANT_REGISTRATION') then
        new.start_location_exception_code := 'DISTANT_REGISTRATION';
        new.start_location_exception_text := 'Registro realizado a más de 1 km del punto maestro; permitido y marcado para revisión.';
      end if;
    elsif new.start_location_exception_code in ('GPS_UNRELIABLE','DISTANT_REGISTRATION') then
      new.start_location_exception_code := null;
      new.start_location_exception_text := null;
    end if;
  end if;

  if new.end_latitude is not null and new.end_longitude is not null then
    if new.end_gps_quality in ('UNRELIABLE','UNKNOWN') then
      if new.end_location_exception_code is null or new.end_location_exception_code in ('GPS_UNRELIABLE','DISTANT_REGISTRATION') then
        new.end_location_exception_code := 'GPS_UNRELIABLE';
        new.end_location_exception_text := 'Coordenada registrada con precisión insuficiente; no usar como evidencia geográfica exacta.';
      end if;
    elsif v_end_distance is not null and v_end_distance > 1000 then
      if new.end_location_exception_code is null or new.end_location_exception_code in ('GPS_UNRELIABLE','DISTANT_REGISTRATION') then
        new.end_location_exception_code := 'DISTANT_REGISTRATION';
        new.end_location_exception_text := 'Registro realizado a más de 1 km del punto maestro; permitido y marcado para revisión.';
      end if;
    elsif new.end_location_exception_code in ('GPS_UNRELIABLE','DISTANT_REGISTRATION') then
      new.end_location_exception_code := null;
      new.end_location_exception_text := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_visits_location_quality on public.visits;
create trigger trg_visits_location_quality
before insert or update of client_id,prospect_id,start_latitude,start_longitude,start_accuracy_m,end_latitude,end_longitude,end_accuracy_m
on public.visits
for each row execute function private.enrich_visit_location_quality();

-- Tracking events: has_gps now means a coordinate suitable for map/playback.
-- raw_has_gps preserves the fact that a coordinate was physically recorded.
create or replace view public.executive_tracking_events_v1 as
with events as (
  select 'ROUTE_START:'||rs.id::text event_id,rs.route_plan_id,rs.id route_session_id,rs.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date route_date,
    'ROUTE_START'::text event_type,rs.started_at event_at,rs.start_latitude latitude,rs.start_longitude longitude,rs.start_accuracy_m accuracy_m,
    null::uuid visit_id,null::uuid incident_id,null::uuid route_stop_id,null::uuid client_id,null::uuid prospect_id,null::text subject_name,null::integer stop_order,
    null::text official_region,null::text official_province,null::text official_municipality,'Inicio de ruta'::text event_label,'route_sessions'::text source_type,rs.id source_id,
    null::numeric distance_to_target_m,null::text location_exception_code,null::text location_exception_text
  from public.route_sessions rs join public.employees e on e.id=rs.employee_id where rs.started_at is not null
  union all
  select 'VISIT_START:'||v.id::text,rs.route_plan_id,v.route_session_id,v.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'VISIT_START',v.started_at,v.start_latitude,v.start_longitude,v.start_accuracy_m,v.id,null::uuid,v.route_stop_id,v.client_id,v.prospect_id,
    coalesce(c.legal_name,p.legal_name,'Visita'),st.stop_order,st.official_region_at_plan,st.official_province_at_plan,st.official_municipality_at_plan,
    'Inicio de visita','visits',v.id,
    coalesce(v.distance_to_target_start_m,private.distance_m(v.start_latitude,v.start_longitude,coalesce(c.latitude,p.latitude),coalesce(c.longitude,p.longitude))),
    coalesce(v.start_location_exception_code,case when private.gps_quality_from_accuracy(v.start_accuracy_m) in ('UNRELIABLE','UNKNOWN') then 'GPS_UNRELIABLE' when private.distance_m(v.start_latitude,v.start_longitude,coalesce(c.latitude,p.latitude),coalesce(c.longitude,p.longitude))>1000 then 'DISTANT_REGISTRATION' end),
    v.start_location_exception_text
  from public.visits v join public.route_sessions rs on rs.id=v.route_session_id join public.employees e on e.id=v.employee_id
    left join public.route_stops st on st.id=v.route_stop_id left join public.clients c on c.id=v.client_id left join public.prospects p on p.id=v.prospect_id
  where v.started_at is not null
  union all
  select 'VISIT_END:'||v.id::text,rs.route_plan_id,v.route_session_id,v.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'VISIT_END',v.ended_at,v.end_latitude,v.end_longitude,v.end_accuracy_m,v.id,null::uuid,v.route_stop_id,v.client_id,v.prospect_id,
    coalesce(c.legal_name,p.legal_name,'Visita'),st.stop_order,st.official_region_at_plan,st.official_province_at_plan,st.official_municipality_at_plan,
    'Fin de visita','visits',v.id,
    coalesce(v.distance_to_target_end_m,private.distance_m(v.end_latitude,v.end_longitude,coalesce(c.latitude,p.latitude),coalesce(c.longitude,p.longitude))),
    coalesce(v.end_location_exception_code,case when private.gps_quality_from_accuracy(v.end_accuracy_m) in ('UNRELIABLE','UNKNOWN') then 'GPS_UNRELIABLE' when private.distance_m(v.end_latitude,v.end_longitude,coalesce(c.latitude,p.latitude),coalesce(c.longitude,p.longitude))>1000 then 'DISTANT_REGISTRATION' end),
    v.end_location_exception_text
  from public.visits v join public.route_sessions rs on rs.id=v.route_session_id join public.employees e on e.id=v.employee_id
    left join public.route_stops st on st.id=v.route_stop_id left join public.clients c on c.id=v.client_id left join public.prospects p on p.id=v.prospect_id
  where v.ended_at is not null
  union all
  select 'INCIDENT_START:'||oi.id::text,rs.route_plan_id,oi.route_session_id,oi.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'INCIDENT_START',oi.started_at,oi.latitude,oi.longitude,oi.accuracy_m,null::uuid,oi.id,null::uuid,null::uuid,null::uuid,oi.incident_type,null::integer,
    null::text,null::text,null::text,'Inicio de eventualidad','operational_incidents',oi.id,null::numeric,null::text,null::text
  from public.operational_incidents oi join public.route_sessions rs on rs.id=oi.route_session_id join public.employees e on e.id=oi.employee_id where oi.started_at is not null
  union all
  select 'INCIDENT_END:'||oi.id::text,rs.route_plan_id,oi.route_session_id,oi.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'INCIDENT_END',oi.ended_at,oi.latitude,oi.longitude,oi.accuracy_m,null::uuid,oi.id,null::uuid,null::uuid,null::uuid,oi.incident_type,null::integer,
    null::text,null::text,null::text,'Fin de eventualidad','operational_incidents',oi.id,null::numeric,null::text,null::text
  from public.operational_incidents oi join public.route_sessions rs on rs.id=oi.route_session_id join public.employees e on e.id=oi.employee_id where oi.ended_at is not null
  union all
  select 'ROUTE_END:'||rs.id::text,rs.route_plan_id,rs.id,rs.employee_id,e.full_name,e.job_title,e.employee_type,rs.session_date,
    'ROUTE_END',rs.ended_at,rs.end_latitude,rs.end_longitude,rs.end_accuracy_m,null::uuid,null::uuid,null::uuid,null::uuid,null::uuid,null::text,null::integer,
    null::text,null::text,null::text,'Fin de ruta','route_sessions',rs.id,null::numeric,null::text,null::text
  from public.route_sessions rs join public.employees e on e.id=rs.employee_id
  where rs.ended_at is not null and timezone('America/Santo_Domingo',rs.ended_at)::date=rs.session_date
)
select
  events.event_id,events.route_plan_id,events.route_session_id,events.employee_id,events.full_name,events.job_title,events.employee_type,events.route_date,
  events.event_type,events.event_at,events.latitude,events.longitude,events.accuracy_m,events.visit_id,events.incident_id,events.route_stop_id,events.client_id,
  events.prospect_id,events.subject_name,events.stop_order,events.official_region,events.official_province,events.official_municipality,events.event_label,events.source_type,
  events.source_id,
  (events.latitude is not null and events.longitude is not null and events.accuracy_m is not null and events.accuracy_m>0 and events.accuracy_m<=1000) as has_gps,
  (events.latitude is not null and events.longitude is not null) as raw_has_gps,
  private.gps_quality_from_accuracy(events.accuracy_m) as gps_quality,
  events.distance_to_target_m,events.location_exception_code,events.location_exception_text
from events
where private.current_user_can_view_tracking() and (private.is_admin() or events.employee_id=private.current_employee_id());

grant select on public.executive_tracking_events_v1 to authenticated;

create or replace view public.executive_tracking_snapshot_v1 as
select
  j.route_plan_id,j.route_session_id,j.employee_id,j.full_name,j.job_title,j.employee_type,j.route_date,j.plan_type,j.title,j.derived_status as journey_status,
  case when j.derived_status='PENDIENTE_CIERRE' then 'PENDIENTE_CIERRE' when j.ended_at is not null then 'FINALIZADA'
       when coalesce(j.active_incident_count,0)>0 then 'EVENTUALIDAD' when coalesce(j.open_visit_count,0)>0 then 'EN_VISITA'
       when j.route_session_id is not null and j.ended_at is null then 'EN_TRASLADO'
       when j.route_session_id is null and j.route_date<timezone('America/Santo_Domingo',now())::date then 'NO_EJECUTADA' else 'PLANIFICADA' end as tracking_status,
  j.started_at,j.ended_at,j.planned_clients,j.visited_clients,j.resolved_clients,j.coverage_pct,j.resolution_pct,j.route_window_seconds,j.visit_seconds,
  j.incident_seconds,j.transit_wait_estimated_seconds,j.estimated_distance_m,j.open_visit_count,j.incident_count,j.active_incident_count,
  j.official_regions,j.official_provinces,j.official_municipalities,
  le.event_id as last_event_id,le.event_type as last_event_type,le.event_at as last_event_at,
  case when le.has_gps then le.latitude end as last_latitude,
  case when le.has_gps then le.longitude end as last_longitude,
  le.accuracy_m as last_accuracy_m,le.subject_name as last_subject_name,le.stop_order as last_stop_order,
  case
    when le.raw_has_gps and not le.has_gps then le.event_label||' · GPS no confiable (±'||case when le.accuracy_m>=1000 then round(le.accuracy_m/1000.0,1)::text||' km' else round(le.accuracy_m)::text||' m' end||')'
    when le.location_exception_code='DISTANT_REGISTRATION' and le.distance_to_target_m is not null then le.event_label||' · registro distante ('||round(le.distance_to_target_m/1000.0,1)::text||' km)'
    else le.event_label end as last_event_label,
  case when le.event_at is null then null else greatest(0,floor(extract(epoch from (now()-le.event_at))/60.0))::integer end as last_event_age_minutes,
  case when le.event_at is null then 'SIN_REGISTRO' when extract(epoch from (now()-le.event_at))/60.0<=15 then 'RECIENTE'
       when extract(epoch from (now()-le.event_at))/60.0<=30 then 'ATENCION' else 'ANTIGUO' end as freshness_status,
  ns.route_stop_id as next_route_stop_id,ns.stop_order as next_stop_order,ns.subject_name as next_subject_name,ns.latitude as next_latitude,ns.longitude as next_longitude,
  ns.official_region as next_official_region,ns.official_province as next_official_province,ns.official_municipality as next_official_municipality,
  le.gps_quality as last_gps_quality,le.has_gps as last_gps_reliable,le.raw_has_gps as last_raw_has_gps,le.distance_to_target_m as last_distance_to_target_m,
  le.location_exception_code as last_location_exception_code,le.location_exception_text as last_location_exception_text
from public.executive_route_journeys_v3 j
left join lateral (
  select ev.* from public.executive_tracking_events_v1 ev where ev.route_plan_id=j.route_plan_id order by ev.event_at desc nulls last limit 1
) le on true
left join lateral (
  select st.* from public.executive_tracking_stops_v1 st where st.route_plan_id=j.route_plan_id and st.stop_status='PENDIENTE' order by st.stop_order asc limit 1
) ns on true
where private.current_user_can_view_tracking();

grant select on public.executive_tracking_snapshot_v1 to authenticated;

comment on function private.gps_quality_from_accuracy(numeric) is 'Classifies GPS precision for operational auditing. Does not authorize blocking business operations.';
comment on view public.executive_tracking_events_v1 is 'Beta12.1 tracking timeline. has_gps means map/playback-quality coordinate (<=1000m accuracy); raw_has_gps preserves recorded coordinates.';
comment on view public.executive_tracking_snapshot_v1 is 'Beta12.1 tracking snapshot. Unreliable latest coordinates are not exposed as precise map positions; operational state remains visible.';
