create or replace function private.portfolio_base(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(upper(btrim(split_part(coalesce(value,''), '-', 1))), '')
$$;

create table if not exists public.portfolio_mappings (
  id uuid primary key default gen_random_uuid(),
  portfolio_type text not null check (portfolio_type in ('V','G')),
  source_key text not null,
  source_label text not null,
  mapping_status text not null default 'PENDING' check (mapping_status in ('EMPLOYEE','UNASSIGNED','INTERNAL','INACTIVE','IGNORE','PENDING')),
  employee_id uuid null references public.employees(id) on delete set null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null,
  unique (portfolio_type, source_key),
  check ((mapping_status = 'EMPLOYEE' and employee_id is not null) or (mapping_status <> 'EMPLOYEE'))
);

alter table public.portfolio_mappings enable row level security;

create policy portfolio_mappings_read on public.portfolio_mappings
for select to authenticated using (true);
create policy portfolio_mappings_admin_insert on public.portfolio_mappings
for insert to authenticated with check (private.is_admin());
create policy portfolio_mappings_admin_update on public.portfolio_mappings
for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy portfolio_mappings_admin_delete on public.portfolio_mappings
for delete to authenticated using (private.is_admin());

insert into public.portfolio_mappings (portfolio_type, source_key, source_label, mapping_status, employee_id)
select 'V', private.portfolio_base(c.v_cartera), private.portfolio_base(c.v_cartera), 'EMPLOYEE', min(c.vendor_employee_id::text)::uuid
from public.clients c
where private.portfolio_base(c.v_cartera) is not null and c.vendor_employee_id is not null
group by private.portfolio_base(c.v_cartera)
on conflict (portfolio_type, source_key) do update set employee_id=excluded.employee_id, mapping_status='EMPLOYEE', updated_at=now();

insert into public.portfolio_mappings (portfolio_type, source_key, source_label, mapping_status, employee_id)
select 'G', private.portfolio_base(c.g_cartera), private.portfolio_base(c.g_cartera), 'EMPLOYEE', min(c.manager_employee_id::text)::uuid
from public.clients c
where private.portfolio_base(c.g_cartera) is not null and c.manager_employee_id is not null
group by private.portfolio_base(c.g_cartera)
on conflict (portfolio_type, source_key) do update set employee_id=excluded.employee_id, mapping_status='EMPLOYEE', updated_at=now();

insert into public.portfolio_mappings (portfolio_type, source_key, source_label, mapping_status)
values
('V','P/ASIGNAR','P/ASIGNAR','UNASSIGNED'),
('G','P/ASIGNAR','P/ASIGNAR','UNASSIGNED'),
('V','GESTION INTERNA','GESTION INTERNA','INTERNAL'),
('G','GESTION INTERNA','GESTION INTERNA','INTERNAL')
on conflict (portfolio_type, source_key) do update set mapping_status=excluded.mapping_status, employee_id=null, updated_at=now();

create or replace function public.set_portfolio_mapping(
  p_portfolio_type text,
  p_source_key text,
  p_mapping_status text,
  p_employee_id uuid default null,
  p_notes text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
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
    update public.clients set vendor_employee_id=case when v_status='EMPLOYEE' then p_employee_id else null end, updated_at=now(), updated_by=auth.uid()
    where private.portfolio_base(v_cartera)=v_key;
    get diagnostics v_count = row_count;
  else
    update public.clients set manager_employee_id=case when v_status='EMPLOYEE' then p_employee_id else null end, updated_at=now(), updated_by=auth.uid()
    where private.portfolio_base(g_cartera)=v_key;
    get diagnostics v_count = row_count;
  end if;
  return v_count;
end;
$$;

grant execute on function public.set_portfolio_mapping(text,text,text,uuid,text) to authenticated;
