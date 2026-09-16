create or replace view public.executive_tracking_snapshot_v2 as
select
  s.*,
  j.route_mode,
  coalesce(j.total_completed_visits, 0)::integer as total_completed_visits,
  coalesce(j.additional_visits, 0)::integer as additional_visits,
  coalesce(j.capture_count, 0)::integer as capture_count,
  coalesce(j.commercial_activity_count, 0)::integer as commercial_activity_count,
  case when j.route_mode = 'LIBRE' then coalesce(j.total_completed_visits, 0)::integer else coalesce(s.visited_clients, 0)::integer end as coverage_numerator,
  case when j.route_mode = 'LIBRE' then greatest(5, coalesce(j.total_completed_visits, 0))::integer else coalesce(s.planned_clients, 0)::integer end as coverage_denominator,
  case when j.route_mode = 'LIBRE' then least(5, coalesce(j.total_completed_visits, 0))::integer else coalesce(s.visited_clients, 0)::integer end as coverage_target_numerator,
  case when j.route_mode = 'LIBRE' then 5 else coalesce(s.planned_clients, 0)::integer end as coverage_target_denominator,
  case
    when j.route_mode = 'LIBRE' then least(100.0, round(100.0 * coalesce(j.total_completed_visits, 0)::numeric / 5.0, 1))
    when coalesce(s.planned_clients, 0) > 0 then round(100.0 * coalesce(s.visited_clients, 0)::numeric / s.planned_clients::numeric, 1)
    else 0::numeric
  end as operational_coverage_pct,
  case when j.route_mode = 'LIBRE' then 'LIBRE_MIN_5'::text else 'PLAN_ORIGINAL'::text end as coverage_basis
from public.executive_tracking_snapshot_v1 s
join public.executive_route_journeys_v4 j on j.route_plan_id = s.route_plan_id;

grant select on public.executive_tracking_snapshot_v2 to authenticated;
comment on view public.executive_tracking_snapshot_v2 is 'Tracking snapshot con cobertura operativa por modalidad: jornada libre minimo 5 visitas y ruta planificada contra plan original.';
