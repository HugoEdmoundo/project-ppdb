import { useState, useEffect } from 'react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { Card, CardContent } from '../components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Bell, Edit } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export default function NotificationsPage() {
  const { toast } = useToast()
  
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)

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
      const res = await api.apiFetch<any>('/notifications/templates')
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
    try {
      await api.apiFetch(`/notifications/templates/${selected.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      })
      toast('success', 'Template berhasil disimpan')
      setIsEditing(false)
      fetchTemplates()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menyimpan template')
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bell className="h-6 w-6 text-indigo-500" />
          Template Notifikasi
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Konfigurasi pesan yang akan dikirim via Email / WhatsApp. Variabel tersedia: <code className="text-xs bg-muted px-1 rounded">{'{nama_peserta}'}</code>, <code className="text-xs bg-muted px-1 rounded">{'{username}'}</code>, <code className="text-xs bg-muted px-1 rounded">{'{password}'}</code>, <code className="text-xs bg-muted px-1 rounded">{'{link_login}'}</code>, <code className="text-xs bg-muted px-1 rounded">{'{batas_waktu_bayar}'}</code>.
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
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Memuat data...</TableCell></TableRow>
              ) : (
                templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.event_key}</TableCell>
                    <TableCell>{t.label}</TableCell>
                    <TableCell className="uppercase">{t.channel}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? 'default' : 'secondary'}>
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(t)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </TableCell>
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
                <option value="both">Email & WhatsApp</option>
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
              <textarea 
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
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
            <Button onClick={handleSave}>Simpan Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
