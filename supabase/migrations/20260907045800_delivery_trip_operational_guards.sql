-- Delivery V1: operational state guards before production.
-- 1) A trip can only transition to COMPLETED after RETURNING.
-- 2) A trip with an open incident cannot be completed.
-- 3) New incidents cannot be created for completed/cancelled trips.

create or replace function private.delivery_trip_completion_guard()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    if old.status is distinct from 'RETURNING' then
      raise exception 'Debes iniciar el retorno a base antes de cerrar el viaje.';
    end if;

    if exists (
      select 1
      from public.delivery_incidents i
      where i.trip_id = new.id
        and i.status = 'OPEN'
    ) then
      raise exception 'Resuelve las incidencias abiertas antes de cerrar el viaje.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_delivery_trip_completion_guard on public.delivery_trips;
create trigger trg_delivery_trip_completion_guard
before update of status on public.delivery_trips
for each row
execute function private.delivery_trip_completion_guard();

create or replace function private.delivery_incident_open_trip_guard()
returns trigger
language plpgsql
set search_path = public, private
as $$
declare
  v_trip_status text;
begin
  select t.status
    into v_trip_status
  from public.delivery_trips t
  where t.id = new.trip_id;

  if v_trip_status in ('COMPLETED', 'CANCELLED') then
    raise exception 'El viaje ya está cerrado y no acepta nuevas incidencias.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_delivery_incident_open_trip_guard on public.delivery_incidents;
create trigger trg_delivery_incident_open_trip_guard
before insert on public.delivery_incidents
for each row
execute function private.delivery_incident_open_trip_guard();
