-- V0.6.5-beta.11 — Operational Intelligence
-- Capa ejecutiva CRM/Showroom + follow-ups trazables.
-- No introduce multi-tenancy parcial; respeta scoping Admin/Supervisor vs empleado propio.

create unique index if not exists follow_ups_source_unique_idx
  on public.follow_ups(source_type, source_id)
  where source_type is not null and source_id is not null;

create or replace function private.sync_source_follow_up(
  p_source_type text,
  p_source_id uuid,
  p_client_id uuid,
  p_prospect_id uuid,
  p_employee_id uuid,
  p_next_action text,
  p_follow_up_date date,
  p_notes text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due timestamptz;
begin
  if p_source_id is null or p_source_type is null then return; end if;

  if p_follow_up_date is null or nullif(btrim(coalesce(p_next_action,'')),'') is null then
    update public.follow_ups
       set status='CANCELADO',updated_at=now()
     where source_type=p_source_type
       and source_id=p_source_id
       and status in ('PENDIENTE','VENCIDO');
    return;
  end if;

  v_due := (p_follow_up_date::timestamp + time '09:00') at time zone 'America/Santo_Domingo';

  insert into public.follow_ups(
    client_id,prospect_id,assigned_employee_id,due_at,status,source_type,source_id,notes,created_at,updated_at
  ) values (
    p_client_id,p_prospect_id,p_employee_id,v_due,'PENDIENTE',p_source_type,p_source_id,
    concat_ws(' · ',nullif(btrim(coalesce(p_next_action,'')),''),nullif(btrim(coalesce(p_notes,'')),'')),now(),now()
  )
  on conflict (source_type,source_id) where source_type is not null and source_id is not null
  do update set
    client_id=excluded.client_id,
    prospect_id=excluded.prospect_id,
    assigned_employee_id=excluded.assigned_employee_id,
    due_at=excluded.due_at,
    status=case when public.follow_ups.status='COMPLETADO' then 'COMPLETADO' else 'PENDIENTE' end,
    notes=excluded.notes,
    updated_at=now();
end;
$$;

create or replace function private.sync_call_follow_up()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.sync_source_follow_up('CALL',new.id,new.client_id,new.prospect_id,new.employee_id,new.next_action,new.follow_up_date,new.notes);
  return new;
end;$$;

drop trigger if exists trg_calls_sync_follow_up on public.calls;
create trigger trg_calls_sync_follow_up
after insert or update of next_action,follow_up_date,employee_id,client_id,prospect_id,notes on public.calls
for each row execute function private.sync_call_follow_up();

create or replace function private.sync_visit_follow_up()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.sync_source_follow_up('VISIT',new.id,new.client_id,null,new.employee_id,new.next_action,new.follow_up_date,new.notes);
  return new;
end;$$;

drop trigger if exists trg_visits_sync_follow_up on public.visits;
create trigger trg_visits_sync_follow_up
after insert or update of next_action,follow_up_date,employee_id,client_id,notes on public.visits
for each row execute function private.sync_visit_follow_up();

create or replace function private.sync_showroom_follow_up()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform private.sync_source_follow_up('SHOWROOM',new.id,new.client_id,new.prospect_id,new.manager_employee_id,new.next_action,new.follow_up_date,new.notes);
  return new;
end;$$;

drop trigger if exists trg_showroom_sync_follow_up on public.showroom_sessions;
create trigger trg_showroom_sync_follow_up
after insert or update of next_action,follow_up_date,manager_employee_id,client_id,prospect_id,notes on public.showroom_sessions
for each row execute function private.sync_showroom_follow_up();

-- Backfill idempotente de próximas acciones existentes.
select private.sync_source_follow_up('CALL',c.id,c.client_id,c.prospect_id,c.employee_id,c.next_action,c.follow_up_date,c.notes)
from public.calls c
where c.follow_up_date is not null and nullif(btrim(coalesce(c.next_action,'')),'') is not null;

select private.sync_source_follow_up('VISIT',v.id,v.client_id,null,v.employee_id,v.next_action,v.follow_up_date,v.notes)
from public.visits v
where v.follow_up_date is not null and nullif(btrim(coalesce(v.next_action,'')),'') is not null;

select private.sync_source_follow_up('SHOWROOM',s.id,s.client_id,s.prospect_id,s.manager_employee_id,s.next_action,s.follow_up_date,s.notes)
from public.showroom_sessions s
where s.follow_up_date is not null and nullif(btrim(coalesce(s.next_action,'')),'') is not null;

create or replace function public.complete_follow_up(p_follow_up_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare v_row public.follow_ups%rowtype;
begin
  select * into v_row from public.follow_ups where id=p_follow_up_id for update;
  if not found then raise exception 'El seguimiento no existe.'; end if;
  if not (private.is_admin() or v_row.assigned_employee_id=private.current_employee_id()) then
    raise exception 'No tienes permiso para completar este seguimiento.' using errcode='42501';
  end if;
  update public.follow_ups set status='COMPLETADO',completed_at=now(),updated_at=now() where id=p_follow_up_id;
  return jsonb_build_object('id',p_follow_up_id,'status','COMPLETADO','completed_at',now());
end;$$;

create or replace function public.reschedule_follow_up(p_follow_up_id uuid,p_due_at timestamptz)
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare v_row public.follow_ups%rowtype;
begin
  if p_due_at is null then raise exception 'Debes indicar una nueva fecha.'; end if;
  select * into v_row from public.follow_ups where id=p_follow_up_id for update;
  if not found then raise exception 'El seguimiento no existe.'; end if;
  if not (private.is_admin() or v_row.assigned_employee_id=private.current_employee_id()) then
    raise exception 'No tienes permiso para reprogramar este seguimiento.' using errcode='42501';
  end if;
  update public.follow_ups set due_at=p_due_at,status='PENDIENTE',completed_at=null,updated_at=now() where id=p_follow_up_id;
  return jsonb_build_object('id',p_follow_up_id,'status','PENDIENTE','due_at',p_due_at);
end;$$;

revoke all on function public.complete_follow_up(uuid) from public;
revoke all on function public.reschedule_follow_up(uuid,timestamptz) from public;
grant execute on function public.complete_follow_up(uuid) to authenticated;
grant execute on function public.reschedule_follow_up(uuid,timestamptz) to authenticated;

create or replace view public.executive_crm_followups_v1
with (security_invoker=true)
as
select
  f.id,
  f.client_id,
  f.prospect_id,
  f.assigned_employee_id as employee_id,
  e.full_name,
  e.job_title,
  e.employee_type,
  f.due_at,
  f.status as persisted_status,
  case
    when f.status='COMPLETADO' then 'COMPLETADO'
    when f.status='CANCELADO' then 'CANCELADO'
    when (f.due_at at time zone 'America/Santo_Domingo')::date < (now() at time zone 'America/Santo_Domingo')::date then 'VENCIDO'
    when (f.due_at at time zone 'America/Santo_Domingo')::date = (now() at time zone 'America/Santo_Domingo')::date then 'HOY'
    else 'PROXIMO'
  end as derived_status,
  f.source_type,
  f.source_id,
  f.notes,
  f.completed_at,
  coalesce(c.legal_name,p.legal_name,'Sin nombre') as subject_name,
  c.codempr as client_code,
  c.client_type,
  c.region,
  c.province,
  c.municipality
from public.follow_ups f
left join public.employees e on e.id=f.assigned_employee_id
left join public.clients c on c.id=f.client_id
left join public.prospects p on p.id=f.prospect_id
where private.is_admin() or f.assigned_employee_id=private.current_employee_id();

grant select on public.executive_crm_followups_v1 to authenticated;

create or replace view public.executive_crm_daily_v1
with (security_invoker=true)
as
with activity_days as (
  select c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date as day from public.calls c
  union
  select a.employee_id,(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at) at time zone 'America/Santo_Domingo')::date from public.appointments a
  union
  select s.manager_employee_id,(s.started_at at time zone 'America/Santo_Domingo')::date from public.showroom_sessions s
  union
  select f.assigned_employee_id,(f.due_at at time zone 'America/Santo_Domingo')::date from public.follow_ups f where f.assigned_employee_id is not null
), calls_daily as (
  select c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date day,
    count(*)::integer calls,
    count(*) filter(where c.result in ('CONTACTADO','SEGUIMIENTO','INTERESADO_SHOWROOM','COMPRO','NO_COMPRO','NO_INTERESADO'))::integer calls_contacted,
    count(*) filter(where c.result='NO_CONTESTA')::integer calls_no_answer,
    count(*) filter(where c.result='OCUPADO')::integer calls_busy,
    count(*) filter(where c.result='TELEFONO_INCORRECTO')::integer calls_invalid_phone,
    count(*) filter(where c.result='LLAMAR_MAS_TARDE')::integer calls_later,
    count(*) filter(where c.appointment_created=true)::integer appointments_generated,
    coalesce(sum(c.duration_seconds),0)::bigint call_seconds,
    min(c.occurred_at) first_call_at,max(c.occurred_at) last_call_at
  from public.calls c group by c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date
), appointments_daily as (
  select a.employee_id,(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at) at time zone 'America/Santo_Domingo')::date day,
    count(*)::integer appointments_total,
    count(*) filter(where a.status='PENDIENTE_VALIDACION')::integer appointments_pending_validation,
    count(*) filter(where a.status in ('PROGRAMADA','CONFIRMADA'))::integer appointments_scheduled,
    count(*) filter(where a.status='CONFIRMADA')::integer appointments_confirmed,
    count(*) filter(where a.status in ('ASISTIO','FINALIZADA') or a.attended_at is not null)::integer appointments_attended,
    count(*) filter(where a.status='NO_ASISTIO')::integer appointments_no_show,
    count(*) filter(where a.status='REPROGRAMADA')::integer appointments_reprogrammed,
    min(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at)) first_appointment_at,
    max(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at)) last_appointment_at
  from public.appointments a group by a.employee_id,(coalesce(a.appointment_at,a.requested_appointment_at,a.created_at) at time zone 'America/Santo_Domingo')::date
), showroom_daily as (
  select s.manager_employee_id employee_id,(s.started_at at time zone 'America/Santo_Domingo')::date day,
    count(*)::integer showroom_sessions,
    count(*) filter(where s.ended_at is not null)::integer showroom_completed,
    count(*) filter(where s.purchased=true or s.outcome='COMPRA')::integer showroom_purchases,
    coalesce(sum(s.purchase_amount) filter(where s.purchased=true or s.outcome='COMPRA'),0)::numeric showroom_sales_amount,
    coalesce(sum(extract(epoch from (coalesce(s.ended_at,least(now(),((s.started_at at time zone 'America/Santo_Domingo')::date+1)::timestamp at time zone 'America/Santo_Domingo'))-s.started_at))),0)::bigint showroom_seconds,
    min(s.started_at) first_showroom_at,max(coalesce(s.ended_at,s.started_at)) last_showroom_at
  from public.showroom_sessions s group by s.manager_employee_id,(s.started_at at time zone 'America/Santo_Domingo')::date
), followups_daily as (
  select f.assigned_employee_id employee_id,(f.due_at at time zone 'America/Santo_Domingo')::date day,
    count(*)::integer followups_total,
    count(*) filter(where f.status='COMPLETADO')::integer followups_completed,
    count(*) filter(where f.status='CANCELADO')::integer followups_cancelled,
    count(*) filter(where f.status not in ('COMPLETADO','CANCELADO'))::integer followups_pending,
    count(*) filter(where f.status not in ('COMPLETADO','CANCELADO') and f.due_at<now())::integer followups_overdue,
    count(*) filter(where f.status not in ('COMPLETADO','CANCELADO') and (f.due_at at time zone 'America/Santo_Domingo')::date=(now() at time zone 'America/Santo_Domingo')::date)::integer followups_due_today
  from public.follow_ups f where f.assigned_employee_id is not null group by f.assigned_employee_id,(f.due_at at time zone 'America/Santo_Domingo')::date
)
select
  ad.employee_id,e.full_name,e.job_title,e.employee_type,ad.day,
  coalesce(cd.calls,0) calls,coalesce(cd.calls_contacted,0) calls_contacted,coalesce(cd.calls_no_answer,0) calls_no_answer,
  coalesce(cd.calls_busy,0) calls_busy,coalesce(cd.calls_invalid_phone,0) calls_invalid_phone,coalesce(cd.calls_later,0) calls_later,
  coalesce(cd.appointments_generated,0) appointments_generated,coalesce(cd.call_seconds,0) call_seconds,
  coalesce(ap.appointments_total,0) appointments_total,coalesce(ap.appointments_pending_validation,0) appointments_pending_validation,
  coalesce(ap.appointments_scheduled,0) appointments_scheduled,coalesce(ap.appointments_confirmed,0) appointments_confirmed,
  coalesce(ap.appointments_attended,0) appointments_attended,coalesce(ap.appointments_no_show,0) appointments_no_show,
  coalesce(ap.appointments_reprogrammed,0) appointments_reprogrammed,
  coalesce(sd.showroom_sessions,0) showroom_sessions,coalesce(sd.showroom_completed,0) showroom_completed,
  coalesce(sd.showroom_purchases,0) showroom_purchases,coalesce(sd.showroom_sales_amount,0) showroom_sales_amount,
  coalesce(sd.showroom_seconds,0) showroom_seconds,
  coalesce(fd.followups_total,0) followups_total,coalesce(fd.followups_completed,0) followups_completed,
  coalesce(fd.followups_cancelled,0) followups_cancelled,coalesce(fd.followups_pending,0) followups_pending,
  coalesce(fd.followups_overdue,0) followups_overdue,coalesce(fd.followups_due_today,0) followups_due_today,
  least(cd.first_call_at,ap.first_appointment_at,sd.first_showroom_at) first_activity_at,
  greatest(cd.last_call_at,ap.last_appointment_at,sd.last_showroom_at) last_activity_at,
  case when least(cd.first_call_at,ap.first_appointment_at,sd.first_showroom_at) is null or greatest(cd.last_call_at,ap.last_appointment_at,sd.last_showroom_at) is null then 0
       else greatest(0,extract(epoch from(greatest(cd.last_call_at,ap.last_appointment_at,sd.last_showroom_at)-least(cd.first_call_at,ap.first_appointment_at,sd.first_showroom_at))))::bigint end activity_window_seconds,
  (coalesce(cd.call_seconds,0)+coalesce(sd.showroom_seconds,0))::bigint management_seconds
from activity_days ad
join public.employees e on e.id=ad.employee_id and e.active=true
left join calls_daily cd on cd.employee_id=ad.employee_id and cd.day=ad.day
left join appointments_daily ap on ap.employee_id=ad.employee_id and ap.day=ad.day
left join showroom_daily sd on sd.employee_id=ad.employee_id and sd.day=ad.day
left join followups_daily fd on fd.employee_id=ad.employee_id and fd.day=ad.day
where e.employee_type='Gestor'
  and (private.is_admin() or ad.employee_id=private.current_employee_id());

grant select on public.executive_crm_daily_v1 to authenticated;

create index if not exists calls_employee_occurred_idx on public.calls(employee_id,occurred_at);
create index if not exists appointments_employee_date_idx on public.appointments(employee_id,appointment_at);
create index if not exists showroom_manager_started_idx on public.showroom_sessions(manager_employee_id,started_at);
create index if not exists followups_employee_due_idx on public.follow_ups(assigned_employee_id,due_at,status);
