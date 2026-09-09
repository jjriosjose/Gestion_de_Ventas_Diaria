-- Logistics & Delivery V1 foundation
-- Applied remotely on 2026-09-06. Additive only: does not modify commercial route/visit tables.

create or replace function private.current_user_can_manage_logistics()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.employees e
    where e.auth_user_id = auth.uid()
      and coalesce(e.active, true) = true
      and (
        e.app_role in ('Administrador','Supervisor')
        or e.access_profile in ('Administrador','Supervisor')
        or coalesce(e.permission_overrides ->> 'logistics.manage','false') = 'true'
      )
  );
$$;

create or replace function private.current_user_can_view_logistics()
returns boolean
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select exists (
    select 1
    from public.employees e
    where e.auth_user_id = auth.uid()
      and coalesce(e.active, true) = true
      and (
        e.app_role in ('Administrador','Supervisor')
        or e.access_profile in ('Administrador','Supervisor')
        or coalesce(e.permission_overrides ->> 'logistics.view','false') = 'true'
        or coalesce(e.permission_overrides ->> 'logistics.manage','false') = 'true'
      )
  );
$$;

grant execute on function private.current_user_can_manage_logistics() to authenticated;
grant execute on function private.current_user_can_view_logistics() to authenticated;

create table public.delivery_transport_providers (
  id uuid primary key default gen_random_uuid(), name text not null, tax_id text, contact_name text, phone text, email text, notes text,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.delivery_drivers (
  id uuid primary key default gen_random_uuid(), employee_id uuid references public.employees(id) on delete set null,
  provider_id uuid references public.delivery_transport_providers(id) on delete set null, full_name text not null, document_id text, phone text,
  license_number text, license_expires_on date,
  driver_type text not null default 'INTERNAL' check (driver_type in ('INTERNAL','CONTRACTOR','THIRD_PARTY')),
  carrier_name_snapshot text, active boolean not null default true, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.delivery_vehicles (
  id uuid primary key default gen_random_uuid(), provider_id uuid references public.delivery_transport_providers(id) on delete set null,
  plate text not null, vehicle_type text not null default 'TRUCK', brand text, model text, model_year integer,
  ownership_type text not null default 'OWNED' check (ownership_type in ('OWNED','RENTED','THIRD_PARTY')),
  carrier_name_snapshot text, capacity_packages numeric, capacity_weight_kg numeric, active boolean not null default true, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index delivery_vehicles_plate_active_uq on public.delivery_vehicles (upper(trim(plate))) where active = true;
create index delivery_drivers_employee_idx on public.delivery_drivers(employee_id);

create table public.delivery_import_batches (
  id uuid primary key default gen_random_uuid(), file_name text,
  source_type text not null default 'EXCEL' check (source_type in ('EXCEL','MANUAL')),
  status text not null default 'PREVIEW' check (status in ('PREVIEW','APPLIED','FAILED','CANCELLED')),
  total_rows integer not null default 0, matched_rows integer not null default 0, suggested_rows integer not null default 0,
  external_rows integer not null default 0, gps_ready_rows integer not null default 0, gps_pending_rows integer not null default 0,
  total_amount numeric(16,2) not null default 0, total_packages numeric not null default 0, error_summary jsonb not null default '[]'::jsonb,
  created_by uuid references public.employees(id) on delete set null, created_at timestamptz not null default now(), applied_at timestamptz
);

create table public.delivery_trips (
  id uuid primary key default gen_random_uuid(), trip_code text not null unique, trip_date date not null default current_date,
  title text, origin_name text, origin_latitude double precision, origin_longitude double precision,
  driver_id uuid references public.delivery_drivers(id) on delete set null, vehicle_id uuid references public.delivery_vehicles(id) on delete set null,
  provider_id uuid references public.delivery_transport_providers(id) on delete set null,
  driver_name_snapshot text, driver_phone_snapshot text, vehicle_plate_snapshot text, vehicle_type_snapshot text,
  ownership_type_snapshot text, carrier_name_snapshot text,
  status text not null default 'DRAFT' check (status in ('DRAFT','PREPARING','LOADED','READY','IN_ROUTE','WITH_INCIDENT','RETURNING','COMPLETED','CANCELLED')),
  route_revision integer not null default 1, total_documents integer not null default 0, total_stops integer not null default 0,
  total_amount numeric(16,2) not null default 0, total_packages numeric not null default 0,
  started_at timestamptz, departed_at timestamptz, returned_at timestamptz, completed_at timestamptz, notes text,
  created_by uuid references public.employees(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index delivery_trips_date_idx on public.delivery_trips(trip_date desc);
create index delivery_trips_driver_idx on public.delivery_trips(driver_id, trip_date desc);
create index delivery_trips_status_idx on public.delivery_trips(status, trip_date desc);

create table public.delivery_stops (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.delivery_trips(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null, stop_order integer not null, destination_name_snapshot text not null,
  destination_phone_snapshot text, destination_address_snapshot text, planned_latitude double precision, planned_longitude double precision,
  master_latitude_snapshot double precision, master_longitude_snapshot double precision, actual_delivery_latitude double precision,
  actual_delivery_longitude double precision,
  geo_source text not null default 'NO_GPS' check (geo_source in ('EXCEL_GPS','CLIENT_MASTER_GPS','CONTROL_TOWER_GPS','MANUAL_GPS','DRIVER_ARRIVAL_GPS','DRIVER_DELIVERY_GPS','NO_GPS')),
  geo_status text not null default 'PENDING' check (geo_status in ('READY','PENDING','CAPTURED_AT_DELIVERY','REVIEW')),
  status text not null default 'PENDING' check (status in ('PENDING','EN_ROUTE','AT_CLIENT','WAITING_UNLOAD','UNLOADING','DELIVERED','PARTIAL','NOT_DELIVERED','RESCHEDULED','CANCELLED')),
  packages_loaded numeric not null default 0, packages_delivered numeric not null default 0, packages_returned numeric not null default 0,
  amount_loaded numeric(16,2) not null default 0, amount_delivered numeric(16,2) not null default 0,
  arrived_at timestamptz, unload_started_at timestamptz, unload_finished_at timestamptz, delivered_at timestamptz, departed_at timestamptz,
  control_tower_updated_at timestamptz, driver_acknowledged_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(trip_id, stop_order)
);
create index delivery_stops_trip_idx on public.delivery_stops(trip_id, stop_order);
create index delivery_stops_client_idx on public.delivery_stops(client_id);
create index delivery_stops_geo_pending_idx on public.delivery_stops(trip_id, geo_status) where geo_status = 'PENDING';

create table public.delivery_documents (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.delivery_trips(id) on delete cascade,
  stop_id uuid not null references public.delivery_stops(id) on delete cascade,
  import_batch_id uuid references public.delivery_import_batches(id) on delete set null, company_code text, invoice_number text,
  order_number text, external_client_code text, client_id uuid references public.clients(id) on delete set null,
  client_name_snapshot text not null, amount numeric(16,2) not null default 0, packages_loaded numeric not null default 0,
  packages_delivered numeric not null default 0, packages_returned numeric not null default 0,
  status text not null default 'LOADED' check (status in ('LOADED','DELIVERED','PARTIAL','NOT_DELIVERED','RESCHEDULED','CANCELLED')),
  source_type text not null default 'EXCEL' check (source_type in ('EXCEL','MANUAL')), source_row integer, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (nullif(trim(coalesce(invoice_number,'')),'') is not null or nullif(trim(coalesce(order_number,'')),'') is not null)
);
create index delivery_documents_invoice_idx on public.delivery_documents(upper(trim(invoice_number))) where invoice_number is not null;
create index delivery_documents_order_idx on public.delivery_documents(upper(trim(order_number))) where order_number is not null;
create index delivery_documents_trip_idx on public.delivery_documents(trip_id);
create index delivery_documents_stop_idx on public.delivery_documents(stop_id);

create table public.delivery_events (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.delivery_trips(id) on delete cascade,
  stop_id uuid references public.delivery_stops(id) on delete cascade, event_type text not null, latitude double precision, longitude double precision,
  accuracy_m double precision, source text not null default 'APP', payload jsonb not null default '{}'::jsonb,
  actor_employee_id uuid references public.employees(id) on delete set null, actor_driver_id uuid references public.delivery_drivers(id) on delete set null,
  occurred_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index delivery_events_trip_time_idx on public.delivery_events(trip_id, occurred_at);
create index delivery_events_stop_time_idx on public.delivery_events(stop_id, occurred_at);

create table public.delivery_incidents (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.delivery_trips(id) on delete cascade,
  stop_id uuid references public.delivery_stops(id) on delete set null, incident_type text not null,
  severity text not null default 'DELAY' check (severity in ('INFO','DELAY','CRITICAL')), description text,
  latitude double precision, longitude double precision, status text not null default 'OPEN' check (status in ('OPEN','RESOLVED','CANCELLED')),
  stopped_trip boolean not null default false, reported_by_employee_id uuid references public.employees(id) on delete set null,
  reported_by_driver_id uuid references public.delivery_drivers(id) on delete set null, reported_at timestamptz not null default now(),
  resolved_at timestamptz, resolution_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index delivery_incidents_trip_idx on public.delivery_incidents(trip_id, status, reported_at desc);

create table public.delivery_proofs (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.delivery_trips(id) on delete cascade,
  stop_id uuid not null references public.delivery_stops(id) on delete cascade, receiver_name text, receiver_document text, receiver_phone text,
  signature_object_path text, latitude double precision, longitude double precision,
  proof_quality text not null default 'PARTIAL' check (proof_quality in ('COMPLETE','PARTIAL')), notes text,
  captured_by_employee_id uuid references public.employees(id) on delete set null, captured_by_driver_id uuid references public.delivery_drivers(id) on delete set null,
  captured_at timestamptz not null default now(), created_at timestamptz not null default now()
);

create table public.delivery_proof_documents (
  proof_id uuid not null references public.delivery_proofs(id) on delete cascade,
  document_id uuid not null references public.delivery_documents(id) on delete cascade,
  primary key (proof_id, document_id)
);

create table public.delivery_evidence (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.delivery_trips(id) on delete cascade,
  stop_id uuid references public.delivery_stops(id) on delete cascade, incident_id uuid references public.delivery_incidents(id) on delete cascade,
  proof_id uuid references public.delivery_proofs(id) on delete cascade, evidence_type text not null default 'DELIVERY_PHOTO', object_path text not null,
  mime_type text, latitude double precision, longitude double precision, captured_at timestamptz not null default now(), created_at timestamptz not null default now()
);
create index delivery_evidence_trip_idx on public.delivery_evidence(trip_id, captured_at desc);

create table public.delivery_access_links (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.delivery_trips(id) on delete cascade,
  driver_id uuid references public.delivery_drivers(id) on delete set null, token_hash text not null unique, pin_hash text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','REVOKED','EXPIRED','USED')), expires_at timestamptz not null,
  first_used_at timestamptz, last_used_at timestamptz, revoked_at timestamptz,
  created_by uuid references public.employees(id) on delete set null, created_at timestamptz not null default now()
);
create index delivery_access_links_trip_idx on public.delivery_access_links(trip_id, status);

create or replace function private.delivery_touch_updated_at()
returns trigger language plpgsql set search_path = public, private, pg_temp as $$
begin new.updated_at = now(); return new; end; $$;

create trigger delivery_transport_providers_touch before update on public.delivery_transport_providers for each row execute function private.delivery_touch_updated_at();
create trigger delivery_drivers_touch before update on public.delivery_drivers for each row execute function private.delivery_touch_updated_at();
create trigger delivery_vehicles_touch before update on public.delivery_vehicles for each row execute function private.delivery_touch_updated_at();
create trigger delivery_trips_touch before update on public.delivery_trips for each row execute function private.delivery_touch_updated_at();
create trigger delivery_stops_touch before update on public.delivery_stops for each row execute function private.delivery_touch_updated_at();
create trigger delivery_documents_touch before update on public.delivery_documents for each row execute function private.delivery_touch_updated_at();
create trigger delivery_incidents_touch before update on public.delivery_incidents for each row execute function private.delivery_touch_updated_at();

alter table public.delivery_transport_providers enable row level security;
alter table public.delivery_drivers enable row level security;
alter table public.delivery_vehicles enable row level security;
alter table public.delivery_import_batches enable row level security;
alter table public.delivery_trips enable row level security;
alter table public.delivery_stops enable row level security;
alter table public.delivery_documents enable row level security;
alter table public.delivery_events enable row level security;
alter table public.delivery_incidents enable row level security;
alter table public.delivery_proofs enable row level security;
alter table public.delivery_proof_documents enable row level security;
alter table public.delivery_evidence enable row level security;
alter table public.delivery_access_links enable row level security;

grant select, insert, update, delete on public.delivery_transport_providers, public.delivery_drivers, public.delivery_vehicles,
  public.delivery_import_batches, public.delivery_trips, public.delivery_stops, public.delivery_documents, public.delivery_events,
  public.delivery_incidents, public.delivery_proofs, public.delivery_proof_documents, public.delivery_evidence, public.delivery_access_links to authenticated;

create policy delivery_providers_manage on public.delivery_transport_providers for all to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());
create policy delivery_drivers_manage on public.delivery_drivers for all to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());
create policy delivery_vehicles_manage on public.delivery_vehicles for all to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());
create policy delivery_batches_manage on public.delivery_import_batches for all to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());
create policy delivery_links_manage on public.delivery_access_links for all to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());

create policy delivery_trips_select on public.delivery_trips for select to authenticated using (
  private.current_user_can_view_logistics() or exists (select 1 from public.delivery_drivers d where d.id = delivery_trips.driver_id and d.employee_id = private.current_employee_id())
);
create policy delivery_trips_manage on public.delivery_trips for insert to authenticated with check (private.current_user_can_manage_logistics());
create policy delivery_trips_update_manage on public.delivery_trips for update to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());
create policy delivery_trips_delete_manage on public.delivery_trips for delete to authenticated using (private.current_user_can_manage_logistics());

create policy delivery_stops_select on public.delivery_stops for select to authenticated using (
  private.current_user_can_view_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_stops.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_stops_manage on public.delivery_stops for all to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());

create policy delivery_documents_select on public.delivery_documents for select to authenticated using (
  private.current_user_can_view_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_documents.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_documents_manage on public.delivery_documents for all to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());

create policy delivery_events_select on public.delivery_events for select to authenticated using (
  private.current_user_can_view_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_events.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_events_insert on public.delivery_events for insert to authenticated with check (
  private.current_user_can_manage_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_events.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_events_manage on public.delivery_events for update to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());
create policy delivery_events_delete on public.delivery_events for delete to authenticated using (private.current_user_can_manage_logistics());

create policy delivery_incidents_select on public.delivery_incidents for select to authenticated using (
  private.current_user_can_view_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_incidents.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_incidents_insert on public.delivery_incidents for insert to authenticated with check (
  private.current_user_can_manage_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_incidents.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_incidents_manage on public.delivery_incidents for update to authenticated using (
  private.current_user_can_manage_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_incidents.trip_id and d.employee_id=private.current_employee_id())
) with check (
  private.current_user_can_manage_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_incidents.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_incidents_delete on public.delivery_incidents for delete to authenticated using (private.current_user_can_manage_logistics());

create policy delivery_proofs_select on public.delivery_proofs for select to authenticated using (
  private.current_user_can_view_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_proofs.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_proofs_insert on public.delivery_proofs for insert to authenticated with check (
  private.current_user_can_manage_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_proofs.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_proofs_manage on public.delivery_proofs for update to authenticated using (private.current_user_can_manage_logistics()) with check (private.current_user_can_manage_logistics());
create policy delivery_proofs_delete on public.delivery_proofs for delete to authenticated using (private.current_user_can_manage_logistics());

create policy delivery_proof_documents_select on public.delivery_proof_documents for select to authenticated using (exists (select 1 from public.delivery_proofs p where p.id=delivery_proof_documents.proof_id));
create policy delivery_proof_documents_insert on public.delivery_proof_documents for insert to authenticated with check (
  private.current_user_can_manage_logistics() or exists (select 1 from public.delivery_proofs p join public.delivery_trips t on t.id=p.trip_id join public.delivery_drivers d on d.id=t.driver_id where p.id=delivery_proof_documents.proof_id and d.employee_id=private.current_employee_id())
);
create policy delivery_proof_documents_delete on public.delivery_proof_documents for delete to authenticated using (private.current_user_can_manage_logistics());

create policy delivery_evidence_select on public.delivery_evidence for select to authenticated using (
  private.current_user_can_view_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_evidence.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_evidence_insert on public.delivery_evidence for insert to authenticated with check (
  private.current_user_can_manage_logistics() or exists (select 1 from public.delivery_trips t join public.delivery_drivers d on d.id=t.driver_id where t.id=delivery_evidence.trip_id and d.employee_id=private.current_employee_id())
);
create policy delivery_evidence_delete on public.delivery_evidence for delete to authenticated using (private.current_user_can_manage_logistics());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-evidence','delivery-evidence',false,10485760,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do nothing;
create policy delivery_storage_read on storage.objects for select to authenticated using (bucket_id='delivery-evidence' and private.current_user_can_view_logistics());
create policy delivery_storage_insert_manage on storage.objects for insert to authenticated with check (bucket_id='delivery-evidence' and private.current_user_can_manage_logistics());
create policy delivery_storage_update_manage on storage.objects for update to authenticated using (bucket_id='delivery-evidence' and private.current_user_can_manage_logistics()) with check (bucket_id='delivery-evidence' and private.current_user_can_manage_logistics());
create policy delivery_storage_delete_manage on storage.objects for delete to authenticated using (bucket_id='delivery-evidence' and private.current_user_can_manage_logistics());
