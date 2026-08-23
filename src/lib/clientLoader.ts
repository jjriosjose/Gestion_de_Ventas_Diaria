import { supabase } from './supabase'
import type { Client } from '../types'

const PAGE_SIZE = 1000

export async function loadClientsPaged(selectColumns: string, vendorEmployeeId?: string | null): Promise<Client[]> {
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

    const page = (data || []) as Client[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return rows
}
