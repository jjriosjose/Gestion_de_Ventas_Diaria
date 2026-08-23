alter table public.administrative_areas
  drop constraint if exists administrative_areas_area_level_check;

alter table public.administrative_areas
  add constraint administrative_areas_area_level_check
  check (area_level in ('REGION','PROVINCIA','MUNICIPIO','DISTRITO_MUNICIPAL','LOCALIDAD'));

update public.administrative_areas
set source_version='legacy'
where source_version is null or btrim(source_version)='';

alter table public.administrative_areas
  alter column source_version set default 'legacy',
  alter column source_version set not null;

alter table public.administrative_areas
  drop constraint if exists administrative_areas_area_level_code_key;

drop index if exists public.administrative_areas_source_level_code_uq;

alter table public.administrative_areas
  add constraint administrative_areas_source_version_level_code_key
  unique(source,source_version,area_level,code);

create index if not exists administrative_areas_active_source_level_idx
  on public.administrative_areas(source,area_level,active)
  where active;

create or replace function public.begin_administrative_area_sync(p_source text)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if (select auth.role()) <> 'service_role' and not private.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_source is null or btrim(p_source)='' then
    raise exception 'source required';
  end if;
  -- Do not deactivate the current version. New versions are staged inactive
  -- and switched on only after finalize validates the complete hierarchy.
end
$$;

create or replace function public.ingest_administrative_areas(
  p_items jsonb,
  p_source text,
  p_source_version text
)
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  r jsonb;
  n integer:=0;
  g extensions.geometry;
  v_level text;
  v_code text;
  v_name text;
begin
  if (select auth.role()) <> 'service_role' and not private.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_source is null or btrim(p_source)='' then raise exception 'source required'; end if;
  if p_source_version is null or btrim(p_source_version)='' then raise exception 'source version required'; end if;

  for r in select value from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
    v_level:=upper(coalesce(r->>'level',''));
    v_code:=coalesce(nullif(r->>'code',''),nullif(r->>'feature_id',''));
    v_name:=coalesce(nullif(r->>'name',''),v_code);

    if v_level not in ('REGION','PROVINCIA','MUNICIPIO','DISTRITO_MUNICIPAL','LOCALIDAD') then
      raise exception 'invalid administrative level: %',v_level;
    end if;
    if v_code is null then raise exception 'administrative code required'; end if;
    if v_name is null then raise exception 'administrative name required'; end if;
    if r->'geometry' is null then raise exception 'geometry required for %/%',v_level,v_code; end if;

    g:=extensions.st_setsrid(
      extensions.st_multi(
        extensions.st_collectionextract(
          extensions.st_makevalid(extensions.st_geomfromgeojson((r->'geometry')::text)),
          3
        )
      ),
      4326
    );

    if extensions.st_isempty(g) or not extensions.st_isvalid(g) then
      raise exception 'invalid geometry for %/%',v_level,v_code;
    end if;

    insert into public.administrative_areas(
      area_level,code,name,geometry,source,source_version,
      source_layer,source_properties,active,updated_at
    )
    values(
      v_level,v_code,v_name,g,p_source,p_source_version,
      r->>'layer',coalesce(r->'properties','{}'::jsonb),false,now()
    )
    on conflict(source,source_version,area_level,code) do update set
      name=excluded.name,
      geometry=excluded.geometry,
      source_layer=excluded.source_layer,
      source_properties=excluded.source_properties,
      active=false,
      updated_at=now();

    n:=n+1;
  end loop;

  return n;
end
$$;

