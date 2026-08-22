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
export function exportPdf(title:string, rows:Record<string,unknown>[]) {
  const doc=new jsPDF({orientation:'landscape'}); doc.setFontSize(16); doc.text(title,14,16); const cols=rows.length?Object.keys(rows[0]):['Sin datos']; const body=rows.map(r=>cols.map(c=>String(r[c]??'')))
  autoTable(doc,{head:[cols],body,startY:22,styles:{fontSize:7},headStyles:{fillColor:[185,28,44]}}); doc.save(`${title}.pdf`)
}
