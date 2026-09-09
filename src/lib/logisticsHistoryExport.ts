import ExcelJS from 'exceljs'
import { supabase } from './supabase'
import type { DeliveryDocument, DeliveryStop, DeliveryTrip } from './logistics'

type ExportEvent = { id:string; trip_id:string; stop_id?:string|null; event_type:string; latitude?:number|null; longitude?:number|null; accuracy_m?:number|null; source?:string|null; payload?:Record<string,unknown>|null; occurred_at:string }
type ExportIncident = { id:string; trip_id:string; stop_id?:string|null; incident_type:string; severity?:string|null; description?:string|null; latitude?:number|null; longitude?:number|null; status?:string|null; stopped_trip?:boolean|null; reported_at:string; resolved_at?:string|null; resolution_notes?:string|null }
type ExportStop = DeliveryStop & { arrived_at?:string|null; unload_started_at?:string|null; unload_finished_at?:string|null; delivered_at?:string|null; departed_at?:string|null }
type ExportTrip = DeliveryTrip & { returned_at?:string|null; origin_latitude?:number|null; origin_longitude?:number|null }
type ExportDocument = DeliveryDocument & { attempt_number?:number|null; retry_of_document_id?:string|null }

export type TripHistoryExportFilters = { fromDate?:string; toDate?:string; search?:string; statusLabel?:string }
type ExportArgs = { trips:DeliveryTrip[]; stops:DeliveryStop[]; documents:DeliveryDocument[]; filters:TripHistoryExportFilters }

const TRIP_STATUS:Record<string,string>={DRAFT:'Borrador',PREPARING:'Preparando',LOADED:'Cargado',READY:'Listo',IN_ROUTE:'En ruta',WITH_INCIDENT:'Con incidencia',RETURNING:'Retornando',COMPLETED:'Finalizado',CANCELLED:'Cancelado'}
const STOP_STATUS:Record<string,string>={PENDING:'Pendiente',EN_ROUTE:'En camino',AT_CLIENT:'En cliente',WAITING_UNLOAD:'Espera descarga',UNLOADING:'Descargando',DELIVERED:'Entregada',PARTIAL:'Parcial',NOT_DELIVERED:'No entregada',RESCHEDULED:'Reprogramada',CANCELLED:'Cancelada'}
const EVENT_LABELS:Record<string,string>={DEPARTED_ORIGIN:'Salida del centro de carga',ARRIVED:'Llegada al cliente',UNLOAD_STARTED:'Inicio de descarga',UNLOAD_FINISHED:'Fin de descarga',DELIVERY_CONFIRMED:'Entrega confirmada',DELIVERY_PARTIAL:'Entrega parcial',DELIVERY_NOT_DELIVERED:'No entregada',DELIVERY_RESCHEDULED:'Entrega reprogramada',INCIDENT_REPORTED:'Incidencia reportada',INCIDENT_RESOLVED:'Incidencia resuelta',RETURN_STARTED:'Inicio de retorno',RETURNED_ORIGIN:'Retorno a base',TRIP_COMPLETED:'Cierre del viaje'}
const HEADER='FF172033', WHITE='FFFFFFFF', SOFT='FFF4F6F8', BORDER='FFD9DEE7', ACCENT='FFC71F2D'
const MONEY='RD$ #,##0.00;[Red]-RD$ #,##0.00', DATE='dd/mm/yyyy', DATETIME='dd/mm/yyyy hh:mm'

function chunk<T>(items:T[],size=100){const out:T[][]=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}
function asDate(value?:string|null){if(!value)return null;const d=value.length===10?new Date(`${value}T12:00:00`):new Date(value);return Number.isNaN(d.getTime())?null:d}
function minutes(start?:string|null,end?:string|null){if(!start||!end)return null;const v=(new Date(end).getTime()-new Date(start).getTime())/60000;return Number.isFinite(v)&&v>=0?v:null}
function distance(lat1:number,lon1:number,lat2:number,lon2:number){const r=6371000,toRad=(v:number)=>v*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}

