-- Beta12 security guard: tracking permission must be enforced in backend, not only navigation.

create or replace function private.current_user_can_view_tracking()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case
      when e.permission_overrides ? 'tracking.view'
        then (e.permission_overrides ->> 'tracking.view')::boolean
      else (
        e.access_profile in ('Administrador','Supervisor')
        or e.app_role in ('Administrador','Supervisor')
      )
    end,
    false
  )
  from public.employees e
  where e.auth_user_id = (select auth.uid())
    and e.active = true
  limit 1;
$$;

revoke select on public.executive_tracking_events_v1 from authenticated;
revoke select on public.executive_tracking_stops_v1 from authenticated;
revoke select on public.executive_tracking_snapshot_v1 from authenticated;

create or replace view public.executive_tracking_events_v2 as
select *
from public.executive_tracking_events_v1
where private.current_user_can_view_tracking();

create or replace view public.executive_tracking_stops_v2 as
select *
from public.executive_tracking_stops_v1
where private.current_user_can_view_tracking();

create or replace view public.executive_tracking_snapshot_v2 as
select *
from public.executive_tracking_snapshot_v1
where private.current_user_can_view_tracking();

grant select on public.executive_tracking_events_v2 to authenticated;
grant select on public.executive_tracking_stops_v2 to authenticated;
grant select on public.executive_tracking_snapshot_v2 to authenticated;

comment on function private.current_user_can_view_tracking() is 'Backend permission guard for beta12 tracking.view, honoring explicit permission overrides.';
comment on view public.executive_tracking_events_v2 is 'Permission-guarded scoped tracking events.';
comment on view public.executive_tracking_stops_v2 is 'Permission-guarded scoped tracking stops.';
comment on view public.executive_tracking_snapshot_v2 is 'Permission-guarded scoped tracking snapshot.';
