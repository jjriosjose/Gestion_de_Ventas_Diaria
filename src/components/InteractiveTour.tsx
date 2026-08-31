import { useEffect,useMemo,useRef,useState } from 'react'
import { ChevronLeft,ChevronRight,CircleHelp,MousePointerClick,Play,ShieldCheck,X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useLocation,useNavigate } from 'react-router-dom'
import './InteractiveTour.css'

type TourStep={
  id:string
  path?:string
  target:string
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
  {id:'home',path:'/',target:'.content .page-head',eyebrow:'01 · INICIO',title:'Visión ejecutiva de la operación',body:'El inicio concentra indicadores y accesos rápidos para entender el estado comercial antes de entrar al detalle operativo.'},
  {id:'planning',path:'/planificacion',target:'.planner-v2',eyebrow:'02 · PLANIFICACIÓN',title:'Construye jornadas desde la cartera y el mapa',body:'Selecciona vendedor, fecha, territorio y clientes. La planificación combina filtros comerciales con contexto geográfico sin mezclar zonas de forma arbitraria.'},
  {id:'ordering',path:'/planificacion',target:'.planner-main .territorial-map-shell',eyebrow:'03 · SECUENCIA DE RUTA',title:'Visualiza ambos sentidos antes de crear la ruta',body:'La línea verde representa Cercanos → Lejanos y la violeta muestra la misma secuencia en sentido inverso, Lejanos → Cercanos. Las paradas se renumeran según el sentido elegido.',hint:'La ruta dibujada durante el tour es una simulación visual. No crea planificación ni modifica datos.'},
  {id:'routes',path:'/rutas',target:'.route-workspace',eyebrow:'04 · TMS / RUTAS',title:'Plan vs ejecución en una sola vista',body:'Consulta rutas asignadas, cobertura, estados, mapa, secuencia de paradas y eventualidades de la jornada. El sistema mantiene trazabilidad desde la planificación hasta el cierre.'},
  {id:'journeys',path:'/jornadas',target:'.content .page-head',eyebrow:'05 · JORNADAS',title:'Control del ciclo operativo',body:'Las jornadas permiten revisar ejecución, cierres y pendientes sin convertir automáticamente una parada pendiente en una visita realizada.'},
  {id:'tracking',path:'/tracking',target:'.tracking-workspace',eyebrow:'06 · TRACKING',title:'Seguimiento operativo sobre eventos GPS reales',body:'Tracking consolida vendedores, rutas, paradas y eventos GPS de inicio/fin de ruta, visitas y eventualidades. No se presenta como GPS continuo de fondo.'},
  {id:'tracking-modes',path:'/tracking',target:'.tracking-mode-switch',eyebrow:'07 · RECORRIDOS Y CALIDAD',title:'En vivo, recorridos y calidad GPS',body:'Cambia entre la última posición confiable, la secuencia de recorridos y la auditoría Registro vs Cliente.',safeActionLabel:'Mostrar Recorridos',safeActionSelector:'.tracking-mode-switch button:nth-child(2)'},
  {id:'control-tower',path:'/tracking',target:'.tracking-layout-switch',eyebrow:'08 · CONTROL TOWER',title:'Supervisión multi-vendedor',body:'Control Tower amplía el mapa, resume vendedores activos y conserva filtros, colores y selección individual para supervisar varias rutas al mismo tiempo.',safeActionLabel:'Activar Control Tower',safeActionSelector:'.tracking-layout-switch button:nth-child(3)'},
  {id:'quality',path:'/calidad-datos',target:'.content .page-head',eyebrow:'09 · CALIDAD GEOGRÁFICA',title:'Detecta diferencias sin detener la operación',body:'La app compara el registro GPS con la ubicación maestra del cliente. Las anomalías se conservan para auditoría y no bloquean automáticamente la gestión.'},
  {id:'reports',path:'/reportes',target:'.content .page-head',eyebrow:'10 · INTELIGENCIA',title:'De la ejecución a la decisión',body:'Reportes y métricas convierten la actividad diaria en información de cobertura, productividad y seguimiento para supervisión y gestión.'},
  {id:'finish',target:'[data-tour="product-tour-trigger"]',eyebrow:'RECORRIDO COMPLETADO',title:'Planificación · Rutas · Tracking · Control · Analítica',body:'La plataforma conecta la planificación comercial con la ejecución de calle y la supervisión geográfica en un mismo entorno.',hint:'Puedes iniciar este recorrido nuevamente desde el icono de ayuda.'},
]

function clamp(value:number,min:number,max:number){return Math.max(min,Math.min(max,value))}

