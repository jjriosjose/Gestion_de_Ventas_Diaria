import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, PhoneCall, RotateCcw, X, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { exportPdf, exportXlsx } from '../lib/export'

export function Agenda() {
  const { employee } = useAuth()
  const admin = ['Administrador', 'Supervisor'].includes(employee?.app_role || '')
  const [rows, setRows] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [validate, setValidate] = useState<any | null>(null)

  const load = async () => {
    const { data } = await supabase.from('appointments').select('*,clients(codempr,legal_name,phone1,mobile),prospects(prospect_code,legal_name),employees(full_name),requester:employees!appointments_requested_by_employee_id_fkey(full_name)').order('created_at', { ascending: false }).limit(500)
    setRows(data || [])
  }
  useEffect(() => { void load() }, [])

  const visible = useMemo(() => rows.filter(r => !statusFilter || r.status === statusFilter), [rows, statusFilter])
  const count = (status: string) => rows.filter(r => r.status === status).length
  const canManage = (r: any) => admin || r.employee_id === employee?.id

  const update = async (id: string, status: string) => {
    const patch: any = { status }
    if (status === 'ASISTIO') patch.attended_at = new Date().toISOString()
    if (status === 'NO_ASISTIO') patch.attended_at = null
    const { error } = await supabase.from('appointments').update(patch).eq('id', id)
    if (error) alert(error.message)
    await load()
  }

  const report = visible.map(r => ({ FechaTentativa: r.appointment_at ? new Date(r.appointment_at).toLocaleString('es-DO') : '', Cliente: r.clients?.legal_name || r.prospects?.legal_name || '', Responsable: r.employees?.full_name || '', SolicitadoPor: r.requester?.full_name || '', Tipo: r.appointment_type, Estado: r.status, Compro: r.purchased == null ? '' : r.purchased ? 'Sí' : 'No', Notas: r.notes || r.validation_notes || '' }))

  return <div className="page-stack">
    <div className="page-head"><div><span className="eyebrow">AGENDA COMPARTIDA</span><h2>Citas y showroom</h2><p>La intención del cliente primero se valida por el V-Gestor; solo después se convierte en una cita confirmada.</p></div><div className="button-row"><button className="secondary" onClick={() => void exportXlsx('Agenda_Showroom', report)}>Excel</button><button className="secondary" onClick={() => exportPdf('Agenda Showroom', report)}>PDF</button></div></div>

    <div className="kpi-grid"><button className="kpi-card" onClick={() => setStatusFilter('PENDIENTE_VALIDACION')}><div className="kpi-icon"><PhoneCall/></div><div><span>Por validar</span><strong>{count('PENDIENTE_VALIDACION')}</strong><small>Requieren llamada del gestor</small></div></button><button className="kpi-card" onClick={() => setStatusFilter('CONFIRMADA')}><div className="kpi-icon"><CheckCircle2/></div><div><span>Confirmadas</span><strong>{count('CONFIRMADA')}</strong><small>Citas validadas</small></div></button><button className="kpi-card" onClick={() => setStatusFilter('REPROGRAMADA')}><div className="kpi-icon"><RotateCcw/></div><div><span>Reprogramadas</span><strong>{count('REPROGRAMADA')}</strong><small>Nueva fecha acordada</small></div></button><button className="kpi-card" onClick={() => setStatusFilter('')}><div className="kpi-icon"><CalendarDays/></div><div><span>Total</span><strong>{rows.length}</strong><small>Historial compartido</small></div></button></div>

    <div className="button-row"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Todos los estados</option><option value="PENDIENTE_VALIDACION">Pendiente validación</option><option value="CONTACTANDO">Contactando</option><option value="CONFIRMADA">Confirmada</option><option value="REPROGRAMADA">Reprogramada</option><option value="NO_CONFIRMADA">No confirmada</option><option value="CANCELADA">Cancelada</option><option value="ASISTIO">Asistió</option><option value="NO_ASISTIO">No asistió</option><option value="FINALIZADA">Finalizada</option></select></div>

    <div className="calendar-list">{visible.map(r => <div className="appointment-card" key={r.id}><div className="date-box">{r.appointment_at ? <><b>{new Date(r.appointment_at).getDate()}</b><span>{new Date(r.appointment_at).toLocaleDateString('es-DO', { month: 'short' })}</span></> : <><Clock3/><span>Por definir</span></>}</div><div className="activity-main"><b>{r.clients?.legal_name || r.prospects?.legal_name || 'Cita'}</b><span>{r.appointment_at ? new Date(r.appointment_at).toLocaleString('es-DO') : 'Sin fecha confirmada'} · {r.employees?.full_name || 'Sin responsable'}</span><small>{r.status.replaceAll('_', ' ')} · {r.appointment_type}{r.requester?.full_name ? ` · solicitada por ${r.requester.full_name}` : ''}</small>{r.request_contact_name && <small>Contacto: {r.request_contact_name} {r.request_phone ? `· ${r.request_phone}` : ''}</small>}</div>{canManage(r) && <div className="row-actions">{r.status === 'PENDIENTE_VALIDACION' && <><button className="primary compact" onClick={() => setValidate(r)}><PhoneCall size={15}/> Validar</button><button className="secondary compact" onClick={() => void update(r.id, 'CONTACTANDO')}>No contesta</button></>}{r.status === 'CONTACTANDO' && <button className="primary compact" onClick={() => setValidate(r)}><PhoneCall size={15}/> Reintentar</button>}{['CONFIRMADA','PROGRAMADA','REPROGRAMADA'].includes(r.status) && <><button className="success-btn compact" onClick={() => void update(r.id, 'ASISTIO')}><CheckCircle2 size={16}/> Asistió</button><button className="secondary compact" onClick={() => void update(r.id, 'NO_ASISTIO')}><XCircle size={16}/> No asistió</button></>}</div>}</div>)}</div>
    {validate && <ValidateAppointment row={validate} employeeId={employee?.id || ''} onClose={() => setValidate(null)} onSaved={() => { setValidate(null); void load() }}/>} 
  </div>
}

