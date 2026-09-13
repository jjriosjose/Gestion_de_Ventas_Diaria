import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import packageInfo from '../../package.json'

const APP_VERSION=packageInfo.version
const A4_LANDSCAPE={width:297,height:210}
const MARGIN=8
const FOOTER_HEIGHT=8
const SECTION_GAP=4

const nextPaint=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))

function addFooter(doc:jsPDF,title:string){
  const pages=doc.getNumberOfPages()
  for(let page=1;page<=pages;page++){
    doc.setPage(page)
    const width=doc.internal.pageSize.getWidth()
    const height=doc.internal.pageSize.getHeight()
    doc.setDrawColor(224,228,234)
    doc.line(MARGIN,height-7,width-MARGIN,height-7)
    doc.setFont('helvetica','normal')
    doc.setFontSize(6.5)
    doc.setTextColor(104,113,124)
    doc.text(`Almacenes Karaka · ${title} · v${APP_VERSION}`,MARGIN,height-3)
    doc.text(`Página ${page} de ${pages}`,width-MARGIN,height-3,{align:'right'})
  }
}

function sliceCanvas(source:HTMLCanvasElement,top:number,height:number){
  const canvas=document.createElement('canvas')
  canvas.width=source.width
  canvas.height=height
  const ctx=canvas.getContext('2d')
  if(!ctx)throw new Error('No fue posible preparar una página del PDF.')
  ctx.fillStyle='#ffffff'
  ctx.fillRect(0,0,canvas.width,canvas.height)
  ctx.drawImage(source,0,top,source.width,height,0,0,source.width,height)
  return canvas
}

async function capture(element:HTMLElement){
  const width=Math.max(element.scrollWidth,Math.ceil(element.getBoundingClientRect().width))
  const height=Math.max(element.scrollHeight,Math.ceil(element.getBoundingClientRect().height))
  const scale=Math.min(1.6,Math.max(1.2,window.devicePixelRatio||1))
  return html2canvas(element,{
    scale,
    useCORS:true,
    allowTaint:false,
    logging:false,
    backgroundColor:'#ffffff',
    width,
    height,
    windowWidth:Math.max(document.documentElement.clientWidth,width),
    ignoreElements:node=>node instanceof HTMLElement&&node.dataset.pdfExclude==='true',
  })
}

export async function exportScreenPdf(rootId:string,fileName:string,title:string){
  const root=document.getElementById(rootId)
  if(!root)throw new Error('No se encontró el contenido que se debe exportar.')

  if(document.fonts?.ready)await document.fonts.ready
  await nextPaint()

  const marked=Array.from(root.querySelectorAll<HTMLElement>('[data-pdf-section="true"]'))
  const sections=marked.length?marked:[root]
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true})
  doc.setProperties({title,subject:'Copia ejecutiva de la pantalla',author:'Gestión de Ventas Diaria - Almacenes Karaka'})

  const contentWidth=A4_LANDSCAPE.width-(MARGIN*2)
  const contentBottom=A4_LANDSCAPE.height-MARGIN-FOOTER_HEIGHT
  const fullHeight=contentBottom-MARGIN
  let page=1
  let y=MARGIN
  let first=true

  for(const section of sections){
    const canvas=await capture(section)
    if(!canvas.width||!canvas.height)continue
    const mmPerPx=contentWidth/canvas.width
    const sectionHeightMm=canvas.height*mmPerPx

    if(sectionHeightMm<=fullHeight){
      if(!first&&y+sectionHeightMm>contentBottom){doc.addPage();page+=1;y=MARGIN}
      doc.setPage(page)
      doc.addImage(canvas.toDataURL('image/png'),'PNG',MARGIN,y,contentWidth,sectionHeightMm,undefined,'FAST')
      y+=sectionHeightMm+SECTION_GAP
      first=false
      continue
    }

    let sourceY=0
    const slicePx=Math.max(1,Math.floor(fullHeight/mmPerPx))
    while(sourceY<canvas.height){
      if(!first){doc.addPage();page+=1}
      const currentHeight=Math.min(slicePx,canvas.height-sourceY)
      const slice=sliceCanvas(canvas,sourceY,currentHeight)
      const sliceHeightMm=currentHeight*mmPerPx
      doc.setPage(page)
      doc.addImage(slice.toDataURL('image/png'),'PNG',MARGIN,MARGIN,contentWidth,sliceHeightMm,undefined,'FAST')
      sourceY+=currentHeight
      y=MARGIN+sliceHeightMm+SECTION_GAP
      first=false
    }
  }

  addFooter(doc,title)
  doc.save(fileName.endsWith('.pdf')?fileName:`${fileName}.pdf`)
}
