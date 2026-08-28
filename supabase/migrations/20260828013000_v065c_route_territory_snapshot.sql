-- V0.6.5-beta.9 — snapshot territorial oficial por parada.
-- Evita que futuras correcciones geográficas reescriban silenciosamente el territorio histórico de una jornada.

alter table public.route_stops
  add column if not exists official_region_at_plan text,
  add column if not exists official_province_at_plan text,
  add column if not exists official_municipality_at_plan text;

update public.route_stops rs
set official_region_at_plan = coalesce(rs.official_region_at_plan,cga.detected_region),
    official_province_at_plan = coalesce(rs.official_province_at_plan,cga.detected_province),
    official_municipality_at_plan = coalesce(rs.official_municipality_at_plan,cga.detected_municipality)
from public.client_geo_assessments cga
where cga.client_id=rs.client_id
  and (rs.official_region_at_plan is null or rs.official_province_at_plan is null or rs.official_municipality_at_plan is null);

create or replace function private.stamp_route_stop_official_territory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_region text;
  v_province text;
  v_municipality text;
begin
  if new.client_id is null then return new; end if;
  if tg_op='UPDATE' and new.client_id is not distinct from old.client_id
     and new.official_region_at_plan is not null
     and new.official_province_at_plan is not null
     and new.official_municipality_at_plan is not null then
    return new;
  end if;

  select cga.detected_region,cga.detected_province,cga.detected_municipality
    into v_region,v_province,v_municipality
  from public.client_geo_assessments cga
  where cga.client_id=new.client_id;

  new.official_region_at_plan := coalesce(new.official_region_at_plan,v_region);
  new.official_province_at_plan := coalesce(new.official_province_at_plan,v_province);
  new.official_municipality_at_plan := coalesce(new.official_municipality_at_plan,v_municipality);
  return new;
end;
$$;

drop trigger if exists trg_route_stops_official_territory on public.route_stops;
create trigger trg_route_stops_official_territory
before insert or update of client_id on public.route_stops
for each row execute function private.stamp_route_stop_official_territory();

create or replace view public.executive_route_journey_territories
with (security_invoker = true)
as
select
  rp.id as route_plan_id,
  array_remove(array_agg(distinct rs.official_region_at_plan),null) as official_regions,
  array_remove(array_agg(distinct rs.official_province_at_plan),null) as official_provinces,
  array_remove(array_agg(distinct rs.official_municipality_at_plan),null) as official_municipalities
from public.route_plans rp
left join public.route_stops rs on rs.route_plan_id=rp.id
where rp.plan_type in ('VISITAS','MIXTA')
group by rp.id;

grant select on public.executive_route_journey_territories to authenticated;

create index if not exists route_stops_official_region_idx on public.route_stops(official_region_at_plan);
create index if not exists route_stops_official_province_idx on public.route_stops(official_province_at_plan);
create index if not exists route_stops_official_municipality_idx on public.route_stops(official_municipality_at_plan);
