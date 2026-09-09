import type { SupabaseClient } from '@supabase/supabase-js'
import type { DeliveryDraftDocument } from './logistics'

export type DeliveryRetryDecisionKind = 'NEW' | 'RETRY' | 'BLOCKED'

export type DeliveryRetryDecision = {
  kind: DeliveryRetryDecisionKind
  retryOfDocumentId: string | null
  attemptNumber: number
  pendingPackages: number | null
  previousStatus: string | null
  expectedAmount: number | null
  message: string
}

export type DeliveryRetryDecisionMap = Record<string, DeliveryRetryDecision>

type HistoryDocument = {
  id: string
  trip_id: string
  company_code: string | null
  invoice_number: string | null
  order_number: string | null
  status: string
  packages_loaded: number | string | null
  packages_delivered: number | string | null
  packages_pending: number | string | null
  amount: number | string | null
  attempt_number: number | null
  created_at: string | null
}

const TERMINAL_TRIPS = new Set(['COMPLETED', 'CANCELLED'])
const RETRYABLE_DOCUMENTS = new Set(['PARTIAL', 'NOT_DELIVERED', 'RESCHEDULED', 'CANCELLED'])

const key = (value: unknown) => String(value ?? '').trim().toLocaleUpperCase('es')

function sameCompany(a: unknown, b: unknown) {
  const left = key(a)
  const right = key(b)
  return !left || !right || left === right
}

function sameReference(row: Pick<DeliveryDraftDocument, 'invoiceNumber' | 'orderNumber'>, doc: HistoryDocument) {
  const invoice = key(row.invoiceNumber)
  const order = key(row.orderNumber)
  return Boolean(
    (invoice && key(doc.invoice_number) === invoice)
    || (order && key(doc.order_number) === order),
  )
}

function sameDraftReference(a: DeliveryDraftDocument, b: DeliveryDraftDocument) {
  if (!sameCompany(a.companyCode, b.companyCode)) return false
  const invoiceA = key(a.invoiceNumber)
  const invoiceB = key(b.invoiceNumber)
  const orderA = key(a.orderNumber)
  const orderB = key(b.orderNumber)
  return Boolean((invoiceA && invoiceB && invoiceA === invoiceB) || (orderA && orderB && orderA === orderB))
}

function blocked(message: string): DeliveryRetryDecision {
  return {
    kind: 'BLOCKED', retryOfDocumentId: null, attemptNumber: 1, pendingPackages: null,
    previousStatus: null, expectedAmount: null, message,
  }
}

function fresh(): DeliveryRetryDecision {
  return {
    kind: 'NEW', retryOfDocumentId: null, attemptNumber: 1, pendingPackages: null,
    previousStatus: null, expectedAmount: null, message: 'Documento nuevo',
  }
}

export async function classifyDeliveryDraftRetries(
  supabase: SupabaseClient,
  drafts: DeliveryDraftDocument[],
): Promise<DeliveryRetryDecisionMap> {
  if (!drafts.length) return {}

  const invoices = Array.from(new Set(drafts.map(row => row.invoiceNumber.trim()).filter(Boolean)))
  const orders = Array.from(new Set(drafts.map(row => row.orderNumber.trim()).filter(Boolean)))
  const historyById = new Map<string, HistoryDocument>()
  const select = 'id,trip_id,company_code,invoice_number,order_number,status,packages_loaded,packages_delivered,packages_pending,amount,attempt_number,created_at'

  if (invoices.length) {
    const { data, error } = await supabase.from('delivery_documents').select(select).in('invoice_number', invoices)
    if (error) throw error
    ;((data || []) as unknown as HistoryDocument[]).forEach(doc => historyById.set(doc.id, doc))
  }
  if (orders.length) {
    const { data, error } = await supabase.from('delivery_documents').select(select).in('order_number', orders)
    if (error) throw error
    ;((data || []) as unknown as HistoryDocument[]).forEach(doc => historyById.set(doc.id, doc))
  }

  const history = Array.from(historyById.values())
  const tripIds = Array.from(new Set(history.map(doc => doc.trip_id).filter(Boolean)))
  const tripStatus = new Map<string, string>()
  if (tripIds.length) {
    const { data, error } = await supabase.from('delivery_trips').select('id,status').in('id', tripIds)
    if (error) throw error
    ;(data || []).forEach(row => tripStatus.set(String(row.id), String(row.status || '')))
  }

  const result: DeliveryRetryDecisionMap = {}

  drafts.forEach((row, index) => {
    const repeatedInPreview = drafts.some((other, otherIndex) => otherIndex !== index && sameDraftReference(row, other))
    if (repeatedInPreview) {
      result[row.tempId] = blocked('Documento repetido dentro de esta misma carga.')
      return
    }

    const matches = history.filter(doc => sameCompany(row.companyCode, doc.company_code) && sameReference(row, doc))
    if (!matches.length) {
      result[row.tempId] = fresh()
      return
    }

    const active = matches.find(doc => !TERMINAL_TRIPS.has(tripStatus.get(doc.trip_id) || ''))
    if (active) {
      result[row.tempId] = blocked('Ya pertenece a un viaje activo y no puede reintentarse todavía.')
      return
    }

    const delivered = matches.find(doc => TERMINAL_TRIPS.has(tripStatus.get(doc.trip_id) || '') && doc.status === 'DELIVERED')
    if (delivered) {
      result[row.tempId] = blocked('Ya fue entregado y no admite nuevos intentos.')
      return
    }

    const eligible = matches
      .filter(doc => TERMINAL_TRIPS.has(tripStatus.get(doc.trip_id) || '') && RETRYABLE_DOCUMENTS.has(doc.status))
      .sort((a, b) => {
        const attempts = Number(b.attempt_number || 1) - Number(a.attempt_number || 1)
        if (attempts) return attempts
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      })

    const prior = eligible[0]
    if (!prior) {
      result[row.tempId] = blocked('Existe historial para este documento, pero su estado no permite un nuevo intento.')
      return
    }

    const pending = Math.max(0, Number(prior.packages_pending ?? (Number(prior.packages_loaded || 0) - Number(prior.packages_delivered || 0))))
    const expectedAmount = Number(prior.amount || 0)
    const nextAttempt = Number(prior.attempt_number || 1) + 1

    if (pending <= 0) {
      result[row.tempId] = blocked('El intento anterior no conserva bultos pendientes.')
      return
    }

    if (Number(row.packages) !== pending) {
      result[row.tempId] = blocked(`Reintento #${nextAttempt}: debe cargar exactamente ${pending} bulto(s) pendientes.`)
      return
    }

    if (Number(row.amount) !== expectedAmount) {
      result[row.tempId] = blocked(`Reintento #${nextAttempt}: el monto debe conservarse en ${expectedAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`)
      return
    }

    result[row.tempId] = {
      kind: 'RETRY',
      retryOfDocumentId: prior.id,
      attemptNumber: nextAttempt,
      pendingPackages: pending,
      previousStatus: prior.status,
      expectedAmount,
      message: `Reintento permitido · intento #${nextAttempt} · ${pending} bulto(s) pendientes`,
    }
  })

  return result
}
