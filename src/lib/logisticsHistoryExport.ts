import ExcelJS from 'exceljs'
import { supabase } from './supabase'
import type { DeliveryDocument, DeliveryStop, DeliveryTrip } from './logistics'

type ExportEvent = {
  id: string
  trip_id: string
  stop_id?: string | null
  event_type: string
  latitude?: number | null
  longitude?: number | null
  accuracy_m?: number | null
  source?: string | null
  payload?: Record<string, unknown> | null
  occurred_at: string
}

type ExportIncident = {
  id: string
  trip_id: string
  stop_id?: string | null
  incident_type: string
  severity?: string | null
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  status?: string | null
  stopped_trip?: boolean | null
  reported_at: string
  resolved_at?: string | null
  resolution_notes?: string | null
}

type ExportStop = DeliveryStop & {
  arrived_at?: string | null
  unload_started_at?: string | null
  unload_finished_at?: string | null
  delivered_at?: string | null
  departed_at?: string | null
}

type ExportTrip = DeliveryTrip & {
  returned_at?: string | null
  origin_latitude?: number | null
  origin_longitude?: number | null
}

type ExportDocument = DeliveryDocument & {
  attempt_number?: number | null
  retry_of_document_id?: string | null
}

export type TripHistoryExportFilters = {
  fromDate?: string
  toDate?: string
  search?: string
  statusLabel?: string
}

type ExportArgs = {
  trips: DeliveryTrip[]
  stops: DeliveryStop[]
  documents: DeliveryDocument[]
  filters: TripHistoryExportFilters
}

const TRIP_STATUS: Record<string, string> = {
  DRAFT: 'Borrador', PREPARING: 'Preparando', LOADED: 'Cargado', READY: 'Listo', IN_ROUTE: 'En ruta', WITH_INCIDENT: 'Con incidencia', RETURNING: 'Retornando', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado',
}

const STOP_STATUS: Record<string, string> = {
  PENDING: 'Pendiente', EN_ROUTE: 'En camino', AT_CLIENT: 'En cliente', WAITING_UNLOAD: 'Espera descarga', UNLOADING: 'Descargando', DELIVERED: 'Entregada', PARTIAL: 'Parcial', NOT_DELIVERED: 'No entregada', RESCHEDULED: 'Reprogramada', CANCELLED: 'Cancelada',
}

const EVENT_LABELS: Record<string, string> = {
  DEPARTED_ORIGIN: 'Salida del centro de carga', ARRIVED: 'Llegada al cliente', UNLOAD_STARTED: 'Inicio de descarga', UNLOAD_FINISHED: 'Fin de descarga', DELIVERY_CONFIRMED: 'Entrega confirmada', DELIVERY_PARTIAL: 'Entrega parcial', DELIVERY_NOT_DELIVERED: 'No entregada', DELIVERY_RESCHEDULED: 'Entrega reprogramada', INCIDENT_REPORTED: 'Incidencia reportada', INCIDENT_RESOLVED: 'Incidencia resuelta', RETURN_STARTED: 'Inicio de retorno', RETURNED_ORIGIN: 'Retorno a base', TRIP_COMPLETED: 'Cierre del viaje',
}

const HEADER_FILL = 'FF172033'
const HEADER_FONT = 'FFFFFFFF'
const ACCENT = 'FFC71F2D'
const SOFT_FILL = 'FFF4F6F8'
const BORDER = 'FFD9DEE7'
const MONEY_FORMAT = 'RD$ #,##0.00;[Red]-RD$ #,##0.00'
const DATE_FORMAT = 'dd/mm/yyyy'
const DATETIME_FORMAT = 'dd/mm/yyyy hh:mm'

