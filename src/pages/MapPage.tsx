import { useEffect, useMemo, useState } from 'react'
import { Crosshair, FilterX, Layers3, Pentagon, Save, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { currentPosition } from '../lib/geo'
import { useAuth } from '../context/AuthContext'
import { TerritoryClientMap } from '../components/TerritoryClientMap'
import type { MapZone, TerritorialArea } from '../components/TerritoryClientMap'
import { uniqueSorted } from '../lib/spatial'
import type { Client, Employee } from '../types'
import '../styles/territorial-v2.css'

type ZoneType = 'CAPTACION' | 'COMERCIAL' | 'OTRA'

export function MapPage() {
  const { employee } = useAuth()
  const admin = ['Administrador', 'Supervisor'].includes(employee?.app_role || '')
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [zones, setZones] = useState<MapZone[]>([])
  const [q, setQ] = useState('')
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [vendor, setVendor] = useState('')
  const [manager, setManager] = useState('')
  const [geoStatus, setGeoStatus] = useState('ALL')
  const [showZones, setShowZones] = useState(true)
  const [creating, setCreating] = useState(false)
  const [draftArea, setDraftArea] = useState<TerritorialArea | null>(null)
  const [draftClientIds, setDraftClientIds] = useState<string[]>([])
  const [zoneName, setZoneName] = useState('')
  const [zoneType, setZoneType] = useState<ZoneType>('CAPTACION')
  const [focusPoint, setFocusPoint] = useState<[number, number] | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [clientResponse, employeeResponse, zoneResponse] = await Promise.all([
      supabase.from('clients').select('id,company_code,codempr,legal_name,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,region,province,municipality,latitude,longitude,geo_status').limit(3000).order('legal_name'),
      supabase.from('employees').select('*').eq('active', true).in('employee_type', ['Vendedor', 'Gestor']).order('full_name'),
      supabase.from('territories').select('id,name,territory_type,geometry').eq('active', true).order('name'),
    ])
    setClients((clientResponse.data || []) as Client[])
    setEmployees((employeeResponse.data || []) as Employee[])
    setZones((zoneResponse.data || []) as MapZone[])
  }

  useEffect(() => { void load() }, [])
  useEffect(() => { setProvince(''); setMunicipality('') }, [region])
  useEffect(() => { setMunicipality('') }, [province])

  const vendors = employees.filter((item) => item.employee_type === 'Vendedor')
  const managers = employees.filter((item) => item.employee_type === 'Gestor')
  const regionOptions = useMemo(() => uniqueSorted(clients.map((client) => client.region)), [clients])
  const provinceOptions = useMemo(() => uniqueSorted(clients.filter((client) => !region || client.region === region).map((client) => client.province)), [clients, region])
  const municipalityOptions = useMemo(() => uniqueSorted(clients.filter((client) => (!region || client.region === region) && (!province || client.province === province)).map((client) => client.municipality)), [clients, region, province])

  const filteredClients = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('es')
    return clients.filter((client) => {
      if (term && !`${client.legal_name} ${client.codempr}`.toLocaleLowerCase('es').includes(term)) return false
      if (region && client.region !== region) return false
      if (province && client.province !== province) return false
      if (municipality && client.municipality !== municipality) return false
      if (vendor && client.vendor_employee_id !== vendor) return false
      if (manager && client.manager_employee_id !== manager) return false
      if (geoStatus !== 'ALL' && client.geo_status !== geoStatus) return false
      return true
    })
  }, [clients, q, region, province, municipality, vendor, manager, geoStatus])

  const geocodedCount = filteredClients.filter((client) => client.latitude != null && client.longitude != null).length

  const clearFilters = () => {
    setQ('')
    setRegion('')
    setProvince('')
    setMunicipality('')
    setVendor('')
    setManager('')
    setGeoStatus('ALL')
  }

  const locate = async () => {
    try {
      const position = await currentPosition()
      setFocusPoint([position.latitude, position.longitude])
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible obtener la ubicación')
    }
  }

  const cancelZone = () => {
    setCreating(false)
    setDraftArea(null)
    setDraftClientIds([])
    setZoneName('')
  }

  const saveZone = async () => {
    if (!zoneName.trim() || !draftArea) return alert('Define el nombre y el área de la zona')
    setSaving(true)
    let id: string | null = null
    let errorMessage: string | null = null

    if (draftArea.kind === 'POLYGON') {
      const ring = draftArea.points.map(([lat, lng]) => [lng, lat])
      ring.push(ring[0])
      const { data, error } = await supabase.rpc('create_territory_polygon', {
        p_name: zoneName.trim(),
        p_geojson: { type: 'Polygon', coordinates: [ring] },
        p_territory_type: zoneType,
        p_notes: `Zona creada desde Mapa v2 · ${draftClientIds.length} clientes dentro al momento de creación`,
      })
      id = data || null
      errorMessage = error?.message || null
    } else {
      const { data, error } = await supabase.rpc('create_territory_radius', {
        p_name: zoneName.trim(),
        p_latitude: draftArea.center[0],
        p_longitude: draftArea.center[1],
        p_radius_m: draftArea.radiusKm * 1000,
        p_territory_type: zoneType,
        p_notes: `Zona radial creada desde Mapa v2 · ${draftClientIds.length} clientes dentro al momento de creación`,
      })
      id = data || null
      errorMessage = error?.message || null
    }

    if (!errorMessage && id) {
      const { error } = await supabase.from('territories').update({ region: region || null, province: province || null, municipality: municipality || null }).eq('id', id)
      if (error) errorMessage = error.message
    }

    setSaving(false)
    if (errorMessage) return alert(errorMessage)
    alert('Zona guardada correctamente')
    cancelZone()
    await load()
  }

  return (
    <div className="page-stack">
      <div className="page-head">
        <div><span className="eyebrow">MAPA TERRITORIAL</span><h2>Clientes y zonas</h2><p>{geocodedCount.toLocaleString()} clientes visibles con GPS de {filteredClients.length.toLocaleString()} filtrados.</p></div>
        <div className="button-row"><button className="secondary" onClick={() => void locate()}><Crosshair size={17} /> Mi ubicación</button><label className="checkbox"><input type="checkbox" checked={showZones} onChange={(event) => setShowZones(event.target.checked)} /><Layers3 size={16} /> Mostrar zonas</label>{admin && <button className={creating ? 'primary' : 'secondary'} onClick={() => creating ? cancelZone() : setCreating(true)}><Pentagon size={17} />{creating ? 'Creando zona' : 'Crear zona'}</button>}</div>
      </div>

      <section className="panel planner-filter-panel">
        <div className="planner-filter-grid">
          <div className="search-field"><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar cliente o código..." /></div>
          <select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">Todas las regiones</option>{regionOptions.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={province} onChange={(event) => setProvince(event.target.value)}><option value="">Todas las provincias</option>{provinceOptions.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={municipality} onChange={(event) => setMunicipality(event.target.value)}><option value="">Todos los municipios</option>{municipalityOptions.map((value) => <option key={value}>{value}</option>)}</select>
          <select value={vendor} onChange={(event) => setVendor(event.target.value)}><option value="">Todos los vendedores</option>{vendors.map((item) => <option value={item.id} key={item.id}>{item.full_name}</option>)}</select>
          <select value={manager} onChange={(event) => setManager(event.target.value)}><option value="">Todos los gestores</option>{managers.map((item) => <option value={item.id} key={item.id}>{item.full_name}</option>)}</select>
          <select value={geoStatus} onChange={(event) => setGeoStatus(event.target.value)}><option value="ALL">Cualquier calidad GPS</option><option value="VERIFICADA">GPS verificado</option><option value="SIN_VERIFICAR">GPS sin verificar</option><option value="POSIBLE_ERROR">Posible error GPS</option><option value="SIN_GEO">Sin GPS</option></select>
        </div>
        <div className="planner-filter-actions"><div className="meta"><span>{filteredClients.length.toLocaleString()} clientes filtrados</span><span>{geocodedCount.toLocaleString()} visibles en mapa</span><span>{zones.length.toLocaleString()} zonas guardadas</span></div><button className="secondary compact" onClick={clearFilters}><FilterX size={15} /> Limpiar filtros</button></div>
      </section>

      {creating && <section className="panel zone-builder"><label>Nombre de la zona<input value={zoneName} onChange={(event) => setZoneName(event.target.value)} placeholder="Ej. Herrera Industrial" /></label><label>Uso<select value={zoneType} onChange={(event) => setZoneType(event.target.value as ZoneType)}><option value="CAPTACION">Captación</option><option value="COMERCIAL">Comercial</option><option value="OTRA">Otra</option></select></label><div className="zone-stat"><b>{draftClientIds.length}</b> clientes dentro</div><div className="button-row"><button className="secondary" onClick={cancelZone}><X size={16} /> Cancelar</button><button className="primary" disabled={!draftArea || !zoneName.trim() || saving} onClick={() => void saveZone()}><Save size={16} />{saving ? 'Guardando...' : 'Guardar zona'}</button></div></section>}

      {showZones && zones.length > 0 && <div className="zone-list-mini">{zones.map((zone) => <span className="zone-pill" key={zone.id}><b>{zone.name}</b> · {zone.territory_type || 'Zona'}</span>)}</div>}

      <TerritoryClientMap clients={filteredClients} selectedIds={draftClientIds} areaTools={creating} zones={zones} showZones={showZones} focusPoint={focusPoint} height={650} onAreaSelect={(ids, area) => { setDraftClientIds(ids); setDraftArea(area) }} />
    </div>
  )
}
