import { useEffect, useMemo, useRef, useState } from 'react'
import ExcelJS from 'exceljs'
import {
  AlertTriangle, BadgeDollarSign, Building2, CheckCircle2, ClipboardCheck, Clock3, Copy, Download, FileSpreadsheet, FileText,
  Link2, LoaderCircle, MapPin, MapPinned, PackageCheck, Plus, RefreshCw, Route as RouteIcon, Save, Search, Truck,
  Upload, UserRound, UsersRound, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { hasPermission } from '../lib/access'
import { loadClientsPaged } from '../lib/clientLoader'
import { DeliveryControlMap } from '../components/DeliveryControlMap'
import {
  assignDraftClient, currency, localDate, parseCoordinate, parseDeliveryExcel, parseNumber, resolveDraftClient, stopGroupingKey,
  summarizeDrafts, tripCodeNow, validCoordinates,
  type ClientLite, type DeliveryDocument, type DeliveryDraftDocument, type DeliveryDriver, type DeliveryProvider,
  type DeliveryStop, type DeliveryTab, type DeliveryTrip, type DeliveryVehicle, type DriverType, type OwnershipType,
} from '../lib/logistics'
import { classifyDeliveryDraftRetries, type DeliveryRetryDecisionMap } from '../lib/logisticsRetry'
import type { Employee } from '../types'
import '../styles/logistics.css'

const CLIENT_COLUMNS = 'id,codempr,cod_empresa,company_code,legal_name,display_name,phone1,mobile,latitude,longitude,address1'

type Notice = { kind: 'success' | 'warning' | 'error'; text: string } | null

type ManualDraftForm = {
  companyCode: string; invoiceNumber: string; orderNumber: string; externalClientCode: string; clientName: string
  amount: string; packages: string; latitude: string; longitude: string; phone: string; notes: string
}

const EMPTY_MANUAL: ManualDraftForm = {
  companyCode: '', invoiceNumber: '', orderNumber: '', externalClientCode: '', clientName: '', amount: '', packages: '',
  latitude: '', longitude: '', phone: '', notes: '',
}

const VEHICLE_TYPES = ['CAMION', 'FURGONETA', 'CAMIONETA', 'GANDOLA', 'CABEZAL', 'CONTENEDOR', 'MOTOCICLETA', 'OTRO']
const DRIVER_TYPES: Array<{ value: DriverType; label: string }> = [
  { value: 'INTERNAL', label: 'Interno' }, { value: 'CONTRACTOR', label: 'Contratado' }, { value: 'THIRD_PARTY', label: 'Tercero' },
]
const OWNERSHIP_TYPES: Array<{ value: OwnershipType; label: string }> = [
  { value: 'OWNED', label: 'Propio' }, { value: 'RENTED', label: 'Alquilado' }, { value: 'THIRD_PARTY', label: 'Tercero' },
]

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Borrador', PREPARING: 'Preparando', LOADED: 'Cargado', READY: 'Listo para salir', IN_ROUTE: 'En ruta',
    WITH_INCIDENT: 'Con incidencia', RETURNING: 'Retornando', COMPLETED: 'Finalizado', CANCELLED: 'Cancelado',
    PENDING: 'Pendiente', EN_ROUTE: 'En camino', AT_CLIENT: 'En cliente', WAITING_UNLOAD: 'Esperando descarga',
    UNLOADING: 'Descargando', DELIVERED: 'Entregada', PARTIAL: 'Parcial', NOT_DELIVERED: 'No entregada', RESCHEDULED: 'Reprogramada',
  }
  return labels[status] || status
}

function geoSourceLabel(source: string) {
  const labels: Record<string, string> = {
    EXCEL_GPS: 'Excel', CLIENT_MASTER_GPS: 'Maestro cliente', CONTROL_TOWER_GPS: 'Torre de control', MANUAL_GPS: 'Manual',
    DRIVER_ARRIVAL_GPS: 'Chofer · llegada', DRIVER_DELIVERY_GPS: 'Chofer · entrega', NO_GPS: 'Pendiente',
  }
  return labels[source] || source
}

function friendlyExcelError(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  const businessMessages = [
    'El archivo Excel no contiene hojas.',
    'No pude identificar encabezados.',
    'El Excel no contiene documentos válidos',
  ]
  if (businessMessages.some(prefix => message.startsWith(prefix)) || /^Fila \d+:/.test(message)) return message
  return 'No fue posible leer este archivo Excel. Utiliza la plantilla oficial “entregas.xlsx” o guarda el archivo como Libro de Excel (.xlsx) desde Microsoft Excel.'
}