async function fetchDetail(tripIds:string[]){
  const events:ExportEvent[]=[],incidents:ExportIncident[]=[]
  for(const ids of chunk(tripIds)){
    const [e,i]=await Promise.all([
      supabase.from('delivery_events').select('*').in('trip_id',ids).order('occurred_at',{ascending:true}),
      supabase.from('delivery_incidents').select('*').in('trip_id',ids).order('reported_at',{ascending:true}),
    ])
    const error=e.error||i.error;if(error)throw error
    events.push(...((e.data||[]) as ExportEvent[]));incidents.push(...((i.data||[]) as ExportIncident[]))
  }
  return{events,incidents}
}

function styleHeader(sheet:ExcelJS.Worksheet){
  const row=sheet.getRow(1);row.height=24
  row.eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:HEADER}};cell.font={bold:true,color:{argb:WHITE},size:10};cell.alignment={vertical:'middle',horizontal:'center',wrapText:true};cell.border={bottom:{style:'thin',color:{argb:BORDER}}}})
  sheet.views=[{state:'frozen',ySplit:1}]
  if(sheet.columnCount)sheet.autoFilter={from:{row:1,column:1},to:{row:Math.max(sheet.rowCount,1),column:sheet.columnCount}}
}
function finish(sheet:ExcelJS.Worksheet){
  styleHeader(sheet);sheet.properties.defaultRowHeight=18
  sheet.eachRow((row,n)=>{if(n===1)return;if(n%2===0)row.eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFAFBFC'}}});row.alignment={vertical:'top',wrapText:true}})
  sheet.columns.forEach(column=>{if(!column.width||column.width<11)column.width=11;if(column.width>42)column.width=42})
}
function statusStyle(cell:ExcelJS.Cell,status:string){
  let fill='FFF3F4F6',color='FF475569'
  if(['COMPLETED','DELIVERED'].includes(status)){fill='FFEAF8EF';color='FF16804A'}
  else if(['PARTIAL','RETURNING','RESCHEDULED'].includes(status)){fill='FFFFF4DD';color='FF986815'}
  else if(['WITH_INCIDENT','NOT_DELIVERED','CANCELLED'].includes(status)){fill='FFFFEEEE';color='FFB0202D'}
  else if(['READY','IN_ROUTE','AT_CLIENT','UNLOADING'].includes(status)){fill='FFEDF5FF';color='FF245FA4'}
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:fill}};cell.font={bold:true,color:{argb:color}};cell.alignment={horizontal:'center',vertical:'middle'}
}
function download(buffer:ExcelJS.Buffer,filename:string){const blob=new Blob([buffer],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}

export async function exportTripHistoryExcel({trips,stops,documents,filters}:ExportArgs){
  if(!trips.length)throw new Error('No hay viajes visibles para exportar.')
  const ids=trips.map(t=>t.id),idSet=new Set(ids)
  const exportStops=(stops.filter(s=>idSet.has(s.trip_id)) as ExportStop[]).sort((a,b)=>a.trip_id.localeCompare(b.trip_id)||a.stop_order-b.stop_order)
  const exportDocs=documents.filter(d=>idSet.has(d.trip_id)) as ExportDocument[]
  const {events,incidents}=await fetchDetail(ids)
  const tripMap=new Map((trips as ExportTrip[]).map(t=>[t.id,t])),stopMap=new Map(exportStops.map(s=>[s.id,s]))
  const eventsByTrip=new Map<string,ExportEvent[]>(),incidentsByTrip=new Map<string,ExportIncident[]>()
  events.forEach(e=>eventsByTrip.set(e.trip_id,[...(eventsByTrip.get(e.trip_id)||[]),e]));incidents.forEach(i=>incidentsByTrip.set(i.trip_id,[...(incidentsByTrip.get(i.trip_id)||[]),i]))

  const wb=new ExcelJS.Workbook();wb.creator='Gestión de Ventas Karaka';wb.company='Almacenes Karaka';wb.created=new Date();wb.modified=new Date();wb.calcProperties.fullCalcOnLoad=true

  const summary=wb.addWorksheet('Resumen',{views:[{showGridLines:false}]})
  summary.mergeCells('A1:H1');summary.getCell('A1').value='HISTORIAL DE VIAJES · LOGÍSTICA Y ENTREGA';summary.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:HEADER}};summary.getCell('A1').font={bold:true,color:{argb:WHITE},size:16};summary.getCell('A1').alignment={vertical:'middle',horizontal:'left'};summary.getRow(1).height=34
  summary.mergeCells('A2:H2');summary.getCell('A2').value='Exportación estructurada del recorrido operativo. Las distancias GPS son segmentos rectos entre puntos registrados; no representan la ruta vial exacta.';summary.getCell('A2').font={color:{argb:'FF64748B'},italic:true,size:9};summary.getCell('A2').alignment={wrapText:true,vertical:'middle'};summary.getRow(2).height=30
  const totalLoaded=exportDocs.reduce((s,d)=>s+Number(d.packages_loaded||0),0),totalDelivered=exportDocs.reduce((s,d)=>s+Number(d.packages_delivered||0),0),totalReturned=exportDocs.reduce((s,d)=>s+Number(d.packages_returned||0),0),totalAmount=exportDocs.reduce((s,d)=>s+Number(d.amount||0),0),gpsCount=events.filter(e=>e.latitude!=null&&e.longitude!=null).length,coverage=events.length?gpsCount/events.length:0
  const meta:Array<[string,unknown,string,unknown,string,unknown,string,unknown]>=[
    ['Generado',new Date(),'Desde',filters.fromDate?asDate(filters.fromDate):'Sin límite','Hasta',filters.toDate?asDate(filters.toDate):'Sin límite','Estado',filters.statusLabel||'Todos'],
    ['Búsqueda',filters.search||'Sin búsqueda','Viajes',trips.length,'Paradas',exportStops.length,'Documentos',exportDocs.length],
    ['Bultos cargados',totalLoaded,'Bultos entregados',totalDelivered,'Bultos retornados',totalReturned,'Monto total',totalAmount],
    ['Eventos',events.length,'Eventos con GPS',gpsCount,'Cobertura GPS',coverage,'Incidencias',incidents.length],
  ]
  meta.forEach((values,index)=>{const row=summary.getRow(4+index);values.forEach((value,col)=>{row.getCell(col+1).value=value as never})})
  for(let r=4;r<=7;r++){const row=summary.getRow(r);for(let c=1;c<=8;c+=2){row.getCell(c).font={bold:true,color:{argb:'FF64748B'},size:9};row.getCell(c).fill={type:'pattern',pattern:'solid',fgColor:{argb:SOFT}}}}
  summary.getCell('B4').numFmt=DATETIME;summary.getCell('D4').numFmt=DATE;summary.getCell('F4').numFmt=DATE;summary.getCell('H6').numFmt=MONEY;summary.getCell('F7').numFmt='0.0%';summary.columns=[{width:20},{width:24},{width:20},{width:24},{width:20},{width:24},{width:20},{width:30}]
  summary.mergeCells('A9:H9');summary.getCell('A9').value='Hojas incluidas: Viajes, Paradas, Documentos, Eventos e Incidencias. Todos los registros corresponden únicamente a los viajes visibles al momento de exportar.';summary.getCell('A9').font={bold:true,color:{argb:ACCENT},size:9};summary.getCell('A9').alignment={wrapText:true}

  const tripSheet=wb.addWorksheet('Viajes');tripSheet.columns=[
    {header:'Viaje',key:'trip',width:25},{header:'Fecha',key:'date',width:13},{header:'Estado',key:'status',width:16},{header:'Título / referencia',key:'title',width:30},{header:'Chofer',key:'driver',width:24},{header:'Teléfono chofer',key:'phone',width:16},{header:'Vehículo',key:'vehicle',width:14},{header:'Tipo vehículo',key:'vehicle_type',width:16},{header:'Transportista',key:'carrier',width:25},{header:'Paradas',key:'stops',width:10},{header:'Documentos',key:'docs',width:12},{header:'Bultos cargados',key:'loaded',width:14},{header:'Bultos entregados',key:'delivered',width:15},{header:'Bultos retornados',key:'returned',width:15},{header:'Monto',key:'amount',width:16},{header:'Salida',key:'departed',width:19},{header:'Retorno',key:'returned_at',width:19},{header:'Cierre',key:'completed',width:19},{header:'Duración min',key:'duration',width:12},{header:'Eventos',key:'events',width:10},{header:'Eventos GPS',key:'gps_events',width:11},{header:'Cobertura GPS',key:'coverage',width:13},{header:'Trazado mínimo GPS km',key:'gps_km',width:18},{header:'Mayor gap GPS min',key:'gap',width:16},{header:'Incidencias',key:'incidents',width:11},{header:'Paradas completas',key:'complete',width:15},{header:'Paradas parciales',key:'partial',width:14},{header:'Excepciones',key:'exceptions',width:12},{header:'Máx. desviación m',key:'deviation',width:16},{header:'Permanencia media min',key:'service',width:18},{header:'Notas',key:'notes',width:35},
  ]
  ;(trips as ExportTrip[]).forEach(trip=>{
    const ss=exportStops.filter(s=>s.trip_id===trip.id),dd=exportDocs.filter(d=>d.trip_id===trip.id),ee=[...(eventsByTrip.get(trip.id)||[])].sort((a,b)=>new Date(a.occurred_at).getTime()-new Date(b.occurred_at).getTime()),gg=ee.filter(e=>e.latitude!=null&&e.longitude!=null),ii=incidentsByTrip.get(trip.id)||[]
    let meters=0,gap=0;for(let i=1;i<gg.length;i++){meters+=distance(gg[i-1].latitude!,gg[i-1].longitude!,gg[i].latitude!,gg[i].longitude!);gap=Math.max(gap,minutes(gg[i-1].occurred_at,gg[i].occurred_at)||0)}
    const deviations=ss.filter(s=>s.planned_latitude!=null&&s.planned_longitude!=null&&s.actual_delivery_latitude!=null&&s.actual_delivery_longitude!=null).map(s=>distance(s.planned_latitude!,s.planned_longitude!,s.actual_delivery_latitude!,s.actual_delivery_longitude!)),service=ss.map(s=>minutes(s.arrived_at,s.delivered_at||s.unload_finished_at)).filter((v):v is number=>v!=null)
    const row=tripSheet.addRow({trip:trip.trip_code,date:asDate(trip.trip_date),status:TRIP_STATUS[trip.status]||trip.status,title:trip.title||'',driver:trip.driver_name_snapshot||'',phone:trip.driver_phone_snapshot||'',vehicle:trip.vehicle_plate_snapshot||'',vehicle_type:trip.vehicle_type_snapshot||'',carrier:trip.carrier_name_snapshot||'Operación propia',stops:ss.length||trip.total_stops,docs:dd.length||trip.total_documents,loaded:dd.reduce((s,d)=>s+Number(d.packages_loaded||0),0),delivered:dd.reduce((s,d)=>s+Number(d.packages_delivered||0),0),returned:dd.reduce((s,d)=>s+Number(d.packages_returned||0),0),amount:dd.reduce((s,d)=>s+Number(d.amount||0),0)||Number(trip.total_amount||0),departed:asDate(trip.departed_at),returned_at:asDate(trip.returned_at),completed:asDate(trip.completed_at),duration:minutes(trip.departed_at,trip.completed_at||trip.returned_at),events:ee.length,gps_events:gg.length,coverage:ee.length?gg.length/ee.length:0,gps_km:meters/1000,gap,incidents:ii.length,complete:ss.filter(s=>s.status==='DELIVERED').length,partial:ss.filter(s=>s.status==='PARTIAL').length,exceptions:ss.filter(s=>['NOT_DELIVERED','RESCHEDULED','CANCELLED'].includes(s.status)).length,deviation:deviations.length?Math.max(...deviations):null,service:service.length?service.reduce((a,b)=>a+b,0)/service.length:null,notes:trip.notes||''});statusStyle(row.getCell('status'),trip.status)
  })
  tripSheet.getColumn('B').numFmt=DATE;['P','Q','R'].forEach(c=>tripSheet.getColumn(c).numFmt=DATETIME);tripSheet.getColumn('O').numFmt=MONEY;tripSheet.getColumn('V').numFmt='0.0%';tripSheet.getColumn('W').numFmt='0.0';finish(tripSheet)

  const stopSheet=wb.addWorksheet('Paradas');stopSheet.columns=[
    {header:'Viaje',key:'trip',width:25},{header:'Fecha',key:'date',width:13},{header:'#',key:'order',width:6},{header:'Destino / cliente',key:'destination',width:30},{header:'Teléfono',key:'phone',width:16},{header:'Dirección',key:'address',width:38},{header:'Estado',key:'status',width:16},{header:'Geo estado',key:'geo_status',width:14},{header:'Fuente GPS',key:'geo_source',width:20},{header:'Lat. plan',key:'plat',width:14},{header:'Lon. plan',key:'plon',width:14},{header:'Lat. real',key:'alat',width:14},{header:'Lon. real',key:'alon',width:14},{header:'Desviación m',key:'deviation',width:13},{header:'Bultos cargados',key:'loaded',width:14},{header:'Entregados',key:'delivered',width:12},{header:'Retornados',key:'returned',width:12},{header:'Monto cargado',key:'amount_loaded',width:15},{header:'Monto entregado',key:'amount_delivered',width:16},{header:'Llegada',key:'arrived',width:19},{header:'Inicio descarga',key:'unload_start',width:19},{header:'Fin descarga',key:'unload_end',width:19},{header:'Entrega',key:'delivered_at',width:19},{header:'Permanencia min',key:'service',width:15},{header:'Notas',key:'notes',width:35},
  ]
  exportStops.forEach(s=>{const t=tripMap.get(s.trip_id),dev=s.planned_latitude!=null&&s.planned_longitude!=null&&s.actual_delivery_latitude!=null&&s.actual_delivery_longitude!=null?distance(s.planned_latitude,s.planned_longitude,s.actual_delivery_latitude,s.actual_delivery_longitude):null,row=stopSheet.addRow({trip:t?.trip_code||s.trip_id,date:asDate(t?.trip_date),order:s.stop_order,destination:s.destination_name_snapshot,phone:s.destination_phone_snapshot||'',address:s.destination_address_snapshot||'',status:STOP_STATUS[s.status]||s.status,geo_status:s.geo_status,geo_source:s.geo_source,plat:s.planned_latitude,plon:s.planned_longitude,alat:s.actual_delivery_latitude,alon:s.actual_delivery_longitude,deviation:dev,loaded:s.packages_loaded,delivered:s.packages_delivered,returned:s.packages_returned,amount_loaded:s.amount_loaded,amount_delivered:s.amount_delivered,arrived:asDate(s.arrived_at),unload_start:asDate(s.unload_started_at),unload_end:asDate(s.unload_finished_at),delivered_at:asDate(s.delivered_at),service:minutes(s.arrived_at,s.delivered_at||s.unload_finished_at),notes:s.notes||''});statusStyle(row.getCell('status'),s.status)})
  stopSheet.getColumn('B').numFmt=DATE;['T','U','V','W'].forEach(c=>stopSheet.getColumn(c).numFmt=DATETIME);['R','S'].forEach(c=>stopSheet.getColumn(c).numFmt=MONEY);['J','K','L','M'].forEach(c=>stopSheet.getColumn(c).numFmt='0.000000');finish(stopSheet)

  const docSheet=wb.addWorksheet('Documentos');docSheet.columns=[
    {header:'Viaje',key:'trip',width:25},{header:'Fecha',key:'date',width:13},{header:'Parada',key:'stop',width:9},{header:'Empresa',key:'company',width:14},{header:'Factura',key:'invoice',width:16},{header:'Pedido',key:'order',width:18},{header:'Código cliente',key:'client_code',width:18},{header:'Cliente',key:'client',width:32},{header:'Monto',key:'amount',width:16},{header:'Cargados',key:'loaded',width:10},{header:'Entregados',key:'delivered',width:11},{header:'Retornados',key:'returned',width:11},{header:'Estado',key:'status',width:16},{header:'Fuente',key:'source',width:12},{header:'Intento',key:'attempt',width:9},{header:'Reintento de ID',key:'retry',width:38},{header:'Notas',key:'notes',width:40},
  ]
  exportDocs.forEach(d=>{const t=tripMap.get(d.trip_id),s=stopMap.get(d.stop_id),row=docSheet.addRow({trip:t?.trip_code||d.trip_id,date:asDate(t?.trip_date),stop:s?.stop_order||'',company:d.company_code||'',invoice:d.invoice_number||'',order:d.order_number||'',client_code:d.external_client_code||'',client:d.client_name_snapshot,amount:Number(d.amount||0),loaded:d.packages_loaded,delivered:d.packages_delivered,returned:d.packages_returned,status:d.status,source:d.source_type,attempt:d.attempt_number||1,retry:d.retry_of_document_id||'',notes:d.notes||''});statusStyle(row.getCell('status'),d.status)});docSheet.getColumn('B').numFmt=DATE;docSheet.getColumn('I').numFmt=MONEY;finish(docSheet)

  const eventSheet=wb.addWorksheet('Eventos');eventSheet.columns=[
    {header:'Viaje',key:'trip',width:25},{header:'Fecha viaje',key:'date',width:13},{header:'Evento',key:'event',width:24},{header:'Tipo técnico',key:'type',width:25},{header:'Parada',key:'stop',width:9},{header:'Destino',key:'destination',width:30},{header:'Fecha / hora',key:'time',width:20},{header:'Con GPS',key:'gps',width:10},{header:'Latitud',key:'lat',width:14},{header:'Longitud',key:'lon',width:14},{header:'Precisión m',key:'accuracy',width:12},{header:'Fuente',key:'source',width:20},{header:'Payload',key:'payload',width:42},
  ]
  events.sort((a,b)=>new Date(a.occurred_at).getTime()-new Date(b.occurred_at).getTime()).forEach(e=>{const t=tripMap.get(e.trip_id),s=e.stop_id?stopMap.get(e.stop_id):undefined;eventSheet.addRow({trip:t?.trip_code||e.trip_id,date:asDate(t?.trip_date),event:EVENT_LABELS[e.event_type]||e.event_type.replace(/_/g,' '),type:e.event_type,stop:s?.stop_order||'',destination:s?.destination_name_snapshot||'',time:asDate(e.occurred_at),gps:e.latitude!=null&&e.longitude!=null?'Sí':'No',lat:e.latitude,lon:e.longitude,accuracy:e.accuracy_m,source:e.source||'',payload:e.payload?JSON.stringify(e.payload):''})});eventSheet.getColumn('B').numFmt=DATE;eventSheet.getColumn('G').numFmt=DATETIME;['I','J'].forEach(c=>eventSheet.getColumn(c).numFmt='0.000000');finish(eventSheet)

  const incidentSheet=wb.addWorksheet('Incidencias');incidentSheet.columns=[
    {header:'Viaje',key:'trip',width:25},{header:'Fecha viaje',key:'date',width:13},{header:'Parada',key:'stop',width:9},{header:'Destino',key:'destination',width:30},{header:'Tipo',key:'type',width:24},{header:'Severidad',key:'severity',width:12},{header:'Estado',key:'status',width:14},{header:'Detuvo viaje',key:'stopped',width:12},{header:'Descripción',key:'description',width:40},{header:'Reportada',key:'reported',width:20},{header:'Resuelta',key:'resolved',width:20},{header:'Notas resolución',key:'resolution',width:40},{header:'Latitud',key:'lat',width:14},{header:'Longitud',key:'lon',width:14},
  ]
  incidents.sort((a,b)=>new Date(a.reported_at).getTime()-new Date(b.reported_at).getTime()).forEach(i=>{const t=tripMap.get(i.trip_id),s=i.stop_id?stopMap.get(i.stop_id):undefined;incidentSheet.addRow({trip:t?.trip_code||i.trip_id,date:asDate(t?.trip_date),stop:s?.stop_order||'',destination:s?.destination_name_snapshot||'',type:i.incident_type.replace(/_/g,' '),severity:i.severity||'',status:i.status||'',stopped:i.stopped_trip?'Sí':'No',description:i.description||'',reported:asDate(i.reported_at),resolved:asDate(i.resolved_at),resolution:i.resolution_notes||'',lat:i.latitude,lon:i.longitude})});incidentSheet.getColumn('B').numFmt=DATE;['J','K'].forEach(c=>incidentSheet.getColumn(c).numFmt=DATETIME);['M','N'].forEach(c=>incidentSheet.getColumn(c).numFmt='0.000000');finish(incidentSheet)

  const filename=`Historial_Viajes_${filters.fromDate||'inicio'}_a_${filters.toDate||'hoy'}.xlsx`,buffer=await wb.xlsx.writeBuffer();download(buffer,filename);return filename
}
