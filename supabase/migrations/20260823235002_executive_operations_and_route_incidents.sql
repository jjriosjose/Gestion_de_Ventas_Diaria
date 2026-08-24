alter table public.showroom_sessions add column if not exists attended_by_employee_id uuid references public.employees(id) on delete set null;
alter table public.visits add column if not exists purchase_amount numeric(14,2);
alter table public.photos add column if not exists operational_incident_id uuid;
update public.showroom_sessions set attended_by_employee_id=manager_employee_id where attended_by_employee_id is null;
create index if not exists showroom_sessions_attended_by_employee_idx on public.showroom_sessions(attended_by_employee_id,started_at);

create table if not exists public.operational_incidents(
 id uuid primary key default gen_random_uuid(), route_session_id uuid references public.route_sessions(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade, incident_type text not null,
 started_at timestamptz not null default now(), ended_at timestamptz, latitude double precision, longitude double precision, accuracy_m numeric,
 description text, impact text not null default 'RETRASO', status text not null default 'ACTIVA', review_status text not null default 'REGISTRADA',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), created_by uuid references public.employees(id) on delete set null, updated_by uuid references public.employees(id) on delete set null,
 constraint operational_incidents_time_check check(ended_at is null or ended_at>=started_at),
 constraint operational_incidents_impact_check check(impact in('SIN_IMPACTO','RETRASO','SUSPENDE_RUTA','FINALIZA_JORNADA')),
 constraint operational_incidents_status_check check(status in('ACTIVA','FINALIZADA','CANCELADA')),
 constraint operational_incidents_review_check check(review_status in('REGISTRADA','REVISADA','JUSTIFICADA','REQUIERE_REVISION'))
);
create index if not exists operational_incidents_employee_day_idx on public.operational_incidents(employee_id,started_at desc);
create index if not exists operational_incidents_route_idx on public.operational_incidents(route_session_id);
alter table public.photos drop constraint if exists photos_operational_incident_id_fkey;
alter table public.photos add constraint photos_operational_incident_id_fkey foreign key(operational_incident_id) references public.operational_incidents(id) on delete set null;
create index if not exists photos_operational_incident_idx on public.photos(operational_incident_id) where operational_incident_id is not null;
alter table public.operational_incidents enable row level security;
drop policy if exists operational_incidents_read on public.operational_incidents;
drop policy if exists operational_incidents_insert on public.operational_incidents;
drop policy if exists operational_incidents_update on public.operational_incidents;
drop policy if exists operational_incidents_delete on public.operational_incidents;
create policy operational_incidents_read on public.operational_incidents for select to authenticated using(true);
create policy operational_incidents_insert on public.operational_incidents for insert to authenticated with check(private.can_manage_employee(employee_id));
create policy operational_incidents_update on public.operational_incidents for update to authenticated using(private.can_manage_employee(employee_id)) with check(private.can_manage_employee(employee_id));
create policy operational_incidents_delete on public.operational_incidents for delete to authenticated using(private.is_admin());
grant select,insert,update,delete on public.operational_incidents to authenticated;

