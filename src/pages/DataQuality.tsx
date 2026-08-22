import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle,CheckCircle2,Database,MapPinOff,RefreshCw,ShieldCheck,XCircle,MapPinned,Route,ScanSearch } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { KpiCard } from '../components/KpiCard'
import { useAuth } from '../context/AuthContext'
import { exportPdf,exportXlsx } from '../lib/export'

type IntelligenceSummary={assessment_status:string;clients:number}
type ViewMode='CARTERA'|'VISITAS'

const statusInfo:Record<string,{label:string;detail:string}>={
  COHERENTE_SIN_VISITA:{label:'Coherente sin visita',detail:'Maestro y coordenada guardada coinciden. Falta evidencia de campo.'},
  VERIFICADO_VISITA:{label:'Verificado por visita',detail:'Maestro, coordenada guardada y GPS real de visita coinciden.'},
  PENDIENTE_VISITA:{label:'Pendiente de visita',detail:'Maestro y coordenada guardada difieren. No se decide cuál está mal hasta una visita real.'},
  COORDENADA_SOSPECHOSA:{label:'Coordenada sospechosa',detail:'El GPS de visita coincide con el maestro, pero no con la coordenada guardada.'},
  TERRITORIO_SOSPECHOSO:{label:'Territorio sospechoso',detail:'El GPS de visita coincide con la coordenada guardada, pero no con el territorio maestro.'},
  INCONSISTENCIA_VISITA:{label:'GPS de visita inconsistente',detail:'Maestro y coordenada guardada coinciden, pero la visita ocurrió en otra demarcación.'},
  INCONSISTENCIA_GRAVE:{label:'Inconsistencia fuerte',detail:'Las tres fuentes no permiten concluir una corrección segura. Requiere revisión.'},
  FUERA_DIVISION:{label:'Fuera de división',detail:'La coordenada no pudo resolverse contra la división territorial cargada.'},
  SIN_GEO:{label:'Sin GPS',detail:'El cliente no tiene coordenadas para realizar el diagnóstico.'},
}

function territory(region?:string|null,province?:string|null,municipality?:string|null){
  return [region,province,municipality].filter(Boolean).join(' · ')||'—'
}

