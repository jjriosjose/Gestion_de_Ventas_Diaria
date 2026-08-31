import { useEffect,useMemo,useRef,useState } from 'react'
import { ChevronLeft,ChevronRight,CircleHelp,MousePointerClick,Play,ShieldCheck,X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useLocation,useNavigate } from 'react-router-dom'
import './InteractiveTour.css'

type PreviewKind='route'|'visit-flow'|'reception-flow'

type TourStep={
  id:string
  path?:string
  target:string
  secondaryTargets?:string[]
  preview?:PreviewKind
  eyebrow:string
  title:string
  body:string
  hint?:string
  safeActionLabel?:string
  safeActionSelector?:string
}

type Rect={top:number;left:number;width:number;height:number}

const baseSteps:TourStep[]=[
  {id:'welcome',target:'.brand-block',eyebrow:'RECORRIDO INTERACTIVO',title:'Conoce Gestión de Ventas Diaria',body:'Un recorrido guiado por las funciones principales del sistema. La demo bloquea acciones sensibles y solo permite interacciones seguras.',hint:'Usa Siguiente para avanzar. Puedes salir en cualquier momento.'},
  {id:'home',path:'/',target:'.dashboard-workspace .executive-band',secondaryTargets:['.dashboard-workspace .executive-shell-v062 > .kpi-grid','.dashboard-workspace .executive-chart-grid'],eyebrow:'01 · INICIO',title:'Visión ejecutiva de la operación',body:'El inicio muestra el pulso comercial y los KPIs que conectan clientes, rutas, visitas, ventas, llamadas y citas. Los gráficos inferiores comparan la ejecución de Vendedores y la gestión CRM/Showroom de Gestores.',hint:'El foco se amplía automáticamente a los bloques funcionales visibles.'},
  {id:'planning',path:'/planificacion',target:'.planner-v2',eyebrow:'02 · PLANIFICACIÓN',title:'Construye jornadas desde la cartera y el mapa',body:'Selecciona vendedor, fecha, territorio y clientes. La planificación combina filtros comerciales con contexto geográfico sin mezclar zonas de forma arbitraria.'},
  {id:'ordering',path:'/planificacion',target:'.planner-main .territorial-map-shell',preview:'route',eyebrow:'03 · SECUENCIA DE RUTA',title:'Visualiza ambos sentidos antes de crear la ruta',body:'La línea verde representa Cercanos → Lejanos y la violeta muestra la misma secuencia en sentido inverso, Lejanos → Cercanos. Las paradas se renumeran según el sentido elegido.',hint:'La ruta dibujada durante el tour es una simulación visual. No crea planificación ni modifica datos.'},
  {id:'routes',path:'/rutas',target:'.route-workspace',eyebrow:'04 · TMS / RUTAS',title:'Plan vs ejecución en una sola vista',body:'Consulta rutas asignadas, cobertura, estados, mapa, secuencia de paradas y eventualidades de la jornada. El sistema mantiene trazabilidad desde la planificación hasta el cierre.'},
  {id:'journeys',path:'/jornadas',target:'.journey-page .metric-section',secondaryTargets:['.journey-page .journey-filter-panel','.journey-page .journey-table-panel'],eyebrow:'05 · JORNADAS',title:'Control del ciclo operativo',body:'Jornadas combina filtros del período con indicadores de cobertura, cierre, tiempo y distancia. El historial inferior permite revisar cada jornada sin convertir una parada pendiente en una visita realizada.',hint:'El tour enfoca indicadores y, cuando están visibles, también filtros e historial.'},
  {id:'manager-calls',path:'/llamadas',target:'#crm-cartera',eyebrow:'06 · GESTOR / CRM',title:'Gestión telefónica con contexto 360 del cliente',body:'El Gestor consulta cartera, última llamada, última visita, resultado comercial y estado de showroom antes de contactar al cliente. Una llamada puede dejar seguimiento o generar una solicitud de showroom pendiente de validación.',hint:'El tour solo muestra el flujo. No guarda llamadas ni crea citas.'},
  {id:'manager-agenda',path:'/agenda',target:'.calendar-list',eyebrow:'07 · AGENDA / SHOWROOM',title:'De la intención a una cita confirmada',body:'Agenda concentra solicitudes, validación telefónica, citas confirmadas, reprogramaciones, asistencia y conversión. Una intención de showroom no cuenta como cita pactada hasta que el Gestor la confirma.',hint:'Recepción registra la llegada física; el Gestor continúa la atención comercial.'},
  {id:'manager-visits',path:'/visitas',target:'.page-stack > .cards-list',preview:'visit-flow',eyebrow:'08 · VISITAS Y SEGUIMIENTO',title:'La visita alimenta la continuidad comercial',body:'La lista real permite leer llegada, salida, duración, resultado y compra/no compra. La visita conserva además contacto y próxima acción; si existe interés en showroom, puede originar una solicitud para validación del Gestor.',hint:'El recorrido se actualiza cuando termina de cargar la lista y no abre ni finaliza visitas.'},
  {id:'manager-reception',path:'/recepcion',target:'.page-stack > .kpi-grid',secondaryTargets:['.page-stack > .page-head .primary'],preview:'reception-flow',eyebrow:'09 · RECEPCIÓN',title:'Llegada, espera, atención y salida',body:'Recepción controla la presencia física desde la entrada hasta la salida. Los indicadores muestran citas esperadas, personas dentro, espera y atención; “Llegada sin cita” permite registrar una entrada cuando corresponde.',hint:'El tour solo demuestra el flujo. No registra llegadas, atenciones ni salidas.'},
  {id:'tracking',path:'/tracking',target:'.tracking-workspace',eyebrow:'10 · TRACKING',title:'Seguimiento operativo sobre eventos GPS reales',body:'Tracking consolida vendedores, rutas, paradas y eventos GPS de inicio/fin de ruta, visitas y eventualidades. No se presenta como GPS continuo de fondo.'},
  {id:'tracking-modes',path:'/tracking',target:'.tracking-mode-switch',eyebrow:'11 · RECORRIDOS Y CALIDAD',title:'En vivo, recorridos y calidad GPS',body:'Cambia entre la última posición confiable, la secuencia de recorridos y la auditoría Registro vs Cliente.',safeActionLabel:'Mostrar Recorridos',safeActionSelector:'.tracking-mode-switch button:nth-child(2)'},
  {id:'control-tower',path:'/tracking',target:'.tracking-layout-switch',eyebrow:'12 · CONTROL TOWER',title:'Supervisión multi-vendedor',body:'Control Tower amplía el mapa, resume vendedores activos y conserva filtros, colores y selección individual para supervisar varias rutas al mismo tiempo.',safeActionLabel:'Activar Control Tower',safeActionSelector:'.tracking-layout-switch button:nth-child(3)'},
  {id:'quality',path:'/calidad-datos',target:'.page-stack > .kpi-grid',secondaryTargets:['.page-stack > .panel'],eyebrow:'13 · CALIDAD GEOGRÁFICA',title:'Detecta diferencias sin detener la operación',body:'Los indicadores resumen coherencia, pendientes, sospechas e inconsistencias. El diagnóstico inferior contrasta territorio maestro, coordenada guardada y GPS real de visita sin corregir datos automáticamente.',hint:'Se muestran tanto el resumen de calidad como el diagnóstico operativo cuando están visibles.'},
  {id:'reports',path:'/reportes',target:'.beta11-report .report-filter-panel',secondaryTargets:['.beta11-report .street-domain','.beta11-report .crm-domain','.beta11-report .commercial-domain','.beta11-report .executive-chart-grid'],eyebrow:'14 · INTELIGENCIA',title:'De la ejecución a la decisión',body:'El reporte combina filtros multiperíodo con indicadores separados de Calle, CRM/Showroom y resultado comercial. Las gráficas y tablas permiten analizar cobertura, tiempos, contacto y ventas sin mezclar canales.',hint:'Los bloques funcionales visibles se resaltan junto con los filtros del reporte.'},
  {id:'finish',target:'[data-tour="product-tour-trigger"]',eyebrow:'RECORRIDO COMPLETADO',title:'Planificación · Rutas · CRM · Tracking · Control · Analítica',body:'La plataforma conecta planificación, ejecución de calle, gestión del Gestor, showroom y supervisión geográfica en un mismo entorno.',hint:'Puedes iniciar este recorrido nuevamente desde el icono de ayuda.'},
]

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}

