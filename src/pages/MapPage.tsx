import { useEffect, useMemo, useState } from 'react'
import { Crosshair, FilterX, Layers3, Pentagon, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currentPosition } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import { TerritoryClientMap } from '../components/TerritoryClientMap'
import type { MapZone, TerritorialArea } from '../components/TerritoryClientMap'
import { MapFilteredClientList } from '../components/MapFilteredClientList'
import { MapTerritorialAnalytics } from '../components/MapTerritorialAnalytics'
import { OfficialTerritoryFilters } from '../components/OfficialTerritoryFilters'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
import { uniqueSorted } from '../lib/spatial'
import { isGeoMismatch, loadGeoAssessmentMap, matchesGeoQualityFilter } from '../lib/geoQuality'
import type { GeoAssessment, GeoQualityFilter } from '../lib/geoQuality'
import { EMPTY_OFFICIAL_SELECTION, loadOfficialAreaDirectory, loadOfficialAreaGeometry, matchesOfficialSelection, officialSelectionForArea, selectedOfficialAreaId } from '../lib/officialTerritory'
import type { OfficialArea, OfficialSelection } from '../lib/officialTerritory'
import { loadClientsPaged } from '../lib/clientLoader'
import { hasPermission } from '../lib/access'
import type { Client, Employee } from '../types'
import '../styles/territorial-v2.css'

type ZoneType = 'CAPTACION' | 'COMERCIAL' | 'OTRA'
type TerritoryMode = 'MASTER' | 'OFFICIAL'
const MAP_CLIENT_COLUMNS = 'id,company_code,codempr,client_type,legal_name,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,region,province,municipality,latitude,longitude,geo_status'
const normTerritoryName = (value?: string | null) => (value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleUpperCase('es')

function geoJsonFeatures(value: unknown): any[] {
  if (!value) return []
  let parsed: any = value
  if (typeof value === 'string') {
    try { parsed = JSON.parse(value) } catch { return [] }
  }
  if (!parsed || typeof parsed !== 'object') return []
  if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) return parsed.features
  if (parsed.type === 'Feature' && parsed.geometry) return [parsed]
  if (parsed.type && (parsed.coordinates || parsed.geometries)) return [{ type: 'Feature', properties: {}, geometry: parsed }]
  return []
}

