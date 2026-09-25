-- Extend QA isolation to Supabase Storage.
-- QA/local requests may read according to existing policies but cannot mutate production storage.

create or replace function private.qa_write_allowed()
returns boolean
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_database_environment text := 'production';
begin
  select environment
    into v_database_environment
  from private.app_runtime_environment
  where singleton=true;

  return coalesce(v_database_environment,'production')<>'production'
         or private.request_data_environment()='production';
end;
$function$;

revoke all on function private.qa_write_allowed() from public;
grant execute on function private.qa_write_allowed() to authenticated;

drop policy if exists qa_storage_insert_guard on storage.objects;
create policy qa_storage_insert_guard
on storage.objects
as restrictive
for insert
to authenticated
with check (private.qa_write_allowed());

drop policy if exists qa_storage_update_guard on storage.objects;
create policy qa_storage_update_guard
on storage.objects
as restrictive
for update
to authenticated
using (private.qa_write_allowed())
with check (private.qa_write_allowed());

drop policy if exists qa_storage_delete_guard on storage.objects;
create policy qa_storage_delete_guard
on storage.objects
as restrictive
for delete
to authenticated
using (private.qa_write_allowed());

comment on function private.qa_write_allowed() is
'Returns false for QA/local requests against the production database, preventing business and storage mutations.';
