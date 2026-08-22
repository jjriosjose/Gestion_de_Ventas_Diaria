create or replace function private.sync_client_geo_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.latitude is null or new.longitude is null then
    if new.geo_status <> 'VERIFICADA' then new.geo_status := 'SIN_GEO'; new.geo_verified_at := null; new.geo_verified_by := null; end if;
  elsif tg_op = 'INSERT' then
    if new.geo_status is null or new.geo_status = 'SIN_GEO' then new.geo_status := 'SIN_VERIFICAR'; end if;
  elsif new.latitude is distinct from old.latitude or new.longitude is distinct from old.longitude then
    if new.geo_status = old.geo_status then new.geo_status := 'SIN_VERIFICAR'; new.geo_verified_at := null; new.geo_verified_by := null; end if;
  end if;
  return new;
end;
$$;

drop trigger if exists clients_sync_geo_status on public.clients;
create trigger clients_sync_geo_status before insert or update of latitude,longitude,geo_status on public.clients for each row execute function private.sync_client_geo_status();

create index if not exists route_plans_confirmed_by_fkey_idx on public.route_plans(confirmed_by);
create index if not exists clients_geo_verified_by_fkey_idx on public.clients(geo_verified_by);
create index if not exists client_visit_windows_created_by_fkey_idx on public.client_visit_windows(created_by);
create index if not exists client_visit_windows_updated_by_fkey_idx on public.client_visit_windows(updated_by);
create index if not exists administrative_areas_parent_id_fkey_idx on public.administrative_areas(parent_id);
create index if not exists administrative_areas_created_by_fkey_idx on public.administrative_areas(created_by);
create index if not exists administrative_areas_updated_by_fkey_idx on public.administrative_areas(updated_by);
create index if not exists geo_verification_visit_id_fkey_idx on public.geo_verification_events(visit_id);
create index if not exists geo_verification_employee_id_fkey_idx on public.geo_verification_events(employee_id);
create index if not exists geo_verification_reviewed_by_fkey_idx on public.geo_verification_events(reviewed_by);
create index if not exists geo_verification_created_by_fkey_idx on public.geo_verification_events(created_by);

create trigger client_visit_windows_audit after insert or update or delete on public.client_visit_windows for each row execute function private.audit_row_change();
create trigger administrative_areas_audit after insert or update or delete on public.administrative_areas for each row execute function private.audit_row_change();
