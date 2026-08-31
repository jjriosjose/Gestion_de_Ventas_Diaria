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
  {id:'ordering',path:'/planificacion',target:'.planning-order-config',eyebrow:'03 · SECUENCIA DE RUTA',title:'Cercanos primero o lejanos primero',body:'La ruta puede ordenarse desde el centro de la selección o desde la ubicación actual. La numeración visual se conserva como stop_order al crear la planificación.',hint:'Esta demo no crea rutas ni modifica datos.'},
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

export function InteractiveTour({availablePaths,onStart}:{availablePaths:string[];onStart?:()=>void}){
  const navigate=useNavigate();const location=useLocation()
  const [active,setActive]=useState(false),[index,setIndex]=useState(0),[rect,setRect]=useState<Rect|null>(null),[targetReady,setTargetReady]=useState(false)
  const timerRef=useRef<number|null>(null)
  const steps=useMemo(()=>baseSteps.filter(step=>!step.path||availablePaths.includes(step.path)),[availablePaths])
  const step=steps[index]||steps[0]

  const stopTimer=()=>{if(timerRef.current!=null){window.clearTimeout(timerRef.current);timerRef.current=null}}
  const locateTarget=()=>{
    const element=document.querySelector(step?.target||'') as HTMLElement|null
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
    if(step.path&&location.pathname!==step.path){navigate(step.path);setTargetReady(false)}
    stopTimer()
    let attempts=0
    const seek=()=>{attempts+=1;if(locateTarget()||attempts>20)return;timerRef.current=window.setTimeout(seek,100)}
    timerRef.current=window.setTimeout(seek,step.path&&location.pathname!==step.path?180:30)
    const sync=()=>locateTarget()
    window.addEventListener('resize',sync);window.addEventListener('scroll',sync,true)
    return()=>{stopTimer();window.removeEventListener('resize',sync);window.removeEventListener('scroll',sync,true)}
  },[active,index,step?.id,step?.path,step?.target,location.pathname,navigate])

  useEffect(()=>()=>{document.body.classList.remove('product-tour-active')},[])

  const start=()=>{onStart?.();setIndex(0);setActive(true);document.body.classList.add('product-tour-active')}
  const close=()=>{setActive(false);setRect(null);document.body.classList.remove('product-tour-active')}
  const next=()=>{if(index>=steps.length-1){try{window.localStorage.setItem('karaka-product-tour-completed','1')}catch{};close();return}setIndex(i=>Math.min(i+1,steps.length-1))}
  const previous=()=>setIndex(i=>Math.max(0,i-1))
  const runSafeAction=()=>{
    if(!step.safeActionSelector)return
    const element=document.querySelector(step.safeActionSelector) as HTMLButtonElement|null
    if(element&&!element.disabled){element.click();window.setTimeout(()=>locateTarget(),180)}
  }

  const cardStyle=useMemo(()=>{
    const cardWidth=Math.min(430,window.innerWidth-32),cardHeight=330,gap=22
    if(!rect)return{left:Math.max(16,(window.innerWidth-cardWidth)/2),top:Math.max(16,(window.innerHeight-cardHeight)/2),width:cardWidth}
    let left=rect.left+rect.width+gap,top=rect.top
    if(left+cardWidth>window.innerWidth-16)left=rect.left-cardWidth-gap
    if(left<16){left=clamp(window.innerWidth-cardWidth-20,16,window.innerWidth-cardWidth-16);top=rect.top+rect.height+gap}
    if(top+cardHeight>window.innerHeight-16)top=window.innerHeight-cardHeight-16
    return{left:clamp(left,16,window.innerWidth-cardWidth-16),top:clamp(top,16,window.innerHeight-cardHeight-16),width:cardWidth}
  },[rect])

  const overlay=active&&step?createPortal(<div className="product-tour-root" role="dialog" aria-modal="true" aria-label="Recorrido interactivo del sistema">
    <div className={`product-tour-shield ${rect?'has-target':'no-target'}`}/>
    {rect&&<button type="button" className={`product-tour-focus ${step.safeActionSelector?'clickable':''}`} style={{top:rect.top,left:rect.left,width:rect.width,height:rect.height}} onClick={step.safeActionSelector?runSafeAction:undefined} aria-label={step.safeActionLabel||'Elemento destacado'}/>} 
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
