import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import * as api from '../api/client'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/ConfirmDialog'
import type { User, Role } from '../types'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Skeleton } from '../components/ui/skeleton'

export default function UsersPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { confirm, dialog: confirmDialog } = useConfirm()
  const { user: currentUser, loading: authLoading } = useAuth()
  
  const canCrud = currentUser?.user_type === 'superadmin'
  const canView = currentUser?.user_type === 'superadmin'

  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && currentUser && !canView) {
      navigate('/')
    }
  }, [currentUser, authLoading, canView, navigate])

  const fetchData = useCallback(async () => {
    if (!canView) return
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.getUsers({ search: search || undefined }),
        api.getRoles(),
      ])
      const userList = (Array.isArray(usersRes) ? usersRes : (usersRes as any).data || [])
        .filter((u: User) => u.user_type !== 'superadmin')
      setUsers(userList)
      setRoles(rolesRes)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [search, canView])

  useEffect(() => { fetchData() }, [fetchData])

  // Debounce search
  const [searchInput, setSearchInput] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function handleDelete(user: User) {
    if (!canCrud) return
    if (user.user_type === 'superadmin') return
    const ok = await confirm({
      title: 'Hapus User',
      message: `Yakin ingin menghapus user "${user.username}"?`,
      confirmLabel: 'Ya, hapus',
      danger: true,
    })
    if (!ok) return
    setDeleting(user.id)
    try {
      await api.deleteUser(user.id)
      toast('success', 'User berhasil dihapus')
      fetchData()
    } catch (e: any) {
      toast('error', e.message || 'Gagal menghapus')
    } finally {
      setDeleting(null)
    }
  }

  function getRoleName(roleId: string) {
    const role = roles.find(r => r.id === roleId)
    return role?.name || '—'
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
      {confirmDialog}
      <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola admin dan pengguna sistem</p>
        </div>
        {canCrud && (
          <Button onClick={() => navigate('/users/new')}>
            <Plus />
            Buat User
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari username, email, atau nama..."
          className="pl-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <Card className="p-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </Card>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-sm text-muted-foreground">Belum ada user</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table */}
          <Card className="hidden md:block overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    {canCrud && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 text-xs">
                            <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                            <AvatarFallback className="bg-primary/10 font-bold text-primary">
                              {(user.full_name || user.username)?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {user.username}
                          {user.user_type === 'superadmin' && (
                            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">SA</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{user.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{getRoleName(user.role_id)}</TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
                            <UserCheck className="h-3 w-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
                            <UserX className="h-3 w-3" /> Inactive
                          </Badge>
                        )}
                      </TableCell>
                      {canCrud && (
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/users/${user.id}`)}
                            className="mr-2"
                          >
                            <Edit /> Edit
                          </Button>
                          {user.user_type !== 'superadmin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDelete(user)}
                              disabled={deleting === user.id}
                            >
                              <Trash2 /> Hapus
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {users.map((user) => (
              <Card key={user.id} className="space-y-3 p-5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-9 w-9 text-sm">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.username} />
                    <AvatarFallback className="bg-primary/10 font-bold text-primary">
                      {(user.full_name || user.username)?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                      {user.username}
                      {user.user_type === 'superadmin' && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">SA</Badge>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{user.email || '—'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground">Full Name</span>
                    <div className="mt-0.5 font-medium text-foreground">{user.full_name || '—'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Role</span>
                    <div className="mt-0.5 font-medium text-foreground">{getRoleName(user.role_id)}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-1">
                      {user.is_active ? (
                        <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
                          <UserCheck className="h-3 w-3" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 border-destructive/30 bg-destructive/10 text-destructive">
                          <UserX className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {canCrud && (
                  <div className="flex gap-2 border-t border-border pt-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      <Edit /> Edit
                    </Button>
                    {user.user_type !== 'superadmin' && (
                      <Button
                        variant="outline"
                        className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDelete(user)}
                        disabled={deleting === user.id}
                      >
                        <Trash2 /> Hapus
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  )
}