create or replace view public.executive_daily_employee_summary with(security_invoker=true) as
with planned as(
 select rp.employee_id,rp.route_date as day,count(rs.id)::int planned_clients,count(rs.id) filter(where rs.status in('VISITADO','NO_VISITADO','REPROGRAMADO','CANCELADO'))::int resolved_clients
 from public.route_plans rp left join public.route_stops rs on rs.route_plan_id=rp.id where rp.plan_type in('VISITAS','MIXTA') group by rp.employee_id,rp.route_date
), routes as(
 select employee_id,session_date as day,count(*)::int routes_started,count(*) filter(where status='FINALIZADA')::int routes_completed,min(started_at) route_first_at,max(coalesce(ended_at,started_at)) route_last_at,sum(extract(epoch from(coalesce(ended_at,now())-started_at)))::bigint route_window_seconds
 from public.route_sessions group by employee_id,session_date
), visited as(
 select employee_id,(started_at at time zone 'America/Santo_Domingo')::date as day,count(*)::int visited_clients,count(*) filter(where coalesce(received,false))::int received_clients,
 count(*) filter(where lower(coalesce(purchase_result,'')) in('compro','compró','compra','si','sí','yes'))::int visit_purchase_clients,
 coalesce(sum(purchase_amount) filter(where lower(coalesce(purchase_result,'')) in('compro','compró','compra','si','sí','yes')),0)::numeric(14,2) visit_sales_amount,
 coalesce(sum(extract(epoch from(ended_at-started_at))) filter(where ended_at is not null),0)::bigint visit_seconds,min(started_at) visit_first_at,max(coalesce(ended_at,started_at)) visit_last_at
 from public.visits group by employee_id,(started_at at time zone 'America/Santo_Domingo')::date
), call_stats as(
 select employee_id,(occurred_at at time zone 'America/Santo_Domingo')::date as day,count(*)::int calls,
 count(*) filter(where result not in('NO_CONTESTA','OCUPADO','TELEFONO_INCORRECTO'))::int calls_contacted,
 count(*) filter(where result='NO_CONTESTA')::int calls_no_answer,count(*) filter(where result='OCUPADO')::int calls_busy,count(*) filter(where result='TELEFONO_INCORRECTO')::int calls_wrong_phone,
 sum(coalesce(duration_seconds,case result when 'NO_CONTESTA' then 90 when 'OCUPADO' then 45 when 'TELEFONO_INCORRECTO' then 60 else 300 end))::bigint call_estimated_seconds,
 min(occurred_at-make_interval(secs=>coalesce(duration_seconds,case result when 'NO_CONTESTA' then 90 when 'OCUPADO' then 45 when 'TELEFONO_INCORRECTO' then 60 else 300 end))) call_first_at,max(occurred_at) call_last_at
 from public.calls group by employee_id,(occurred_at at time zone 'America/Santo_Domingo')::date
), appt as(
 select coalesce(assigned_manager_id,employee_id) employee_id,(coalesce(appointment_at,attended_at,created_at) at time zone 'America/Santo_Domingo')::date as day,
 count(*) filter(where status in('PROGRAMADA','CONFIRMADA','REPROGRAMADA','ASISTIO','FINALIZADA'))::int appointments,
 count(*) filter(where status in('ASISTIO','FINALIZADA') or attended_at is not null)::int showroom_arrivals
 from public.appointments group by coalesce(assigned_manager_id,employee_id),(coalesce(appointment_at,attended_at,created_at) at time zone 'America/Santo_Domingo')::date
), showroom as(
 select coalesce(attended_by_employee_id,manager_employee_id) employee_id,(started_at at time zone 'America/Santo_Domingo')::date as day,count(*)::int showroom_attended,
 count(*) filter(where purchased is true)::int showroom_purchase_clients,coalesce(sum(purchase_amount) filter(where purchased is true),0)::numeric(14,2) showroom_sales_amount,
 coalesce(sum(extract(epoch from(ended_at-started_at))) filter(where ended_at is not null),0)::bigint showroom_seconds,min(started_at) showroom_first_at,max(coalesce(ended_at,started_at)) showroom_last_at
 from public.showroom_sessions group by coalesce(attended_by_employee_id,manager_employee_id),(started_at at time zone 'America/Santo_Domingo')::date
), pros as(
 select captured_by_employee_id employee_id,(captured_at at time zone 'America/Santo_Domingo')::date as day,count(*)::int prospects_captured,min(captured_at) prospect_first_at,max(captured_at) prospect_last_at
 from public.prospects where captured_by_employee_id is not null group by captured_by_employee_id,(captured_at at time zone 'America/Santo_Domingo')::date
), inc as(
 select employee_id,(started_at at time zone 'America/Santo_Domingo')::date as day,count(*) filter(where status<>'CANCELADA')::int incidents,
 coalesce(sum(extract(epoch from(coalesce(ended_at,now())-started_at))) filter(where status<>'CANCELADA'),0)::bigint incident_seconds,
 min(started_at) filter(where status<>'CANCELADA') incident_first_at,max(coalesce(ended_at,started_at)) filter(where status<>'CANCELADA') incident_last_at
 from public.operational_incidents group by employee_id,(started_at at time zone 'America/Santo_Domingo')::date
), keys as(
 select employee_id,day from planned union select employee_id,day from routes union select employee_id,day from visited union select employee_id,day from call_stats union select employee_id,day from appt union select employee_id,day from showroom union select employee_id,day from pros union select employee_id,day from inc
), base as(
 select k.day,e.id employee_id,e.full_name,e.username,e.job_title,e.employee_type,coalesce(p.planned_clients,0) planned_clients,coalesce(v.visited_clients,0) visited_clients,coalesce(v.received_clients,0) received_clients,
 coalesce(v.visit_purchase_clients,0) visit_purchase_clients,coalesce(s.showroom_purchase_clients,0) showroom_purchase_clients,coalesce(v.visit_purchase_clients,0)+coalesce(s.showroom_purchase_clients,0) purchase_clients,
 coalesce(v.visit_sales_amount,0) visit_sales_amount,coalesce(s.showroom_sales_amount,0) showroom_sales_amount,coalesce(v.visit_sales_amount,0)+coalesce(s.showroom_sales_amount,0) sales_amount,
 coalesce(c.calls,0) calls,coalesce(c.calls_contacted,0) calls_contacted,coalesce(c.calls_no_answer,0) calls_no_answer,coalesce(c.calls_busy,0) calls_busy,coalesce(c.calls_wrong_phone,0) calls_wrong_phone,
 coalesce(a.appointments,0) appointments,greatest(coalesce(s.showroom_attended,0),coalesce(a.showroom_arrivals,0)) showroom_attended,coalesce(pr.prospects_captured,0) prospects_captured,
 coalesce(r.routes_started,0) routes_started,coalesce(r.routes_completed,0) routes_completed,coalesce(v.visit_seconds,0) visit_seconds,coalesce(c.call_estimated_seconds,0) call_estimated_seconds,
 coalesce(s.showroom_seconds,0) showroom_seconds,coalesce(i.incidents,0) incidents,coalesce(i.incident_seconds,0) incident_seconds,coalesce(r.route_window_seconds,0) route_window_seconds,
 greatest(coalesce(r.route_window_seconds,0)-coalesce(v.visit_seconds,0)-coalesce(i.incident_seconds,0),0)::bigint transit_wait_estimated_seconds,
 least(r.route_first_at,v.visit_first_at,c.call_first_at,s.showroom_first_at,pr.prospect_first_at,i.incident_first_at) first_activity_at,
 greatest(r.route_last_at,v.visit_last_at,c.call_last_at,s.showroom_last_at,pr.prospect_last_at,i.incident_last_at) last_activity_at,p.resolved_clients
 from keys k join public.employees e on e.id=k.employee_id
 left join planned p on p.employee_id=k.employee_id and p.day=k.day left join routes r on r.employee_id=k.employee_id and r.day=k.day left join visited v on v.employee_id=k.employee_id and v.day=k.day
 left join call_stats c on c.employee_id=k.employee_id and c.day=k.day left join appt a on a.employee_id=k.employee_id and a.day=k.day left join showroom s on s.employee_id=k.employee_id and s.day=k.day
 left join pros pr on pr.employee_id=k.employee_id and pr.day=k.day left join inc i on i.employee_id=k.employee_id and i.day=k.day
)
select base.*,greatest(extract(epoch from(last_activity_at-first_activity_at)),0)::bigint activity_window_seconds,
 least(greatest(extract(epoch from(last_activity_at-first_activity_at)),0)::bigint,visit_seconds+showroom_seconds+incident_seconds+call_estimated_seconds+transit_wait_estimated_seconds)::bigint operational_seconds,
 case when planned_clients>0 then round(100.0*coalesce(resolved_clients,0)::numeric/planned_clients,1) end route_compliance_pct,
 case when visited_clients>0 then round(100.0*received_clients::numeric/visited_clients,1) end reception_pct,
 case when received_clients+showroom_attended>0 then round(100.0*purchase_clients::numeric/(received_clients+showroom_attended),1) end purchase_conversion_pct,
 case when calls>0 then round(100.0*calls_contacted::numeric/calls,1) end call_contact_rate_pct,
 case when greatest(extract(epoch from(last_activity_at-first_activity_at)),0)>0 then round(100.0*least(greatest(extract(epoch from(last_activity_at-first_activity_at)),0),visit_seconds+showroom_seconds+incident_seconds+call_estimated_seconds+transit_wait_estimated_seconds)::numeric/greatest(extract(epoch from(last_activity_at-first_activity_at)),1),1) end registered_utilization_pct
