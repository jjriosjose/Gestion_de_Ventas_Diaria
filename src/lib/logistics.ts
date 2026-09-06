import ExcelJS from 'exceljs'
import type { Client } from '../types'

export type DeliveryTab = 'DISPATCH' | 'TRIPS' | 'CONTROL' | 'VEHICLES' | 'DRIVERS' | 'PROVIDERS'
export type DriverType = 'INTERNAL' | 'CONTRACTOR' | 'THIRD_PARTY'
export type OwnershipType = 'OWNED' | 'RENTED' | 'THIRD_PARTY'
export type GeoSource = 'EXCEL_GPS' | 'CLIENT_MASTER_GPS' | 'CONTROL_TOWER_GPS' | 'MANUAL_GPS' | 'DRIVER_ARRIVAL_GPS' | 'DRIVER_DELIVERY_GPS' | 'NO_GPS'
export type GeoStatus = 'READY' | 'PENDING' | 'CAPTURED_AT_DELIVERY' | 'REVIEW'
export type DeliveryTripStatus = 'DRAFT' | 'PREPARING' | 'LOADED' | 'READY' | 'IN_ROUTE' | 'WITH_INCIDENT' | 'RETURNING' | 'COMPLETED' | 'CANCELLED'
export type DeliveryStopStatus = 'PENDING' | 'EN_ROUTE' | 'AT_CLIENT' | 'WAITING_UNLOAD' | 'UNLOADING' | 'DELIVERED' | 'PARTIAL' | 'NOT_DELIVERED' | 'RESCHEDULED' | 'CANCELLED'
export type MatchStatus = 'MATCHED' | 'SUGGESTED' | 'EXTERNAL'

export type DeliveryProvider = {
  id: string
  name: string
  tax_id?: string | null
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  notes?: string | null
  active: boolean
}

export type DeliveryDriver = {
  id: string
  employee_id?: string | null
  provider_id?: string | null
  full_name: string
  document_id?: string | null
  phone?: string | null
  license_number?: string | null
  license_expires_on?: string | null
  driver_type: DriverType
  carrier_name_snapshot?: string | null
  active: boolean
  notes?: string | null
}

export type DeliveryVehicle = {
  id: string
  provider_id?: string | null
  plate: string
  vehicle_type: string
  brand?: string | null
  model?: string | null
  model_year?: number | null
  ownership_type: OwnershipType
  carrier_name_snapshot?: string | null
  capacity_packages?: number | null
  capacity_weight_kg?: number | null
  active: boolean
  notes?: string | null
}

export type DeliveryTrip = {
  id: string
  trip_code: string
  trip_date: string
  title?: string | null
  origin_name?: string | null
  driver_id?: string | null
  vehicle_id?: string | null
  provider_id?: string | null
  driver_name_snapshot?: string | null
  driver_phone_snapshot?: string | null
  vehicle_plate_snapshot?: string | null
  vehicle_type_snapshot?: string | null
  ownership_type_snapshot?: string | null
  carrier_name_snapshot?: string | null
  status: DeliveryTripStatus
  route_revision: number
  total_documents: number
  total_stops: number
  total_amount: number
  total_packages: number
  started_at?: string | null
  departed_at?: string | null
  completed_at?: string | null
  notes?: string | null
  created_at?: string
}

export type DeliveryStop = {
  id: string
  trip_id: string
  client_id?: string | null
  stop_order: number
  destination_name_snapshot: string
  destination_phone_snapshot?: string | null
  destination_address_snapshot?: string | null
  planned_latitude?: number | null
  planned_longitude?: number | null
  master_latitude_snapshot?: number | null
  master_longitude_snapshot?: number | null
  actual_delivery_latitude?: number | null
  actual_delivery_longitude?: number | null
  geo_source: GeoSource
  geo_status: GeoStatus
  status: DeliveryStopStatus
  packages_loaded: number
  packages_delivered: number
  packages_returned: number
  amount_loaded: number
  amount_delivered: number
  control_tower_updated_at?: string | null
  driver_acknowledged_at?: string | null
  notes?: string | null
}

