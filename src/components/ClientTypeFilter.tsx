export type ClientTypeFilterValue = '' | 'CADENA' | 'REGULAR'

export function ClientTypeFilter({ value, onChange, disabled = false }: { value: ClientTypeFilterValue; onChange: (value: ClientTypeFilterValue) => void; disabled?: boolean }) {
  return <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as ClientTypeFilterValue)} aria-label="Tipo de cliente">
    <option value="">Todos los tipos</option>
    <option value="CADENA">CADENA</option>
    <option value="REGULAR">REGULAR</option>
  </select>
}
