import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, MapPin } from 'lucide-react'
import type { Client, Employee } from '../types'
import '../styles/map-client-list-v065.css'

const PAGE_SIZE = 25

type Props = {
  clients: Client[]
  employees: Employee[]
  onFocusPoint: (point: [number, number]) => void
}

const gpsLabel = (status?: Client['geo_status']) => {
  if (status === 'VERIFICADA') return 'Verificado'
  if (status === 'SIN_VERIFICAR') return 'Sin verificar'
  if (status === 'POSIBLE_ERROR') return 'Posible error'
  return 'Sin GPS'
}

const gpsClass = (status?: Client['geo_status']) => {
  if (status === 'VERIFICADA') return 'verified'
  if (status === 'SIN_VERIFICAR') return 'pending'
  if (status === 'POSIBLE_ERROR') return 'warning'
  return 'missing'
}

export function MapFilteredClientList({ clients, employees, onFocusPoint }: Props) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)

  const employeeNames = useMemo(() => new Map(employees.map((item) => [item.id, item.full_name])), [employees])
  const rows = useMemo(() => [...clients].sort((a, b) => a.legal_name.localeCompare(b.legal_name, 'es', { sensitivity: 'base' })), [clients])
  const geocodedCount = useMemo(() => rows.filter((client) => client.latitude != null && client.longitude != null).length, [rows])
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const from = rows.length ? (safePage - 1) * PAGE_SIZE + 1 : 0
  const to = Math.min(safePage * PAGE_SIZE, rows.length)

  useEffect(() => { setPage(1) }, [clients])

  const focusClient = (client: Client) => {
    if (client.latitude == null || client.longitude == null) return
    onFocusPoint([client.latitude, client.longitude])
    window.setTimeout(() => document.querySelector('.leaflet-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  return <section className={`panel map-client-list ${open ? 'open' : ''}`}>
    <button className="map-client-list-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
      <div>
        <span className="eyebrow">RESULTADO DEL FILTRO</span>
        <b>Listado de clientes</b>
        <small>{rows.length.toLocaleString()} filtrados · {geocodedCount.toLocaleString()} con GPS</small>
      </div>
      <span className="map-client-list-toggle-action">{open ? 'Ocultar' : 'Mostrar'} {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</span>
    </button>

    {open && <div className="map-client-list-body">
      <div className="map-client-list-summary">
        <span>Mostrando <b>{from.toLocaleString()}–{to.toLocaleString()}</b> de <b>{rows.length.toLocaleString()}</b> clientes según los filtros activos.</span>
        <small>Selecciona “Ubicar” para centrar un cliente con GPS en el mapa.</small>
      </div>

      {pageRows.length ? <div className="map-client-list-grid" role="table" aria-label="Clientes filtrados del mapa">
        <div className="map-client-list-head" role="row">
          <span>Cliente</span><span>Tipo</span><span>Territorio</span><span>Vendedor</span><span>Gestor</span><span>GPS</span><span></span>
        </div>
        {pageRows.map((client) => {
          const territory = [client.region, client.province, client.municipality].filter(Boolean).join(' · ') || 'Sin clasificación'
          const hasGps = client.latitude != null && client.longitude != null
          const vendorName = (client.vendor_employee_id && employeeNames.get(client.vendor_employee_id)) || client.v_cartera || 'Sin asignar'
          const managerName = (client.manager_employee_id && employeeNames.get(client.manager_employee_id)) || client.g_cartera || 'Sin asignar'
          return <div className="map-client-list-row" role="row" key={client.id}>
            <div className="map-client-list-client" role="cell"><b>{client.legal_name}</b><small>{client.codempr || client.company_code || 'Sin código'}</small></div>
            <span role="cell" data-label="Tipo">{client.client_type || '—'}</span>
            <span className="map-client-list-territory" role="cell" data-label="Territorio" title={territory}>{territory}</span>
            <span role="cell" data-label="Vendedor">{vendorName}</span>
            <span role="cell" data-label="Gestor">{managerName}</span>
            <span role="cell" data-label="GPS"><i className={`map-client-gps ${gpsClass(client.geo_status)}`}>{gpsLabel(client.geo_status)}</i></span>
            <div className="map-client-list-action" role="cell"><button type="button" className="secondary compact" disabled={!hasGps} onClick={() => focusClient(client)}><MapPin size={14}/> Ubicar</button></div>
          </div>
        })}
      </div> : <div className="map-client-list-empty">No hay clientes para los filtros seleccionados.</div>}

      {rows.length > PAGE_SIZE && <div className="map-client-list-pagination">
        <button type="button" className="secondary compact" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={15}/> Anterior</button>
        <span>Página <b>{safePage}</b> de <b>{pageCount}</b></span>
        <button type="button" className="secondary compact" disabled={safePage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Siguiente <ChevronRight size={15}/></button>
      </div>}
    </div>}
  </section>
}