function rectFor(element:HTMLElement,pad=10):Rect|null{
  const box=element.getBoundingClientRect()
  if(box.bottom<0||box.top>window.innerHeight||box.right<0||box.left>window.innerWidth)return null
  const left=clamp(box.left-pad,8,Math.max(8,window.innerWidth-50))
  const top=clamp(box.top-pad,8,Math.max(8,window.innerHeight-50))
  const width=Math.max(42,Math.min(box.width+pad*2,window.innerWidth-left-8))
  const height=Math.max(42,Math.min(box.height+pad*2,window.innerHeight-top-8))
  return{top,left,width,height}
}

function routePreviewRect():Rect|null{
  const element=document.querySelector('.planner-main .leaflet-container') as HTMLElement|null
  if(!element)return null
  const box=element.getBoundingClientRect()
  const left=Math.max(8,box.left),top=Math.max(8,box.top)
  const right=Math.min(window.innerWidth-8,box.right),bottom=Math.min(window.innerHeight-8,box.bottom)
  if(right-left<260||bottom-top<180)return null
  return{left,top,width:right-left,height:bottom-top}
}

function SpotlightMask({rects}:{rects:Rect[]}){
  const width=window.innerWidth,height=window.innerHeight
  const hasTargets=rects.length>0
  return <svg className="product-tour-mask" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <mask id="product-tour-spotlight-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={width} height={height}>
        <rect x="0" y="0" width={width} height={height} fill="white"/>
        {rects.map((item,i)=><rect key={i} x={item.left} y={item.top} width={item.width} height={item.height} rx="18" ry="18" fill="black"/>)}
      </mask>
    </defs>
    <rect x="0" y="0" width={width} height={height} fill="#0f172a" fillOpacity={hasTargets?0.34:0.52} mask="url(#product-tour-spotlight-mask)"/>
  </svg>
}

