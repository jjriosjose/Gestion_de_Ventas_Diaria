import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
const pct=(value:unknown)=>Math.max(0,Math.min(100,Number(value||0)))

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
    doc.text('Almacenes Karaka · Gestión de Ventas Diaria · Uso interno',14,height-5)
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

function drawBars(doc:jsPDF,title:string,rows:Array<{label:string;value:number;secondary?:number}>,x:number,y:number,w:number,h:number,secondaryLabel?:string){
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(37,43,51);doc.text(title,x,y)
  const data=rows.slice(0,7);if(!data.length){doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(120,128,139);doc.text('Sin actividad registrada.',x,y+9);return}
  const max=Math.max(1,...data.map(r=>Math.max(r.value,r.secondary||0)));const top=y+6;const rowH=Math.min(12,(h-8)/data.length);const labelW=Math.min(38,w*.3);const barW=w-labelW-20
  data.forEach((row,i)=>{
    const yy=top+i*rowH
    doc.setFont('helvetica','normal');doc.setFontSize(6.5);doc.setTextColor(78,87,99);doc.text(shortName(row.label),x,yy+4,{maxWidth:labelW-2})
    doc.setFillColor(238,241,245);doc.roundedRect(x+labelW,yy+1,barW,4,1,1,'F')
    doc.setFillColor(185,28,44);doc.roundedRect(x+labelW,yy+1,barW*(row.value/max),4,1,1,'F')
    if(row.secondary!=null){doc.setFillColor(31,122,91);doc.roundedRect(x+labelW,yy+6,barW*(row.secondary/max),2.5,1,1,'F')}
    doc.setFont('helvetica','bold');doc.setFontSize(6.2);doc.setTextColor(48,55,64);doc.text(String(row.value),x+labelW+barW+2,yy+4)
  })
  if(secondaryLabel){doc.setFont('helvetica','normal');doc.setFontSize(5.8);doc.setTextColor(112,120,131);doc.text(`Rojo: principal · Verde: ${secondaryLabel}`,x,y+h)}
}

