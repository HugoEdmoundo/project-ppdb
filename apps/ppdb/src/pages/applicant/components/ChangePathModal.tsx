import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/api/client'
import { useToast } from '@/components/Toast'
import { useActiveWave } from '@/hooks/useActiveWave'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui'
import { Button } from '@/components/ui'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'

interface ChangePathModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPath: string
}

export default function ChangePathModal({ open, onOpenChange, currentPath }: ChangePathModalProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { isActive, allowedPaths, isLoading } = useActiveWave()
  
  const [selectedPath, setSelectedPath] = useState<string>('')

  const paths = [
    { id: 'reguler', name: 'Reguler' },
    { id: 'pindahan', name: 'Pindahan' }
  ]

  const availablePaths = isActive 
    ? paths.filter(p => !allowedPaths || allowedPaths.includes(p.id)) 
    : []

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti Jalur Pendaftaran</DialogTitle>
          <DialogDescription>
            Pilih jalur pendaftaran baru. Anda hanya bisa pindah ke jalur yang sedang dibuka.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Jalur Saat Ini</label>
            <div className="p-3 bg-slate-50 border rounded-md text-slate-500 capitalize">
              {currentPath || '-'}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Jalur Baru</label>
            <Select value={selectedPath} onValueChange={setSelectedPath} disabled={isLoading || availablePaths.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Memuat..." : "Pilih jalur..."} />
              </SelectTrigger>
              <SelectContent>
                {availablePaths.map(p => (
                  <SelectItem key={p.id} value={p.id} disabled={p.id === currentPath}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availablePaths.length === 0 && !isLoading && (
              <p className="text-xs text-red-500 mt-1">Tidak ada jalur yang dibuka saat ini.</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button 
            disabled={!selectedPath || changeMutation.isPending} 
            onClick={() => changeMutation.mutate(selectedPath)}
            className="bg-emerald-primary hover:bg-emerald-dark"
          >
            {changeMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