function RouteDirectionPreview({rect}:{rect:Rect}){
  const nearPoints='120,390 250,330 370,360 520,250 690,285 850,135'
  const farPoints='850,165 690,315 520,280 370,390 250,360 120,420'
  const nearNodes=[[120,390],[250,330],[370,360],[520,250],[690,285],[850,135]]
  const farNodes=[[850,165],[690,315],[520,280],[370,390],[250,360],[120,420]]
  return <div className="product-tour-route-preview" style={{left:rect.left,top:rect.top,width:rect.width,height:rect.height}} aria-hidden="true">
    <div className="product-tour-route-demo-label">SIMULACIÓN VISUAL · NO GUARDA DATOS</div>
    <div className="product-tour-route-legend"><span className="near">Cercanos → Lejanos</span><span className="far">Lejanos → Cercanos</span></div>
    <svg viewBox="0 0 1000 520" preserveAspectRatio="none">
      <defs>
        <marker id="tour-near-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L7,3.5 L0,7 z" fill="#16865c"/></marker>
        <marker id="tour-far-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L7,3.5 L0,7 z" fill="#6d5ce7"/></marker>
      </defs>
      <polyline className="tour-demo-path near" points={nearPoints} markerMid="url(#tour-near-arrow)" markerEnd="url(#tour-near-arrow)"/>
      <polyline className="tour-demo-path far" points={farPoints} markerMid="url(#tour-far-arrow)" markerEnd="url(#tour-far-arrow)"/>
      {nearNodes.map(([x,y],i)=><g className="tour-demo-node near" key={`n-${i}`}><circle cx={x} cy={y} r="18"/><text x={x} y={y+6} textAnchor="middle">{i+1}</text></g>)}
      {farNodes.map(([x,y],i)=><g className="tour-demo-node far" key={`f-${i}`}><circle cx={x} cy={y} r="18"/><text x={x} y={y+6} textAnchor="middle">{i+1}</text></g>)}
    </svg>
  </div>
}