function executivePdf(title:string,rows:Record<string,unknown>[]){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'})
  doc.setProperties({title,subject:'Reporte Ejecutivo Diario',author:'Gestion de Ventas Diaria - Almacenes Karaka'})
  addExecutiveHeader(doc,title,'Resumen gerencial de actividad, tiempos, cumplimiento y resultados comerciales.')

  const totals={colaboradores:rows.length,planificados:rows.reduce((a,r)=>a+num(r.Planificados),0),visitados:rows.reduce((a,r)=>a+num(r.Visitados),0),llamadas:rows.reduce((a,r)=>a+num(r.Llamadas),0),contactados:rows.reduce((a,r)=>a+num(r.Contactados),0),showroom:rows.reduce((a,r)=>a+num(r.Showroom),0),compras:rows.reduce((a,r)=>a+num(r.Compras),0),ventas:rows.reduce((a,r)=>a+num(r.Ventas),0)}
  drawKpis(doc,[{label:'Colaboradores',value:String(totals.colaboradores)},{label:'Visitas',value:`${totals.visitados}/${totals.planificados}`},{label:'Llamadas',value:`${totals.llamadas} / ${totals.contactados}`},{label:'Showroom',value:String(totals.showroom)},{label:'Compras',value:String(totals.compras)},{label:'Ventas',value:pdfMoney(totals.ventas)}],34)

  const primaryHead=[['Colaborador','Cargo','Primera / última gestión','H. operativas','Plan','Visitas','Llamadas','Showroom','Compras','Ventas','Event.','Cumpl. ruta']]
  const primaryBody=rows.map(r=>[text(r.Empleado),text(r.Cargo||r.Tipo),`${text(r.PrimeraGestion)} - ${text(r.UltimaGestion)}`,text(r.HorasOperativas),text(r.Planificados),text(r.Visitados),text(r.Llamadas),text(r.Showroom),text(r.Compras),text(r.Ventas),text(r.Eventualidades),`${text(r['Cumplimiento ruta %'])||'0'}%`])
  autoTable(doc,{head:primaryHead,body:primaryBody,startY:58,theme:'grid',margin:{left:14,right:14,bottom:14},styles:{font:'helvetica',fontSize:7.2,cellPadding:1.7,overflow:'linebreak',valign:'middle',textColor:[45,50,58],lineColor:[226,229,234],lineWidth:0.15},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold',halign:'center',fontSize:6.8},alternateRowStyles:{fillColor:[249,250,251]}})
  doc.addPage();addExecutiveHeader(doc,'Detalle operativo y tiempos',title)
  const detailHead=[['Colaborador','Ventana','T. llamadas*','T. clientes','T. showroom','Trayecto / espera*','T. eventualidades','Contactados','Utilización %','Contacto %','Captaciones']]
  const detailBody=rows.map(r=>[text(r.Empleado),text(r.Ventana),text(r['Tiempo llamadas estimado']),text(r['Tiempo clientes']),text(r['Tiempo showroom']),text(r['Traslado/espera estimado']),text(r['Tiempo eventualidades']),text(r.Contactados),`${text(r['Utilizacion registrada %'])||'0'}%`,`${text(r['Contacto %'])||'0'}%`,text(r.Captaciones)])
  autoTable(doc,{head:detailHead,body:detailBody,startY:36,theme:'grid',margin:{left:14,right:14,bottom:24},styles:{font:'helvetica',fontSize:7.5,cellPadding:2,overflow:'linebreak',valign:'middle',textColor:[45,50,58],lineColor:[226,229,234],lineWidth:0.15},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold',halign:'center',fontSize:7},alternateRowStyles:{fillColor:[249,250,251]}})
  addExecutiveFooter(doc);doc.save(`${title}.pdf`)
}

export async function exportDashboardPdf(date:string,global:any,employees:any[],stats:{clients:number;geo:number;verified:number}){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const logo=await loadLogo();const vendors=employees.filter(e=>e.employee_type==='Vendedor');const managers=employees.filter(e=>e.employee_type==='Gestor')
  doc.setProperties({title:`Resumen Diario ${date}`,subject:'Dashboard ejecutivo diario',author:'Gestión de Ventas Diaria - Almacenes Karaka'})
  addCorporateHeader(doc,'Resumen Diario · Centro de Operaciones',`Fecha operativa ${date} · Vendedores y Gestores analizados por separado.`,logo)
  drawKpis(doc,[{label:'Clientes',value:String(stats.clients),note:`${stats.geo} con GPS`},{label:'Planificados',value:String(global?.planned_clients||0),note:`${global?.route_execution_pct||0}% ejecución`},{label:'Visitados',value:String(global?.visited_clients||0),note:`${global?.received_clients||0} recibidos`},{label:'Llamadas',value:String(global?.calls||0),note:`${global?.call_contact_rate_pct||0}% contacto`},{label:'Compras',value:String(global?.purchase_clients||0),note:'calle + showroom'},{label:'Ventas',value:pdfMoney(Number(global?.sales_amount||0)),note:'monto registrado'}],36)
  drawBars(doc,'Vendedores · visitas vs plan',vendors.map(v=>({label:v.full_name,value:Number(v.visited_clients||0),secondary:Number(v.planned_clients||0)})),14,67,128,76,'planificados')
  drawBars(doc,'Gestores · llamadas vs contactos',managers.map(m=>({label:m.full_name,value:Number(m.calls||0),secondary:Number(m.calls_contacted||0)})),154,67,128,76,'contactados')
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(37,43,51);doc.text('Lectura ejecutiva',14,154)
  doc.setFont('helvetica','normal');doc.setFontSize(7.4);doc.setTextColor(95,104,116)
  const observations=[`Rutas: ${global?.routes_completed||0} cerradas de ${global?.routes_started||0} iniciadas.`,`Showroom: ${global?.showroom_attended||0} atenciones y ${global?.showroom_purchase_clients||0} compras.`,`Captaciones: ${global?.prospects_captured||0}. Clientes con GPS verificado: ${stats.verified}.`]
  observations.forEach((line,i)=>doc.text(`• ${line}`,14,161+i*6))

  doc.addPage();addCorporateHeader(doc,'Ranking operativo por función',`Resumen Diario ${date} · comparación separada por naturaleza del trabajo.`,logo)
  autoTable(doc,{head:[['Vendedor','Plan','Visitados','Cobertura','Compras','Ventas','Utilización']],body:vendors.map(v=>[v.full_name,v.planned_clients||0,v.visited_clients||0,`${v.route_compliance_pct||0}%`,v.purchase_clients||0,pdfMoney(Number(v.sales_amount||0)),`${v.registered_utilization_pct||0}%`]),startY:37,theme:'grid',margin:{left:14,right:14},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:7.5,cellPadding:2,lineColor:[226,229,234],lineWidth:.15},alternateRowStyles:{fillColor:[249,250,251]}})
  const vendorEnd=Number((doc as any).lastAutoTable?.finalY||80)
  doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(37,43,51);doc.text('Gestores · CRM y Showroom',14,vendorEnd+10)
  autoTable(doc,{head:[['Gestor','Llamadas','Contactados','Contacto %','Showroom','Compras','Ventas']],body:managers.map(m=>[m.full_name,m.calls||0,m.calls_contacted||0,`${m.call_contact_rate_pct||0}%`,m.showroom_attended||0,m.purchase_clients||0,pdfMoney(Number(m.sales_amount||0))]),startY:vendorEnd+14,theme:'grid',margin:{left:14,right:14,bottom:18},headStyles:{fillColor:[31,58,95],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:7.5,cellPadding:2,lineColor:[226,229,234],lineWidth:.15},alternateRowStyles:{fillColor:[249,250,251]}})
  addExecutiveFooter(doc);doc.save(`Resumen_Diario_${date}.pdf`)
}

export async function exportExecutiveReportPdf(date:string,rows:any[],summary:any){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const logo=await loadLogo();const vendors=rows.filter(r=>r.employee_type==='Vendedor');const managers=rows.filter(r=>r.employee_type==='Gestor');const others=rows.filter(r=>!['Vendedor','Gestor'].includes(r.employee_type))
  doc.setProperties({title:`Reporte Ejecutivo Diario ${date}`,subject:'Reporte gerencial diario por función',author:'Gestión de Ventas Diaria - Almacenes Karaka'})
  addCorporateHeader(doc,'Reporte Ejecutivo Diario',`Cierre operativo ${date} · Dirección · Vendedores y Gestores separados por función.`,logo)
  drawKpis(doc,[{label:'Colaboradores',value:String(summary?.active_employees||rows.length)},{label:'Visitas',value:`${summary?.visited_clients||0}/${summary?.planned_clients||0}`,note:`${summary?.route_execution_pct||0}% ejecución`},{label:'Llamadas',value:String(summary?.calls||0),note:`${summary?.call_contact_rate_pct||0}% contacto`},{label:'Showroom',value:String(summary?.showroom_attended||0)},{label:'Compras',value:String(summary?.purchase_clients||0)},{label:'Ventas',value:pdfMoney(Number(summary?.sales_amount||0))}],36)
  drawBars(doc,'Vendedores · cobertura de ruta',vendors.map(v=>({label:v.full_name,value:Number(v.route_compliance_pct||0)})),14,68,128,75)
  drawBars(doc,'Gestores · gestiones telefónicas',managers.map(m=>({label:m.full_name,value:Number(m.calls||0),secondary:Number(m.calls_contacted||0)})),154,68,128,75,'contactados')
  doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(98,107,119);doc.text('El PDF separa responsabilidades para evitar comparar actividades de naturaleza distinta.',14,158)

  doc.addPage();addCorporateHeader(doc,'Vendedores · operación de calle',`Reporte Ejecutivo ${date} · cobertura, visitas, compras y ventas.`,logo)
  autoTable(doc,{head:[['Vendedor','Ventana','Plan','Visitados','Recibidos','Cobertura','Compras','Ventas','T. clientes','Trayecto/espera*','Event.']],body:vendors.map(v=>[v.full_name,`${text(v.first_activity_at?new Date(v.first_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—')}–${text(v.last_activity_at?new Date(v.last_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—')}`,v.planned_clients||0,v.visited_clients||0,v.received_clients||0,`${v.route_compliance_pct||0}%`,v.purchase_clients||0,pdfMoney(Number(v.sales_amount||0)),formatSeconds(v.visit_seconds),formatSeconds(v.transit_wait_estimated_seconds),v.incidents||0]),startY:38,theme:'grid',margin:{left:14,right:14,bottom:18},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:7.2,cellPadding:2,lineColor:[226,229,234],lineWidth:.15},alternateRowStyles:{fillColor:[249,250,251]}})

  doc.addPage();addCorporateHeader(doc,'Gestores · CRM y Showroom',`Reporte Ejecutivo ${date} · llamadas, contacto, showroom, compras y ventas.`,logo)
  autoTable(doc,{head:[['Gestor','Ventana','Llamadas','Contactados','Contacto %','T. llamadas*','Showroom','T. showroom','Compras','Ventas','Utilización']],body:managers.map(m=>[m.full_name,`${m.first_activity_at?new Date(m.first_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'}–${m.last_activity_at?new Date(m.last_activity_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'}):'—'}`,m.calls||0,m.calls_contacted||0,`${m.call_contact_rate_pct||0}%`,formatSeconds(m.call_estimated_seconds),m.showroom_attended||0,formatSeconds(m.showroom_seconds),m.purchase_clients||0,pdfMoney(Number(m.sales_amount||0)),`${m.registered_utilization_pct||0}%`]),startY:38,theme:'grid',margin:{left:14,right:14,bottom:18},headStyles:{fillColor:[31,58,95],textColor:[255,255,255],fontStyle:'bold'},styles:{fontSize:7.2,cellPadding:2,lineColor:[226,229,234],lineWidth:.15},alternateRowStyles:{fillColor:[249,250,251]}})

  if(others.length){doc.addPage();addCorporateHeader(doc,'Otras funciones con actividad',`Reporte Ejecutivo ${date}`,logo);autoTable(doc,{head:[['Colaborador','Tipo','Actividad','Compras','Ventas','Tiempo operativo']],body:others.map(r=>[r.full_name,r.employee_type||r.job_title||'',Number(r.visited_clients||0)+Number(r.calls||0)+Number(r.showroom_attended||0),r.purchase_clients||0,pdfMoney(Number(r.sales_amount||0)),formatSeconds(r.operational_seconds)]),startY:38,theme:'grid',headStyles:{fillColor:[92,101,113],textColor:[255,255,255]},styles:{fontSize:7.5}})}
  addExecutiveFooter(doc);doc.save(`Reporte_Ejecutivo_${date}.pdf`)
}

function formatSeconds(value:unknown){const total=Math.max(0,Math.round(Number(value||0)));const h=Math.floor(total/3600);const m=Math.round((total%3600)/60);return h?`${h} h ${m} min`:`${m} min`}

export function exportPdf(title:string, rows:Record<string,unknown>[]) {
  const cols=rows.length?Object.keys(rows[0]):['Sin datos']
  if(cols.includes('Empleado')&&cols.includes('HorasOperativas')&&cols.includes('Ventas')&&cols.length>15){executivePdf(title,rows);return}
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});doc.setProperties({title,author:'Gestion de Ventas Diaria - Almacenes Karaka'})
  addExecutiveHeader(doc,title,'Detalle exportado desde Gestión de Ventas Diaria.')
  const body=rows.map(r=>cols.map(c=>String(r[c]??'')))
  autoTable(doc,{head:[cols],body,startY:33,theme:'grid',margin:{left:10,right:10,bottom:14},styles:{fontSize:7,cellPadding:1.6,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold'},horizontalPageBreak:true,horizontalPageBreakRepeat:0})
  addExecutiveFooter(doc);doc.save(`${title}.pdf`)
}
