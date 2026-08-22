create table if not exists public.bootstrap_credentials (
  username text primary key,
  salt_b64 text not null,
  hash_b64 text not null,
  iterations integer not null default 210000,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bootstrap_credentials enable row level security;
revoke all on public.bootstrap_credentials from public, anon, authenticated;
grant select, insert, update, delete on public.bootstrap_credentials to service_role;

create trigger bootstrap_credentials_touch
before update on public.bootstrap_credentials
for each row execute function private.touch_updated_at();
