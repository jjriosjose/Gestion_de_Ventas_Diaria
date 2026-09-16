export const FREE_JOURNEY_MIN_VISITS=5

export type FieldJourneyLike={
 route_mode?:string|null
 planned_clients?:number|string|null
 visited_clients?:number|string|null
 total_completed_visits?:number|string|null
}

export type CoverageSummary={
 planTarget:number
 planAchieved:number
 planPct:number|null
 freeTarget:number
 freeAchieved:number
 freePct:number|null
 operationalTarget:number
 operationalAchieved:number
 operationalPct:number|null
}

const roundPct=(value:number)=>Math.round(value*10)/10
const safe=(value:unknown)=>Math.max(0,Number(value||0))
export const percent=(achieved:number,target:number)=>target>0?roundPct(Math.min(100,(achieved/target)*100)):null

export function journeyCoverage(row:FieldJourneyLike){
 const mode=String(row.route_mode||'PLANIFICADA').toUpperCase()
 if(mode==='LIBRE'){
  const visits=safe(row.total_completed_visits)
  return{
   mode:'LIBRE' as const,
   target:FREE_JOURNEY_MIN_VISITS,
   achieved:Math.min(visits,FREE_JOURNEY_MIN_VISITS),
   pct:percent(Math.min(visits,FREE_JOURNEY_MIN_VISITS),FREE_JOURNEY_MIN_VISITS)??0,
   displayNumerator:visits,
   displayDenominator:Math.max(FREE_JOURNEY_MIN_VISITS,visits),
  }
 }
 const target=safe(row.planned_clients),visited=safe(row.visited_clients)
 return{
  mode:'PLANIFICADA' as const,
  target,
  achieved:Math.min(visited,target),
  pct:percent(Math.min(visited,target),target)??0,
  displayNumerator:visited,
  displayDenominator:target,
 }
}

export function summarizeFieldCoverage(rows:FieldJourneyLike[]):CoverageSummary{
 let planTarget=0,planAchieved=0,freeTarget=0,freeAchieved=0
 rows.forEach(row=>{
  const c=journeyCoverage(row)
  if(c.mode==='LIBRE'){freeTarget+=c.target;freeAchieved+=c.achieved}
  else{planTarget+=c.target;planAchieved+=c.achieved}
 })
 const operationalTarget=planTarget+freeTarget,operationalAchieved=planAchieved+freeAchieved
 return{
  planTarget,planAchieved,planPct:percent(planAchieved,planTarget),
  freeTarget,freeAchieved,freePct:percent(freeAchieved,freeTarget),
  operationalTarget,operationalAchieved,operationalPct:percent(operationalAchieved,operationalTarget),
 }
}

export const coverageLabel=(value:number|null)=>value===null?'N/A':`${value}%`
