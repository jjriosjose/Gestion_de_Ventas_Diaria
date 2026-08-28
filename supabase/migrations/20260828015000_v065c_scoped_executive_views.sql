-- V0.6.5-beta.9 — scoping defensivo para las nuevas superficies ejecutivas.
-- Admin/Supervisor: vista global. Resto de perfiles: solo su employee_id.

create or replace view public.executive_route_journeys_v2
with (security_invoker = true)
as
select
  j.*,
  coalesce(t.official_regions,array[]::text[]) as official_regions,
  coalesce(t.official_provinces,array[]::text[]) as official_provinces,
  coalesce(t.official_municipalities,array[]::text[]) as official_municipalities
from public.executive_route_journeys j
left join public.executive_route_journey_territories t on t.route_plan_id=j.route_plan_id
where private.is_admin() or j.employee_id=private.current_employee_id();

grant select on public.executive_route_journeys_v2 to authenticated;

create or replace view public.executive_daily_employee_summary_scoped
with (security_invoker = true)
as
select *
from public.executive_daily_employee_summary s
where private.is_admin() or s.employee_id=private.current_employee_id();

grant select on public.executive_daily_employee_summary_scoped to authenticated;

create or replace view public.executive_daily_route_metrics_scoped
with (security_invoker = true)
as
select *
from public.executive_daily_route_metrics s
where private.is_admin() or s.employee_id=private.current_employee_id();

grant select on public.executive_daily_route_metrics_scoped to authenticated;
