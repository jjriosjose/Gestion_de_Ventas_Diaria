export const FREE_VISIT_TARGET=5

type JourneyCoverageRow={
 route_mode?:string|null
 route_session_id?:string|null
 derived_status?:string|null
 planned_clients?:number|string|null
 visited_clients?:number|string|null
 total_completed_visits?:number|string|null
}

const n=(value:unknown)=>Number(value||0)
const roundPct=(done:number,target:number)=>target?Math.round((done/target)*1000)/10:0

export function journeyCoverage(row:JourneyCoverageRow){
 const free=row.route_mode==='LIBRE'
 if(free){
  const visits=n(row.total_completed_visits)
  const active=Boolean(row.route_session_id)||['ACTIVA','FINALIZADA','FINALIZADA_PARCIAL','PENDIENTE_CIERRE'].includes(String(row.derived_status||''))
  const target=active?FREE_VISIT_TARGET:FREE_VISIT_TARGET
  return{
   mode:'LIBRE' as const,
   done:visits,
   target,
   displayDone:visits,
   displayTarget:Math.max(FREE_VISIT_TARGET,visits),
   pct:Math.min(100,roundPct(visits,target)),
   contributionDone:active?Math.min(visits,FREE_VISIT_TARGET):0,
   contributionTarget:active?FREE_VISIT_TARGET:0,
  }
 }
 const done=n(row.visited_clients),target=n(row.planned_clients)
 return{
  mode:'PLANIFICADA' as const,
  done,
  target,
  displayDone:done,
  displayTarget:target,
  pct:roundPct(done,target),
  contributionDone:done,
  contributionTarget:target,
 }
}

export function aggregateOperationalCoverage(rows:JourneyCoverageRow[]){
 let planDone=0,planTarget=0,freeDone=0,freeTarget=0
 for(const row of rows){
  const c=journeyCoverage(row)
  if(c.mode==='LIBRE'){freeDone+=c.contributionDone;freeTarget+=c.contributionTarget}
  else{planDone+=c.contributionDone;planTarget+=c.contributionTarget}
 }
 const done=planDone+freeDone,target=planTarget+freeTarget
 return{
  planDone,planTarget,planPct:roundPct(planDone,planTarget),
  freeDone,freeTarget,freePct:roundPct(freeDone,freeTarget),
  done,target,operationalPct:roundPct(done,target),
 }
}
