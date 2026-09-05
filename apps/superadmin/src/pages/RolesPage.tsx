import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, ShieldCheck } from 'lucide-react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { ConfirmDialog } from "../components/ui/confirmdialog"
import type { Role } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Button } from "@/components/ui"
import { Card } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Skeleton } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export default function RolesPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user: currentUser, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()

  const canCrud = currentUser?.user_type === 'superadmin'
  const canView = currentUser?.user_type === 'superadmin'

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmData, setConfirmData] = useState<{ title: string; message: string; variant?: 'danger' | 'primary'; onConfirm: () => void } | null>(null)

  useEffect(() => {
    if (!authLoading && currentUser && !canView) {
      navigate('/')
    }
  }, [currentUser, authLoading, canView, navigate])

  const { data: roles = [], isLoading: loading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
    enabled: canView && !authLoading
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteRole(id),
    onSuccess: () => {
      toast('success', 'Role berhasil dihapus')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (e: any) => {
      toast('error', e.message || 'Gagal menghapus')
    }
  })

  function handleDelete(role: Role) {
    if (!canCrud) return
    if (role.is_superadmin) return
    setConfirmData({
      title: 'Hapus Role',
      message: `Yakin ingin menghapus role "${role.name}"?`,
      variant: 'danger',
      onConfirm: () => {
        setConfirmOpen(false)
        deleteMutation.mutate(role.id)
      },
    })
    setConfirmOpen(true)
  }

  function getPermissionBadges(permissions: Record<string, string>) {
    return Object.entries(permissions).map(([mod, level]) => (
      <Badge key={mod} variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
        {mod}: {level}
      </Badge>
    ))
  }

  if (authLoading || (!authLoading && !canView)) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirmData?.onConfirm()}
        title={confirmData?.title || 'Konfirmasi'}
        message={confirmData?.message || ''}
        variant={confirmData?.variant}
        confirmLabel="Ya, hapus"
        loading={deleteMutation.isPending}
      />
      <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola role dan hak akses pengguna</p>
        </div>
        {canCrud && (
          <Button onClick={() => navigate('/roles/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Buat Role
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-5">
              <div className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : roles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Belum Ada Role"
          description="Belum ada role yang terdaftar. Buat role untuk mengatur hak akses pengguna."
          action={canCrud ? (
            <Button onClick={() => navigate('/roles/new')}>
              <Plus className="mr-2 h-4 w-4" /> Buat Role
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <Card key={role.id} className="p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    role.is_superadmin ? 'bg-purple-100' : role.is_system ? 'bg-orange-100' : 'bg-primary/10'
                  }`}>
                    <ShieldCheck className={`h-5 w-5 ${role.is_superadmin ? 'text-purple-600' : role.is_system ? 'text-orange-600' : 'text-primary'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">{role.name}</h3>
                      {role.is_superadmin && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">SUPERADMIN</Badge>
                      )}
                      {role.is_system && !role.is_superadmin && (
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 uppercase">{role.name}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{role.description || '—'}</p>
                  </div>
                </div>
                {canCrud && !role.is_system && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/roles/${role.id}`)}
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(role)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Hapus
                    </Button>
                  </div>
                )}
              </div>

              {/* Permissions */}
              {!role.is_system && Object.keys(role.permissions || {}).length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Permissions:</span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {getPermissionBadges(role.permissions)}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
    </>
  )
}