export function Logistics() {
  const { employee } = useAuth()
  const canManage = hasPermission(employee, 'logistics.manage')
  const canTrack = hasPermission(employee, 'logistics.tracking')
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [tab, setTab] = useState<DeliveryTab>('DISPATCH')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [clients, setClients] = useState<ClientLite[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [providers, setProviders] = useState<DeliveryProvider[]>([])
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([])
  const [vehicles, setVehicles] = useState<DeliveryVehicle[]>([])
  const [trips, setTrips] = useState<DeliveryTrip[]>([])
  const [stops, setStops] = useState<DeliveryStop[]>([])
  const [documents, setDocuments] = useState<DeliveryDocument[]>([])
  const [drafts, setDrafts] = useState<DeliveryDraftDocument[]>([])
  const [retryDecisions, setRetryDecisions] = useState<DeliveryRetryDecisionMap>({})
  const [fileName, setFileName] = useState('')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState<ManualDraftForm>(EMPTY_MANUAL)
  const [geoEditStop, setGeoEditStop] = useState<DeliveryStop | null>(null)
  const [geoLat, setGeoLat] = useState('')
  const [geoLon, setGeoLon] = useState('')
  const [tripDate, setTripDate] = useState(localDate())
  const [tripTitle, setTripTitle] = useState('')
  const [tripDriver, setTripDriver] = useState('')
  const [tripVehicle, setTripVehicle] = useState('')
  const [tripProvider, setTripProvider] = useState('')
  const [tripNotes, setTripNotes] = useState('')
  const [providerForm, setProviderForm] = useState({ name: '', taxId: '', contactName: '', phone: '', email: '', notes: '' })
  const [driverForm, setDriverForm] = useState({ fullName: '', documentId: '', phone: '', licenseNumber: '', driverType: 'INTERNAL' as DriverType, providerId: '', employeeId: '', notes: '' })
  const [vehicleForm, setVehicleForm] = useState({ plate: '', vehicleType: 'CAMION', brand: '', model: '', ownershipType: 'OWNED' as OwnershipType, providerId: '', capacityPackages: '', notes: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [clientRows, employeeRes, providerRes, driverRes, vehicleRes, tripRes] = await Promise.all([
        loadClientsPaged(CLIENT_COLUMNS),
        supabase.from('employees').select('id,full_name,username,job_title,app_role,employee_type,access_profile,permission_overrides,active').eq('active', true).order('full_name'),
        supabase.from('delivery_transport_providers').select('*').order('name'),
        supabase.from('delivery_drivers').select('*').order('full_name'),
        supabase.from('delivery_vehicles').select('*').order('plate'),
        supabase.from('delivery_trips').select('*').order('trip_date', { ascending: false }).order('created_at', { ascending: false }).limit(120),
      ])
      for (const response of [employeeRes, providerRes, driverRes, vehicleRes, tripRes]) if (response.error) throw response.error
      const loadedTrips = (tripRes.data || []) as DeliveryTrip[]
      setClients(clientRows as ClientLite[])
      setEmployees((employeeRes.data || []) as Employee[])
      setProviders((providerRes.data || []) as DeliveryProvider[])
      setDrivers((driverRes.data || []) as DeliveryDriver[])
      setVehicles((vehicleRes.data || []) as DeliveryVehicle[])
      setTrips(loadedTrips)
      const tripIds = loadedTrips.map(trip => trip.id)
      if (tripIds.length) {
        const [stopRes, docRes] = await Promise.all([
          supabase.from('delivery_stops').select('*').in('trip_id', tripIds).order('stop_order'),
          supabase.from('delivery_documents').select('*').in('trip_id', tripIds).order('created_at'),
        ])
        if (stopRes.error) throw stopRes.error
        if (docRes.error) throw docRes.error
        setStops((stopRes.data || []) as DeliveryStop[])
        setDocuments((docRes.data || []) as DeliveryDocument[])
      } else {
        setStops([]); setDocuments([])
      }
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No fue posible cargar Logística.' })
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const clientMap = useMemo(() => new Map(clients.map(client => [client.id, client])), [clients])
  const driverMap = useMemo(() => new Map(drivers.map(driver => [driver.id, driver])), [drivers])
  const vehicleMap = useMemo(() => new Map(vehicles.map(vehicle => [vehicle.id, vehicle])), [vehicles])
  const summary = useMemo(() => summarizeDrafts(drafts), [drafts])
  const allowedRetries = useMemo(() => Object.values(retryDecisions).filter(item => item.kind === 'RETRY').length, [retryDecisions])
  const blockedRetries = useMemo(() => Object.values(retryDecisions).filter(item => item.kind === 'BLOCKED').length, [retryDecisions])
  const activeTrips = useMemo(() => trips.filter(trip => !['COMPLETED', 'CANCELLED'].includes(trip.status)), [trips])
  const deliveredStops = useMemo(() => stops.filter(stop => stop.status === 'DELIVERED').length, [stops])
  const pendingGeo = useMemo(() => stops.filter(stop => stop.geo_status === 'PENDING' && !['DELIVERED', 'CANCELLED'].includes(stop.status)), [stops])
  const selectedTrip = trips.find(trip => trip.id === selectedTripId) || null
  const selectedStops = useMemo(() => selectedTrip ? stops.filter(stop => stop.trip_id === selectedTrip.id).sort((a, b) => a.stop_order - b.stop_order) : [], [selectedTrip, stops])
  const selectedDocs = useMemo(() => selectedTrip ? documents.filter(doc => doc.trip_id === selectedTrip.id) : [], [selectedTrip, documents])

  const chooseTab = (next: DeliveryTab) => { setTab(next); setNotice(null) }

  const downloadTemplate = async () => {
    if (!canManage) return
    setSaving(true); setNotice(null)
    try {
      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'Gestión de Ventas Diaria'
      workbook.created = new Date()

      const sheet = workbook.addWorksheet('Entregas', { views: [{ state: 'frozen', ySplit: 1 }] })
      sheet.columns = [
        { header: 'Empresa', key: 'empresa', width: 16 },
        { header: 'Factura', key: 'factura', width: 18 },
        { header: 'Pedido', key: 'pedido', width: 18 },
        { header: 'Codigo Cliente', key: 'codigoCliente', width: 20 },
        { header: 'Cliente', key: 'cliente', width: 34 },
        { header: 'Monto', key: 'monto', width: 16 },
        { header: 'Bultos', key: 'bultos', width: 12 },
        { header: 'Latitud', key: 'latitud', width: 15 },
        { header: 'Longitud', key: 'longitud', width: 15 },
        { header: 'Telefono', key: 'telefono', width: 18 },
        { header: 'Observaciones', key: 'observaciones', width: 44 },
      ]
      const header = sheet.getRow(1)
      header.height = 24
      header.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17233A' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
      })
      sheet.autoFilter = { from: 'A1', to: 'K1' }
      sheet.getColumn(6).numFmt = '#,##0.00'
      sheet.getColumn(7).numFmt = '0'
      sheet.getColumn(8).numFmt = '0.000000'
      sheet.getColumn(9).numFmt = '0.000000'

      const guide = workbook.addWorksheet('Instrucciones')
      guide.columns = [{ width: 28 }, { width: 82 }]
      guide.addRows([
        ['Campo', 'Uso'],
        ['Empresa', 'Código o nombre de la empresa. Opcional si tu operación no lo requiere.'],
        ['Factura', 'Número de factura. Debe existir Factura o Pedido.'],
        ['Pedido', 'Número de pedido. Debe existir Factura o Pedido.'],
        ['Codigo Cliente', 'Código del cliente en el maestro. Ayuda a asociarlo automáticamente.'],
        ['Cliente', 'Nombre del cliente o destino. Obligatorio.'],
        ['Monto', 'Monto total del documento.'],
        ['Bultos', 'Cantidad de bultos/cajas cargados para ese documento.'],
        ['Latitud / Longitud', 'Opcionales. Si están vacías y el cliente existe en el maestro, la app usa el GPS del maestro. Si tampoco existe GPS maestro, queda Ubicación pendiente.'],
        ['Telefono', 'Teléfono de contacto del destino. Opcional.'],
        ['Observaciones', 'Notas operativas del documento. Opcional.'],
        ['Varias facturas del mismo cliente', 'Coloca una fila por factura/pedido. La app las agrupa en una sola parada cuando pertenecen al mismo cliente y ubicación.'],
      ])
      guide.getRow(1).eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17233A' } }
      })
      guide.eachRow(row => { row.alignment = { vertical: 'top', wrapText: true } })

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([new Uint8Array(buffer as unknown as ArrayBuffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'entregas.xlsx'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setNotice({ kind: 'success', text: 'Plantilla oficial “entregas.xlsx” descargada.' })
    } catch {
      setNotice({ kind: 'error', text: 'No fue posible generar la plantilla de entregas.' })
    } finally { setSaving(false) }
  }

  const handleExcel = async (file?: File) => {
    if (!file) return
    setSaving(true); setNotice(null)
    try {
      const parsed = await parseDeliveryExcel(file, clients)
      const decisions = await classifyDeliveryDraftRetries(supabase, parsed)
      setDrafts(parsed); setRetryDecisions(decisions); setFileName(file.name)
      const data = summarizeDrafts(parsed)
      const retryCount = Object.values(decisions).filter(item => item.kind === 'RETRY').length
      const blockedCount = Object.values(decisions).filter(item => item.kind === 'BLOCKED').length
      setNotice({
        kind: blockedCount ? 'warning' : 'success',
        text: `${data.total} documentos cargados. ${retryCount} reintento(s) permitido(s). ${blockedCount ? `${blockedCount} bloqueado(s): revisa la vista previa.` : `${data.gpsPending} requieren ubicación y no bloquean el despacho.`}`,
      })
    } catch (error) {
      setDrafts([]); setRetryDecisions({}); setFileName('')
      setNotice({ kind: 'error', text: friendlyExcelError(error) })
    } finally { setSaving(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const addManualDraft = async () => {
    if (!manual.clientName.trim()) return setNotice({ kind: 'warning', text: 'Indica el nombre del cliente o destino.' })
    if (!manual.invoiceNumber.trim() && !manual.orderNumber.trim()) return setNotice({ kind: 'warning', text: 'Indica Factura o Pedido.' })
    const lat = parseCoordinate(manual.latitude); const lon = parseCoordinate(manual.longitude)
    if ((manual.latitude.trim() || manual.longitude.trim()) && !validCoordinates(lat, lon)) {
      setNotice({ kind: 'warning', text: 'Latitud/Longitud están incompletas o fuera de rango. Puedes dejarlas ambas vacías.' }); return
    }
    const base = {
      tempId: `manual-${crypto.randomUUID()}`, sourceType: 'MANUAL' as const,
      companyCode: manual.companyCode.trim(), invoiceNumber: manual.invoiceNumber.trim(), orderNumber: manual.orderNumber.trim(),
      externalClientCode: manual.externalClientCode.trim(), clientName: manual.clientName.trim(), amount: Math.max(0, parseNumber(manual.amount)),
      packages: Math.max(0, parseNumber(manual.packages)), excelLatitude: lat, excelLongitude: lon, phone: manual.phone.trim(), notes: manual.notes.trim(),
    }
    setSaving(true); setNotice(null)
    try {
      const nextDraft = resolveDraftClient(base, clients)
      const nextDrafts = [...drafts, nextDraft]
      const decisions = await classifyDeliveryDraftRetries(supabase, nextDrafts)
      setDrafts(nextDrafts); setRetryDecisions(decisions)
      setManual(EMPTY_MANUAL); setManualOpen(false)
      const decision = decisions[nextDraft.tempId]
      setNotice({
        kind: decision?.kind === 'BLOCKED' ? 'warning' : 'success',
        text: decision?.kind === 'RETRY' ? decision.message : decision?.kind === 'BLOCKED' ? decision.message : 'Documento agregado manualmente al despacho.',
      })
    } catch (error) {
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No fue posible validar el documento.' })
    } finally { setSaving(false) }
  }

  const applySuggested = (row: DeliveryDraftDocument) => {
    const client = row.suggestedClientId ? clientMap.get(row.suggestedClientId) || null : null
    setDrafts(current => current.map(item => item.tempId === row.tempId ? assignDraftClient(item, client) : item))
  }
  const keepExternal = (row: DeliveryDraftDocument) => setDrafts(current => current.map(item => item.tempId === row.tempId ? assignDraftClient(item, null) : item))
  const removeDraft = async (tempId: string) => {
    const nextDrafts = drafts.filter(item => item.tempId !== tempId)
    setDrafts(nextDrafts)
    try { setRetryDecisions(await classifyDeliveryDraftRetries(supabase, nextDrafts)) }
    catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No fue posible revalidar la carga.' }) }
  }
  const clearDraft = () => { setDrafts([]); setRetryDecisions({}); setFileName(''); setNotice(null) }

  const createTrip = async () => {
    if (!canManage) return
    if (!drafts.length) return setNotice({ kind: 'warning', text: 'Carga primero documentos por Excel o manualmente.' })
    if (!tripDriver) return setNotice({ kind: 'warning', text: 'Selecciona el chofer.' })
    if (!tripVehicle) return setNotice({ kind: 'warning', text: 'Selecciona el vehículo.' })
    if (drafts.some(row => row.matchStatus === 'SUGGESTED')) return setNotice({ kind: 'warning', text: 'Confirma o descarta las posibles coincidencias de clientes antes de crear el viaje.' })
    setSaving(true); setNotice(null)
    let tripId = ''; let batchId = ''
    try {
      const retryCheck = await classifyDeliveryDraftRetries(supabase, drafts)
      setRetryDecisions(retryCheck)
      const blocked = Object.values(retryCheck).filter(item => item.kind === 'BLOCKED')
      if (blocked.length) throw new Error(`${blocked.length} documento(s) están bloqueados. Corrige la carga antes de crear el viaje.`)
      const selectedDriver = driverMap.get(tripDriver)!
      const selectedVehicle = vehicleMap.get(tripVehicle)!
      const selectedProvider = providers.find(provider => provider.id === (tripProvider || selectedDriver.provider_id || selectedVehicle.provider_id)) || null
      const { data: batch, error: batchError } = await supabase.from('delivery_import_batches').insert({
        file_name: fileName || null, source_type: fileName ? 'EXCEL' : 'MANUAL', status: 'PREVIEW', total_rows: summary.total,
        matched_rows: summary.matched, suggested_rows: summary.suggested, external_rows: summary.external, gps_ready_rows: summary.gpsReady,
        gps_pending_rows: summary.gpsPending, total_amount: summary.totalAmount, total_packages: summary.totalPackages, created_by: employee?.id || null,
      }).select('id').single()
      if (batchError) throw batchError
      batchId = batch.id
      const tripCode = tripCodeNow()
      const { data: trip, error: tripError } = await supabase.from('delivery_trips').insert({
        trip_code: tripCode, trip_date: tripDate, title: tripTitle.trim() || null, driver_id: selectedDriver.id, vehicle_id: selectedVehicle.id,
        provider_id: selectedProvider?.id || null, driver_name_snapshot: selectedDriver.full_name, driver_phone_snapshot: selectedDriver.phone || null,
        vehicle_plate_snapshot: selectedVehicle.plate, vehicle_type_snapshot: selectedVehicle.vehicle_type, ownership_type_snapshot: selectedVehicle.ownership_type,
        carrier_name_snapshot: selectedProvider?.name || selectedDriver.carrier_name_snapshot || selectedVehicle.carrier_name_snapshot || null,
        status: 'READY', total_documents: summary.total, total_stops: 0, total_amount: summary.totalAmount, total_packages: summary.totalPackages,
        notes: tripNotes.trim() || null, created_by: employee?.id || null,
      }).select('*').single()
      if (tripError) throw tripError
      tripId = trip.id
      const grouped = new Map<string, DeliveryDraftDocument[]>()
      drafts.forEach(row => { const key = stopGroupingKey(row); grouped.set(key, [...(grouped.get(key) || []), row]) })
      const groups = Array.from(grouped.values())
      const stopRows = groups.map((rows, index) => {
        const first = rows[0]
        const client = first.clientId ? clientMap.get(first.clientId) : null
        return {
          trip_id: tripId, client_id: first.clientId, stop_order: index + 1, destination_name_snapshot: first.clientName,
          destination_phone_snapshot: first.phone || client?.phone1 || client?.mobile || null, destination_address_snapshot: client?.address1 || null,
          planned_latitude: first.plannedLatitude, planned_longitude: first.plannedLongitude, master_latitude_snapshot: first.masterLatitude,
          master_longitude_snapshot: first.masterLongitude, geo_source: first.geoSource, geo_status: first.geoStatus, status: 'PENDING',
          packages_loaded: rows.reduce((sum, row) => sum + row.packages, 0), amount_loaded: rows.reduce((sum, row) => sum + row.amount, 0),
          notes: rows.map(row => row.notes).filter(Boolean).join(' · ') || null,
        }
      })
      const { data: insertedStops, error: stopError } = await supabase.from('delivery_stops').insert(stopRows).select('id,stop_order')
      if (stopError) throw stopError
      const stopIdByOrder = new Map((insertedStops || []).map(row => [row.stop_order, row.id]))
      const docRows = groups.flatMap((rows, groupIndex) => rows.map(row => ({
        trip_id: tripId, stop_id: stopIdByOrder.get(groupIndex + 1)!, import_batch_id: batchId, company_code: row.companyCode || null,
        invoice_number: row.invoiceNumber || null, order_number: row.orderNumber || null, external_client_code: row.externalClientCode || null,
        client_id: row.clientId, client_name_snapshot: row.clientName, amount: row.amount, packages_loaded: row.packages, status: 'LOADED',
        retry_of_document_id: retryCheck[row.tempId]?.kind === 'RETRY' ? retryCheck[row.tempId].retryOfDocumentId : null,
        attempt_number: retryCheck[row.tempId]?.kind === 'RETRY' ? retryCheck[row.tempId].attemptNumber : 1,
        source_type: row.sourceType, source_row: row.sourceRow || null, notes: row.notes || null,
      })))
      const { error: docError } = await supabase.from('delivery_documents').insert(docRows)
      if (docError) throw docError
      const { error: tripUpdateError } = await supabase.from('delivery_trips').update({ total_stops: groups.length }).eq('id', tripId)
      if (tripUpdateError) throw tripUpdateError
      const { error: batchApplyError } = await supabase.from('delivery_import_batches').update({ status: 'APPLIED', applied_at: new Date().toISOString() }).eq('id', batchId)
      if (batchApplyError) throw batchApplyError
      clearDraft(); setTripTitle(''); setTripNotes(''); setTripProvider('')
      await load(); setSelectedTripId(tripId); setTab('TRIPS')
      setNotice({ kind: 'success', text: `Viaje ${tripCode} creado con ${summary.total} documentos y ${groups.length} paradas.` })
    } catch (error) {
      if (tripId) await supabase.from('delivery_trips').delete().eq('id', tripId)
      if (batchId) await supabase.from('delivery_import_batches').update({ status: 'FAILED', error_summary: [{ message: error instanceof Error ? error.message : 'Error desconocido' }] }).eq('id', batchId)
      setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No fue posible crear el viaje.' })
    } finally { setSaving(false) }
  }

  const saveProvider = async () => {
    if (!providerForm.name.trim()) return setNotice({ kind: 'warning', text: 'Indica el nombre del transportista.' })
    setSaving(true)
    const { error } = await supabase.from('delivery_transport_providers').insert({ name: providerForm.name.trim(), tax_id: providerForm.taxId.trim() || null, contact_name: providerForm.contactName.trim() || null, phone: providerForm.phone.trim() || null, email: providerForm.email.trim() || null, notes: providerForm.notes.trim() || null })
    setSaving(false)
    if (error) return setNotice({ kind: 'error', text: error.message })
    setProviderForm({ name: '', taxId: '', contactName: '', phone: '', email: '', notes: '' }); await load(); setNotice({ kind: 'success', text: 'Transportista registrado.' })
  }

  const saveDriver = async () => {
    if (!driverForm.fullName.trim()) return setNotice({ kind: 'warning', text: 'Indica el nombre del chofer.' })
    setSaving(true)
    const provider = providers.find(item => item.id === driverForm.providerId)
    const { error } = await supabase.from('delivery_drivers').insert({
      full_name: driverForm.fullName.trim(), document_id: driverForm.documentId.trim() || null, phone: driverForm.phone.trim() || null,
      license_number: driverForm.licenseNumber.trim() || null, driver_type: driverForm.driverType, provider_id: driverForm.providerId || null,
      employee_id: driverForm.employeeId || null, carrier_name_snapshot: provider?.name || null, notes: driverForm.notes.trim() || null,
    })
    setSaving(false)
    if (error) return setNotice({ kind: 'error', text: error.message })
    setDriverForm({ fullName: '', documentId: '', phone: '', licenseNumber: '', driverType: 'INTERNAL', providerId: '', employeeId: '', notes: '' }); await load(); setNotice({ kind: 'success', text: 'Chofer registrado.' })
  }

  const saveVehicle = async () => {
    if (!vehicleForm.plate.trim()) return setNotice({ kind: 'warning', text: 'Indica la placa del vehículo.' })
    setSaving(true)
    const provider = providers.find(item => item.id === vehicleForm.providerId)
    const { error } = await supabase.from('delivery_vehicles').insert({
      plate: vehicleForm.plate.trim().toUpperCase(), vehicle_type: vehicleForm.vehicleType, brand: vehicleForm.brand.trim() || null,
      model: vehicleForm.model.trim() || null, ownership_type: vehicleForm.ownershipType, provider_id: vehicleForm.providerId || null,
      carrier_name_snapshot: provider?.name || null, capacity_packages: vehicleForm.capacityPackages ? parseNumber(vehicleForm.capacityPackages) : null,
      notes: vehicleForm.notes.trim() || null,
    })
    setSaving(false)
    if (error) return setNotice({ kind: 'error', text: error.message })
    setVehicleForm({ plate: '', vehicleType: 'CAMION', brand: '', model: '', ownershipType: 'OWNED', providerId: '', capacityPackages: '', notes: '' }); await load(); setNotice({ kind: 'success', text: 'Vehículo registrado.' })
  }

  const openGeoEditor = (stop: DeliveryStop) => { setGeoEditStop(stop); setGeoLat(stop.planned_latitude?.toString() || ''); setGeoLon(stop.planned_longitude?.toString() || '') }
  const saveGeo = async () => {
    if (!geoEditStop) return
    const lat = parseCoordinate(geoLat); const lon = parseCoordinate(geoLon)
    if (!validCoordinates(lat, lon)) return setNotice({ kind: 'warning', text: 'Coordenadas inválidas.' })
    setSaving(true)
    try {
      const { error } = await supabase.from('delivery_stops').update({ planned_latitude: lat, planned_longitude: lon, geo_source: 'CONTROL_TOWER_GPS', geo_status: 'READY', control_tower_updated_at: new Date().toISOString() }).eq('id', geoEditStop.id)
      if (error) throw error
      const trip = trips.find(item => item.id === geoEditStop.trip_id)
      if (trip) {
        const { error: tripError } = await supabase.from('delivery_trips').update({ route_revision: (trip.route_revision || 1) + 1 }).eq('id', trip.id)
        if (tripError) throw tripError
      }
      setGeoEditStop(null); await load(); setNotice({ kind: 'success', text: 'Ubicación actualizada. La revisión de ruta aumentó para sincronizar al chofer.' })
    } catch (error) { setNotice({ kind: 'error', text: error instanceof Error ? error.message : 'No fue posible actualizar la ubicación.' }) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="page-stack"><div className="panel empty-state"><LoaderCircle className="spin"/><b>Cargando Logística…</b></div></div>

  return <div className="page-stack logistics-page">
    <div className="page-head">
      <div><span className="eyebrow">LOGÍSTICA · DELIVERY V1</span><h2>Despacho y entregas</h2><p>Facturas y pedidos, choferes, vehículos, rutas, ubicación pendiente y Torre de Control.</p></div>
      <div className="button-row"><button className="secondary" onClick={() => void load()}><RefreshCw size={17}/>Actualizar</button>{canManage && <button className="primary" onClick={() => { setTab('DISPATCH'); setManualOpen(true) }}><Plus size={17}/>Carga manual</button>}</div>
    </div>

    {notice && <div className={`logistics-notice ${notice.kind}`}><div>{notice.kind === 'success' ? <CheckCircle2/> : <AlertTriangle/>}<span>{notice.text}</span></div><button onClick={() => setNotice(null)}><X size={16}/></button></div>}

    <div className="kpi-grid logistics-kpis">
      <div className="kpi-card"><div className="kpi-icon"><Truck/></div><div><span>Viajes activos</span><strong>{activeTrips.length}</strong><small>{trips.length} registrados</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><MapPinned/></div><div><span>Ubicación pendiente</span><strong>{pendingGeo.length}</strong><small>Se puede resolver en ruta</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><PackageCheck/></div><div><span>Entregas completadas</span><strong>{deliveredStops}</strong><small>Paradas con POD operativo</small></div></div>
      <div className="kpi-card"><div className="kpi-icon"><UsersRound/></div><div><span>Recursos</span><strong>{drivers.filter(item => item.active).length}/{vehicles.filter(item => item.active).length}</strong><small>Choferes / vehículos activos</small></div></div>
    </div>

    <div className="logistics-tabs" role="tablist">
      <button className={tab === 'DISPATCH' ? 'active' : ''} onClick={() => chooseTab('DISPATCH')}><FileSpreadsheet/>Despacho</button>
      <button className={tab === 'TRIPS' ? 'active' : ''} onClick={() => chooseTab('TRIPS')}><RouteIcon/>Viajes</button>
      {canTrack && <button className={tab === 'CONTROL' ? 'active' : ''} onClick={() => chooseTab('CONTROL')}><MapPinned/>Torre de Control</button>}
      <button className={tab === 'VEHICLES' ? 'active' : ''} onClick={() => chooseTab('VEHICLES')}><Truck/>Vehículos</button>
      <button className={tab === 'DRIVERS' ? 'active' : ''} onClick={() => chooseTab('DRIVERS')}><UserRound/>Choferes</button>
      <button className={tab === 'PROVIDERS' ? 'active' : ''} onClick={() => chooseTab('PROVIDERS')}><Building2/>Transportistas</button>
    </div>

    {tab === 'DISPATCH' && <>
      <div className="logistics-dispatch-grid">
        <div className="panel">
          <div className="panel-head"><div><b>1. Cargar documentos</b><span>Excel es la vía principal. La carga manual queda disponible para excepciones.</span></div></div>
          <input ref={fileRef} type="file" accept=".xlsx,.xlsm" hidden onChange={event => void handleExcel(event.target.files?.[0])}/>
          <div className="logistics-upload-zone" onClick={() => canManage && fileRef.current?.click()}>
            {saving ? <LoaderCircle className="spin"/> : <Upload/>}<b>{fileName || 'Importar Excel de facturas / pedidos'}</b>
            <span>Cliente + Factura o Pedido. Latitud/Longitud son opcionales.</span>
            <small>Si no hay GPS, el documento se carga igualmente y queda Ubicación pendiente.</small>
          </div>
          <div className="button-row logistics-upload-actions"><button className="secondary" disabled={!canManage || saving} onClick={() => fileRef.current?.click()}><FileSpreadsheet size={16}/>Seleccionar Excel</button><button className="secondary" disabled={!canManage || saving} onClick={() => void downloadTemplate()}><Download size={16}/>Descargar plantilla</button><button className="secondary" disabled={!canManage} onClick={() => setManualOpen(true)}><Plus size={16}/>Agregar manual</button>{drafts.length > 0 && <button className="link-btn" onClick={clearDraft}>Limpiar carga</button>}</div>
        </div>
        <div className="panel">
          <div className="panel-head"><div><b>2. Preparar viaje</b><span>Asigna fecha, chofer y vehículo antes de publicar el despacho.</span></div></div>
          <div className="form-grid">
            <label>Fecha<input type="date" value={tripDate} onChange={event => setTripDate(event.target.value)}/></label>
            <label>Chofer<select value={tripDriver} onChange={event => setTripDriver(event.target.value)}><option value="">Seleccionar</option>{drivers.filter(item => item.active).map(driver => <option key={driver.id} value={driver.id}>{driver.full_name} · {DRIVER_TYPES.find(item => item.value === driver.driver_type)?.label}</option>)}</select></label>
            <label>Vehículo<select value={tripVehicle} onChange={event => setTripVehicle(event.target.value)}><option value="">Seleccionar</option>{vehicles.filter(item => item.active).map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.vehicle_type} · {OWNERSHIP_TYPES.find(item => item.value === vehicle.ownership_type)?.label}</option>)}</select></label>
            <label>Transportista opcional<select value={tripProvider} onChange={event => setTripProvider(event.target.value)}><option value="">Automático / ninguno</option>{providers.filter(item => item.active).map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
            <label className="span-2">Título / referencia<input value={tripTitle} onChange={event => setTripTitle(event.target.value)} placeholder="Ej. Despacho Santo Domingo AM"/></label>
            <label className="span-2">Observación<textarea value={tripNotes} onChange={event => setTripNotes(event.target.value)} placeholder="Notas operativas del viaje"/></label>
          </div>
          <button className="primary full" disabled={!canManage || saving || !drafts.length || blockedRetries > 0} onClick={() => void createTrip()}>{saving ? <LoaderCircle className="spin"/> : <ClipboardCheck/>}{blockedRetries ? `Resolver ${blockedRetries} documento(s) bloqueado(s)` : `Crear viaje con ${drafts.length || 0} documento(s)`}</button>
        </div>
      </div>

      {drafts.length > 0 && <div className="panel table-panel logistics-preview">
        <div className="logistics-preview-summary">
          <div><b>{summary.total}</b><span>Documentos</span></div><div><b>{summary.matched}</b><span>Asociados</span></div><div><b>{summary.suggested}</b><span>Posibles</span></div><div><b>{summary.external}</b><span>Externos</span></div><div className={allowedRetries ? 'warn' : ''}><b>{allowedRetries}</b><span>Reintentos</span></div><div className={blockedRetries ? 'warn' : ''}><b>{blockedRetries}</b><span>Bloqueados</span></div><div><b>{summary.gpsReady}</b><span>Con GPS</span></div><div className={summary.gpsPending ? 'warn' : ''}><b>{summary.gpsPending}</b><span>GPS pendiente</span></div><div><b>{summary.totalPackages}</b><span>Bultos</span></div><div><b>{currency(summary.totalAmount)}</b><span>Monto</span></div>
        </div>
        <div className="responsive-table"><table><thead><tr><th>#</th><th>Factura / Pedido</th><th>Cliente / asociación</th><th>Monto</th><th>Bultos</th><th>Ubicación</th><th>Acción</th></tr></thead><tbody>{drafts.map((row, index) => {
          const suggested = row.suggestedClientId ? clientMap.get(row.suggestedClientId) : null
          const matched = row.clientId ? clientMap.get(row.clientId) : null
          const retryDecision = retryDecisions[row.tempId] || null
          return <tr key={row.tempId}><td>{index + 1}</td><td><b>{row.invoiceNumber || 'Sin factura'}</b><small>{row.orderNumber ? `Pedido ${row.orderNumber}` : row.companyCode || '—'}</small>{retryDecision?.kind === 'RETRY' && <small className="text-warning">↻ {retryDecision.message}</small>}{retryDecision?.kind === 'BLOCKED' && <small className="text-warning">⚠ {retryDecision.message}</small>}</td><td><b>{row.clientName}</b>{row.matchStatus === 'MATCHED' ? <small className="text-success">✓ {matched?.legal_name || 'Cliente maestro'}</small> : row.matchStatus === 'SUGGESTED' ? <small className="text-warning">Posible: {suggested?.legal_name}</small> : <small>Destino externo · no crea cliente maestro</small>}</td><td>{currency(row.amount)}</td><td>{row.packages}{retryDecision?.kind === 'RETRY' && <small>Saldo pendiente completo</small>}</td><td>{row.geoStatus === 'READY' ? <span className="badge success"><MapPin size={12}/>{geoSourceLabel(row.geoSource)}</span> : <span className="badge logistics-pending"><AlertTriangle size={12}/>Pendiente</span>}</td><td><div className="row-actions">{row.matchStatus === 'SUGGESTED' && <><button className="success-btn compact" onClick={() => applySuggested(row)}>Usar sugerido</button><button className="secondary compact" onClick={() => keepExternal(row)}>Dejar externo</button></>}<button className="icon-btn compact-icon" title="Quitar" onClick={() => void removeDraft(row.tempId)}><X size={14}/></button></div></td></tr>
        })}</tbody></table></div>
      </div>}
    </>}

    {tab === 'TRIPS' && <div className="logistics-trip-layout">
      <div className="panel table-panel"><div className="table-meta"><span>{trips.length} viajes</span><span>Selecciona uno para ver detalle</span></div><div className="responsive-table"><table><thead><tr><th>Viaje</th><th>Fecha</th><th>Chofer</th><th>Vehículo</th><th>Paradas</th><th>Documentos</th><th>Monto</th><th>Estado</th></tr></thead><tbody>{trips.map(trip => <tr key={trip.id} className={selectedTripId === trip.id ? 'selected-row' : ''} onClick={() => setSelectedTripId(trip.id)}><td><b>{trip.trip_code}</b><small>{trip.title || 'Sin título'}</small></td><td>{trip.trip_date}</td><td>{trip.driver_name_snapshot || driverMap.get(trip.driver_id || '')?.full_name || '—'}</td><td><b>{trip.vehicle_plate_snapshot || vehicleMap.get(trip.vehicle_id || '')?.plate || '—'}</b><small>{trip.vehicle_type_snapshot}</small></td><td>{trip.total_stops}</td><td>{trip.total_documents}</td><td>{currency(trip.total_amount)}</td><td><span className={`badge trip-status ${trip.status.toLowerCase()}`}>{statusLabel(trip.status)}</span></td></tr>)}</tbody></table></div></div>
      {selectedTrip && <div className="panel logistics-trip-detail"><div className="panel-head"><div><b>{selectedTrip.trip_code}</b><span>Revisión de ruta {selectedTrip.route_revision} · {statusLabel(selectedTrip.status)}</span></div></div><div className="logistics-detail-stats"><span><b>{selectedTrip.total_documents}</b> documentos</span><span><b>{selectedTrip.total_stops}</b> paradas</span><span><b>{selectedTrip.total_packages}</b> bultos</span><span><b>{currency(selectedTrip.total_amount)}</b> cargado</span></div><div className="logistics-stop-list">{selectedStops.map(stop => <button key={stop.id} className="logistics-stop-card"><span className="stop-number">{String(stop.stop_order).padStart(2, '0')}</span><div><b>{stop.destination_name_snapshot}</b><small>{documents.filter(doc => doc.stop_id === stop.id).map(doc => doc.invoice_number || doc.order_number).filter(Boolean).join(' · ') || 'Sin referencia'}</small><em>{stop.geo_status === 'PENDING' ? 'Ubicación pendiente' : geoSourceLabel(stop.geo_source)} · {statusLabel(stop.status)}</em></div><strong>{stop.packages_loaded} bultos</strong></button>)}</div><div className="logistics-doc-count"><FileText size={16}/>{selectedDocs.length} documentos asociados al viaje</div></div>}
    </div>}

    {tab === 'CONTROL' && canTrack && <div className="logistics-control-grid">
      <div className="panel logistics-control-map"><div className="panel-head"><div><b>Mapa de entregas</b><span>Secuencia planificada; no representa recorrido vial exacto.</span></div><select value={selectedTripId || ''} onChange={event => setSelectedTripId(event.target.value || null)}><option value="">Todos los viajes visibles</option>{activeTrips.map(trip => <option key={trip.id} value={trip.id}>{trip.trip_code} · {trip.driver_name_snapshot}</option>)}</select></div><DeliveryControlMap trips={activeTrips} stops={stops} selectedTripId={selectedTripId}/></div>
      <div className="panel"><div className="panel-head"><div><b>Ubicaciones pendientes</b><span>Torre de Control puede completar GPS incluso después de iniciar la ruta.</span></div><span className="badge logistics-pending">{pendingGeo.length}</span></div>{pendingGeo.length ? <div className="logistics-pending-list">{pendingGeo.map(stop => { const trip = trips.find(item => item.id === stop.trip_id); return <div className="logistics-pending-card" key={stop.id}><div><b>{stop.destination_name_snapshot}</b><span>{trip?.trip_code} · Parada {stop.stop_order}</span><small>{trip?.driver_name_snapshot || 'Chofer pendiente'} · {statusLabel(trip?.status || '')}</small></div><button className="primary compact" onClick={() => openGeoEditor(stop)}><MapPin size={14}/>Asignar GPS</button></div> })}</div> : <div className="empty-state"><CheckCircle2/><b>Sin ubicaciones pendientes</b><p>Todos los destinos activos tienen coordenadas.</p></div>}</div>
    </div>}

    {tab === 'VEHICLES' && <div className="logistics-master-grid"><div className="panel"><div className="panel-head"><div><b>Registrar vehículo</b><span>Propio, alquilado o de tercero.</span></div></div><div className="form-grid"><label>Placa<input value={vehicleForm.plate} onChange={event => setVehicleForm(current => ({ ...current, plate: event.target.value }))}/></label><label>Tipo<select value={vehicleForm.vehicleType} onChange={event => setVehicleForm(current => ({ ...current, vehicleType: event.target.value }))}>{VEHICLE_TYPES.map(type => <option key={type}>{type}</option>)}</select></label><label>Modalidad<select value={vehicleForm.ownershipType} onChange={event => setVehicleForm(current => ({ ...current, ownershipType: event.target.value as OwnershipType }))}>{OWNERSHIP_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Transportista<select value={vehicleForm.providerId} onChange={event => setVehicleForm(current => ({ ...current, providerId: event.target.value }))}><option value="">Ninguno</option>{providers.filter(item => item.active).map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label>Marca<input value={vehicleForm.brand} onChange={event => setVehicleForm(current => ({ ...current, brand: event.target.value }))}/></label><label>Modelo<input value={vehicleForm.model} onChange={event => setVehicleForm(current => ({ ...current, model: event.target.value }))}/></label><label>Capacidad bultos<input inputMode="decimal" value={vehicleForm.capacityPackages} onChange={event => setVehicleForm(current => ({ ...current, capacityPackages: event.target.value }))}/></label><label className="span-2">Notas<textarea value={vehicleForm.notes} onChange={event => setVehicleForm(current => ({ ...current, notes: event.target.value }))}/></label></div><button className="primary full" disabled={!canManage || saving} onClick={() => void saveVehicle()}><Save size={16}/>Guardar vehículo</button></div><div className="panel table-panel"><div className="table-meta"><span>{vehicles.length} vehículos</span><span>Flota logística</span></div><div className="responsive-table"><table><thead><tr><th>Placa</th><th>Tipo</th><th>Modalidad</th><th>Transportista</th><th>Capacidad</th><th>Estado</th></tr></thead><tbody>{vehicles.map(vehicle => <tr key={vehicle.id}><td><b>{vehicle.plate}</b><small>{[vehicle.brand, vehicle.model].filter(Boolean).join(' ') || '—'}</small></td><td>{vehicle.vehicle_type}</td><td>{OWNERSHIP_TYPES.find(item => item.value === vehicle.ownership_type)?.label}</td><td>{providers.find(item => item.id === vehicle.provider_id)?.name || vehicle.carrier_name_snapshot || '—'}</td><td>{vehicle.capacity_packages || '—'}</td><td><span className={`badge ${vehicle.active ? 'success' : ''}`}>{vehicle.active ? 'Activo' : 'Inactivo'}</span></td></tr>)}</tbody></table></div></div></div>}

    {tab === 'DRIVERS' && <div className="logistics-master-grid"><div className="panel"><div className="panel-head"><div><b>Registrar chofer</b><span>El chofer contratado puede existir sin usuario de la aplicación.</span></div></div><div className="form-grid"><label>Nombre completo<input value={driverForm.fullName} onChange={event => setDriverForm(current => ({ ...current, fullName: event.target.value }))}/></label><label>Tipo<select value={driverForm.driverType} onChange={event => setDriverForm(current => ({ ...current, driverType: event.target.value as DriverType }))}>{DRIVER_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label>Documento<input value={driverForm.documentId} onChange={event => setDriverForm(current => ({ ...current, documentId: event.target.value }))}/></label><label>Teléfono<input value={driverForm.phone} onChange={event => setDriverForm(current => ({ ...current, phone: event.target.value }))}/></label><label>Licencia<input value={driverForm.licenseNumber} onChange={event => setDriverForm(current => ({ ...current, licenseNumber: event.target.value }))}/></label><label>Transportista<select value={driverForm.providerId} onChange={event => setDriverForm(current => ({ ...current, providerId: event.target.value }))}><option value="">Ninguno</option>{providers.filter(item => item.active).map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label><label className="span-2">Empleado vinculado opcional<select value={driverForm.employeeId} onChange={event => setDriverForm(current => ({ ...current, employeeId: event.target.value }))}><option value="">Sin usuario / acceso por link</option>{employees.map(item => <option key={item.id} value={item.id}>{item.full_name} · {item.employee_type}</option>)}</select></label><label className="span-2">Notas<textarea value={driverForm.notes} onChange={event => setDriverForm(current => ({ ...current, notes: event.target.value }))}/></label></div><button className="primary full" disabled={!canManage || saving} onClick={() => void saveDriver()}><Save size={16}/>Guardar chofer</button></div><div className="panel table-panel"><div className="table-meta"><span>{drivers.length} choferes</span><span>Internos y externos</span></div><div className="responsive-table"><table><thead><tr><th>Chofer</th><th>Tipo</th><th>Teléfono</th><th>Licencia</th><th>Transportista</th><th>Acceso</th></tr></thead><tbody>{drivers.map(driver => <tr key={driver.id}><td><b>{driver.full_name}</b><small>{driver.document_id || 'Sin documento'}</small></td><td>{DRIVER_TYPES.find(item => item.value === driver.driver_type)?.label}</td><td>{driver.phone || '—'}</td><td>{driver.license_number || '—'}</td><td>{providers.find(item => item.id === driver.provider_id)?.name || driver.carrier_name_snapshot || '—'}</td><td><span className={`badge ${driver.employee_id ? 'success' : ''}`}>{driver.employee_id ? 'Usuario vinculado' : 'Link temporal'}</span></td></tr>)}</tbody></table></div></div></div>}

    {tab === 'PROVIDERS' && <div className="logistics-master-grid"><div className="panel"><div className="panel-head"><div><b>Registrar transportista</b><span>Empresa externa para choferes y vehículos alquilados/terceros.</span></div></div><div className="form-grid"><label>Nombre<input value={providerForm.name} onChange={event => setProviderForm(current => ({ ...current, name: event.target.value }))}/></label><label>RNC / identificación<input value={providerForm.taxId} onChange={event => setProviderForm(current => ({ ...current, taxId: event.target.value }))}/></label><label>Contacto<input value={providerForm.contactName} onChange={event => setProviderForm(current => ({ ...current, contactName: event.target.value }))}/></label><label>Teléfono<input value={providerForm.phone} onChange={event => setProviderForm(current => ({ ...current, phone: event.target.value }))}/></label><label className="span-2">Email<input value={providerForm.email} onChange={event => setProviderForm(current => ({ ...current, email: event.target.value }))}/></label><label className="span-2">Notas<textarea value={providerForm.notes} onChange={event => setProviderForm(current => ({ ...current, notes: event.target.value }))}/></label></div><button className="primary full" disabled={!canManage || saving} onClick={() => void saveProvider()}><Save size={16}/>Guardar transportista</button></div><div className="panel table-panel"><div className="table-meta"><span>{providers.length} transportistas</span><span>Proveedores logísticos</span></div><div className="responsive-table"><table><thead><tr><th>Empresa</th><th>RNC</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Estado</th></tr></thead><tbody>{providers.map(provider => <tr key={provider.id}><td><b>{provider.name}</b></td><td>{provider.tax_id || '—'}</td><td>{provider.contact_name || '—'}</td><td>{provider.phone || '—'}</td><td>{provider.email || '—'}</td><td><span className={`badge ${provider.active ? 'success' : ''}`}>{provider.active ? 'Activo' : 'Inactivo'}</span></td></tr>)}</tbody></table></div></div></div>}

    {manualOpen && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setManualOpen(false)} aria-label="Cerrar"/><div className="modal large"><div className="modal-head"><div><h3>Carga manual</h3><p>El cliente puede estar o no en la base maestra. GPS es opcional.</p></div><button className="icon-btn" onClick={() => setManualOpen(false)}><X/></button></div><div className="form-grid"><label>Empresa<input value={manual.companyCode} onChange={event => setManual(current => ({ ...current, companyCode: event.target.value }))}/></label><label>Código cliente<input value={manual.externalClientCode} onChange={event => setManual(current => ({ ...current, externalClientCode: event.target.value }))}/></label><label>Factura<input value={manual.invoiceNumber} onChange={event => setManual(current => ({ ...current, invoiceNumber: event.target.value }))}/></label><label>Pedido<input value={manual.orderNumber} onChange={event => setManual(current => ({ ...current, orderNumber: event.target.value }))}/></label><label className="span-2">Cliente / destino<input value={manual.clientName} onChange={event => setManual(current => ({ ...current, clientName: event.target.value }))}/></label><label>Monto<input inputMode="decimal" value={manual.amount} onChange={event => setManual(current => ({ ...current, amount: event.target.value }))}/></label><label>Bultos / cajas<input inputMode="decimal" value={manual.packages} onChange={event => setManual(current => ({ ...current, packages: event.target.value }))}/></label><label>Latitud opcional<input inputMode="decimal" value={manual.latitude} onChange={event => setManual(current => ({ ...current, latitude: event.target.value }))}/></label><label>Longitud opcional<input inputMode="decimal" value={manual.longitude} onChange={event => setManual(current => ({ ...current, longitude: event.target.value }))}/></label><label className="span-2">Teléfono<input value={manual.phone} onChange={event => setManual(current => ({ ...current, phone: event.target.value }))}/></label><label className="span-2">Observación<textarea value={manual.notes} onChange={event => setManual(current => ({ ...current, notes: event.target.value }))}/></label></div><div className="modal-actions"><button className="secondary" onClick={() => setManualOpen(false)}>Cancelar</button><button className="primary" disabled={saving} onClick={() => void addManualDraft()}><Plus size={16}/>Agregar documento</button></div></div></div>}

    {geoEditStop && <div className="modal-wrap"><button className="modal-backdrop" onClick={() => setGeoEditStop(null)} aria-label="Cerrar"/><div className="modal"><div className="modal-head"><div><h3>Asignar ubicación</h3><p>{geoEditStop.destination_name_snapshot} · Parada {geoEditStop.stop_order}</p></div><button className="icon-btn" onClick={() => setGeoEditStop(null)}><X/></button></div><div className="form-grid"><label>Latitud<input inputMode="decimal" value={geoLat} onChange={event => setGeoLat(event.target.value)}/></label><label>Longitud<input inputMode="decimal" value={geoLon} onChange={event => setGeoLon(event.target.value)}/></label></div><div className="logistics-geo-note"><MapPin/><span>Puede guardarse aun con el viaje iniciado. La ruta incrementará su revisión para que el dispositivo del chofer detecte el cambio.</span></div><div className="modal-actions"><button className="secondary" onClick={() => setGeoEditStop(null)}>Cancelar</button><button className="primary" disabled={saving} onClick={() => void saveGeo()}>{saving ? <LoaderCircle className="spin"/> : <Save/>}Guardar ubicación</button></div></div></div>}
  </div>
}
