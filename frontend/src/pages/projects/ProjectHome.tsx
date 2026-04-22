import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, FileText, GitBranch, TestTube, CheckSquare, Settings, ArrowRight, Network, ShieldCheck, ScrollText, UserPlus, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { projectsApi } from '@/api/projects';
import { usersApi } from '@/api/users';
import { toast } from '@/lib/toast';

const phases = [
  { key: 'requirements',  label: 'Requirements',  icon: ClipboardList, path: 'requirements' },
  { key: 'documents',     label: 'Documents',     icon: FileText,      path: 'documents' },
  { key: 'traceability',  label: 'Traceability',  icon: Network,       path: 'traceability' },
  { key: 'testing',       label: 'Test Cases',    icon: TestTube,      path: 'tests' },
  { key: 'fat',           label: 'FAT',           icon: CheckSquare,   path: 'fat' },
  { key: 'verification',  label: 'Verification',  icon: ShieldCheck,   path: 'verification' },
  { key: 'audit',         label: 'Audit Trail',   icon: ScrollText,    path: 'audit' },
];

const memberRoles = [
  { value: 'project_manager',  label: 'Project Manager' },
  { value: 'business_analyst', label: 'Business Analyst' },
  { value: 'architect',        label: 'Architect' },
  { value: 'developer',        label: 'Developer' },
  { value: 'qa_engineer',      label: 'QA Engineer' },
  { value: 'client_viewer',    label: 'Client Viewer' },
  { value: 'client_approver',  label: 'Client Approver' },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  active: 'success', on_hold: 'warning', completed: 'secondary', archived: 'destructive',
};

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [showAddMember, setShowAddMember] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [foundUser, setFoundUser] = useState<{ _id: string; firstName: string; lastName: string; email: string } | null>(null);
  const [memberRole, setMemberRole] = useState('developer');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
  });

  const addMemberMut = useMutation({
    mutationFn: () => projectsApi.addMember(id!, foundUser!._id, memberRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', id] });
      setShowAddMember(false);
      setEmailInput('');
      setFoundUser(null);
      setMemberRole('developer');
      toast.success('Member added to project');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to add member';
      toast.error(msg);
    },
  });

  const handleSearchUser = async () => {
    if (!emailInput.trim()) return;
    setSearching(true);
    setSearchError('');
    setFoundUser(null);
    try {
      const user = await usersApi.findByEmail(emailInput.trim());
      setFoundUser(user);
    } catch {
      setSearchError('No user found with that email address.');
    } finally {
      setSearching(false);
    }
  };

  const resetAddMember = () => {
    setEmailInput('');
    setFoundUser(null);
    setSearchError('');
    setMemberRole('developer');
    setShowAddMember(false);
  };

  if (isLoading) return <AppShell><div className="p-8 text-muted-foreground">Loading…</div></AppShell>;
  if (isError || !project) return <AppShell><div className="p-8 text-red-600">Project not found.</div></AppShell>;

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <Badge variant={statusVariant[project.status] ?? 'secondary'}>{project.status.replace('_', ' ')}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">Client: {project.clientName}</p>
            {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
          </div>
          <Link to={`/projects/${id}/settings`}>
            <Settings className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
          </Link>
        </div>

        {/* Phase navigation */}
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {phases.map(({ key, label, icon: Icon, path }) => {
            const isCurrentPhase = project.currentPhase === key;
            return (
              <Link key={key} to={`/projects/${id}/${path}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer group ${isCurrentPhase ? 'border-brand-600 ring-1 ring-brand-600' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Icon className={`h-5 w-5 ${isCurrentPhase ? 'text-brand-600' : 'text-muted-foreground'}`} />
                      {isCurrentPhase && <Badge variant="default" className="text-xs">Active</Badge>}
                    </div>
                    <CardTitle className="text-sm mt-2 group-hover:text-brand-600 transition-colors">{label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end">
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-brand-600 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Team */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Team ({project.members.length})
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddMember(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1.5" />
            Add Member
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {project.members.map((m, i) => {
                const initials = m.userId
                  ? `${m.userId.firstName[0]}${m.userId.lastName[0]}`.toUpperCase()
                  : '?';
                return (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-brand-600/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-brand-700">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.userId?.firstName ?? '—'} {m.userId?.lastName ?? ''}</p>
                      <p className="text-xs text-muted-foreground">{m.userId?.email ?? ''}</p>
                    </div>
                    <Badge variant="outline">{m.role.replace(/_/g, ' ')}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={resetAddMember}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Find by Email</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="user@example.com"
                  value={emailInput}
                  onChange={(e) => { setEmailInput(e.target.value); setFoundUser(null); setSearchError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                />
                <Button variant="outline" size="sm" onClick={handleSearchUser} disabled={searching || !emailInput.trim()}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              {searchError && <p className="text-xs text-red-600">{searchError}</p>}
            </div>

            {foundUser && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{foundUser.firstName} {foundUser.lastName}</p>
                <p className="text-xs text-muted-foreground">{foundUser.email}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {memberRoles.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={resetAddMember}>Cancel</Button>
            <Button
              disabled={!foundUser || addMemberMut.isPending}
              onClick={() => addMemberMut.mutate()}
            >
              {addMemberMut.isPending ? 'Adding…' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
