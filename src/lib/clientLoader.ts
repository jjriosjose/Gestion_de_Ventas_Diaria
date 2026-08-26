import { supabase } from './supabase'
import type { Client } from '../types'

const PAGE_SIZE = 1000
const CACHE_TTL_MS = 60_000

type ClientCacheEntry = { loadedAt: number; value: Client[] }
const clientCache = new Map<string, ClientCacheEntry>()
const clientPromises = new Map<string, Promise<Client[]>>()

const cacheKey = (selectColumns: string, vendorEmployeeId?: string | null) => `${vendorEmployeeId || '*'}::${selectColumns}`

export async function loadClientsPaged(selectColumns: string, vendorEmployeeId?: string | null, forceRefresh = false): Promise<Client[]> {
  const key = cacheKey(selectColumns, vendorEmployeeId)
  const cached = clientCache.get(key)
  const now = Date.now()
  if (!forceRefresh && cached && now - cached.loadedAt < CACHE_TTL_MS) return cached.value
  if (!forceRefresh && clientPromises.has(key)) return clientPromises.get(key)!

  const request = (async () => {
    const rows: Client[] = []

    for (let from = 0; ; from += PAGE_SIZE) {
      let query = supabase
        .from('clients')
        .select(selectColumns)
        .order('legal_name')
        .range(from, from + PAGE_SIZE - 1)

      if (vendorEmployeeId) query = query.eq('vendor_employee_id', vendorEmployeeId)

      const { data, error } = await query
      if (error) throw new Error(`No fue posible cargar la cartera completa: ${error.message}`)

      const page = (data || []) as unknown as Client[]
      rows.push(...page)
      if (page.length < PAGE_SIZE) break
    }

    clientCache.set(key, { loadedAt: Date.now(), value: rows })
    return rows
  })()

  clientPromises.set(key, request)
  try {
    return await request
  } finally {
    if (clientPromises.get(key) === request) clientPromises.delete(key)
  }
}

export function clearClientMemoryCache() {
  clientCache.clear()
  clientPromises.clear()
}