function routePreviewRect():Rect|null{
  const element=document.querySelector('.planner-main .leaflet-container') as HTMLElement|null
  if(!element)return null
  const box=element.getBoundingClientRect()
  const left=Math.max(8,box.left),top=Math.max(8,box.top)
  const right=Math.min(window.innerWidth-8,box.right),bottom=Math.min(window.innerHeight-8,box.bottom)
  if(right-left<260||bottom-top<180)return null
  return{left,top,width:right-left,height:bottom-top}
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

export function InteractiveTour({availablePaths,onStart}:{availablePaths:string[];onStart?:()=>void}){
  const navigate=useNavigate();const location=useLocation()
  const [active,setActive]=useState(false),[index,setIndex]=useState(0),[rect,setRect]=useState<Rect|null>(null),[previewRect,setPreviewRect]=useState<Rect|null>(null),[targetReady,setTargetReady]=useState(false)
  const timerRef=useRef<number|null>(null)
  const steps=useMemo(()=>baseSteps.filter(step=>!step.path||availablePaths.includes(step.path)),[availablePaths])
  const step=steps[index]||steps[0]

  const stopTimer=()=>{if(timerRef.current!=null){window.clearTimeout(timerRef.current);timerRef.current=null}}
  const locateTarget=()=>{
    const element=document.querySelector(step?.target||'') as HTMLElement|null
    setPreviewRect(step?.id==='ordering'?routePreviewRect():null)
    if(!element){setRect(null);setTargetReady(false);return false}
    const box=element.getBoundingClientRect();const pad=10
    const left=clamp(box.left-pad,8,Math.max(8,window.innerWidth-50))
    const top=clamp(box.top-pad,8,Math.max(8,window.innerHeight-50))
    const width=Math.max(42,Math.min(box.width+pad*2,window.innerWidth-left-8))
    const height=Math.max(42,Math.min(box.height+pad*2,window.innerHeight-top-8))
    setRect({top,left,width,height});setTargetReady(true);return true
  }

  useEffect(()=>{
    if(!active||!step)return
    const changingPath=Boolean(step.path&&location.pathname!==step.path)
    if(changingPath){navigate(step.path!);setTargetReady(false);setPreviewRect(null)}
    stopTimer()
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
    window.addEventListener('resize',sync);window.addEventListener('scroll',sync,true)
    return()=>{stopTimer();window.removeEventListener('resize',sync);window.removeEventListener('scroll',sync,true)}
  },[active,index,step?.id,step?.path,step?.target,location.pathname,navigate])

  useEffect(()=>()=>{document.body.classList.remove('product-tour-active')},[])

  const start=()=>{onStart?.();setIndex(0);setActive(true);document.body.classList.add('product-tour-active')}
  const close=()=>{setActive(false);setRect(null);setPreviewRect(null);document.body.classList.remove('product-tour-active')}
  const next=()=>{if(index>=steps.length-1){try{window.localStorage.setItem('karaka-product-tour-completed','1')}catch{};close();return}setIndex(i=>Math.min(i+1,steps.length-1))}
  const previous=()=>setIndex(i=>Math.max(0,i-1))
  const runSafeAction=()=>{
    if(!step.safeActionSelector)return
    const element=document.querySelector(step.safeActionSelector) as HTMLButtonElement|null
    if(element&&!element.disabled){element.click();window.setTimeout(()=>locateTarget(),180)}
  }

  const cardStyle=useMemo(()=>{
    const cardWidth=Math.min(step?.id==='ordering'?390:430,window.innerWidth-32),cardHeight=330,gap=22
    if(step?.id==='ordering'&&window.innerWidth>900)return{left:Math.max(16,window.innerWidth-cardWidth-20),top:Math.max(16,window.innerHeight-cardHeight-20),width:cardWidth}
    if(!rect)return{left:Math.max(16,(window.innerWidth-cardWidth)/2),top:Math.max(16,(window.innerHeight-cardHeight)/2),width:cardWidth}
    let left=rect.left+rect.width+gap,top=rect.top
    if(left+cardWidth>window.innerWidth-16)left=rect.left-cardWidth-gap
    if(left<16){left=clamp(window.innerWidth-cardWidth-20,16,window.innerWidth-cardWidth-16);top=rect.top+rect.height+gap}
    if(top+cardHeight>window.innerHeight-16)top=window.innerHeight-cardHeight-16
    return{left:clamp(left,16,window.innerWidth-cardWidth-16),top:clamp(top,16,window.innerHeight-cardHeight-16),width:cardWidth}
  },[rect,step?.id])

  const overlay=active&&step?createPortal(<div className="product-tour-root" role="dialog" aria-modal="true" aria-label="Recorrido interactivo del sistema">
    <div className={`product-tour-shield ${rect?'has-target':'no-target'}`}/>
    {rect&&<button type="button" className={`product-tour-focus ${step.safeActionSelector?'clickable':''}`} style={{top:rect.top,left:rect.left,width:rect.width,height:rect.height}} onClick={step.safeActionSelector?runSafeAction:undefined} aria-label={step.safeActionLabel||'Elemento destacado'}/>} 
    {step.id==='ordering'&&previewRect&&<RouteDirectionPreview rect={previewRect}/>} 
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
