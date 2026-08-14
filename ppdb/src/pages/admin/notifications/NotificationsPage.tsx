import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/Toast'
import { useCan } from '@/hooks/useCan'
import { notificationService } from '@/services/index'
import { Bell, Edit } from 'lucide-react'

const VARS = ['{nama_peserta}', '{username}', '{password}', '{link_login}', '{batas_waktu_bayar}', '{nama_gelombang}', '{tanggal_seleksi}', '{alasan_penolakan}', '{link_pembayaran}', '{nominal_bayar}']

export default function NotificationsPage() {
  const { toast } = useToast()
  const { canCrud } = useCan('notification', 'crud')

  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    label: '',
    channel: '',
    email_subject: '',
    body: '',
    is_active: true
  })

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await notificationService.getTemplates()
      setTemplates(res || [])
    } catch (e: any) {
      toast('error', e.message || 'Gagal memuat template')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  const handleEdit = (tmpl: any) => {
    setSelected(tmpl)
    setFormData({
      label: tmpl.label || '',
      channel: tmpl.channel || 'email',
      email_subject: tmpl.email_subject || '',
      body: tmpl.body || '',
      is_active: tmpl.is_active
    })
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await notificationService.updateTemplate(selected.id, formData)
      toast('success', 'Template berhasil disimpan')
      setIsEditing(false)
      fetchTemplates()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6 text-indigo-500" />
          Template Notifikasi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konfigurasi pesan yang dikirim ke pendaftar via Email / WhatsApp. Variabel tersedia: {VARS.map(v => (
            <code key={v} className="text-xs bg-muted px-1 rounded mx-0.5">{v}</code>
          ))}
        </p>
      </div>

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
                <TableRow><TableCell colSpan={5} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : templates.length === 0 ? (
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
                templates.map((t) => (
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
                        <Button variant="outline" size="sm" onClick={() => handleEdit(t)}>
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
            <Button onClick={handleSave} loading={saving}>Simpan Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
