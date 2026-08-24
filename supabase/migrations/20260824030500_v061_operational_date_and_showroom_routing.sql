-- V0.6.1
-- Protege la fecha operativa y conserva solicitudes de showroom aunque el cliente no tenga V-Gestor.

create or replace function private.enforce_route_session_operational_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_route_date date;
begin
  if new.session_date is distinct from v_today then
    raise exception 'La jornada solo puede iniciarse en la fecha operativa actual (%). Fecha recibida: %.', v_today, new.session_date;
  end if;

  if new.route_plan_id is not null then
    select rp.route_date into v_route_date
    from public.route_plans rp
    where rp.id = new.route_plan_id;

    if v_route_date is null then
      raise exception 'No se encontró la planificación asociada a la jornada.';
    end if;

    if v_route_date is distinct from v_today then
      raise exception 'Esta ruta está planificada para %. Hoy es %. Solo puede iniciarse en su fecha programada.', v_route_date, v_today;
    end if;

    if new.session_date is distinct from v_route_date then
      raise exception 'La fecha de la jornada (%) no coincide con la fecha de la ruta (%).', new.session_date, v_route_date;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists route_sessions_operational_date_guard on public.route_sessions;
create trigger route_sessions_operational_date_guard
before insert on public.route_sessions
for each row execute function private.enforce_route_session_operational_date();

create or replace function private.enforce_appointment_arrival_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_appointment_at timestamptz;
  v_appointment_day date;
begin
  if new.appointment_id is null then
    return new;
  end if;

  select coalesce(a.appointment_at, a.requested_appointment_at)
    into v_appointment_at
  from public.appointments a
  where a.id = new.appointment_id;

  if v_appointment_at is null then
    return new;
  end if;

  v_appointment_day := (v_appointment_at at time zone 'America/Santo_Domingo')::date;

  if v_appointment_day > v_today then
    raise exception 'Esta cita está programada para %. Hoy es %. No se puede registrar una llegada anticipada.', v_appointment_day, v_today;
  end if;

  return new;
end;
$$;

drop trigger if exists reception_entries_appointment_date_guard on public.reception_entries;
create trigger reception_entries_appointment_date_guard
before insert on public.reception_entries
for each row execute function private.enforce_appointment_arrival_date();

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

  if tg_op = 'INSERT' and new.status = 'PENDIENTE_VALIDACION' then
    if new.assigned_manager_id is not null then
      insert into public.notifications(employee_id,type,title,message,entity_type,entity_id)
      values(new.assigned_manager_id,'SHOWROOM_VALIDATION','Validar solicitud de showroom',
        coalesce(v_client_name,'Cliente') || ' · solicitada por ' || coalesce(v_requester_name,'equipo comercial'),
        'APPOINTMENT',new.id);
    else
      insert into public.notifications(employee_id,type,title,message,entity_type,entity_id)
      select e.id,'SHOWROOM_ASSIGNMENT','Asignar solicitud de showroom',
        coalesce(v_client_name,'Cliente') || ' · SIN V-GESTOR · solicitada por ' || coalesce(v_requester_name,'equipo comercial'),
        'APPOINTMENT',new.id
      from public.employees e
      where e.active = true
        and (e.app_role in ('Administrador','Supervisor') or e.access_profile in ('Administrador','Supervisor'));
    end if;

  elsif tg_op = 'UPDATE'
        and new.assigned_manager_id is not null
        and new.assigned_manager_id is distinct from old.assigned_manager_id
        and new.status in ('PENDIENTE_VALIDACION','CONTACTANDO') then
    insert into public.notifications(employee_id,type,title,message,entity_type,entity_id)
    values(new.assigned_manager_id,'SHOWROOM_VALIDATION','Nueva solicitud de showroom asignada',
      coalesce(v_client_name,'Cliente') || ' · solicitada por ' || coalesce(v_requester_name,'equipo comercial'),
      'APPOINTMENT',new.id);

  elsif tg_op = 'UPDATE'
        and new.status is distinct from old.status
        and new.requested_by_employee_id is not null
        and new.status in ('CONFIRMADA','REPROGRAMADA','NO_CONFIRMADA','CANCELADA','ASISTIO','NO_ASISTIO','FINALIZADA') then
    insert into public.notifications(employee_id,type,title,message,entity_type,entity_id)
    values(new.requested_by_employee_id,'SHOWROOM_STATUS','Actualización de showroom',
      coalesce(v_client_name,'Cliente') || ' · ' || replace(new.status,'_',' '),
      'APPOINTMENT',new.id);
  end if;

  return new;
end;
$$;

create or replace function private.route_pending_showroom_after_manager_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.manager_employee_id is not null
     and new.manager_employee_id is distinct from old.manager_employee_id then
    update public.appointments
       set employee_id = new.manager_employee_id,
           assigned_manager_id = new.manager_employee_id
     where client_id = new.id
       and assigned_manager_id is null
       and status in ('PENDIENTE_VALIDACION','CONTACTANDO');
  end if;

  return new;
end;
$$;

drop trigger if exists clients_route_pending_showroom on public.clients;
create trigger clients_route_pending_showroom
after update of manager_employee_id on public.clients
for each row execute function private.route_pending_showroom_after_manager_assignment();
