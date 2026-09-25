create table if not exists public.capture_interactions (
  id uuid primary key default gen_random_uuid(),
  route_session_id uuid not null references public.route_sessions(id) on delete restrict,
  route_plan_id uuid not null references public.route_plans(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  capture_assignment_id uuid references public.route_plans(id) on delete set null,
  source_context text not null default 'ROUTE' check (source_context in ('ROUTE','TASK')),
  status text not null default 'ACTIVA' check (status in ('ACTIVA','FINALIZADA','CANCELADA')),
  result_code text check (result_code is null or result_code in ('CAPTADO','NO_INTERESADO','CERRADO','ENCARGADO_AUSENTE','YA_CLIENTE','NO_CUMPLE_PERFIL','NO_LOCALIZADO','VOLVER','OTRO')),
  subject_name text not null,
  contact_name text,
  phone text,
  client_type text,
  business_interest text,
  started_at timestamptz not null default now(),
  start_latitude double precision,
  start_longitude double precision,
  start_accuracy_m numeric,
  ended_at timestamptz,
  end_latitude double precision,
  end_longitude double precision,
  end_accuracy_m numeric,
  prospect_id uuid references public.prospects(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint capture_interactions_end_after_start check (ended_at is null or ended_at >= started_at)
);

create index if not exists capture_interactions_session_idx on public.capture_interactions(route_session_id, started_at);
create index if not exists capture_interactions_employee_idx on public.capture_interactions(employee_id, started_at desc);
create index if not exists capture_interactions_prospect_idx on public.capture_interactions(prospect_id) where prospect_id is not null;
create unique index if not exists capture_interactions_one_active_per_session on public.capture_interactions(route_session_id) where status='ACTIVA' and ended_at is null;

alter table public.capture_interactions enable row level security;

drop policy if exists capture_interactions_select_scope on public.capture_interactions;
create policy capture_interactions_select_scope
on public.capture_interactions
for select
to authenticated
using (
  private.is_admin()
  or employee_id = private.current_employee_id()
  or exists (
    select 1 from public.employees ce
    where ce.id = private.current_employee_id()
      and ce.active = true
      and ce.employee_type = 'Gestor'
  )
);

grant select on public.capture_interactions to authenticated;

drop trigger if exists capture_interactions_actor_stamp on public.capture_interactions;
create trigger capture_interactions_actor_stamp before insert or update on public.capture_interactions for each row execute function private.stamp_actor();

drop trigger if exists capture_interactions_touch on public.capture_interactions;
create trigger capture_interactions_touch before update on public.capture_interactions for each row execute function private.touch_updated_at();

drop trigger if exists capture_interactions_audit on public.capture_interactions;
create trigger capture_interactions_audit after insert or update or delete on public.capture_interactions for each row execute function private.audit_row_change();

create or replace function public.start_route_capture_interaction(
  p_route_session_id uuid,
  p_subject_name text,
  p_start_latitude double precision default null,
  p_start_longitude double precision default null,
  p_start_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_employee_id uuid := private.current_employee_id();
  v_session public.route_sessions%rowtype;
  v_plan public.route_plans%rowtype;
  v_id uuid;
  v_started timestamptz;
begin
  if v_employee_id is null then raise exception 'No se pudo identificar al empleado autenticado.' using errcode='42501'; end if;
  if coalesce(trim(p_subject_name),'')='' then raise exception 'Indica el nombre del negocio o referencia de la captación.'; end if;

  select * into v_session
  from public.route_sessions
  where id=p_route_session_id and employee_id=v_employee_id and status='ACTIVA' and ended_at is null
  for update;

  if not found then raise exception 'No existe una jornada activa válida para iniciar la captación.'; end if;

  select * into v_plan from public.route_plans where id=v_session.route_plan_id;

  if v_plan.plan_type not in ('VISITAS','MIXTA') then
    raise exception 'Esta prueba de captación desde Rutas solo aplica a jornadas de visitas.';
  end if;

  if exists(select 1 from public.visits where route_session_id=v_session.id and ended_at is null) then
    raise exception 'Finaliza la visita actual antes de iniciar una captación.';
  end if;

  if exists(select 1 from public.operational_incidents where route_session_id=v_session.id and status='ACTIVA' and ended_at is null) then
    raise exception 'Finaliza la eventualidad activa antes de iniciar una captación.';
  end if;

  if exists(select 1 from public.capture_interactions where route_session_id=v_session.id and status='ACTIVA' and ended_at is null) then
    raise exception 'Ya existe una captación en curso en esta jornada.';
  end if;

  insert into public.capture_interactions(
    route_session_id,route_plan_id,employee_id,source_context,status,
    subject_name,start_latitude,start_longitude,start_accuracy_m
  ) values (
    v_session.id,v_plan.id,v_employee_id,'ROUTE','ACTIVA',
    trim(p_subject_name),p_start_latitude,p_start_longitude,p_start_accuracy_m
  )
  returning id,started_at into v_id,v_started;

  return jsonb_build_object(
    'id',v_id,'route_session_id',v_session.id,'route_plan_id',v_plan.id,
    'subject_name',trim(p_subject_name),'status','ACTIVA','started_at',v_started
  );
end;
$function$;

create or replace function public.finish_route_capture_interaction(
  p_interaction_id uuid,
  p_result_code text,
  p_subject_name text default null,
  p_contact_name text default null,
  p_phone text default null,
  p_client_type text default null,
  p_business_interest text default null,
  p_notes text default null,
  p_end_latitude double precision default null,
  p_end_longitude double precision default null,
  p_end_accuracy_m numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_employee_id uuid := private.current_employee_id();
  v_row public.capture_interactions%rowtype;
  v_name text;
  v_prospect_id uuid;
  v_code text;
  v_ended timestamptz := now();
begin
  if v_employee_id is null then raise exception 'No se pudo identificar al empleado autenticado.' using errcode='42501'; end if;

  if p_result_code not in ('CAPTADO','NO_INTERESADO','CERRADO','ENCARGADO_AUSENTE','YA_CLIENTE','NO_CUMPLE_PERFIL','NO_LOCALIZADO','VOLVER','OTRO') then
    raise exception 'Resultado de captación inválido.';
  end if;

  select * into v_row
  from public.capture_interactions
  where id=p_interaction_id and employee_id=v_employee_id and status='ACTIVA' and ended_at is null
  for update;

  if not found then raise exception 'La captación no existe, no te pertenece o ya fue finalizada.'; end if;

  v_name := coalesce(nullif(trim(p_subject_name),''),v_row.subject_name);

  if p_result_code='CAPTADO' then
    if coalesce(trim(v_name),'')='' then raise exception 'El nombre del prospecto es obligatorio.'; end if;

    v_code := 'PRO-' || right(floor(extract(epoch from clock_timestamp())*1000)::bigint::text,8);

    insert into public.prospects(
      prospect_code,legal_name,contact_name,phone,mobile,client_type,business_interest,
      latitude,longitude,gps_accuracy_m,status,captured_by_employee_id,
      capture_assignment_id,route_session_id,notes,captured_at
    ) values (
      v_code,v_name,nullif(trim(p_contact_name),''),nullif(trim(p_phone),''),
      nullif(trim(p_phone),''),nullif(trim(p_client_type),''),
      nullif(trim(p_business_interest),''),
      v_row.start_latitude,v_row.start_longitude,v_row.start_accuracy_m,
      'NUEVO',v_employee_id,v_row.capture_assignment_id,v_row.route_session_id,
      nullif(trim(p_notes),''),v_ended
    )
    returning id into v_prospect_id;
  end if;

  update public.capture_interactions
  set status='FINALIZADA',result_code=p_result_code,subject_name=v_name,
      contact_name=nullif(trim(p_contact_name),''),phone=nullif(trim(p_phone),''),
      client_type=nullif(trim(p_client_type),''),business_interest=nullif(trim(p_business_interest),''),
      notes=nullif(trim(p_notes),''),prospect_id=v_prospect_id,ended_at=v_ended,
      end_latitude=p_end_latitude,end_longitude=p_end_longitude,end_accuracy_m=p_end_accuracy_m
  where id=v_row.id;

  return jsonb_build_object(
    'id',v_row.id,'status','FINALIZADA','result_code',p_result_code,
    'subject_name',v_name,'prospect_id',v_prospect_id,'ended_at',v_ended,
    'duration_seconds',greatest(0,extract(epoch from (v_ended-v_row.started_at))::bigint)
  );
end;
$function$;

create or replace function public.cancel_route_capture_interaction(
  p_interaction_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_employee_id uuid := private.current_employee_id();
  v_row public.capture_interactions%rowtype;
  v_ended timestamptz := now();
begin
  select * into v_row
  from public.capture_interactions
  where id=p_interaction_id and employee_id=v_employee_id and status='ACTIVA' and ended_at is null
  for update;

  if not found then raise exception 'La captación no existe, no te pertenece o ya fue finalizada.'; end if;

  update public.capture_interactions
  set status='CANCELADA',ended_at=v_ended,notes=nullif(trim(p_notes),'')
  where id=v_row.id;

  return jsonb_build_object('id',v_row.id,'status','CANCELADA','ended_at',v_ended);
end;
$function$;

revoke all on function public.start_route_capture_interaction(uuid,text,double precision,double precision,numeric) from public;
revoke all on function public.finish_route_capture_interaction(uuid,text,text,text,text,text,text,text,double precision,double precision,numeric) from public;
revoke all on function public.cancel_route_capture_interaction(uuid,text) from public;
grant execute on function public.start_route_capture_interaction(uuid,text,double precision,double precision,numeric) to authenticated;
grant execute on function public.finish_route_capture_interaction(uuid,text,text,text,text,text,text,text,double precision,double precision,numeric) to authenticated;
grant execute on function public.cancel_route_capture_interaction(uuid,text) to authenticated;

create or replace view public.executive_tracking_events_v2_test
with (security_invoker=true)
as
select * from public.executive_tracking_events_v1
union all
select
  'CAPTURE_START:'||ci.id::text,ci.route_plan_id,ci.route_session_id,ci.employee_id,
  e.full_name,e.job_title,e.employee_type,rs.session_date,'CAPTURE_START'::text,
  ci.started_at,ci.start_latitude,ci.start_longitude,ci.start_accuracy_m,
  null::uuid,null::uuid,null::uuid,null::uuid,ci.prospect_id,ci.subject_name,null::integer,
  null::text,null::text,null::text,'Inicio de captación'::text,'capture_interactions'::text,ci.id,
  ci.start_latitude is not null and ci.start_longitude is not null and ci.start_accuracy_m is not null and ci.start_accuracy_m>0 and ci.start_accuracy_m<=1000,
  ci.start_latitude is not null and ci.start_longitude is not null,
  private.gps_quality_from_accuracy(ci.start_accuracy_m),null::numeric,null::text,null::text
from public.capture_interactions ci
join public.route_sessions rs on rs.id=ci.route_session_id
join public.employees e on e.id=ci.employee_id
where private.current_user_can_view_tracking()
  and (private.is_admin() or ci.employee_id=private.current_employee_id())
union all
select
  'CAPTURE_END:'||ci.id::text,ci.route_plan_id,ci.route_session_id,ci.employee_id,
  e.full_name,e.job_title,e.employee_type,rs.session_date,'CAPTURE_END'::text,
  ci.ended_at,ci.end_latitude,ci.end_longitude,ci.end_accuracy_m,
  null::uuid,null::uuid,null::uuid,null::uuid,ci.prospect_id,ci.subject_name,null::integer,
  null::text,null::text,null::text,
  case when ci.result_code='CAPTADO' then 'Fin de captación · Prospecto creado' else 'Fin de captación' end,
  'capture_interactions'::text,ci.id,
  ci.end_latitude is not null and ci.end_longitude is not null and ci.end_accuracy_m is not null and ci.end_accuracy_m>0 and ci.end_accuracy_m<=1000,
  ci.end_latitude is not null and ci.end_longitude is not null,
  private.gps_quality_from_accuracy(ci.end_accuracy_m),null::numeric,null::text,null::text
from public.capture_interactions ci
join public.route_sessions rs on rs.id=ci.route_session_id
join public.employees e on e.id=ci.employee_id
where ci.ended_at is not null
  and private.current_user_can_view_tracking()
  and (private.is_admin() or ci.employee_id=private.current_employee_id());

grant select on public.executive_tracking_events_v2_test to authenticated;

create or replace view public.executive_route_journeys_v5_test
with (security_invoker=true)
as
with capture_stats as (
  select
    ci.route_session_id,
    count(*) filter (where ci.status<>'CANCELADA')::integer as capture_interaction_count,
    count(*) filter (where ci.status='FINALIZADA')::integer as capture_completed_count,
    count(*) filter (where ci.status='FINALIZADA' and ci.result_code='CAPTADO')::integer as capture_success_count,
    count(*) filter (where ci.status='ACTIVA' and ci.ended_at is null)::integer as open_capture_count,
    coalesce(sum(extract(epoch from (
      coalesce(ci.ended_at,least(now(),((rs.session_date+1)::timestamp at time zone 'America/Santo_Domingo')))
      - ci.started_at
    ))) filter (where ci.status<>'CANCELADA'),0)::bigint as capture_seconds
  from public.capture_interactions ci
  join public.route_sessions rs on rs.id=ci.route_session_id
  group by ci.route_session_id
)
select
  j.*,
  coalesce(cs.capture_interaction_count,0) as capture_interaction_count,
  coalesce(cs.capture_completed_count,0) as capture_completed_count,
  coalesce(cs.capture_success_count,0) as capture_success_count,
  coalesce(cs.open_capture_count,0) as open_capture_count,
  coalesce(cs.capture_seconds,0::bigint) as capture_seconds,
  greatest(0::bigint,j.route_window_seconds-j.visit_seconds-j.incident_seconds-coalesce(cs.capture_seconds,0::bigint)) as transit_wait_v2_seconds,
  j.total_completed_visits+coalesce(cs.capture_completed_count,0) as commercial_touch_count
from public.executive_route_journeys_v4 j
left join capture_stats cs on cs.route_session_id=j.route_session_id;

grant select on public.executive_route_journeys_v5_test to authenticated;
