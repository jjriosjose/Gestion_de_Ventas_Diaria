begin;

create table if not exists public.client_management_policies (
  client_id uuid primary key references public.clients(id) on delete cascade,
  visits_per_month integer not null default 0 check (visits_per_month between 0 and 31),
  calls_per_month integer not null default 0 check (calls_per_month between 0 and 31),
  min_visit_gap_days integer not null default 0 check (min_visit_gap_days between 0 and 90),
  min_call_gap_days integer not null default 0 check (min_call_gap_days between 0 and 90),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

alter table public.client_management_policies enable row level security;
drop policy if exists client_management_policies_read on public.client_management_policies;
create policy client_management_policies_read on public.client_management_policies for select using (true);
drop policy if exists client_management_policies_admin_insert on public.client_management_policies;
create policy client_management_policies_admin_insert on public.client_management_policies for insert with check (private.is_admin());
drop policy if exists client_management_policies_admin_update on public.client_management_policies;
create policy client_management_policies_admin_update on public.client_management_policies for update using (private.is_admin()) with check (private.is_admin());
drop policy if exists client_management_policies_admin_delete on public.client_management_policies;
create policy client_management_policies_admin_delete on public.client_management_policies for delete using (private.is_admin());
grant select,insert,update,delete on public.client_management_policies to authenticated;

drop trigger if exists client_management_policies_touch on public.client_management_policies;
create trigger client_management_policies_touch before update on public.client_management_policies for each row execute function private.touch_updated_at();
drop trigger if exists client_management_policies_stamp on public.client_management_policies;
create trigger client_management_policies_stamp before insert or update on public.client_management_policies for each row execute function private.stamp_actor();
drop trigger if exists client_management_policies_audit on public.client_management_policies;
create trigger client_management_policies_audit after insert or update or delete on public.client_management_policies for each row execute function private.audit_row_change();

alter table public.clients add column if not exists vendor_assignment_override boolean not null default false;
alter table public.clients add column if not exists manager_assignment_override boolean not null default false;
comment on column public.clients.vendor_assignment_override is 'When true, master imports preserve vendor_employee_id instead of recalculating from V-CARTERA.';
comment on column public.clients.manager_assignment_override is 'When true, master imports preserve manager_employee_id instead of recalculating from G-CARTERA.';

alter table public.appointments add column if not exists requested_by_employee_id uuid references public.employees(id);
alter table public.appointments add column if not exists assigned_manager_id uuid references public.employees(id);
alter table public.appointments add column if not exists source_type text;
alter table public.appointments add column if not exists source_visit_id uuid references public.visits(id);
alter table public.appointments add column if not exists requested_at timestamptz;
alter table public.appointments add column if not exists requested_appointment_at timestamptz;
alter table public.appointments add column if not exists confirmed_at timestamptz;
alter table public.appointments add column if not exists confirmed_by_employee_id uuid references public.employees(id);
alter table public.appointments add column if not exists validation_notes text;
alter table public.appointments add column if not exists request_contact_name text;
alter table public.appointments add column if not exists request_phone text;
alter table public.appointments alter column appointment_at drop not null;
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check check (status = any (array[
  'PENDIENTE_VALIDACION'::text,'CONTACTANDO'::text,'PROGRAMADA'::text,'CONFIRMADA'::text,
  'ASISTIO'::text,'NO_ASISTIO'::text,'REPROGRAMADA'::text,'NO_CONFIRMADA'::text,'CANCELADA'::text,'FINALIZADA'::text
]));
alter table public.appointments drop constraint if exists appointments_source_type_check;
alter table public.appointments add constraint appointments_source_type_check check (source_type is null or source_type = any (array['LLAMADA'::text,'VISITA'::text,'MANUAL'::text]));
create index if not exists appointments_assigned_manager_idx on public.appointments(assigned_manager_id,status,appointment_at);
create index if not exists appointments_requested_by_idx on public.appointments(requested_by_employee_id,created_at desc);

drop policy if exists appointments_insert on public.appointments;
create policy appointments_insert on public.appointments for insert with check (
  private.is_admin()
  or private.can_manage_employee(employee_id)
  or (
    requested_by_employee_id = private.current_employee_id()
    and client_id is not null
    and exists (
      select 1 from public.clients c
      where c.id = appointments.client_id
        and c.manager_employee_id = appointments.employee_id
        and appointments.assigned_manager_id = appointments.employee_id
    )
  )
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  entity_type text,
  entity_id uuid,
  status text not null default 'UNREAD' check (status in ('UNREAD','READ')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create index if not exists notifications_employee_status_idx on public.notifications(employee_id,status,created_at desc);
alter table public.notifications enable row level security;
drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select using (private.is_admin() or employee_id = private.current_employee_id());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (private.is_admin() or employee_id = private.current_employee_id()) with check (private.is_admin() or employee_id = private.current_employee_id());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete using (private.is_admin() or employee_id = private.current_employee_id());
grant select,update,delete on public.notifications to authenticated;

drop trigger if exists notifications_stamp on public.notifications;
create trigger notifications_stamp before update on public.notifications for each row execute function private.stamp_actor();

create or replace function private.notify_showroom_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_name text;
  v_requester_name text;
begin
  select c.legal_name into v_client_name from public.clients c where c.id = new.client_id;
  select e.full_name into v_requester_name from public.employees e where e.id = new.requested_by_employee_id;

  if tg_op = 'INSERT' and new.status = 'PENDIENTE_VALIDACION' and new.employee_id is not null then
    insert into public.notifications(employee_id,type,title,message,entity_type,entity_id)
    values(new.employee_id,'SHOWROOM_VALIDATION','Validar solicitud de showroom',
      coalesce(v_client_name,'Cliente') || ' · solicitada por ' || coalesce(v_requester_name,'equipo comercial'),
      'APPOINTMENT',new.id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status and new.requested_by_employee_id is not null
        and new.status in ('CONFIRMADA','REPROGRAMADA','NO_CONFIRMADA','CANCELADA','ASISTIO','NO_ASISTIO') then
    insert into public.notifications(employee_id,type,title,message,entity_type,entity_id)
    values(new.requested_by_employee_id,'SHOWROOM_STATUS','Actualización de showroom',
      coalesce(v_client_name,'Cliente') || ' · ' || replace(new.status,'_',' '),
      'APPOINTMENT',new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists appointments_showroom_notifications on public.appointments;
create trigger appointments_showroom_notifications after insert or update of status on public.appointments
for each row execute function private.notify_showroom_workflow();

create or replace function public.set_portfolio_mapping(p_portfolio_type text, p_source_key text, p_mapping_status text, p_employee_id uuid default null::uuid, p_notes text default null::text)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_type text := upper(btrim(p_portfolio_type));
  v_key text := upper(btrim(p_source_key));
  v_status text := upper(btrim(p_mapping_status));
  v_count integer := 0;
  v_emp_type text;
begin
  if not private.is_admin() then raise exception 'No autorizado'; end if;
  if v_type not in ('V','G') then raise exception 'Tipo de cartera inválido'; end if;
  if v_status not in ('EMPLOYEE','UNASSIGNED','INTERNAL','INACTIVE','IGNORE','PENDING') then raise exception 'Estado de homologación inválido'; end if;
  if v_status = 'EMPLOYEE' then
    if p_employee_id is null then raise exception 'Empleado requerido'; end if;
    select employee_type into v_emp_type from public.employees where id=p_employee_id and active=true;
    if (v_type='V' and v_emp_type <> 'Vendedor') or (v_type='G' and v_emp_type <> 'Gestor') then raise exception 'El tipo de empleado no corresponde a la cartera'; end if;
  end if;

  insert into public.portfolio_mappings(portfolio_type, source_key, source_label, mapping_status, employee_id, notes, created_by, updated_by)
  values(v_type, v_key, v_key, v_status, case when v_status='EMPLOYEE' then p_employee_id else null end, p_notes, auth.uid(), auth.uid())
  on conflict (portfolio_type, source_key) do update
    set mapping_status=excluded.mapping_status, employee_id=excluded.employee_id, notes=excluded.notes, updated_at=now(), updated_by=auth.uid();

  if v_type='V' then
    update public.clients set vendor_employee_id = case when v_status='EMPLOYEE' then p_employee_id else null end, updated_at=now(), updated_by=auth.uid()
    where private.portfolio_base(v_cartera)=v_key and vendor_assignment_override=false;
    get diagnostics v_count = row_count;
  else
    update public.clients set manager_employee_id = case when v_status='EMPLOYEE' then p_employee_id else null end, updated_at=now(), updated_by=auth.uid()
    where private.portfolio_base(g_cartera)=v_key and manager_assignment_override=false;
    get diagnostics v_count = row_count;
  end if;
  return v_count;
end;
$$;

create or replace function public.set_client_assignment(p_client_id uuid, p_assignment_type text, p_employee_id uuid default null, p_use_homologation boolean default false)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_type text := upper(btrim(p_assignment_type));
  v_employee_type text;
  v_source_key text;
  v_resolved uuid;
  v_status text;
begin
  if not private.is_admin() then raise exception 'No autorizado'; end if;
  if v_type not in ('V','G') then raise exception 'Tipo de asignación inválido'; end if;
  if p_use_homologation then
    if v_type='V' then select private.portfolio_base(v_cartera) into v_source_key from public.clients where id=p_client_id;
    else select private.portfolio_base(g_cartera) into v_source_key from public.clients where id=p_client_id;
    end if;
    select mapping_status, employee_id into v_status, v_resolved from public.portfolio_mappings where portfolio_type=v_type and source_key=v_source_key;
    if v_status is distinct from 'EMPLOYEE' then v_resolved := null; end if;
  else
    v_resolved := p_employee_id;
    if v_resolved is not null then
      select employee_type into v_employee_type from public.employees where id=v_resolved and active=true;
      if (v_type='V' and v_employee_type <> 'Vendedor') or (v_type='G' and v_employee_type <> 'Gestor') then raise exception 'El tipo de empleado no corresponde a la asignación'; end if;
    end if;
  end if;
  if v_type='V' then
    update public.clients set vendor_employee_id=v_resolved, vendor_assignment_override=not p_use_homologation, updated_at=now(), updated_by=auth.uid() where id=p_client_id;
  else
    update public.clients set manager_employee_id=v_resolved, manager_assignment_override=not p_use_homologation, updated_at=now(), updated_by=auth.uid() where id=p_client_id;
  end if;
  return v_resolved;
end;
$$;
grant execute on function public.set_client_assignment(uuid,text,uuid,boolean) to authenticated;

create or replace function public.set_management_policy_bulk(p_client_ids uuid[], p_management_type text, p_frequency integer, p_min_gap_days integer default 0)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_type text := upper(btrim(p_management_type));
  v_count integer := 0;
begin
  if not private.is_admin() then raise exception 'No autorizado'; end if;
  if v_type not in ('VISITAS','LLAMADAS') then raise exception 'Tipo de gestión inválido'; end if;
  if p_frequency < 0 or p_frequency > 31 then raise exception 'Frecuencia inválida'; end if;
  if p_min_gap_days < 0 or p_min_gap_days > 90 then raise exception 'Separación mínima inválida'; end if;
  if v_type='VISITAS' then
    insert into public.client_management_policies(client_id,visits_per_month,min_visit_gap_days,active,created_by,updated_by)
    select x,p_frequency,p_min_gap_days,true,auth.uid(),auth.uid() from unnest(p_client_ids) x
    on conflict(client_id) do update set visits_per_month=excluded.visits_per_month,min_visit_gap_days=excluded.min_visit_gap_days,active=true,updated_at=now(),updated_by=auth.uid();
  else
    insert into public.client_management_policies(client_id,calls_per_month,min_call_gap_days,active,created_by,updated_by)
    select x,p_frequency,p_min_gap_days,true,auth.uid(),auth.uid() from unnest(p_client_ids) x
    on conflict(client_id) do update set calls_per_month=excluded.calls_per_month,min_call_gap_days=excluded.min_call_gap_days,active=true,updated_at=now(),updated_by=auth.uid();
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
grant execute on function public.set_management_policy_bulk(uuid[],text,integer,integer) to authenticated;

create or replace view public.client_management_coverage_current
with (security_invoker=true)
as
with month_bounds as (
  select date_trunc('month', current_date)::date as month_start,
         (date_trunc('month', current_date) + interval '1 month')::date as month_end
), visit_stats as (
  select v.client_id,
         count(*) filter (where v.ended_at is not null and v.ended_at >= mb.month_start and v.ended_at < mb.month_end) as visits_this_month,
         max(v.ended_at) filter (where v.ended_at is not null) as last_visit_at
  from public.visits v cross join month_bounds mb
  where v.client_id is not null
  group by v.client_id
), call_stats as (
  select c.client_id,
         count(*) filter (where c.occurred_at >= mb.month_start and c.occurred_at < mb.month_end) as calls_this_month,
         max(c.occurred_at) as last_call_at
  from public.calls c cross join month_bounds mb
  where c.client_id is not null
  group by c.client_id
)
select c.id as client_id,c.codempr,c.legal_name,c.company_code,c.region,c.province,c.municipality,
       c.vendor_employee_id,c.manager_employee_id,c.v_cartera,c.g_cartera,c.latitude,c.longitude,
       coalesce(p.visits_per_month,0) as visits_per_month,
       coalesce(p.calls_per_month,0) as calls_per_month,
       coalesce(p.min_visit_gap_days,0) as min_visit_gap_days,
       coalesce(p.min_call_gap_days,0) as min_call_gap_days,
       coalesce(vs.visits_this_month,0)::integer as visits_this_month,
       coalesce(cs.calls_this_month,0)::integer as calls_this_month,
       vs.last_visit_at,cs.last_call_at,
       greatest(coalesce(p.visits_per_month,0)-coalesce(vs.visits_this_month,0),0)::integer as visits_remaining,
       greatest(coalesce(p.calls_per_month,0)-coalesce(cs.calls_this_month,0),0)::integer as calls_remaining,
       case when coalesce(p.visits_per_month,0)=0 then 'SIN_META'
            when coalesce(vs.visits_this_month,0)>=p.visits_per_month then 'CUMPLIDO'
            else 'PENDIENTE' end as visit_status,
       case when coalesce(p.calls_per_month,0)=0 then 'SIN_META'
            when coalesce(cs.calls_this_month,0)>=p.calls_per_month then 'CUMPLIDO'
            else 'PENDIENTE' end as call_status
from public.clients c
left join public.client_management_policies p on p.client_id=c.id and p.active=true
left join visit_stats vs on vs.client_id=c.id
left join call_stats cs on cs.client_id=c.id;

grant select on public.client_management_coverage_current to authenticated;

commit;
