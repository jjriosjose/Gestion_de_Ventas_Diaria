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

function addExecutiveHeader(doc:jsPDF,title:string,subtitle:string){
  const width=doc.internal.pageSize.getWidth()
  doc.setFillColor(185,28,44);doc.rect(0,0,width,7,'F')
  doc.setTextColor(32,36,43);doc.setFont('helvetica','bold');doc.setFontSize(17);doc.text(title,14,18)
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(92,101,113);doc.text(subtitle,14,24)
  doc.setDrawColor(226,229,234);doc.line(14,28,width-14,28)
}

function addExecutiveFooter(doc:jsPDF){
  const pages=doc.getNumberOfPages()
  for(let page=1;page<=pages;page++){
    doc.setPage(page)
    const width=doc.internal.pageSize.getWidth();const height=doc.internal.pageSize.getHeight()
    doc.setDrawColor(226,229,234);doc.line(14,height-10,width-14,height-10)
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(110,118,129)
    doc.text('Almacenes Karaka - Reporte de uso interno',14,height-5)
    doc.text(`Pagina ${page} de ${pages}`,width-14,height-5,{align:'right'})
  }
}

function executivePdf(title:string,rows:Record<string,unknown>[]){
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'})
  doc.setProperties({title,subject:'Reporte Ejecutivo Diario',author:'Gestion de Ventas Diaria - Almacenes Karaka'})
  addExecutiveHeader(doc,title,'Resumen gerencial de actividad, tiempos, cumplimiento y resultados comerciales.')

  const totals={
    colaboradores:rows.length,
    planificados:rows.reduce((a,r)=>a+num(r.Planificados),0),
    visitados:rows.reduce((a,r)=>a+num(r.Visitados),0),
    llamadas:rows.reduce((a,r)=>a+num(r.Llamadas),0),
    contactados:rows.reduce((a,r)=>a+num(r.Contactados),0),
    showroom:rows.reduce((a,r)=>a+num(r.Showroom),0),
    compras:rows.reduce((a,r)=>a+num(r.Compras),0),
    ventas:rows.reduce((a,r)=>a+num(r.Ventas),0),
  }
  const cards=[
    ['Colaboradores',String(totals.colaboradores)],
    ['Visitas',`${totals.visitados}/${totals.planificados}`],
    ['Llamadas',`${totals.llamadas} / ${totals.contactados} cont.`],
    ['Showroom',String(totals.showroom)],
    ['Compras',String(totals.compras)],
    ['Ventas',pdfMoney(totals.ventas)],
  ]
  const left=14,gap=3,top=33,cardH=16,pageW=doc.internal.pageSize.getWidth(),cardW=(pageW-left*2-gap*(cards.length-1))/cards.length
  cards.forEach(([label,value],i)=>{
    const x=left+i*(cardW+gap)
    doc.setFillColor(247,248,250);doc.setDrawColor(226,229,234);doc.roundedRect(x,top,cardW,cardH,2,2,'FD')
    doc.setFont('helvetica','normal');doc.setFontSize(7);doc.setTextColor(102,112,124);doc.text(label,x+3,top+5)
    doc.setFont('helvetica','bold');doc.setFontSize(10.5);doc.setTextColor(31,36,43);doc.text(value,x+3,top+11.5,{maxWidth:cardW-6})
  })

  const primaryHead=[['Colaborador','Cargo','Primera / ultima gestion','H. operativas','Plan','Visitas','Llamadas','Showroom','Compras','Ventas','Event.','Cumpl. ruta']]
  const primaryBody=rows.map(r=>[
    text(r.Empleado),text(r.Cargo||r.Tipo),`${text(r.PrimeraGestion)} - ${text(r.UltimaGestion)}`,text(r.HorasOperativas),text(r.Planificados),text(r.Visitados),text(r.Llamadas),text(r.Showroom),text(r.Compras),text(r.Ventas),text(r.Eventualidades),`${text(r['Cumplimiento ruta %'])||'0'}%`
  ])
  autoTable(doc,{
    head:primaryHead,body:primaryBody,startY:54,theme:'grid',margin:{left:14,right:14,bottom:14},
    styles:{font:'helvetica',fontSize:7.2,cellPadding:1.7,overflow:'linebreak',valign:'middle',textColor:[45,50,58],lineColor:[226,229,234],lineWidth:0.15},
    headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold',halign:'center',fontSize:6.8},
    alternateRowStyles:{fillColor:[249,250,251]},
    columnStyles:{0:{cellWidth:35},1:{cellWidth:25},2:{cellWidth:31},3:{cellWidth:19},4:{cellWidth:14,halign:'center'},5:{cellWidth:15,halign:'center'},6:{cellWidth:16,halign:'center'},7:{cellWidth:17,halign:'center'},8:{cellWidth:16,halign:'center'},9:{cellWidth:25,halign:'right'},10:{cellWidth:15,halign:'center'},11:{cellWidth:20,halign:'center'}}
  })

  doc.addPage()
  addExecutiveHeader(doc,'Detalle operativo y tiempos',title)
  const detailHead=[['Colaborador','Ventana','T. llamadas*','T. clientes','T. showroom','Trayecto / espera*','T. eventualidades','Contactados','Utilizacion %','Contacto %','Captaciones']]
  const detailBody=rows.map(r=>[
    text(r.Empleado),text(r.Ventana),text(r['Tiempo llamadas estimado']),text(r['Tiempo clientes']),text(r['Tiempo showroom']),text(r['Traslado/espera estimado']),text(r['Tiempo eventualidades']),text(r.Contactados),`${text(r['Utilizacion registrada %'])||'0'}%`,`${text(r['Contacto %'])||'0'}%`,text(r.Captaciones)
  ])
  autoTable(doc,{
    head:detailHead,body:detailBody,startY:34,theme:'grid',margin:{left:14,right:14,bottom:24},
    styles:{font:'helvetica',fontSize:7.5,cellPadding:2,overflow:'linebreak',valign:'middle',textColor:[45,50,58],lineColor:[226,229,234],lineWidth:0.15},
    headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold',halign:'center',fontSize:7},
    alternateRowStyles:{fillColor:[249,250,251]},
    columnStyles:{0:{cellWidth:39},1:{cellWidth:32},2:{cellWidth:23,halign:'center'},3:{cellWidth:22,halign:'center'},4:{cellWidth:22,halign:'center'},5:{cellWidth:29,halign:'center'},6:{cellWidth:26,halign:'center'},7:{cellWidth:20,halign:'center'},8:{cellWidth:21,halign:'center'},9:{cellWidth:20,halign:'center'},10:{cellWidth:18,halign:'center'}}
  })
  doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(95,104,116)
  doc.text('* Los tiempos de llamadas y trayecto/espera pueden ser estimados. Visitas, showroom y eventualidades usan marcas reales cuando existen.',14,doc.internal.pageSize.getHeight()-16)
  doc.text('Las categorias pueden solaparse; las horas operativas respetan la ventana identificada de actividad.',14,doc.internal.pageSize.getHeight()-12)
  addExecutiveFooter(doc)
  doc.save(`${title}.pdf`)
}

export function exportPdf(title:string, rows:Record<string,unknown>[]) {
  const cols=rows.length?Object.keys(rows[0]):['Sin datos']
  if(cols.includes('Empleado')&&cols.includes('HorasOperativas')&&cols.includes('Ventas')&&cols.length>15){executivePdf(title,rows);return}
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});doc.setProperties({title,author:'Gestion de Ventas Diaria - Almacenes Karaka'})
  addExecutiveHeader(doc,title,'Detalle exportado desde Gestion de Ventas Diaria.')
  const body=rows.map(r=>cols.map(c=>String(r[c]??'')))
  autoTable(doc,{head:[cols],body,startY:33,theme:'grid',margin:{left:10,right:10,bottom:14},styles:{fontSize:7,cellPadding:1.6,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:[185,28,44],textColor:[255,255,255],fontStyle:'bold'},horizontalPageBreak:true,horizontalPageBreakRepeat:0})
  addExecutiveFooter(doc);doc.save(`${title}.pdf`)
}
