create or replace view public.client_geo_assessments
with (security_invoker=true)
as
with cartography as (
  select exists(
    select 1 from public.administrative_areas
    where active and area_level='PROVINCIA' and geometry is not null
  ) and exists(
    select 1 from public.administrative_areas
    where active and area_level='MUNICIPIO' and geometry is not null
  ) as ready
), base as (
  select
    c.id as client_id,
    c.codempr,
    c.legal_name,
    c.region as master_region,
    c.province as master_province,
    c.municipality as master_municipality,
    c.latitude,
    c.longitude,
    ar.region as detected_region,
    ar.province as detected_province,
    ar.municipality as detected_municipality,
    ar.locality as detected_locality
  from public.clients c
  left join lateral public.resolve_administrative_area(c.latitude,c.longitude) ar(region,province,municipality,locality)
    on c.latitude is not null and c.longitude is not null
), latest_visit as (
  select distinct on (v.client_id)
    v.client_id,
    v.id as visit_id,
    coalesce(v.ended_at,v.started_at,v.created_at) as visit_at,
    coalesce(v.end_latitude,v.start_latitude) as visit_latitude,
    coalesce(v.end_longitude,v.start_longitude) as visit_longitude
  from public.visits v
  where v.client_id is not null
    and coalesce(v.end_latitude,v.start_latitude) is not null
    and coalesce(v.end_longitude,v.start_longitude) is not null
  order by v.client_id,coalesce(v.ended_at,v.started_at,v.created_at) desc
), enriched as (
  select
    b.*,
    lv.visit_id,
    lv.visit_at,
    lv.visit_latitude,
    lv.visit_longitude,
    vr.region as visit_region,
    vr.province as visit_province,
    vr.municipality as visit_municipality,
    private.geo_norm(b.master_province)=private.geo_norm(b.detected_province)
      and private.geo_norm(b.master_municipality)=private.geo_norm(b.detected_municipality) as stored_matches_master,
    private.geo_norm(b.master_province)=private.geo_norm(vr.province)
      and private.geo_norm(b.master_municipality)=private.geo_norm(vr.municipality) as visit_matches_master,
    private.geo_norm(b.detected_province)=private.geo_norm(vr.province)
      and private.geo_norm(b.detected_municipality)=private.geo_norm(vr.municipality) as visit_matches_stored,
    cartography.ready as cartography_ready
  from base b
  cross join cartography
  left join latest_visit lv on lv.client_id=b.client_id
  left join lateral public.resolve_administrative_area(lv.visit_latitude,lv.visit_longitude) vr(region,province,municipality,locality)
    on lv.visit_latitude is not null and lv.visit_longitude is not null
)
select
  client_id,
  codempr,
  legal_name,
  master_region,
  master_province,
  master_municipality,
  latitude,
  longitude,
  detected_region,
  detected_province,
  detected_municipality,
  detected_locality,
  visit_id,
  visit_at,
  visit_latitude,
  visit_longitude,
  visit_region,
  visit_province,
  visit_municipality,
  stored_matches_master,
  visit_matches_master,
  visit_matches_stored,
  case
    when latitude is null or longitude is null then 'SIN_GEO'
    when not cartography_ready then 'SIN_CARTOGRAFIA'
    when detected_province is null and detected_municipality is null then 'FUERA_DIVISION'
    when stored_matches_master and visit_id is null then 'COHERENTE_SIN_VISITA'
    when stored_matches_master and visit_matches_master then 'VERIFICADO_VISITA'
    when stored_matches_master and visit_id is not null and not visit_matches_master then 'INCONSISTENCIA_VISITA'
    when not stored_matches_master and visit_id is null then 'PENDIENTE_VISITA'
    when not stored_matches_master and visit_matches_master and not visit_matches_stored then 'COORDENADA_SOSPECHOSA'
    when not stored_matches_master and visit_matches_stored and not visit_matches_master then 'TERRITORIO_SOSPECHOSO'
    else 'INCONSISTENCIA_GRAVE'
  end as assessment_status
from enriched;

create or replace view public.geo_intelligence_summary
with (security_invoker=true)
as
select assessment_status,count(*) as clients
from public.client_geo_assessments
group by assessment_status;
