do $$
declare
  v_session record;
  v_plan_id uuid;
  v_plan_code text;
begin
  for v_session in
    select rs.*, e.auth_user_id
    from public.route_sessions rs
    join public.employees e on e.id = rs.employee_id
    where rs.route_plan_id is null
      and rs.status = 'ACTIVA'
      and rs.ended_at is null
      and rs.session_date = (now() at time zone 'America/Santo_Domingo')::date
      and e.employee_type = 'Vendedor'
      and e.active = true
    order by rs.started_at
  loop
    select rp.id
      into v_plan_id
    from public.route_plans rp
    where rp.employee_id = v_session.employee_id
      and rp.route_date = v_session.session_date
      and rp.route_mode = 'LIBRE'
    order by rp.created_at
    limit 1;

    if v_plan_id is null then
      v_plan_code := 'OPEN-' || to_char(v_session.session_date,'YYYYMMDD') || '-' ||
                     left(replace(v_session.employee_id::text,'-',''),8) || '-' ||
                     upper(left(replace(v_session.id::text,'-',''),6));

      insert into public.route_plans(
        plan_code,
        employee_id,
        route_date,
        plan_type,
        title,
        objective,
        target_visits,
        status,
        notes,
        route_mode,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) values (
        v_plan_code,
        v_session.employee_id,
        v_session.session_date,
        case when v_session.session_type in ('VISITAS','MIXTA') then v_session.session_type else 'VISITAS' end,
        'Jornada libre · ' || to_char(v_session.session_date,'DD/MM/YYYY'),
        'Jornada abierta de visitas no planificadas',
        0,
        'ACTIVA',
        'Contenedor operativo reconstruido automáticamente para conservar la sesión original, su hora y GPS de inicio.',
        'LIBRE',
        v_session.started_at,
        now(),
        coalesce(v_session.created_by, v_session.auth_user_id),
        coalesce(v_session.updated_by, v_session.auth_user_id)
      )
      returning id into v_plan_id;
    end if;

    update public.route_sessions
    set route_plan_id = v_plan_id,
        updated_at = now(),
        updated_by = coalesce(updated_by, v_session.auth_user_id)
    where id = v_session.id
      and route_plan_id is null;
  end loop;

  if exists (select 1 from public.route_sessions where route_plan_id is null) then
    raise exception 'Persisten sesiones sin route_plan_id; se cancela la protección para evitar pérdida de integridad.';
  end if;
end $$;

alter table public.route_sessions
  alter column route_plan_id set not null;

comment on column public.route_sessions.route_plan_id is
  'Toda jornada operativa debe pertenecer a un route_plan. Las jornadas libres crean su plan contenedor mediante start_open_journey.';
