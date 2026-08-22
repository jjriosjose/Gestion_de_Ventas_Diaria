create or replace function public.create_territory_radius(
  p_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_radius_m numeric,
  p_territory_type text default 'RADIO',
  p_notes text default null
)
returns uuid
language plpgsql
set search_path to ''
as $$
declare
  v_id uuid;
  v_center extensions.geography;
  v_geom extensions.geometry;
begin
  if not private.is_admin() then raise exception 'not authorized'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'name required'; end if;
  if p_latitude is null or p_longitude is null or p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then raise exception 'invalid center'; end if;
  if p_radius_m is null or p_radius_m <= 0 or p_radius_m > 100000 then raise exception 'invalid radius'; end if;

  v_center := extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography;
  v_geom := extensions.st_buffer(v_center, p_radius_m)::extensions.geometry;

  insert into public.territories(name, territory_type, geometry, center, radius_m, active, notes, created_by, updated_by)
  values (btrim(p_name), coalesce(nullif(btrim(p_territory_type), ''), 'RADIO'), v_geom, v_center, p_radius_m, true, p_notes, (select auth.uid()), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_territory_radius(text,double precision,double precision,numeric,text,text) to authenticated;

create or replace function public.delete_unstarted_route_plan(p_plan_id uuid)
returns text
language plpgsql
set search_path to ''
as $$
declare
  v_status text;
begin
  if not private.is_admin() then raise exception 'not authorized'; end if;
  select rp.status into v_status from public.route_plans rp where rp.id = p_plan_id for update;
  if v_status is null then raise exception 'plan not found'; end if;
  if v_status not in ('BORRADOR','PLANIFICADA') then raise exception 'only unstarted plans can be deleted'; end if;
  if exists (select 1 from public.route_sessions rs where rs.route_plan_id = p_plan_id) then raise exception 'plan already has route activity'; end if;
  if exists (select 1 from public.route_stops rs where rs.route_plan_id = p_plan_id and (rs.visit_id is not null or rs.status <> 'PENDIENTE')) then raise exception 'plan already has stop activity'; end if;
  delete from public.route_plans where id = p_plan_id;
  return 'DELETED';
end;
$$;

grant execute on function public.delete_unstarted_route_plan(uuid) to authenticated;
