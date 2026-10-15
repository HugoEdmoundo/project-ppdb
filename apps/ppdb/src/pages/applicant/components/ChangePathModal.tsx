import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useActiveWave } from '@/hooks/useActiveWave'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@/components/ui'
import {
  BookOpen,
  Trophy,
  Award,
  GraduationCap,
  Check,
  ArrowLeftRight,
  Info,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChangePathModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

interface PathOption {
  id: string
  name: string
  subtitle: string
  description: string
  requirementNote: string
  icon: typeof BookOpen
  color: string
}

const PATH_OPTIONS: PathOption[] = [
  {
    id: 'reguler',
    name: 'Reguler',
    subtitle: 'Seleksi Skolastik & Akademik',
    description: 'Jalur tes akademik & skolastik online menggunakan Safe Exam Browser (SEB).',
    requirementNote: 'Hanya perlu 4 dokumen wajib utama (NISN, KK, Akta, Pas Foto)',
    icon: BookOpen,
    color: 'emerald',
  },
  {
    id: 'prestasi',
    name: 'Prestasi',
    subtitle: 'Bakat & Sertifikat Kejuaraan',
    description: 'Jalur khusus dengan portofolio kejuaraan, olimpiade, sains, seni, atau olahraga.',
    requirementNote: 'Wajib 4 dokumen utama + minimal 3 sertifikat prestasi kejuaraan resmi',
    icon: Trophy,
    color: 'blue',
  },
  {
    id: 'tahfidz',
    name: 'Tahfidz',
    subtitle: 'Program Hafalan Al-Qur\'an',
    description: 'Program khusus bagi calon santri penghafal Al-Qur\'an melalui uji komprehensif tartil & tajwid.',
    requirementNote: 'Wajib 4 dokumen utama + minimal 1 surat keterangan/pengakuan hafalan resmi',
    icon: Award,
    color: 'teal',
  },
  {
    id: 'rapot',
    name: 'Rapor',
    subtitle: 'Penelusuran Nilai Rapor',
    description: 'Jalur seleksi berbasis rekam jejak konsistensi nilai rapor sekolah jenjang sebelumnya.',
    requirementNote: 'Wajib 4 dokumen utama + nilai rapor 4 semester terakhir',
    icon: GraduationCap,
    color: 'amber',
  },
]

export default function ChangePathModal({ open, onOpenChange, currentPath }: ChangePathModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { isActive, allowedPaths, isLoading } = useActiveWave()

  const normalizedCurrent = (currentPath || '').trim().toLowerCase()
  const [selectedPath, setSelectedPath] = useState<string>('')

  useEffect(() => {
    if (open) {
      setSelectedPath('')
    }
  }, [open])

  const normalizedAllowed = allowedPaths ? allowedPaths.map(p => p.toLowerCase()) : null

  const isPathAvailable = (pathId: string) => {
    if (!isActive) return false
    if (!normalizedAllowed || normalizedAllowed.length === 0) return true
    return normalizedAllowed.includes(pathId.toLowerCase())
  }

  const changeMutation = useMutation({
    mutationFn: (path: string) => apiFetch('/ppdb/applicants/me/path', {
      method: 'PATCH',
      body: JSON.stringify({ registration_path: path })
    }),
    onSuccess: () => {
      toast('success', 'Jalur pendaftaran berhasil diubah')
      queryClient.invalidateQueries({ queryKey: ['my-transaction'] })
      queryClient.invalidateQueries({ queryKey: ['my-documents'] })
      onOpenChange(false)
    },
    onError: (e: any) => {
      toast('error', e.message || 'Gagal mengubah jalur pendaftaran')
    }
  })

  const hasAnyPathAvailable = PATH_OPTIONS.some(p => isPathAvailable(p.id) && p.id !== normalizedCurrent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2 text-emerald-700">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
              <ArrowLeftRight className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-bold">Ganti Jalur Pendaftaran</DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Pilih jalur seleksi baru yang sesuai dengan kompetensi calon santri. Perubahan jalur akan otomatis menyesuaikan daftar dokumen persyaratan yang perlu Anda unggah.
          </DialogDescription>
        </DialogHeader>

        {/* Info Box */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">Ketentuan Penggantian Jalur:</p>
            <p className="text-blue-800">
              Penggantian jalur hanya dapat dilakukan <strong>sebelum Anda mengunggah dokumen persyaratan pertama</strong>. Setelah dokumen diunggah, jalur akan dikunci otomatis oleh sistem.
            </p>
          </div>
        </div>

        {/* Current Path Highlight */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm">
          <span className="text-slate-500 font-medium">Jalur Anda Saat Ini:</span>
          <Badge variant="outline" className="capitalize font-semibold text-slate-800 bg-white border-slate-300 px-3 py-1">
            {normalizedCurrent || '-'}
          </Badge>
        </div>

        {/* Path Selection Cards */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-semibold text-slate-800 block">
            Pilih Jalur Pendaftaran Baru:
          </label>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Memuat daftar jalur yang dibuka...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PATH_OPTIONS.map((opt) => {
                const isCurrent = opt.id === normalizedCurrent
                const isAvailable = isPathAvailable(opt.id)
                const isSelected = selectedPath === opt.id
                const Icon = opt.icon

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      if (!isAvailable || isCurrent) return
                      setSelectedPath(opt.id)
                    }}
                    className={cn(
                      'relative p-3.5 rounded-xl border-2 transition-all duration-200 text-left flex flex-col justify-between',
                      isCurrent
                        ? 'border-slate-200 bg-slate-50/70 opacity-70 cursor-not-allowed'
                        : isAvailable
                          ? 'cursor-pointer hover:border-emerald-400 hover:shadow-sm'
                          : 'border-slate-200 bg-slate-100/60 opacity-50 cursor-not-allowed',
                      isSelected && isAvailable && 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn(
                            'p-1.5 rounded-lg shrink-0',
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          )}>
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-slate-900 truncate">{opt.name}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{opt.subtitle}</p>
                          </div>
                        </div>

                        {isCurrent ? (
                          <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-700 shrink-0">
                            Saat Ini
                          </Badge>
                        ) : !isAvailable ? (
                          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-300 shrink-0">
                            Ditutup
                          </Badge>
                        ) : isSelected ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {opt.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 mt-1">
                      <p className="text-[11px] text-slate-500">
                        <strong className="text-slate-700">Berkas: </strong>{opt.requirementNote}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {!hasAnyPathAvailable && !isLoading && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Tidak ada jalur lain yang dibuka pada gelombang pendaftaran saat ini.</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={changeMutation.isPending}
            className="w-full sm:w-auto h-11 sm:h-10"
          >
            Batal
          </Button>
          <Button
            type="button"
            disabled={!selectedPath || selectedPath === normalizedCurrent || changeMutation.isPending}
            onClick={() => changeMutation.mutate(selectedPath)}
            className="bg-emerald-primary hover:bg-emerald-dark w-full sm:w-auto h-11 sm:h-10 gap-2 font-semibold"
          >
            {changeMutation.isPending ? (
              <>
                <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <ArrowLeftRight className="h-4 w-4" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
