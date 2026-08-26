create or replace view public.administrative_areas_map
with (security_invoker = true)
as
select
  id,
  area_level,
  code,
  name,
  parent_id,
  st_multi(
    case area_level
      when 'REGION' then st_simplifypreservetopology(geometry, 0.003)
      when 'PROVINCIA' then st_simplifypreservetopology(geometry, 0.0018)
      when 'MUNICIPIO' then st_simplifypreservetopology(geometry, 0.001)
      else st_simplifypreservetopology(geometry, 0.0007)
    end
  )::geometry(MultiPolygon, 4326) as geometry
from public.administrative_areas
where active = true;

revoke all on public.administrative_areas_map from anon;
grant select on public.administrative_areas_map to authenticated;

comment on view public.administrative_areas_map is 'V0.6.5-A read-only simplified geometry source for interactive map rendering. Official source remains administrative_areas.';
