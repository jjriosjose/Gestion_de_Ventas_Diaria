import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Map, Plus, Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Client, Employee } from '../types'

export function Planning() {
  const { employee } = useAuth()
  const canOverridePortfolio = ['Administrador', 'Supervisor'].includes(employee?.app_role || '')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [territories, setTerritories] = useState<any[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [vendor, setVendor] = useState('')
  const [includeOutsidePortfolio, setIncludeOutsidePortfolio] = useState(false)
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' }))
  const [type, setType] = useState<'VISITA' | 'CAPTACION'>('VISITA')
  const [territory, setTerritory] = useState('')
  const [target, setTarget] = useState(12)
  const [busy, setBusy] = useState(false)
  const selectedVendor = employees.find((e) => e.id === vendor)

  useEffect(() => {
    void Promise.all([
      supabase.from('employees').select('*').eq('employee_type', 'Vendedor').eq('active', true).order('full_name'),
      supabase.from('territories').select('*').eq('active', true).order('name'),
    ]).then(([e, t]) => {
      setEmployees((e.data || []) as Employee[])
      setTerritories(t.data || [])
    })
  }, [])

  useEffect(() => {
    setSelected([])
  }, [vendor, includeOutsidePortfolio])

  useEffect(() => {
    if (type !== 'VISITA' || !vendor) {
      setClients([])
      return
    }

    const timer = setTimeout(async () => {
      let request = supabase
        .from('clients')
        .select('id,codempr,legal_name,v_cartera,g_cartera,vendor_employee_id,manager_employee_id,province,municipality,latitude,longitude')
        .limit(300)

      if (!includeOutsidePortfolio) request = request.eq('vendor_employee_id', vendor)
      if (q.trim()) request = request.or(`legal_name.ilike.%${q.trim()}%,codempr.ilike.%${q.trim()}%`)

      const { data } = await request.order('legal_name')
      setClients((data || []) as Client[])
    }, 250)

    return () => clearTimeout(timer)
  }, [q, vendor, includeOutsidePortfolio, type])

  const selectedClients = useMemo(() => clients.filter((c) => selected.includes(c.id)), [clients, selected])

  const create = async () => {
    if (!vendor || !date) return alert('Selecciona vendedor y fecha')
    if (type === 'VISITA' && !selected.length) return alert('Selecciona al menos un cliente')
    if (type === 'CAPTACION' && !territory) return alert('Selecciona una zona')

    setBusy(true)
    const { data: plan, error } = await supabase
      .from('route_plans')
      .insert({
        employee_id: vendor,
        route_date: date,
        plan_type: type,
        territory_id: type === 'CAPTACION' ? territory : null,
        title: type === 'CAPTACION' ? 'Jornada de captación' : 'Ruta de visitas',
        target_visits: type === 'VISITA' ? selected.length : null,
        target_prospects: type === 'CAPTACION' ? target : null,
        status: 'PLANIFICADA',
      })
      .select()
      .single()

    if (error || !plan) {
      setBusy(false)
      return alert(error?.message || 'No se pudo crear')
    }

    if (type === 'VISITA') {
      const stops = selected.map((id, i) => ({
        route_plan_id: plan.id,
        client_id: id,
        stop_order: i + 1,
        priority: 'MEDIA',
        status: 'PLANIFICADA',
      }))
      const { error: stopError } = await supabase.from('route_stops').insert(stops)
      if (stopError) {
        setBusy(false)
        return alert(stopError.message)
      }
    }

    setBusy(false)
    setSelected([])
    alert('Planificación creada correctamente')
  }

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <span className="eyebrow">PLANIFICACIÓN CENTRAL</span>
          <h2>Crear jornada</h2>
          <p>Asigna rutas de clientes o jornadas territoriales de captación sin depender de Excel.</p>
        </div>
      </div>

      <div className="planner-grid">
        <div className="panel planner-config">
          <h3>Configuración</h3>
          <div className="segmented">
            <button className={type === 'VISITA' ? 'active' : ''} onClick={() => setType('VISITA')}>Ruta de visitas</button>
            <button className={type === 'CAPTACION' ? 'active' : ''} onClick={() => setType('CAPTACION')}>Captación por zona</button>
          </div>

          <label>
            Vendedor
            <select value={vendor} onChange={(e) => setVendor(e.target.value)}>
              <option value="">Seleccionar...</option>
              {employees.map((e) => <option value={e.id} key={e.id}>{e.full_name}</option>)}
            </select>
          </label>

          <label>
            Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>

          {type === 'CAPTACION' ? (
            <>
              <label>
                Zona
                <select value={territory} onChange={(e) => setTerritory(e.target.value)}>
                  <option value="">Seleccionar zona...</option>
                  {territories.map((t) => <option value={t.id} key={t.id}>{t.name}</option>)}
                </select>
              </label>
              <label>
                Objetivo de prospectos
                <input type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
              </label>
              <a className="secondary center" href="/mapa"><Map size={17} /> Crear zona en mapa</a>
            </>
          ) : (
            <>
              {canOverridePortfolio && vendor && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={includeOutsidePortfolio}
                    onChange={(e) => setIncludeOutsidePortfolio(e.target.checked)}
                  />
                  Incluir clientes fuera de esta cartera
                </label>
              )}
              <div className="selected-box">
                <span>Clientes seleccionados</span>
                <strong>{selected.length}</strong>
                {selectedClients.slice(0, 5).map((c) => <small key={c.id}>{c.legal_name}</small>)}
              </div>
            </>
          )}

          <button className="primary full" disabled={busy} onClick={() => void create()}>
            <CalendarPlus size={18} />{busy ? 'Creando...' : 'Crear planificación'}
          </button>
        </div>

        {type === 'VISITA' && (
          <div className="panel">
            <div className="panel-head">
              <div>
                <b>Seleccionar clientes</b>
                <span>
                  {!vendor
                    ? 'Selecciona un vendedor para cargar su cartera.'
                    : includeOutsidePortfolio
                      ? 'Mostrando clientes de todas las carteras.'
                      : `Mostrando la cartera homologada de ${selectedVendor?.full_name || 'este vendedor'}.`}
                </span>
              </div>
            </div>

            <div className="search-field">
              <Search size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={vendor ? 'Buscar cliente o código...' : 'Selecciona primero un vendedor'}
                disabled={!vendor}
              />
            </div>

            <div className="pick-list">
              {!vendor ? (
                <div className="empty-state"><b>Selecciona un vendedor para ver sus clientes.</b></div>
              ) : clients.length === 0 ? (
                <div className="empty-state"><b>No hay clientes que coincidan con este filtro.</b></div>
              ) : clients.map((c) => {
                const on = selected.includes(c.id)
                return (
                  <button
                    key={c.id}
                    className={`pick-row ${on ? 'selected' : ''}`}
                    onClick={() => setSelected((s) => on ? s.filter((x) => x !== c.id) : [...s, c.id])}
                  >
                    <div>
                      <b>{c.legal_name}</b>
                      <span>{c.codempr} · {c.municipality || c.province || 'Sin ubicación'}</span>
                    </div>
                    {on ? <X size={17} /> : <Plus size={17} />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
