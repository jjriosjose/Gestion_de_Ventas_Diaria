alter table public.prospects
  add column if not exists capture_mode text not null default 'LIBRE',
  add column if not exists gps_area_id uuid null references public.administrative_areas(id) on delete set null,
  add column if not exists gps_area_name text null,
  add column if not exists gps_area_level text null,
  add column if not exists district_municipality text null,
  add column if not exists within_assigned_area boolean null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.prospects'::regclass
      and conname='prospects_capture_mode_check'
  ) then
    alter table public.prospects
      add constraint prospects_capture_mode_check
      check (capture_mode in ('TAREA','LIBRE'));
  end if;
end $$;

create or replace function private.enrich_prospect_capture_context()
returns trigger
language plpgsql
set search_path=''
as $$
declare
  v_point extensions.geometry;
  v_region public.administrative_areas%rowtype;
  v_province public.administrative_areas%rowtype;
  v_municipality public.administrative_areas%rowtype;
  v_district public.administrative_areas%rowtype;
  v_official_area_id uuid;
  v_territory_id uuid;
  v_assignment_geom extensions.geometry;
begin
  new.capture_mode := case when new.capture_assignment_id is null then 'LIBRE' else 'TAREA' end;
  new.gps_area_id := null;
  new.gps_area_name := null;
  new.gps_area_level := null;
  new.region := null;
  new.province := null;
  new.municipality := null;
  new.district_municipality := null;
  new.within_assigned_area := null;

  if new.latitude is null or new.longitude is null then
    return new;
  end if;

  v_point := extensions.st_setsrid(extensions.st_makepoint(new.longitude,new.latitude),4326);

  select a.* into v_region
  from public.administrative_areas a
  where a.active=true and a.area_level='REGION'
    and a.geometry is not null
    and extensions.st_covers(a.geometry,v_point)
  limit 1;

  select a.* into v_province
  from public.administrative_areas a
  where a.active=true and a.area_level='PROVINCIA'
    and a.geometry is not null
    and extensions.st_covers(a.geometry,v_point)
  limit 1;

  select a.* into v_municipality
  from public.administrative_areas a
  where a.active=true and a.area_level='MUNICIPIO'
    and a.geometry is not null
    and extensions.st_covers(a.geometry,v_point)
  limit 1;

  select a.* into v_district
  from public.administrative_areas a
  where a.active=true and a.area_level='DISTRITO_MUNICIPAL'
    and a.geometry is not null
    and extensions.st_covers(a.geometry,v_point)
  limit 1;

  new.region := v_region.name;
  new.province := v_province.name;
  new.municipality := v_municipality.name;
  new.district_municipality := v_district.name;

  if v_district.id is not null then
    new.gps_area_id := v_district.id; new.gps_area_name := v_district.name; new.gps_area_level := v_district.area_level;
  elsif v_municipality.id is not null then
    new.gps_area_id := v_municipality.id; new.gps_area_name := v_municipality.name; new.gps_area_level := v_municipality.area_level;
  elsif v_province.id is not null then
    new.gps_area_id := v_province.id; new.gps_area_name := v_province.name; new.gps_area_level := v_province.area_level;
  elsif v_region.id is not null then
    new.gps_area_id := v_region.id; new.gps_area_name := v_region.name; new.gps_area_level := v_region.area_level;
  end if;

  if new.capture_assignment_id is not null then
    select rp.official_area_id,rp.territory_id
      into v_official_area_id,v_territory_id
    from public.route_plans rp
    where rp.id=new.capture_assignment_id and rp.plan_type='CAPTACION';

    if v_official_area_id is not null then
      select a.geometry into v_assignment_geom
      from public.administrative_areas a where a.id=v_official_area_id;
    elsif v_territory_id is not null then
      select t.geometry into v_assignment_geom
      from public.territories t where t.id=v_territory_id;
    end if;

    if v_assignment_geom is not null then
      new.within_assigned_area := extensions.st_covers(v_assignment_geom,v_point);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists zz_prospects_capture_context on public.prospects;
create trigger zz_prospects_capture_context
before insert or update of latitude,longitude,capture_assignment_id
on public.prospects
for each row execute function private.enrich_prospect_capture_context();

create or replace function public.preview_capture_context(
  p_latitude double precision,
  p_longitude double precision,
  p_capture_assignment_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_point extensions.geometry;
  v_region text;
  v_province text;
  v_municipality text;
  v_district text;
  v_official_area_id uuid;
  v_territory_id uuid;
  v_assignment_name text;
  v_assignment_geom extensions.geometry;
  v_inside boolean;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  if p_latitude is null or p_longitude is null or p_latitude < -90 or p_latitude > 90 or p_longitude < -180 or p_longitude > 180 then
    raise exception 'invalid coordinates';
  end if;
  v_point := extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326);

  select a.name into v_region from public.administrative_areas a where a.active=true and a.area_level='REGION' and a.geometry is not null and extensions.st_covers(a.geometry,v_point) limit 1;
  select a.name into v_province from public.administrative_areas a where a.active=true and a.area_level='PROVINCIA' and a.geometry is not null and extensions.st_covers(a.geometry,v_point) limit 1;
  select a.name into v_municipality from public.administrative_areas a where a.active=true and a.area_level='MUNICIPIO' and a.geometry is not null and extensions.st_covers(a.geometry,v_point) limit 1;
  select a.name into v_district from public.administrative_areas a where a.active=true and a.area_level='DISTRITO_MUNICIPAL' and a.geometry is not null and extensions.st_covers(a.geometry,v_point) limit 1;

  if p_capture_assignment_id is not null then
    select rp.official_area_id,rp.territory_id,coalesce(rp.official_area_name,rp.title)
      into v_official_area_id,v_territory_id,v_assignment_name
    from public.route_plans rp
    where rp.id=p_capture_assignment_id and rp.plan_type='CAPTACION';
    if v_official_area_id is not null then
      select a.geometry,coalesce(v_assignment_name,a.name) into v_assignment_geom,v_assignment_name from public.administrative_areas a where a.id=v_official_area_id;
    elsif v_territory_id is not null then
      select t.geometry,coalesce(v_assignment_name,t.name) into v_assignment_geom,v_assignment_name from public.territories t where t.id=v_territory_id;
    end if;
    if v_assignment_geom is not null then v_inside:=extensions.st_covers(v_assignment_geom,v_point); end if;
  end if;

  return jsonb_build_object(
    'region',v_region,'province',v_province,'municipality',v_municipality,'district_municipality',v_district,
    'capture_mode',case when p_capture_assignment_id is null then 'LIBRE' else 'TAREA' end,
    'assignment_name',v_assignment_name,'within_assigned_area',v_inside
  );
end;
$$;

revoke all on function public.preview_capture_context(double precision,double precision,uuid) from public;
grant execute on function public.preview_capture_context(double precision,double precision,uuid) to authenticated;

update public.prospects
set latitude=latitude
where latitude is not null and longitude is not null;