export function MapPage() {
  const { employee } = useAuth(); const canCreateZone = hasPermission(employee, 'planning.manage')
  const [clients, setClients] = useState<Client[]>([]); const [employees, setEmployees] = useState<Employee[]>([]); const [zones, setZones] = useState<MapZone[]>([]); const [geoAssessments, setGeoAssessments] = useState<Map<string, GeoAssessment>>(new Map()); const [officialAreas, setOfficialAreas] = useState<OfficialArea[]>([])
  const [q, setQ] = useState(''); const [clientType,setClientType]=useState<ClientTypeFilterValue>(''); const [territoryMode, setTerritoryMode] = useState<TerritoryMode>('MASTER'); const [region, setRegion] = useState(''); const [province, setProvince] = useState(''); const [municipality, setMunicipality] = useState(''); const [officialSelection, setOfficialSelection] = useState<OfficialSelection>(EMPTY_OFFICIAL_SELECTION); const [officialArea, setOfficialArea] = useState<OfficialArea | null>(null); const [officialAreaLoading, setOfficialAreaLoading] = useState(false); const [masterFilterZone, setMasterFilterZone] = useState<MapZone | null>(null); const [masterFilterLoading, setMasterFilterLoading] = useState(false)
  const [vendor, setVendor] = useState(''); const [manager, setManager] = useState(''); const [geoStatus, setGeoStatus] = useState('ALL'); const [territorialQuality, setTerritorialQuality] = useState<GeoQualityFilter>('ALL'); const [showZones, setShowZones] = useState(true)
  const [creating, setCreating] = useState(false); const [draftArea, setDraftArea] = useState<TerritorialArea | null>(null); const [draftClientIds, setDraftClientIds] = useState<string[]>([]); const [zoneName, setZoneName] = useState(''); const [zoneType, setZoneType] = useState<ZoneType>('CAPTACION'); const [focusPoint, setFocusPoint] = useState<[number, number] | null>(null); const [saving, setSaving] = useState(false)

  const load = async () => {
    const [clientRows, employeeResponse, zoneResponse, assessmentMap, areaRows] = await Promise.all([
      loadClientsPaged(MAP_CLIENT_COLUMNS), supabase.from('employees').select('*').eq('active', true).in('employee_type', ['Vendedor', 'Gestor']).order('full_name'), supabase.from('territories').select('id,name,territory_type,geometry').eq('active', true).order('name'), loadGeoAssessmentMap(), loadOfficialAreaDirectory(),
    ])
    setClients(clientRows); setEmployees((employeeResponse.data || []) as Employee[]); setZones((zoneResponse.data || []) as MapZone[]); setGeoAssessments(assessmentMap); setOfficialAreas(areaRows)
  }
  useEffect(() => { void load().catch((error) => alert(error instanceof Error ? error.message : 'No fue posible cargar el mapa')) }, [])
  useEffect(() => { setProvince(''); setMunicipality('') }, [region]); useEffect(() => { setMunicipality('') }, [province])
  useEffect(() => {
    const id = selectedOfficialAreaId(officialSelection)
    if (!id) { setOfficialArea(null); setOfficialAreaLoading(false); return }
    let cancelled = false
    setOfficialAreaLoading(true)
    void loadOfficialAreaGeometry(id)
      .then((area) => { if (!cancelled) setOfficialArea(area) })
      .catch(() => { if (!cancelled) setOfficialArea(null) })
      .finally(() => { if (!cancelled) setOfficialAreaLoading(false) })
    return () => { cancelled = true }
  }, [officialSelection])
  useEffect(() => { if (territoryMode === 'MASTER') setOfficialSelection(EMPTY_OFFICIAL_SELECTION); else { setRegion(''); setProvince(''); setMunicipality(''); setMasterFilterZone(null); setMasterFilterLoading(false) } }, [territoryMode])

  const vendors = employees.filter((item) => item.employee_type === 'Vendedor'); const managers = employees.filter((item) => item.employee_type === 'Gestor')
  const regionOptions = useMemo(() => uniqueSorted(clients.map((client) => client.region)), [clients]); const provinceOptions = useMemo(() => uniqueSorted(clients.filter((client) => !region || client.region === region).map((client) => client.province)), [clients, region]); const municipalityOptions = useMemo(() => uniqueSorted(clients.filter((client) => (!region || client.region === region) && (!province || client.province === province)).map((client) => client.municipality)), [clients, region, province])

  const masterBoundaryIds = useMemo(() => {
    if (territoryMode !== 'MASTER' || !officialAreas.length) return [] as string[]
    const targetMunicipality = normTerritoryName(municipality)
    const targetProvince = normTerritoryName(province)
    if (targetMunicipality) {
      const matchingProvinceIds = new Set(officialAreas.filter((area) => area.area_level === 'PROVINCIA' && (!targetProvince || normTerritoryName(area.name) === targetProvince)).map((area) => area.id))
      return officialAreas.filter((area) => area.area_level === 'MUNICIPIO' && normTerritoryName(area.name) === targetMunicipality && (!matchingProvinceIds.size || matchingProvinceIds.has(area.parent_id || ''))).map((area) => area.id)
    }
    if (targetProvince) return officialAreas.filter((area) => area.area_level === 'PROVINCIA' && normTerritoryName(area.name) === targetProvince).map((area) => area.id)
    if (region) {
      const provinceNames = new Set(clients.filter((client) => client.region === region).map((client) => normTerritoryName(client.province)).filter(Boolean))
      return officialAreas.filter((area) => area.area_level === 'PROVINCIA' && provinceNames.has(normTerritoryName(area.name))).map((area) => area.id)
    }
    return [] as string[]
  }, [territoryMode, officialAreas, clients, region, province, municipality])
  const masterBoundaryKey = masterBoundaryIds.join('|')
  const masterBoundaryLabel = municipality || province || region
  const masterBoundaryLevel = municipality ? 'MUNICIPIO' : province ? 'PROVINCIA' : region ? 'REGIÓN COMERCIAL' : ''

  useEffect(() => {
    if (territoryMode !== 'MASTER' || !masterBoundaryKey || !masterBoundaryLabel) { setMasterFilterZone(null); setMasterFilterLoading(false); return }
    let cancelled = false
    setMasterFilterLoading(true)
    void Promise.all(masterBoundaryIds.map((id) => loadOfficialAreaGeometry(id)))
      .then((areas) => {
        if (cancelled) return
        const features = areas.flatMap((area) => geoJsonFeatures(area?.geometry))
        if (!features.length) { setMasterFilterZone(null); return }
        const geometry = features.length === 1 ? features[0] : { type: 'FeatureCollection', features }
        setMasterFilterZone({ id: `official-master-${masterBoundaryKey}`, name: masterBoundaryLabel, territory_type: `COBERTURA MAESTRO COMERCIAL · ${masterBoundaryLevel}`, geometry })
      })
      .catch(() => { if (!cancelled) setMasterFilterZone(null) })
      .finally(() => { if (!cancelled) setMasterFilterLoading(false) })
    return () => { cancelled = true }
  }, [territoryMode, masterBoundaryKey, masterBoundaryLabel, masterBoundaryLevel])

  const filteredClients = useMemo(() => { const term = q.trim().toLocaleLowerCase('es'); return clients.filter((client) => { if (term && !`${client.legal_name} ${client.codempr}`.toLocaleLowerCase('es').includes(term)) return false; if(clientType&&client.client_type!==clientType)return false; if (territoryMode === 'MASTER') { if (region && client.region !== region) return false; if (province && client.province !== province) return false; if (municipality && client.municipality !== municipality) return false } else if (!matchesOfficialSelection(geoAssessments.get(client.id), officialAreas, officialSelection)) return false; if (vendor && client.vendor_employee_id !== vendor) return false; if (manager && client.manager_employee_id !== manager) return false; if (geoStatus !== 'ALL' && client.geo_status !== geoStatus) return false; if (!matchesGeoQualityFilter(geoAssessments.get(client.id), territorialQuality)) return false; return true }) }, [clients,q,clientType,territoryMode,region,province,municipality,officialSelection,officialAreas,vendor,manager,geoStatus,geoAssessments,territorialQuality])
  const geocodedCount = filteredClients.filter((client) => client.latitude != null && client.longitude != null).length; const territorialMismatchCount = filteredClients.filter((client) => isGeoMismatch(geoAssessments.get(client.id)?.assessment_status)).length
  const officialZone: MapZone | null = officialArea?.geometry ? { id: `official-${officialArea.id}`, name: officialArea.name, territory_type: `DIVISIÓN OFICIAL · ${officialArea.area_level}`, geometry: officialArea.geometry } : null
  const activeBoundaryZone = territoryMode === 'OFFICIAL' ? officialZone : masterFilterZone
  const mapZones = [...(showZones ? zones : []), ...(activeBoundaryZone ? [activeBoundaryZone] : [])]

  const clearFilters = () => { setQ(''); setClientType(''); setRegion(''); setProvince(''); setMunicipality(''); setOfficialSelection(EMPTY_OFFICIAL_SELECTION); setMasterFilterZone(null); setVendor(''); setManager(''); setGeoStatus('ALL'); setTerritorialQuality('ALL') }
  const locate = async () => { try { const position = await currentPosition(); setFocusPoint([position.latitude, position.longitude]) } catch (error) { alert(error instanceof Error ? error.message : 'No fue posible obtener la ubicación') } }
  const cancelZone = () => { setCreating(false); setDraftArea(null); setDraftClientIds([]); setZoneName('') }
  const saveZone = async () => { if (!zoneName.trim() || !draftArea) return alert('Define el nombre y el área de la zona'); setSaving(true); let id: string | null = null; let errorMessage: string | null = null; if (draftArea.kind === 'POLYGON') { const ring = draftArea.points.map(([lat, lng]) => [lng, lat]); ring.push(ring[0]); const { data, error } = await supabase.rpc('create_territory_polygon', { p_name: zoneName.trim(), p_geojson: { type: 'Polygon', coordinates: [ring] }, p_territory_type: zoneType, p_notes: `Zona creada desde Mapa · ${draftClientIds.length} clientes dentro` }); id = data || null; errorMessage = error?.message || null } else { const { data, error } = await supabase.rpc('create_territory_radius', { p_name: zoneName.trim(), p_latitude: draftArea.center[0], p_longitude: draftArea.center[1], p_radius_m: draftArea.radiusKm * 1000, p_territory_type: zoneType, p_notes: `Zona radial creada desde Mapa · ${draftClientIds.length} clientes dentro` }); id = data || null; errorMessage = error?.message || null } if (!errorMessage && id && territoryMode === 'MASTER') { const { error } = await supabase.from('territories').update({ region: region || null, province: province || null, municipality: municipality || null }).eq('id', id); if (error) errorMessage = error.message } setSaving(false); if (errorMessage) return alert(errorMessage); alert('Zona guardada correctamente'); cancelZone(); await load() }

  return <div className="page-stack"><div className="page-head"><div><span className="eyebrow">MAPA TERRITORIAL</span><h2>Clientes y zonas</h2><p>{geocodedCount.toLocaleString()} clientes visibles con GPS de {filteredClients.length.toLocaleString()} filtrados.</p></div><div className="button-row"><button className="secondary" onClick={() => void locate()}><Crosshair size={17}/> Mi ubicación</button><label className="checkbox"><input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)}/><Layers3 size={16}/> Zonas guardadas</label>{canCreateZone && <button className={creating ? 'primary' : 'secondary'} onClick={() => creating ? cancelZone() : setCreating(true)}><Pentagon size={17}/>{creating ? 'Creando zona' : 'Crear zona'}</button>}</div></div>
    <section className="panel planner-filter-panel"><div className="territory-source-row"><b>Territorio según</b><div className="segmented compact-segmented"><button className={territoryMode==='MASTER'?'active':''} onClick={()=>setTerritoryMode('MASTER')}>Maestro comercial</button><button className={territoryMode==='OFFICIAL'?'active':''} onClick={()=>setTerritoryMode('OFFICIAL')}>División territorial oficial</button></div><span>{territoryMode==='OFFICIAL'?'Filtros independientes de la cartera: 10 regiones · 32 provincias · 158 municipios · 393 distritos.':'Clasificación original del maestro de clientes.'}</span></div><div className="planner-filter-grid"><div className="search-field"><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Buscar cliente o código..."/></div><ClientTypeFilter value={clientType} onChange={setClientType}/>{territoryMode==='MASTER'?<><select value={region} onChange={(e)=>setRegion(e.target.value)}><option value="">Todas las regiones (maestro)</option>{regionOptions.map(v=><option key={v}>{v}</option>)}</select><select value={province} onChange={(e)=>setProvince(e.target.value)}><option value="">Todas las provincias (maestro)</option>{provinceOptions.map(v=><option key={v}>{v}</option>)}</select><select value={municipality} onChange={(e)=>setMunicipality(e.target.value)}><option value="">Todos los municipios (maestro)</option>{municipalityOptions.map(v=><option key={v}>{v}</option>)}</select></>:<OfficialTerritoryFilters areas={officialAreas} value={officialSelection} onChange={setOfficialSelection}/>}<select value={vendor} onChange={(e)=>setVendor(e.target.value)}><option value="">Todos los vendedores</option>{vendors.map(i=><option value={i.id} key={i.id}>{i.full_name}</option>)}</select><select value={manager} onChange={(e)=>setManager(e.target.value)}><option value="">Todos los gestores</option>{managers.map(i=><option value={i.id} key={i.id}>{i.full_name}</option>)}</select><select value={geoStatus} onChange={(e)=>setGeoStatus(e.target.value)}><option value="ALL">Cualquier estado GPS</option><option value="VERIFICADA">GPS verificado</option><option value="SIN_VERIFICAR">GPS sin verificar</option><option value="POSIBLE_ERROR">Posible error GPS</option><option value="SIN_GEO">Sin GPS</option></select><select value={territorialQuality} onChange={(e)=>setTerritorialQuality(e.target.value as GeoQualityFilter)}><option value="ALL">Cualquier coherencia</option><option value="COHERENTE">Maestro = ubicación</option><option value="DIFERENCIA">Maestro ≠ ubicación</option><option value="SIN_GEO">Sin GPS</option><option value="FUERA_DIVISION">Fuera de división</option><option value="VERIFICADO_VISITA">Verificado por visita</option></select></div><div className="planner-filter-actions"><div className="meta"><span>{filteredClients.length.toLocaleString()} clientes filtrados</span>{clientType&&<span>{clientType}</span>}<span>{geocodedCount.toLocaleString()} visibles en mapa</span><span>{territorialMismatchCount.toLocaleString()} con diferencia territorial</span>{officialAreaLoading&&territoryMode==='OFFICIAL'&&<span>Cargando límite oficial…</span>}{officialArea&&!officialAreaLoading&&territoryMode==='OFFICIAL'&&<span>Oficial: {officialArea.name}</span>}{masterFilterLoading&&territoryMode==='MASTER'&&<span>Calculando cobertura maestro…</span>}{masterFilterZone&&!masterFilterLoading&&territoryMode==='MASTER'&&<span>Maestro: {masterBoundaryLabel}</span>}</div><button className="secondary compact" onClick={clearFilters}><FilterX size={15}/> Limpiar filtros</button></div></section>
    {creating&&<section className="panel zone-builder"><label>Nombre de la zona<input value={zoneName} onChange={(e)=>setZoneName(e.target.value)} placeholder="Ej. Herrera Industrial"/></label><label>Uso<select value={zoneType} onChange={(e)=>setZoneType(e.target.value as ZoneType)}><option value="CAPTACION">Captación</option><option value="COMERCIAL">Comercial</option><option value="OTRA">Otra</option></select></label><div className="zone-stat"><b>{draftClientIds.length}</b> clientes dentro</div><div className="button-row"><button className="secondary" onClick={cancelZone}><X size={16}/> Cancelar</button><button className="primary" disabled={!draftArea||!zoneName.trim()||saving} onClick={()=>void saveZone()}><Save size={16}/>{saving?'Guardando...':'Guardar zona'}</button></div></section>}
    <div className="map-analytics-host">
      <TerritoryClientMap clients={filteredClients} geoAssessments={geoAssessments} selectedIds={draftClientIds} areaTools={creating} zones={mapZones} showZones={true} focusPoint={focusPoint} height={700} onAreaSelect={(ids,area)=>{setDraftClientIds(ids);setDraftArea(area)}}/>
      <MapTerritorialAnalytics clients={filteredClients} geoAssessments={geoAssessments} officialAreas={officialAreas} activeSelection={officialSelection} onSelectArea={(areaId)=>{setTerritoryMode('OFFICIAL');setOfficialSelection(officialSelectionForArea(officialAreas,areaId))}} onResetTerritory={()=>{setTerritoryMode('OFFICIAL');setOfficialSelection(EMPTY_OFFICIAL_SELECTION)}}/>
    </div>
    <MapFilteredClientList clients={filteredClients} employees={employees} onFocusPoint={(point)=>setFocusPoint(point)}/>
  </div>
}
