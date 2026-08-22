alter table public.clients
  add column if not exists geo_status text not null default 'SIN_VERIFICAR',
  add column if not exists geo_verified_at timestamptz,
  add column if not exists geo_verified_by uuid references auth.users(id) on delete set null;

alter table public.clients drop constraint if exists clients_geo_status_check;
alter table public.clients add constraint clients_geo_status_check check (geo_status in ('SIN_GEO','SIN_VERIFICAR','VERIFICADA','POSIBLE_ERROR'));

update public.clients
set geo_status = case when latitude is null or longitude is null then 'SIN_GEO' else 'SIN_VERIFICAR' end
where geo_status is null or geo_status = 'SIN_VERIFICAR';

alter table public.route_plans
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid references auth.users(id) on delete set null;

alter table public.route_stops
  add column if not exists window_start time,
  add column if not exists window_end time,
  add column if not exists expected_duration_min integer,
  add column if not exists exception_reason_code text;

create table if not exists public.client_visit_windows (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  check (end_time > start_time)
);
create index if not exists client_visit_windows_client_weekday_idx on public.client_visit_windows(client_id,weekday) where active;

create table if not exists public.administrative_areas (
  id uuid primary key default gen_random_uuid(),
  area_level text not null check (area_level in ('REGION','PROVINCIA','MUNICIPIO','LOCALIDAD')),
  code text,
  name text not null,
  parent_id uuid references public.administrative_areas(id) on delete set null,
  geometry extensions.geometry(MultiPolygon,4326),
  source text not null default 'ONE_RD',
  source_version text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique(area_level,code)
);
create index if not exists administrative_areas_geometry_gist on public.administrative_areas using gist(geometry);
create index if not exists administrative_areas_level_name_idx on public.administrative_areas(area_level,name);