from base;

create or replace view public.executive_daily_global_summary with(security_invoker=true) as
select day,count(*) filter(where operational_seconds>0)::int active_employees,sum(planned_clients)::int planned_clients,sum(visited_clients)::int visited_clients,sum(received_clients)::int received_clients,
 sum(visit_purchase_clients)::int visit_purchase_clients,sum(showroom_purchase_clients)::int showroom_purchase_clients,sum(purchase_clients)::int purchase_clients,sum(sales_amount)::numeric(14,2) sales_amount,
 sum(calls)::int calls,sum(calls_contacted)::int calls_contacted,sum(appointments)::int appointments,sum(showroom_attended)::int showroom_attended,sum(prospects_captured)::int prospects_captured,
 sum(incidents)::int incidents,sum(operational_seconds)::bigint operational_seconds,sum(visit_seconds)::bigint visit_seconds,sum(showroom_seconds)::bigint showroom_seconds,
 sum(call_estimated_seconds)::bigint call_estimated_seconds,sum(transit_wait_estimated_seconds)::bigint transit_wait_estimated_seconds,sum(incident_seconds)::bigint incident_seconds,
 case when sum(planned_clients)>0 then round(100.0*sum(visited_clients)::numeric/sum(planned_clients),1) end route_execution_pct,
 case when sum(calls)>0 then round(100.0*sum(calls_contacted)::numeric/sum(calls),1) end call_contact_rate_pct
