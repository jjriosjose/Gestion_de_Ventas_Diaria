-- Logistics & Delivery V1
-- Harden temporary driver access links against PIN brute-force attempts.

alter table public.delivery_access_links
  add column if not exists failed_attempts integer not null default 0,
  add column if not exists locked_until timestamptz;

alter table public.delivery_access_links
  drop constraint if exists delivery_access_links_failed_attempts_check;

alter table public.delivery_access_links
  add constraint delivery_access_links_failed_attempts_check check (failed_attempts >= 0);