export type DeliveryDocument = {
  id: string
  trip_id: string
  stop_id: string
  import_batch_id?: string | null
  company_code?: string | null
  invoice_number?: string | null
  order_number?: string | null
  external_client_code?: string | null
  client_id?: string | null
  client_name_snapshot: string
  amount: number
  packages_loaded: number
  packages_delivered: number
  packages_returned: number
  status: string
  source_type: 'EXCEL' | 'MANUAL'
  source_row?: number | null
  notes?: string | null
}

export type ClientLite = Pick<Client, 'id' | 'codempr' | 'cod_empresa' | 'company_code' | 'legal_name' | 'display_name' | 'phone1' | 'mobile' | 'latitude' | 'longitude' | 'address1'>

export type DeliveryDraftDocument = {
  tempId: string
  sourceType: 'EXCEL' | 'MANUAL'
  sourceRow?: number
  companyCode: string
  invoiceNumber: string
  orderNumber: string
  externalClientCode: string
  clientName: string
  amount: number
  packages: number
  excelLatitude: number | null
  excelLongitude: number | null
  phone: string
  notes: string
  matchStatus: MatchStatus
  clientId: string | null
  suggestedClientId: string | null
  plannedLatitude: number | null
  plannedLongitude: number | null
  masterLatitude: number | null
  masterLongitude: number | null
  geoSource: GeoSource
  geoStatus: GeoStatus
}

export type ImportSummary = {
  total: number
  matched: number
  suggested: number
  external: number
  gpsReady: number
  gpsPending: number
  totalAmount: number
  totalPackages: number
}

const HEADER_ALIASES: Record<string, string> = {
  empresa: 'companyCode', company: 'companyCode', compania: 'companyCode',
  factura: 'invoiceNumber', nofactura: 'invoiceNumber', numerofactura: 'invoiceNumber', invoice: 'invoiceNumber',
  pedido: 'orderNumber', nopedido: 'orderNumber', numeropedido: 'orderNumber', order: 'orderNumber',
  codigocliente: 'externalClientCode', codcliente: 'externalClientCode', codempr: 'externalClientCode', codempresa: 'externalClientCode',
  cliente: 'clientName', nombrecliente: 'clientName', razonsocial: 'clientName', nombresocial: 'clientName',
  monto: 'amount', total: 'amount', montofactura: 'amount', valor: 'amount',
  bultos: 'packages', cajas: 'packages', cantidadbultos: 'packages', cantidadcajas: 'packages', paquetes: 'packages',
  latitud: 'latitude', latitude: 'latitude', lat: 'latitude',
  longitud: 'longitude', longitude: 'longitude', lon: 'longitude', lng: 'longitude',
  telefono: 'phone', phone: 'phone', celular: 'phone', movil: 'phone',
  observacion: 'notes', observaciones: 'notes', nota: 'notes', notas: 'notes',
}

export function normalizeText(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es')
    .replace(/\b(S\.?R\.?L\.?|SRL|S\.?A\.?|SA)\b/g, ' ')
    .replace(/[^A-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '')
}

function cellValue(value: unknown): unknown {
  if (value && typeof value === 'object') {
    const maybe = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> }
    if (maybe.result != null) return maybe.result
    if (maybe.text != null) return maybe.text
    if (Array.isArray(maybe.richText)) return maybe.richText.map(item => item.text || '').join('')
  }
  return value
}

