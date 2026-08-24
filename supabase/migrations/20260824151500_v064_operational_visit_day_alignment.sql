-- V0.6.4 — alineación de visitas con el día operativo de la ruta
-- Cambio aditivo: no altera las vistas V0.6.3. V0.6.4 consume estas vistas normalizadas.

create or replace view public.executive_daily_visit_metrics_v064
with (security_invoker = true)
as
select
  v.employee_id,
  coalesce(rs.session_date, (v.started_at at time zone 'America/Santo_Domingo')::date) as day,
  count(*) filter (where v.ended_at is not null)::integer as visited_clients,
  count(*) filter (where v.ended_at is not null and coalesce(v.received,false))::integer as received_clients,
  count(*) filter (
    where v.ended_at is not null
      and lower(coalesce(v.purchase_result,'')) = any(array['compro','compró','compra','si','sí','yes'])
  )::integer as visit_purchase_clients,
  coalesce(sum(v.purchase_amount) filter (
    where v.ended_at is not null
      and lower(coalesce(v.purchase_result,'')) = any(array['compro','compró','compra','si','sí','yes'])
  ),0)::numeric(14,2) as visit_sales_amount,
  coalesce(sum(extract(epoch from coalesce(v.ended_at,now()) - v.started_at)),0)::bigint as visit_seconds,
  min(v.started_at) as visit_first_at,
  max(coalesce(v.ended_at,now())) as visit_last_at
from public.visits v
left join public.route_sessions rs on rs.id = v.route_session_id
group by v.employee_id, coalesce(rs.session_date, (v.started_at at time zone 'America/Santo_Domingo')::date);

grant select on public.executive_daily_visit_metrics_v064 to authenticated;

create or replace view public.executive_visit_timeline_v064
with (security_invoker = true)
as
select
  v.employee_id,
  coalesce(rs.session_date, (v.started_at at time zone 'America/Santo_Domingo')::date) as day,
  'VISITA'::text as activity_type,
  v.id as source_id,
  v.started_at,
  v.ended_at,
  case when v.ended_at is not null then extract(epoch from v.ended_at - v.started_at)::bigint else null::bigint end as duration_seconds,
  false as estimated,
  coalesce(c.legal_name,'Visita a cliente') as label,
  coalesce(v.purchase_result,v.result) as result,
  v.purchase_amount as amount,
  v.route_session_id as context_id
from public.visits v
left join public.route_sessions rs on rs.id = v.route_session_id
left join public.clients c on c.id = v.client_id;

grant select on public.executive_visit_timeline_v064 to authenticated;

comment on view public.executive_daily_visit_metrics_v064 is
  'Métricas de visitas agrupadas por fecha operativa de la sesión de ruta cuando existe; visitas libres usan fecha local real.';
comment on view public.executive_visit_timeline_v064 is
  'Cronología de visitas alineada al día operativo de la sesión de ruta cuando existe.';
