alter table public.prospects
  add column if not exists route_session_id uuid references public.route_sessions(id) on delete set null;

create index if not exists prospects_route_session_id_idx
  on public.prospects(route_session_id);

create or replace function private.link_prospect_route_session()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.route_session_id is not null
     or new.captured_by_employee_id is null
     or new.captured_at is null then
    return new;
  end if;

  select rs.id
    into new.route_session_id
  from public.route_sessions rs
  where rs.employee_id = new.captured_by_employee_id
    and rs.started_at <= new.captured_at
    and (rs.ended_at is null or rs.ended_at >= new.captured_at)
  order by rs.started_at desc
  limit 1;

  return new;
end;
$$;

drop trigger if exists prospects_link_route_session on public.prospects;
create trigger prospects_link_route_session
before insert or update of captured_by_employee_id, captured_at
on public.prospects
for each row
execute function private.link_prospect_route_session();

update public.prospects p
set route_session_id = (
  select rs.id
  from public.route_sessions rs
  where rs.employee_id = p.captured_by_employee_id
    and rs.started_at <= p.captured_at
    and (rs.ended_at is null or rs.ended_at >= p.captured_at)
  order by rs.started_at desc
  limit 1
)
where p.route_session_id is null
  and p.captured_by_employee_id is not null
  and p.captured_at is not null
  and exists (
    select 1
    from public.route_sessions rs
    where rs.employee_id = p.captured_by_employee_id
      and rs.started_at <= p.captured_at
      and (rs.ended_at is null or rs.ended_at >= p.captured_at)
  );

create or replace view public.executive_route_journeys_v4
with (security_invoker=true)
as
with visit_modes as (
  select v.route_session_id,
    count(*) filter (where v.planned = true and v.ended_at is not null)::integer as planned_visit_records,
    count(*) filter (where v.planned = false and v.ended_at is not null)::integer as additional_visits,
    count(*) filter (where v.planned = false)::integer as additional_visit_records,
    count(*) filter (where v.ended_at is not null)::integer as total_completed_visits
  from public.visits v
  where v.route_session_id is not null
  group by v.route_session_id
),
capture_modes as (
  select p.route_session_id,
    count(*)::integer as capture_count
  from public.prospects p
  where p.route_session_id is not null
  group by p.route_session_id
)
select
  j.route_plan_id,
  j.route_session_id,
  j.employee_id,
  j.full_name,
  j.job_title,
  j.employee_type,
  j.route_date,
  j.plan_type,
  j.title,
  j.plan_status,
  j.session_status,
  j.started_at,
  j.ended_at,
  j.closure_mode,
  j.closure_reason_code,
  j.closure_reason_text,
  j.closed_pending_count,
  j.derived_status,
  j.planned_clients,
  j.visited_clients,
  j.in_visit_clients,
  j.pending_clients,
  j.not_visited_clients,
  j.reprogrammed_clients,
  j.cancelled_clients,
  j.resolved_clients,
  j.coverage_pct,
  j.resolution_pct,
  j.route_window_seconds,
  j.visit_seconds,
  j.incident_seconds,
  j.transit_wait_estimated_seconds,
  j.estimated_distance_m,
  j.open_visit_count,
  j.incident_count,
  j.active_incident_count,
  j.regions,
  j.provinces,
  j.municipalities,
  j.client_types,
  j.official_area_id,
  j.official_area_name,
  j.official_area_level,
  j.official_regions,
  j.official_provinces,
  j.official_municipalities,
  j.completed_visit_count,
  j.visit_record_count,
  rp.route_mode,
  coalesce(vm.planned_visit_records,0) as planned_visit_records,
  coalesce(vm.additional_visits,0) as additional_visits,
  coalesce(vm.additional_visit_records,0) as additional_visit_records,
  coalesce(vm.total_completed_visits,0) as total_completed_visits,
  coalesce(cm.capture_count,0) as capture_count,
  coalesce(vm.total_completed_visits,0) + coalesce(cm.capture_count,0) as commercial_activity_count
from public.executive_route_journeys_v3 j
join public.route_plans rp on rp.id = j.route_plan_id
left join visit_modes vm on vm.route_session_id = j.route_session_id
left join capture_modes cm on cm.route_session_id = j.route_session_id;