function FlowPreview({rect,kind}:{rect:Rect;kind:'visit-flow'|'reception-flow'}){
  const items=kind==='visit-flow'
    ?['Llegada','Duración','Resultado','Compra / No compra','Próxima acción']
    :['Llegada','Espera','Atención','Salida']
  const width=Math.min(kind==='visit-flow'?760:570,window.innerWidth-32)
  const left=clamp(rect.left+rect.width-width,16,window.innerWidth-width-16)
  const above=rect.top-58
  const top=above>=12?above:Math.min(window.innerHeight-54,rect.top+rect.height+10)
  return <div aria-hidden="true" style={{position:'fixed',zIndex:10004,left,top,width,minHeight:44,display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:14,background:'rgba(255,255,255,.97)',border:'1px solid rgba(210,28,45,.35)',boxShadow:'0 10px 30px rgba(15,23,42,.16)',pointerEvents:'none'}}>
    {items.map((item,i)=><span key={item} style={{display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',fontSize:12,fontWeight:800,color:'#263244'}}>{i>0&&<b style={{color:'#d21c2d',fontSize:15}}>→</b>}<span style={{padding:'5px 8px',borderRadius:9,background:i===0?'#fff0f2':'#f6f8fb',border:'1px solid #e7eaf0'}}>{item}</span></span>)}
  </div>
}

export function InteractiveTour({availablePaths,onStart}:{availablePaths:string[];onStart?:()=>void}){
  const navigate=useNavigate();const location=useLocation()
  const [active,setActive]=useState(false),[index,setIndex]=useState(0),[rect,setRect]=useState<Rect|null>(null),[secondaryRects,setSecondaryRects]=useState<Rect[]>([]),[previewRect,setPreviewRect]=useState<Rect|null>(null),[targetReady,setTargetReady]=useState(false)
  const timerRef=useRef<number|null>(null),mutationTimerRef=useRef<number|null>(null)
  const steps=useMemo(()=>baseSteps.filter(step=>!step.path||availablePaths.includes(step.path)),[availablePaths])
  const step=steps[index]||steps[0]

  const stopTimer=()=>{if(timerRef.current!=null){window.clearTimeout(timerRef.current);timerRef.current=null}}
  const stopMutationTimer=()=>{if(mutationTimerRef.current!=null){window.clearTimeout(mutationTimerRef.current);mutationTimerRef.current=null}}
  const locateTarget=()=>{
    const element=document.querySelector(step?.target||'') as HTMLElement|null
    setPreviewRect(step?.preview==='route'?routePreviewRect():null)
    setSecondaryRects((step?.secondaryTargets||[]).map(selector=>document.querySelector(selector) as HTMLElement|null).filter(Boolean).map(element=>rectFor(element as HTMLElement,7)).filter(Boolean) as Rect[])
    if(!element){setRect(null);setTargetReady(false);return false}
    const nextRect=rectFor(element,10)
    if(!nextRect){setRect(null);setTargetReady(false);return false}
    setRect(nextRect);setTargetReady(true);return true
  }

  useEffect(()=>{
    if(!active||!step)return
    const changingPath=Boolean(step.path&&location.pathname!==step.path)
    if(changingPath){navigate(step.path!);setTargetReady(false);setPreviewRect(null);setSecondaryRects([])}
    stopTimer();stopMutationTimer()
    let attempts=0,scrolled=false
    const seek=()=>{
      attempts+=1
      const element=document.querySelector(step.target) as HTMLElement|null
      if(element&&!scrolled){
        const box=element.getBoundingClientRect(),safeTop=76,safeBottom=window.innerHeight-24
        const visible=box.top>=safeTop&&box.bottom<=safeBottom
        if(!visible){scrolled=true;element.scrollIntoView({behavior:'smooth',block:'center',inline:'nearest'});timerRef.current=window.setTimeout(seek,320);return}
      }
      if(locateTarget()||attempts>24)return
      timerRef.current=window.setTimeout(seek,100)
    }
    timerRef.current=window.setTimeout(seek,changingPath?220:40)
    const sync=()=>locateTarget()
    const observer=new MutationObserver(()=>{stopMutationTimer();mutationTimerRef.current=window.setTimeout(()=>locateTarget(),80)})
    observer.observe(document.body,{subtree:true,childList:true,attributes:true})
    window.addEventListener('resize',sync);window.addEventListener('scroll',sync,true)
    return()=>{stopTimer();stopMutationTimer();observer.disconnect();window.removeEventListener('resize',sync);window.removeEventListener('scroll',sync,true)}
  },[active,index,step?.id,step?.path,step?.target,step?.preview,location.pathname,navigate])

  useEffect(()=>()=>{document.body.classList.remove('product-tour-active')},[])

  const start=()=>{onStart?.();setIndex(0);setActive(true);document.body.classList.add('product-tour-active')}
  const close=()=>{setActive(false);setRect(null);setSecondaryRects([]);setPreviewRect(null);document.body.classList.remove('product-tour-active')}
  const next=()=>{if(index>=steps.length-1){try{window.localStorage.setItem('karaka-product-tour-completed','1')}catch{};close();return}setIndex(i=>Math.min(i+1,steps.length-1))}
  const previous=()=>setIndex(i=>Math.max(0,i-1))
  const runSafeAction=()=>{
    if(!step.safeActionSelector)return
    const element=document.querySelector(step.safeActionSelector) as HTMLButtonElement|null
    if(element&&!element.disabled){element.click();window.setTimeout(()=>locateTarget(),180)}
  }

  const cardStyle=useMemo(()=>{
    const cardWidth=Math.min(step?.id==='ordering'?390:430,window.innerWidth-32),cardHeight=330,gap=22
    if(step?.id==='ordering'&&window.innerWidth>900)return{left:Math.max(16,window.innerWidth-cardWidth-20),top:Math.max(82,window.innerHeight-cardHeight-130),width:cardWidth}
    if(!rect)return{left:Math.max(16,(window.innerWidth-cardWidth)/2),top:Math.max(16,(window.innerHeight-cardHeight)/2),width:cardWidth}
    let left=rect.left+rect.width+gap,top=rect.top
    if(left+cardWidth>window.innerWidth-16)left=rect.left-cardWidth-gap
    if(left<16){left=clamp(window.innerWidth-cardWidth-20,16,window.innerWidth-cardWidth-16);top=rect.top+rect.height+gap}
    if(top+cardHeight>window.innerHeight-16)top=window.innerHeight-cardHeight-16
    return{left:clamp(left,16,window.innerWidth-cardWidth-16),top:clamp(top,16,window.innerHeight-cardHeight-16),width:cardWidth}
  },[rect,step?.id])

  const spotlightRects=rect?[rect,...secondaryRects]:[]
  const overlay=active&&step?createPortal(<div className="product-tour-root" role="dialog" aria-modal="true" aria-label="Recorrido interactivo del sistema">
    <div className={`product-tour-shield ${rect?'has-target':'no-target'}`}/>
    <SpotlightMask rects={spotlightRects}/>
    {rect&&<button type="button" className={`product-tour-focus ${step.safeActionSelector?'clickable':''}`} style={{top:rect.top,left:rect.left,width:rect.width,height:rect.height}} onClick={step.safeActionSelector?runSafeAction:undefined} aria-label={step.safeActionLabel||'Elemento destacado'}/>} 
    {secondaryRects.map((secondary,i)=><div key={i} className="product-tour-focus" style={{top:secondary.top,left:secondary.left,width:secondary.width,height:secondary.height,pointerEvents:'none'}} aria-hidden="true"/>)}
    {step.preview==='route'&&previewRect&&<RouteDirectionPreview rect={previewRect}/>} 
    {(step.preview==='visit-flow'||step.preview==='reception-flow')&&rect&&<FlowPreview rect={rect} kind={step.preview}/>} 
    <section className="product-tour-card" style={cardStyle}>
      <div className="product-tour-card-head"><span>{step.eyebrow}</span><button type="button" onClick={close} aria-label="Salir del recorrido"><X size={18}/></button></div>
      <h3>{step.title}</h3><p>{step.body}</p>
      {step.hint&&<div className="product-tour-hint"><ShieldCheck size={16}/><span>{step.hint}</span></div>}
      {step.safeActionLabel&&<button type="button" className="product-tour-action" disabled={!targetReady} onClick={runSafeAction}><MousePointerClick size={16}/>{step.safeActionLabel}</button>}
      <div className="product-tour-progress"><div><i style={{width:`${((index+1)/steps.length)*100}%`}}/></div><span>{index+1} de {steps.length}</span></div>
      <div className="product-tour-nav"><button type="button" className="secondary" disabled={index===0} onClick={previous}><ChevronLeft size={16}/>Anterior</button><button type="button" className="primary" onClick={next}>{index===steps.length-1?'Finalizar':'Siguiente'}{index<steps.length-1&&<ChevronRight size={16}/>}</button></div>
    </section>
  </div>,document.body):null

  return <><button type="button" data-tour="product-tour-trigger" className="icon-btn product-tour-trigger" title="Recorrido interactivo" aria-label="Recorrido interactivo" onClick={start}>{active?<Play size={19}/>:<CircleHelp size={19}/>}</button>{overlay}</>
}