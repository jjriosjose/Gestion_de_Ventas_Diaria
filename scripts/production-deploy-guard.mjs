import { execFileSync, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const run=(args,options={})=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim()
const fail=(message)=>{console.error('\nDEPLOY BLOQUEADO\n'+message+'\n');process.exit(1)}

const integrity=spawnSync(process.execPath,['scripts/release-integrity-check.mjs'],{cwd:root,stdio:'inherit'})
if(integrity.status!==0)fail('La validación de integridad del release falló.')

let branch=''
try{branch=run(['branch','--show-current'])}catch{fail('No fue posible determinar la rama Git actual.')}
if(branch!=='main')fail('El deploy productivo solo puede ejecutarse desde main. Rama actual: '+(branch||'(detached HEAD)'))

const status=run(['status','--porcelain'])
if(status)fail('Existen cambios locales sin commit. Limpia o confirma los cambios antes de desplegar.')

try{execFileSync('git',['fetch','origin','main','--quiet'],{cwd:root,stdio:'ignore'})}
catch{fail('No fue posible actualizar origin/main. Verifica Internet/GitHub y vuelve a intentar.')}

let head='',originMain=''
try{
  head=run(['rev-parse','HEAD'])
  originMain=run(['rev-parse','origin/main'])
}catch{fail('No fue posible comparar main local con origin/main.')}

if(head!==originMain){
  fail('main local no coincide con origin/main. Ejecuta Fetch origin / Pull origin antes de desplegar.\nLocal: '+head+'\nOrigin: '+originMain)
}

const baseline=JSON.parse(readFileSync(resolve(root,'release/production-baseline.json'),'utf8'))
try{
  execFileSync('git',['merge-base','--is-ancestor',baseline.confirmed_main_commit,'HEAD'],{cwd:root,stdio:'ignore'})
}catch{
  fail('El historial actual no contiene el baseline productivo protegido '+baseline.confirmed_main_commit+'. Posible rollback/historial incorrecto.')
}

const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'))
const lock=JSON.parse(readFileSync(resolve(root,'package-lock.json'),'utf8'))
if(String(pkg.version||'').toLowerCase().includes('test'))fail('La versión '+pkg.version+' está marcada como TEST.')
if(pkg.version!==lock.version||lock.packages?.['']?.version!==pkg.version){
  fail('package.json y package-lock.json no tienen la misma versión.')
}

console.log('Deploy guard OK')
console.log('  rama: main')
console.log('  HEAD: '+head)
console.log('  versión: '+pkg.version)
console.log('  baseline mínimo: '+baseline.production_version)
