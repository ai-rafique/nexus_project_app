import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, FileText, GitBranch, TestTube, CheckSquare, Settings, ArrowRight, Network } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { projectsApi } from '@/api/projects';

const phases = [
  { key: 'requirements',  label: 'Requirements',  icon: ClipboardList, path: 'requirements' },
  { key: 'documents',     label: 'Documents',     icon: FileText,      path: 'documents' },
  { key: 'traceability',  label: 'Traceability',  icon: Network,       path: 'traceability' },
  { key: 'testing',       label: 'Test Cases',    icon: TestTube,      path: 'documents' },
  { key: 'fat',           label: 'FAT',           icon: CheckSquare,   path: 'documents' },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  active: 'success', on_hold: 'warning', completed: 'secondary', archived: 'destructive',
};

export default function ProjectHome() {
  const { id } = useParams<{ id: string }>();

  const { data: project, isLoading, isError } = useQuery({
    queryKey: ['project', id],
    queryFn:  () => projectsApi.get(id!),
  });

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
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Team ({project.members.length})</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {project.members.map((m, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{m.userId?.firstName ?? '—'} {m.userId?.lastName ?? ''}</p>
                    <p className="text-xs text-muted-foreground">{m.userId?.email ?? ''}</p>
                  </div>
                  <Badge variant="outline">{m.role.replace(/_/g, ' ')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
