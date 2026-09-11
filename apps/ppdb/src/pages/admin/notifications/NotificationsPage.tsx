import { useState } from 'react'
import { Card, CardContent } from "@/components/ui"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui"
import { Button } from "@/components/ui"
import { Badge } from "@/components/ui"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui"
import { Input } from "@/components/ui"
import { Label } from "@/components/ui"
import { Textarea } from "@/components/ui"
import { EmptyState } from "@/components/ui"
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { notificationService } from '@/services/index'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TableSkeletonRows } from "@/components/ui"
import { Bell, Edit } from 'lucide-react'
import PageHeaderCard from '@/components/shared/PageHeaderCard'

const VARS = ['{nama_peserta}', '{username}', '{email}', '{phone}', '{password}', '{link_login}', '{batas_waktu_bayar}', '{nama_gelombang}', '{tanggal_seleksi}', '{alasan_penolakan}', '{link_pembayaran}', '{nominal_bayar}']

export default function NotificationsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('notification', 'crud')
  const queryClient = useQueryClient()

  const [selected, setSelected] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState({
    label: '',
    channel: '',
    email_subject: '',
    body: '',
    is_active: true
  })

  const { data: templates, isLoading: loading } = useQuery({
    queryKey: ['notification-templates'],
    queryFn: () => notificationService.getTemplates()
  })

  const saveMutation = useMutation({
    mutationFn: (id: string) => notificationService.updateTemplate(id, formData),
    onSuccess: () => {
      toast('success', 'Template berhasil disimpan')
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['notification-templates'] })
    },
    onError: (e: any) => toast('error', e.message || 'Gagal menyimpan template')
  })

  const handleSave = () => {
    if (!selected) return
    saveMutation.mutate(selected.id)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeaderCard
        title="Template Notifikasi"
        description={
          <>
            Konfigurasi pesan yang dikirim ke pendaftar via Email / WhatsApp. Variabel tersedia:{' '}
            {VARS.map(v => (
              <code key={v} className="text-xs bg-muted px-1 rounded mx-0.5">{v}</code>
            ))}
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-primary/5">
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                {canCrud && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeletonRows cols={5} rows={4} />
              ) : (templates || []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8">
                    <EmptyState
                      icon={Bell}
                      title="Belum Ada Template"
                      description="Belum ada template notifikasi yang tersedia."
                      className="bg-transparent border-transparent"
                    />
                  </TableCell>
                </TableRow>
              ) : (
                (templates || []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.event_key}</TableCell>
                    <TableCell>{t.label}</TableCell>
                    <TableCell className="uppercase">{t.channel}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'success' : 'secondary'}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    {canCrud && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => {
                          setSelected(t)
                          setFormData({
                            label: t.label || '',
                            channel: t.channel || 'email',
                            email_subject: t.email_subject || '',
                            body: t.body || '',
                            is_active: t.is_active
                          })
                          setIsEditing(true)
                        }}>
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {selected?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={formData.label}
                onChange={e => setFormData(p => ({ ...p, label: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.channel}
                onChange={e => setFormData(p => ({ ...p, channel: e.target.value }))}
              >
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="both">Email &amp; WhatsApp</option>
              </select>
            </div>
            {(formData.channel === 'email' || formData.channel === 'both') && (
              <div className="space-y-2">
                <Label>Email Subject</Label>
                <Input
                  value={formData.email_subject}
                  onChange={e => setFormData(p => ({ ...p, email_subject: e.target.value }))}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Body Pesan</Label>
              <Textarea
                className="min-h-[200px]"
                value={formData.body}
                onChange={e => setFormData(p => ({ ...p, body: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Mendukung variabel seperti {'{nama_peserta}'}, {'{username}'}, {'{link_login}'}, dll.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="is_active">Aktifkan Notifikasi Ini</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Batal</Button>
            <Button onClick={handleSave} loading={saveMutation.isPending}>Simpan Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
