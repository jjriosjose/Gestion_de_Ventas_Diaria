drop policy if exists route_plans_assignee_update on public.route_plans;
create policy route_plans_assignee_update
on public.route_plans
for update
to authenticated
using (employee_id = private.current_employee_id())
with check (employee_id = private.current_employee_id());

drop policy if exists route_stops_assignee_update on public.route_stops;
create policy route_stops_assignee_update
on public.route_stops
for update
to authenticated
using (
  exists (
    select 1 from public.route_plans rp
    where rp.id = route_plan_id
      and rp.employee_id = private.current_employee_id()
  )
)
with check (
  exists (
    select 1 from public.route_plans rp
    where rp.id = route_plan_id
      and rp.employee_id = private.current_employee_id()
  )
);
