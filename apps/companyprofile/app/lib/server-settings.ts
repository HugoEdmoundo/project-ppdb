import { API_BASE } from './api'
import type { SettingsItem } from './types'

/**
 * Server-side read of the public `site_settings` keys.
 *
 * `generateMetadata()` and the contact route handler both need values the CMS
 * admin can edit from `/admin/dashboard?tab=settings`. Reading them through one
 * helper keeps the lookup (and its 5s timeout / failure behaviour) in a single
 * place instead of being re-implemented per call site.
 *
 * Never throws: a backend hiccup must degrade to "setting absent" so the
 * caller can fall back to its own default rather than 500 a page render.
 */
export async function getPublicSettings(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${API_BASE}/companyprofile/settings`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return {}
    const rows = (await res.json()) as SettingsItem[]
    const out: Record<string, string> = {}
    for (const row of rows) {
      if (row.value) out[row.key] = row.value
    }
    return out
  } catch {
    return {}
  }
}
