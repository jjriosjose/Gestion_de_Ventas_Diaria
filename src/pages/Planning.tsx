import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, FilterX, Map as MapIcon, Plus, Search, Shuffle, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { currentPosition } from '../lib/geo'
import { orderByNearest, uniqueSorted } from '../lib/spatial'
import { TerritoryClientMap } from '../components/TerritoryClientMap'
import type { Client, Employee } from '../types'
import '../styles/territorial-v2.css'

type PlanType = 'VISITAS' | 'CAPTACION'
type GpsFilter = 'ALL' | 'WITH' | 'WITHOUT'
type GeoFilter = 'ALL' | 'VERIFICADA' | 'SIN_VERIFICAR' | 'POSIBLE_ERROR'
type AvailabilityFilter = 'AVAILABLE' | 'ALL' | 'PLANNED'

export function Planning() {
  const { employee } = useAuth()
  const canManagePlanning = ['Administrador', 'Supervisor'].includes(employee?.app_role || '')
  const canOverridePortfolio = canManagePlanning

  const [vendors, setVendors] = useState<Employee[]>([])
  const [managers, setManagers] = useState<Employee[]>([])
  const [territories, setTerritories] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [plannedIds, setPlannedIds] = useState<Set<string>>(new Set())
  const [territoryClientIds, setTerritoryClientIds] = useState<Set<string> | null>(null)
  const [loadingClients, setLoadingClients] = useState(false)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [vendor, setVendor] = useState('')
  const [includeOutsidePortfolio, setIncludeOutsidePortfolio] = useState(false)
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' }))
  const [type, setType] = useState<PlanType>('VISITAS')
  const [territory, setTerritory] = useState('')
  const [target, setTarget] = useState(12)
  const [region, setRegion] = useState('')
  const [province, setProvince] = useState('')
  const [municipality, setMunicipality] = useState('')
  const [manager, setManager] = useState('')
  const [company, setCompany] = useState('')
  const [gpsFilter, setGpsFilter] = useState<GpsFilter>('ALL')
  const [geoFilter, setGeoFilter] = useState<GeoFilter>('ALL')
  const [availability, setAvailability] = useState<AvailabilityFilter>('AVAILABLE')
  const [territoryFilter, setTerritoryFilter] = useState('')
  const [busy, setBusy] = useState(false)

  const selectedVendor = vendors.find((item) => item.id === vendor)

  useEffect(() => {
    void Promise.all([
      supabase.from('employees').select('*').eq('active', true).in('employee_type', ['Vendedor', 'Gestor']).order('full_name'),
      supabase.from('territories').select('id,name,territory_type,region,province,municipality,active').eq('active', true).order('name'),
    ]).then(([employeeResponse, territoryResponse]) => {
      const list = (employeeResponse.data || []) as Employee[]
      setVendors(list.filter((item) => item.employee_type === 'Vendedor'))
      setManagers(list.filter((item) => item.employee_type === 'Gestor'))
      setTerritories(territoryResponse.data || [])
    })
  }, [])

  useEffect(() => {
    if (!canManagePlanning && employee?.employee_type === 'Vendedor' && !vendor) setVendor(employee.id)
  }, [canManagePlanning, employee?.employee_type, employee?.id, vendor])

  useEffect(() => {
    setSelected([])
  }, [vendor, includeOutsidePortfolio, date, type])

  useEffect(() => {
    if (type !== 'VISITAS' || !vendor) {
      setClients([])
      return
    }

    let cancelled = false
    setLoadingClients(true)
    void (async () => {
      let request = supabase
        .from('clients')
        .select('id,company_code,codempr,legal_name,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,region,province,municipality,sector_id,phone1,mobile,latitude,longitude,geo_status,last_invoice_date')
        .limit(3000)

      if (!includeOutsidePortfolio) request = request.eq('vendor_employee_id', vendor)
      const { data, error } = await request.order('legal_name')
      if (!cancelled) {
        if (error) {
          setClients([])
          alert(`No fue posible cargar la cartera: ${error.message}`)
        } else {
          setClients((data || []) as Client[])
        }
        setLoadingClients(false)
      }
    })()

    return () => { cancelled = true }
  }, [vendor, includeOutsidePortfolio, type])

  useEffect(() => {
    if (type !== 'VISITAS' || !date) {
      setPlannedIds(new Set())
      return
    }
    void (async () => {
      const { data: plans } = await supabase
        .from('route_plans')
        .select('id')
        .eq('route_date', date)
        .neq('status', 'CANCELADA')
      const planIds = (plans || []).map((item: any) => item.id)
      if (!planIds.length) return setPlannedIds(new Set())
      const { data: stops } = await supabase
        .from('route_stops')
        .select('client_id')
        .in('route_plan_id', planIds)
        .not('client_id', 'is', null)
      setPlannedIds(new Set((stops || []).map((item: any) => item.client_id).filter(Boolean)))
    })()
  }, [date, type])

  useEffect(() => {
    if (!territoryFilter) {
      setTerritoryClientIds(null)
      return
    }
    void supabase.rpc('clients_in_territory', { p_territory_id: territoryFilter }).then(({ data, error }) => {
      if (error) {
        setTerritoryClientIds(null)
        alert(`No fue posible aplicar la zona: ${error.message}`)
      } else {
        setTerritoryClientIds(new Set((data || []).map((item: any) => item.id)))
      }
    })
  }, [territoryFilter])

  useEffect(() => {
    setProvince('')
    setMunicipality('')
  }, [region])

  useEffect(() => {
    setMunicipality('')
  }, [province])

  const regionOptions = useMemo(() => uniqueSorted(clients.map((client) => client.region)), [clients])
  const provinceOptions = useMemo(() => uniqueSorted(clients.filter((client) => !region || client.region === region).map((client) => client.province)), [clients, region])
  const municipalityOptions = useMemo(() => uniqueSorted(clients.filter((client) => (!region || client.region === region) && (!province || client.province === province)).map((client) => client.municipality)), [clients, region, province])
  const companyOptions = useMemo(() => uniqueSorted(clients.map((client) => client.company_code)), [clients])

  const filteredClients = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('es')
    return clients.filter((client) => {
      if (term) {
        const searchable = [client.legal_name, client.codempr, client.phone1, client.mobile].filter(Boolean).join(' ').toLocaleLowerCase('es')
        if (!searchable.includes(term)) return false
      }
      if (region && client.region !== region) return false
      if (province && client.province !== province) return false
      if (municipality && client.municipality !== municipality) return false
      if (manager && client.manager_employee_id !== manager) return false
      if (company && client.company_code !== company) return false
      const hasGps = client.latitude != null && client.longitude != null
      if (gpsFilter === 'WITH' && !hasGps) return false
      if (gpsFilter === 'WITHOUT' && hasGps) return false
      if (geoFilter !== 'ALL' && client.geo_status !== geoFilter) return false
      const isPlanned = plannedIds.has(client.id)
      if (availability === 'AVAILABLE' && isPlanned) return false
      if (availability === 'PLANNED' && !isPlanned) return false
      if (territoryClientIds && !territoryClientIds.has(client.id)) return false
      return true
    })
  }, [clients, q, region, province, municipality, manager, company, gpsFilter, geoFilter, plannedIds, availability, territoryClientIds])

  const clientById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients])
  const selectedClients = useMemo(() => selected.map((id) => clientById.get(id)).filter((client): client is Client => Boolean(client)), [selected, clientById])
  const filteredGpsCount = useMemo(() => filteredClients.filter((client) => client.latitude != null && client.longitude != null).length, [filteredClients])
  const selectedGpsCount = useMemo(() => selectedClients.filter((client) => client.latitude != null && client.longitude != null).length, [selectedClients])

  const toggleClient = (clientId: string) => {
    if (!canManagePlanning) return
    setSelected((current) => current.includes(clientId) ? current.filter((id) => id !== clientId) : [...current, clientId])
  }

  const addAreaSelection = (ids: string[]) => {
    if (!canManagePlanning) return
    const visible = new Set(filteredClients.map((client) => client.id))
    setSelected((current) => Array.from(new Set([...current, ...ids.filter((id) => visible.has(id))])))
  }

  const clearFilters = () => {
    setQ('')
    setRegion('')
    setProvince('')
    setMunicipality('')
    setManager('')
    setCompany('')
    setGpsFilter('ALL')
    setGeoFilter('ALL')
    setAvailability('AVAILABLE')
    setTerritoryFilter('')
  }

  const orderSelected = async () => {
    if (!canManagePlanning || selected.length < 2) return
    let start: { latitude: number; longitude: number } | null = null
    try {
      const position = await currentPosition()
      start = { latitude: position.latitude, longitude: position.longitude }
    } catch {
      // Si el usuario no concede GPS, el algoritmo parte del centro geográfico de la selección.
    }
    const ordered = orderByNearest(selectedClients, start)
    setSelected(ordered.map((client) => client.id))
  }

  const create = async () => {
    if (!canManagePlanning) return alert('Tu perfil tiene acceso de consulta. Solo Administración o Supervisión puede crear planificaciones.')
    if (!vendor || !date) return alert('Selecciona vendedor y fecha')
    if (type === 'VISITAS' && !selected.length) return alert('Selecciona al menos un cliente')
    if (type === 'CAPTACION' && !territory) return alert('Selecciona una zona')

    setBusy(true)
    const territorialLabel = municipality || province || region
    const notes = type === 'VISITAS'
      ? [region && `Región: ${region}`, province && `Provincia: ${province}`, municipality && `Municipio: ${municipality}`].filter(Boolean).join(' · ') || null
      : null

    const { data: plan, error } = await supabase
      .from('route_plans')
      .insert({
        employee_id: vendor,
        route_date: date,
        plan_type: type,
        territory_id: type === 'CAPTACION' ? territory : null,
        title: type === 'CAPTACION' ? 'Jornada de captación' : `Ruta de visitas${territorialLabel ? ` - ${territorialLabel}` : ''}`,
        target_visits: type === 'VISITAS' ? selected.length : null,
        target_prospects: type === 'CAPTACION' ? target : null,
        status: 'PLANIFICADA',
        notes,
      })
      .select()
      .single()

    if (error || !plan) {
      setBusy(false)
      return alert(error?.message || 'No se pudo crear la planificación')
    }

    if (type === 'VISITAS') {
      const stops = selected.map((id, index) => ({
        route_plan_id: plan.id,
        client_id: id,
        stop_order: index + 1,
        priority: 'MEDIA',
        status: 'PENDIENTE',
      }))
      const { error: stopError } = await supabase.from('route_stops').insert(stops)
      if (stopError) {
        await supabase.from('route_plans').delete().eq('id', plan.id)
        setBusy(false)
        return alert(stopError.message)
      }
    }

    setBusy(false)
    setSelected([])
    alert('Planificación creada correctamente. Puedes verla y exportarla desde Rutas.')
  }

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">PLANIFICACIÓN TERRITORIAL</span>
          <h2>{canManagePlanning ? 'Crear jornada' : 'Consultar planificación'}</h2>
          <p>{canManagePlanning ? 'Planifica por cartera, territorio y cercanía visual sin depender de Excel.' : 'Consulta carteras, filtros territoriales y mapas. La creación y asignación está reservada a Administración/Supervisión.'}</p>
        </div>
      </div>

      <div className="planner-v2">
        <aside className="panel planner-sidebar">
          <h3>{canManagePlanning ? 'Configuración' : 'Modo consulta'}</h3>
          <div className="segmented">
            <button className={type === 'VISITAS' ? 'active' : ''} onClick={() => setType('VISITAS')}>Ruta de visitas</button>
            <button className={type === 'CAPTACION' ? 'active' : ''} onClick={() => setType('CAPTACION')}>Captación por zona</button>
          </div>

          <label>Vendedor
            <select value={vendor} onChange={(event) => setVendor(event.target.value)}>
              <option value="">Seleccionar...</option>
              {vendors.map((item) => <option value={item.id} key={item.id}>{item.full_name}</option>)}
            </select>
          </label>
          <label>Fecha
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>

          {type === 'CAPTACION' ? (
            canManagePlanning ? (
              <>
                <label>Zona
                  <select value={territory} onChange={(event) => setTerritory(event.target.value)}>
                    <option value="">Seleccionar zona...</option>
                    {territories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label>Objetivo de prospectos
                  <input type="number" min={1} value={target} onChange={(event) => setTarget(Number(event.target.value))} />
                </label>
                <a className="secondary center" href="/mapa"><MapIcon size={17} /> Crear o revisar zonas</a>
              </>
            ) : <div className="empty-state"><b>Solo consulta</b><span>Las jornadas de captación se asignan desde Administración/Supervisión.</span></div>
          ) : (
            canManagePlanning ? (
              <>
                {canOverridePortfolio && vendor && (
                  <label className="checkbox">
                    <input type="checkbox" checked={includeOutsidePortfolio} onChange={(event) => setIncludeOutsidePortfolio(event.target.checked)} />
                    Incluir clientes fuera de esta cartera
                  </label>
                )}
                <div className="selected-summary-grid">
                  <div className="selected-summary-card"><span>Seleccionados</span><strong>{selected.length}</strong></div>
                  <div className="selected-summary-card"><span>Con GPS</span><strong>{selectedGpsCount}</strong></div>
                  <div className="selected-summary-card"><span>Sin GPS</span><strong>{selected.length - selectedGpsCount}</strong></div>
                </div>
              </>
            ) : <div className="empty-state"><b>Vista global habilitada</b><span>Puedes consultar cualquier cartera. No puedes seleccionar clientes ni crear rutas.</span></div>
          )}

          {canManagePlanning && (
            <button className="primary full" disabled={busy || !vendor} onClick={() => void create()}>
              <CalendarPlus size={18} />{busy ? 'Creando...' : 'Crear planificación'}
            </button>
          )}
        </aside>

        <main className="planner-main">
          {type === 'VISITAS' ? (
            <>
              <section className="panel planner-filter-panel">
                <div className="panel-head">
                  <div>
                    <b>Filtros territoriales y comerciales</b>
                    <span>{!vendor ? 'Selecciona un vendedor para cargar su cartera.' : includeOutsidePortfolio ? 'Cobertura administrativa: todas las carteras.' : `Cartera homologada de ${selectedVendor?.full_name || 'vendedor'}.`}</span>
                  </div>
                </div>
                <div className="planner-filter-grid">
                  <div className="search-field"><Search size={17} /><input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Nombre, código o teléfono..." disabled={!vendor} /></div>
                  <select value={region} onChange={(event) => setRegion(event.target.value)} disabled={!vendor}><option value="">Todas las regiones</option>{regionOptions.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={province} onChange={(event) => setProvince(event.target.value)} disabled={!vendor}><option value="">Todas las provincias</option>{provinceOptions.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={municipality} onChange={(event) => setMunicipality(event.target.value)} disabled={!vendor}><option value="">Todos los municipios</option>{municipalityOptions.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={manager} onChange={(event) => setManager(event.target.value)} disabled={!vendor}><option value="">Todos los gestores</option>{managers.map((item) => <option value={item.id} key={item.id}>{item.full_name}</option>)}</select>
                  <select value={company} onChange={(event) => setCompany(event.target.value)} disabled={!vendor}><option value="">Todas las empresas</option>{companyOptions.map((value) => <option key={value}>{value}</option>)}</select>
                  <select value={gpsFilter} onChange={(event) => setGpsFilter(event.target.value as GpsFilter)} disabled={!vendor}><option value="ALL">Con y sin GPS</option><option value="WITH">Solo con GPS</option><option value="WITHOUT">Solo sin GPS</option></select>
                  <select value={geoFilter} onChange={(event) => setGeoFilter(event.target.value as GeoFilter)} disabled={!vendor}><option value="ALL">Cualquier calidad GPS</option><option value="VERIFICADA">GPS verificado</option><option value="SIN_VERIFICAR">GPS sin verificar</option><option value="POSIBLE_ERROR">Posible error GPS</option></select>
                  <select value={availability} onChange={(event) => setAvailability(event.target.value as AvailabilityFilter)} disabled={!vendor}><option value="AVAILABLE">No planificados en esta fecha</option><option value="ALL">Todos</option><option value="PLANNED">Ya planificados</option></select>
                  <select value={territoryFilter} onChange={(event) => setTerritoryFilter(event.target.value)} disabled={!vendor}><option value="">Todas las zonas guardadas</option>{territories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
                </div>
                <div className="planner-filter-actions">
                  <div className="meta">
                    <span>{loadingClients ? 'Cargando...' : `${filteredClients.length.toLocaleString()} resultados`}</span>
                    <span>{filteredGpsCount.toLocaleString()} visibles en mapa</span>
                    <span>{plannedIds.size.toLocaleString()} ya planificados el {date}</span>
                  </div>
                  <button className="secondary compact" onClick={clearFilters}><FilterX size={15} /> Limpiar filtros</button>
                </div>
              </section>

              <section className="planner-workspace">
                <div className="panel planner-map-panel">
                  <TerritoryClientMap
                    clients={filteredClients}
                    selectedIds={canManagePlanning ? selected : []}
                    selectable={canManagePlanning}
                    areaTools={canManagePlanning}
                    height={580}
                    onToggleClient={canManagePlanning ? toggleClient : undefined}
                    onAreaSelect={canManagePlanning ? (ids) => addAreaSelection(ids) : undefined}
                  />
                </div>
                <div className="panel planner-list-panel">
                  <div className="planner-list-head"><div><b>Clientes filtrados</b><span>Lista sincronizada con el mapa · máximo 250 visibles</span></div><span>{filteredClients.length}</span></div>
                  <div className="planner-list-scroll">
                    {!vendor ? <div className="empty-state"><b>Selecciona un vendedor.</b></div> : filteredClients.length === 0 ? <div className="empty-state"><b>No hay clientes con estos filtros.</b></div> : filteredClients.slice(0, 250).map((client) => {
                      const on = selected.includes(client.id)
                      if (!canManagePlanning) {
                        return <div key={client.id} className="pick-row"><div><b>{client.legal_name}</b><span>{client.codempr} · {client.municipality || client.province || 'Sin localidad'} · {client.latitude != null ? 'GPS' : 'Sin GPS'}</span></div></div>
                      }
                      return <button key={client.id} className={`pick-row ${on ? 'selected' : ''}`} onClick={() => toggleClient(client.id)}><div><b>{client.legal_name}</b><span>{client.codempr} · {client.municipality || client.province || 'Sin localidad'} · {client.latitude != null ? 'GPS' : 'Sin GPS'}</span></div>{on ? <X size={17} /> : <Plus size={17} />}</button>
                    })}
                  </div>
                </div>
              </section>

              {canManagePlanning && (
                <section className="panel planner-selected-panel">
                  <div className="planner-selected-head">
                    <div><b>Secuencia de la planificación</b><span>El orden mostrado será el orden inicial de las paradas.</span></div>
                    <div className="button-row"><button className="secondary compact" disabled={selected.length < 2} onClick={() => void orderSelected()}><Shuffle size={15} /> Ordenar por cercanía</button><button className="secondary compact" disabled={!selected.length} onClick={() => setSelected([])}><X size={15} /> Limpiar selección</button></div>
                  </div>
                  {!selected.length ? <div className="empty-state"><b>Selecciona clientes desde la lista, el mapa, un polígono o un radio.</b></div> : <div className="selected-route-strip">{selectedClients.map((client, index) => <div className="selected-stop-chip" key={client.id}><span className="order">{index + 1}</span><div><b>{client.legal_name}</b><span>{client.municipality || client.province || 'Sin localidad'}</span></div><button onClick={() => toggleClient(client.id)}><X size={14} /></button></div>)}</div>}
                </section>
              )}
            </>
          ) : (
            <section className="panel"><div className="empty-state"><MapIcon size={34} /><b>Jornada territorial de captación</b><span>{canManagePlanning ? 'Selecciona una zona guardada o crea una nueva desde el módulo Mapa.' : 'Consulta las jornadas de captación desde Rutas. La creación está reservada a Administración/Supervisión.'}</span></div></section>
          )}
        </main>
      </div>
    </div>
  )
}
