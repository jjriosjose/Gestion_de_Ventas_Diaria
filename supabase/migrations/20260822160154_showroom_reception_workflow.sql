alter table public.employees drop constraint if exists employees_app_role_check;
alter table public.employees add constraint employees_app_role_check check (app_role = any (array['Administrador'::text,'Supervisor'::text,'Usuario'::text,'SoloLectura'::text,'Recepcionista'::text]));
alter table public.employees drop constraint if exists employees_employee_type_check;
alter table public.employees add constraint employees_employee_type_check check (employee_type = any (array['Gerencia'::text,'Direccion'::text,'Gestor'::text,'Vendedor'::text,'Recepcion'::text,'Otro'::text]));

create table if not exists public.reception_entries (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  visitor_type text not null default 'CLIENTE_SIN_CITA' check (visitor_type in ('CITA','CLIENTE_SIN_CITA','PROSPECTO','NUEVO')),
  visitor_name text,
  company_name text,
  phone text,
  purpose text,
  assigned_manager_id uuid references public.employees(id) on delete set null,
  check_in_at timestamptz not null default now(),
  check_in_by uuid references public.employees(id) on delete set null,
  service_started_at timestamptz,
  service_started_by uuid references public.employees(id) on delete set null,
  service_ended_at timestamptz,
  service_ended_by uuid references public.employees(id) on delete set null,
  check_out_at timestamptz,
  check_out_by uuid references public.employees(id) on delete set null,
  status text not null default 'EN_ESPERA' check (status in ('EN_ESPERA','EN_ATENCION','ATENCION_FINALIZADA','SALIO','CANCELADO')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.showroom_sessions (
  id uuid primary key default gen_random_uuid(),
  reception_entry_id uuid not null unique references public.reception_entries(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  manager_employee_id uuid not null references public.employees(id) on delete restrict,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  outcome text check (outcome in ('COMPRA','NO_COMPRA','PENDIENTE','SEGUIMIENTO','COTIZACION','OTRO')),
  purchased boolean,
  purchase_amount numeric(14,2),
  attended_by_name text,
  notes text,
  next_action text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_reception_entries_check_in on public.reception_entries(check_in_at desc);
create index if not exists idx_reception_entries_status on public.reception_entries(status);
create index if not exists idx_reception_entries_manager on public.reception_entries(assigned_manager_id);
create index if not exists idx_reception_entries_appointment on public.reception_entries(appointment_id);
create index if not exists idx_showroom_sessions_manager on public.showroom_sessions(manager_employee_id);
create index if not exists idx_showroom_sessions_ended on public.showroom_sessions(ended_at);

alter table public.reception_entries enable row level security;
alter table public.showroom_sessions enable row level security;

drop policy if exists reception_entries_read on public.reception_entries;
create policy reception_entries_read on public.reception_entries for select to authenticated using (true);
drop policy if exists reception_entries_insert on public.reception_entries;
create policy reception_entries_insert on public.reception_entries for insert to authenticated with check (
  private.is_admin()
  or assigned_manager_id = private.current_employee_id()
  or exists (select 1 from public.employees e where e.id = private.current_employee_id() and e.active = true and (e.employee_type = 'Recepcion' or e.app_role = 'Recepcionista'))
);
drop policy if exists reception_entries_update on public.reception_entries;
create policy reception_entries_update on public.reception_entries for update to authenticated using (
  private.is_admin()
  or assigned_manager_id = private.current_employee_id()
  or exists (select 1 from public.employees e where e.id = private.current_employee_id() and e.active = true and (e.employee_type = 'Recepcion' or e.app_role = 'Recepcionista'))
) with check (
  private.is_admin()
  or assigned_manager_id = private.current_employee_id()
  or exists (select 1 from public.employees e where e.id = private.current_employee_id() and e.active = true and (e.employee_type = 'Recepcion' or e.app_role = 'Recepcionista'))
);
drop policy if exists reception_entries_delete on public.reception_entries;
create policy reception_entries_delete on public.reception_entries for delete to authenticated using (private.is_admin());

drop policy if exists showroom_sessions_read on public.showroom_sessions;
create policy showroom_sessions_read on public.showroom_sessions for select to authenticated using (true);
drop policy if exists showroom_sessions_insert on public.showroom_sessions;
create policy showroom_sessions_insert on public.showroom_sessions for insert to authenticated with check (private.is_admin() or manager_employee_id = private.current_employee_id());
drop policy if exists showroom_sessions_update on public.showroom_sessions;
create policy showroom_sessions_update on public.showroom_sessions for update to authenticated using (private.is_admin() or manager_employee_id = private.current_employee_id()) with check (private.is_admin() or manager_employee_id = private.current_employee_id());
drop policy if exists showroom_sessions_delete on public.showroom_sessions;
create policy showroom_sessions_delete on public.showroom_sessions for delete to authenticated using (private.is_admin());