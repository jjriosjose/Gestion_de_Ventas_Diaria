revoke execute on function public.begin_administrative_area_sync(text) from authenticated;
revoke execute on function public.ingest_administrative_areas(jsonb,text,text) from authenticated;
revoke execute on function public.finalize_administrative_area_sync(text) from authenticated;
revoke execute on function public.finalize_administrative_area_sync(text,text) from authenticated;

grant execute on function public.begin_administrative_area_sync(text) to service_role;
grant execute on function public.ingest_administrative_areas(jsonb,text,text) to service_role;
grant execute on function public.finalize_administrative_area_sync(text) to service_role;
grant execute on function public.finalize_administrative_area_sync(text,text) to service_role;