function chunk<T>(items: T[], size = 100) {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

function asDate(value?: string | null) {
  if (!value) return null
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const value = (new Date(end).getTime() - new Date(start).getTime()) / 60000
  return Number.isFinite(value) && value >= 0 ? value : null
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371000
  const toRad = (value: number) => value * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function fetchOperationalDetail(tripIds: string[]) {
  const events: ExportEvent[] = []
  const incidents: ExportIncident[] = []
  for (const ids of chunk(tripIds)) {
    const [eventRes, incidentRes] = await Promise.all([
      supabase.from('delivery_events').select('*').in('trip_id', ids).order('occurred_at', { ascending: true }),
      supabase.from('delivery_incidents').select('*').in('trip_id', ids).order('reported_at', { ascending: true }),
    ])
    const error = eventRes.error || incidentRes.error
    if (error) throw error
    events.push(...((eventRes.data || []) as ExportEvent[]))
    incidents.push(...((incidentRes.data || []) as ExportIncident[]))
  }
  return { events, incidents }
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1)
  row.height = 24
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.font = { bold: true, color: { argb: HEADER_FONT }, size: 10 }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } }
  })
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  if (sheet.columnCount) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(sheet.rowCount, 1), column: sheet.columnCount } }
}

function finalizeSheet(sheet: ExcelJS.Worksheet) {
  styleHeader(sheet)
  sheet.properties.defaultRowHeight = 18
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    if (rowNumber % 2 === 0) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFBFC' } } })
    row.alignment = { vertical: 'top', wrapText: true }
  })
  sheet.columns.forEach(column => {
    if (!column.width || column.width < 11) column.width = 11
    if (column.width > 42) column.width = 42
  })
}

function statusCellStyle(cell: ExcelJS.Cell, status: string) {
  const value = String(status || '')
  let fill = 'FFF3F4F6'
  let color = 'FF475569'
  if (['COMPLETED', 'DELIVERED'].includes(value)) { fill = 'FFEAF8EF'; color = 'FF16804A' }
  else if (['PARTIAL', 'RETURNING', 'RESCHEDULED'].includes(value)) { fill = 'FFFFF4DD'; color = 'FF986815' }
  else if (['WITH_INCIDENT', 'NOT_DELIVERED', 'CANCELLED'].includes(value)) { fill = 'FFFFEEEE'; color = 'FFB0202D' }
  else if (['READY', 'IN_ROUTE', 'AT_CLIENT', 'UNLOADING'].includes(value)) { fill = 'FFEDF5FF'; color = 'FF245FA4' }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } }
  cell.font = { bold: true, color: { argb: color } }
  cell.alignment = { horizontal: 'center', vertical: 'middle' }
}

