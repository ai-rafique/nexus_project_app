import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, LogOut, ChevronRight, User, Bell, Settings, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { notificationsApi } from '@/api/notifications';
import { Breadcrumb } from '@/components/Breadcrumb';
import { CommandPalette } from '@/components/CommandPalette';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects',  label: 'Projects',  icon: FolderKanban },
  { to: '/settings',  label: 'Settings',  icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const [showNotifs, setShowNotifs]   = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { data: unread } = useQuery({
    queryKey: ['notifs-count'],
    queryFn: notificationsApi.unreadCount,
    refetchInterval: 30_000,
  });

  const { data: notifs = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    enabled: showNotifs,
  });

  const markReadMut = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifs-count'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-muted overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col bg-brand-900 text-white shrink-0">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-xl font-extrabold tracking-tight">NEXUS</span>
          <p className="text-xs text-white/50 mt-0.5">SDLC Platform</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {active && <ChevronRight className="ml-auto h-3 w-3" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 shrink-0">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-white/50 truncate">{user?.globalRole}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-white/60 hover:text-white hover:bg-white/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#1a1a2e] shrink-0">
          {/* Breadcrumb */}
          <Breadcrumb />

          {/* Right controls */}
          <div className="flex items-center gap-3">
            {/* Search trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-xs border border-white/10 rounded-md px-2.5 py-1.5 hover:border-white/20"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline text-[10px] text-white/30 border border-white/10 rounded px-1">⌘K</kbd>
            </button>

            {/* Notification bell */}
            <div className="relative">
              <button
                className="relative text-white/60 hover:text-white transition-colors"
                onClick={() => setShowNotifs((v) => !v)}
              >
                <Bell className="h-5 w-5" />
                {(unread?.count ?? 0) > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                    {unread!.count}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-8 w-80 bg-[#16213e] border border-[#0f3460] rounded-lg shadow-xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#0f3460]/40">
                    <p className="text-sm font-semibold text-white">Notifications</p>
                    <button onClick={() => markReadMut.mutate()} className="text-xs text-blue-400 hover:underline">
                      Mark all read
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
                    )}
                    {notifs.map((n) => (
                      <div
                        key={n._id}
                        className={cn(
                          'px-4 py-3 border-b border-[#0f3460]/20 cursor-pointer hover:bg-[#0f3460]/20',
                          !n.read && 'bg-[#0f3460]/10',
                        )}
                        onClick={() => {
                          if (n.link) navigate(n.link);
                          setShowNotifs(false);
                        }}
                      >
                        <p className="text-sm font-medium text-white">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
