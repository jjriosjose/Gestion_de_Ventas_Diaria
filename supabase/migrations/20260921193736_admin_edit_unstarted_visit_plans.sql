create or replace function public.admin_update_unstarted_visit_plan(
  p_plan_id uuid,
  p_route_date date,
  p_client_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_plan public.route_plans%rowtype;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_total integer;
  v_unique integer;
  v_conflict text;
begin
  if not exists (
    select 1
    from public.employees e
    where e.auth_user_id = auth.uid()
      and e.active = true
      and e.app_role = 'Administrador'
  ) then
    raise exception 'Solo un usuario Administrador puede editar planificaciones.'
      using errcode = '42501';
  end if;

  if p_plan_id is null then
    raise exception 'Planificación inválida.';
  end if;

  if p_route_date is null then
    raise exception 'La fecha de ejecución es obligatoria.';
  end if;

  if p_route_date < v_today then
    raise exception 'La fecha de ejecución debe ser hoy o futura.';
  end if;

  if coalesce(array_length(p_client_ids,1),0) = 0 then
    raise exception 'La planificación debe conservar al menos un cliente.';
  end if;

  if exists (
    select 1
    from unnest(p_client_ids) as x(client_id)
    where x.client_id is null
  ) then
    raise exception 'La selección contiene un cliente inválido.';
  end if;

  select count(*), count(distinct x.client_id)
    into v_total, v_unique
  from unnest(p_client_ids) as x(client_id);

  if v_total <> v_unique then
    raise exception 'La selección contiene clientes duplicados.';
  end if;

  select *
    into v_plan
  from public.route_plans rp
  where rp.id = p_plan_id
  for update;

  if not found then
    raise exception 'La planificación no existe.';
  end if;

  if v_plan.plan_type <> 'VISITAS' or v_plan.route_mode <> 'PLANIFICADA' then
    raise exception 'Solo se pueden editar planificaciones de visitas.';
  end if;

  if v_plan.status not in ('BORRADOR','PLANIFICADA') then
    raise exception 'La planificación ya no está disponible para edición.';
  end if;

  if exists (
    select 1
    from public.route_sessions rs
    where rs.route_plan_id = p_plan_id
  ) then
    raise exception 'La planificación ya tiene una jornada asociada y no puede editarse.';
  end if;

  if exists (
    select 1
    from public.route_stops rs
    where rs.route_plan_id = p_plan_id
      and (rs.visit_id is not null or rs.status <> 'PENDIENTE')
  ) then
    raise exception 'La planificación ya tiene actividad de ejecución y no puede editarse.';
  end if;

  if exists (
    select 1
    from unnest(p_client_ids) as x(client_id)
    left join public.clients c on c.id = x.client_id
    where c.id is null
  ) then
    raise exception 'Uno o más clientes seleccionados ya no existen.';
  end if;

  select string_agg(conflict.legal_name, ', ' order by conflict.legal_name)
    into v_conflict
  from (
    select distinct c.legal_name
    from public.route_stops rs
    join public.route_plans rp on rp.id = rs.route_plan_id
    join public.clients c on c.id = rs.client_id
    where rp.id <> p_plan_id
      and rp.route_date = p_route_date
      and rp.plan_type = 'VISITAS'
      and rp.status <> 'CANCELADA'
      and rs.client_id = any(p_client_ids)
    order by c.legal_name
    limit 5
  ) conflict;

  if v_conflict is not null then
    raise exception 'Uno o más clientes ya están planificados para esa fecha: %', v_conflict;
  end if;

  update public.route_plans
  set route_date = p_route_date,
      target_visits = array_length(p_client_ids,1)
  where id = p_plan_id;

  delete from public.route_stops rs
  where rs.route_plan_id = p_plan_id
    and (
      rs.client_id is null
      or not (rs.client_id = any(p_client_ids))
    );

  with desired as (
    select x.client_id, x.ord::integer as stop_order
    from unnest(p_client_ids) with ordinality as x(client_id, ord)
  )
  update public.route_stops rs
  set stop_order = d.stop_order
  from desired d
  where rs.route_plan_id = p_plan_id
    and rs.client_id = d.client_id;

  insert into public.route_stops(
    route_plan_id,
    client_id,
    stop_order,
    priority,
    status
  )
  select
    p_plan_id,
    d.client_id,
    d.stop_order,
    'MEDIA',
    'PENDIENTE'
  from (
    select x.client_id, x.ord::integer as stop_order
    from unnest(p_client_ids) with ordinality as x(client_id, ord)
  ) d
  where not exists (
    select 1
    from public.route_stops rs
    where rs.route_plan_id = p_plan_id
      and rs.client_id = d.client_id
  );

  return jsonb_build_object(
    'route_plan_id', p_plan_id,
    'route_date', p_route_date,
    'target_visits', array_length(p_client_ids,1),
    'status', v_plan.status
  );
end;
$$;

revoke all on function public.admin_update_unstarted_visit_plan(uuid,date,uuid[]) from public, anon;
grant execute on function public.admin_update_unstarted_visit_plan(uuid,date,uuid[]) to authenticated;

create or replace function public.admin_delete_unstarted_visit_plan(
  p_plan_id uuid
)
returns text
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_plan public.route_plans%rowtype;
begin
  if not exists (
    select 1
    from public.employees e
    where e.auth_user_id = auth.uid()
      and e.active = true
      and e.app_role = 'Administrador'
  ) then
    raise exception 'Solo un usuario Administrador puede eliminar planificaciones.'
      using errcode = '42501';
  end if;

  select *
    into v_plan
  from public.route_plans rp
  where rp.id = p_plan_id
  for update;

  if not found then
    raise exception 'La planificación no existe.';
  end if;

  if v_plan.plan_type <> 'VISITAS' or v_plan.route_mode <> 'PLANIFICADA' then
    raise exception 'Solo se pueden eliminar planificaciones de visitas.';
  end if;

  if v_plan.status not in ('BORRADOR','PLANIFICADA') then
    raise exception 'La planificación ya no está disponible para eliminar.';
  end if;

  if exists (
    select 1
    from public.route_sessions rs
    where rs.route_plan_id = p_plan_id
  ) then
    raise exception 'La planificación ya tiene una jornada asociada y no puede eliminarse.';
  end if;

  if exists (
    select 1
    from public.route_stops rs
    where rs.route_plan_id = p_plan_id
      and (rs.visit_id is not null or rs.status <> 'PENDIENTE')
  ) then
    raise exception 'La planificación ya tiene actividad de ejecución y no puede eliminarse.';
  end if;

  delete from public.route_plans
  where id = p_plan_id;

  return 'DELETED';
end;
$$;

revoke all on function public.admin_delete_unstarted_visit_plan(uuid) from public, anon;
grant execute on function public.admin_delete_unstarted_visit_plan(uuid) to authenticated;
