import { useRef, useState } from 'react'
import { Link2, UploadCloud, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'
import { Button } from './button'
import { Input } from './input'
import { cn } from '../../lib/utils'

interface AvatarEditorProps {
  value: string
  alt?: string
  initials?: string
  onUpload: (file: File) => Promise<string>
  onUrlApplied: (url: string) => void
  className?: string
  hint?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

const sizeClasses = {
  sm: 'h-16 w-16 text-xl',
  md: 'h-20 w-20 text-2xl',
  lg: 'h-24 w-24 text-3xl',
}

export function AvatarEditor({
  value,
  alt,
  initials,
  onUpload,
  onUrlApplied,
  className,
  hint,
  size = 'md',
}: AvatarEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showUrl, setShowUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | null | undefined) {
    if (!file) return
    if (ACCEPTED_TYPES.indexOf(file.type) === -1) {
      setError('Format tidak didukung. Gunakan JPG, PNG, WebP, atau GIF.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Ukuran file terlalu besar. Maksimal 10 MB.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const res = await onUpload(file)
      onUrlApplied(res)
      setUrlDraft(res)
    } catch (e: unknown) {
      setError((e as Error).message || 'Gagal mengunggah foto.')
    } finally {
      setUploading(false)
    }
  }

  function applyUrl() {
    const u = urlDraft.trim()
    if (!u) {
      setError('Masukkan URL foto terlebih dahulu.')
      return
    }
    setError(null)
    onUrlApplied(u)
    setShowUrl(false)
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative">
        <Avatar className={cn('ring-4 ring-primary/10 transition-all', sizeClasses[size])}>
          <AvatarImage src={value || undefined} alt={alt || initials || 'Foto profile'} />
          <AvatarFallback className="bg-primary/10 font-bold text-primary">
            {initials || 'U'}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background transition-transform hover:scale-110 active:scale-95"
          title="Unggah foto dari perangkat"
          aria-label="Unggah foto profile"
        >
          <UploadCloud className={cn('h-3.5 w-3.5', uploading && 'animate-pulse')} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {!showUrl ? (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-7 text-xs px-2.5 gap-1.5"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            {uploading ? 'Mengunggah...' : 'Upload'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowUrl(true)}
            className="h-7 text-xs px-2.5 gap-1"
          >
            <Link2 className="h-3.5 w-3.5" />
            URL
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-1.5">
          <div className="flex gap-1.5">
            <Input
              type="url"
              value={urlDraft}
              onChange={(e) => { setUrlDraft(e.target.value); setError(null) }}
              placeholder="https://example.com/foto.jpg"
              className="h-8 text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyUrl() } }}
            />
            <Button type="button" size="sm" onClick={applyUrl} className="h-8 text-xs px-3">
              Terapkan
            </Button>
          </div>
          <button
            type="button"
            onClick={() => { setShowUrl(false); setError(null) }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Batalkan
          </button>
        </div>
      )}

      {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}

      {hint !== null && (
        <p className="text-center text-[10px] text-muted-foreground/80 leading-normal max-w-[200px]">
          {hint ?? 'JPG, PNG, WebP · Maks. 10 MB'}
        </p>
      )}
    </div>
  )
}
