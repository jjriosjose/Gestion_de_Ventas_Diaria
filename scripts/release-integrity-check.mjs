import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const fail=(message)=>{console.error('RELEASE INTEGRITY FAILED: '+message);process.exit(1)}
const readJson=(path)=>JSON.parse(readFileSync(join(root,path),'utf8'))
const baseline=readJson('release/production-baseline.json')
const pkg=readJson('package.json')
const lock=readJson('package-lock.json')

const numericVersion=(value)=>String(value||'').match(/\d+/g)?.map(Number)||[]
const compareVersion=(a,b)=>{
  const aa=numericVersion(a),bb=numericVersion(b),len=Math.max(aa.length,bb.length)
  for(let i=0;i<len;i++){const av=aa[i]||0,bv=bb[i]||0;if(av!==bv)return av>bv?1:-1}
  return 0
}

if(!pkg.version)fail('package.json has no version')
if(pkg.version!==lock.version)fail(`package.json (${pkg.version}) != package-lock.json (${lock.version})`)
if(lock.packages?.['']?.version!==pkg.version)fail(`package-lock root (${lock.packages?.['']?.version}) != package.json (${pkg.version})`)
if(compareVersion(pkg.version,baseline.production_version)<0){
  fail(`application version ${pkg.version} is older than protected production baseline ${baseline.production_version}`)
}

for(const [relative,tokens] of Object.entries(baseline.required_files||{})){
  const path=join(root,relative)
  if(!existsSync(path))fail(`required file missing: ${relative}`)
  const content=readFileSync(path,'utf8')
  for(const token of tokens){
    if(!content.includes(token))fail(`protected capability token missing in ${relative}: ${token}`)
  }
}

for(const migration of baseline.required_migrations||[]){
  const relative=join('supabase','migrations',migration)
  if(!existsSync(join(root,relative)))fail(`protected migration missing: ${relative}`)
}

const sourceFiles=[]
const walk=(dir)=>{
  for(const name of readdirSync(dir)){
    const path=join(dir,name),st=statSync(path)
    if(st.isDirectory())walk(path)
    else if(/\.(ts|tsx|js|jsx)$/.test(name))sourceFiles.push(path)
  }
}
walk(join(root,'src'))
for(const path of sourceFiles){
  const content=readFileSync(path,'utf8')
  for(const token of baseline.forbidden_source_tokens||[]){
    if(content.includes(token))fail(`forbidden test-only source reference found in ${path.slice(root.length+1)}: ${token}`)
  }
}

console.log(`Release integrity OK · version ${pkg.version} · baseline ${baseline.production_version}`)
