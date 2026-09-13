-- CRM Territorial + Showroom Flow V1
-- 2026-09-13
-- Extiende llamadas con direccion/monto, disponibilidad diaria de gestores,
-- metricas ejecutivas con ventas por llamada y alertas de showroom/recepcion.

alter table public.calls
  add column if not exists call_direction text not null default 'SALIENTE',
  add column if not exists purchase_amount numeric(14,2);

alter table public.calls drop constraint if exists calls_call_direction_check;
alter table public.calls add constraint calls_call_direction_check
  check (call_direction in ('SALIENTE','ENTRANTE'));

alter table public.calls drop constraint if exists calls_purchase_amount_check;
alter table public.calls add constraint calls_purchase_amount_check
  check (purchase_amount is null or purchase_amount >= 0);

create index if not exists calls_direction_occurred_idx on public.calls(call_direction, occurred_at);
create index if not exists calls_purchase_occurred_idx on public.calls(employee_id, occurred_at) where result='COMPRO';

create table if not exists public.manager_daily_availability (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null default ((now() at time zone 'America/Santo_Domingo')::date),
  lunch_started_at timestamptz,
  lunch_ended_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(employee_id, work_date),
  check (lunch_ended_at is null or lunch_started_at is not null),
  check (lunch_ended_at is null or lunch_ended_at >= lunch_started_at)
);

alter table public.manager_daily_availability enable row level security;

drop policy if exists manager_daily_availability_read on public.manager_daily_availability;
create policy manager_daily_availability_read on public.manager_daily_availability
  for select to authenticated using (true);

drop policy if exists manager_daily_availability_insert on public.manager_daily_availability;
create policy manager_daily_availability_insert on public.manager_daily_availability
  for insert to authenticated
  with check (private.is_admin() or employee_id=private.current_employee_id());

drop policy if exists manager_daily_availability_update on public.manager_daily_availability;
create policy manager_daily_availability_update on public.manager_daily_availability
  for update to authenticated
  using (private.is_admin() or employee_id=private.current_employee_id())
  with check (private.is_admin() or employee_id=private.current_employee_id());

drop policy if exists manager_daily_availability_delete on public.manager_daily_availability;
create policy manager_daily_availability_delete on public.manager_daily_availability
  for delete to authenticated using (private.is_admin());

grant select,insert,update,delete on public.manager_daily_availability to authenticated;

create or replace view public.manager_reception_availability_v1
with (security_invoker=true) as
with today_availability as (
  select a.employee_id,a.work_date,a.lunch_started_at,a.lunch_ended_at,a.notes
  from public.manager_daily_availability a
  where a.work_date=(now() at time zone 'America/Santo_Domingo')::date
), reception_load as (
  select r.assigned_manager_id as employee_id,
    count(*) filter(where r.status='EN_ESPERA')::integer as waiting_clients,
    count(*) filter(where r.status='EN_ATENCION')::integer as active_clients,
    min(r.check_in_at) filter(where r.status='EN_ESPERA') as oldest_waiting_at
  from public.reception_entries r
  where r.assigned_manager_id is not null
    and r.check_in_at >= ((now() at time zone 'America/Santo_Domingo')::date::timestamp at time zone 'America/Santo_Domingo')
    and r.status in ('EN_ESPERA','EN_ATENCION')
  group by r.assigned_manager_id
)
select e.id as employee_id,e.full_name,e.job_title,e.active,
  a.lunch_started_at,a.lunch_ended_at,
  coalesce(r.waiting_clients,0) as waiting_clients,
  coalesce(r.active_clients,0) as active_clients,
  r.oldest_waiting_at,
  case
    when a.lunch_started_at is not null and a.lunch_ended_at is null then 'ALMUERZO'
    when coalesce(r.active_clients,0)>0 then 'EN_ATENCION'
    else 'DISPONIBLE'
  end as availability_status
