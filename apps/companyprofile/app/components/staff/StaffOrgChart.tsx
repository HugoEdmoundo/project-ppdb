'use client'

import Image from 'next/image'
import type { Staff } from '@/app/lib/types'
import { buildStaffTree, type StaffTreeNode } from '@/app/lib/staff-tree'

export function StaffOrgChart({
  staff,
  onSelect,
  selectedId,
}: {
  staff: Staff[]
  onSelect?: (s: Staff) => void
  selectedId?: string
}) {
  const roots = buildStaffTree(staff)
  if (roots.length === 0) {
    return <p className="text-sm text-[var(--text-muted)] text-center py-8">Belum ada data staff.</p>
  }
  return (
    <div className="org-tree overflow-x-auto py-4">
      <ul className="inline-flex min-w-full justify-center">
        {roots.map((node) => (
          <TreeNode key={node.staff.id} node={node} onSelect={onSelect} selectedId={selectedId} />
        ))}
      </ul>
    </div>
  )
}

function TreeNode({
  node,
  onSelect,
  selectedId,
}: {
  node: StaffTreeNode
  onSelect?: (s: Staff) => void
  selectedId?: string
}) {
  const s = node.staff
  const p = s.content ?? {}
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect?.(s)}
        className={`flex flex-col items-center w-36 sm:w-40 rounded-xl border p-4 bg-[var(--bg-secondary)] transition-all hover:border-[var(--accent)] hover:shadow-lg ${
          selectedId === s.id ? 'border-[var(--accent)] shadow-lg' : 'border-[var(--border)]'
        }`}
      >
        <span className="block w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--accent)]/20 relative mb-3">
          {s.image ? (
            <Image src={s.image} alt={p.name || ''} fill className="object-cover" sizes="64px" />
          ) : (
            <span className="flex w-full h-full items-center justify-center bg-[var(--bg)] text-[var(--accent)] font-bold">
              {(p.name || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="text-sm font-bold text-center leading-tight">{p.name}</span>
        <span className="text-[11px] text-[var(--accent)] font-medium text-center mt-0.5">{p.position}</span>
      </button>
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeNode key={child.staff.id} node={child} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </ul>
      )}
    </li>
  )
}
