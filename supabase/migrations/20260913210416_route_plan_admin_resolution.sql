-- 0.6.5-beta.16.3 — resolución administrativa no destructiva de rutas no ejecutadas.
-- Conserva siempre el plan original y sus paradas. Solo Administrador/Supervisor puede resolver.

alter table public.route_plans
  add column if not exists resolution_status text,
  add column if not exists resolution_reason text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists reprogrammed_route_id uuid references public.route_plans(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.route_plans'::regclass
      and conname='route_plans_resolution_status_check'
  ) then
    alter table public.route_plans
      add constraint route_plans_resolution_status_check
      check (resolution_status is null or resolution_status in ('REVISADA','ANULADA','REPROGRAMADA'));
  end if;
end $$;

create index if not exists idx_route_plans_resolution_queue
  on public.route_plans(route_date, resolution_status)
  where route_mode='PLANIFICADA' and plan_type in ('VISITAS','MIXTA');

create or replace function public.resolve_unstarted_route_plan(
  p_plan_id uuid,
  p_action text,
  p_reason text,
  p_new_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_plan public.route_plans%rowtype;
  v_action text := upper(btrim(coalesce(p_action,'')));
  v_reason text := btrim(coalesce(p_reason,''));
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_new_plan_id uuid;
  v_stop_count integer := 0;
  v_new_period_end date;
begin
  if not private.is_admin() then
    raise exception 'Solo Administración o Supervisión puede resolver rutas no ejecutadas.' using errcode='42501';
  end if;

  if v_action not in ('REVISADA','ANULADA','REPROGRAMADA') then
    raise exception 'Acción inválida. Usa REVISADA, ANULADA o REPROGRAMADA.';
  end if;
  if v_reason = '' then
    raise exception 'Indica el motivo de la resolución administrativa.';
  end if;

  select * into v_plan
  from public.route_plans
  where id=p_plan_id
  for update;

  if not found then raise exception 'La ruta no existe.'; end if;
  if v_plan.route_mode <> 'PLANIFICADA' or v_plan.plan_type not in ('VISITAS','MIXTA') then
    raise exception 'Solo se pueden resolver rutas planificadas de visitas.';
  end if;
  if v_plan.route_date >= v_today then
    raise exception 'La ruta todavía no está vencida.';
  end if;
  if v_plan.resolution_status is not null then
    raise exception 'La ruta ya fue resuelta administrativamente como %.', v_plan.resolution_status;
  end if;
  if exists(select 1 from public.route_sessions where route_plan_id=v_plan.id) then
    raise exception 'La ruta tiene actividad de jornada y debe resolverse mediante el cierre operativo correspondiente.';
  end if;
  if exists(
    select 1 from public.route_stops
    where route_plan_id=v_plan.id
      and (visit_id is not null or status <> 'PENDIENTE')
  ) then
    raise exception 'La ruta tiene actividad registrada en sus paradas y no puede resolverse como no ejecutada.';
  end if;

  select count(*)::integer into v_stop_count
  from public.route_stops where route_plan_id=v_plan.id;

  if v_action='REPROGRAMADA' then
    if p_new_date is null then raise exception 'Indica la nueva fecha de la ruta.'; end if;
    if p_new_date < v_today then raise exception 'La nueva fecha no puede estar en el pasado.'; end if;
    if exists(
      select 1 from public.route_plans rp
      where rp.employee_id=v_plan.employee_id
        and rp.route_date=p_new_date
        and rp.route_mode='PLANIFICADA'
        and rp.plan_type in ('VISITAS','MIXTA')
        and rp.status in ('PLANIFICADA','ACTIVA')
    ) then
      raise exception 'El vendedor ya tiene una ruta planificada o activa para la fecha seleccionada.';
    end if;

    v_new_period_end := case
      when v_plan.period_end_date is null then null
      else p_new_date + (v_plan.period_end_date - v_plan.route_date)
    end;

    insert into public.route_plans(
      employee_id,route_date,plan_type,territory_id,title,objective,target_visits,target_prospects,
      status,notes,created_by,updated_by,confirmed_at,confirmed_by,period_end_date,
      official_area_id,official_area_name,official_area_level,include_saturday,route_mode
    ) values (
      v_plan.employee_id,p_new_date,v_plan.plan_type,v_plan.territory_id,v_plan.title,v_plan.objective,
      v_plan.target_visits,v_plan.target_prospects,'PLANIFICADA',
      concat_ws(E'\n',nullif(v_plan.notes,''),'Reprogramada administrativamente desde '||v_plan.route_date::text||'. Motivo: '||v_reason),
      auth.uid(),auth.uid(),now(),auth.uid(),v_new_period_end,
      v_plan.official_area_id,v_plan.official_area_name,v_plan.official_area_level,v_plan.include_saturday,'PLANIFICADA'
    ) returning id into v_new_plan_id;

    insert into public.route_stops(
      route_plan_id,client_id,prospect_id,stop_order,priority,planned_time,status,visit_id,
      reason_not_visited,notes,created_by,updated_by,window_start,window_end,expected_duration_min,
      exception_reason_code,official_region_at_plan,official_province_at_plan,official_municipality_at_plan
    )
    select
      v_new_plan_id,client_id,prospect_id,stop_order,priority,planned_time,'PENDIENTE',null,
      null,notes,auth.uid(),auth.uid(),window_start,window_end,expected_duration_min,
      null,official_region_at_plan,official_province_at_plan,official_municipality_at_plan
    from public.route_stops
    where route_plan_id=v_plan.id
    order by stop_order;
  end if;

  update public.route_plans
  set resolution_status=v_action,
      resolution_reason=v_reason,
      resolved_at=now(),
      resolved_by=auth.uid(),
      reprogrammed_route_id=case when v_action='REPROGRAMADA' then v_new_plan_id else null end,
      updated_at=now(),
      updated_by=auth.uid()
  where id=v_plan.id;

  return jsonb_build_object(
    'route_plan_id',v_plan.id,
    'resolution_status',v_action,
    'resolution_reason',v_reason,
    'resolved_at',now(),
    'stop_count',v_stop_count,
    'reprogrammed_route_id',v_new_plan_id,
    'new_route_date',case when v_action='REPROGRAMADA' then p_new_date else null end
  );
end;
$$;

revoke all on function public.resolve_unstarted_route_plan(uuid,text,text,date) from public;
grant execute on function public.resolve_unstarted_route_plan(uuid,text,text,date) to authenticated;
