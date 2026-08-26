import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, FilterX, Map as MapIcon, Search, Shuffle, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { currentPosition } from '../lib/geo'
import { orderByNearest, uniqueSorted } from '../lib/spatial'
import { TerritoryClientMap } from '../components/TerritoryClientMap'
import type { MapZone } from '../components/TerritoryClientMap'
import { OfficialTerritoryFilters } from '../components/OfficialTerritoryFilters'
import { ClientTypeFilter } from '../components/ClientTypeFilter'
import type { ClientTypeFilterValue } from '../components/ClientTypeFilter'
import { geoQualityLabel, isGeoMismatch, loadGeoAssessmentMap, matchesGeoQualityFilter } from '../lib/geoQuality'
import type { GeoAssessment, GeoQualityFilter } from '../lib/geoQuality'
import { EMPTY_OFFICIAL_SELECTION, loadOfficialAreaDirectory, loadOfficialAreaGeometry, matchesOfficialSelection, selectedOfficialAreaId } from '../lib/officialTerritory'
import type { OfficialArea, OfficialSelection } from '../lib/officialTerritory'
import { loadClientsPaged } from '../lib/clientLoader'
import { hasPermission } from '../lib/access'
import type { Client, Employee } from '../types'
import '../styles/territorial-v2.css'

type GpsFilter = 'ALL' | 'WITH' | 'WITHOUT'
type GeoFilter = 'ALL' | 'VERIFICADA' | 'SIN_VERIFICAR' | 'POSIBLE_ERROR'
type AvailabilityFilter = 'AVAILABLE' | 'ALL' | 'PLANNED'
type TerritoryMode = 'MASTER' | 'OFFICIAL'

const PLANNING_CLIENT_COLUMNS = 'id,company_code,codempr,client_type,legal_name,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,region,province,municipality,sector_id,phone1,mobile,latitude,longitude,geo_status,last_invoice_date'

