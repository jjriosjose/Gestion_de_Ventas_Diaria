create or replace function public.guard_capture_assignment_ownership()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_employee_id uuid;
  v_plan_type text;
begin
  if new.capture_assignment_id is null then
    return new;
  end if;

  select rp.employee_id, rp.plan_type
    into v_employee_id, v_plan_type
  from public.route_plans rp
  where rp.id = new.capture_assignment_id;

  if v_employee_id is null or v_plan_type <> 'CAPTACION' then
    raise exception 'La tarea de captación no es válida';
  end if;

  if new.captured_by_employee_id is distinct from v_employee_id then
    raise exception 'El prospecto solo puede asociarse a una tarea del mismo vendedor';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_capture_assignment_ownership() from public, anon, authenticated;

drop trigger if exists trg_guard_capture_assignment_ownership on public.prospects;
create trigger trg_guard_capture_assignment_ownership
before insert or update of capture_assignment_id, captured_by_employee_id
on public.prospects
for each row
execute function public.guard_capture_assignment_ownership();
