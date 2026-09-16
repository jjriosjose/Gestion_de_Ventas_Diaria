create or replace function private.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.employees e
    where e.auth_user_id = (select auth.uid())
      and e.active = true
      and e.app_role = 'Administrador'
  );
$function$;

alter table public.showroom_sessions
  add column if not exists purchase_amount_updated_at timestamptz,
  add column if not exists purchase_amount_updated_by uuid references auth.users(id) on delete set null;

create or replace function private.guard_showroom_purchase_amount()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (
    (tg_op = 'INSERT' and new.purchase_amount is not null)
    or
    (tg_op = 'UPDATE' and new.purchase_amount is distinct from old.purchase_amount)
  ) then
    if not private.is_administrator() then
      raise exception 'Solo un Administrador puede registrar o modificar el monto de compra de showroom.'
        using errcode = '42501';
    end if;

    new.purchase_amount_updated_at := now();
    new.purchase_amount_updated_by := auth.uid();
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_showroom_purchase_amount_admin_only on public.showroom_sessions;
create trigger trg_showroom_purchase_amount_admin_only
before insert or update of purchase_amount on public.showroom_sessions
for each row
execute function private.guard_showroom_purchase_amount();
