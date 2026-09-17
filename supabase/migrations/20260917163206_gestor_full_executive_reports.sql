create or replace view public.executive_route_journeys_v2
with (security_invoker=true)
as
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
  j.plan_status,
  j.session_status,
  j.started_at,
  j.ended_at,
  j.closure_mode,
  j.closure_reason_code,
  j.closure_reason_text,
  j.closed_pending_count,
  j.derived_status,
  j.planned_clients,
  j.visited_clients,
  j.in_visit_clients,
  j.pending_clients,
  j.not_visited_clients,
  j.reprogrammed_clients,
  j.cancelled_clients,
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
  j.regions,
  j.provinces,
  j.municipalities,
  j.client_types,
  j.official_area_id,
  j.official_area_name,
  j.official_area_level,
  coalesce(t.official_regions,array[]::text[]) as official_regions,
  coalesce(t.official_provinces,array[]::text[]) as official_provinces,
  coalesce(t.official_municipalities,array[]::text[]) as official_municipalities
from public.executive_route_journeys j
left join public.executive_route_journey_territories t on t.route_plan_id=j.route_plan_id
where private.is_admin()
   or exists (
      select 1 from public.employees ce
      where ce.id=private.current_employee_id()
        and ce.active=true
        and ce.employee_type='Gestor'
   )
   or j.employee_id=private.current_employee_id();

