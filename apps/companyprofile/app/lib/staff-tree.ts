import type { Staff } from './types'

export interface StaffTreeNode {
  staff: Staff
  children: StaffTreeNode[]
}

export function buildStaffTree(staff: Staff[]): StaffTreeNode[] {
  const byId = new Map(staff.map((s) => [s.id, s]))
  const childrenOf = new Map<string, Staff[]>()
  const roots: Staff[] = []

  for (const s of staff) {
    const pid = s.content?.parentId
    if (pid && byId.has(pid) && pid !== s.id) {
      const arr = childrenOf.get(pid) ?? []
      arr.push(s)
      childrenOf.set(pid, arr)
    } else {
      roots.push(s)
    }
  }

  const sortByOrder = (a: Staff, b: Staff) =>
    (a.content?.order ?? 0) - (b.content?.order ?? 0) ||
    (a.content?.name ?? '').localeCompare(b.content?.name ?? '')

  const build = (s: Staff, seen: Set<string>): StaffTreeNode => {
    const next = new Set(seen).add(s.id)
    const kids = (childrenOf.get(s.id) ?? [])
      .filter((k) => !next.has(k.id))
      .sort(sortByOrder)
      .map((k) => build(k, next))
    return { staff: s, children: kids }
  }

  return [...roots].sort(sortByOrder).map((s) => build(s, new Set()))
}
