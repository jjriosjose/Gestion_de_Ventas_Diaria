create unique index if not exists route_plans_one_free_per_employee_day_idx
  on public.route_plans(employee_id, route_date)
  where route_mode = 'LIBRE';

create or replace function public.start_open_journey(
  p_start_latitude double precision default null,
  p_start_longitude double precision default null,
  p_start_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_employee_id uuid := private.current_employee_id();
  v_employee public.employees%rowtype;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_plan_id uuid;
  v_session_id uuid;
  v_started_at timestamptz;
  v_plan_code text;
  v_title text;
begin
  if v_employee_id is null then
    raise exception 'No se pudo identificar al empleado autenticado.' using errcode = '42501';
  end if;

  select * into v_employee
  from public.employees
  where id = v_employee_id
    and active = true;

  if not found or v_employee.employee_type <> 'Vendedor' then
    raise exception 'La jornada libre solo está disponible para vendedores activos.' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.route_sessions rs
    where rs.employee_id = v_employee_id
      and rs.status = 'ACTIVA'
      and rs.ended_at is null
  ) then
    raise exception 'Ya tienes una jornada activa. Finalízala antes de iniciar otra.';
  end if;

  if exists (
    select 1
    from public.route_plans rp
    where rp.employee_id = v_employee_id
      and rp.route_date = v_today
      and rp.route_mode = 'LIBRE'
  ) then
    raise exception 'La Jornada Libre de hoy ya fue creada. Si fue finalizada, no puede iniciarse otra hasta el próximo día.';
  end if;

  if exists (
    select 1
    from public.route_plans rp
    where rp.employee_id = v_employee_id
      and rp.route_date = v_today
      and rp.route_mode = 'PLANIFICADA'
      and rp.status in ('PLANIFICADA','ACTIVA')
  ) then
    raise exception 'Tienes una ruta planificada disponible para hoy. Iníciala y usa Visita adicional para clientes fuera del plan.';
  end if;

  v_plan_code := 'OPEN-' || to_char(v_today,'YYYYMMDD') || '-' || left(replace(v_employee_id::text,'-',''),8) || '-' || upper(left(replace(gen_random_uuid()::text,'-',''),6));
  v_title := 'Jornada libre · ' || to_char(v_today,'DD/MM/YYYY');

  insert into public.route_plans(
    plan_code, employee_id, route_date, plan_type, title, objective,
    target_visits, status, notes, route_mode, created_by, updated_by
  ) values (
    v_plan_code, v_employee_id, v_today, 'VISITAS', v_title,
    'Jornada abierta de visitas no planificadas', 0, 'PLANIFICADA',
    'Contenedor operativo autogenerado por el vendedor.', 'LIBRE',
    auth.uid(), auth.uid()
  ) returning id into v_plan_id;

  insert into public.route_sessions(
    route_plan_id, employee_id, session_date, session_type, status,
    start_latitude, start_longitude, start_accuracy_m, created_by, updated_by
  ) values (
    v_plan_id, v_employee_id, v_today, 'VISITAS', 'ACTIVA',
    p_start_latitude, p_start_longitude, p_start_accuracy_m, auth.uid(), auth.uid()
  ) returning id, started_at into v_session_id, v_started_at;

  update public.route_plans
  set status = 'ACTIVA'
  where id = v_plan_id
    and status = 'PLANIFICADA';

  return jsonb_build_object(
    'route_plan_id', v_plan_id,
    'route_session_id', v_session_id,
    'route_mode', 'LIBRE',
    'title', v_title,
    'route_date', v_today,
    'started_at', v_started_at
  );
end;
$$;

revoke all on function public.start_open_journey(double precision,double precision,numeric) from public, anon;
grant execute on function public.start_open_journey(double precision,double precision,numeric) to authenticated;