create or replace view public.executive_crm_daily_v1
with (security_invoker=true)
as
with activity_days as (
  select c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date as activity_date from public.calls c
  union
  select a.employee_id,(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at) at time zone 'America/Santo_Domingo')::date from public.appointments a
  union
  select s.manager_employee_id,(s.started_at at time zone 'America/Santo_Domingo')::date from public.showroom_sessions s
  union
  select f.assigned_employee_id,(f.due_at at time zone 'America/Santo_Domingo')::date from public.follow_ups f where f.assigned_employee_id is not null
), calls_daily as (
  select c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date as activity_date,
    count(*)::integer as calls,
    count(*) filter (where c.result=any(array['CONTACTADO','SEGUIMIENTO','INTERESADO_SHOWROOM','COMPRO','NO_COMPRO','NO_INTERESADO']))::integer as calls_contacted,
    count(*) filter (where c.result='NO_CONTESTA')::integer as calls_no_answer,
    count(*) filter (where c.result='OCUPADO')::integer as calls_busy,
    count(*) filter (where c.result='TELEFONO_INCORRECTO')::integer as calls_invalid_phone,
    count(*) filter (where c.result='LLAMAR_MAS_TARDE')::integer as calls_later,
    count(*) filter (where c.appointment_created=true)::integer as appointments_generated,
    coalesce(sum(c.duration_seconds),0::bigint) as call_seconds,
    min(c.occurred_at) as first_call_at,max(c.occurred_at) as last_call_at
  from public.calls c
  group by c.employee_id,((c.occurred_at at time zone 'America/Santo_Domingo')::date)
), appointments_daily as (
  select a.employee_id,(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at) at time zone 'America/Santo_Domingo')::date as activity_date,
    count(*)::integer as appointments_total,
    count(*) filter (where a.status='PENDIENTE_VALIDACION')::integer as appointments_pending_validation,
    count(*) filter (where a.status=any(array['PROGRAMADA','CONFIRMADA']))::integer as appointments_scheduled,
    count(*) filter (where a.status='CONFIRMADA')::integer as appointments_confirmed,
    count(*) filter (where a.status=any(array['ASISTIO','FINALIZADA']) or a.attended_at is not null)::integer as appointments_attended,
    count(*) filter (where a.status='NO_ASISTIO')::integer as appointments_no_show,
    count(*) filter (where a.status='REPROGRAMADA')::integer as appointments_reprogrammed,
    min(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at)) as first_appointment_at,
    max(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at)) as last_appointment_at
  from public.appointments a
  group by a.employee_id,((coalesce(a.appointment_at,a.requested_appointment_at,a.created_at) at time zone 'America/Santo_Domingo')::date)
), showroom_daily as (
  select s.manager_employee_id as employee_id,(s.started_at at time zone 'America/Santo_Domingo')::date as activity_date,
    count(*)::integer as showroom_sessions,
    count(*) filter (where s.ended_at is not null)::integer as showroom_completed,
    count(*) filter (where s.purchased=true or s.outcome='COMPRA')::integer as showroom_purchases,
    coalesce(sum(s.purchase_amount) filter (where s.purchased=true or s.outcome='COMPRA'),0::numeric) as showroom_sales_amount,
    coalesce(sum(extract(epoch from coalesce(s.ended_at,least(now(),(((s.started_at at time zone 'America/Santo_Domingo')::date+1)::timestamp without time zone at time zone 'America/Santo_Domingo')))-s.started_at)),0::numeric)::bigint as showroom_seconds,
    min(s.started_at) as first_showroom_at,max(coalesce(s.ended_at,s.started_at)) as last_showroom_at
  from public.showroom_sessions s
  group by s.manager_employee_id,((s.started_at at time zone 'America/Santo_Domingo')::date)
), followups_daily as (
  select f.assigned_employee_id as employee_id,(f.due_at at time zone 'America/Santo_Domingo')::date as activity_date,
    count(*)::integer as followups_total,
    count(*) filter (where f.status='COMPLETADO')::integer as followups_completed,
    count(*) filter (where f.status='CANCELADO')::integer as followups_cancelled,
    count(*) filter (where f.status<>all(array['COMPLETADO','CANCELADO']))::integer as followups_pending,
    count(*) filter (where f.status<>all(array['COMPLETADO','CANCELADO']) and f.due_at<now())::integer as followups_overdue,
    count(*) filter (where f.status<>all(array['COMPLETADO','CANCELADO']) and (f.due_at at time zone 'America/Santo_Domingo')::date=(now() at time zone 'America/Santo_Domingo')::date)::integer as followups_due_today
  from public.follow_ups f
  where f.assigned_employee_id is not null
  group by f.assigned_employee_id,((f.due_at at time zone 'America/Santo_Domingo')::date)
)
select
  ad.employee_id,e.full_name,e.job_title,e.employee_type,ad.activity_date as day,
  coalesce(cd.calls,0) as calls,coalesce(cd.calls_contacted,0) as calls_contacted,coalesce(cd.calls_no_answer,0) as calls_no_answer,
  coalesce(cd.calls_busy,0) as calls_busy,coalesce(cd.calls_invalid_phone,0) as calls_invalid_phone,coalesce(cd.calls_later,0) as calls_later,
  coalesce(cd.appointments_generated,0) as appointments_generated,coalesce(cd.call_seconds,0::bigint) as call_seconds,
  coalesce(ap.appointments_total,0) as appointments_total,coalesce(ap.appointments_pending_validation,0) as appointments_pending_validation,
  coalesce(ap.appointments_scheduled,0) as appointments_scheduled,coalesce(ap.appointments_confirmed,0) as appointments_confirmed,
  coalesce(ap.appointments_attended,0) as appointments_attended,coalesce(ap.appointments_no_show,0) as appointments_no_show,
  coalesce(ap.appointments_reprogrammed,0) as appointments_reprogrammed,coalesce(sd.showroom_sessions,0) as showroom_sessions,
  coalesce(sd.showroom_completed,0) as showroom_completed,coalesce(sd.showroom_purchases,0) as showroom_purchases,
  coalesce(sd.showroom_sales_amount,0::numeric) as showroom_sales_amount,coalesce(sd.showroom_seconds,0::bigint) as showroom_seconds,
  coalesce(fd.followups_total,0) as followups_total,coalesce(fd.followups_completed,0) as followups_completed,
  coalesce(fd.followups_cancelled,0) as followups_cancelled,coalesce(fd.followups_pending,0) as followups_pending,
  coalesce(fd.followups_overdue,0) as followups_overdue,coalesce(fd.followups_due_today,0) as followups_due_today,
  least(cd.first_call_at,ap.first_appointment_at,sd.first_showroom_at) as first_activity_at,
  greatest(cd.last_call_at,ap.last_appointment_at,sd.last_showroom_at) as last_activity_at,
  case when least(cd.first_call_at,ap.first_appointment_at,sd.first_showroom_at) is null or greatest(cd.last_call_at,ap.last_appointment_at,sd.last_showroom_at) is null then 0::bigint
       else greatest(0::numeric,extract(epoch from greatest(cd.last_call_at,ap.last_appointment_at,sd.last_showroom_at)-least(cd.first_call_at,ap.first_appointment_at,sd.first_showroom_at)))::bigint end as activity_window_seconds,
  coalesce(cd.call_seconds,0::bigint)+coalesce(sd.showroom_seconds,0::bigint) as management_seconds
from activity_days ad
join public.employees e on e.id=ad.employee_id and e.active=true
left join calls_daily cd on cd.employee_id=ad.employee_id and cd.activity_date=ad.activity_date
left join appointments_daily ap on ap.employee_id=ad.employee_id and ap.activity_date=ad.activity_date
left join showroom_daily sd on sd.employee_id=ad.employee_id and sd.activity_date=ad.activity_date
left join followups_daily fd on fd.employee_id=ad.employee_id and fd.activity_date=ad.activity_date
where e.employee_type='Gestor'
  and (
    private.is_admin()
    or exists (
      select 1 from public.employees ce
      where ce.id=private.current_employee_id()
        and ce.active=true
        and ce.employee_type='Gestor'
    )
    or ad.employee_id=private.current_employee_id()
  );
