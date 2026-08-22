create or replace function public.create_territory_polygon(
  p_name text,
  p_geojson jsonb,
  p_territory_type text default 'POLYGON',
  p_notes text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_geom extensions.geometry;
begin
  if not private.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'name required';
  end if;
  v_geom := extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text), 4326);
  if extensions.st_geometrytype(v_geom) not in ('ST_Polygon','ST_MultiPolygon') then
    raise exception 'polygon required';
  end if;
  insert into public.territories(name, territory_type, geometry, center, active, notes, created_by, updated_by)
  values (
    btrim(p_name),
    coalesce(nullif(btrim(p_territory_type),''),'POLYGON'),
    v_geom,
    extensions.st_centroid(v_geom)::extensions.geography,
    true,
    p_notes,
    (select auth.uid()),
    (select auth.uid())
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.create_territory_polygon(text,jsonb,text,text) from public, anon;
grant execute on function public.create_territory_polygon(text,jsonb,text,text) to authenticated;
