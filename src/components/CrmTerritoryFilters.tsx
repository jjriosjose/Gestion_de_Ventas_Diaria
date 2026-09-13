import { useMemo } from 'react'
import { OfficialTerritoryFilters } from './OfficialTerritoryFilters'
import { uniqueSorted } from '../lib/spatial'
import type { OfficialArea, OfficialSelection } from '../lib/officialTerritory'

export type CrmTerritoryMode='MASTER'|'OFFICIAL'

export function CrmTerritoryFilters({
  clients,mode,onModeChange,region,onRegionChange,province,onProvinceChange,municipality,onMunicipalityChange,
  officialAreas,officialSelection,onOfficialSelectionChange,
}:{
  clients:any[]
  mode:CrmTerritoryMode
  onModeChange:(value:CrmTerritoryMode)=>void
  region:string
  onRegionChange:(value:string)=>void
  province:string
  onProvinceChange:(value:string)=>void
  municipality:string
  onMunicipalityChange:(value:string)=>void
  officialAreas:OfficialArea[]
  officialSelection:OfficialSelection
  onOfficialSelectionChange:(value:OfficialSelection)=>void
}){
  const regions=useMemo(()=>uniqueSorted(clients.map(c=>c.region)),[clients])
  const provinces=useMemo(()=>uniqueSorted(clients.filter(c=>!region||c.region===region).map(c=>c.province)),[clients,region])
  const municipalities=useMemo(()=>uniqueSorted(clients.filter(c=>(!region||c.region===region)&&(!province||c.province===province)).map(c=>c.municipality)),[clients,region,province])

  return <>
    <div className="territory-source-row">
      <b>Territorio según</b>
      <div className="segmented compact-segmented">
        <button type="button" className={mode==='MASTER'?'active':''} onClick={()=>onModeChange('MASTER')}>Maestro comercial</button>
        <button type="button" className={mode==='OFFICIAL'?'active':''} onClick={()=>onModeChange('OFFICIAL')}>División territorial oficial</button>
      </div>
      <span>{mode==='OFFICIAL'?'Misma división oficial usada por Mapa.':'Región, provincia y municipio del maestro comercial.'}</span>
    </div>
    {mode==='MASTER'?<>
      <select value={region} onChange={e=>onRegionChange(e.target.value)}><option value="">Todas las regiones</option>{regions.map(v=><option key={v}>{v}</option>)}</select>
      <select value={province} onChange={e=>onProvinceChange(e.target.value)}><option value="">Todas las provincias</option>{provinces.map(v=><option key={v}>{v}</option>)}</select>
      <select value={municipality} onChange={e=>onMunicipalityChange(e.target.value)}><option value="">Todos los municipios</option>{municipalities.map(v=><option key={v}>{v}</option>)}</select>
    </>:<OfficialTerritoryFilters areas={officialAreas} value={officialSelection} onChange={onOfficialSelectionChange}/>} 
  </>
}
