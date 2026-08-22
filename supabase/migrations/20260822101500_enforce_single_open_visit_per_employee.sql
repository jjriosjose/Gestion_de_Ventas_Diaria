create or replace function public.enforce_single_open_visit_per_employee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
begin
  if new.employee_id is not null and new.ended_at is null then
    perform pg_advisory_xact_lock(hashtext(new.employee_id::text));

    select v.id
      into v_existing
      from public.visits v
     where v.employee_id = new.employee_id
       and v.ended_at is null
       and (new.id is null or v.id <> new.id)
     limit 1;

    if v_existing is not null then
      raise exception 'Ya existe una visita abierta para este empleado. Debe finalizarla antes de iniciar otra.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_single_open_visit_per_employee on public.visits;
create trigger trg_single_open_visit_per_employee
before insert or update of employee_id, ended_at on public.visits
for each row execute function public.enforce_single_open_visit_per_employee();
