import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Undo2,
  UserCheck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { AvatarEditor } from '../ui/avatar-editor'
import { cn } from '../../lib/utils'
import { DeviceSessionsCard, formatSessionDateTime } from './device-sessions-card'
import type { ProfileSession, ProfileUserLike } from './types'

export interface ProfileFormValues {
  username: string
  full_name: string
  email: string
  phone: string
  avatar_url: string
}

export interface PasswordFormValues {
  old_password: string
  new_password: string
  confirm_password: string
}

export interface ProfileSubmitPayload extends Record<string, string | undefined> {
  username?: string
  full_name?: string
  email?: string
  phone?: string
  avatar_url?: string
  old_password?: string
  new_password?: string
}

export type ProfileNotify = (
  type: 'success' | 'error' | 'warning',
  message: string,
) => void

export interface ProfilePageProps {
  user: ProfileUserLike | null
  notify: ProfileNotify
  onUploadAvatar: (file: File) => Promise<string>
  onSubmit: (payload: ProfileSubmitPayload) => Promise<void> | void
  onBack?: () => void
  /** Header kustom opsional. Default: header terpadu bersih & ringkas */
  header?: ReactNode
  /** Section tambahan di bawah form — opsional */
  children?: ReactNode

  // ── Sesi perangkat ──
  sessions?: ProfileSession[]
  sessionsLoading?: boolean
  sessionsError?: string | null
  sessionsRefreshing?: boolean
  onRefreshSessions?: () => void
  onRevokeSession?: (id: string) => void | Promise<void>
  revokingSessionId?: string | null
  sessionsDescription?: string

  initialsFallback?: string
  roleLabelFallback?: string
  className?: string
}

