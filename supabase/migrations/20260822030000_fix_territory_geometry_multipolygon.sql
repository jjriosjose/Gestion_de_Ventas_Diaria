create or replace function public.create_territory_polygon(
  p_name text,
  p_geojson jsonb,
  p_territory_type text default 'POLIGONO',
  p_notes text default null
)
returns uuid
language plpgsql
set search_path to ''
as $$
declare
  v_id uuid;
  v_geom extensions.geometry;
begin
  if not private.is_admin() then raise exception 'not authorized'; end if;
  if p_name is null or btrim(p_name) = '' then raise exception 'name required'; end if;
  v_geom := extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326);
  if extensions.st_geometrytype(v_geom) not in ('ST_Polygon','ST_MultiPolygon') then raise exception 'polygon required'; end if;
  v_geom := extensions.st_multi(v_geom);
  insert into public.territories(name, territory_type, geometry, center, active, notes, created_by, updated_by)
  values (btrim(p_name), coalesce(nullif(btrim(p_territory_type),''),'POLIGONO'), v_geom, extensions.st_centroid(v_geom)::extensions.geography, true, p_notes, (select auth.uid()), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_territory_polygon(text,jsonb,text,text) to authenticated;

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
  v_geom := extensions.st_multi(extensions.st_buffer(v_center, p_radius_m)::extensions.geometry);
  insert into public.territories(name, territory_type, geometry, center, radius_m, active, notes, created_by, updated_by)
  values (btrim(p_name), coalesce(nullif(btrim(p_territory_type), ''), 'RADIO'), v_geom, v_center, p_radius_m, true, p_notes, (select auth.uid()), (select auth.uid()))
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.create_territory_radius(text,double precision,double precision,numeric,text,text) to authenticated;
