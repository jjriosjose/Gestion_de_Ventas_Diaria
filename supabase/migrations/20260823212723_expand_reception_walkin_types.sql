alter table public.reception_entries drop constraint if exists reception_entries_status_check;
alter table public.reception_entries add constraint reception_entries_status_check
  check (status in ('REGISTRADO','EN_ESPERA','EN_ATENCION','ATENCION_FINALIZADA','SALIO','CANCELADO'));

alter table public.reception_entries drop constraint if exists reception_entries_visitor_type_check;
alter table public.reception_entries add constraint reception_entries_visitor_type_check
  check (visitor_type in ('CITA','CLIENTE_SIN_CITA','PROSPECTO','NUEVO','VISITANTE'));
