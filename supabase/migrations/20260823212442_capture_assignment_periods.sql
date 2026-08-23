alter table public.route_plans
  add column if not exists period_end_date date,
  add column if not exists official_area_id uuid,
  add column if not exists official_area_name text,
  add column if not exists official_area_level text,
  add column if not exists include_saturday boolean not null default false;

update public.route_plans
set period_end_date = route_date
where period_end_date is null;

alter table public.route_plans
  add constraint route_plans_period_dates_check
  check (period_end_date is null or period_end_date >= route_date) not valid;

alter table public.prospects
  add column if not exists capture_assignment_id uuid references public.route_plans(id) on delete set null;

create index if not exists idx_route_plans_capture_period
  on public.route_plans(employee_id, route_date, period_end_date)
  where plan_type = 'CAPTACION';

create index if not exists idx_prospects_capture_assignment
  on public.prospects(capture_assignment_id)
  where capture_assignment_id is not null;