export function Planning() {
  const navigate = useNavigate()
  const { employee } = useAuth()
  const canManagePlanning = hasPermission(employee, 'planning.manage')
  const canOverridePortfolio = canManagePlanning

  const [vendors,setVendors]=useState<Employee[]>([])
  const [managers,setManagers]=useState<Employee[]>([])
  const [territories,setTerritories]=useState<any[]>([])
  const [clients,setClients]=useState<Client[]>([])
  const [geoAssessments,setGeoAssessments]=useState<Map<string,GeoAssessment>>(new Map())
  const [officialAreas,setOfficialAreas]=useState<OfficialArea[]>([])
  const [plannedIds,setPlannedIds]=useState<Set<string>>(new Set())
  const [territoryClientIds,setTerritoryClientIds]=useState<Set<string>|null>(null)
  const [loadingClients,setLoadingClients]=useState(false)
  const [q,setQ]=useState('')
  const [selected,setSelected]=useState<string[]>([])
  const [vendor,setVendor]=useState('')
  const [includeOutsidePortfolio,setIncludeOutsidePortfolio]=useState(false)
  const [date,setDate]=useState(new Date().toLocaleDateString('en-CA',{timeZone:'America/Santo_Domingo'}))
  const [territoryMode,setTerritoryMode]=useState<TerritoryMode>('MASTER')
  const [region,setRegion]=useState('')
  const [province,setProvince]=useState('')
  const [municipality,setMunicipality]=useState('')
  const [officialSelection,setOfficialSelection]=useState<OfficialSelection>(EMPTY_OFFICIAL_SELECTION)
  const [officialArea,setOfficialArea]=useState<OfficialArea|null>(null)
  const [manager,setManager]=useState('')
  const [company,setCompany]=useState('')
  const [clientType,setClientType]=useState<ClientTypeFilterValue>('')
  const [gpsFilter,setGpsFilter]=useState<GpsFilter>('ALL')
  const [geoFilter,setGeoFilter]=useState<GeoFilter>('ALL')
  const [territorialQuality,setTerritorialQuality]=useState<GeoQualityFilter>('ALL')
  const [availability,setAvailability]=useState<AvailabilityFilter>('AVAILABLE')
  const [territoryFilter,setTerritoryFilter]=useState('')
  const [busy,setBusy]=useState(false)

  const selectedVendor=vendors.find(item=>item.id===vendor)

  useEffect(()=>{
    void Promise.all([
      supabase.from('employees').select('*').eq('active',true).in('employee_type',['Vendedor','Gestor']).order('full_name'),
      supabase.from('territories').select('id,name,territory_type,region,province,municipality,active,geometry').eq('active',true).order('name'),
      loadGeoAssessmentMap(),
      loadOfficialAreaDirectory(),
    ]).then(([employeeResponse,territoryResponse,assessmentMap,areaRows])=>{
      const list=(employeeResponse.data||[]) as Employee[]
      setVendors(list.filter(i=>i.employee_type==='Vendedor'))
      setManagers(list.filter(i=>i.employee_type==='Gestor'))
      setTerritories(territoryResponse.data||[])
      setGeoAssessments(assessmentMap)
      setOfficialAreas(areaRows)
    }).catch(error=>alert(error instanceof Error?error.message:'No fue posible cargar planificación'))
  },[])

  useEffect(()=>{
    if(!canManagePlanning&&employee?.employee_type==='Vendedor'&&!vendor)setVendor(employee.id)
  },[canManagePlanning,employee?.employee_type,employee?.id,vendor])

  useEffect(()=>{setSelected([])},[vendor,includeOutsidePortfolio,date,clientType])

  useEffect(()=>{
    if(!vendor){setClients([]);return}
    let cancelled=false
    setLoadingClients(true)
    void loadClientsPaged(PLANNING_CLIENT_COLUMNS,includeOutsidePortfolio?null:vendor)
      .then(rows=>{if(!cancelled)setClients(rows)})
      .catch(error=>{if(!cancelled){setClients([]);alert(error instanceof Error?error.message:'No fue posible cargar la cartera completa')}})
      .finally(()=>{if(!cancelled)setLoadingClients(false)})
    return()=>{cancelled=true}
  },[vendor,includeOutsidePortfolio])

  useEffect(()=>{
    if(!date){setPlannedIds(new Set());return}
    void(async()=>{
      const{data:plans}=await supabase.from('route_plans').select('id').eq('route_date',date).eq('plan_type','VISITAS').neq('status','CANCELADA')
      const planIds=(plans||[]).map((i:any)=>i.id)
      if(!planIds.length)return setPlannedIds(new Set())
      const{data:stops}=await supabase.from('route_stops').select('client_id').in('route_plan_id',planIds).not('client_id','is',null)
      setPlannedIds(new Set((stops||[]).map((i:any)=>i.client_id).filter(Boolean)))
    })()
  },[date])

  useEffect(()=>{
    if(!territoryFilter){setTerritoryClientIds(null);return}
    void supabase.rpc('clients_in_territory',{p_territory_id:territoryFilter}).then(({data,error})=>
      error?(setTerritoryClientIds(null),alert(`No fue posible aplicar la zona: ${error.message}`)):
        setTerritoryClientIds(new Set((data||[]).map((i:any)=>i.id)))
    )
  },[territoryFilter])

  useEffect(()=>{setProvince('');setMunicipality('')},[region])
  useEffect(()=>setMunicipality(''),[province])
  useEffect(()=>{
    if(territoryMode==='MASTER')setOfficialSelection(EMPTY_OFFICIAL_SELECTION)
    else{setRegion('');setProvince('');setMunicipality('')}
  },[territoryMode])
  useEffect(()=>{
    const id=selectedOfficialAreaId(officialSelection)
    if(!id)return setOfficialArea(null)
    void loadOfficialAreaGeometry(id).then(setOfficialArea).catch(()=>setOfficialArea(null))
  },[officialSelection])

  const regionOptions=useMemo(()=>uniqueSorted(clients.map(c=>c.region)),[clients])
  const provinceOptions=useMemo(()=>uniqueSorted(clients.filter(c=>!region||c.region===region).map(c=>c.province)),[clients,region])
  const municipalityOptions=useMemo(()=>uniqueSorted(clients.filter(c=>(!region||c.region===region)&&(!province||c.province===province)).map(c=>c.municipality)),[clients,region,province])
  const companyOptions=useMemo(()=>uniqueSorted(clients.map(c=>c.company_code)),[clients])

  const filteredClients=useMemo(()=>{
    const term=q.trim().toLocaleLowerCase('es')
    return clients.filter(client=>{
      if(term&&!([client.legal_name,client.codempr,client.phone1,client.mobile].filter(Boolean).join(' ').toLocaleLowerCase('es').includes(term)))return false
      if(clientType&&client.client_type!==clientType)return false
      if(territoryMode==='MASTER'){
        if(region&&client.region!==region)return false
        if(province&&client.province!==province)return false
        if(municipality&&client.municipality!==municipality)return false
      }else if(!matchesOfficialSelection(geoAssessments.get(client.id),officialAreas,officialSelection))return false
      if(manager&&client.manager_employee_id!==manager)return false
      if(company&&client.company_code!==company)return false
      const hasGps=client.latitude!=null&&client.longitude!=null
      if(gpsFilter==='WITH'&&!hasGps)return false
      if(gpsFilter==='WITHOUT'&&hasGps)return false
      if(geoFilter!=='ALL'&&client.geo_status!==geoFilter)return false
      if(!matchesGeoQualityFilter(geoAssessments.get(client.id),territorialQuality))return false
      const isPlanned=plannedIds.has(client.id)
      if(availability==='AVAILABLE'&&isPlanned)return false
      if(availability==='PLANNED'&&!isPlanned)return false
      if(territoryClientIds&&!territoryClientIds.has(client.id))return false
      return true
    })
  },[clients,q,clientType,territoryMode,region,province,municipality,officialAreas,officialSelection,manager,company,gpsFilter,geoFilter,geoAssessments,territorialQuality,plannedIds,availability,territoryClientIds])

  const clientById=useMemo(()=>new Map(clients.map(c=>[c.id,c])),[clients])
  const selectedClients=useMemo(()=>selected.map(id=>clientById.get(id)).filter((c):c is Client=>Boolean(c)),[selected,clientById])
  const filteredGpsCount=useMemo(()=>filteredClients.filter(c=>c.latitude!=null&&c.longitude!=null).length,[filteredClients])
  const filteredMismatchCount=useMemo(()=>filteredClients.filter(c=>isGeoMismatch(geoAssessments.get(c.id)?.assessment_status)).length,[filteredClients,geoAssessments])
  const selectedGpsCount=useMemo(()=>selectedClients.filter(c=>c.latitude!=null&&c.longitude!=null).length,[selectedClients])
  const officialZone:MapZone|null=officialArea?.geometry?{id:`official-${officialArea.id}`,name:officialArea.name,territory_type:`DIVISIÓN OFICIAL · ${officialArea.area_level}`,geometry:officialArea.geometry}:null
  const mapZones:MapZone[]=[...(territoryFilter?territories.filter(t=>t.id===territoryFilter):[]),...(officialZone?[officialZone]:[])]

  const toggleClient=(id:string)=>{
    if(!canManagePlanning)return
    setSelected(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id])
  }
  const addAreaSelection=(ids:string[])=>{
    if(!canManagePlanning)return
    const visible=new Set(filteredClients.map(c=>c.id))
    setSelected(current=>Array.from(new Set([...current,...ids.filter(id=>visible.has(id))])))
  }
  const clearFilters=()=>{
    setQ('');setClientType('');setRegion('');setProvince('');setMunicipality('');setOfficialSelection(EMPTY_OFFICIAL_SELECTION);setManager('');setCompany('');setGpsFilter('ALL');setGeoFilter('ALL');setTerritorialQuality('ALL');setAvailability('AVAILABLE');setTerritoryFilter('')
  }
  const orderSelected=async()=>{
    if(!canManagePlanning||selected.length<2)return
    let start:{latitude:number;longitude:number}|null=null
    try{const p=await currentPosition();start={latitude:p.latitude,longitude:p.longitude}}catch{}
    setSelected(orderByNearest(selectedClients,start).map(c=>c.id))
  }

  const create=async()=>{
    if(!canManagePlanning)return alert('Tu perfil tiene acceso de consulta.')
    if(!vendor||!date)return alert('Selecciona vendedor y fecha')
    if(!selected.length)return alert('Selecciona al menos un cliente')
    setBusy(true)
    try{
      const territorialLabel=territoryMode==='OFFICIAL'?officialArea?.name:(municipality||province||region)
      const notes=territoryMode==='OFFICIAL'&&officialArea?`División oficial: ${officialArea.area_level} · ${officialArea.name}`:[clientType&&`Tipo: ${clientType}`,region&&`Región: ${region}`,province&&`Provincia: ${province}`,municipality&&`Municipio: ${municipality}`].filter(Boolean).join(' · ')||null
      const{data:plan,error}=await supabase.from('route_plans').insert({employee_id:vendor,route_date:date,plan_type:'VISITAS',territory_id:null,title:`Ruta de visitas${territorialLabel?` - ${territorialLabel}`:''}`,target_visits:selected.length,target_prospects:null,status:'PLANIFICADA',notes}).select().single()
      if(error||!plan)throw error||new Error('No se pudo crear la planificación')
      const{error:stopError}=await supabase.from('route_stops').insert(selected.map((id,index)=>({route_plan_id:plan.id,client_id:id,stop_order:index+1,priority:'MEDIA',status:'PENDIENTE'})))
      if(stopError){await supabase.from('route_plans').delete().eq('id',plan.id);throw stopError}
      setSelected([])
      alert('Planificación creada correctamente. Puedes verla desde Rutas.')
    }catch(error){alert(error instanceof Error?error.message:'No se pudo crear la planificación')}
    finally{setBusy(false)}
  }

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">PLANIFICACIÓN TERRITORIAL</span><h2>{canManagePlanning?'Crear jornada':'Consultar planificación'}</h2><p>Planifica rutas de visitas por cartera, división territorial, zonas guardadas y cercanía visual.</p></div><div className="button-row"><button className="secondary" onClick={()=>navigate('/captacion')}><Target size={17}/> Ir a Captación</button></div></div>
    <div className="planner-v2">
      <aside className="panel planner-sidebar">
        <h3>{canManagePlanning?'Configuración':'Modo consulta'}</h3>
        <div className="segmented"><button className="active">Ruta de visitas</button><button onClick={()=>navigate('/captacion')}>Captación</button></div>
        <div className="route-manager-note"><b>Captación centralizada:</b> las tareas de prospección se asignan y ejecutan desde el módulo Captación.</div>
        <label>Vendedor<select value={vendor} onChange={e=>setVendor(e.target.value)}><option value="">Seleccionar...</option>{vendors.map(i=><option value={i.id} key={i.id}>{i.full_name}</option>)}</select></label>
        <label>Fecha<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label>
        {canManagePlanning?<> {canOverridePortfolio&&vendor&&<label className="checkbox"><input type="checkbox" checked={includeOutsidePortfolio} onChange={e=>setIncludeOutsidePortfolio(e.target.checked)}/> Incluir clientes fuera de esta cartera</label>}<div className="selected-summary-grid"><div className="selected-summary-card"><span>Seleccionados</span><strong>{selected.length}</strong></div><div className="selected-summary-card"><span>Con GPS</span><strong>{selectedGpsCount}</strong></div><div className="selected-summary-card"><span>Sin GPS</span><strong>{selected.length-selectedGpsCount}</strong></div></div></>:<div className="empty-state"><b>Vista global habilitada</b></div>}
        {canManagePlanning&&<button className="primary full" disabled={busy||!vendor||!selected.length} onClick={()=>void create()}><CalendarPlus size={18}/>{busy?'Creando...':'Crear planificación'}</button>}
      </aside>
      <main className="planner-main">
        <section className="panel planner-filter-panel"><div className="panel-head"><div><b>Filtros territoriales y comerciales</b><span>{!vendor?'Selecciona un vendedor para cargar su cartera.':includeOutsidePortfolio?'Cobertura administrativa: todas las carteras.':`Cartera homologada de ${selectedVendor?.full_name||'vendedor'}.`}</span></div></div>
          <div className="territory-source-row"><b>Territorio según</b><div className="segmented compact-segmented"><button className={territoryMode==='MASTER'?'active':''} onClick={()=>setTerritoryMode('MASTER')}>Maestro comercial</button><button className={territoryMode==='OFFICIAL'?'active':''} onClick={()=>setTerritoryMode('OFFICIAL')}>División territorial oficial</button></div></div>
          <div className="planner-filter-grid"><div className="search-field"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nombre, código o teléfono..." disabled={!vendor}/></div><ClientTypeFilter value={clientType} onChange={setClientType} disabled={!vendor}/>{territoryMode==='MASTER'?<><select value={region} onChange={e=>setRegion(e.target.value)} disabled={!vendor}><option value="">Todas las regiones (maestro)</option>{regionOptions.map(v=><option key={v}>{v}</option>)}</select><select value={province} onChange={e=>setProvince(e.target.value)} disabled={!vendor}><option value="">Todas las provincias (maestro)</option>{provinceOptions.map(v=><option key={v}>{v}</option>)}</select><select value={municipality} onChange={e=>setMunicipality(e.target.value)} disabled={!vendor}><option value="">Todos los municipios (maestro)</option>{municipalityOptions.map(v=><option key={v}>{v}</option>)}</select></>:<OfficialTerritoryFilters areas={officialAreas} value={officialSelection} onChange={setOfficialSelection} disabled={!vendor}/>}<select value={manager} onChange={e=>setManager(e.target.value)} disabled={!vendor}><option value="">Todos los gestores</option>{managers.map(i=><option value={i.id} key={i.id}>{i.full_name}</option>)}</select><select value={company} onChange={e=>setCompany(e.target.value)} disabled={!vendor}><option value="">Todas las empresas</option>{companyOptions.map(v=><option key={v}>{v}</option>)}</select><select value={gpsFilter} onChange={e=>setGpsFilter(e.target.value as GpsFilter)} disabled={!vendor}><option value="ALL">Con y sin GPS</option><option value="WITH">Solo con GPS</option><option value="WITHOUT">Solo sin GPS</option></select><select value={geoFilter} onChange={e=>setGeoFilter(e.target.value as GeoFilter)} disabled={!vendor}><option value="ALL">Cualquier estado GPS</option><option value="VERIFICADA">GPS verificado</option><option value="SIN_VERIFICAR">GPS sin verificar</option><option value="POSIBLE_ERROR">Posible error GPS</option></select><select value={territorialQuality} onChange={e=>setTerritorialQuality(e.target.value as GeoQualityFilter)} disabled={!vendor}><option value="ALL">Cualquier coherencia</option><option value="COHERENTE">Maestro = ubicación</option><option value="DIFERENCIA">Maestro ≠ ubicación</option><option value="SIN_GEO">Sin GPS</option><option value="FUERA_DIVISION">Fuera de división</option><option value="VERIFICADO_VISITA">Verificado por visita</option></select><select value={availability} onChange={e=>setAvailability(e.target.value as AvailabilityFilter)} disabled={!vendor}><option value="AVAILABLE">Disponibles para planificar</option><option value="ALL">Todos</option><option value="PLANNED">Ya planificados en fecha</option></select><select value={territoryFilter} onChange={e=>setTerritoryFilter(e.target.value)} disabled={!vendor}><option value="">Sin zona guardada</option>{territories.map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select></div>
          <div className="planner-filter-actions"><div className="meta"><span>{filteredClients.length.toLocaleString()} clientes filtrados</span><span>{filteredGpsCount.toLocaleString()} con GPS</span><span>{filteredMismatchCount.toLocaleString()} con diferencia territorial</span>{loadingClients&&<span>Cargando cartera…</span>}</div><button className="secondary compact" onClick={clearFilters}><FilterX size={15}/> Limpiar filtros</button></div>
        </section>

        <section className="panel"><div className="panel-head"><div><b>Selección de clientes</b><span>Selecciona en lista, mapa, polígono o radio. Las zonas guardadas sirven como filtro; la asignación de Captación vive únicamente en Captación.</span></div><div className="button-row"><button className="secondary compact" disabled={selected.length<2} onClick={()=>void orderSelected()}><Shuffle size={15}/> Ordenar por cercanía</button><button className="secondary compact" disabled={!selected.length} onClick={()=>setSelected([])}>Limpiar selección</button></div></div>
          <TerritoryClientMap clients={filteredClients} geoAssessments={geoAssessments} selectedIds={selected} selectable={canManagePlanning} areaTools={canManagePlanning} zones={mapZones} showZones={true} height={540} onToggleClient={toggleClient} onAreaSelect={(ids)=>addAreaSelection(ids)}/>
        </section>

        <section className="panel"><div className="panel-head"><div><b>Clientes visibles</b><span>{filteredClients.length>250?`Mostrando los primeros 250 de ${filteredClients.length.toLocaleString()}. Usa filtros o el mapa para acotar.`:`${filteredClients.length.toLocaleString()} cliente(s) visibles.`}</span></div></div><div className="cards-list">{filteredClients.slice(0,250).map(client=>{const checked=selected.includes(client.id);const assessment=geoAssessments.get(client.id);return <button key={client.id} className={`activity-card ${checked?'selected':''}`} onClick={()=>toggleClient(client.id)} disabled={!canManagePlanning}><div className="activity-icon"><MapIcon size={17}/></div><div className="activity-main"><b>{client.legal_name}</b><span>{client.codempr} · {client.client_type||'SIN TIPO'} · {client.municipality||client.province||'Sin municipio'}</span><small>{client.manager_employee_id?`Gestor asignado · `:''}{geoQualityLabel(assessment?.assessment_status)}</small></div><span className="badge">{checked?'SELECCIONADO':plannedIds.has(client.id)?'PLANIFICADO':'DISPONIBLE'}</span></button>})}</div></section>
      </main>
    </div>
  </div>
}
