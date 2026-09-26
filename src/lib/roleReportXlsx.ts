import ExcelJS from 'exceljs'

export type AnalyticalReportWorkbook={
  parameters:Record<string,unknown>[]
  vendors:Record<string,unknown>[]
  managers:Record<string,unknown>[]
  commercialDaily:Record<string,unknown>[]
  journeys:Record<string,unknown>[]
  crmDaily:Record<string,unknown>[]
  showroom:Record<string,unknown>[]
  visits:Record<string,unknown>[]
  calls:Record<string,unknown>[]
}

const saveBlob=(blob:Blob,name:string)=>{
  const a=document.createElement('a')
  a.href=URL.createObjectURL(blob)
  a.download=name
  a.click()
  setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}

const cleanSheetName=(value:string)=>value.replace(/[\\/?*:[\]]/g,' ').slice(0,31)

function addSheet(wb:ExcelJS.Workbook,name:string,rows:Record<string,unknown>[],freezeColumn=0){
  const ws=wb.addWorksheet(cleanSheetName(name))
  const cols=rows.length?Object.keys(rows[0]):['Sin datos']
  ws.columns=cols.map(key=>({
    header:key,
    key,
    width:Math.min(36,Math.max(12,key.length+2)),
  }))
  rows.forEach(row=>ws.addRow(row))
  ws.views=[{state:'frozen',ySplit:1,xSplit:freezeColumn}]
  ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:Math.max(1,cols.length)}}

  const header=ws.getRow(1)
  header.height=22
  header.font={bold:true,color:{argb:'FFFFFFFF'}}
  header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB91C2C'}}
  header.alignment={vertical:'middle',horizontal:'left'}

  cols.forEach((key,index)=>{
    const col=ws.getColumn(index+1)
    const currency=/venta|monto|importe/i.test(key)
    const numeric=/segundos|metros|latitud|longitud|cantidad|compras|llamadas|clientes|visitas|citas|captaciones|jornadas|seguimientos|días|dias/i.test(key)
    if(currency)col.numFmt='[$RD$-es-DO]#,##0.00'
    else if(numeric)col.numFmt='#,##0.00'
  })

  ws.eachRow((row,rowNumber)=>{
    if(rowNumber>1&&rowNumber%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F8FA'}}
    row.alignment={vertical:'top'}
  })
}

export async function exportRoleReportXlsx(title:string,data:AnalyticalReportWorkbook){
  const wb=new ExcelJS.Workbook()
  wb.creator='Gestion de Ventas Diaria'
  wb.company='Almacenes Karaka'
  wb.created=new Date()
  wb.modified=new Date()
  wb.subject='Exportación analítica de Reportes'
  wb.description='Libro analítico con resumen y detalle filtrado para análisis, tablas dinámicas y Power Query.'

  addSheet(wb,'Parametros',data.parameters)
  if(data.vendors.length)addSheet(wb,'Resumen Vendedores',data.vendors,1)
  if(data.managers.length)addSheet(wb,'Resumen Gestores',data.managers,1)
  addSheet(wb,'Comercial Diario',data.commercialDaily,2)
  addSheet(wb,'Jornadas Calle',data.journeys,2)
  addSheet(wb,'CRM Diario',data.crmDaily,2)
  addSheet(wb,'Showroom Detalle',data.showroom,2)
  addSheet(wb,'Visitas Detalle',data.visits,2)
  addSheet(wb,'Llamadas Detalle',data.calls,2)

  const buffer=await wb.xlsx.writeBuffer()
  saveBlob(new Blob([buffer as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${title}.xlsx`)
}