export function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  let raw = String(cellValue(value) ?? '').trim().replace(/\s/g, '').replace(/RD\$/gi, '').replace(/\$/g, '')
  if (!raw) return 0
  const comma = raw.lastIndexOf(',')
  const dot = raw.lastIndexOf('.')
  if (comma >= 0 && dot >= 0) {
    if (comma > dot) raw = raw.replace(/\./g, '').replace(',', '.')
    else raw = raw.replace(/,/g, '')
  } else if (comma >= 0) {
    const decimals = raw.length - comma - 1
    raw = decimals > 0 && decimals <= 2 ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '')
  }
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseCoordinate(value: unknown): number | null {
  if (value == null || String(cellValue(value)).trim() === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const raw = String(cellValue(value)).trim().replace(/\s/g, '')
  const parsed = Number(raw.includes(',') && !raw.includes('.') ? raw.replace(',', '.') : raw.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function validLat(value: number | null) { return value != null && value >= -90 && value <= 90 }
function validLon(value: number | null) { return value != null && value >= -180 && value <= 180 }
export function validCoordinates(lat: number | null, lon: number | null) { return validLat(lat) && validLon(lon) }

function similarityScore(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length)
  const aa = new Set(a.split(' ').filter(token => token.length > 2))
  const bb = new Set(b.split(' ').filter(token => token.length > 2))
  if (!aa.size || !bb.size) return 0
  let overlap = 0
  aa.forEach(token => { if (bb.has(token)) overlap += 1 })
  return overlap / Math.max(aa.size, bb.size)
}

export function resolveDraftClient(draft: Omit<DeliveryDraftDocument, 'matchStatus' | 'clientId' | 'suggestedClientId' | 'plannedLatitude' | 'plannedLongitude' | 'masterLatitude' | 'masterLongitude' | 'geoSource' | 'geoStatus'>, clients: ClientLite[]): DeliveryDraftDocument {
  const code = normalizeText(draft.externalClientCode)
  const name = normalizeText(draft.clientName)
  const codeMatch = code ? clients.find(client => [client.codempr, client.cod_empresa, client.company_code].some(value => normalizeText(value) === code)) : undefined
  const exactName = !codeMatch && name ? clients.find(client => [client.legal_name, client.display_name].some(value => normalizeText(value) === name)) : undefined
  const matched = codeMatch || exactName
  let suggested: ClientLite | undefined
  if (!matched && name.length >= 5) {
    let best = 0
    for (const client of clients) {
      const candidate = Math.max(similarityScore(name, normalizeText(client.legal_name)), similarityScore(name, normalizeText(client.display_name)))
      if (candidate >= 0.72 && candidate > best) { best = candidate; suggested = client }
    }
  }
  const selected = matched
  const masterLat = selected?.latitude ?? null
  const masterLon = selected?.longitude ?? null
  const hasExcelGps = validCoordinates(draft.excelLatitude, draft.excelLongitude)
  const hasMasterGps = validCoordinates(masterLat, masterLon)
  return {
    ...draft,
    matchStatus: matched ? 'MATCHED' : suggested ? 'SUGGESTED' : 'EXTERNAL',
    clientId: matched?.id ?? null,
    suggestedClientId: suggested?.id ?? null,
    plannedLatitude: hasExcelGps ? draft.excelLatitude : hasMasterGps ? masterLat : null,
    plannedLongitude: hasExcelGps ? draft.excelLongitude : hasMasterGps ? masterLon : null,
    masterLatitude: masterLat,
    masterLongitude: masterLon,
    geoSource: hasExcelGps ? 'EXCEL_GPS' : hasMasterGps ? 'CLIENT_MASTER_GPS' : 'NO_GPS',
    geoStatus: hasExcelGps || hasMasterGps ? 'READY' : 'PENDING',
  }
}

export function assignDraftClient(draft: DeliveryDraftDocument, client: ClientLite | null): DeliveryDraftDocument {
  const hasExcelGps = validCoordinates(draft.excelLatitude, draft.excelLongitude)
  const masterLat = client?.latitude ?? null
  const masterLon = client?.longitude ?? null
  const hasMasterGps = validCoordinates(masterLat, masterLon)
  return {
    ...draft,
    clientId: client?.id ?? null,
    suggestedClientId: null,
    matchStatus: client ? 'MATCHED' : 'EXTERNAL',
    masterLatitude: masterLat,
    masterLongitude: masterLon,
    plannedLatitude: hasExcelGps ? draft.excelLatitude : hasMasterGps ? masterLat : null,
    plannedLongitude: hasExcelGps ? draft.excelLongitude : hasMasterGps ? masterLon : null,
    geoSource: hasExcelGps ? 'EXCEL_GPS' : hasMasterGps ? 'CLIENT_MASTER_GPS' : 'NO_GPS',
    geoStatus: hasExcelGps || hasMasterGps ? 'READY' : 'PENDING',
  }
}

export async function parseDeliveryExcel(file: File, clients: ClientLite[]): Promise<DeliveryDraftDocument[]> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await file.arrayBuffer())
  const sheet = workbook.worksheets[0]
  if (!sheet) throw new Error('El archivo Excel no contiene hojas.')
  let headerRowNumber = 0
  let mapping: Record<number, string> = {}
  const scanLimit = Math.min(sheet.rowCount, 15)
  for (let rowNumber = 1; rowNumber <= scanLimit; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const candidate: Record<number, string> = {}
    row.eachCell({ includeEmpty: false }, (cell, column) => {
      const alias = HEADER_ALIASES[normalizeHeader(cellValue(cell.value))]
      if (alias) candidate[column] = alias
    })
    const fields = new Set(Object.values(candidate))
    if (fields.has('clientName') && (fields.has('invoiceNumber') || fields.has('orderNumber'))) {
      headerRowNumber = rowNumber
      mapping = candidate
      break
    }
  }
  if (!headerRowNumber) throw new Error('No pude identificar encabezados. Incluye Cliente y al menos Factura o Pedido.')

  const drafts: DeliveryDraftDocument[] = []
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber)
    const raw: Record<string, unknown> = {}
    Object.entries(mapping).forEach(([column, field]) => { raw[field] = cellValue(row.getCell(Number(column)).value) })
    const clientName = String(raw.clientName ?? '').trim()
    const invoiceNumber = String(raw.invoiceNumber ?? '').trim()
    const orderNumber = String(raw.orderNumber ?? '').trim()
    if (!clientName && !invoiceNumber && !orderNumber) continue
    if (!clientName) throw new Error(`Fila ${rowNumber}: falta el nombre del cliente.`)
    if (!invoiceNumber && !orderNumber) throw new Error(`Fila ${rowNumber}: debe tener Factura o Pedido.`)
    const lat = parseCoordinate(raw.latitude)
    const lon = parseCoordinate(raw.longitude)
    const base = {
      tempId: `excel-${rowNumber}-${crypto.randomUUID()}`,
      sourceType: 'EXCEL' as const,
      sourceRow: rowNumber,
      companyCode: String(raw.companyCode ?? '').trim(),
      invoiceNumber,
      orderNumber,
      externalClientCode: String(raw.externalClientCode ?? '').trim(),
      clientName,
      amount: parseNumber(raw.amount),
      packages: Math.max(0, parseNumber(raw.packages)),
      excelLatitude: validCoordinates(lat, lon) ? lat : null,
      excelLongitude: validCoordinates(lat, lon) ? lon : null,
      phone: String(raw.phone ?? '').trim(),
      notes: String(raw.notes ?? '').trim(),
    }
    drafts.push(resolveDraftClient(base, clients))
  }
  if (!drafts.length) throw new Error('El Excel no contiene documentos válidos debajo de los encabezados.')
  return drafts
}

