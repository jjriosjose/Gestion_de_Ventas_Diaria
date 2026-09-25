import { execFileSync, spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const fail=(message)=>{console.error('\nDEPLOY BLOQUEADO\n'+message+'\n');process.exit(1)}

const compareVersionDir=(a,b)=>{
  const aa=a.match(/\d+/g)?.map(Number)||[]
  const bb=b.match(/\d+/g)?.map(Number)||[]
  const len=Math.max(aa.length,bb.length)
  for(let i=0;i<len;i++){
    const av=aa[i]||0
    const bv=bb[i]||0
    if(av!==bv)return bv-av
  }
  return b.localeCompare(a)
}

const gitCandidates=()=>{
  const candidates=['git']
  if(process.platform!=='win32')return candidates

  const localAppData=process.env.LOCALAPPDATA
  const programFiles=process.env.ProgramFiles
  const programFilesX86=process.env['ProgramFiles(x86)']

  if(localAppData){
    candidates.push(join(localAppData,'Programs','Git','cmd','git.exe'))
    const desktopRoot=join(localAppData,'GitHubDesktop')
    if(existsSync(desktopRoot)){
      try{
        const appDirs=readdirSync(desktopRoot,{withFileTypes:true})
          .filter(entry=>entry.isDirectory()&&/^app-/i.test(entry.name))
          .map(entry=>entry.name)
          .sort(compareVersionDir)
        for(const appDir of appDirs){
          candidates.push(join(desktopRoot,appDir,'resources','app','git','cmd','git.exe'))
          candidates.push(join(desktopRoot,appDir,'resources','app','git','mingw64','bin','git.exe'))
        }
      }catch{}
    }
  }

  if(programFiles)candidates.push(join(programFiles,'Git','cmd','git.exe'))
  if(programFilesX86)candidates.push(join(programFilesX86,'Git','cmd','git.exe'))
  return [...new Set(candidates)]
}

const findGitExecutable=()=>{
  for(const candidate of gitCandidates()){
    if(candidate!=='git'&&!existsSync(candidate))continue
    try{
      execFileSync(candidate,['--version'],{cwd:root,stdio:'ignore'})
      return candidate
    }catch{}
  }
  fail('Git no está disponible para el Production Deploy Guard. Instala Git o GitHub Desktop y vuelve a intentar.')
}

const git=findGitExecutable()
const run=(args,options={})=>execFileSync(git,args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe'],...options}).trim()

const integrity=spawnSync(process.execPath,['scripts/release-integrity-check.mjs'],{cwd:root,stdio:'inherit'})
if(integrity.status!==0)fail('La validación de integridad del release falló.')

let branch=''
try{branch=run(['branch','--show-current'])}catch{fail('No fue posible determinar la rama Git actual.')}
if(branch!=='main')fail('El deploy productivo solo puede ejecutarse desde main. Rama actual: '+(branch||'(detached HEAD)'))

const status=run(['status','--porcelain'])
if(status)fail('Existen cambios locales sin commit. Limpia o confirma los cambios antes de desplegar.')

try{execFileSync(git,['fetch','origin','main','--quiet'],{cwd:root,stdio:'ignore'})}
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
  execFileSync(git,['merge-base','--is-ancestor',baseline.confirmed_main_commit,'HEAD'],{cwd:root,stdio:'ignore'})
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
console.log('  git: '+git)
console.log('  rama: main')
console.log('  HEAD: '+head)
console.log('  versión: '+pkg.version)
console.log('  baseline mínimo: '+baseline.production_version)
