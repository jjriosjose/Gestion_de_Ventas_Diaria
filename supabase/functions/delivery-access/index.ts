import { createClient } from 'npm:@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://gestion-de-ventas-diaria.jjriosjose.workers.dev',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])

function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') || ''
  return {
    'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://gestion-de-ventas-diaria.jjriosjose.workers.dev',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  }
}

const encoder = new TextEncoder()
const hex = (bytes: Uint8Array) => Array.from(bytes).map(value => value.toString(16).padStart(2, '0')).join('')
async function sha256(value: string) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))) }
const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders(req) })

function serviceKey() {
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
  return secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}

function dataUrlBytes(dataUrl?: string | null) {
  if (!dataUrl) return null
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  const binary = atob(match[2])
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return { mime: match[1], bytes }
}

function extensionFor(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function validCoordinate(lat: unknown, lon: unknown) {
  const latitude = Number(lat); const longitude = Number(lon)
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
}

async function resolveAccess(admin: any, token: string, pin: string) {
  if (!token || token.length < 30) return { error: 'Enlace inválido', status: 401 } as const
  const tokenHash = await sha256(token)
  const { data: link, error } = await admin.from('delivery_access_links').select('*').eq('token_hash', tokenHash).maybeSingle()
  if (error || !link) return { error: 'Enlace inválido o revocado', status: 401 } as const
  if (link.status !== 'ACTIVE') return { error: 'Este acceso ya no está activo', status: 401 } as const
  if (new Date(link.expires_at).getTime() < Date.now()) {
    await admin.from('delivery_access_links').update({ status: 'EXPIRED' }).eq('id', link.id)
    return { error: 'Este acceso ha expirado', status: 401 } as const
  }
  if (link.pin_hash) {
    if (!pin) return { error: 'PIN requerido', status: 401, needsPin: true } as const
    const pinHash = await sha256(`${token}:${pin}`)
    if (pinHash !== link.pin_hash) return { error: 'PIN incorrecto', status: 401, needsPin: true } as const
  }
  const now = new Date().toISOString()
  await admin.from('delivery_access_links').update({ first_used_at: link.first_used_at || now, last_used_at: now }).eq('id', link.id)
  return { link, tokenHash } as const
}

async function tripPayload(admin: any, tripId: string) {
  const [{ data: trip, error: tripError }, { data: stops, error: stopError }, { data: documents, error: docError }, { data: incidents, error: incidentError }] = await Promise.all([
    admin.from('delivery_trips').select('id,trip_code,trip_date,title,origin_name,driver_id,vehicle_id,driver_name_snapshot,driver_phone_snapshot,vehicle_plate_snapshot,vehicle_type_snapshot,ownership_type_snapshot,carrier_name_snapshot,status,route_revision,total_documents,total_stops,total_amount,total_packages,started_at,departed_at,returned_at,completed_at,notes').eq('id', tripId).single(),
    admin.from('delivery_stops').select('id,trip_id,client_id,stop_order,destination_name_snapshot,destination_phone_snapshot,destination_address_snapshot,planned_latitude,planned_longitude,actual_delivery_latitude,actual_delivery_longitude,geo_source,geo_status,status,packages_loaded,packages_delivered,packages_returned,amount_loaded,amount_delivered,arrived_at,unload_started_at,unload_finished_at,delivered_at,departed_at,control_tower_updated_at,driver_acknowledged_at,notes').eq('trip_id', tripId).order('stop_order'),
    admin.from('delivery_documents').select('id,trip_id,stop_id,company_code,invoice_number,order_number,external_client_code,client_name_snapshot,amount,packages_loaded,packages_delivered,packages_returned,status,notes').eq('trip_id', tripId).order('created_at'),
    admin.from('delivery_incidents').select('id,trip_id,stop_id,incident_type,severity,description,status,stopped_trip,reported_at,resolved_at,resolution_notes').eq('trip_id', tripId).order('reported_at', { ascending: false }),
  ])
  if (tripError || stopError || docError || incidentError || !trip) throw new Error('No fue posible cargar el viaje')
  return { trip, stops: stops || [], documents: documents || [], incidents: incidents || [] }
}

async function insertEvent(admin: any, link: any, eventType: string, stopId: string | null, body: any) {
  const coords = validCoordinate(body.latitude, body.longitude)
  const { error } = await admin.from('delivery_events').insert({
    trip_id: link.trip_id, stop_id: stopId, event_type: eventType,
    latitude: coords ? Number(body.latitude) : null, longitude: coords ? Number(body.longitude) : null,
    accuracy_m: Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null,
    source: 'TEMP_LINK', payload: body.payload || {}, actor_driver_id: link.driver_id || null,
  })
  if (error) throw error
}

async function uploadEvidence(admin: any, tripId: string, stopId: string, kind: 'signature' | 'photo', dataUrl?: string | null) {
  const parsed = dataUrlBytes(dataUrl)
  if (!parsed) return null
  if (parsed.bytes.byteLength > 2_500_000) throw new Error(`${kind === 'photo' ? 'La fotografía' : 'La firma'} es demasiado grande`)
  const path = `${tripId}/${stopId}/${Date.now()}-${crypto.randomUUID()}.${extensionFor(parsed.mime)}`
  const { error } = await admin.storage.from('delivery-evidence').upload(path, parsed.bytes, { contentType: parsed.mime, upsert: false })
  if (error) throw error
  return { path, mime: parsed.mime }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return json(req, { error: 'Método no permitido' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const secret = serviceKey()
    if (!secret) return json(req, { error: 'Configuración incompleta' }, 500)
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } })
    const body = await req.json()
    const action = String(body.action || 'refresh')
    const token = String(body.token || '')
    const pin = String(body.pin || '')
    const access = await resolveAccess(admin, token, pin)
    if ('error' in access) return json(req, { error: access.error, needs_pin: 'needsPin' in access ? access.needsPin : false }, access.status)
    const link = access.link

    if (action === 'refresh' || action === 'validate') {
      return json(req, await tripPayload(admin, link.trip_id))
    }

    if (action === 'trip_event') {
      const eventType = String(body.event_type || '')
      const allowed = new Set(['TRIP_STARTED','DEPARTED_ORIGIN','RETURNED_ORIGIN','TRIP_COMPLETED','ROUTE_UPDATE_ACK'])
      if (!allowed.has(eventType)) return json(req, { error: 'Evento no permitido' }, 400)
      const { data: trip } = await admin.from('delivery_trips').select('id,status,route_revision').eq('id', link.trip_id).single()
      if (!trip) return json(req, { error: 'Viaje no encontrado' }, 404)
      const now = new Date().toISOString()
      if (eventType === 'TRIP_STARTED') await admin.from('delivery_trips').update({ status: 'IN_ROUTE', started_at: trip.status === 'READY' ? now : undefined }).eq('id', trip.id)
      if (eventType === 'DEPARTED_ORIGIN') await admin.from('delivery_trips').update({ status: 'IN_ROUTE', departed_at: now, started_at: trip.status === 'READY' ? now : undefined }).eq('id', trip.id)
      if (eventType === 'RETURNED_ORIGIN') await admin.from('delivery_trips').update({ status: 'RETURNING', returned_at: now }).eq('id', trip.id)
      if (eventType === 'TRIP_COMPLETED') {
        const { data: pending } = await admin.from('delivery_stops').select('id').eq('trip_id', trip.id).not('status', 'in', '(DELIVERED,PARTIAL,NOT_DELIVERED,RESCHEDULED,CANCELLED)').limit(1)
        if (pending?.length) return json(req, { error: 'Aún existen paradas pendientes de resultado' }, 409)
        await admin.from('delivery_trips').update({ status: 'COMPLETED', completed_at: now }).eq('id', trip.id)
        await admin.from('delivery_access_links').update({ status: 'USED' }).eq('id', link.id)
      }
      if (eventType === 'ROUTE_UPDATE_ACK') {
        await admin.from('delivery_stops').update({ driver_acknowledged_at: now }).eq('trip_id', trip.id).is('driver_acknowledged_at', null)
      }
      await insertEvent(admin, link, eventType, null, body)
      return json(req, await tripPayload(admin, link.trip_id))
    }

    if (action === 'stop_event') {
      const stopId = String(body.stop_id || '')
      const eventType = String(body.event_type || '')
      const { data: stop } = await admin.from('delivery_stops').select('*').eq('id', stopId).eq('trip_id', link.trip_id).single()
      if (!stop) return json(req, { error: 'Parada no encontrada' }, 404)
      const now = new Date().toISOString()
      const coords = validCoordinate(body.latitude, body.longitude)
      const locationPatch = coords ? { actual_delivery_latitude: Number(body.latitude), actual_delivery_longitude: Number(body.longitude) } : {}
      if (eventType === 'ARRIVED') {
        const patch: Record<string, unknown> = { status: 'AT_CLIENT', arrived_at: now, ...locationPatch }
        if (coords && stop.geo_status === 'PENDING') Object.assign(patch, { geo_status: 'CAPTURED_AT_DELIVERY', geo_source: 'DRIVER_ARRIVAL_GPS' })
        await admin.from('delivery_stops').update(patch).eq('id', stopId)
      } else if (eventType === 'UNLOAD_STARTED') {
        await admin.from('delivery_stops').update({ status: 'UNLOADING', unload_started_at: now, ...locationPatch }).eq('id', stopId)
      } else if (eventType === 'UNLOAD_FINISHED') {
        await admin.from('delivery_stops').update({ status: 'AT_CLIENT', unload_finished_at: now, ...locationPatch }).eq('id', stopId)
      } else if (eventType === 'LEFT_STOP') {
        await admin.from('delivery_stops').update({ departed_at: now, ...locationPatch }).eq('id', stopId)
      } else return json(req, { error: 'Evento de parada no permitido' }, 400)
      await insertEvent(admin, link, eventType, stopId, body)
      return json(req, await tripPayload(admin, link.trip_id))
    }

    if (action === 'incident') {
      const incidentType = String(body.incident_type || '').trim()
      if (!incidentType) return json(req, { error: 'Selecciona el tipo de incidencia' }, 400)
      const severity = ['INFO','DELAY','CRITICAL'].includes(String(body.severity)) ? String(body.severity) : 'DELAY'
      const coords = validCoordinate(body.latitude, body.longitude)
      const { error } = await admin.from('delivery_incidents').insert({
        trip_id: link.trip_id, stop_id: body.stop_id || null, incident_type: incidentType, severity,
        description: String(body.description || '').trim() || null, latitude: coords ? Number(body.latitude) : null,
        longitude: coords ? Number(body.longitude) : null, stopped_trip: body.stopped_trip === true, reported_by_driver_id: link.driver_id || null,
      })
      if (error) throw error
      if (body.stopped_trip === true || severity === 'CRITICAL') await admin.from('delivery_trips').update({ status: 'WITH_INCIDENT' }).eq('id', link.trip_id)
      await insertEvent(admin, link, 'INCIDENT_REPORTED', body.stop_id || null, body)
      return json(req, await tripPayload(admin, link.trip_id))
    }

    if (action === 'delivery_result') {
      const stopId = String(body.stop_id || '')
      const result = String(body.result || 'DELIVERED')
      const { data: stop } = await admin.from('delivery_stops').select('*').eq('id', stopId).eq('trip_id', link.trip_id).single()
      if (!stop) return json(req, { error: 'Parada no encontrada' }, 404)
      const { data: docs } = await admin.from('delivery_documents').select('*').eq('stop_id', stopId).eq('trip_id', link.trip_id)
      const now = new Date().toISOString()
      const coords = validCoordinate(body.latitude, body.longitude)
      if (result === 'NOT_DELIVERED' || result === 'RESCHEDULED') {
        await admin.from('delivery_stops').update({ status: result, delivered_at: now, ...coords ? { actual_delivery_latitude: Number(body.latitude), actual_delivery_longitude: Number(body.longitude) } : {}, notes: String(body.notes || '').trim() || stop.notes }).eq('id', stopId)
        await admin.from('delivery_documents').update({ status: result }).eq('stop_id', stopId)
        await admin.from('delivery_incidents').insert({ trip_id: link.trip_id, stop_id: stopId, incident_type: result === 'RESCHEDULED' ? 'ENTREGA_REPROGRAMADA' : 'ENTREGA_NO_REALIZADA', severity: 'DELAY', description: String(body.notes || '').trim() || null, latitude: coords ? Number(body.latitude) : null, longitude: coords ? Number(body.longitude) : null, reported_by_driver_id: link.driver_id || null })
        await insertEvent(admin, link, result, stopId, body)
        return json(req, await tripPayload(admin, link.trip_id))
      }

      const deliveredById = new Map<string, number>((Array.isArray(body.documents) ? body.documents : []).map((item: any) => [String(item.id), Math.max(0, Number(item.packages_delivered) || 0)]))
      let totalDelivered = 0
      for (const doc of docs || []) {
        const delivered = Math.min(Number(doc.packages_loaded || 0), deliveredById.has(doc.id) ? deliveredById.get(doc.id)! : Number(doc.packages_loaded || 0))
        totalDelivered += delivered
        const status = delivered >= Number(doc.packages_loaded || 0) ? 'DELIVERED' : delivered > 0 ? 'PARTIAL' : 'NOT_DELIVERED'
        await admin.from('delivery_documents').update({ packages_delivered: delivered, packages_returned: Math.max(0, Number(doc.packages_loaded || 0) - delivered), status }).eq('id', doc.id)
      }
      const loaded = Number(stop.packages_loaded || 0)
      const stopStatus = totalDelivered >= loaded ? 'DELIVERED' : totalDelivered > 0 ? 'PARTIAL' : 'NOT_DELIVERED'
      const signature = await uploadEvidence(admin, link.trip_id, stopId, 'signature', body.signature_data_url)
      const photo = await uploadEvidence(admin, link.trip_id, stopId, 'photo', body.photo_data_url)
      const quality = signature && photo && coords && String(body.receiver_name || '').trim() ? 'COMPLETE' : 'PARTIAL'
      const { data: proof, error: proofError } = await admin.from('delivery_proofs').insert({
        trip_id: link.trip_id, stop_id: stopId, receiver_name: String(body.receiver_name || '').trim() || null,
        receiver_document: String(body.receiver_document || '').trim() || null, receiver_phone: String(body.receiver_phone || '').trim() || null,
        signature_object_path: signature?.path || null, latitude: coords ? Number(body.latitude) : null, longitude: coords ? Number(body.longitude) : null,
        proof_quality: quality, notes: String(body.notes || '').trim() || null, captured_by_driver_id: link.driver_id || null,
      }).select('id').single()
      if (proofError) throw proofError
      const proofDocuments = (docs || []).filter(doc => (deliveredById.has(doc.id) ? deliveredById.get(doc.id)! : Number(doc.packages_loaded || 0)) > 0).map(doc => ({ proof_id: proof.id, document_id: doc.id }))
      if (proofDocuments.length) await admin.from('delivery_proof_documents').insert(proofDocuments)
      if (photo) await admin.from('delivery_evidence').insert({ trip_id: link.trip_id, stop_id: stopId, proof_id: proof.id, evidence_type: 'DELIVERY_PHOTO', object_path: photo.path, mime_type: photo.mime, latitude: coords ? Number(body.latitude) : null, longitude: coords ? Number(body.longitude) : null })
      await admin.from('delivery_stops').update({
        status: stopStatus, packages_delivered: totalDelivered, packages_returned: Math.max(0, loaded - totalDelivered),
        amount_delivered: stopStatus === 'DELIVERED' ? Number(stop.amount_loaded || 0) : 0,
        delivered_at: now, ...coords ? { actual_delivery_latitude: Number(body.latitude), actual_delivery_longitude: Number(body.longitude), geo_status: stop.geo_status === 'PENDING' ? 'CAPTURED_AT_DELIVERY' : stop.geo_status, geo_source: stop.geo_status === 'PENDING' ? 'DRIVER_DELIVERY_GPS' : stop.geo_source } : {},
      }).eq('id', stopId)
      await insertEvent(admin, link, stopStatus === 'DELIVERED' ? 'DELIVERY_CONFIRMED' : 'DELIVERY_PARTIAL', stopId, { ...body, signature_data_url: undefined, photo_data_url: undefined, payload: { proof_id: proof.id, proof_quality: quality, packages_delivered: totalDelivered } })
      return json(req, await tripPayload(admin, link.trip_id))
    }

    return json(req, { error: 'Acción no soportada' }, 400)
  } catch (error) {
    console.error(error)
    return json(req, { error: error instanceof Error ? error.message : 'No fue posible procesar la operación' }, 500)
  }
})
