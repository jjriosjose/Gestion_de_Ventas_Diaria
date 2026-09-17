create or replace function private.protect_showroom_purchase_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_employee_id uuid := private.current_employee_id();
  v_manager_original_close boolean := false;
begin
  if private.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' and new.purchase_amount is not null then
    raise exception 'El monto de compra de showroom solo puede registrarse al cerrar la atención o por Administración.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and new.purchase_amount is distinct from old.purchase_amount then
    v_manager_original_close :=
      old.ended_at is null
      and new.ended_at is not null
      and old.purchase_amount is null
      and new.purchase_amount is not null
      and new.purchase_amount > 0
      and new.purchased is true
      and new.outcome = 'COMPRA'
      and new.manager_employee_id = v_current_employee_id;

    if not v_manager_original_close then
      raise exception 'Después del cierre, el monto de compra de showroom solo puede ser modificado por Administración.' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    execute 'alter publication supabase_realtime add table public.notifications';
  end if;
end;
$$;
