from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'{path}: expected pattern not found')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# Gestores deben ver el reporte ejecutivo completo, sin convertirlos en Administradores.
replace_once(
    'src/pages/ReportsV2.tsx',
    " const executive=['Administrador','Supervisor'].includes(profile)",
    " const executive=['Administrador','Supervisor','Gestor'].includes(profile)",
)

# Centro de alertas: recibir nuevas notificaciones en vivo y mostrar aviso visible.
replace_once(
    'src/components/NotificationCenterBell.tsx',
    " const [open,setOpen]=useState(false),[alerts,setAlerts]=useState<AlertItem[]>([]),[filter,setFilter]=useState<'ALL'|'ACTION'>('ALL'),[loading,setLoading]=useState(false)",
    " const [open,setOpen]=useState(false),[alerts,setAlerts]=useState<AlertItem[]>([]),[filter,setFilter]=useState<'ALL'|'ACTION'>('ALL'),[loading,setLoading]=useState(false),[liveNotice,setLiveNotice]=useState<any>(null)",
)

replace_once(
    'src/components/NotificationCenterBell.tsx',
    " useEffect(()=>{const onFocus=()=>void load();window.addEventListener('focus',onFocus);return()=>window.removeEventListener('focus',onFocus)},[employee?.id])",
    " useEffect(()=>{const onFocus=()=>void load();window.addEventListener('focus',onFocus);return()=>window.removeEventListener('focus',onFocus)},[employee?.id])\n useEffect(()=>{\n  if(!employee?.id)return\n  const channel=supabase.channel(`notifications-live-${employee.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`employee_id=eq.${employee.id}`},payload=>{const row:any=payload.new||{};setLiveNotice(row);void load()}).subscribe()\n  return()=>{void supabase.removeChannel(channel)}\n },[employee?.id])\n useEffect(()=>{if(!liveNotice)return;const timer=window.setTimeout(()=>setLiveNotice(null),9000);return()=>window.clearTimeout(timer)},[liveNotice])",
)

replace_once(
    'src/components/NotificationCenterBell.tsx',
    " const actionCount=alerts.filter(a=>a.severity==='CRITICAL'||a.severity==='ACTION').length",
    " const actionCount=alerts.filter(a=>a.severity==='CRITICAL'||a.severity==='ACTION').length\n const openLive=async()=>{if(!liveNotice)return;const inferred=inferStored(liveNotice);if(liveNotice.id)await supabase.from('notifications').update({status:'READ',read_at:new Date().toISOString()}).eq('id',liveNotice.id);setLiveNotice(null);navigate(inferred.href);void load()}",
)

replace_once(
    'src/components/NotificationCenterBell.tsx',
    ' return <div className="notification-center-root">',
    ' return <div className="notification-center-root">{liveNotice&&<button type="button" className="notification-live-toast" onClick={()=>void openLive()} aria-label="Abrir nueva alerta"><BellRing/><div><b>{liveNotice.title||\'Nueva alerta\'}</b><span>{liveNotice.message||\'Revisa el centro de alertas.\'}</span></div><ChevronRight/></button>}',
)

css_path = Path('src/styles/notification-center.css')
css = css_path.read_text(encoding='utf-8')
if '.notification-live-toast{' in css:
    raise SystemExit('notification realtime CSS already present')
css += "\n.notification-live-toast{position:absolute;top:46px;right:0;z-index:320;width:min(380px,calc(100vw - 24px));display:grid;grid-template-columns:34px minmax(0,1fr) 18px;gap:9px;align-items:center;text-align:left;padding:11px;border:1px solid color-mix(in srgb,var(--brand) 28%,var(--border));border-left:4px solid var(--brand);border-radius:12px;background:var(--surface);box-shadow:0 18px 38px rgba(15,23,42,.2);color:var(--text);cursor:pointer}.notification-live-toast>svg:first-child{width:18px;color:var(--brand)}.notification-live-toast>svg:last-child{width:15px;color:var(--text-muted)}.notification-live-toast>div{min-width:0;display:flex;flex-direction:column;gap:2px}.notification-live-toast b{font-size:11px}.notification-live-toast span{font-size:10px;line-height:1.35;color:var(--text-muted)}@media(max-width:620px){.notification-live-toast{position:fixed;top:64px;left:8px;right:8px;width:auto}}\n"
css_path.write_text(css, encoding='utf-8')

for path in ['package.json','package-lock.json']:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if '0.6.5-beta.16.3.7' not in text:
        raise SystemExit(f'{path}: version 16.3.7 not found')
    p.write_text(text.replace('0.6.5-beta.16.3.7','0.6.5-beta.16.3.8'), encoding='utf-8')

print('beta16.3.8 patch applied')
