-- V0.6.4 — alinear visitas vinculadas a ruta con route_session.session_date
-- Mantiene fecha local real para visitas libres. No reescribe datos históricos.

do $$
declare
  v_def text;
  v_next text;
begin
  select pg_get_viewdef('public.executive_activity_timeline'::regclass, true) into v_def;

  v_next := replace(
    v_def,
    '(v.started_at AT TIME ZONE ''America/Santo_Domingo''::text)::date',
    'COALESCE(vrs.session_date, (v.started_at AT TIME ZONE ''America/Santo_Domingo''::text)::date)'
  );
  if v_next = v_def then
    raise exception 'No se encontró la expresión de día de VISITA en executive_activity_timeline';
  end if;
  v_def := v_next;

  v_next := replace(
    v_def,
    'FROM visits v',
    'FROM visits v LEFT JOIN route_sessions vrs ON vrs.id = v.route_session_id'
  );
  if v_next = v_def then
    raise exception 'No se encontró FROM visits v en executive_activity_timeline';
  end if;
  v_def := v_next;

  execute 'CREATE OR REPLACE VIEW public.executive_activity_timeline AS ' || v_def;
  execute 'ALTER VIEW public.executive_activity_timeline SET (security_invoker = true)';
end $$;

do $$
declare
  v_def text;
  v_next text;
begin
  select pg_get_viewdef('public.executive_daily_employee_summary'::regclass, true) into v_def;

  v_next := replace(
    v_def,
    '(visits.started_at AT TIME ZONE ''America/Santo_Domingo''::text)::date',
    'COALESCE(vrs.session_date, (visits.started_at AT TIME ZONE ''America/Santo_Domingo''::text)::date)'
  );
  if v_next = v_def then
    raise exception 'No se encontró la expresión de día de visits en executive_daily_employee_summary';
  end if;
  v_def := v_next;

  v_next := replace(
    v_def,
    'FROM visits',
    'FROM visits LEFT JOIN route_sessions vrs ON vrs.id = visits.route_session_id'
  );
  if v_next = v_def then
    raise exception 'No se encontró FROM visits en executive_daily_employee_summary';
  end if;
  v_def := v_next;

  execute 'CREATE OR REPLACE VIEW public.executive_daily_employee_summary AS ' || v_def;
  execute 'ALTER VIEW public.executive_daily_employee_summary SET (security_invoker = true)';
end $$;

comment on view public.executive_activity_timeline is
  'Cronología ejecutiva; visitas de ruta usan fecha operativa de route_sessions y visitas libres su fecha local.';
comment on view public.executive_daily_employee_summary is
  'Resumen ejecutivo diario; visitas de ruta se atribuyen a session_date para coherencia con planificación y cobertura.';
