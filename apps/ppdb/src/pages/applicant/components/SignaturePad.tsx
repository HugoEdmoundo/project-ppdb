import { useState, useRef } from 'react'
import { Button } from '@/components/ui'

export default function SignaturePad({ onSign, signing }: { onSign: (sig: string) => void, signing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.beginPath()
    ctx.moveTo(clientX - rect.left, clientY - rect.top)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineTo(clientX - rect.left, clientY - rect.top)
    ctx.stroke()
    setHasSignature(true)
  }

  const stopDraw = () => setIsDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const submit = () => {
    if (!hasSignature) return
    const dataUrl = canvasRef.current!.toDataURL('image/png')
    onSign(dataUrl)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tanda tangani di area bawah ini menggunakan mouse atau jari (layar sentuh):</p>
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden">
        <canvas
          ref={canvasRef}
          width={440}
          height={200}
          className="w-full touch-none bg-white cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={clear} disabled={signing}>Hapus</Button>
        <Button type="button" onClick={submit} disabled={!hasSignature || signing}>
          {signing ? 'Menyimpan...' : 'Simpan Tanda Tangan'}
        </Button>
      </div>
    </div>
  )
}
