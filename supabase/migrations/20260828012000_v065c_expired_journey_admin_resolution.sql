-- V0.6.5-beta.9 — regularización administrativa de jornadas vencidas con actividad abierta.
-- Solo Administrador/Supervisor. Nunca convierte una parada incompleta en VISITADO.

create or replace function private.guard_visit_route_day()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if new.route_session_id is null then return new; end if;
  if coalesce(current_setting('app.allow_stale_route_close', true), '') = '1' then return new; end if;

  if tg_op = 'INSERT' then
    perform private.assert_route_session_executable(new.route_session_id);
  elsif tg_op = 'UPDATE' and (
       new.route_session_id is distinct from old.route_session_id
    or new.ended_at is distinct from old.ended_at
    or new.end_latitude is distinct from old.end_latitude
    or new.end_longitude is distinct from old.end_longitude
    or new.received is distinct from old.received
    or new.purchase_result is distinct from old.purchase_result
    or new.purchase_amount is distinct from old.purchase_amount
    or new.result is distinct from old.result
  ) then
    perform private.assert_route_session_executable(new.route_session_id);
  end if;
  return new;
end;
$$;

create or replace function private.guard_incident_route_day()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  if new.route_session_id is null then return new; end if;
  if coalesce(current_setting('app.allow_stale_route_close', true), '') = '1' then return new; end if;

  if tg_op = 'INSERT' then
    perform private.assert_route_session_executable(new.route_session_id);
  elsif tg_op = 'UPDATE' and (
       new.route_session_id is distinct from old.route_session_id
    or new.started_at is distinct from old.started_at
    or new.ended_at is distinct from old.ended_at
    or new.status is distinct from old.status
    or new.incident_type is distinct from old.incident_type
    or new.impact is distinct from old.impact
  ) then
    perform private.assert_route_session_executable(new.route_session_id);
  end if;
  return new;
end;
$$;

create or replace function public.resolve_expired_route_session(
  p_route_session_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, private, pg_temp
as $$
declare
  v_session public.route_sessions%rowtype;
  v_today date := (now() at time zone 'America/Santo_Domingo')::date;
  v_cutoff timestamptz;
  v_unresolved integer := 0;
  v_open_visits integer := 0;
  v_active_incidents integer := 0;
begin
  if not private.is_admin() then
    raise exception 'Solo Administración o Supervisión puede regularizar una jornada vencida con actividad abierta.' using errcode='42501';
  end if;

  select * into v_session
  from public.route_sessions
  where id=p_route_session_id
  for update;

  if not found then raise exception 'La jornada no existe.'; end if;
  if v_session.status <> 'ACTIVA' or v_session.ended_at is not null then raise exception 'La jornada ya no está pendiente de cierre.'; end if;
  if v_session.session_date >= v_today then raise exception 'Esta jornada no está vencida y debe cerrarse por el flujo operativo normal.'; end if;
  if v_session.route_plan_id is null then raise exception 'La jornada no está vinculada a una planificación.'; end if;

  v_cutoff := ((v_session.session_date + 1)::timestamp at time zone 'America/Santo_Domingo');
  perform set_config('app.allow_stale_route_close','1',true);

  select count(*)::integer into v_open_visits
  from public.visits
  where route_session_id=v_session.id and ended_at is null;

  select count(*)::integer into v_active_incidents
  from public.operational_incidents
  where route_session_id=v_session.id and status='ACTIVA';

  -- La visita queda técnicamente cerrada al límite del día, pero se marca INCOMPLETA.
  -- La cobertura del plan se toma de route_stops; la parada se convierte en NO_VISITADO.
  update public.visits
     set ended_at=greatest(started_at,v_cutoff),
         result=case when nullif(btrim(coalesce(result,'')),'') is null then 'INCOMPLETA_JORNADA' else result end,
         notes=case
           when nullif(btrim(coalesce(notes,'')),'') is null then 'Regularización administrativa: jornada vencida sin salida registrada.'
           else notes || E'\nRegularización administrativa: jornada vencida sin salida registrada.'
         end,
         end_latitude=null,
         end_longitude=null,
         end_accuracy_m=null
   where route_session_id=v_session.id and ended_at is null;

  update public.operational_incidents
     set ended_at=greatest(started_at,v_cutoff),
         status='FINALIZADA',
         review_status='REQUIERE_REVISION',
         description=case
           when nullif(btrim(coalesce(description,'')),'') is null then 'Regularización administrativa: eventualidad abierta al vencer la jornada.'
           else description || E'\nRegularización administrativa: eventualidad abierta al vencer la jornada.'
         end
   where route_session_id=v_session.id and status='ACTIVA';

  select count(*)::integer into v_unresolved
  from public.route_stops
  where route_plan_id=v_session.route_plan_id and status in ('PENDIENTE','EN_VISITA');

  update public.route_stops
     set status='NO_VISITADO',
         exception_reason_code='JORNADA_VENCIDA',
         reason_not_visited='Jornada vencida / regularización administrativa',
         notes=case
           when nullif(btrim(coalesce(p_notes,'')),'') is null then notes
           when nullif(btrim(coalesce(notes,'')),'') is null then 'Regularización administrativa: '||btrim(p_notes)
           else notes||E'\nRegularización administrativa: '||btrim(p_notes)
         end
   where route_plan_id=v_session.route_plan_id and status in ('PENDIENTE','EN_VISITA');

  update public.route_sessions
     set ended_at=v_cutoff,
         end_latitude=null,
         end_longitude=null,
         end_accuracy_m=null,
         status='FINALIZADA',
         closure_mode=case when v_unresolved>0 then 'PARCIAL' else 'NORMAL' end,
         closure_reason_code='JORNADA_VENCIDA',
         closure_reason_text='Regularización administrativa de jornada vencida',
         closure_notes=nullif(btrim(coalesce(p_notes,'')),''),
         closed_pending_count=v_unresolved
   where id=v_session.id;

  update public.route_plans set status='FINALIZADA' where id=v_session.route_plan_id;

  return jsonb_build_object(
    'route_session_id',v_session.id,
    'route_plan_id',v_session.route_plan_id,
    'ended_at',v_cutoff,
    'closure_mode',case when v_unresolved>0 then 'PARCIAL' else 'NORMAL' end,
    'closure_reason_code','JORNADA_VENCIDA',
    'closed_pending_count',v_unresolved,
    'regularized_open_visits',v_open_visits,
    'regularized_active_incidents',v_active_incidents
  );
end;
$$;

revoke all on function public.resolve_expired_route_session(uuid,text) from public;
grant execute on function public.resolve_expired_route_session(uuid,text) to authenticated;
