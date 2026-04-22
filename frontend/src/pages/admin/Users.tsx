import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShieldCheck, ShieldOff, UserCheck, UserX, RefreshCw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { usersApi, type AdminUser } from '@/api/users';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function UserAvatar({ user }: { user: AdminUser }) {
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  if (user.hasAvatar) {
    return (
      <img
        src={usersApi.avatarUrl(user._id)}
        alt={initials}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="h-9 w-9 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  );
}

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input
  const handleSearch = (val: string) => {
    setSearch(val);
    clearTimeout((window as any).__userSearchTimer);
    (window as any).__userSearchTimer = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', debouncedSearch],
    queryFn: () => usersApi.list({ search: debouncedSearch || undefined, limit: 50 }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: { globalRole?: 'super_admin' | 'member'; isActive?: boolean } }) =>
      usersApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
    },
    onError: () => toast.error('Failed to update user'),
  });

  const users = data?.data ?? [];

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data?.total ?? 0} user{data?.total !== 1 ? 's' : ''} registered
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9 max-w-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">No users found.</p>
            {debouncedSearch && <p className="text-sm mt-1">Try a different search term.</p>}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {users.map((u) => (
                  <div key={u._id} className="flex items-center gap-4 px-4 py-3">
                    <UserAvatar user={u} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        {u.isTotpEnabled && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">2FA</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {u.lastLogin && (
                        <p className="text-xs text-muted-foreground hidden md:block">
                          Last login {timeAgo(u.lastLogin)}
                        </p>
                      )}

                      {/* Role selector */}
                      <Select
                        value={u.globalRole}
                        onValueChange={(val) =>
                          updateMut.mutate({ id: u._id, body: { globalRole: val as 'super_admin' | 'member' } })
                        }
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Active toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={u.isActive ? 'text-green-600 hover:text-red-600' : 'text-red-500 hover:text-green-600'}
                        title={u.isActive ? 'Deactivate user' : 'Activate user'}
                        onClick={() => updateMut.mutate({ id: u._id, body: { isActive: !u.isActive } })}
                        disabled={updateMut.isPending}
                      >
                        {u.isActive ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
