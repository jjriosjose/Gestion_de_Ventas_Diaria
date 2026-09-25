-- QA data isolation guard.
-- Production remains fully writable from the canonical production app.
-- Localhost, QA clients and non-canonical preview workers are read-only against production.

create table if not exists private.app_runtime_environment (
  singleton boolean primary key default true check (singleton),
  environment text not null check (environment in ('production','qa','staging')),
  updated_at timestamptz not null default now()
);

insert into private.app_runtime_environment(singleton,environment)
values(true,'production')
on conflict(singleton) do update
set environment='production',updated_at=now();

create or replace function private.request_data_environment()
returns text
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_raw text;
  v_headers jsonb := '{}'::jsonb;
  v_explicit text := '';
  v_origin text := '';
  v_referer text := '';
begin
  v_raw := current_setting('request.headers',true);

  if v_raw is not null and btrim(v_raw)<>'' then
    begin
      v_headers := v_raw::jsonb;
    exception when others then
      v_headers := '{}'::jsonb;
    end;
  end if;

  v_explicit := lower(coalesce(v_headers->>'x-karaka-environment',''));
  v_origin := lower(coalesce(v_headers->>'origin',''));
  v_referer := lower(coalesce(v_headers->>'referer',''));

  if v_explicit in ('qa','test','testing','development','staging') then
    return 'qa';
  end if;

  if v_origin like '%localhost%'
     or v_origin like '%127.0.0.1%'
     or v_origin like '%[::1]%'
     or v_referer like '%localhost%'
     or v_referer like '%127.0.0.1%'
     or v_referer like '%[::1]%' then
    return 'qa';
  end if;

  if v_origin like '%.workers.dev%'
     and v_origin not like '%gestion-de-ventas-diaria.jjriosjose.workers.dev%' then
    return 'qa';
  end if;

  return 'production';
end;
$function$;

create or replace function private.block_qa_write_on_production()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_database_environment text := 'production';
  v_request_environment text;
begin
  select environment
  into v_database_environment
  from private.app_runtime_environment
  where singleton=true;

  v_request_environment := private.request_data_environment();

  if coalesce(v_database_environment,'production')='production'
     and v_request_environment='qa' then
    raise exception using
      errcode='42501',
      message='QA_WRITE_BLOCKED: Las pruebas no pueden modificar Supabase productivo. Usa la base QA/staging.';
  end if;

  return null;
end;
$function$;

do $block$
declare
  v_table record;
begin
  for v_table in
    select tablename
    from pg_tables
    where schemaname='public'
      and tablename<>'audit_log'
  loop
    execute format('drop trigger if exists zz_qa_write_guard on public.%I',v_table.tablename);
    execute format(
      'create trigger zz_qa_write_guard before insert or update or delete on public.%I for each statement execute function private.block_qa_write_on_production()',
      v_table.tablename
    );
  end loop;
end;
$block$;

comment on function private.request_data_environment() is
'Classifies browser/API requests as production or QA. Localhost and non-canonical preview Workers are QA even without the custom header.';

comment on function private.block_qa_write_on_production() is
'Fail-closed safety guard: QA requests cannot mutate public business tables when database environment is production.';