from public.employees e
left join today_availability a on a.employee_id=e.id
left join reception_load r on r.employee_id=e.id
where e.active=true and e.employee_type='Gestor';

grant select on public.manager_reception_availability_v1 to authenticated;

create or replace view public.executive_call_sales_daily_v1
with (security_invoker=true) as
select c.employee_id,
  (c.occurred_at at time zone 'America/Santo_Domingo')::date as day,
  count(*) filter(where c.result='COMPRO')::integer as call_purchase_clients,
  coalesce(sum(c.purchase_amount) filter(where c.result='COMPRO'),0)::numeric(14,2) as call_sales_amount,
  count(*) filter(where c.call_direction='ENTRANTE')::integer as inbound_calls,
  count(*) filter(where c.call_direction='SALIENTE')::integer as outbound_calls
from public.calls c
group by c.employee_id,(c.occurred_at at time zone 'America/Santo_Domingo')::date;

grant select on public.executive_call_sales_daily_v1 to authenticated;

create or replace view public.executive_daily_employee_summary_v2
with (security_invoker=true) as
select b.*,
  coalesce(cs.call_purchase_clients,0) as call_purchase_clients,
  coalesce(cs.call_sales_amount,0)::numeric(14,2) as call_sales_amount,
  coalesce(cs.inbound_calls,0) as inbound_calls,
  coalesce(cs.outbound_calls,0) as outbound_calls,
  (coalesce(b.purchase_clients,0)+coalesce(cs.call_purchase_clients,0))::integer as purchase_clients_all,
  (coalesce(b.sales_amount,0)+coalesce(cs.call_sales_amount,0))::numeric(14,2) as sales_amount_all
from public.executive_daily_employee_summary b
left join public.executive_call_sales_daily_v1 cs
  on cs.employee_id=b.employee_id and cs.day=b.day;

grant select on public.executive_daily_employee_summary_v2 to authenticated;

create or replace view public.executive_daily_global_summary_v2
with (security_invoker=true) as
select day,
  count(*) filter(where operational_seconds>0)::integer as active_employees,
  sum(planned_clients)::integer as planned_clients,
  sum(visited_clients)::integer as visited_clients,
  sum(received_clients)::integer as received_clients,
  sum(visit_purchase_clients)::integer as visit_purchase_clients,
  sum(showroom_purchase_clients)::integer as showroom_purchase_clients,
  sum(call_purchase_clients)::integer as call_purchase_clients,
  sum(purchase_clients_all)::integer as purchase_clients,
  sum(visit_sales_amount)::numeric(14,2) as visit_sales_amount,
  sum(showroom_sales_amount)::numeric(14,2) as showroom_sales_amount,
  sum(call_sales_amount)::numeric(14,2) as call_sales_amount,
  sum(sales_amount_all)::numeric(14,2) as sales_amount,
  sum(calls)::integer as calls,
  sum(calls_contacted)::integer as calls_contacted,
  sum(inbound_calls)::integer as inbound_calls,
  sum(outbound_calls)::integer as outbound_calls,
  sum(appointments)::integer as appointments,
  sum(showroom_attended)::integer as showroom_attended,
  sum(prospects_captured)::integer as prospects_captured,
  sum(incidents)::integer as incidents,
  sum(routes_started)::integer as routes_started,
  sum(routes_completed)::integer as routes_completed,
  sum(operational_seconds)::bigint as operational_seconds,
  sum(visit_seconds)::bigint as visit_seconds,
  sum(showroom_seconds)::bigint as showroom_seconds,
  sum(call_estimated_seconds)::bigint as call_estimated_seconds,
  sum(transit_wait_estimated_seconds)::bigint as transit_wait_estimated_seconds,
  sum(incident_seconds)::bigint as incident_seconds,
  case when sum(planned_clients)>0 then round(100.0*sum(visited_clients)::numeric/sum(planned_clients)::numeric,1) else null end as route_execution_pct,
  case when sum(calls)>0 then round(100.0*sum(calls_contacted)::numeric/sum(calls)::numeric,1) else null end as call_contact_rate_pct
