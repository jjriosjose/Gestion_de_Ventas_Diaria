import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

type Props = { onChange: (dataUrl: string | null) => void; disabled?: boolean }

type Point = { x: number; y: number }

type Bounds = { minX: number; minY: number; maxX: number; maxY: number }

const MIN_SIGNATURE_DISTANCE = 24
const MIN_SIGNATURE_SPAN = 12

export function SignaturePad({ onChange, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<Point | null>(null)
  const inkRef = useRef(false)
  const totalDistanceRef = useRef(0)
  const boundsRef = useRef<Bounds | null>(null)
  const validSignatureRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)
  const [hasValidSignature, setHasValidSignature] = useState(false)

  const resize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
    const snapshot = inkRef.current ? canvas.toDataURL('image/png') : null
    canvas.width = Math.max(1, Math.round(rect.width * ratio))
    canvas.height = Math.max(1, Math.round(rect.height * ratio))
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#17202a'
    if (snapshot) {
      const image = new Image()
      image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height)
      image.src = snapshot
    }
  }

  useEffect(() => {
    resize()
    const listener = () => resize()
    window.addEventListener('resize', listener)
    return () => window.removeEventListener('resize', listener)
  }, [])

  const point = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const includePoint = (next: Point) => {
    const current = boundsRef.current
    boundsRef.current = current
      ? {
          minX: Math.min(current.minX, next.x),
          minY: Math.min(current.minY, next.y),
          maxX: Math.max(current.maxX, next.x),
          maxY: Math.max(current.maxY, next.y),
        }
      : { minX: next.x, minY: next.y, maxX: next.x, maxY: next.y }
  }

  const signatureIsMeaningful = () => {
    const bounds = boundsRef.current
    if (!bounds) return false
    const spanX = bounds.maxX - bounds.minX
    const spanY = bounds.maxY - bounds.minY
    return totalDistanceRef.current >= MIN_SIGNATURE_DISTANCE && Math.max(spanX, spanY) >= MIN_SIGNATURE_SPAN
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const startPoint = point(event)
    lastRef.current = startPoint
    includePoint(startPoint)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return
    event.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    const previous = lastRef.current
    const next = point(event)
    if (!ctx || !previous) return

    const distance = Math.hypot(next.x - previous.x, next.y - previous.y)
    if (distance <= 0) return

    ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(next.x, next.y); ctx.stroke()
    lastRef.current = next
    totalDistanceRef.current += distance
    includePoint(next)
    inkRef.current = true
    if (!hasInk) setHasInk(true)

    const isMeaningful = signatureIsMeaningful()
    validSignatureRef.current = isMeaningful
    if (isMeaningful !== hasValidSignature) setHasValidSignature(isMeaningful)
  }

  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    event.preventDefault()
    drawingRef.current = false
    lastRef.current = null
    const canvas = canvasRef.current
    if (canvas && inkRef.current && validSignatureRef.current) onChange(canvas.toDataURL('image/png'))
    else onChange(null)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    inkRef.current = false
    totalDistanceRef.current = 0
    boundsRef.current = null
    validSignatureRef.current = false
    setHasInk(false)
    setHasValidSignature(false)
    onChange(null)
  }

  return <div className="signature-pad">
    <div className="signature-pad-head"><span>Firma de quien recibe</span><button type="button" onClick={clear} disabled={disabled || !hasInk}><Eraser size={14}/>Limpiar</button></div>
    <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Área de firma"/>
    {!hasInk && <small>Firme con el dedo dentro del recuadro</small>}
    {hasInk && !hasValidSignature && <small>Continúe trazando la firma para poder confirmarla</small>}
  </div>
}
