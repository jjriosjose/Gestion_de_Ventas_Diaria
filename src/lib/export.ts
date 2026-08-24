import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import packageInfo from '../../package.json'

const APP_VERSION=packageInfo.version
const saveBlob=(blob:Blob,name:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

export async function exportXlsx(title:string, rows:Record<string,unknown>[]) {
  const wb=new ExcelJS.Workbook(); wb.creator='Gestion de Ventas Diaria'; const ws=wb.addWorksheet('Datos')
  const cols=rows.length?Object.keys(rows[0]):['Sin datos']; ws.columns=cols.map(k=>({header:k,key:k,width:Math.min(35,Math.max(12,k.length+2))}))
  rows.forEach(r=>ws.addRow(r)); ws.views=[{state:'frozen',ySplit:1}]; ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:Math.max(1,cols.length)}}
  const header=ws.getRow(1); header.font={bold:true,color:{argb:'FFFFFFFF'}}; header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB91C2C'}}; header.alignment={vertical:'middle'}
  ws.eachRow((row,rn)=>{if(rn>1&&rn%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F8FA'}}})
  const buffer=await wb.xlsx.writeBuffer(); saveBlob(new Blob([buffer as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${title}.xlsx`)
}

const text=(value:unknown)=>String(value??'')
const num=(value:unknown)=>{const parsed=Number(String(value??'').replace(/[^0-9.-]/g,''));return Number.isFinite(parsed)?parsed:0}
const pdfMoney=(value:number)=>new Intl.NumberFormat('es-DO',{style:'currency',currency:'DOP',maximumFractionDigits:0}).format(value)
const shortName=(value:string)=>{const p=value.trim().split(/\s+/);return p.length>2?`${p[0]} ${p[1]}`:value}
const ratioPct=(value:number,total:number)=>total?Math.round((value/total)*1000)/10:0
const coveragePct=(row:any)=>ratioPct(Number(row?.visited_clients||0),Number(row?.planned_clients||0))
const resolutionPct=(row:any)=>ratioPct(Number(row?.resolved_clients||0),Number(row?.planned_clients||0))
const formatSeconds=(value:unknown)=>{const total=Math.max(0,Math.round(Number(value||0)));const h=Math.floor(total/3600);const m=Math.round((total%3600)/60);return h?`${h} h ${m} min`:`${m} min`}
const avgVisitSeconds=(row:any)=>Number(row?.visited_clients||0)>0?Number(row?.visit_seconds||0)/Number(row?.visited_clients||1):0

async function loadLogo(){
  try{
    const response=await fetch('/logo-karaka.png',{cache:'force-cache'})
    if(!response.ok)return null
    const blob=await response.blob()
    return await new Promise<string|null>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:null);reader.onerror=()=>resolve(null);reader.readAsDataURL(blob)})
  }catch{return null}
}

function addCorporateHeader(doc:jsPDF,title:string,subtitle:string,logo:string|null){
  const width=doc.internal.pageSize.getWidth()
  doc.setFillColor(185,28,44);doc.rect(0,0,width,7,'F')
  if(logo){try{doc.addImage(logo,'PNG',14,11,27,17,undefined,'FAST')}catch{}}
  const tx=logo?46:14
  doc.setTextColor(26,31,38);doc.setFont('helvetica','bold');doc.setFontSize(16);doc.text(title,tx,17)
  doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(98,107,119);doc.text(subtitle,tx,23,{maxWidth:width-tx-14})
  doc.setDrawColor(226,229,234);doc.line(14,31,width-14,31)
}

function addExecutiveHeader(doc:jsPDF,title:string,subtitle:string){addCorporateHeader(doc,title,subtitle,null)}

function addExecutiveFooter(doc:jsPDF){
  const pages=doc.getNumberOfPages()
  for(let page=1;page<=pages;page++){
    doc.setPage(page)
    const width=doc.internal.pageSize.getWidth();const height=doc.internal.pageSize.getHeight()
    doc.setDrawColor(226,229,234);doc.line(14,height-10,width-14,height-10)
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(110,118,129)
    doc.text(`Almacenes Karaka · Gestión de Ventas Diaria · v${APP_VERSION} · Uso interno`,14,height-5)
    doc.text(`Página ${page} de ${pages}`,width-14,height-5,{align:'right'})
  }
}

function drawKpis(doc:jsPDF,items:Array<{label:string;value:string;note?:string}>,top=36){
  const pageW=doc.internal.pageSize.getWidth();const left=14;const gap=3;const cols=Math.min(items.length,6);const cardW=(pageW-left*2-gap*(cols-1))/cols;const cardH=20
  items.slice(0,cols).forEach((item,i)=>{
    const x=left+i*(cardW+gap)
    doc.setFillColor(248,249,251);doc.setDrawColor(225,229,235);doc.roundedRect(x,top,cardW,cardH,2,2,'FD')
    doc.setFillColor(185,28,44);doc.roundedRect(x+3,top+3,3,14,1,1,'F')
    doc.setFont('helvetica','normal');doc.setFontSize(6.8);doc.setTextColor(102,112,124);doc.text(item.label,x+9,top+6)
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(28,33,40);doc.text(item.value,x+9,top+12,{maxWidth:cardW-12})
    if(item.note){doc.setFont('helvetica','normal');doc.setFontSize(5.8);doc.setTextColor(122,130,141);doc.text(item.note,x+9,top+16.5,{maxWidth:cardW-12})}
  })
}

function metric(doc:jsPDF,label:string,value:string,x:number,y:number,width=30){
  doc.setFont('helvetica','normal');doc.setFontSize(5.8);doc.setTextColor(105,114,126);doc.text(label,x,y,{maxWidth:width})
  doc.setFont('helvetica','bold');doc.setFontSize(7.5);doc.setTextColor(31,37,45);doc.text(value,x,y+4,{maxWidth:width})
}

function progress(doc:jsPDF,x:number,y:number,w:number,value:number,color:[number,number,number]){
  const p=Math.max(0,Math.min(100,value));doc.setFillColor(235,238,242);doc.roundedRect(x,y,w,2.2,1,1,'F');doc.setFillColor(...color);doc.roundedRect(x,y,w*(p/100),2.2,1,1,'F')
}

function drawVendorOverview(doc:jsPDF,vendors:any[],top:number){
  doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(35,41,49);doc.text('Vendedores · lectura de jornada y cumplimiento',14,top)
  doc.setFont('helvetica','normal');doc.setFontSize(6.4);doc.setTextColor(102,111,123);doc.text('Cobertura real = visitados ÷ planificados. Resolución = paradas resueltas ÷ planificadas.',14,top+4)
  let y=top+8
  const list=vendors.slice(0,3)
  if(!list.length){doc.setFontSize(7);doc.text('Sin vendedores con actividad o planificación registrada.',14,y+8);return y+16}
  for(const v of list){
    const coverage=coveragePct(v),resolution=resolutionPct(v);const cardH=30
    doc.setFillColor(249,250,252);doc.setDrawColor(226,230,235);doc.roundedRect(14,y,269,cardH,2.5,2.5,'FD')
    doc.setFont('helvetica','bold');doc.setFontSize(8.3);doc.setTextColor(29,35,43);doc.text(shortName(v.full_name||'Vendedor'),18,y+7,{maxWidth:40})
    doc.setFont('helvetica','normal');doc.setFontSize(5.8);doc.setTextColor(105,114,126);doc.text(`${v.visited_clients||0} de ${v.planned_clients||0} visitas · ${v.resolved_clients||0} paradas resueltas`,18,y+12,{maxWidth:42})

    metric(doc,'Cobertura real',`${coverage}%`,61,y+6,27);progress(doc,61,y+13,27,coverage,[31,122,91])
    metric(doc,'Resolución ruta',`${resolution}%`,93,y+6,27);progress(doc,93,y+13,27,resolution,[185,28,44])
    metric(doc,'Jornada de ruta',formatSeconds(v.route_window_seconds),125,y+6,30)
    metric(doc,'Atención clientes',formatSeconds(v.visit_seconds),159,y+6,30)
    metric(doc,'Promedio / visita',formatSeconds(avgVisitSeconds(v)),193,y+6,28)
    metric(doc,'Traslado / espera*',formatSeconds(v.transit_wait_estimated_seconds),225,y+6,30)
    metric(doc,'Ventas',pdfMoney(Number(v.sales_amount||0)),258,y+6,21)

    doc.setFont('helvetica','normal');doc.setFontSize(5.5);doc.setTextColor(108,117,129)
    doc.text(`Compras: ${v.purchase_clients||0} · Eventualidades: ${v.incidents||0} (${formatSeconds(v.incident_seconds)})`,61,y+24,{maxWidth:185})
    y+=cardH+4
  }
  return y
}

function drawManagerOverview(doc:jsPDF,managers:any[],top:number){
  doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(35,41,49);doc.text('Gestores · CRM y Showroom',14,top)
  let y=top+5
  const list=managers.slice(0,3)
  if(!list.length){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(105,114,126);doc.text('Sin gestores con actividad registrada.',14,y+8);return y+15}
  for(const m of list){
    doc.setFillColor(248,250,252);doc.setDrawColor(226,230,235);doc.roundedRect(14,y,269,18,2.5,2.5,'FD')
    doc.setFont('helvetica','bold');doc.setFontSize(7.8);doc.setTextColor(29,35,43);doc.text(shortName(m.full_name||'Gestor'),18,y+7,{maxWidth:43})
    metric(doc,'Llamadas',String(m.calls||0),65,y+5,22);metric(doc,'Contactados',String(m.calls_contacted||0),91,y+5,25);metric(doc,'Contacto',`${m.call_contact_rate_pct||0}%`,121,y+5,23);metric(doc,'Showroom',String(m.showroom_attended||0),149,y+5,23);metric(doc,'Tiempo showroom',formatSeconds(m.showroom_seconds),177,y+5,28);metric(doc,'Compras',String(m.purchase_clients||0),210,y+5,22);metric(doc,'Ventas',pdfMoney(Number(m.sales_amount||0)),237,y+5,40)
    y+=22
  }
  return y
}

function executivePdf(title:string,rows:Record<string,unknown>[]){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'})
  doc.setProperties({title,subject:'Reporte Ejecutivo Diario',author:'Gestion de Ventas Diaria - Almacenes Karaka'})
  addExecutiveHeader(doc,title,'Resumen gerencial de actividad, tiempos, cumplimiento y resultados comerciales.')
  const totals={colaboradores:rows.length,planificados:rows.reduce((a,r)=>a+num(r.Planificados),0),visitados:rows.reduce((a,r)=>a+num(r.Visitados),0),llamadas:rows.reduce((a,r)=>a+num(r.Llamadas),0),contactados:rows.reduce((a,r)=>a+num(r.Contactados),0),showroom:rows.reduce((a,r)=>a+num(r.Showroom),0),compras:rows.reduce((a,r)=>a+num(r.Compras),0),ventas:rows.reduce((a,r)=>a+num(r.Ventas),0)}
  drawKpis(doc,[{label:'Colaboradores',value:String(totals.colaboradores)},{label:'Cobertura real',value:`${totals.visitados}/${totals.planificados}`,note:`${ratioPct(totals.visitados,totals.planificados)}%`},{label:'Llamadas',value:`${totals.llamadas} / ${totals.contactados}`},{label:'Showroom',value:String(totals.showroom)},{label:'Compras',value:String(totals.compras)},{label:'Ventas',value:pdfMoney(totals.ventas)}],34)
  const primaryHead=[['Colaborador','Cargo','Primera / última gestión','H. operativas','Plan','Visitas','Llamadas','Showroom','Compras','Ventas','Event.']]
  const primaryBody=rows.map(r=>[text(r.Empleado),text(r.Cargo||r.Tipo),`${text(r.PrimeraGestion)} - ${text(r.UltimaGestion)}`,text(r['Horas operativas']||r.HorasOperativas),text(r.Planificados),text(r.Visitados),text(r.Llamadas),text(r.Showroom),text(r.Compras),text(r.Ventas),text(r.Eventualidades)])
  autoTable(doc,{head:primaryHead,body:primaryBody,startY:58,theme:'grid',margin:{left:14,right:14,bottom:14},styles:{font:'helvetica',fontSize:7.2,cellPadding:1.7,overflow:'linebreak',valign:'middle',textColor:[45,50,58],lineColor:[226,229,234],lineWidth:0.15},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold',halign:'center',fontSize:6.8},alternateRowStyles:{fillColor:[249,250,251]}})
  addExecutiveFooter(doc);doc.save(`${title}.pdf`)
}

export async function exportDashboardPdf(date:string,global:any,employees:any[],stats:{clients:number;geo:number;verified:number}){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const logo=await loadLogo();const vendors=employees.filter(e=>e.employee_type==='Vendedor');const managers=employees.filter(e=>e.employee_type==='Gestor')
  doc.setProperties({title:`Resumen Diario ${date}`,subject:'Dashboard ejecutivo diario',author:'Gestión de Ventas Diaria - Almacenes Karaka'})
  addCorporateHeader(doc,'Resumen Diario · Centro de Operaciones',`Fecha operativa ${date} · versión ${APP_VERSION} · corte ejecutivo por función.`,logo)
  drawKpis(doc,[{label:'Clientes',value:String(stats.clients),note:`${stats.geo} con GPS`},{label:'Cobertura real',value:`${global?.visited_clients||0}/${global?.planned_clients||0}`,note:`${global?.route_execution_pct||0}% visitados vs plan`},{label:'Llamadas',value:String(global?.calls||0),note:`${global?.call_contact_rate_pct||0}% contacto`},{label:'Showroom',value:String(global?.showroom_attended||0)},{label:'Compras',value:String(global?.purchase_clients||0),note:'calle + showroom'},{label:'Ventas',value:pdfMoney(Number(global?.sales_amount||0)),note:'monto registrado'}],36)
  const vendorEnd=drawVendorOverview(doc,vendors,66)
  drawManagerOverview(doc,managers,Math.min(166,vendorEnd+2))

  doc.addPage();addCorporateHeader(doc,'Detalle operativo por función',`Resumen Diario ${date} · métricas explícitas de jornada y cumplimiento.`,logo)
  autoTable(doc,{head:[['Vendedor','Plan','Visitados','Cobertura real','Resueltos','Resolución','Jornada','Atención','Prom./visita','Traslado/espera*','Compras','Ventas']],body:vendors.map(v=>[v.full_name,v.planned_clients||0,v.visited_clients||0,`${coveragePct(v)}%`,v.resolved_clients||0,`${resolutionPct(v)}%`,formatSeconds(v.route_window_seconds),formatSeconds(v.visit_seconds),formatSeconds(avgVisitSeconds(v)),formatSeconds(v.transit_wait_estimated_seconds),v.purchase_clients||0,pdfMoney(Number(v.sales_amount||0))]),startY:37,theme:'grid',margin:{left:14,right:14},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:6.5,cellPadding:1.8,lineColor:[226,229,234],lineWidth:.15},alternateRowStyles:{fillColor:[249,250,251]}})
  const vendorTableEnd=Number((doc as any).lastAutoTable?.finalY||80)
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(37,43,51);doc.text('Gestores · CRM y Showroom',14,vendorTableEnd+10)
  autoTable(doc,{head:[['Gestor','Llamadas','Contactados','Contacto %','Showroom','T. showroom','Compras','Ventas']],body:managers.map(m=>[m.full_name,m.calls||0,m.calls_contacted||0,`${m.call_contact_rate_pct||0}%`,m.showroom_attended||0,formatSeconds(m.showroom_seconds),m.purchase_clients||0,pdfMoney(Number(m.sales_amount||0))]),startY:vendorTableEnd+14,theme:'grid',margin:{left:14,right:14,bottom:18},headStyles:{fillColor:[31,58,95],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:7.2,cellPadding:2,lineColor:[226,229,234],lineWidth:.15},alternateRowStyles:{fillColor:[249,250,251]}})
  doc.setFont('helvetica','normal');doc.setFontSize(6);doc.setTextColor(105,114,126);doc.text('* Traslado/espera es tiempo residual estimado de la jornada; no representa conducción pura.',14,191)
  addExecutiveFooter(doc);doc.save(`Resumen_Diario_${date}.pdf`)
}

export async function exportExecutiveReportPdf(date:string,rows:any[],summary:any){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const logo=await loadLogo();const vendors=rows.filter(r=>r.employee_type==='Vendedor');const managers=rows.filter(r=>r.employee_type==='Gestor');const others=rows.filter(r=>!['Vendedor','Gestor'].includes(r.employee_type))
  doc.setProperties({title:`Reporte Ejecutivo Diario ${date}`,subject:'Reporte gerencial diario por función',author:'Gestión de Ventas Diaria - Almacenes Karaka'})
  addCorporateHeader(doc,'Reporte Ejecutivo Diario',`Cierre operativo ${date} · Dirección · versión ${APP_VERSION} · métricas interpretables por función.`,logo)
  drawKpis(doc,[{label:'Colaboradores activos',value:String(summary?.active_employees||0)},{label:'Cobertura real',value:`${summary?.visited_clients||0}/${summary?.planned_clients||0}`,note:`${summary?.route_execution_pct||0}% visitados vs plan`},{label:'Llamadas',value:String(summary?.calls||0),note:`${summary?.call_contact_rate_pct||0}% contacto`},{label:'Showroom',value:String(summary?.showroom_attended||0)},{label:'Compras',value:String(summary?.purchase_clients||0)},{label:'Ventas',value:pdfMoney(Number(summary?.sales_amount||0))}],36)
  const vendorEnd=drawVendorOverview(doc,vendors,66)
  drawManagerOverview(doc,managers,Math.min(166,vendorEnd+2))

  doc.addPage();addCorporateHeader(doc,'Vendedores · operación de calle',`Reporte Ejecutivo ${date} · jornada, cobertura real, resolución, atención, traslado y resultado comercial.`,logo)
  autoTable(doc,{head:[['Vendedor','Horario','Jornada','Plan','Visitados','Cobertura real','Resueltos','Resolución','Atención','Prom./visita','Traslado/espera*','Compras','Ventas']],body:vendors.map(v=>[v.full_name,`${v.first_activity_at?new Date(v.first_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'}–${v.last_activity_at?new Date(v.last_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'}`,formatSeconds(v.route_window_seconds),v.planned_clients||0,v.visited_clients||0,`${coveragePct(v)}%`,v.resolved_clients||0,`${resolutionPct(v)}%`,formatSeconds(v.visit_seconds),formatSeconds(avgVisitSeconds(v)),formatSeconds(v.transit_wait_estimated_seconds),v.purchase_clients||0,pdfMoney(Number(v.sales_amount||0))]),startY:38,theme:'grid',margin:{left:10,right:10,bottom:22},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:6.3,cellPadding:1.7,lineColor:[226,229,234],lineWidth:.15,overflow:'linebreak'},alternateRowStyles:{fillColor:[249,250,251]}})
  doc.setFont('helvetica','normal');doc.setFontSize(6.2);doc.setTextColor(95,104,116)
  doc.text('Cobertura real = visitas completadas ÷ planificados. Resolución = paradas con resultado/justificación ÷ planificadas.',14,187)
  doc.text('* Traslado/espera es estimado: jornada de ruta menos atención a clientes y eventualidades. Si la ruta sigue activa, la jornada se calcula hasta la hora del corte.',14,192)

  doc.addPage();addCorporateHeader(doc,'Gestores · CRM y Showroom',`Reporte Ejecutivo ${date} · llamadas, contacto, showroom, compras y ventas.`,logo)
  autoTable(doc,{head:[['Gestor','Ventana gestión','T. operativo','Llamadas','Contactados','Contacto %','T. llamadas*','Showroom','T. showroom','Compras','Ventas']],body:managers.map(m=>[m.full_name,`${m.first_activity_at?new Date(m.first_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'}–${m.last_activity_at?new Date(m.last_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'}`,formatSeconds(m.operational_seconds),m.calls||0,m.calls_contacted||0,`${m.call_contact_rate_pct||0}%`,formatSeconds(m.call_estimated_seconds),m.showroom_attended||0,formatSeconds(m.showroom_seconds),m.purchase_clients||0,pdfMoney(Number(m.sales_amount||0))]),startY:38,theme:'grid',margin:{left:14,right:14,bottom:18},headStyles:{fillColor:[31,58,95],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:7,cellPadding:2,lineColor:[226,229,234],lineWidth:.15},alternateRowStyles:{fillColor:[249,250,251]}})

  if(others.length){doc.addPage();addCorporateHeader(doc,'Otras funciones con actividad',`Reporte Ejecutivo ${date}`,logo);autoTable(doc,{head:[['Colaborador','Tipo','Actividad','Compras','Ventas','Tiempo operativo']],body:others.map(r=>[r.full_name,r.employee_type||r.job_title||'',Number(r.visited_clients||0)+Number(r.calls||0)+Number(r.showroom_attended||0),r.purchase_clients||0,pdfMoney(Number(r.sales_amount||0)),formatSeconds(r.operational_seconds)]),startY:38,theme:'grid',headStyles:{fillColor:[92,101,113],textColor:[255,255,255]},styles:{fontSize:7.5}})}
  addExecutiveFooter(doc);doc.save(`Reporte_Ejecutivo_${date}.pdf`)
}

export function exportPdf(title:string, rows:Record<string,unknown>[]) {
  const cols=rows.length?Object.keys(rows[0]):['Sin datos']
  if(cols.includes('Empleado')&&cols.includes('Ventas')&&cols.length>15){executivePdf(title,rows);return}
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});doc.setProperties({title,author:'Gestion de Ventas Diaria - Almacenes Karaka'})
  addExecutiveHeader(doc,title,'Detalle exportado desde Gestión de Ventas Diaria.')
  const body=rows.map(r=>cols.map(c=>String(r[c]??'')))
  autoTable(doc,{head:[cols],body,startY:33,theme:'grid',margin:{left:10,right:10,bottom:14},styles:{fontSize:7,cellPadding:1.6,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold'},horizontalPageBreak:true,horizontalPageBreakRepeat:0})
  addExecutiveFooter(doc);doc.save(`${title}.pdf`)
}
