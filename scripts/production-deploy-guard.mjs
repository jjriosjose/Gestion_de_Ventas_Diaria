import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const run=(args)=>execFileSync('git',args,{encoding:'utf8'}).trim()
const fail=(message)=>{
  console.error('\nDEPLOY BLOQUEADO\n'+message+'\n')
  process.exit(1)
}

let branch=''
try{branch=run(['branch','--show-current'])}catch{fail('No fue posible determinar la rama Git actual.')}

if(branch!=='main'){
  fail('El deploy productivo solo puede ejecutarse desde main. Rama actual: '+(branch||'(detached HEAD)'))
}

const status=run(['status','--porcelain'])
if(status){
  fail('Existen cambios locales sin commit. Limpia o confirma los cambios antes de desplegar.')
}

try{
  const head=run(['rev-parse','HEAD'])
  const originMain=run(['rev-parse','origin/main'])
  if(head!==originMain){
    fail('main local no coincide con origin/main. Ejecuta Fetch origin / Pull origin y vuelve a intentar.')
  }
}catch{
  fail('No fue posible validar main contra origin/main. Ejecuta Fetch origin antes del deploy.')
}

const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
if(String(pkg.version||'').includes('test')){
  fail('La versión '+pkg.version+' está marcada como TEST y no puede desplegarse a producción.')
}

console.log('Deploy guard OK · main limpio y alineado con origin/main · versión '+pkg.version)