function ValidateAppointment({ row, employeeId, onClose, onSaved }: { row: any; employeeId: string; onClose: () => void; onSaved: () => void }) {
  const tentative = row.appointment_at || row.requested_appointment_at
  const [date, setDate] = useState(tentative ? localDateTime(tentative) : '')
  const [notes, setNotes] = useState(row.validation_notes || '')
  const [busy, setBusy] = useState(false)

  const save = async (status: 'CONFIRMADA' | 'REPROGRAMADA' | 'NO_CONFIRMADA' | 'CANCELADA') => {
    if (['CONFIRMADA', 'REPROGRAMADA'].includes(status) && !date) return alert('Indica la fecha y hora acordada con el cliente.')
    setBusy(true)
    try {
      const patch: any = { status, validation_notes: notes || null }
      if (date) patch.appointment_at = new Date(date).toISOString()
      if (status === 'CONFIRMADA') { patch.confirmed_at = new Date().toISOString(); patch.confirmed_by_employee_id = employeeId }
      const { error } = await supabase.from('appointments').update(patch).eq('id', row.id)
      if (error) throw error
      onSaved()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'No fue posible actualizar la solicitud')
    } finally { setBusy(false) }
  }

  return <div className="modal-wrap"><button className="modal-backdrop" onClick={onClose}/><div className="modal"><div className="modal-head"><div><span className="eyebrow">VALIDAR SHOWROOM</span><h3>{row.clients?.legal_name || 'Cliente'}</h3><p>Registra el resultado de la llamada de confirmación.</p></div><button className="icon-btn" onClick={onClose}><X/></button></div><div className="form-grid one"><label>Fecha y hora acordada<input type="datetime-local" value={date} onChange={e => setDate(e.target.value)}/></label><label>Nota de validación<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Con quién habló, condiciones, observaciones..."/></label></div><div className="modal-actions" style={{ flexWrap: 'wrap' }}><button className="secondary" disabled={busy} onClick={() => void save('NO_CONFIRMADA')}>No confirma</button><button className="danger" disabled={busy} onClick={() => void save('CANCELADA')}>Cancelar cita</button><button className="secondary" disabled={busy} onClick={() => void save('REPROGRAMADA')}>Reprogramar</button><button className="primary" disabled={busy} onClick={() => void save('CONFIRMADA')}>Confirmar cita</button></div></div></div>
}

function localDateTime(value: string) {
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
