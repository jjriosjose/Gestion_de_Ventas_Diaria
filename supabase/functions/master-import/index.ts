import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: corsHeaders }) }
const text = (v: unknown) => { if (v === null || v === undefined) return null; const s = String(v).trim(); return s ? s : null }
const intVal = (v: unknown) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? Math.trunc(n) : null }
const numVal = (v: unknown) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null }
function excelDate(v: unknown): string | null { if (v === null || v === undefined || v === '') return null; if (typeof v === 'number' && Number.isFinite(v) && v > 0) { const epoch = Date.UTC(1899, 11, 30); return new Date(epoch + v * 86400000).toISOString().slice(0, 10) } const s = String(v).trim(); if (!s) return null; const iso = /^\d{4}-\d{2}-\d{2}/.exec(s); if (iso) return iso[0]; const dmY = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(s); if (dmY) { const [, d, m, y] = dmY; return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` } return null }
function coordinates(lonRaw: unknown, latRaw: unknown) { const longitude = numVal(lonRaw); const latitude = numVal(latRaw); if (longitude === null || latitude === null) return { longitude: null, latitude: null, valid: false }; if (longitude === 0 && latitude === 0) return { longitude: null, latitude: null, valid: false }; const valid = longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90; return valid ? { longitude, latitude, valid: true } : { longitude: null, latitude: null, valid: false } }
function normalizeKey(v: string | null) { return (v ?? '').trim().toUpperCase().replace(/\s+/g, ' ') }
function stableStringify(obj: unknown) { const sortObject = (value: any): any => { if (Array.isArray(value)) return value.map(sortObject); if (value && typeof value === 'object') return Object.keys(value).sort().reduce((acc: Record<string, unknown>, key) => { acc[key] = sortObject(value[key]); return acc }, {}); return value }; return JSON.stringify(sortObject(obj)) }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)
  try {
    const authorization = req.headers.get('Authorization') || ''
    const token = authorization.replace(/^Bearer\s+/i, '')
    if (!token) return json({ error: 'Sesión requerida' }, 401)
    const url = Deno.env.get('SUPABASE_URL')!
    const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
    const secretKey = secretKeys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!secretKey) return json({ error: 'Configuración de servidor incompleta' }, 500)
    const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData.user) return json({ error: 'Sesión inválida' }, 401)
    const { data: actor, error: actorError } = await admin.from('employees').select('id,app_role,active').eq('auth_user_id', authData.user.id).maybeSingle()
    if (actorError || !actor?.active || !['Administrador', 'Supervisor'].includes(actor.app_role)) return json({ error: 'No autorizado para importar maestros' }, 403)
    const body = await req.json()
    const mode = body?.mode === 'apply' ? 'apply' : 'preview'
    const rows = Array.isArray(body?.rows) ? body.rows : []
    const sourceName = text(body?.source_name) || 'maestro.xlsx'
    const sourceHash = text(body?.source_hash)
    if (!rows.length) return json({ error: 'No se recibieron registros' }, 400)
    if (rows.length > 5000) return json({ error: 'El archivo excede el máximo permitido por importación' }, 400)
    const { data: companies, error: companyError } = await admin.from('companies').select('id,code')
    if (companyError) throw companyError
    const companyMap = new Map((companies || []).map((c: any) => [normalizeKey(c.code), c.id]))
    const { data: employees, error: empError } = await admin.from('employees').select('id,full_name,employee_type,active').eq('active', true)
    if (empError) throw empError
    const vendorAliases = new Map<string, string>(); const managerAliases = new Map<string, string>()
    for (const e of employees || []) { const full = normalizeKey(e.full_name); const first = full.split(' ')[0]; if (e.employee_type === 'Vendedor') { vendorAliases.set(full, e.id); if (first) vendorAliases.set(first, e.id) } if (e.employee_type === 'Gestor') { managerAliases.set(full, e.id); if (first) managerAliases.set(first, e.id) } }
    const errors: Array<{ row: number; code?: string | null; message: string }> = []; const normalized: any[] = []
    rows.forEach((raw: Record<string, unknown>, index: number) => {
      const rowNo = index + 2; const companyCode = text(raw['Empresa']); const companyId = companyMap.get(normalizeKey(companyCode)) || null; const codempr = text(raw['codempr']); const legalName = text(raw['RazonSocial']) || text(raw['Nombre']); const geo = coordinates(raw['longitud'], raw['latitud']); const vCartera = text(raw['V-CARTERA']); const gCartera = text(raw['G-CARTERA']); const vendorBase = normalizeKey(vCartera).split('-')[0].trim(); const managerBase = normalizeKey(gCartera).split('-')[0].trim()
      if (!codempr) errors.push({ row: rowNo, code: null, message: 'codempr vacío' }); if (!legalName) errors.push({ row: rowNo, code: codempr, message: 'Razón social vacía' }); if (!companyId) errors.push({ row: rowNo, code: codempr, message: `Empresa no reconocida: ${companyCode ?? '(vacía)'}` }); if (!codempr || !legalName || !companyId) return
      normalized.push({company_id: companyId, company_code: companyCode, map_code: text(raw['Cod Map']), source_id: intVal(raw['id']), codempr, cod_empresa: text(raw['cod empresa']), v_cartera: vCartera, g_cartera: gCartera, vendor_employee_id: vendorAliases.get(vendorBase) || null, manager_employee_id: managerAliases.get(managerBase) || null, region: text(raw['REGION']), province: text(raw['PROVINCIA']), municipality: text(raw['MUNICIPIO']), client_type: text(raw['Tipo']), legal_name: legalName, contact_name: text(raw['Contacto']), address1: text(raw['Direccion1']), display_name: text(raw['Nombre']), sector_id: text(raw['sector_id']), phone1: text(raw['Telefono1']), phone2: text(raw['Telefono2']), mobile: text(raw['Celular']), email: text(raw['Email']), entry_date: excelDate(raw['fecha_ingreso']), entry_year: intVal(raw['Year Ingreso']), type_id: text(raw['tipo_id']), category_id: text(raw['categoria_id']), account_type_id: text(raw['tipo_cuenta_id']), zone_id: text(raw['zona_id']), vendor_source_id: text(raw['vendedor_id']), collector_source_id: text(raw['cobrador_id']), municipality_source_id: text(raw['municipo_id']), manager_service_source_id: text(raw['gestor_servicio_id']), longitude: geo.longitude, latitude: geo.latitude, npg_code: text(raw['codigo_npg']), active_status: text(raw['Activo']), segment_id: text(raw['segmento_id']), last_receipt_date: excelDate(raw['fecha_ultimo_recibo']), last_receipt_amount: numVal(raw['monto_ultimo_recibo']), identification_type: text(raw['tipo_identificacion']), identification: text(raw['identificacion']), last_invoice_date: excelDate(raw['fecha_ultima_factura']), last_invoice_year: intVal(raw['Year Ult Fact']), last_invoice_amount: numVal(raw['monto_ultima_factura']), payment_type: text(raw['TipoPago']), municipality_code: text(raw['Id Mun']), sector_code: text(raw['Id Sector']), client_type_code: text(raw['Id Tipo Cli']), credit_days: intVal(raw['Dias Credito']), source_data: raw, data_quality: { has_valid_georef: geo.valid, import_source: sourceName, import_sheet: 'cartera', initial_master: true }})
    })
    const { data: existingRows, error: existingError } = await admin.from('clients').select('codempr,source_data'); if (existingError) throw existingError
    const existingMap = new Map<string, any>((existingRows || []).map((r: any) => [r.codempr, r])); let inserted = 0, updated = 0, unchanged = 0; const newRows:any[]=[]; const changedRows:any[]=[]
    for (const item of normalized) { const current = existingMap.get(item.codempr); if (!current) { inserted++; newRows.push({ ...item, created_by: authData.user.id, updated_by: authData.user.id }) } else if (stableStringify(current.source_data || {}) === stableStringify(item.source_data || {})) unchanged++; else { updated++; changedRows.push({ ...item, updated_by: authData.user.id }) } }
    const summary = { total_rows: rows.length, valid_rows: normalized.length, inserted_rows: inserted, updated_rows: updated, unchanged_rows: unchanged, error_rows: errors.length, georeferenced_rows: normalized.filter((r) => r.data_quality?.has_valid_georef).length, errors: errors.slice(0, 100) }
    if (mode === 'preview') return json({ mode, summary })
    if (errors.length) return json({ error: 'La importación contiene errores. Corrígelos antes de aplicar.', summary }, 422)
    const batchSize = 200
    for (let i = 0; i < newRows.length; i += batchSize) { const { error } = await admin.from('clients').insert(newRows.slice(i, i + batchSize)); if (error) throw error }
    for (let i = 0; i < changedRows.length; i += batchSize) { const { error } = await admin.from('clients').upsert(changedRows.slice(i, i + batchSize), { onConflict: 'codempr' }); if (error) throw error }
    await admin.from('import_batches').insert({ source_name: sourceName, source_hash: sourceHash, import_type: 'CARTERA', imported_by: authData.user.id, total_rows: rows.length, inserted_rows: inserted, updated_rows: updated, unchanged_rows: unchanged, error_rows: 0, summary })
    return json({ mode, applied: true, summary })
  } catch (error) { console.error('master-import failed', error instanceof Error ? error.message : 'unknown'); return json({ error: 'No fue posible procesar el maestro' }, 500) }
})
