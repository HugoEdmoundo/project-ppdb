import { useRef, useState } from 'react'
import { Link2, UploadCloud, X } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui"
import { Button } from "@repo/ui"
import { Input } from "@repo/ui"
import { cn } from '@/lib/utils'

interface AvatarEditorProps {
  value: string
  alt?: string
  initials?: string
  onUpload: (file: File) => Promise<string>
  onUrlApplied: (url: string) => void
  className?: string
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

export function AvatarEditor({
  value,
  alt,
  initials,
  onUpload,
  onUrlApplied,
  className,
}: AvatarEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showUrl, setShowUrl] = useState(false)
  const [urlDraft, setUrlDraft] = useState(value || '')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | null | undefined) {
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
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
    } catch (e: any) {
      setError(e.message || 'Gagal mengunggah foto.')
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
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative">
        <Avatar className="h-28 w-28 text-4xl ring-4 ring-primary/10">
          <AvatarImage src={value || undefined} alt={alt || initials || 'Foto profile'} />
          <AvatarFallback className="bg-primary/10 font-bold text-primary">{initials || 'U'}</AvatarFallback>
        </Avatar>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-background transition-transform hover:scale-110 active:scale-95"
          title="Unggah foto dari perangkat"
          aria-label="Unggah foto profile"
        >
          <UploadCloud className={cn('h-4 w-4', uploading && 'animate-pulse')} />
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <UploadCloud className="h-4 w-4" />
            {uploading ? 'Mengunggah...' : 'Upload Foto'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowUrl(true)}>
            <Link2 className="h-4 w-4" />
            Pakai URL
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex gap-2">
            <Input
              type="url"
              value={urlDraft}
              onChange={(e) => {
                setUrlDraft(e.target.value)
                setError(null)
              }}
              placeholder="https://example.com/foto.jpg"
              className="h-9 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  applyUrl()
                }
              }}
            />
            <Button type="button" size="sm" onClick={applyUrl}>
              Terapkan
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowUrl(false)
              setError(null)
            }}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Batalkan
          </button>
        </div>
      )}

      {error && <p className="text-center text-xs font-medium text-destructive">{error}</p>}
      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
        Foto bisa diunggah dari perangkat Anda atau menggunakan URL eksternal.
        Format JPG, PNG, WebP, atau GIF · maksimal 10 MB.
      </p>
    </div>
  )
}