function downloadBuffer(buffer: ExcelJS.Buffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportTripHistoryExcel({ trips, stops, documents, filters }: ExportArgs) {
  if (!trips.length) throw new Error('No hay viajes visibles para exportar.')
  const tripIds = trips.map(trip => trip.id)
  const tripIdSet = new Set(tripIds)
  const exportStops = (stops.filter(stop => tripIdSet.has(stop.trip_id)) as ExportStop[]).sort((a, b) => a.trip_id.localeCompare(b.trip_id) || a.stop_order - b.stop_order)
  const exportDocuments = documents.filter(document => tripIdSet.has(document.trip_id)) as ExportDocument[]
  const { events, incidents } = await fetchOperationalDetail(tripIds)

  const tripMap = new Map((trips as ExportTrip[]).map(trip => [trip.id, trip]))
  const stopMap = new Map(exportStops.map(stop => [stop.id, stop]))
  const eventsByTrip = new Map<string, ExportEvent[]>()
  const incidentsByTrip = new Map<string, ExportIncident[]>()
  events.forEach(event => eventsByTrip.set(event.trip_id, [...(eventsByTrip.get(event.trip_id) || []), event]))
  incidents.forEach(incident => incidentsByTrip.set(incident.trip_id, [...(incidentsByTrip.get(incident.trip_id) || []), incident]))

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Gestión de Ventas Karaka'
  workbook.company = 'Almacenes Karaka'
  workbook.created = new Date()
  workbook.modified = new Date()
  workbook.calcProperties.fullCalcOnLoad = true

  const summary = workbook.addWorksheet('Resumen', { views: [{ showGridLines: false }] })
  summary.mergeCells('A1:H1')
  summary.getCell('A1').value = 'HISTORIAL DE VIAJES · LOGÍSTICA Y ENTREGA'
  summary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
  summary.getCell('A1').font = { bold: true, color: { argb: HEADER_FONT }, size: 16 }
  summary.getCell('A1').alignment = { vertical: 'middle', horizontal: 'left' }
  summary.getRow(1).height = 34
  summary.mergeCells('A2:H2')
  summary.getCell('A2').value = 'Exportación estructurada del recorrido operativo. Las distancias GPS son segmentos rectos entre puntos registrados; no representan la ruta vial exacta.'
  summary.getCell('A2').font = { color: { argb: 'FF64748B' }, italic: true, size: 9 }
  summary.getCell('A2').alignment = { wrapText: true, vertical: 'middle' }
  summary.getRow(2).height = 30

  const totalPackagesLoaded = exportDocuments.reduce((sum, item) => sum + Number(item.packages_loaded || 0), 0)
  const totalPackagesDelivered = exportDocuments.reduce((sum, item) => sum + Number(item.packages_delivered || 0), 0)
  const totalPackagesReturned = exportDocuments.reduce((sum, item) => sum + Number(item.packages_returned || 0), 0)
  const totalAmount = exportDocuments.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const gpsEvents = events.filter(event => event.latitude != null && event.longitude != null).length
  const coverage = events.length ? gpsEvents / events.length : 0

  const metaRows: Array<[string, unknown, string, unknown, string, unknown, string, unknown]> = [
    ['Generado', new Date(), 'Desde', filters.fromDate ? asDate(filters.fromDate) : 'Sin límite', 'Hasta', filters.toDate ? asDate(filters.toDate) : 'Sin límite', 'Estado', filters.statusLabel || 'Todos'],
    ['Búsqueda', filters.search || 'Sin búsqueda', 'Viajes', trips.length, 'Paradas', exportStops.length, 'Documentos', exportDocuments.length],
    ['Bultos cargados', totalPackagesLoaded, 'Bultos entregados', totalPackagesDelivered, 'Bultos retornados', totalPackagesReturned, 'Monto total', totalAmount],
    ['Eventos', events.length, 'Eventos con GPS', gpsEvents, 'Cobertura GPS', coverage, 'Incidencias', incidents.length],
  ]
  summary.getRange?.('A4:H7')
  metaRows.forEach((values, index) => {
    const row = summary.getRow(4 + index)
    values.forEach((value, colIndex) => { row.getCell(colIndex + 1).value = value as never })
  })
  for (let rowNumber = 4; rowNumber <= 7; rowNumber += 1) {
    const row = summary.getRow(rowNumber)
    for (let col = 1; col <= 8; col += 2) {
      row.getCell(col).font = { bold: true, color: { argb: 'FF64748B' }, size: 9 }
      row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_FILL } }
    }
  }
  summary.getCell('B4').numFmt = DATETIME_FORMAT
  summary.getCell('D4').numFmt = DATE_FORMAT
  summary.getCell('F4').numFmt = DATE_FORMAT
  summary.getCell('H6').numFmt = MONEY_FORMAT
  summary.getCell('F7').numFmt = '0.0%'
  summary.columns = [{ width: 20 }, { width: 24 }, { width: 20 }, { width: 24 }, { width: 20 }, { width: 24 }, { width: 20 }, { width: 30 }]
  summary.mergeCells('A9:H9')
  summary.getCell('A9').value = 'Hojas incluidas: Viajes, Paradas, Documentos, Eventos e Incidencias. Todos los registros corresponden únicamente a los viajes visibles al momento de exportar.'
  summary.getCell('A9').font = { bold: true, color: { argb: ACCENT }, size: 9 }
  summary.getCell('A9').alignment = { wrapText: true }

  const tripsSheet = workbook.addWorksheet('Viajes')
  tripsSheet.columns = [
    { header: 'Viaje', key: 'trip_code', width: 25 }, { header: 'Fecha', key: 'trip_date', width: 13 }, { header: 'Estado', key: 'status_label', width: 16 }, { header: 'Título / referencia', key: 'title', width: 30 },
    { header: 'Chofer', key: 'driver', width: 24 }, { header: 'Teléfono chofer', key: 'driver_phone', width: 16 }, { header: 'Vehículo', key: 'vehicle', width: 14 }, { header: 'Tipo vehículo', key: 'vehicle_type', width: 16 }, { header: 'Transportista', key: 'carrier', width: 25 },
    { header: 'Paradas', key: 'stops', width: 10 }, { header: 'Documentos', key: 'documents', width: 12 }, { header: 'Bultos cargados', key: 'packages_loaded', width: 14 }, { header: 'Bultos entregados', key: 'packages_delivered', width: 15 }, { header: 'Bultos retornados', key: 'packages_returned', width: 15 }, { header: 'Monto', key: 'amount', width: 16 },
    { header: 'Salida', key: 'departed_at', width: 19 }, { header: 'Retorno', key: 'returned_at', width: 19 }, { header: 'Cierre', key: 'completed_at', width: 19 }, { header: 'Duración min', key: 'duration', width: 12 },
    { header: 'Eventos', key: 'events', width: 10 }, { header: 'Eventos GPS', key: 'gps_events', width: 11 }, { header: 'Cobertura GPS', key: 'gps_coverage', width: 13 }, { header: 'Trazado mínimo GPS km', key: 'gps_km', width: 18 }, { header: 'Mayor gap GPS min', key: 'max_gap', width: 16 },
    { header: 'Incidencias', key: 'incidents', width: 11 }, { header: 'Paradas completas', key: 'delivered_stops', width: 15 }, { header: 'Paradas parciales', key: 'partial_stops', width: 14 }, { header: 'Excepciones', key: 'failed_stops', width: 12 }, { header: 'Máx. desviación m', key: 'max_deviation', width: 16 }, { header: 'Permanencia media min', key: 'avg_service', width: 18 }, { header: 'Notas', key: 'notes', width: 35 },
  ]

  ;(trips as ExportTrip[]).forEach(trip => {
    const tripStops = exportStops.filter(stop => stop.trip_id === trip.id)
    const tripDocs = exportDocuments.filter(document => document.trip_id === trip.id)
    const tripEvents = [...(eventsByTrip.get(trip.id) || [])].sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())
    const tripGps = tripEvents.filter(event => event.latitude != null && event.longitude != null)
    const tripIncidents = incidentsByTrip.get(trip.id) || []
    let gpsMeters = 0
    let maxGap = 0
    for (let index = 1; index < tripGps.length; index += 1) {
      gpsMeters += haversineMeters(tripGps[index - 1].latitude!, tripGps[index - 1].longitude!, tripGps[index].latitude!, tripGps[index].longitude!)
      maxGap = Math.max(maxGap, minutesBetween(tripGps[index - 1].occurred_at, tripGps[index].occurred_at) || 0)
    }
    const deviations = tripStops.filter(stop => stop.planned_latitude != null && stop.planned_longitude != null && stop.actual_delivery_latitude != null && stop.actual_delivery_longitude != null)
      .map(stop => haversineMeters(stop.planned_latitude!, stop.planned_longitude!, stop.actual_delivery_latitude!, stop.actual_delivery_longitude!))
    const service = tripStops.map(stop => minutesBetween(stop.arrived_at, stop.delivered_at || stop.unload_finished_at)).filter((value): value is number => value != null)
    const row = tripsSheet.addRow({
      trip_code: trip.trip_code, trip_date: asDate(trip.trip_date), status_label: TRIP_STATUS[trip.status] || trip.status, title: trip.title || '', driver: trip.driver_name_snapshot || '', driver_phone: trip.driver_phone_snapshot || '', vehicle: trip.vehicle_plate_snapshot || '', vehicle_type: trip.vehicle_type_snapshot || '', carrier: trip.carrier_name_snapshot || 'Operación propia',
      stops: tripStops.length || trip.total_stops, documents: tripDocs.length || trip.total_documents, packages_loaded: tripDocs.reduce((sum, item) => sum + Number(item.packages_loaded || 0), 0), packages_delivered: tripDocs.reduce((sum, item) => sum + Number(item.packages_delivered || 0), 0), packages_returned: tripDocs.reduce((sum, item) => sum + Number(item.packages_returned || 0), 0), amount: tripDocs.reduce((sum, item) => sum + Number(item.amount || 0), 0) || Number(trip.total_amount || 0),
      departed_at: asDate(trip.departed_at), returned_at: asDate(trip.returned_at), completed_at: asDate(trip.completed_at), duration: minutesBetween(trip.departed_at, trip.completed_at || trip.returned_at), events: tripEvents.length, gps_events: tripGps.length, gps_coverage: tripEvents.length ? tripGps.length / tripEvents.length : 0, gps_km: gpsMeters / 1000, max_gap: maxGap, incidents: tripIncidents.length,
      delivered_stops: tripStops.filter(stop => stop.status === 'DELIVERED').length, partial_stops: tripStops.filter(stop => stop.status === 'PARTIAL').length, failed_stops: tripStops.filter(stop => ['NOT_DELIVERED', 'RESCHEDULED', 'CANCELLED'].includes(stop.status)).length, max_deviation: deviations.length ? Math.max(...deviations) : null, avg_service: service.length ? service.reduce((sum, value) => sum + value, 0) / service.length : null, notes: trip.notes || '',
    })
    statusCellStyle(row.getCell('status_label'), trip.status)
  })
  ;['B', 'P', 'Q', 'R'].forEach(col => { tripsSheet.getColumn(col).numFmt = col === 'B' ? DATE_FORMAT : DATETIME_FORMAT })
  tripsSheet.getColumn('O').numFmt = MONEY_FORMAT
  tripsSheet.getColumn('V').numFmt = '0.0%'
  tripsSheet.getColumn('W').numFmt = '0.0'
  tripsSheet.getColumn('AC').numFmt = '0'
  tripsSheet.getColumn('AD').numFmt = '0.0'
  finalizeSheet(tripsSheet)

  const stopsSheet = workbook.addWorksheet('Paradas')
  stopsSheet.columns = [
    { header: 'Viaje', key: 'trip', width: 25 }, { header: 'Fecha', key: 'date', width: 13 }, { header: '#', key: 'order', width: 6 }, { header: 'Destino / cliente', key: 'destination', width: 30 }, { header: 'Teléfono', key: 'phone', width: 16 }, { header: 'Dirección', key: 'address', width: 38 }, { header: 'Estado', key: 'status', width: 16 },
    { header: 'Geo estado', key: 'geo_status', width: 14 }, { header: 'Fuente GPS', key: 'geo_source', width: 20 }, { header: 'Lat. plan', key: 'planned_lat', width: 14 }, { header: 'Lon. plan', key: 'planned_lon', width: 14 }, { header: 'Lat. real', key: 'actual_lat', width: 14 }, { header: 'Lon. real', key: 'actual_lon', width: 14 }, { header: 'Desviación m', key: 'deviation', width: 13 },
    { header: 'Bultos cargados', key: 'loaded', width: 14 }, { header: 'Entregados', key: 'delivered', width: 12 }, { header: 'Retornados', key: 'returned', width: 12 }, { header: 'Monto cargado', key: 'amount_loaded', width: 15 }, { header: 'Monto entregado', key: 'amount_delivered', width: 16 },
    { header: 'Llegada', key: 'arrived', width: 19 }, { header: 'Inicio descarga', key: 'unload_start', width: 19 }, { header: 'Fin descarga', key: 'unload_end', width: 19 }, { header: 'Entrega', key: 'delivered_at', width: 19 }, { header: 'Permanencia min', key: 'service', width: 15 }, { header: 'Notas', key: 'notes', width: 35 },
  ]
  exportStops.forEach(stop => {
    const trip = tripMap.get(stop.trip_id)
    const deviation = stop.planned_latitude != null && stop.planned_longitude != null && stop.actual_delivery_latitude != null && stop.actual_delivery_longitude != null
      ? haversineMeters(stop.planned_latitude, stop.planned_longitude, stop.actual_delivery_latitude, stop.actual_delivery_longitude) : null
    const row = stopsSheet.addRow({ trip: trip?.trip_code || stop.trip_id, date: asDate(trip?.trip_date), order: stop.stop_order, destination: stop.destination_name_snapshot, phone: stop.destination_phone_snapshot || '', address: stop.destination_address_snapshot || '', status: STOP_STATUS[stop.status] || stop.status, geo_status: stop.geo_status, geo_source: stop.geo_source, planned_lat: stop.planned_latitude, planned_lon: stop.planned_longitude, actual_lat: stop.actual_delivery_latitude, actual_lon: stop.actual_delivery_longitude, deviation, loaded: stop.packages_loaded, delivered: stop.packages_delivered, returned: stop.packages_returned, amount_loaded: stop.amount_loaded, amount_delivered: stop.amount_delivered, arrived: asDate(stop.arrived_at), unload_start: asDate(stop.unload_started_at), unload_end: asDate(stop.unload_finished_at), delivered_at: asDate(stop.delivered_at), service: minutesBetween(stop.arrived_at, stop.delivered_at || stop.unload_finished_at), notes: stop.notes || '' })
    statusCellStyle(row.getCell('status'), stop.status)
  })
  stopsSheet.getColumn('B').numFmt = DATE_FORMAT
  ;['T', 'U', 'V', 'W'].forEach(col => { stopsSheet.getColumn(col).numFmt = DATETIME_FORMAT })
  ;['R', 'S'].forEach(col => { stopsSheet.getColumn(col).numFmt = MONEY_FORMAT })
  ;['J', 'K', 'L', 'M'].forEach(col => { stopsSheet.getColumn(col).numFmt = '0.000000' })
  finalizeSheet(stopsSheet)

  const docsSheet = workbook.addWorksheet('Documentos')
  docsSheet.columns = [
    { header: 'Viaje', key: 'trip', width: 25 }, { header: 'Fecha', key: 'date', width: 13 }, { header: 'Parada', key: 'stop', width: 9 }, { header: 'Empresa', key: 'company', width: 14 }, { header: 'Factura', key: 'invoice', width: 16 }, { header: 'Pedido', key: 'order', width: 18 }, { header: 'Código cliente', key: 'client_code', width: 18 }, { header: 'Cliente', key: 'client', width: 32 }, { header: 'Monto', key: 'amount', width: 16 }, { header: 'Cargados', key: 'loaded', width: 10 }, { header: 'Entregados', key: 'delivered', width: 11 }, { header: 'Retornados', key: 'returned', width: 11 }, { header: 'Estado', key: 'status', width: 16 }, { header: 'Fuente', key: 'source', width: 12 }, { header: 'Intento', key: 'attempt', width: 9 }, { header: 'Reintento de ID', key: 'retry_of', width: 38 }, { header: 'Notas', key: 'notes', width: 40 },
  ]
  exportDocuments.forEach(document => {
    const trip = tripMap.get(document.trip_id)
    const stop = stopMap.get(document.stop_id)
    const row = docsSheet.addRow({ trip: trip?.trip_code || document.trip_id, date: asDate(trip?.trip_date), stop: stop?.stop_order || '', company: document.company_code || '', invoice: document.invoice_number || '', order: document.order_number || '', client_code: document.external_client_code || '', client: document.client_name_snapshot, amount: Number(document.amount || 0), loaded: document.packages_loaded, delivered: document.packages_delivered, returned: document.packages_returned, status: document.status, source: document.source_type, attempt: document.attempt_number || 1, retry_of: document.retry_of_document_id || '', notes: document.notes || '' })
    statusCellStyle(row.getCell('status'), document.status)
  })
  docsSheet.getColumn('B').numFmt = DATE_FORMAT
  docsSheet.getColumn('I').numFmt = MONEY_FORMAT
  finalizeSheet(docsSheet)

  const eventsSheet = workbook.addWorksheet('Eventos')
  eventsSheet.columns = [
    { header: 'Viaje', key: 'trip', width: 25 }, { header: 'Fecha viaje', key: 'trip_date', width: 13 }, { header: 'Evento', key: 'event', width: 24 }, { header: 'Tipo técnico', key: 'event_type', width: 25 }, { header: 'Parada', key: 'stop', width: 9 }, { header: 'Destino', key: 'destination', width: 30 }, { header: 'Fecha / hora', key: 'occurred_at', width: 20 }, { header: 'Con GPS', key: 'has_gps', width: 10 }, { header: 'Latitud', key: 'lat', width: 14 }, { header: 'Longitud', key: 'lon', width: 14 }, { header: 'Precisión m', key: 'accuracy', width: 12 }, { header: 'Fuente', key: 'source', width: 20 }, { header: 'Payload', key: 'payload', width: 42 },
  ]
  events.sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()).forEach(event => {
    const trip = tripMap.get(event.trip_id)
    const stop = event.stop_id ? stopMap.get(event.stop_id) : undefined
    eventsSheet.addRow({ trip: trip?.trip_code || event.trip_id, trip_date: asDate(trip?.trip_date), event: EVENT_LABELS[event.event_type] || event.event_type.replace(/_/g, ' '), event_type: event.event_type, stop: stop?.stop_order || '', destination: stop?.destination_name_snapshot || '', occurred_at: asDate(event.occurred_at), has_gps: event.latitude != null && event.longitude != null ? 'Sí' : 'No', lat: event.latitude, lon: event.longitude, accuracy: event.accuracy_m, source: event.source || '', payload: event.payload ? JSON.stringify(event.payload) : '' })
  })
  eventsSheet.getColumn('B').numFmt = DATE_FORMAT
  eventsSheet.getColumn('G').numFmt = DATETIME_FORMAT
  ;['I', 'J'].forEach(col => { eventsSheet.getColumn(col).numFmt = '0.000000' })
  finalizeSheet(eventsSheet)

  const incidentsSheet = workbook.addWorksheet('Incidencias')
  incidentsSheet.columns = [
    { header: 'Viaje', key: 'trip', width: 25 }, { header: 'Fecha viaje', key: 'trip_date', width: 13 }, { header: 'Parada', key: 'stop', width: 9 }, { header: 'Destino', key: 'destination', width: 30 }, { header: 'Tipo', key: 'type', width: 24 }, { header: 'Severidad', key: 'severity', width: 12 }, { header: 'Estado', key: 'status', width: 14 }, { header: 'Detuvo viaje', key: 'stopped', width: 12 }, { header: 'Descripción', key: 'description', width: 40 }, { header: 'Reportada', key: 'reported_at', width: 20 }, { header: 'Resuelta', key: 'resolved_at', width: 20 }, { header: 'Notas resolución', key: 'resolution', width: 40 }, { header: 'Latitud', key: 'lat', width: 14 }, { header: 'Longitud', key: 'lon', width: 14 },
  ]
  incidents.sort((a, b) => new Date(a.reported_at).getTime() - new Date(b.reported_at).getTime()).forEach(incident => {
    const trip = tripMap.get(incident.trip_id)
    const stop = incident.stop_id ? stopMap.get(incident.stop_id) : undefined
    incidentsSheet.addRow({ trip: trip?.trip_code || incident.trip_id, trip_date: asDate(trip?.trip_date), stop: stop?.stop_order || '', destination: stop?.destination_name_snapshot || '', type: incident.incident_type.replace(/_/g, ' '), severity: incident.severity || '', status: incident.status || '', stopped: incident.stopped_trip ? 'Sí' : 'No', description: incident.description || '', reported_at: asDate(incident.reported_at), resolved_at: asDate(incident.resolved_at), resolution: incident.resolution_notes || '', lat: incident.latitude, lon: incident.longitude })
  })
  incidentsSheet.getColumn('B').numFmt = DATE_FORMAT
  ;['J', 'K'].forEach(col => { incidentsSheet.getColumn(col).numFmt = DATETIME_FORMAT })
  ;['M', 'N'].forEach(col => { incidentsSheet.getColumn(col).numFmt = '0.000000' })
  finalizeSheet(incidentsSheet)

  const safeFrom = filters.fromDate || 'inicio'
  const safeTo = filters.toDate || 'hoy'
  const filename = `Historial_Viajes_${safeFrom}_a_${safeTo}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBuffer(buffer, filename)
  return filename
}
