alter table public.delivery_documents
  add column if not exists retry_of_document_id uuid null,
  add column if not exists attempt_number integer not null default 1,
  add column if not exists packages_pending numeric generated always as (
    greatest(coalesce(packages_loaded, 0) - coalesce(packages_delivered, 0), 0)
  ) stored;

alter table public.delivery_documents
  drop constraint if exists delivery_documents_retry_of_document_id_fkey,
  add constraint delivery_documents_retry_of_document_id_fkey
    foreign key (retry_of_document_id) references public.delivery_documents(id) on delete restrict;

alter table public.delivery_documents
  drop constraint if exists delivery_documents_attempt_number_check,
  add constraint delivery_documents_attempt_number_check check (attempt_number >= 1);

alter table public.delivery_documents
  drop constraint if exists delivery_documents_retry_not_self_check,
  add constraint delivery_documents_retry_not_self_check check (retry_of_document_id is null or retry_of_document_id <> id);

create index if not exists delivery_documents_retry_of_idx
  on public.delivery_documents(retry_of_document_id)
  where retry_of_document_id is not null;

create or replace function private.delivery_guard_document_retry()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  prior record;
  has_active boolean := false;
  has_delivered boolean := false;
begin
  if new.invoice_number is null and new.order_number is null then
    if new.retry_of_document_id is not null or coalesce(new.attempt_number, 1) <> 1 then
      raise exception 'Un reintento requiere factura o pedido para conservar trazabilidad.';
    end if;
    return new;
  end if;

  select exists (
    select 1
    from public.delivery_documents d
    join public.delivery_trips t on t.id = d.trip_id
    where d.id <> new.id
      and (
        (new.invoice_number is not null and d.invoice_number is not null and upper(trim(d.invoice_number)) = upper(trim(new.invoice_number)))
        or
        (new.order_number is not null and d.order_number is not null and upper(trim(d.order_number)) = upper(trim(new.order_number)))
      )
      and t.status not in ('COMPLETED', 'CANCELLED')
  ) into has_active;

  if has_active then
    raise exception 'El documento ya pertenece a un viaje activo y no puede reintentarse todavía.';
  end if;

  select exists (
    select 1
    from public.delivery_documents d
    join public.delivery_trips t on t.id = d.trip_id
    where d.id <> new.id
      and (
        (new.invoice_number is not null and d.invoice_number is not null and upper(trim(d.invoice_number)) = upper(trim(new.invoice_number)))
        or
        (new.order_number is not null and d.order_number is not null and upper(trim(d.order_number)) = upper(trim(new.order_number)))
      )
      and t.status in ('COMPLETED', 'CANCELLED')
      and d.status = 'DELIVERED'
  ) into has_delivered;

  if has_delivered then
    raise exception 'El documento ya fue entregado y no admite nuevos intentos.';
  end if;

  select d.id,
         d.status,
         d.attempt_number,
         d.packages_pending,
         d.created_at
    into prior
  from public.delivery_documents d
  join public.delivery_trips t on t.id = d.trip_id
  where d.id <> new.id
    and (
      (new.invoice_number is not null and d.invoice_number is not null and upper(trim(d.invoice_number)) = upper(trim(new.invoice_number)))
      or
      (new.order_number is not null and d.order_number is not null and upper(trim(d.order_number)) = upper(trim(new.order_number)))
    )
    and t.status in ('COMPLETED', 'CANCELLED')
    and d.status in ('PARTIAL', 'NOT_DELIVERED', 'RESCHEDULED', 'CANCELLED')
  order by d.attempt_number desc, d.created_at desc, d.id desc
  limit 1;

  if prior.id is null then
    if new.retry_of_document_id is not null or coalesce(new.attempt_number, 1) <> 1 then
      raise exception 'No existe un intento previo elegible para este reintento.';
    end if;
    new.retry_of_document_id := null;
    new.attempt_number := 1;
    return new;
  end if;

  if new.retry_of_document_id is null then
    raise exception 'Este documento corresponde a un reintento permitido; debe conservar la referencia al intento anterior.';
  end if;

  if new.retry_of_document_id <> prior.id then
    raise exception 'La referencia de reintento no corresponde al último intento elegible.';
  end if;

  if new.attempt_number <> prior.attempt_number + 1 then
    raise exception 'El número de intento debe ser %.', prior.attempt_number + 1;
  end if;

  if coalesce(prior.packages_pending, 0) <= 0 then
    raise exception 'El intento anterior no conserva bultos pendientes.';
  end if;

  if coalesce(new.packages_loaded, 0) <= 0 or new.packages_loaded > prior.packages_pending then
    raise exception 'El reintento solo puede cargar hasta % bulto(s) pendientes.', prior.packages_pending;
  end if;

  return new;
end;
$$;

revoke all on function private.delivery_guard_document_retry() from public;
grant execute on function private.delivery_guard_document_retry() to authenticated, service_role;

drop trigger if exists delivery_documents_retry_guard on public.delivery_documents;
create trigger delivery_documents_retry_guard
before insert on public.delivery_documents
for each row execute function private.delivery_guard_document_retry();
