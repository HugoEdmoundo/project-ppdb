import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Button } from '@/components/ui'
import { RotateCcw, PenTool, CheckCircle2 } from 'lucide-react'

export interface DigitalSignaturePadRef {
  clear: () => void
  getDataUrl: () => string | null
  isEmpty: () => boolean
}

interface DigitalSignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void
  disabled?: boolean
  className?: string
}

export const DigitalSignaturePad = forwardRef<DigitalSignaturePadRef, DigitalSignaturePadProps>(
  ({ onSignatureChange, disabled = false, className = '' }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [hasDrawn, setHasDrawn] = useState(false)

    // Setup Canvas context
    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Handle retina / high-DPI screens
      const ratio = Math.max(window.devicePixelRatio || 1, 1)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * ratio
      canvas.height = rect.height * ratio
      ctx.scale(ratio, ratio)

      ctx.strokeStyle = '#0f172a' // slate-900
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }, [])

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }
      const rect = canvas.getBoundingClientRect()
      if ('touches' in e) {
        const touch = e.touches[0]
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
      setIsDrawing(true)
    }

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || disabled) return
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { x, y } = getPos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
      if (!hasDrawn) {
        setHasDrawn(true)
      }
    }

    const stopDrawing = () => {
      if (!isDrawing) return
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas && hasDrawn) {
        const dataUrl = canvas.toDataURL('image/png')
        onSignatureChange?.(dataUrl)
      }
    }

    const handleClear = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasDrawn(false)
      onSignatureChange?.(null)
    }

    useImperativeHandle(ref, () => ({
      clear: handleClear,
      getDataUrl: () => {
        if (!hasDrawn || !canvasRef.current) return null
        return canvasRef.current.toDataURL('image/png')
      },
      isEmpty: () => !hasDrawn,
    }))

    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="flex items-center gap-1.5 font-medium">
            <PenTool className="h-3.5 w-3.5 text-emerald-600" />
            Tanda Tangan Digital Orang Tua / Wali
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={!hasDrawn || disabled}
            className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            Ulangi Tanda Tangan
          </Button>
        </div>

        <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden touch-none hover:border-emerald-500 transition-colors shadow-inner">
          <canvas
            ref={canvasRef}
            className="w-full h-36 sm:h-44 cursor-crosshair block"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />

          {/* Watermark Helper Text when empty */}
          {!hasDrawn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-300 select-none space-y-1">
              <PenTool className="h-6 w-6 opacity-40 text-slate-400" />
              <p className="text-xs font-medium text-slate-400">Gambarkan tanda tangan Anda di area kotak ini</p>
              <div className="w-48 h-[1px] bg-slate-200 mt-2 border-b border-dashed border-slate-300" />
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">AREA PENANDATANGAN RESMI</p>
            </div>
          )}

          {hasDrawn && (
            <div className="absolute bottom-2 right-2 pointer-events-none flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Tanda Tangan Terekam
            </div>
          )}
        </div>
      </div>
    )
  }
)

DigitalSignaturePad.displayName = 'DigitalSignaturePad'
export default DigitalSignaturePad
