import { Dialog, DialogContent, DialogHeader, DialogTitle, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@/components/ui'
import { ShieldCheck } from 'lucide-react'
import ApplicantDocumentsAdmin from './ApplicantDocumentsAdmin'
import ApplicantSelectionAdmin from './ApplicantSelectionAdmin'

interface ApplicantProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  applicant: any
  title?: string
  showPasswordHint?: boolean
}

export default function ApplicantProfileModal({ open, onOpenChange, applicant, title = 'Detail Pendaftar', showPasswordHint = false }: ApplicantProfileModalProps) {
  if (!applicant) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="biodata" className="w-full mt-2">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="biodata">Biodata</TabsTrigger>
            <TabsTrigger value="dokumen">Dokumen</TabsTrigger>
            <TabsTrigger value="seleksi">Seleksi & Nilai</TabsTrigger>
          </TabsList>

          <TabsContent value="biodata" className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Nama Lengkap</p>
                <p className="font-medium">{applicant.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status Pembayaran</p>
                <Badge
                  variant={applicant.payment_status === 'paid' ? 'success' : applicant.payment_status === 'expired' ? 'destructive' : 'warning'}
                  className="mt-1"
                >
                  {applicant.payment_status?.toUpperCase() || 'PENDING'}
                </Badge>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium">{applicant.email || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">No. WhatsApp</p>
                <p className="font-medium">{applicant.phone || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Jalur Pendaftaran</p>
                <p className="font-medium capitalize">{applicant.registration_path || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Jenjang Tujuan</p>
                <p className="font-medium">{applicant.registration_level || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Tempat, Tgl Lahir</p>
                <p className="font-medium">{applicant.birth_place || '-'}, {applicant.birth_date || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Jenis Kelamin</p>
                <p className="font-medium">{applicant.gender === 'L' ? 'Laki-laki' : applicant.gender === 'P' ? 'Perempuan' : '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">NISN</p>
                <p className="font-medium">{applicant.nisn || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">NIK</p>
                <p className="font-medium">{applicant.nik || '-'}</p>
              </div>

              <div className="col-span-1 sm:col-span-2 border-t pt-4 mt-2">
                <h4 className="font-semibold text-sm mb-2">Data Domisili</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Provinsi</p>
                    <p className="font-medium">{applicant.province || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kota/Kabupaten</p>
                    <p className="font-medium">{applicant.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kecamatan</p>
                    <p className="font-medium">{applicant.district || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kelurahan/Desa</p>
                    <p className="font-medium">{applicant.village || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Kode Pos</p>
                    <p className="font-medium">{applicant.postal_code || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Alamat Detail</p>
                    <p className="font-medium">{applicant.address || '-'}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Nama Orang Tua/Wali</p>
                <p className="font-medium">{applicant.parent_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Asal Sekolah</p>
                <p className="font-medium">{applicant.previous_school || '-'}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-xs">Gelombang</p>
                <p className="font-medium">{applicant.wave_name || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Waktu Daftar</p>
                <p className="font-medium">{applicant.created_at ? new Date(applicant.created_at).toLocaleString('id-ID') : '-'}</p>
              </div>
            </div>

            {showPasswordHint && (
              <div className="border-t pt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  Lupa password? Hubungi admin untuk mereset password Anda.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dokumen" className="pt-4">
            <ApplicantDocumentsAdmin applicantId={applicant.id} currentStatus={applicant.status} onVerified={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="seleksi" className="pt-4">
            <ApplicantSelectionAdmin
              applicantId={applicant.id}
              registrationPath={applicant.registration_path}
              applicantStatus={applicant.status}
              onSaved={() => onOpenChange(false)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