export function DataQuality(){
  const {employee}=useAuth()
  const admin=['Administrador','Supervisor'].includes(employee?.app_role||'')
  const [mode,setMode]=useState<ViewMode>('CARTERA')
  const [summary,setSummary]=useState<IntelligenceSummary[]>([])
  const [assessments,setAssessments]=useState<any[]>([])
  const [events,setEvents]=useState<any[]>([])
  const [areaCounts,setAreaCounts]=useState<Record<string,number>>({})
  const [assessmentStatus,setAssessmentStatus]=useState('ALL')
  const [eventStatus,setEventStatus]=useState('DIFERENCIA')
  const [search,setSearch]=useState('')
  const [busy,setBusy]=useState(false)

  const load=async()=>{
    setBusy(true)
    let aq=supabase.from('client_geo_assessments').select('*').order('legal_name').limit(500)
    if(assessmentStatus!=='ALL')aq=aq.eq('assessment_status',assessmentStatus)
    const [{data:s},{data:a},{data:e},{data:areas}]=await Promise.all([
      supabase.from('geo_intelligence_summary').select('*'),
      aq,
      supabase.from('geo_verification_events').select('*,clients(codempr,legal_name,region,province,municipality),employees(full_name)').eq('status',eventStatus).order('captured_at',{ascending:false}).limit(250),
      supabase.from('administrative_areas').select('area_level').eq('active',true),
    ])
    setSummary((s||[]) as IntelligenceSummary[])
    setAssessments(a||[])
    setEvents(e||[])
    const counts:Record<string,number>={}
    ;(areas||[]).forEach((row:any)=>{counts[row.area_level]=(counts[row.area_level]||0)+1})
    setAreaCounts(counts)
    setBusy(false)
  }
  useEffect(()=>{void load()},[assessmentStatus,eventStatus])

  const count=(...keys:string[])=>keys.reduce((sum,key)=>sum+Number(summary.find(x=>x.assessment_status===key)?.clients||0),0)
  const totalAreas=Object.values(areaCounts).reduce((a,b)=>a+b,0)
  const q=search.trim().toUpperCase()
  const visibleAssessments=useMemo(()=>assessments.filter(a=>!q||[a.legal_name,a.codempr,a.master_region,a.master_province,a.master_municipality,a.detected_region,a.detected_province,a.detected_municipality,a.visit_region,a.visit_province,a.visit_municipality].some(v=>String(v||'').toUpperCase().includes(q))),[assessments,q])

  const diagnosticRows=useMemo(()=>visibleAssessments.map(a=>({
    Cliente:a.legal_name||'',Codigo:a.codempr||'',
    'Territorio maestro':territory(a.master_region,a.master_province,a.master_municipality),
    'Territorio por coordenada':territory(a.detected_region,a.detected_province,a.detected_municipality),
    'Última visita':a.visit_at?new Date(a.visit_at).toLocaleString('es-DO'):'Sin visita',
    'Territorio GPS visita':territory(a.visit_region,a.visit_province,a.visit_municipality),
    Estado:statusInfo[a.assessment_status]?.label||a.assessment_status,
  })),[visibleAssessments])

  const visitRows=useMemo(()=>events.map(e=>({
    Fecha:new Date(e.captured_at).toLocaleString('es-DO'),Cliente:e.clients?.legal_name||'',Codigo:e.clients?.codempr||'',Empleado:e.employees?.full_name||'',
    'Región actual':e.current_region||'','Provincia actual':e.current_province||'','Municipio actual':e.current_municipality||'',
    'Región detectada':e.detected_region||'','Provincia detectada':e.detected_province||'','Municipio detectado':e.detected_municipality||'',
    Localidad:e.detected_locality||'','Precisión GPS':e.accuracy_m==null?'':Math.round(Number(e.accuracy_m)),
    'Distancia maestro (m)':e.distance_to_master_m==null?'':Math.round(Number(e.distance_to_master_m)),Estado:e.status,
  })),[events])

  const review=async(id:string,action:'APROBAR'|'RECHAZAR')=>{
    if(!admin)return
    const text=action==='APROBAR'?'Esto actualizará Región, Provincia y Municipio con la geografía detectada. Las coordenadas no se modificarán. ¿Continuar?':'¿Rechazar esta sugerencia geográfica?'
    if(!confirm(text))return
    const {error}=await supabase.rpc('review_geo_verification',{p_event_id:id,p_action:action,p_update_coordinates:false,p_notes:null})
    if(error)alert(error.message);else void load()
  }

  const exportRows=mode==='CARTERA'?diagnosticRows:visitRows
  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">INTELIGENCIA TERRITORIAL</span><h2>Calidad geográfica</h2><p>Contrasta territorio maestro, coordenada guardada y GPS real de visita. Ninguna discrepancia corrige datos automáticamente.</p></div><div className="button-row"><button className="secondary" onClick={()=>void exportXlsx('Calidad_Geografica',exportRows)}>Excel</button><button className="secondary" onClick={()=>exportPdf('Calidad Geográfica',exportRows)}>PDF</button><button className="secondary" onClick={()=>void load()}><RefreshCw size={17}/> Actualizar</button></div></div>

    <div className="kpi-grid">
      <KpiCard label="Coherentes" value={count('COHERENTE_SIN_VISITA','VERIFICADO_VISITA')} sub="maestro y coordenada compatibles" Icon={CheckCircle2}/>
      <KpiCard label="Pendientes de visita" value={count('PENDIENTE_VISITA')} sub="no decidir hasta tener GPS real" Icon={Route}/>
      <KpiCard label="Coordenada sospechosa" value={count('COORDENADA_SOSPECHOSA')} sub="visita respalda al maestro" Icon={MapPinned}/>
      <KpiCard label="Territorio sospechoso" value={count('TERRITORIO_SOSPECHOSO')} sub="visita respalda la coordenada" Icon={ScanSearch}/>
      <KpiCard label="Inconsistencias" value={count('INCONSISTENCIA_VISITA','INCONSISTENCIA_GRAVE','FUERA_DIVISION')} sub="requieren revisión" Icon={AlertTriangle}/>
      <KpiCard label="Sin georreferencia" value={count('SIN_GEO')} sub="pendientes de ubicación" Icon={MapPinOff}/>
      <KpiCard label="Áreas oficiales" value={totalAreas} sub={totalAreas?`${areaCounts.REGION||0} reg. · ${areaCounts.PROVINCIA||0} prov. · ${areaCounts.MUNICIPIO||0} mun.`:'Pendiente importar geometrías'} Icon={Database}/>
    </div>

    {!totalAreas&&<div className="notice warning"><AlertTriangle size={18}/><div><b>La inteligencia espacial está preparada, pero aún faltan las geometrías territoriales.</b><span>Hasta completar la importación, la app conservará tus coordenadas sin proponer correcciones.</span></div></div>}
    {totalAreas>0&&<div className="notice"><ShieldCheck size={18}/><div><b>División territorial cargada con trazabilidad.</b><span>Las discrepancias se clasifican como evidencia; nunca sobrescriben automáticamente el maestro ni las coordenadas del cliente.</span></div></div>}

    <div className="panel">
      <div className="panel-head"><div><b>Diagnóstico geográfico</b><span>Elige entre la cartera completa y las evidencias generadas por visitas reales.</span></div><div className="button-row"><button className={mode==='CARTERA'?'primary':'secondary'} onClick={()=>setMode('CARTERA')}>Cartera</button><button className={mode==='VISITAS'?'primary':'secondary'} onClick={()=>setMode('VISITAS')}>Validaciones de visitas</button></div></div>

      {mode==='CARTERA'?<>
        <div className="filters-grid" style={{padding:'14px 16px'}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente, código o territorio..."/>
          <select value={assessmentStatus} onChange={e=>setAssessmentStatus(e.target.value)}>
            <option value="ALL">Todos los estados</option>
            {Object.entries(statusInfo).map(([key,info])=><option key={key} value={key}>{info.label}</option>)}
          </select>
        </div>
        <div className="responsive-table"><table><thead><tr><th>Cliente</th><th>Maestro</th><th>Coordenada guardada</th><th>Última visita</th><th>GPS visita</th><th>Diagnóstico</th></tr></thead><tbody>{busy?<tr><td colSpan={6}><div className="skeleton"/></td></tr>:visibleAssessments.length?visibleAssessments.map(a=>{const info=statusInfo[a.assessment_status]||{label:a.assessment_status,detail:''};return <tr key={a.client_id}><td data-label="Cliente"><b>{a.legal_name||'—'}</b><small>{a.codempr||''}</small></td><td data-label="Maestro"><span>{a.master_province||'—'}</span><small>{a.master_municipality||''}</small></td><td data-label="Coordenada guardada"><span>{a.detected_province||'No resuelta'}</span><small>{a.detected_municipality||''}</small></td><td data-label="Última visita"><span>{a.visit_at?new Date(a.visit_at).toLocaleDateString('es-DO'):'Sin visita'}</span><small>{a.visit_at?new Date(a.visit_at).toLocaleTimeString('es-DO'):''}</small></td><td data-label="GPS visita"><span>{a.visit_province||'—'}</span><small>{a.visit_municipality||''}</small></td><td data-label="Diagnóstico"><span className={`status ${String(a.assessment_status).toLowerCase()}`}>{info.label}</span><small>{info.detail}</small></td></tr>}):<tr><td colSpan={6}><div className="empty-state"><b>No hay clientes para este filtro.</b></div></td></tr>}</tbody></table></div>
      </>:<>
        <div className="panel-head"><div><b>Validaciones de visitas</b><span>Cada registro conserva el GPS real y la comparación vigente al momento de la visita.</span></div><select value={eventStatus} onChange={e=>setEventStatus(e.target.value)}><option value="DIFERENCIA">Diferencias</option><option value="PENDIENTE">Pendientes</option><option value="COINCIDE">Coinciden</option><option value="APROBADA">Aprobadas</option><option value="RECHAZADA">Rechazadas</option></select></div>
        <div className="responsive-table"><table><thead><tr><th>Cliente</th><th>GPS</th><th>Maestro actual</th><th>Detectado</th><th>Distancia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{busy?<tr><td colSpan={7}><div className="skeleton"/></td></tr>:events.length?events.map(e=><tr key={e.id}><td data-label="Cliente"><b>{e.clients?.legal_name||'—'}</b><small>{e.clients?.codempr||''} · {e.employees?.full_name||''}</small></td><td data-label="GPS"><span>{Number(e.latitude).toFixed(5)}, {Number(e.longitude).toFixed(5)}</span><small>±{Math.round(Number(e.accuracy_m||0))} m</small></td><td data-label="Maestro actual"><span>{e.current_province||'—'}</span><small>{e.current_municipality||''}</small></td><td data-label="Detectado"><span>{e.detected_province||'Pendiente'}</span><small>{e.detected_municipality||''}{e.detected_locality?` · ${e.detected_locality}`:''}</small></td><td data-label="Distancia">{e.distance_to_master_m==null?'—':`${Math.round(Number(e.distance_to_master_m))} m`}</td><td data-label="Estado"><span className={`status ${String(e.status).toLowerCase()}`}>{e.status}</span></td><td data-label="Acciones">{admin&&e.status==='DIFERENCIA'?<div className="row-actions"><button className="icon-btn success" title="Aprobar territorio" onClick={()=>void review(e.id,'APROBAR')}><CheckCircle2 size={17}/></button><button className="icon-btn danger" title="Rechazar" onClick={()=>void review(e.id,'RECHAZAR')}><XCircle size={17}/></button></div>:'—'}</td></tr>):<tr><td colSpan={7}><div className="empty-state"><b>No hay registros para este estado.</b></div></td></tr>}</tbody></table></div>
      </>}
    </div>
  </div>
}
