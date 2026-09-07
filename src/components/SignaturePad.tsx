import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

type Props = { onChange: (dataUrl: string | null) => void; disabled?: boolean }

export function SignaturePad({ onChange, disabled = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<{ x: number; y: number } | null>(null)
  const inkRef = useRef(false)
  const [hasInk, setHasInk] = useState(false)

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

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastRef.current = point(event)
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return
    event.preventDefault()
    const ctx = canvasRef.current?.getContext('2d')
    const previous = lastRef.current
    const next = point(event)
    if (!ctx || !previous) return
    ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(next.x, next.y); ctx.stroke()
    lastRef.current = next
    inkRef.current = true
    if (!hasInk) setHasInk(true)
  }

  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return
    event.preventDefault()
    drawingRef.current = false
    lastRef.current = null
    const canvas = canvasRef.current
    if (canvas && inkRef.current) onChange(canvas.toDataURL('image/png'))
    else onChange(null)
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    inkRef.current = false; setHasInk(false); onChange(null)
  }

  return <div className="signature-pad">
    <div className="signature-pad-head"><span>Firma de quien recibe</span><button type="button" onClick={clear} disabled={disabled || !hasInk}><Eraser size={14}/>Limpiar</button></div>
    <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} aria-label="Área de firma"/>
    {!hasInk && <small>Firme con el dedo dentro del recuadro</small>}
  </div>
}