create table if not exists public.geo_verification_events (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  captured_at timestamptz not null default now(),
  latitude double precision not null,
  longitude double precision not null,
  accuracy_m numeric,
  captured_location extensions.geography(Point,4326),
  distance_to_master_m numeric,
  current_region text,
  current_province text,
  current_municipality text,
  detected_region text,
  detected_province text,
  detected_municipality text,
  detected_locality text,
  status text not null default 'PENDIENTE' check (status in ('PENDIENTE','COINCIDE','DIFERENCIA','APROBADA','RECHAZADA')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  review_notes text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);
create index if not exists geo_verification_client_idx on public.geo_verification_events(client_id,captured_at desc);
create index if not exists geo_verification_status_idx on public.geo_verification_events(status,captured_at desc);
create index if not exists geo_verification_location_gist on public.geo_verification_events using gist(captured_location);

create or replace function private.geo_event_location()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.captured_location := extensions.st_setsrid(extensions.st_makepoint(new.longitude,new.latitude),4326)::extensions.geography;
  return new;
end;
$$;

drop trigger if exists geo_verification_set_location on public.geo_verification_events;
create trigger geo_verification_set_location before insert or update of latitude,longitude on public.geo_verification_events for each row execute function private.geo_event_location();
create trigger client_visit_windows_touch before update on public.client_visit_windows for each row execute function private.touch_updated_at();
create trigger administrative_areas_touch before update on public.administrative_areas for each row execute function private.touch_updated_at();

alter table public.client_visit_windows enable row level security;
alter table public.administrative_areas enable row level security;
alter table public.geo_verification_events enable row level security;

create policy "visit_windows_read_authenticated" on public.client_visit_windows for select to authenticated using (true);
create policy "visit_windows_admin_insert" on public.client_visit_windows for insert to authenticated with check (private.is_admin());
create policy "visit_windows_admin_update" on public.client_visit_windows for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "visit_windows_admin_delete" on public.client_visit_windows for delete to authenticated using (private.is_admin());
create policy "administrative_areas_read_authenticated" on public.administrative_areas for select to authenticated using (true);
create policy "administrative_areas_admin_insert" on public.administrative_areas for insert to authenticated with check (private.is_admin());
create policy "administrative_areas_admin_update" on public.administrative_areas for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "administrative_areas_admin_delete" on public.administrative_areas for delete to authenticated using (private.is_admin());
create policy "geo_verification_read_authenticated" on public.geo_verification_events for select to authenticated using (true);
create policy "geo_verification_insert_authenticated" on public.geo_verification_events for insert to authenticated with check (created_by = (select auth.uid()));
create policy "geo_verification_admin_update" on public.geo_verification_events for update to authenticated using (private.is_admin()) with check (private.is_admin());
create policy "geo_verification_admin_delete" on public.geo_verification_events for delete to authenticated using (private.is_admin());

create or replace function public.resolve_administrative_area(p_latitude double precision,p_longitude double precision)
returns table(region text,province text,municipality text,locality text)
language sql stable security invoker set search_path = '' as $$
  with p as (select extensions.st_setsrid(extensions.st_makepoint(p_longitude,p_latitude),4326) as geom)
  select
    (select a.name from public.administrative_areas a,p where a.active and a.area_level='REGION' and a.geometry is not null and extensions.st_covers(a.geometry,p.geom) limit 1),
    (select a.name from public.administrative_areas a,p where a.active and a.area_level='PROVINCIA' and a.geometry is not null and extensions.st_covers(a.geometry,p.geom) limit 1),
    (select a.name from public.administrative_areas a,p where a.active and a.area_level='MUNICIPIO' and a.geometry is not null and extensions.st_covers(a.geometry,p.geom) limit 1),
    (select a.name from public.administrative_areas a,p where a.active and a.area_level='LOCALIDAD' and a.geometry is not null and extensions.st_covers(a.geometry,p.geom) limit 1);
$$;
revoke all on function public.resolve_administrative_area(double precision,double precision) from public,anon;
grant execute on function public.resolve_administrative_area(double precision,double precision) to authenticated;

create or replace function public.record_geo_verification_from_visit(p_visit_id uuid)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_visit public.visits%rowtype; v_client public.clients%rowtype;
  v_lat double precision; v_lon double precision; v_accuracy numeric;
  v_region text; v_province text; v_municipality text; v_locality text;
  v_status text; v_distance numeric; v_id uuid;
begin
  select * into v_visit from public.visits where id=p_visit_id;
  if v_visit.id is null or v_visit.client_id is null then raise exception 'visit/client required'; end if;
  if not private.is_admin() and v_visit.employee_id <> private.current_employee_id() then raise exception 'not authorized'; end if;
  select * into v_client from public.clients where id=v_visit.client_id;
  v_lat := coalesce(v_visit.start_latitude,v_visit.end_latitude);
  v_lon := coalesce(v_visit.start_longitude,v_visit.end_longitude);
  v_accuracy := coalesce(v_visit.start_accuracy_m,v_visit.end_accuracy_m);
  if v_lat is null or v_lon is null then raise exception 'visit has no geolocation'; end if;
  select r.region,r.province,r.municipality,r.locality into v_region,v_province,v_municipality,v_locality from public.resolve_administrative_area(v_lat,v_lon) r;
  if v_client.location is not null then v_distance := extensions.st_distance(v_client.location,extensions.st_setsrid(extensions.st_makepoint(v_lon,v_lat),4326)::extensions.geography); end if;
  if v_region is null and v_province is null and v_municipality is null then v_status := 'PENDIENTE';
  elsif coalesce(upper(v_client.region),'')=coalesce(upper(v_region),'') and coalesce(upper(v_client.province),'')=coalesce(upper(v_province),'') and coalesce(upper(v_client.municipality),'')=coalesce(upper(v_municipality),'') then v_status := 'COINCIDE';
  else v_status := 'DIFERENCIA'; end if;
  insert into public.geo_verification_events(client_id,visit_id,employee_id,latitude,longitude,accuracy_m,distance_to_master_m,current_region,current_province,current_municipality,detected_region,detected_province,detected_municipality,detected_locality,status,created_by)
  values(v_client.id,v_visit.id,v_visit.employee_id,v_lat,v_lon,v_accuracy,v_distance,v_client.region,v_client.province,v_client.municipality,v_region,v_province,v_municipality,v_locality,v_status,(select auth.uid())) returning id into v_id;
  if v_status='COINCIDE' and (v_accuracy is null or v_accuracy <= 100) then update public.clients set geo_status='VERIFICADA',geo_verified_at=now(),geo_verified_by=(select auth.uid()) where id=v_client.id;
  elsif v_status='DIFERENCIA' then update public.clients set geo_status='POSIBLE_ERROR' where id=v_client.id; end if;
  return v_id;
end;
$$;
revoke all on function public.record_geo_verification_from_visit(uuid) from public,anon;
grant execute on function public.record_geo_verification_from_visit(uuid) to authenticated;

create or replace function public.review_geo_verification(p_event_id uuid,p_action text,p_update_coordinates boolean default false,p_notes text default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare v public.geo_verification_events%rowtype;
begin
  if not private.is_admin() then raise exception 'not authorized'; end if;
  select * into v from public.geo_verification_events where id=p_event_id;
  if v.id is null then raise exception 'event not found'; end if;
  if upper(p_action)='APROBAR' then
    update public.clients set region=coalesce(v.detected_region,region),province=coalesce(v.detected_province,province),municipality=coalesce(v.detected_municipality,municipality),latitude=case when p_update_coordinates then v.latitude else latitude end,longitude=case when p_update_coordinates then v.longitude else longitude end,geo_status='VERIFICADA',geo_verified_at=now(),geo_verified_by=(select auth.uid()),updated_by=(select auth.uid()) where id=v.client_id;
    update public.geo_verification_events set status='APROBADA',reviewed_at=now(),reviewed_by=(select auth.uid()),review_notes=p_notes where id=v.id;
  elsif upper(p_action)='RECHAZAR' then
    update public.geo_verification_events set status='RECHAZADA',reviewed_at=now(),reviewed_by=(select auth.uid()),review_notes=p_notes where id=v.id;
    update public.clients set geo_status=case when latitude is null or longitude is null then 'SIN_GEO' else 'SIN_VERIFICAR' end where id=v.client_id;
  else raise exception 'invalid action'; end if;
end;
$$;
revoke all on function public.review_geo_verification(uuid,text,boolean,text) from public,anon;
grant execute on function public.review_geo_verification(uuid,text,boolean,text) to authenticated;

create or replace function public.upsert_administrative_area_geojson(p_level text,p_code text,p_name text,p_geojson jsonb,p_parent_id uuid default null,p_source text default 'ONE_RD',p_source_version text default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_geom extensions.geometry; v_id uuid;
begin
  if not private.is_admin() then raise exception 'not authorized'; end if;
  v_geom := extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(p_geojson::text),4326));
  if extensions.st_geometrytype(v_geom) <> 'ST_MultiPolygon' then raise exception 'polygon required'; end if;
  insert into public.administrative_areas(area_level,code,name,parent_id,geometry,source,source_version,created_by,updated_by)
  values(upper(p_level),p_code,p_name,p_parent_id,v_geom,coalesce(p_source,'ONE_RD'),p_source_version,(select auth.uid()),(select auth.uid()))
  on conflict(area_level,code) do update set name=excluded.name,parent_id=excluded.parent_id,geometry=excluded.geometry,source=excluded.source,source_version=excluded.source_version,active=true,updated_by=(select auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.upsert_administrative_area_geojson(text,text,text,jsonb,uuid,text,text) from public,anon;
grant execute on function public.upsert_administrative_area_geojson(text,text,text,jsonb,uuid,text,text) to authenticated;

insert into public.catalog_options(category,code,label,sort_order) values
 ('ROUTE_PLAN_STATUS','BORRADOR','Borrador',10),('ROUTE_PLAN_STATUS','PLANIFICADA','Planificada',20),('ROUTE_PLAN_STATUS','CONFIRMADA','Confirmada',30),('ROUTE_PLAN_STATUS','EN_CURSO','En curso',40),('ROUTE_PLAN_STATUS','FINALIZADA','Finalizada',50),('ROUTE_PLAN_STATUS','CANCELADA','Cancelada',60),
 ('ROUTE_EXCEPTION','CLIENTE_CERRADO','Cliente cerrado',10),('ROUTE_EXCEPTION','NO_ESTABA_RESPONSABLE','No estaba el responsable',20),('ROUTE_EXCEPTION','REPROGRAMADA','Visita reprogramada',30),('ROUTE_EXCEPTION','DIRECCION_INCORRECTA','Dirección incorrecta',40),('ROUTE_EXCEPTION','NO_LOCALIZADO','Cliente no localizado',50),('ROUTE_EXCEPTION','CAMBIO_RUTA','Cambio de ruta',60),('ROUTE_EXCEPTION','OPORTUNIDAD_TRAYECTO','Oportunidad encontrada en trayecto',70),('ROUTE_EXCEPTION','OTRO','Otro',99)
on conflict(category,code) do update set label=excluded.label,sort_order=excluded.sort_order,active=true;

create or replace view public.geo_quality_summary with (security_invoker=true) as select geo_status,count(*)::bigint as clients from public.clients group by geo_status;
grant select on public.geo_quality_summary to authenticated;