from public.executive_daily_employee_summary group by day;

create or replace view public.executive_activity_timeline with(security_invoker=true) as
select rs.employee_id,rs.session_date as day,'RUTA'::text as activity_type,rs.id as source_id,rs.started_at,rs.ended_at,extract(epoch from(coalesce(rs.ended_at,now())-rs.started_at))::bigint as duration_seconds,false as estimated,coalesce(rp.title,'Jornada en calle') as label,rs.status as result,null::numeric as amount,rs.route_plan_id as context_id
from public.route_sessions rs left join public.route_plans rp on rp.id=rs.route_plan_id
union all
select v.employee_id,(v.started_at at time zone 'America/Santo_Domingo')::date,'VISITA',v.id,v.started_at,v.ended_at,case when v.ended_at is not null then extract(epoch from(v.ended_at-v.started_at))::bigint else null end,false,coalesce(c.legal_name,'Visita a cliente'),coalesce(v.purchase_result,v.result),v.purchase_amount,v.route_session_id
from public.visits v left join public.clients c on c.id=v.client_id
union all
select c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date,'LLAMADA',c.id,c.occurred_at-make_interval(secs=>coalesce(c.duration_seconds,case c.result when 'NO_CONTESTA' then 90 when 'OCUPADO' then 45 when 'TELEFONO_INCORRECTO' then 60 else 300 end)),c.occurred_at,coalesce(c.duration_seconds,case c.result when 'NO_CONTESTA' then 90 when 'OCUPADO' then 45 when 'TELEFONO_INCORRECTO' then 60 else 300 end)::bigint,true,coalesce(cl.legal_name,'Gestión telefónica'),c.result,null::numeric,c.client_id
from public.calls c left join public.clients cl on cl.id=c.client_id
union all
select coalesce(s.attended_by_employee_id,s.manager_employee_id),(s.started_at at time zone 'America/Santo_Domingo')::date,'SHOWROOM',s.id,s.started_at,s.ended_at,case when s.ended_at is not null then extract(epoch from(s.ended_at-s.started_at))::bigint else null end,false,coalesce(cl.legal_name,'Atención showroom'),s.outcome,s.purchase_amount,s.appointment_id
from public.showroom_sessions s left join public.clients cl on cl.id=s.client_id
union all
select i.employee_id,(i.started_at at time zone 'America/Santo_Domingo')::date,'EVENTUALIDAD',i.id,i.started_at,i.ended_at,extract(epoch from(coalesce(i.ended_at,now())-i.started_at))::bigint,false,i.incident_type,i.impact,null::numeric,i.route_session_id
from public.operational_incidents i where i.status<>'CANCELADA';
grant select on public.executive_daily_employee_summary,public.executive_daily_global_summary,public.executive_activity_timeline to authenticated;