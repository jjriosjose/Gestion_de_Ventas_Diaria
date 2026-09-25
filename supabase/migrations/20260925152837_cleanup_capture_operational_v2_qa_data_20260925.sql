-- Cleanup of QA-only data generated during Captación Operativa V2 validation on 2026-09-25.
-- This migration is intentionally guarded. It aborts unless the exact expected QA journey is found.

do $cleanup$
declare
  v_employee_id uuid;
  v_plan_id uuid;
  v_session_id uuid;
  v_capture_count integer;
  v_visit_count integer;
  v_stop_count integer;
  v_incident_count integer;
  v_prospect_ids uuid[];
begin
  select id into v_employee_id
  from public.employees
  where full_name='Virmania Inoa'
  limit 1;

  if v_employee_id is null then
    raise exception 'QA cleanup aborted: Virmania Inoa not found.';
  end if;

  select rp.id,rs.id
    into v_plan_id,v_session_id
  from public.route_plans rp
  join public.route_sessions rs on rs.route_plan_id=rp.id
  where rp.employee_id=v_employee_id
    and rp.route_date='2026-09-25'::date
    and rp.route_mode='LIBRE'
    and rp.plan_type='VISITAS'
    and rp.title='Jornada libre · 25/09/2026'
    and rs.started_at='2026-09-25 14:03:34.914901+00'::timestamptz;

  if v_plan_id is null or v_session_id is null then
    raise exception 'QA cleanup aborted: expected QA journey not found.';
  end if;

  select count(*)::int,
         array_agg(prospect_id) filter (where prospect_id is not null)
    into v_capture_count,v_prospect_ids
  from public.capture_interactions
  where route_session_id=v_session_id
    and subject_name in ('colmado manolito','test colmado','prueba -3','prueba secuencial');

  select count(*)::int into v_visit_count
  from public.visits v
  join public.clients c on c.id=v.client_id
  where v.route_session_id=v_session_id
    and c.legal_name='TIENDA AMARILLA, SRL';

  select count(*)::int into v_stop_count
  from public.route_stops
  where route_plan_id=v_plan_id;

  select count(*)::int into v_incident_count
  from public.operational_incidents
  where route_session_id=v_session_id;

  if v_capture_count<>4 then
    raise exception 'QA cleanup aborted: expected 4 capture interactions, found %.',v_capture_count;
  end if;

  if v_visit_count<>1 then
    raise exception 'QA cleanup aborted: expected 1 QA visit, found %.',v_visit_count;
  end if;

  if v_stop_count<>0 or v_incident_count<>0 then
    raise exception 'QA cleanup aborted: unexpected route stops/incidents exist.';
  end if;

  if exists (
    select 1 from public.capture_interactions
    where route_session_id=v_session_id
      and subject_name not in ('colmado manolito','test colmado','prueba -3','prueba secuencial')
  ) then
    raise exception 'QA cleanup aborted: non-QA capture found in session.';
  end if;

  if exists (
    select 1 from public.visits v
    left join public.clients c on c.id=v.client_id
    where v.route_session_id=v_session_id
      and coalesce(c.legal_name,'')<>'TIENDA AMARILLA, SRL'
  ) then
    raise exception 'QA cleanup aborted: non-QA visit found in session.';
  end if;

  if v_prospect_ids is not null and (
    exists(select 1 from public.calls where prospect_id=any(v_prospect_ids))
    or exists(select 1 from public.appointments where prospect_id=any(v_prospect_ids))
    or exists(select 1 from public.reception_entries where prospect_id=any(v_prospect_ids))
    or exists(select 1 from public.showroom_sessions where prospect_id=any(v_prospect_ids))
    or exists(select 1 from public.visits where prospect_id=any(v_prospect_ids))
    or exists(select 1 from public.route_stops where prospect_id=any(v_prospect_ids))
  ) then
    raise exception 'QA cleanup aborted: one or more QA prospects have downstream business activity.';
  end if;

  delete from public.geo_verification_events
  where visit_id in (
    select id from public.visits where route_session_id=v_session_id
  );

  delete from public.photos
  where visit_id in (
    select id from public.visits where route_session_id=v_session_id
  )
  or prospect_id=any(v_prospect_ids);

  delete from public.visits
  where route_session_id=v_session_id;

  delete from public.capture_interactions
  where route_session_id=v_session_id;

  delete from public.prospects
  where id=any(v_prospect_ids);

  delete from public.route_sessions
  where id=v_session_id;

  delete from public.route_plans
  where id=v_plan_id;
end;
$cleanup$;
