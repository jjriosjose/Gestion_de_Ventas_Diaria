create or replace function private.stamp_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    if v_uid is not null then
      new.created_by := coalesce(new.created_by, v_uid);
      new.updated_by := coalesce(new.updated_by, v_uid);
    end if;
  elsif tg_op = 'UPDATE' then
    if v_uid is not null then
      new.updated_by := v_uid;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.stamp_actor() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['clients','prospects','territories','route_plans','route_stops','route_sessions','visits','calls','appointments','follow_ups'] loop
    execute format('drop trigger if exists %I_actor_stamp on public.%I',t,t);
    execute format('create trigger %I_actor_stamp before insert or update on public.%I for each row execute function private.stamp_actor()',t,t);
  end loop;
end $$;