export function summarizeDrafts(drafts: DeliveryDraftDocument[]): ImportSummary {
  return {
    total: drafts.length,
    matched: drafts.filter(row => row.matchStatus === 'MATCHED').length,
    suggested: drafts.filter(row => row.matchStatus === 'SUGGESTED').length,
    external: drafts.filter(row => row.matchStatus === 'EXTERNAL').length,
    gpsReady: drafts.filter(row => row.geoStatus === 'READY').length,
    gpsPending: drafts.filter(row => row.geoStatus !== 'READY').length,
    totalAmount: drafts.reduce((sum, row) => sum + (row.amount || 0), 0),
    totalPackages: drafts.reduce((sum, row) => sum + (row.packages || 0), 0),
  }
}

export function stopGroupingKey(row: DeliveryDraftDocument) {
  const identity = row.clientId ? `client:${row.clientId}` : `external:${normalizeText(row.clientName)}`
  const location = validCoordinates(row.plannedLatitude, row.plannedLongitude)
    ? `${row.plannedLatitude!.toFixed(5)},${row.plannedLongitude!.toFixed(5)}`
    : 'NO_GPS'
  return `${identity}|${location}`
}

export function currency(value: number | null | undefined) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 2 }).format(Number(value || 0))
}

export function localDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' })
}

export function tripCodeNow() {
  const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'America/Santo_Domingo', hour12: false }).replace(/[-: ]/g, '').slice(0, 14)
  return `ENT-${stamp}-${Math.floor(100 + Math.random() * 900)}`
}
