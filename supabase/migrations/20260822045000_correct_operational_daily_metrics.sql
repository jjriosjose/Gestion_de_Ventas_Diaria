create or replace view public.daily_employee_summary
with (security_invoker=true)
as
with planned as (
  select rp.employee_id,
         rp.route_date as day,
         count(rs.id) as planned_clients,
         count(rs.id) filter (where rs.status in ('VISITADO','NO_VISITADO','REPROGRAMADO','CANCELADO')) as resolved_clients
  from public.route_plans rp
  left join public.route_stops rs on rs.route_plan_id=rp.id
  where rp.plan_type in ('VISITAS','MIXTA')
  group by rp.employee_id,rp.route_date
), visited as (
  select v.employee_id,
         (v.started_at at time zone 'America/Santo_Domingo')::date as day,
         count(*) as visits,
         count(*) filter (where coalesce(v.received,false)) as received_clients,
         count(*) filter (where lower(coalesce(v.purchase_result,'')) in ('compro','compró','compra','si','sí','yes')) as purchase_clients
  from public.visits v
  where v.ended_at is not null
  group by v.employee_id,(v.started_at at time zone 'America/Santo_Domingo')::date
), call_stats as (
  select c.employee_id,
         (c.occurred_at at time zone 'America/Santo_Domingo')::date as day,
         count(*) as calls
  from public.calls c
  group by c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date
), appt as (
  select a.employee_id,
         (a.appointment_at at time zone 'America/Santo_Domingo')::date as day,
         count(*) as appointments,
         count(*) filter (where a.status='ASISTIO') as showroom_attended
  from public.appointments a
  where a.appointment_at is not null
    and a.status in ('PROGRAMADA','CONFIRMADA','REPROGRAMADA','ASISTIO','NO_ASISTIO','FINALIZADA')
  group by a.employee_id,(a.appointment_at at time zone 'America/Santo_Domingo')::date
), pros as (
  select p.captured_by_employee_id as employee_id,
         (p.captured_at at time zone 'America/Santo_Domingo')::date as day,
         count(*) as prospects_captured,
         count(*) filter (where p.status in ('INTERESADO','CITA_PROGRAMADA','EN_NEGOCIACION','CONVERTIDO')) as qualified_prospects
  from public.prospects p
  where p.captured_by_employee_id is not null
  group by p.captured_by_employee_id,(p.captured_at at time zone 'America/Santo_Domingo')::date
), routes as (
  select r.employee_id,r.session_date as day,
         count(*) as routes_started,
         count(*) filter (where r.status='FINALIZADA') as routes_completed
  from public.route_sessions r
  group by r.employee_id,r.session_date
), keys as (
  select employee_id,day from planned
  union select employee_id,day from visited
  union select employee_id,day from call_stats
  union select employee_id,day from appt
  union select employee_id,day from pros
  union select employee_id,day from routes
)
select k.day,
       e.id as employee_id,
       e.full_name,
       e.username,
       e.job_title,
       e.employee_type,
       coalesce(p.planned_clients,0)::integer as planned_clients,
       coalesce(v.visits,0)::integer as visited_clients,
       coalesce(v.received_clients,0)::integer as received_clients,
       coalesce(v.purchase_clients,0)::integer as purchase_clients,
       coalesce(c.calls,0)::integer as calls,
       coalesce(a.appointments,0)::integer as appointments,
       coalesce(a.showroom_attended,0)::integer as showroom_attended,
       coalesce(pr.prospects_captured,0)::integer as prospects_captured,
       coalesce(pr.qualified_prospects,0)::integer as qualified_prospects,
       coalesce(r.routes_started,0)::integer as routes_started,
       coalesce(r.routes_completed,0)::integer as routes_completed,
       case when coalesce(p.planned_clients,0)>0 then round(100.0*coalesce(p.resolved_clients,0)::numeric/p.planned_clients::numeric,1) else null end as route_compliance_pct,
       case when coalesce(v.visits,0)>0 then round(100.0*coalesce(v.received_clients,0)::numeric/v.visits::numeric,1) else null end as reception_pct,
       case when coalesce(v.received_clients,0)>0 then round(100.0*coalesce(v.purchase_clients,0)::numeric/v.received_clients::numeric,1) else null end as purchase_conversion_pct
from keys k
join public.employees e on e.id=k.employee_id
left join planned p on p.employee_id=k.employee_id and p.day=k.day
left join visited v on v.employee_id=k.employee_id and v.day=k.day
left join call_stats c on c.employee_id=k.employee_id and c.day=k.day
left join appt a on a.employee_id=k.employee_id and a.day=k.day
left join pros pr on pr.employee_id=k.employee_id and pr.day=k.day
left join routes r on r.employee_id=k.employee_id and r.day=k.day;

create or replace view public.daily_global_summary
with (security_invoker=true)
as
select day,
       sum(planned_clients)::integer as planned_clients,
       sum(visited_clients)::integer as visited_clients,
       sum(received_clients)::integer as received_clients,
       sum(purchase_clients)::integer as purchase_clients,
       sum(calls)::integer as calls,
       sum(appointments)::integer as appointments,
       sum(showroom_attended)::integer as showroom_attended,
       sum(prospects_captured)::integer as prospects_captured,
       sum(qualified_prospects)::integer as qualified_prospects,
       sum(routes_started)::integer as routes_started,
       sum(routes_completed)::integer as routes_completed,
       case when sum(planned_clients)>0 then round(100.0*sum(case when planned_clients>0 then route_compliance_pct*planned_clients/100.0 else 0 end)::numeric/sum(planned_clients)::numeric,1) else null end as route_compliance_pct,
       case when sum(visited_clients)>0 then round(100.0*sum(received_clients)::numeric/sum(visited_clients)::numeric,1) else null end as reception_pct,
       case when sum(received_clients)>0 then round(100.0*sum(purchase_clients)::numeric/sum(received_clients)::numeric,1) else null end as purchase_conversion_pct
from public.daily_employee_summary
group by day;

grant select on public.daily_employee_summary, public.daily_global_summary to authenticated;
