export type Employee = {
  id: string
  auth_user_id?: string | null
  full_name: string
  username: string
  job_title?: string | null
  app_role: 'Administrador' | 'Supervisor' | 'Usuario' | 'SoloLectura'
  employee_type: 'Gerencia' | 'Direccion' | 'Gestor' | 'Vendedor' | 'Otro'
  phone_display?: string | null
  phone_e164?: string | null
  active?: boolean
  theme_preferences?: Record<string, unknown>
}

export type Client = {
  id: string
  company_code?: string | null
  codempr: string
  cod_empresa?: string | null
  v_cartera?: string | null
  g_cartera?: string | null
  region?: string | null
  province?: string | null
  municipality?: string | null
  client_type?: string | null
  legal_name: string
  contact_name?: string | null
  address1?: string | null
  display_name?: string | null
  phone1?: string | null
  phone2?: string | null
  mobile?: string | null
  email?: string | null
  longitude?: number | null
  latitude?: number | null
  active_status?: string | null
  last_invoice_date?: string | null
  last_invoice_amount?: number | null
  credit_days?: number | null
  geo_status?: 'SIN_GEO' | 'SIN_VERIFICAR' | 'VERIFICADA' | 'POSIBLE_ERROR'
  geo_verified_at?: string | null
}


export type DailyEmployee = {
  day: string
  employee_id: string
  full_name: string
  username: string
  job_title?: string
  employee_type: string
  planned_clients: number
  visited_clients: number
  received_clients: number
  purchase_clients: number
  calls: number
  appointments: number
  showroom_attended: number
  prospects_captured: number
  qualified_prospects: number
  routes_started: number
  routes_completed: number
  route_compliance_pct: number
  reception_pct: number
  purchase_conversion_pct: number
}
