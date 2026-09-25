-- Repair of the real Virmania Inoa visit accidentally removed during QA cleanup on 2026-09-25.
-- The four capture QA records remain deleted. EL BOMBAZO remains the active second visit.

do $repair$
declare
  v_session_id uuid := 'a71fb9fd-32ef-44b2-8907-2471669f1d29'::uuid;
  v_plan_id uuid := '81485197-477f-4215-9a9a-e7750e4f7787'::uuid;
  v_employee_id uuid := '24eac867-2a48-4bb7-a81b-62557c46e5f7'::uuid;
  v_bombazo_visit_id uuid := '32973dac-2f08-495d-b47e-f8bf28109629'::uuid;
  v_restored_visit_id uuid := '965680e4-d06b-400e-86f9-12d011658dbb'::uuid;
  v_tienda_id uuid := '29a11dbc-0f48-4733-9f66-b62931dfacf3'::uuid;
  v_user_id uuid := 'b64d295f-c403-4b56-9003-6949261bbeb9'::uuid;
  v_visit_count integer;
  v_capture_count integer;
begin
  if not exists (
    select 1
    from public.route_sessions rs
    join public.route_plans rp on rp.id=rs.route_plan_id
    where rs.id=v_session_id
      and rp.id=v_plan_id
      and rs.employee_id=v_employee_id
      and rp.employee_id=v_employee_id
      and rs.status='ACTIVA'
      and rs.ended_at is null
      and rp.route_date='2026-09-25'::date
      and rp.route_mode='LIBRE'
      and rp.plan_type='VISITAS'
  ) then
    raise exception 'Repair aborted: current Virmania free journey is not in the expected state.';
  end if;

  select count(*)::int into v_visit_count
  from public.visits
  where route_session_id=v_session_id;

  if v_visit_count<>1 then
    raise exception 'Repair aborted: expected exactly 1 current visit, found %.',v_visit_count;
  end if;

  if not exists (
    select 1
    from public.visits v
    join public.clients c on c.id=v.client_id
    where v.id=v_bombazo_visit_id
      and v.route_session_id=v_session_id
      and v.employee_id=v_employee_id
      and v.ended_at is null
      and c.codempr='KARAKA-179'
      and c.legal_name='EL BOMBAZO'
  ) then
    raise exception 'Repair aborted: EL BOMBAZO is not the expected open visit.';
  end if;

  select count(*)::int into v_capture_count
  from public.capture_interactions
  where route_session_id=v_session_id;

  if v_capture_count<>0 then
    raise exception 'Repair aborted: current session unexpectedly contains capture interactions.';
  end if;

  if exists (select 1 from public.visits where id=v_restored_visit_id) then
    raise exception 'Repair aborted: TIENDA AMARILLA visit id already exists.';
  end if;

  if not exists (
    select 1 from public.clients
    where id=v_tienda_id
      and codempr='KARAKA-1025'
      and legal_name='TIENDA AMARILLA, SRL'
  ) then
    raise exception 'Repair aborted: TIENDA AMARILLA master client was not found.';
  end if;

  if exists (
    select 1 from public.capture_interactions
    where subject_name in ('colmado manolito','test colmado','prueba -3','prueba secuencial')
      and employee_id=v_employee_id
      and (started_at at time zone 'America/Santo_Domingo')::date='2026-09-25'
  ) then
    raise exception 'Repair aborted: QA capture data reappeared.';
  end if;

  update public.route_sessions
  set started_at='2026-09-25 14:35:11.609086+00'::timestamptz,
      start_latitude=19.363489,
      start_longitude=-70.5729495,
      start_accuracy_m=61.37
  where id=v_session_id;

  insert into public.visits(
    id,route_session_id,route_stop_id,client_id,prospect_id,employee_id,visit_kind,planned,
    started_at,start_latitude,start_longitude,start_accuracy_m,
    ended_at,end_latitude,end_longitude,end_accuracy_m,
    received,purchase_result,result,no_purchase_reason,
    merchandise_comment,competitor_comment,contact_name,next_action,follow_up_date,notes,
    created_at,updated_at,created_by,updated_by,purchase_amount,
    start_location_exception_code,start_location_exception_text,
    end_location_exception_code,end_location_exception_text
  ) values (
    v_restored_visit_id,v_session_id,null,v_tienda_id,null,v_employee_id,'CLIENTE',false,
    '2026-09-25 14:35:11.609086+00'::timestamptz,19.363489,-70.5729495,61.37,
    '2026-09-25 15:09:33.272+00'::timestamptz,19.3952554,-70.5241195,13.47,
    true,'PENDIENTE','RECIBIDO',null,
    'Enviando sobre almavenes karaka en catrbe pac','N','SALUSTIO ROBERTO GONZALEZ',null,null,null,
    '2026-09-25 14:35:11.609086+00'::timestamptz,
    '2026-09-25 15:09:33.691472+00'::timestamptz,
    v_user_id,v_user_id,null,
    'DISTANT_REGISTRATION',
    'Registro realizado a más de 1 km del punto maestro; permitido y marcado para revisión.',
    null,null
  );

  insert into public.geo_verification_events(
    client_id,visit_id,employee_id,captured_at,latitude,longitude,accuracy_m,captured_location,
    distance_to_master_m,current_region,current_province,current_municipality,
    detected_region,detected_province,detected_municipality,detected_locality,
    status,review_notes,created_at,created_by
  ) values (
    v_tienda_id,v_restored_visit_id,v_employee_id,
    '2026-09-25 14:35:11.609086+00'::timestamptz,
    19.363489,-70.5729495,61.37,
    extensions.st_setsrid(extensions.st_makepoint(-70.5729495,19.363489),4326)::extensions.geography,
    5830.3,'CIBAO NORTE','ESPAILLAT','MOCA',
    null,null,null,null,
    'PENDIENTE',
    'Registro reconstruido desde audit_log tras saneamiento QA del 25/09/2026; los campos administrativos detectados originales no estaban auditados y no se inventaron.',
    '2026-09-25 14:35:11.609086+00'::timestamptz,
    v_user_id
  );
end;
$repair$;