create or replace function public.finalize_administrative_area_sync(
  p_source text,
  p_source_version text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  r_count integer;
  p_count integer;
  m_count integer;
  d_count integer;
  bad_geometry integer;
  missing_province_parent integer;
  missing_municipality_parent integer;
  missing_district_parent integer;
begin
  if (select auth.role()) <> 'service_role' and not private.is_admin() then
    raise exception 'not authorized';
  end if;
  if p_source is null or btrim(p_source)='' then raise exception 'source required'; end if;
  if p_source_version is null or btrim(p_source_version)='' then raise exception 'source version required'; end if;

  select
    count(*) filter(where area_level='REGION'),
    count(*) filter(where area_level='PROVINCIA'),
    count(*) filter(where area_level='MUNICIPIO'),
    count(*) filter(where area_level='DISTRITO_MUNICIPAL'),
    count(*) filter(where geometry is null or extensions.st_isempty(geometry) or not extensions.st_isvalid(geometry))
  into r_count,p_count,m_count,d_count,bad_geometry
  from public.administrative_areas
  where source=p_source and source_version=p_source_version;

  if r_count<>10 or p_count<>32 or m_count<>158 or d_count<>393 then
    raise exception 'territorial version incomplete: regions %, provinces %, municipalities %, districts %',
      r_count,p_count,m_count,d_count;
  end if;
  if bad_geometry<>0 then
    raise exception 'territorial version contains % invalid geometries',bad_geometry;
  end if;

  update public.administrative_areas child
  set parent_id=parent.id,updated_at=now()
  from public.administrative_areas parent
  where child.source=p_source
    and child.source_version=p_source_version
    and parent.source=p_source
    and parent.source_version=p_source_version
    and child.area_level='PROVINCIA'
    and parent.area_level='REGION'
    and child.geometry is not null
    and parent.geometry is not null
    and extensions.st_covers(parent.geometry,extensions.st_pointonsurface(child.geometry));

  update public.administrative_areas child
  set parent_id=parent.id,updated_at=now()
  from public.administrative_areas parent
  where child.source=p_source
    and child.source_version=p_source_version
    and parent.source=p_source
    and parent.source_version=p_source_version
    and child.area_level='MUNICIPIO'
    and parent.area_level='PROVINCIA'
    and child.geometry is not null
    and parent.geometry is not null
    and extensions.st_covers(parent.geometry,extensions.st_pointonsurface(child.geometry));

  update public.administrative_areas child
  set parent_id=parent.id,updated_at=now()
  from public.administrative_areas parent
  where child.source=p_source
    and child.source_version=p_source_version
    and parent.source=p_source
    and parent.source_version=p_source_version
    and child.area_level='DISTRITO_MUNICIPAL'
    and parent.area_level='MUNICIPIO'
    and child.geometry is not null
    and parent.geometry is not null
    and extensions.st_covers(parent.geometry,extensions.st_pointonsurface(child.geometry));

  select count(*) into missing_province_parent
  from public.administrative_areas
  where source=p_source and source_version=p_source_version
    and area_level='PROVINCIA' and parent_id is null;

  select count(*) into missing_municipality_parent
  from public.administrative_areas
  where source=p_source and source_version=p_source_version
    and area_level='MUNICIPIO' and parent_id is null;

  select count(*) into missing_district_parent
  from public.administrative_areas
  where source=p_source and source_version=p_source_version
    and area_level='DISTRITO_MUNICIPAL' and parent_id is null;

  if missing_province_parent<>0 or missing_municipality_parent<>0 or missing_district_parent<>0 then
    raise exception 'territorial hierarchy incomplete: province parents %, municipality parents %, district parents %',
      missing_province_parent,missing_municipality_parent,missing_district_parent;
  end if;

  update public.administrative_areas
  set active=(source_version=p_source_version),updated_at=now()
  where source=p_source;

  return jsonb_build_object(
    'source',p_source,
    'source_version',p_source_version,
    'regions',r_count,
    'provinces',p_count,
    'municipalities',m_count,
    'municipal_districts',d_count,
    'active',true
  );
end
$$;

create or replace function public.finalize_administrative_area_sync(p_source text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_version text;
begin
  if (select auth.role()) <> 'service_role' and not private.is_admin() then
    raise exception 'not authorized';
  end if;

  select source_version into v_version
  from public.administrative_areas
  where source=p_source
  group by source_version
  order by max(updated_at) desc
  limit 1;

  if v_version is null then raise exception 'no staged territorial version found'; end if;
  return public.finalize_administrative_area_sync(p_source,v_version);
end
$$;

create or replace function public.upsert_administrative_area_geojson(
  p_level text,
  p_code text,
  p_name text,
  p_geojson jsonb,
  p_parent_id uuid default null,
  p_source text default 'ONE_RD',
  p_source_version text default null
)
returns uuid
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_geom extensions.geometry;
  v_id uuid;
  v_version text:=coalesce(nullif(btrim(p_source_version),''),'manual');
begin
  if not private.is_admin() then raise exception 'not authorized'; end if;
  v_geom:=extensions.st_setsrid(
    extensions.st_multi(
      extensions.st_collectionextract(
        extensions.st_makevalid(extensions.st_geomfromgeojson(p_geojson::text)),3
      )
    ),4326
  );
  if extensions.st_isempty(v_geom) or not extensions.st_isvalid(v_geom) then
    raise exception 'valid polygon required';
  end if;

  insert into public.administrative_areas(
    area_level,code,name,parent_id,geometry,source,source_version,
    active,created_by,updated_by
  )
  values(
    upper(p_level),p_code,p_name,p_parent_id,v_geom,
    coalesce(nullif(btrim(p_source),''),'ONE_RD'),v_version,
    true,(select auth.uid()),(select auth.uid())
  )
  on conflict(source,source_version,area_level,code) do update set
    name=excluded.name,
    parent_id=excluded.parent_id,
    geometry=excluded.geometry,
    active=true,
    updated_at=now(),
    updated_by=(select auth.uid())
  returning id into v_id;

  return v_id;
end
$$;

create or replace function public.resolve_administrative_area(
  p_latitude double precision,
  p_longitude double precision
)
returns table(region text,province text,municipality text,locality text)
language sql
stable
security invoker
set search_path=''
as $$
  with p as (
    select extensions.st_setsrid(
      extensions.st_makepoint(p_longitude,p_latitude),4326
    ) as geom
  )
  select
    (select a.name from public.administrative_areas a,p
      where a.active and a.area_level='REGION' and a.geometry is not null
        and extensions.st_covers(a.geometry,p.geom)
      order by a.updated_at desc limit 1),
    (select a.name from public.administrative_areas a,p
      where a.active and a.area_level='PROVINCIA' and a.geometry is not null
        and extensions.st_covers(a.geometry,p.geom)
      order by a.updated_at desc limit 1),
    (select a.name from public.administrative_areas a,p
      where a.active and a.area_level='MUNICIPIO' and a.geometry is not null
        and extensions.st_covers(a.geometry,p.geom)
      order by a.updated_at desc limit 1),
    (select a.name from public.administrative_areas a,p
      where a.active and a.area_level in ('DISTRITO_MUNICIPAL','LOCALIDAD') and a.geometry is not null
        and extensions.st_covers(a.geometry,p.geom)
      order by case when a.area_level='DISTRITO_MUNICIPAL' then 0 else 1 end,a.updated_at desc
      limit 1);
$$;

revoke all on function public.begin_administrative_area_sync(text) from public,anon;
revoke all on function public.ingest_administrative_areas(jsonb,text,text) from public,anon;
revoke all on function public.finalize_administrative_area_sync(text) from public,anon;
revoke all on function public.finalize_administrative_area_sync(text,text) from public,anon;
revoke all on function public.resolve_administrative_area(double precision,double precision) from public,anon;

grant execute on function public.begin_administrative_area_sync(text) to authenticated,service_role;
grant execute on function public.ingest_administrative_areas(jsonb,text,text) to authenticated,service_role;
grant execute on function public.finalize_administrative_area_sync(text) to authenticated,service_role;
grant execute on function public.finalize_administrative_area_sync(text,text) to authenticated,service_role;
grant execute on function public.resolve_administrative_area(double precision,double precision) to authenticated;
