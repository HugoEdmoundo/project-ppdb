'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { User, LogOut } from 'lucide-react'

const ALLOWED_AVATAR_DOMAINS = [
  'dkynlzmpwndadmbqokry.supabase.co',
  'supabase.co',
  'res.cloudinary.com',
  'images.unsplash.com',
]

function isValidAvatarUrl(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    return ALLOWED_AVATAR_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d))
  } catch {
    return false
  }
}

interface Props {
  username: string
  fullName: string
  email: string
  avatarUrl: string
  roleName: string
  onProfile: () => void
  onLogout: () => void
}

export default function ProfileDropdown({ username, fullName, email, avatarUrl, roleName, onProfile, onLogout }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const displayName = fullName || username
  const avatarSrc = isValidAvatarUrl(avatarUrl) ? avatarUrl : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=1E8449&color=fff&size=72&bold=true`

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-[var(--accent-subtle)] transition-all active:scale-95"
        aria-label="Buka profil"
      >
        <Image src={avatarSrc} alt="" width={36} height={36} className="w-full h-full rounded-full object-cover" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-lg py-2 z-50"
          style={{ animation: 'modalIn 0.15s ease-out' }}
        >
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <div className="text-sm font-bold text-[var(--text)] truncate">{displayName}</div>
            <div className="text-xs text-[var(--text-muted)] truncate">{roleName || email || username}</div>
          </div>

          <button
            onClick={() => { setOpen(false); onProfile() }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-all"
          >
            <User className="w-4 h-4 text-[var(--text-muted)]" />
            Profile
          </button>

          <div className="border-t border-[var(--border)] mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onLogout() }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
