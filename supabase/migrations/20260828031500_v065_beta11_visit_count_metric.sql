-- V0.6.5-beta.11 — conteo real de visitas para promedios de atención.
-- Vista aditiva sobre la capa scoped existente; no modifica datos operativos.

create or replace view public.executive_route_journeys_v3
with (security_invoker=true)
as
with visit_counts as (
  select
    v.route_session_id,
    count(*) filter (where v.ended_at is not null)::integer as completed_visit_count,
    count(*)::integer as visit_record_count
  from public.visits v
  where v.route_session_id is not null
  group by v.route_session_id
)
select
  j.*,
  coalesce(vc.completed_visit_count,0) as completed_visit_count,
  coalesce(vc.visit_record_count,0) as visit_record_count
from public.executive_route_journeys_v2 j
left join visit_counts vc on vc.route_session_id=j.route_session_id;

grant select on public.executive_route_journeys_v3 to authenticated;
