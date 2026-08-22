drop index if exists public.clients_codempr_uq;
alter table public.clients alter column codempr set not null;
alter table public.clients add constraint clients_codempr_key unique (codempr);