function FieldLabel({
  icon: Icon,
  required,
  children,
}: {
  icon: typeof Mail
  required?: boolean
  children: ReactNode
}) {
  return (
    <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <span>{children}</span>
      {required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
    </Label>
  )
}

/**
 * Halaman Profile Akun terpadu (Admin PPDB, Company Profile, dan Superadmin).
 * Kolom kiri: Terdiri dari 3 Container tersusun vertikal dalam SATU area scroll bersama:
 * 1. Container Profil / Avatar & Ringkasan Data Akun
 * 2. Container Informasi Profil (Form Ubah Identitas & Kontak)
 * 3. Container Ganti Password
 * Kolom kanan: Panel Sesi Perangkat mandiri independen (sesuai pola TIU Admin PPDB).
 */
export function ProfilePage({
  user,
  notify,
  onUploadAvatar,
  onSubmit,
  onBack,
  header,
  children,
  sessions,
  sessionsLoading = false,
  sessionsError = null,
  sessionsRefreshing = false,
  onRefreshSessions,
  onRevokeSession,
  revokingSessionId = null,
  sessionsDescription,
  initialsFallback = 'A',
  roleLabelFallback = 'ADMIN',
  className,
}: ProfilePageProps) {
  // State form profil
  const [form, setForm] = useState<ProfileFormValues>({
    username: user?.username || '',
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
  })
  const [prevUserId, setPrevUserId] = useState(user?.id)

  // Undo / Redo history stack (Ctrl+Z)
  const [undoStack, setUndoStack] = useState<ProfileFormValues[]>([])
  const [redoStack, setRedoStack] = useState<ProfileFormValues[]>([])
  const focusSnapshotRef = useRef<ProfileFormValues | null>(null)
  const isEditingRef = useRef(false)

  // Auto-save state
  type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle')
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null)
  const lastSavedFormRef = useRef<ProfileFormValues>({
    username: user?.username || '',
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_url: user?.avatar_url || '',
  })
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // State form password
  const [pwdForm, setPwdForm] = useState<PasswordFormValues>({
    old_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Sinkronkan data saat user berubah / selesai dimuat async
  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id)
    const initialValues: ProfileFormValues = {
      username: user?.username || '',
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatar_url: user?.avatar_url || '',
    }
    setForm(initialValues)
    lastSavedFormRef.current = initialValues
    setUndoStack([])
    setRedoStack([])
    setAutoSaveStatus('idle')
    setAutoSaveError(null)
  }

  const isSuper = user?.user_type === 'superadmin' || !!user?.is_superadmin
  const initials = (user?.full_name || user?.username || initialsFallback)[0]?.toUpperCase()
  const roleLabel = isSuper
    ? 'SUPERADMIN'
    : (user?.role_name || user?.user_type || roleLabelFallback).toUpperCase()

  // Eksekusi auto-save ke backend
  const triggerSave = useCallback(
    async (currentValues: ProfileFormValues) => {
      const trimmedUsername = currentValues.username.trim()
      if (!trimmedUsername) {
        setAutoSaveStatus('error')
        setAutoSaveError('Username tidak boleh kosong')
        return
      }

      const payload: ProfileSubmitPayload = {}
      if (trimmedUsername !== (user?.username || '')) payload.username = trimmedUsername
      if (currentValues.full_name !== (user?.full_name || '')) payload.full_name = currentValues.full_name
      if (isSuper && currentValues.email.trim() !== (user?.email || '')) payload.email = currentValues.email.trim()
      if (currentValues.phone.trim() !== (user?.phone || '')) payload.phone = currentValues.phone.trim()

      if (Object.keys(payload).length === 0) {
        setAutoSaveStatus('saved')
        setAutoSaveError(null)
        lastSavedFormRef.current = { ...currentValues }
        return
      }

      setAutoSaveStatus('saving')
      try {
        await onSubmit(payload)
        lastSavedFormRef.current = { ...currentValues }
        setAutoSaveStatus('saved')
        setAutoSaveError(null)
      } catch (err: unknown) {
        setAutoSaveStatus('error')
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan profil.'
        setAutoSaveError(msg)
        notify('error', msg)
      }
    },
    [isSuper, notify, onSubmit, user?.email, user?.full_name, user?.phone, user?.username],
  )

  function handleInputFocus() {
    focusSnapshotRef.current = { ...form }
    isEditingRef.current = false
  }

  function handleProfileChange(key: keyof ProfileFormValues, value: string) {
    if (!isEditingRef.current && focusSnapshotRef.current) {
      setUndoStack((prev) => [...prev.slice(-20), focusSnapshotRef.current!])
      setRedoStack([])
      isEditingRef.current = true
    }

    const nextForm = { ...form, [key]: value }
    setForm(nextForm)

    if (key === 'username' && !value.trim()) {
      setAutoSaveStatus('error')
      setAutoSaveError('Username tidak boleh kosong')
      return
    }

    setAutoSaveStatus('pending')
    setAutoSaveError(null)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      void triggerSave(nextForm)
    }, 750)
  }

  function handleInputBlur() {
    isEditingRef.current = false
    focusSnapshotRef.current = null
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      void triggerSave(form)
    }
  }

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const previousState = undoStack[undoStack.length - 1]
    const newUndo = undoStack.slice(0, -1)

    setRedoStack((prev) => [...prev, { ...form }])
    setUndoStack(newUndo)
    setForm(previousState)
    focusSnapshotRef.current = null
    isEditingRef.current = false

    notify('warning', 'Perubahan dibatalkan (Ctrl+Z).')
    void triggerSave(previousState)
  }, [form, notify, triggerSave, undoStack])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const nextState = redoStack[redoStack.length - 1]
    const newRedo = redoStack.slice(0, -1)

    setUndoStack((prev) => [...prev, { ...form }])
    setRedoStack(newRedo)
    setForm(nextState)
    focusSnapshotRef.current = null
    isEditingRef.current = false

    notify('success', 'Perubahan dikembalikan (Ctrl+Y).')
    void triggerSave(nextState)
  }, [form, notify, redoStack, triggerSave])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isZ = e.key === 'z' || e.key === 'Z'
      const isY = e.key === 'y' || e.key === 'Y'
      const isCtrlOrMeta = e.ctrlKey || e.metaKey

      if (isCtrlOrMeta && isZ && !e.shiftKey) {
        if (undoStack.length > 0) {
          e.preventDefault()
          handleUndo()
        }
      } else if ((isCtrlOrMeta && isZ && e.shiftKey) || (isCtrlOrMeta && isY)) {
        if (redoStack.length > 0) {
          e.preventDefault()
          handleRedo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleRedo, handleUndo, redoStack.length, undoStack.length])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Pastikan main parent container & aside tidak memunculkan scrollbar visual
  useEffect(() => {
    const mainEl = document.querySelector('main')
    const asideEl = document.querySelector('aside')
    if (mainEl) {
      mainEl.classList.add('no-scrollbar')
      mainEl.style.scrollbarWidth = 'none'
    }
    if (asideEl) {
      asideEl.classList.add('no-scrollbar')
      asideEl.style.scrollbarWidth = 'none'
    }
    return () => {
      if (mainEl) {
        mainEl.classList.remove('no-scrollbar')
        mainEl.style.scrollbarWidth = ''
      }
      if (asideEl) {
        asideEl.classList.remove('no-scrollbar')
        asideEl.style.scrollbarWidth = ''
      }
    }
  }, [])

  function handlePwdChange(key: keyof PasswordFormValues, value: string) {
    setPwdForm((f) => ({ ...f, [key]: value }))
  }

  // Simpan foto avatar langsung saat berhasil di-upload
  async function handleAvatarUpdated(url: string) {
    setForm((f) => ({ ...f, avatar_url: url }))
    try {
      await onSubmit({ avatar_url: url })
      notify('success', 'Foto profil berhasil diperbarui.')
    } catch (err: unknown) {
      notify('error', err instanceof Error ? err.message : 'Gagal menyimpan foto profil.')
    }
  }

  // Ganti Password (Container 3)
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()

    if (!pwdForm.old_password) {
      notify('error', 'Password saat ini wajib diisi.')
      return
    }
    if (!pwdForm.new_password) {
      notify('error', 'Password baru wajib diisi.')
      return
    }
    if (pwdForm.new_password.length < 8) {
      notify('error', 'Password baru minimal 8 karakter.')
      return
    }
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      notify('error', 'Konfirmasi password baru tidak cocok.')
      return
    }

    setSavingPassword(true)
    try {
      await onSubmit({
        old_password: pwdForm.old_password,
        new_password: pwdForm.new_password,
      })
      setPwdForm({
        old_password: '',
        new_password: '',
        confirm_password: '',
      })
      notify('success', 'Password berhasil diperbarui.')
    } catch (err: unknown) {
      notify('error', err instanceof Error ? err.message : 'Gagal memperbarui password.')
    } finally {
      setSavingPassword(false)
    }
  }

  // Validasi real-time konfirmasi password
  const pwdMismatch =
    pwdForm.new_password &&
    pwdForm.confirm_password &&
    pwdForm.new_password !== pwdForm.confirm_password
  const pwdTooShort = pwdForm.new_password && pwdForm.new_password.length < 8
  const canSubmitPassword =
    pwdForm.old_password.trim() &&
    pwdForm.new_password.trim() &&
    pwdForm.confirm_password.trim() &&
    !pwdMismatch &&
    !pwdTooShort

  return (
    <div
      className={cn(
        '-m-3.5 sm:-m-4 md:-m-6 lg:-m-8 flex flex-col lg:flex-row h-auto lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden animate-fade-in no-scrollbar',
        className
      )}
    >
      {/* ── KOLOM KIRI: SATU AREA SCROLL BERSAMA (Seluruh 3 Container ikut bergeser sebagai satu kesatuan) ── */}
      <div
        className="flex-1 min-w-0 min-h-0 p-3.5 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-start space-y-5 sm:space-y-6 overflow-visible lg:overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Header Bersih & Ringkas */}
        {header ?? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/70 shrink-0">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={onBack}
                  aria-label="Kembali"
                  className="h-9 w-9 rounded-xl shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
              <div>
                <h1 className="font-heading text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground">
                  Profile
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Kelola informasi akun, keamanan kata sandi, dan pemantauan sesi aktif.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── CONTAINER 1: Profil / Avatar + Ringkasan Data Akun ── */}
        <Card className="shadow-sm border-border bg-card">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 lg:gap-6">
              {/* Sisi Kiri Container 1: Avatar + Ganti Foto / URL (Clean & Compact) */}
              <div className="flex flex-col items-center text-center shrink-0 w-full sm:w-36 lg:w-40">
                <AvatarEditor
                  value={form.avatar_url}
                  initials={initials}
                  alt={user?.full_name || user?.username || undefined}
                  onUpload={onUploadAvatar}
                  onUrlApplied={handleAvatarUpdated}
                  size="md"
                  hint="JPG, PNG, WebP · Maks. 10 MB"
                />
              </div>

              {/* Divider: Vertikal di desktop/tablet, horizontal di mobile */}
              <div className="hidden sm:block w-px self-stretch bg-border/60 shrink-0" />
              <div className="block sm:hidden w-full h-px bg-border/60" />

              {/* Sisi Kanan Container 1: Sebelahnya baru data-data profile */}
              <div className="flex-1 min-w-0 w-full">
                {/* Header Identitas Pengguna */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-border/60">
                  <div className="min-w-0">
                    <h2 className="font-heading text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                      {user?.full_name || form.full_name || user?.username || form.username || '—'}
                    </h2>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      @{user?.username || form.username || '—'}
                    </p>
                  </div>
                  <Badge
                    variant={isSuper ? 'default' : 'secondary'}
                    className={cn(
                      'text-[10px] px-2.5 py-0.5 font-semibold gap-1 rounded-full shrink-0',
                      isSuper ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''
                    )}
                  >
                    {isSuper ? <ShieldCheck className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                    {roleLabel}
                  </Badge>
                </div>

                {/* 6 Ringkasan Data Akun */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                  {/* 1. Username */}
                  <div className="flex items-start gap-2 min-w-0">
                    <AtSign className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Username</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                        {user?.username || form.username || '—'}
                      </p>
                    </div>
                  </div>

                  {/* 2. Status Akun */}
                  <div className="flex items-start gap-2 min-w-0">
                    <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Status Akun</p>
                      <div className="mt-0.5">
                        {user?.is_active === false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                            <XCircle className="h-3 w-3" /> Nonaktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <CheckCircle2 className="h-3 w-3" /> Aktif
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Email (Col-span-2 agar alamat panjang tidak terpotong) */}
                  <div className="sm:col-span-2 flex items-start gap-2 min-w-0">
                    <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Email</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                        {user?.email || form.email || '—'}
                      </p>
                    </div>
                  </div>

                  {/* 4. No. WhatsApp */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">No. WhatsApp</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                        {user?.phone || form.phone || '—'}
                      </p>
                    </div>
                  </div>

                  {/* 5. Terdaftar Sejak */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Terdaftar Sejak</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                        {formatSessionDateTime(user?.created_at ? user.created_at.replace(' ', 'T') : undefined)}
                      </p>
                    </div>
                  </div>

                  {/* 6. Terakhir Login */}
                  <div className="sm:col-span-2 flex items-start gap-2 min-w-0">
                    <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-muted-foreground">Terakhir Login</p>
                      <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                        {formatSessionDateTime(user?.last_login_at ? user.last_login_at.replace(' ', 'T') : undefined)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── CONTAINER 2: Container Informasi Profil (Auto-save + Ctrl+Z) ── */}
        <Card className="shadow-sm border-border bg-card">
          <div>
            <div className="px-4 sm:px-6 py-3.5 border-b border-border/70 bg-muted/30 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-xs sm:text-sm text-foreground">
                    Informasi Profil
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Perbarui data identitas dasar dan kontak akun Anda.
                  </p>
                </div>
              </div>

              {/* Status Auto-save & Kontrol Undo (Ctrl+Z) */}
              <div className="flex items-center gap-2">
                {autoSaveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium animate-pulse">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Menyimpan...</span>
                  </span>
                )}
                {autoSaveStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Menyimpan...</span>
                  </span>
                )}
                {autoSaveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Tersimpan otomatis</span>
                  </span>
                )}
                {autoSaveStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{autoSaveError || 'Gagal'}</span>
                  </span>
                )}

                {/* Tombol Undo (Ctrl+Z) */}
                {undoStack.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUndo}
                    className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 border-dashed"
                    title="Urungkan perubahan terakhir (Ctrl+Z)"
                  >
                    <Undo2 className="h-3 w-3" />
                    <span>Ctrl+Z</span>
                  </Button>
                )}
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <FieldLabel icon={UserRound}>Nama Lengkap</FieldLabel>
                  <Input
                    value={form.full_name}
                    onFocus={handleInputFocus}
                    onChange={(e) => handleProfileChange('full_name', e.target.value)}
                    onBlur={handleInputBlur}
                    placeholder="Nama lengkap Anda"
                    className="h-9 text-xs"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <FieldLabel icon={AtSign} required>
                    Username
                  </FieldLabel>
                  <Input
                    value={form.username}
                    onFocus={handleInputFocus}
                    onChange={(e) => handleProfileChange('username', e.target.value)}
                    onBlur={handleInputBlur}
                    placeholder="Masukkan username"
                    required
                    className="h-9 text-xs"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <FieldLabel icon={Mail}>Email</FieldLabel>
                  <Input
                    type="email"
                    value={form.email}
                    onFocus={handleInputFocus}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    onBlur={handleInputBlur}
                    placeholder="email@ptdarrahman.sch.id"
                    disabled={!isSuper}
                    className="h-9 text-xs"
                  />
                  {isSuper ? (
                    <p className="text-[11px] text-primary flex items-center gap-1.5 pt-0.5">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      Email dapat diubah — Anda memiliki akses Superadmin.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      Email hanya dapat diubah oleh Superadmin.
                    </p>
                  )}
                </div>

                {/* Nomor WhatsApp */}
                <div className="space-y-1.5">
                  <FieldLabel icon={Phone}>Nomor WhatsApp / HP</FieldLabel>
                  <Input
                    type="tel"
                    value={form.phone}
                    onFocus={handleInputFocus}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    onBlur={handleInputBlur}
                    placeholder="081234567890"
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground pt-0.5">
                    Nomor aktif untuk verifikasi, notifikasi, dan kontak operasional.
                  </p>
                </div>
              </div>

              {/* Catatan Ringkas Auto-save & Petunjuk Ctrl+Z */}
              <div className="pt-2.5 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>Perubahan tersimpan otomatis saat mengetik atau berpindah kolom.</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                  <span>Tekan</span>
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/70 font-sans text-[10px]">Ctrl+Z</kbd>
                  <span>untuk urungkan</span>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* ── CONTAINER 3: Container Ganti Password ── */}
        <Card className="shadow-sm border-border bg-card">
          <form onSubmit={handleChangePassword}>
            <div className="px-4 sm:px-6 py-3.5 border-b border-border/70 bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-xs sm:text-sm text-foreground">
                    Ganti Password
                  </h2>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    Gunakan minimal 8 karakter dengan kombinasi huruf dan angka.
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="p-4 sm:p-6 space-y-4">
              {/* Password Saat Ini */}
              <div className="space-y-1.5 max-w-md">
                <FieldLabel icon={KeyRound}>Password Saat Ini</FieldLabel>
                <div className="relative">
                  <Input
                    type={showOldPassword ? 'text' : 'password'}
                    value={pwdForm.old_password}
                    onChange={(e) => handlePwdChange('old_password', e.target.value)}
                    placeholder="Masukkan password saat ini"
                    autoComplete="current-password"
                    disabled={savingPassword}
                    className="pr-10 h-9 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    tabIndex={-1}
                    aria-label={showOldPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showOldPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Grid Password Baru & Konfirmasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <FieldLabel icon={KeyRound}>Password Baru</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={pwdForm.new_password}
                      onChange={(e) => handlePwdChange('new_password', e.target.value)}
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
                      disabled={savingPassword}
                      className={cn(
                        'pr-10 h-9 text-xs',
                        pwdTooShort && 'border-amber-400 focus-visible:ring-amber-400'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                      aria-label={showNewPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {pwdTooShort && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Minimal 8 karakter.
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <FieldLabel icon={KeyRound}>Konfirmasi Password Baru</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={pwdForm.confirm_password}
                      onChange={(e) => handlePwdChange('confirm_password', e.target.value)}
                      placeholder="Ulangi password baru"
                      autoComplete="new-password"
                      disabled={savingPassword}
                      className={cn(
                        'pr-10 h-9 text-xs',
                        pwdMismatch && 'border-rose-400 focus-visible:ring-rose-400'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                      tabIndex={-1}
                      aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  {pwdMismatch && (
                    <p className="text-[11px] text-rose-600 flex items-center gap-1 pt-0.5">
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Konfirmasi password tidak cocok.
                    </p>
                  )}
                </div>
              </div>

              {/* Footer Tombol Ganti Password */}
              <div className="pt-4 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-muted-foreground">
                  Gunakan password baru ini saat masuk kembali di perangkat lain.
                </p>
                <Button
                  type="submit"
                  disabled={savingPassword || !canSubmitPassword}
                  className="gap-2 h-9 px-5 text-xs font-semibold w-full sm:w-auto shrink-0"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Ganti Password</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </form>
        </Card>

        {/* Section Tambahan (Opsional) */}
        {children}

        {/* Spacer bawah agar tombol & konten paling bawah tidak terpotong saat di-scroll */}
        <div className="h-8 sm:h-12 shrink-0" aria-hidden="true" />
      </div>

      {/* ── KOLOM KANAN: Panel Sesi Perangkat (Sesuai Referensi TIU Admin PPDB - Tidak Diubah) ── */}
      <aside
        className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-muted/30 dark:bg-muted/10 p-3.5 sm:p-4 md:p-6 flex flex-col overflow-visible lg:overflow-y-auto no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <DeviceSessionsCard
          variant="panel"
          sessions={sessions || []}
          loading={sessionsLoading}
          error={sessionsError}
          refreshing={sessionsRefreshing}
          onRefresh={onRefreshSessions}
          onRevoke={onRevokeSession}
          revokingId={revokingSessionId}
          description={sessionsDescription}
        />
      </aside>
    </div>
  )
}
