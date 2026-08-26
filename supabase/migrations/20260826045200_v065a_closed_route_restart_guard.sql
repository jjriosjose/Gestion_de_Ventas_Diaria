create unique index if not exists route_sessions_route_plan_unique_idx
on public.route_sessions(route_plan_id)
where route_plan_id is not null;

create or replace function private.enforce_route_session_operational_date()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
declare
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_route_date date;
  v_route_status text;
begin
  if new.session_date is distinct from v_today then
    raise exception 'La jornada solo puede iniciarse en la fecha operativa actual (%). Fecha recibida: %.', v_today, new.session_date;
  end if;

  if new.route_plan_id is not null then
    select rp.route_date, rp.status
      into v_route_date, v_route_status
    from public.route_plans rp
    where rp.id = new.route_plan_id;

    if v_route_date is null then
      raise exception 'No se encontró la planificación asociada a la jornada.';
    end if;

    if v_route_status is distinct from 'PLANIFICADA' then
      raise exception 'La ruta no puede iniciarse porque su estado actual es %. Solo una ruta PLANIFICADA puede iniciar jornada.', coalesce(v_route_status,'SIN ESTADO');
    end if;

    if exists (
      select 1
      from public.route_sessions rs
      where rs.route_plan_id = new.route_plan_id
    ) then
      raise exception 'Esta ruta ya tiene una jornada registrada y no puede iniciarse nuevamente.';
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
