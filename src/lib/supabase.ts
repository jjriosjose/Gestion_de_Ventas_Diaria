import { createClient } from '@supabase/supabase-js'

const PROD_PROJECT_REF='ccvzosnhxitfeochnflr'
const PROD_SUPABASE_URL='https://ccvzosnhxitfeochnflr.supabase.co'
const PROD_SUPABASE_PUBLISHABLE_KEY='sb_publishable_bJ9YeotIgS6Zo5OPTpZ_JQ_qkJAeJqF'
const CANONICAL_PRODUCTION_HOST='gestion-de-ventas-diaria.jjriosjose.workers.dev'

const browserHost=typeof window!=='undefined'?window.location.hostname.toLowerCase():''
const isCanonicalProductionHost=browserHost===CANONICAL_PRODUCTION_HOST

const qaUrl=String(import.meta.env.VITE_SUPABASE_QA_URL||'').trim()
const qaKey=String(import.meta.env.VITE_SUPABASE_QA_PUBLISHABLE_KEY||'').trim()
const qaConfigPresent=Boolean(qaUrl&&qaKey)
const qaPointsToProduction=qaUrl.includes(PROD_PROJECT_REF)
const qaConfigValid=qaConfigPresent&&!qaPointsToProduction

export type DataEnvironment='production'|'qa-isolated'|'qa-readonly-production'

export const DATA_ENVIRONMENT:DataEnvironment=
  isCanonicalProductionHost
    ?'production'
    :qaConfigValid
      ?'qa-isolated'
      :'qa-readonly-production'

export const IS_PRODUCTION_DATA=DATA_ENVIRONMENT==='production'
export const IS_QA_ISOLATED=DATA_ENVIRONMENT==='qa-isolated'
export const IS_QA_READONLY_PRODUCTION=DATA_ENVIRONMENT==='qa-readonly-production'

export const DATA_ENVIRONMENT_LABEL=
  DATA_ENVIRONMENT==='production'
    ?'Producción'
    :DATA_ENVIRONMENT==='qa-isolated'
      ?'QA aislada'
      :'QA segura · producción solo lectura'

export const DATA_ENVIRONMENT_DETAIL=
  DATA_ENVIRONMENT==='production'
    ?'Base de datos productiva'
    :DATA_ENVIRONMENT==='qa-isolated'
      ?'Base de datos de pruebas independiente. Estos registros no pasan a producción.'
      :'No hay base QA configurada. Puedes consultar producción, pero cualquier escritura queda bloqueada.'

export const SUPABASE_URL=DATA_ENVIRONMENT==='qa-isolated'?qaUrl:PROD_SUPABASE_URL
export const SUPABASE_PUBLISHABLE_KEY=DATA_ENVIRONMENT==='qa-isolated'?qaKey:PROD_SUPABASE_PUBLISHABLE_KEY

const requestEnvironment=DATA_ENVIRONMENT==='production'?'production':'qa'

const guardedFetch:typeof fetch=async(input,init)=>{
  if(DATA_ENVIRONMENT==='qa-readonly-production'){
    const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url
    const method=String(init?.method||((typeof Request!=='undefined'&&input instanceof Request)?input.method:'GET')).toUpperCase()
    const mutatingStorage=url.includes('/storage/v1/')&&!['GET','HEAD','OPTIONS'].includes(method)
    const mutatingFunctions=url.includes('/functions/v1/')&&!['GET','HEAD','OPTIONS'].includes(method)
    if(mutatingStorage||mutatingFunctions){
      throw new Error('MODO QA SEGURO: escritura bloqueada contra servicios productivos. Configura una base QA aislada antes de realizar pruebas con escritura.')
    }
  }
  return fetch(input,init)
}

export const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
  global:{
    fetch:guardedFetch,
    headers:{
      'x-karaka-environment':requestEnvironment,
      'x-karaka-client-host':browserHost||'unknown',
    },
  },
})

export const dataEnvironmentDiagnostics={
  environment:DATA_ENVIRONMENT,
  host:browserHost,
  canonicalProductionHost:CANONICAL_PRODUCTION_HOST,
  qaConfigured:qaConfigValid,
  qaConfigRejectedBecauseProduction:qaConfigPresent&&qaPointsToProduction,
}