from public.executive_daily_employee_summary_v2
group by day;

grant select on public.executive_daily_global_summary_v2 to authenticated;

create or replace function private.notify_showroom_manager()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_name text;
begin
  if tg_op='UPDATE' and old.assigned_manager_id is distinct from new.assigned_manager_id then
    update public.notifications set status='READ',read_at=coalesce(read_at,now())
      where entity_type='APPOINTMENT' and entity_id=new.id and type='SHOWROOM_VALIDATION' and status='UNREAD';
  end if;

  if new.status='PENDIENTE_VALIDACION' and new.assigned_manager_id is not null then
    select coalesce(c.legal_name,p.legal_name,'Cliente') into v_name
    from (select new.client_id as client_id,new.prospect_id as prospect_id) x
    left join public.clients c on c.id=x.client_id
    left join public.prospects p on p.id=x.prospect_id;
    if not exists(select 1 from public.notifications n where n.employee_id=new.assigned_manager_id and n.type='SHOWROOM_VALIDATION' and n.entity_type='APPOINTMENT' and n.entity_id=new.id and n.status='UNREAD') then
      insert into public.notifications(employee_id,type,title,message,entity_type,entity_id,status,created_at)
      values(new.assigned_manager_id,'SHOWROOM_VALIDATION','Showroom pendiente de validar',
        concat(v_name,' · origen ',coalesce(new.source_type,'MANUAL'),' · confirma o reprograma la fecha con el cliente.'),
        'APPOINTMENT',new.id,'UNREAD',now());
    end if;
  elsif new.status<>'PENDIENTE_VALIDACION' then
    update public.notifications set status='READ',read_at=coalesce(read_at,now())
      where entity_type='APPOINTMENT' and entity_id=new.id and type='SHOWROOM_VALIDATION' and status='UNREAD';
  end if;
  return new;
end;$$;

drop trigger if exists trg_appointments_notify_manager on public.appointments;
create trigger trg_appointments_notify_manager
after insert or update of assigned_manager_id,status on public.appointments
for each row execute function private.notify_showroom_manager();

create or replace function private.notify_reception_manager()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_name text;
begin
  if tg_op='UPDATE' and old.assigned_manager_id is distinct from new.assigned_manager_id then
    update public.notifications set status='READ',read_at=coalesce(read_at,now())
      where entity_type='RECEPTION_ENTRY' and entity_id=new.id and type='CLIENTE_RECEPCION' and status='UNREAD';
  end if;

  if new.status='EN_ESPERA' and new.assigned_manager_id is not null then
    v_name:=coalesce(new.company_name,new.visitor_name,'Cliente');
    if not exists(select 1 from public.notifications n where n.employee_id=new.assigned_manager_id and n.type='CLIENTE_RECEPCION' and n.entity_type='RECEPTION_ENTRY' and n.entity_id=new.id and n.status='UNREAD') then
      insert into public.notifications(employee_id,type,title,message,entity_type,entity_id,status,created_at)
      values(new.assigned_manager_id,'CLIENTE_RECEPCION','Cliente esperando en recepción',
        concat(v_name,' · ',coalesce(new.purpose,'Atención comercial')),
        'RECEPTION_ENTRY',new.id,'UNREAD',now());
    end if;
  elsif new.status<>'EN_ESPERA' then
    update public.notifications set status='READ',read_at=coalesce(read_at,now())
      where entity_type='RECEPTION_ENTRY' and entity_id=new.id and type='CLIENTE_RECEPCION' and status='UNREAD';
  end if;
  return new;
end;$$;

drop trigger if exists trg_reception_notify_manager on public.reception_entries;
create trigger trg_reception_notify_manager
after insert or update of assigned_manager_id,status on public.reception_entries
for each row execute function private.notify_reception_manager();
