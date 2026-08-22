create or replace function private.mark_initial_cartera_loaded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if upper(coalesce(new.import_type,'')) = 'CARTERA'
     and coalesce(new.error_rows,0) = 0
     and (coalesce(new.inserted_rows,0) + coalesce(new.updated_rows,0) + coalesce(new.unchanged_rows,0)) > 0 then
    insert into public.app_settings(key,value,description,updated_at,updated_by)
    values ('imports.initial_cartera_loaded','true'::jsonb,'Indica si ya se aplicó la primera carga oficial de cartera',now(),new.imported_by)
    on conflict (key) do update
      set value='true'::jsonb, updated_at=now(), updated_by=new.imported_by;
  end if;
  return new;
end;
$$;
revoke all on function private.mark_initial_cartera_loaded() from public, anon, authenticated;

drop trigger if exists import_batches_mark_cartera_loaded on public.import_batches;
create trigger import_batches_mark_cartera_loaded
after insert on public.import_batches
for each row execute function private.mark_initial_cartera_loaded();
