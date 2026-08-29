import { useCallback,useEffect,useMemo,useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { formatAccuracy,formatDistance,geoClassFor,geoClassLabel,routeColorFor,type TrackingMapMode } from '../lib/trackingGeo'
import '../styles/tracking.css'
import '../styles/tracking-hotfix.css'

export type TrackingSnapshot={
  route_plan_id:string;route_session_id?:string|null;employee_id:string;full_name:string;job_title?:string|null;route_date:string;tracking_status:string;journey_status?:string|null;
  planned_clients:number;visited_clients:number;coverage_pct:number;route_window_seconds:number;visit_seconds:number;estimated_distance_m:number;
  last_event_id?:string|null;last_event_type?:string|null;last_event_at?:string|null;last_latitude?:number|null;last_longitude?:number|null;last_accuracy_m?:number|null;last_subject_name?:string|null;last_event_label?:string|null;last_event_age_minutes?:number|null;freshness_status:string;
  last_gps_quality?:string|null;last_gps_reliable?:boolean|null;last_location_exception_code?:string|null;last_location_exception_text?:string|null;
  next_route_stop_id?:string|null;next_stop_order?:number|null;next_subject_name?:string|null;next_latitude?:number|null;next_longitude?:number|null;
  official_regions?:string[]|null;official_provinces?:string[]|null;official_municipalities?:string[]|null;
}
export type TrackingStop={route_stop_id:string;route_plan_id:string;route_date:string;employee_id:string;full_name:string;stop_order:number;stop_status:string;subject_name:string;latitude?:number|null;longitude?:number|null;official_region?:string|null;official_province?:string|null;official_municipality?:string|null}
export type TrackingEvent={event_id:string;route_plan_id:string;route_session_id?:string|null;employee_id:string;full_name:string;route_date:string;event_type:string;event_at:string;latitude?:number|null;longitude?:number|null;accuracy_m?:number|null;subject_name?:string|null;stop_order?:number|null;route_stop_id?:string|null;event_label:string;has_gps:boolean;raw_has_gps?:boolean;gps_quality?:string|null;distance_to_target_m?:number|null;location_exception_code?:string|null;location_exception_text?:string|null}

type Props={
 snapshots:TrackingSnapshot[];stops:TrackingStop[];events:TrackingEvent[];selectedRoutePlanId?:string;selectedEventId?:string;playbackIndex:number;showStops:boolean;viewMode:TrackingMapMode;isolateSelected:boolean;
 onPlanSelect?:(routePlanId:string)=>void;onEventSelect?:(eventId:string)=>void
}
const CENTER:[number,number]=[18.7357,-70.1627]
const BOUNDS=L.latLngBounds([16.85,-72.85],[20.55,-67.45])
const statusColor=(status:string)=>status==='EN_VISITA'?'#159a66':status==='EN_TRASLADO'?'#2563eb':status==='EVENTUALIDAD'?'#d97706':status==='PENDIENTE_CIERRE'?'#c71f2d':status==='FINALIZADA'?'#64748b':status==='NO_EJECUTADA'?'#a9464d':'#8b9aad'
const stopFill=(status:string)=>status==='VISITADO'?'#16a34a':status==='EN_VISITA'?'#0ea5e9':status==='NO_VISITADO'?'#dc2626':status==='REPROGRAMADO'?'#f59e0b':status==='CANCELADO'?'#64748b':'#ffffff'
const stopState=(status:string)=>status==='VISITADO'?'✓':status==='EN_VISITA'?'▶':status==='NO_VISITADO'?'×':status==='REPROGRAMADO'?'↻':status==='CANCELADO'?'×':''
const qualityFill=(value:string)=>value==='ON_SITE'?'#16a34a':value==='NEAR'?'#0284c7':value==='OUTSIDE'?'#d97706':value==='DISTANT'?'#dc2626':value==='UNRELIABLE'?'#a16207':'#64748b'
const esc=(value:unknown)=>String(value??'').replace(/[&<>'"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]||c))
const eventOrder=(a:TrackingEvent,b:TrackingEvent)=>new Date(a.event_at).getTime()-new Date(b.event_at).getTime()
const overlapKey=(s:TrackingStop)=>`${Number(s.latitude).toFixed(4)}:${Number(s.longitude).toFixed(4)}`
const bearing=(a:[number,number],b:[number,number])=>{
 const toRad=(v:number)=>v*Math.PI/180,toDeg=(v:number)=>v*180/Math.PI
 const lat1=toRad(a[0]),lat2=toRad(b[0]),dLon=toRad(b[1]-a[1])
 const y=Math.sin(dLon)*Math.cos(lat2),x=Math.cos(lat1)*Math.sin(lat2)-Math.sin(lat1)*Math.cos(lat2)*Math.cos(dLon)
 return (toDeg(Math.atan2(y,x))+360)%360
}

export function LiveTrackingMap({snapshots,stops,events,selectedRoutePlanId='',selectedEventId='',playbackIndex=-1,showStops,viewMode,isolateSelected,onPlanSelect,onEventSelect}:Props){
 const host=useRef<HTMLDivElement|null>(null),mapRef=useRef<L.Map|null>(null),positionsRef=useRef<L.LayerGroup|null>(null),stopsRef=useRef<L.LayerGroup|null>(null),routesRef=useRef<L.LayerGroup|null>(null),comparisonRef=useRef<L.LayerGroup|null>(null),smartFrameRef=useRef<(animate?:boolean)=>void>(()=>{})
 const employeeIds=useMemo(()=>Array.from(new Set([...snapshots.map(s=>s.employee_id),...stops.map(s=>s.employee_id),...events.map(e=>e.employee_id)])).sort(),[snapshots,stops,events])
 const selectedEvents=useMemo(()=>events.filter(e=>e.route_plan_id===selectedRoutePlanId&&e.has_gps&&e.latitude!=null&&e.longitude!=null).sort(eventOrder),[events,selectedRoutePlanId])
 const selectedEvent=useMemo(()=>events.find(e=>e.event_id===selectedEventId)||null,[events,selectedEventId])
 const selectedStop=useMemo(()=>selectedEvent?.route_stop_id?stops.find(s=>s.route_stop_id===selectedEvent.route_stop_id)||null:null,[stops,selectedEvent])
 const visibleSnapshots=useMemo(()=>isolateSelected&&selectedRoutePlanId?snapshots.filter(s=>s.route_plan_id===selectedRoutePlanId):snapshots,[snapshots,isolateSelected,selectedRoutePlanId])
 const visibleStops=useMemo(()=>isolateSelected&&selectedRoutePlanId?stops.filter(s=>s.route_plan_id===selectedRoutePlanId):stops,[stops,isolateSelected,selectedRoutePlanId])
 const visibleEvents=useMemo(()=>isolateSelected&&selectedRoutePlanId?events.filter(e=>e.route_plan_id===selectedRoutePlanId):events,[events,isolateSelected,selectedRoutePlanId])
 const overlapIndex=useMemo(()=>{
  const groups=new Map<string,TrackingStop[]>()
  visibleStops.filter(s=>s.latitude!=null&&s.longitude!=null).forEach(s=>{const key=overlapKey(s),list=groups.get(key)||[];list.push(s);groups.set(key,list)})
  const out=new Map<string,{index:number;count:number}>()
  groups.forEach(list=>list.sort((a,b)=>a.employee_id.localeCompare(b.employee_id)||a.stop_order-b.stop_order).forEach((s,index)=>out.set(s.route_stop_id,{index,count:list.length})))
  return out
 },[visibleStops])

 const smartFrame=useCallback((animate=false)=>{
  const map=mapRef.current;if(!map||playbackIndex>=0)return
  if(viewMode==='QUALITY'&&selectedEvent)return
  const points:Array<[number,number]>=[],sellerIds=new Set<string>(),seen=new Set<string>()
  const add=(lat:number|null|undefined,lon:number|null|undefined,employeeId?:string)=>{
   if(lat==null||lon==null||!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon)))return
   const point:[number,number]=[Number(lat),Number(lon)],key=`${point[0].toFixed(5)}:${point[1].toFixed(5)}`
   if(!seen.has(key)){seen.add(key);points.push(point)}
   if(employeeId)sellerIds.add(employeeId)
  }
  const coherentEvents=visibleEvents.filter(e=>e.has_gps&&e.latitude!=null&&e.longitude!=null&&!['DISTANT','UNRELIABLE'].includes(geoClassFor(e)))
  const coherentSnapshots=visibleSnapshots.filter(s=>s.last_latitude!=null&&s.last_longitude!=null&&s.last_gps_reliable!==false&&s.last_location_exception_code!=='DISTANT_REGISTRATION')
  if(selectedRoutePlanId){
   const planStops=visibleStops.filter(s=>s.route_plan_id===selectedRoutePlanId&&s.latitude!=null&&s.longitude!=null)
   const planEvents=coherentEvents.filter(e=>e.route_plan_id===selectedRoutePlanId)
   planStops.forEach(s=>add(s.latitude,s.longitude,s.employee_id))
   if(!planStops.length)planEvents.forEach(e=>add(e.latitude,e.longitude,e.employee_id))
   const snapshot=coherentSnapshots.find(s=>s.route_plan_id===selectedRoutePlanId)
   if(snapshot&&(viewMode==='LIVE'||!points.length))add(snapshot.last_latitude,snapshot.last_longitude,snapshot.employee_id)
  }else{
   visibleStops.filter(s=>s.latitude!=null&&s.longitude!=null).forEach(s=>add(s.latitude,s.longitude,s.employee_id))
   coherentSnapshots.forEach(s=>add(s.last_latitude,s.last_longitude,s.employee_id))
   if(!points.length)coherentEvents.forEach(e=>add(e.latitude,e.longitude,e.employee_id))
  }
  if(!points.length){
   visibleSnapshots.filter(s=>s.last_latitude!=null&&s.last_longitude!=null).forEach(s=>add(s.last_latitude,s.last_longitude,s.employee_id))
  }
  if(!points.length)return
  const selectedFocus=Boolean(selectedRoutePlanId),sellerCount=Math.max(1,sellerIds.size||new Set(visibleSnapshots.map(s=>s.employee_id)).size)
  const maxZoom=selectedFocus?16:sellerCount===1?15:sellerCount<=4?14:13
  const padding:[number,number]=selectedFocus?[72,72]:sellerCount===1?[64,64]:sellerCount<=4?[52,52]:[40,40]
  map.stop()
  if(points.length===1){map.setView(points[0],maxZoom,{animate});return}
  const bounds=L.latLngBounds(points)
  if(bounds.isValid())map.fitBounds(bounds,{padding,maxZoom,animate})
 },[playbackIndex,viewMode,selectedEvent,selectedRoutePlanId,visibleStops,visibleEvents,visibleSnapshots])
 smartFrameRef.current=smartFrame

 useEffect(()=>{
  if(!host.current||mapRef.current)return
  const element=host.current,map=L.map(element,{zoomControl:false,preferCanvas:true,minZoom:7,maxBounds:BOUNDS,maxBoundsViscosity:.65}).setView(CENTER,8.5)
  L.control.zoom({position:'bottomright'}).addTo(map)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map)
  positionsRef.current=L.layerGroup().addTo(map);stopsRef.current=L.layerGroup().addTo(map);routesRef.current=L.layerGroup().addTo(map);comparisonRef.current=L.layerGroup().addTo(map);mapRef.current=map
  const resize=()=>requestAnimationFrame(()=>{map.invalidateSize();smartFrameRef.current(false)})
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null
  observer?.observe(element);window.addEventListener('resize',resize);resize()
  return()=>{observer?.disconnect();window.removeEventListener('resize',resize);map.remove();mapRef.current=null}
 },[])
 useEffect(()=>{const id=window.setTimeout(()=>smartFrame(false),30);return()=>window.clearTimeout(id)},[smartFrame])

 useEffect(()=>{
  const layer=positionsRef.current;if(!layer)return
  layer.clearLayers()
  visibleSnapshots.forEach(s=>{
   if(s.last_latitude==null||s.last_longitude==null)return
   const selected=s.route_plan_id===selectedRoutePlanId,color=routeColorFor(s.employee_id,employeeIds),state=statusColor(s.tracking_status)
   const marker=L.circleMarker([s.last_latitude,s.last_longitude],{radius:selected?12:9,weight:selected?5:4,color,fillColor:state,fillOpacity:.96})
   const age=s.last_event_age_minutes==null?'sin hora':s.last_event_age_minutes<1?'ahora':`hace ${s.last_event_age_minutes} min`
   marker.bindTooltip(`<div class="tracking-map-tooltip"><b>${esc(s.full_name)}</b><span>${esc(s.tracking_status.replaceAll('_',' '))}</span><span>${esc(s.last_event_label||'Último registro')} · ${esc(age)}</span>${s.last_subject_name?`<strong>${esc(s.last_subject_name)}</strong>`:''}<small>${s.last_accuracy_m!=null?`${esc(formatAccuracy(s.last_accuracy_m))} · `:''}último evento GPS confiable</small></div>`,{direction:'top',opacity:.98})
   marker.on('click',()=>onPlanSelect?.(s.route_plan_id));marker.addTo(layer)
   L.marker([s.last_latitude,s.last_longitude],{interactive:false,icon:L.divIcon({className:'tracking-initial-marker',html:`<span style="background:${color}">${esc(s.full_name.slice(0,1).toUpperCase())}</span>`,iconSize:[22,22],iconAnchor:[11,11]})}).addTo(layer)
  })
 },[visibleSnapshots,selectedRoutePlanId,employeeIds,onPlanSelect])

 useEffect(()=>{
  const layer=stopsRef.current;if(!layer)return
  layer.clearLayers();if(!showStops)return
  visibleStops.forEach(s=>{
   if(s.latitude==null||s.longitude==null)return
   const color=routeColorFor(s.employee_id,employeeIds),stopEvents=visibleEvents.filter(e=>e.route_stop_id===s.route_stop_id).sort(eventOrder),lastStopEvent=stopEvents.length?stopEvents[stopEvents.length-1]:undefined,anomaly=lastStopEvent?.location_exception_code
   const fill=stopFill(s.stop_status),pending=s.stop_status==='PENDIENTE',state=stopState(s.stop_status),overlap=overlapIndex.get(s.route_stop_id)||{index:0,count:1}
   const angle=overlap.count>1?(overlap.index/overlap.count)*Math.PI*2:0,radius=overlap.count>1?18:0,dx=Math.round(Math.cos(angle)*radius),dy=Math.round(Math.sin(angle)*radius)
   const html=`<div class="tracking-stop-offset" style="--dx:${dx}px;--dy:${dy}px"><div class="tracking-stop-pin${pending?' pending':''}${s.route_plan_id===selectedRoutePlanId?' selected':''}" style="--seller:${color};--state:${fill}"><span class="order">${esc(s.stop_order)}</span>${state?`<small class="state">${esc(state)}</small>`:''}${anomaly?'<em>!</em>':''}</div></div>`
   const marker=L.marker([s.latitude,s.longitude],{icon:L.divIcon({className:'tracking-stop-divicon',html,iconSize:[36,36],iconAnchor:[18,18]})})
   marker.bindTooltip(`<div class="tracking-map-tooltip"><b>${s.stop_order}. ${esc(s.subject_name)}</b><span>${esc(s.stop_status.replaceAll('_',' '))}</span><span>${esc(s.full_name)}</span>${overlap.count>1?'<small>Punto separado visualmente para evitar solapamiento</small>':''}${anomaly?`<small>${esc(lastStopEvent?.location_exception_code||'Anomalía geográfica')}</small>`:''}</div>`,{direction:'top',opacity:.97})
   marker.on('click',()=>onPlanSelect?.(s.route_plan_id));marker.addTo(layer)
  })
 },[visibleStops,visibleEvents,employeeIds,selectedRoutePlanId,showStops,onPlanSelect,overlapIndex])

 useEffect(()=>{
  const layer=routesRef.current;if(!layer)return
  layer.clearLayers();if(viewMode==='LIVE'&&!selectedRoutePlanId)return
  const planIds=Array.from(new Set([...visibleStops.map(s=>s.route_plan_id),...visibleEvents.map(e=>e.route_plan_id)]))
  planIds.forEach(planId=>{
   const planStops=visibleStops.filter(s=>s.route_plan_id===planId&&s.latitude!=null&&s.longitude!=null).sort((a,b)=>a.stop_order-b.stop_order)
   const planEvents=visibleEvents.filter(e=>e.route_plan_id===planId&&e.has_gps&&e.latitude!=null&&e.longitude!=null).sort(eventOrder)
   const routeEvents=viewMode==='ROUTES'?planEvents.filter(e=>{const geo=geoClassFor(e);return geo!=='DISTANT'&&geo!=='UNRELIABLE'}):planEvents
   const employeeId=planStops[0]?.employee_id||routeEvents[0]?.employee_id||planEvents[0]?.employee_id||'',color=routeColorFor(employeeId,employeeIds),selected=planId===selectedRoutePlanId,dim=Boolean(selectedRoutePlanId&&!selected)
   const plannedPoints=planStops.map(s=>[s.latitude!,s.longitude!] as [number,number]),actualPoints=routeEvents.map(e=>[e.latitude!,e.longitude!] as [number,number])
   if(plannedPoints.length>1){
    L.polyline(plannedPoints,{color,weight:selected?4:3,opacity:dim?.18:selected?.82:.58,dashArray:'5 7',lineCap:'round',lineJoin:'round'}).bindTooltip('Secuencia planificada entre paradas · no representa navegación vial').addTo(layer)
    if(viewMode==='ROUTES')for(let i=0;i<plannedPoints.length-1;i++){
     const a=plannedPoints[i],b=plannedPoints[i+1],mid:[number,number]=[(a[0]+b[0])/2,(a[1]+b[1])/2],rot=bearing(a,b)
     L.marker(mid,{interactive:false,opacity:dim?.22:selected?1:.72,icon:L.divIcon({className:'tracking-route-arrow-divicon',html:`<span style="--seller:${color};--rotation:${rot}deg">➤</span>`,iconSize:[20,20],iconAnchor:[10,10]})}).addTo(layer)
    }
   }
   if(actualPoints.length>1)L.polyline(actualPoints,{color,weight:selected?6:4,opacity:dim?.18:selected?.96:.76,dashArray:'11 8',lineCap:'round'}).bindTooltip('Unión estimada entre eventos GPS registrados y geográficamente coherentes con su parada').addTo(layer)
   if(viewMode!=='LIVE')routeEvents.forEach(e=>{
    const geo=geoClassFor(e),marker=L.circleMarker([e.latitude!,e.longitude!],{radius:e.event_id===selectedEventId?8:selected?5:4,weight:e.event_id===selectedEventId?4:2,color,fillColor:viewMode==='QUALITY'?qualityFill(geo):color,fillOpacity:dim?.25:.92})
    marker.bindTooltip(`<div class="tracking-map-tooltip"><b>${esc(e.event_label)}</b><span>${new Date(e.event_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}${e.subject_name?` · ${esc(e.subject_name)}`:''}</span><small>${esc(formatAccuracy(e.accuracy_m))}${e.distance_to_target_m!=null?` · ${esc(formatDistance(e.distance_to_target_m))} al cliente`:''}</small><strong>${esc(geoClassLabel(geo))}</strong></div>`,{direction:'top'})
    marker.on('click',()=>onEventSelect?.(e.event_id));marker.addTo(layer)
   })
   const start=routeEvents.find(e=>e.event_type==='ROUTE_START'),finish=[...routeEvents].reverse().find(e=>e.event_type==='ROUTE_END')
   if(start)L.marker([start.latitude!,start.longitude!],{icon:L.divIcon({className:'tracking-endpoint-divicon',html:`<span style="--seller:${color}">S</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(layer)
   if(finish)L.marker([finish.latitude!,finish.longitude!],{icon:L.divIcon({className:'tracking-endpoint-divicon',html:`<span style="--seller:${color}">F</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(layer)
  })
 },[visibleStops,visibleEvents,employeeIds,selectedRoutePlanId,selectedEventId,viewMode,onEventSelect])

 useEffect(()=>{
  const map=mapRef.current,layer=comparisonRef.current;if(!map||!layer)return
  layer.clearLayers();if(!selectedEvent||selectedEvent.latitude==null||selectedEvent.longitude==null||!selectedStop||selectedStop.latitude==null||selectedStop.longitude==null)return
  const color=routeColorFor(selectedEvent.employee_id,employeeIds),a:[number,number]=[selectedEvent.latitude,selectedEvent.longitude],b:[number,number]=[selectedStop.latitude,selectedStop.longitude],geo=geoClassFor(selectedEvent)
  L.polyline([a,b],{color:'#111827',weight:3,opacity:.72,dashArray:'5 7'}).bindTooltip(`${formatDistance(selectedEvent.distance_to_target_m)} entre registro y punto maestro`).addTo(layer)
  L.marker(a,{icon:L.divIcon({className:'tracking-compare-divicon',html:`<span class="record" style="--seller:${color}">R</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).bindTooltip(`<div class="tracking-map-tooltip"><b>Lugar del registro</b><span>${esc(selectedEvent.subject_name||selectedEvent.event_label)}</span><small>${esc(formatAccuracy(selectedEvent.accuracy_m))} · ${esc(geoClassLabel(geo))}</small></div>`).addTo(layer)
  L.marker(b,{icon:L.divIcon({className:'tracking-compare-divicon',html:'<span class="client">C</span>',iconSize:[34,34],iconAnchor:[17,17]})}).bindTooltip(`<div class="tracking-map-tooltip"><b>Ubicación maestra del cliente</b><span>${esc(selectedStop.subject_name)}</span><small>${esc(selectedStop.official_province||'')} ${esc(selectedStop.official_municipality||'')}</small></div>`).addTo(layer)
  const bounds=L.latLngBounds([a,b]);if(bounds.isValid())map.fitBounds(bounds.pad(.24),{maxZoom:15})
 },[selectedEvent,selectedStop,employeeIds])

 useEffect(()=>{
  const map=mapRef.current;if(!map||!selectedRoutePlanId||playbackIndex<0||!selectedEvents.length)return
  const current=selectedEvents[Math.min(playbackIndex,selectedEvents.length-1)];map.flyTo([current.latitude!,current.longitude!],Math.max(map.getZoom(),14),{duration:.45})
 },[selectedRoutePlanId,selectedEvents,playbackIndex])

 const legend=useMemo(()=>visibleSnapshots.slice(0,8),[visibleSnapshots])
 return <div className="tracking-map-shell"><div ref={host} className="tracking-map-host"/>{viewMode==='ROUTES'&&legend.length>0&&<div className="tracking-route-legend"><b>Rutas visibles</b>{legend.map(s=><button key={s.route_plan_id} className={selectedRoutePlanId===s.route_plan_id?'selected':''} onClick={()=>onPlanSelect?.(s.route_plan_id)}><i style={{background:routeColorFor(s.employee_id,employeeIds)}}/><span>{s.full_name}</span><small>{s.visited_clients}/{s.planned_clients}</small></button>)}{visibleSnapshots.length>8&&<small>+{visibleSnapshots.length-8} jornada(s)</small>}</div>}<div className="tracking-map-legend"><span><i className="dot visit"/>En visita</span><span><i className="dot transit"/>En traslado</span><span><i className="dot stale"/>Alerta</span></div></div>
}
