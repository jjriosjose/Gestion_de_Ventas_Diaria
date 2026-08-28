-- V0.6.5-beta.9 — vista de jornadas con territorio oficial histórico congelado.

create or replace view public.executive_route_journeys_v2
with (security_invoker = true)
as
select
  j.*,
  coalesce(t.official_regions,array[]::text[]) as official_regions,
  coalesce(t.official_provinces,array[]::text[]) as official_provinces,
  coalesce(t.official_municipalities,array[]::text[]) as official_municipalities
from public.executive_route_journeys j
left join public.executive_route_journey_territories t on t.route_plan_id=j.route_plan_id;

grant select on public.executive_route_journeys_v2 to authenticated;
