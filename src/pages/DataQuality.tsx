import { useEffect,useMemo,useState } from 'react'
import { AlertTriangle,CheckCircle2,Database,MapPinOff,RefreshCw,ShieldCheck,XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { KpiCard } from '../components/KpiCard'
import { useAuth } from '../context/AuthContext'
import { exportPdf,exportXlsx } from '../lib/export'

type SummaryRow={geo_status:string;clients:number}

export function DataQuality(){
  const {employee}=useAuth()
  const admin=['Administrador','Supervisor'].includes(employee?.app_role||'')
  const [summary,setSummary]=useState<SummaryRow[]>([])
  const [events,setEvents]=useState<any[]>([])
  const [areas,setAreas]=useState(0)
  const [status,setStatus]=useState('DIFERENCIA')
  const [busy,setBusy]=useState(false)

  const load=async()=>{
    setBusy(true)
    const [{data:s},{data:e},{count:a}]=await Promise.all([
      supabase.from('geo_quality_summary').select('*'),
      supabase.from('geo_verification_events').select('*,clients(codempr,legal_name,region,province,municipality),employees(full_name)').eq('status',status).order('captured_at',{ascending:false}).limit(250),
      supabase.from('administrative_areas').select('*',{count:'exact',head:true}).eq('active',true),
    ])
    setSummary((s||[]) as SummaryRow[])
    setEvents(e||[])
    setAreas(a||0)
    setBusy(false)
  }
  useEffect(()=>{void load()},[status])
  const count=(key:string)=>Number(summary.find(x=>x.geo_status===key)?.clients||0)
  const rows=useMemo(()=>events.map(e=>({
    Fecha:new Date(e.captured_at).toLocaleString('es-DO'),
    Cliente:e.clients?.legal_name||'',
    Codigo:e.clients?.codempr||'',
    Empleado:e.employees?.full_name||'',
    'Región actual':e.current_region||'',
    'Provincia actual':e.current_province||'',
    'Municipio actual':e.current_municipality||'',
    'Región detectada':e.detected_region||'',
    'Provincia detectada':e.detected_province||'',
    'Municipio detectado':e.detected_municipality||'',
    Localidad:e.detected_locality||'',
    'Precisión GPS':e.accuracy_m==null?'':Math.round(Number(e.accuracy_m)),
    'Distancia maestro (m)':e.distance_to_master_m==null?'':Math.round(Number(e.distance_to_master_m)),
    Estado:e.status,
  })),[events])
  const review=async(id:string,action:'APROBAR'|'RECHAZAR')=>{
    if(!admin)return
    const text=action==='APROBAR'?'Esto actualizará Región, Provincia y Municipio con la geografía detectada. ¿Continuar?':'¿Rechazar esta sugerencia geográfica?'
    if(!confirm(text))return
    const {error}=await supabase.rpc('review_geo_verification',{p_event_id:id,p_action:action,p_update_coordinates:false,p_notes:null})
    if(error)alert(error.message);else void load()
  }
  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">DEPURACIÓN AUTOMÁTICA</span><h2>Calidad geográfica</h2><p>Compara el maestro con el GPS real de las visitas sin sobrescribir datos de forma automática.</p></div><div className="button-row"><button className="secondary" onClick={()=>void exportXlsx('Calidad_Geografica',rows)}>Excel</button><button className="secondary" onClick={()=>exportPdf('Calidad Geográfica',rows)}>PDF</button><button className="secondary" onClick={()=>void load()}><RefreshCw size={17}/> Actualizar</button></div></div>
    <div className="kpi-grid">
      <KpiCard label="Verificados" value={count('VERIFICADA')} sub="GPS y maestro coinciden" Icon={CheckCircle2}/>
      <KpiCard label="Posible error" value={count('POSIBLE_ERROR')} sub="Requieren revisión" Icon={AlertTriangle}/>
      <KpiCard label="Sin verificar" value={count('SIN_VERIFICAR')} sub="Con geo, aún no validada" Icon={ShieldCheck}/>
      <KpiCard label="Sin georreferencia" value={count('SIN_GEO')} sub="Pendientes de ubicación" Icon={MapPinOff}/>
      <KpiCard label="Áreas oficiales" value={areas} sub={areas?'Polígonos territoriales cargados':'Pendiente importar límites ONE'} Icon={Database}/>
    </div>
    {!areas&&<div className="notice warning"><AlertTriangle size={18}/><div><b>Falta cargar la división territorial oficial.</b><span>Hasta cargar los polígonos de Región/Provincia/Municipio, las visitas conservarán GPS pero no podrán determinar automáticamente la demarcación.</span></div></div>}
    <div className="panel table-panel">
      <div className="panel-head"><div><b>Validaciones de visitas</b><span>Revisión manual recomendada durante la primera etapa.</span></div><select value={status} onChange={e=>setStatus(e.target.value)}><option value="DIFERENCIA">Diferencias</option><option value="PENDIENTE">Pendientes</option><option value="COINCIDE">Coinciden</option><option value="APROBADA">Aprobadas</option><option value="RECHAZADA">Rechazadas</option></select></div>
      <div className="responsive-table"><table><thead><tr><th>Cliente</th><th>GPS</th><th>Maestro actual</th><th>Detectado</th><th>Distancia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{busy?<tr><td colSpan={7}><div className="skeleton"/></td></tr>:events.length?events.map(e=><tr key={e.id}><td data-label="Cliente"><b>{e.clients?.legal_name||'—'}</b><small>{e.clients?.codempr||''} · {e.employees?.full_name||''}</small></td><td data-label="GPS"><span>{Number(e.latitude).toFixed(5)}, {Number(e.longitude).toFixed(5)}</span><small>±{Math.round(Number(e.accuracy_m||0))} m</small></td><td data-label="Maestro actual"><span>{e.current_province||'—'}</span><small>{e.current_municipality||''}</small></td><td data-label="Detectado"><span>{e.detected_province||'Pendiente'}</span><small>{e.detected_municipality||''}{e.detected_locality?` · ${e.detected_locality}`:''}</small></td><td data-label="Distancia">{e.distance_to_master_m==null?'—':`${Math.round(Number(e.distance_to_master_m))} m`}</td><td data-label="Estado"><span className={`status ${String(e.status).toLowerCase()}`}>{e.status}</span></td><td data-label="Acciones">{admin&&e.status==='DIFERENCIA'?<div className="row-actions"><button className="icon-btn success" title="Aprobar territorio" onClick={()=>void review(e.id,'APROBAR')}><CheckCircle2 size={17}/></button><button className="icon-btn danger" title="Rechazar" onClick={()=>void review(e.id,'RECHAZAR')}><XCircle size={17}/></button></div>:'—'}</td></tr>):<tr><td colSpan={7}><div className="empty-state"><b>No hay registros para este estado.</b></div></td></tr>}</tbody></table></div>
    </div>
  </div>
}
