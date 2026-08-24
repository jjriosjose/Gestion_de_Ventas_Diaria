-- V0.6.1
-- Expone la dimensión client_type en cobertura para filtros CADENA / REGULAR.
-- Mantiene security_invoker y no modifica RLS.

create or replace view public.client_management_coverage_current
with (security_invoker = true)
as
with month_bounds as (
  select
    date_trunc('month', current_date)::date as month_start,
    (date_trunc('month', current_date) + interval '1 month')::date as month_end
),
visit_stats as (
  select
    c.id as client_id,
    count(v.id) filter (
      where v.ended_at is not null
        and v.ended_at >= mb.month_start
        and v.ended_at < mb.month_end
    ) as visits_this_month,
    max(v.ended_at) filter (where v.ended_at is not null) as last_visit_at
  from public.clients c
  cross join month_bounds mb
  left join public.visits v
    on v.client_id = c.id
   and v.employee_id = c.vendor_employee_id
  group by c.id
),
call_stats as (
  select
    c.id as client_id,
    count(cl.id) filter (
      where cl.occurred_at >= mb.month_start
        and cl.occurred_at < mb.month_end
    ) as calls_this_month,
    max(cl.occurred_at) as last_call_at
  from public.clients c
  cross join month_bounds mb
  left join public.calls cl
    on cl.client_id = c.id
   and cl.employee_id = c.manager_employee_id
  group by c.id
)
select
  c.id as client_id,
  c.codempr,
  c.legal_name,
  c.company_code,
  c.region,
  c.province,
  c.municipality,
  c.vendor_employee_id,
  c.manager_employee_id,
  c.v_cartera,
  c.g_cartera,
  c.latitude,
  c.longitude,
  coalesce(p.visits_per_month, 0) as visits_per_month,
  coalesce(p.calls_per_month, 0) as calls_per_month,
  coalesce(p.min_visit_gap_days, 0) as min_visit_gap_days,
  coalesce(p.min_call_gap_days, 0) as min_call_gap_days,
  coalesce(vs.visits_this_month, 0)::integer as visits_this_month,
  coalesce(cs.calls_this_month, 0)::integer as calls_this_month,
  vs.last_visit_at,
  cs.last_call_at,
  greatest(coalesce(p.visits_per_month, 0) - coalesce(vs.visits_this_month, 0), 0)::integer as visits_remaining,
  greatest(coalesce(p.calls_per_month, 0) - coalesce(cs.calls_this_month, 0), 0)::integer as calls_remaining,
  case
    when coalesce(p.visits_per_month, 0) = 0 then 'SIN_META'
    when coalesce(vs.visits_this_month, 0) >= p.visits_per_month then 'CUMPLIDO'
    else 'PENDIENTE'
  end as visit_status,
  case
    when coalesce(p.calls_per_month, 0) = 0 then 'SIN_META'
    when coalesce(cs.calls_this_month, 0) >= p.calls_per_month then 'CUMPLIDO'
    else 'PENDIENTE'
  end as call_status,
  c.client_type
from public.clients c
left join public.client_management_policies p
  on p.client_id = c.id
 and p.active = true
left join visit_stats vs on vs.client_id = c.id
left join call_stats cs on cs.client_id = c.id;
