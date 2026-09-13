import ExcelJS from 'exceljs'

const saveBlob=(blob:Blob,name:string)=>{
  const a=document.createElement('a')
  a.href=URL.createObjectURL(blob)
  a.download=name
  a.click()
  setTimeout(()=>URL.revokeObjectURL(a.href),1000)
}

function addSheet(wb:ExcelJS.Workbook,name:string,rows:Record<string,unknown>[]){
  const ws=wb.addWorksheet(name)
  const cols=rows.length?Object.keys(rows[0]):['Sin datos']
  ws.columns=cols.map(key=>({header:key,key,width:Math.min(32,Math.max(12,key.length+2))}))
  rows.forEach(row=>ws.addRow(row))
  ws.views=[{state:'frozen',ySplit:1}]
  ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:Math.max(1,cols.length)}}
  const header=ws.getRow(1)
  header.font={bold:true,color:{argb:'FFFFFFFF'}}
  header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB91C2C'}}
  header.alignment={vertical:'middle'}
  ws.eachRow((row,rowNumber)=>{
    if(rowNumber>1&&rowNumber%2===0)row.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF7F8FA'}}
  })
}

export async function exportRoleReportXlsx(title:string,vendors:Record<string,unknown>[],managers:Record<string,unknown>[]){
  const wb=new ExcelJS.Workbook()
  wb.creator='Gestion de Ventas Diaria'
  wb.created=new Date()
  if(vendors.length)addSheet(wb,'Vendedores',vendors)
  if(managers.length)addSheet(wb,'Gestores',managers)
  if(!vendors.length&&!managers.length)addSheet(wb,'Sin datos',[])
  const buffer=await wb.xlsx.writeBuffer()
  saveBlob(new Blob([buffer as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${title}.xlsx`)
}
