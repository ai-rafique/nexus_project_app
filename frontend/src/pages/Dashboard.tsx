import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FolderKanban, Calendar, Users, ArrowRight, Activity } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { projectsApi, type CreateProjectDto } from '@/api/projects';
import { auditApi } from '@/api/audit';
import { toast } from '@/lib/toast';

const schema = z.object({
  name:          z.string().min(1, 'Required').max(100),
  clientName:    z.string().min(1, 'Required').max(100),
  startDate:     z.string().min(1, 'Required'),
  targetEndDate: z.string().optional(),
  description:   z.string().max(500).optional(),
});
type Form = z.infer<typeof schema>;

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'secondary' | 'destructive'> = {
  active: 'success', on_hold: 'warning', completed: 'secondary', archived: 'destructive',
};

const phaseLabel: Record<string, string> = {
  requirements: 'Requirements', srs: 'SRS', sds: 'SDS',
  implementation: 'Implementation', testing: 'Testing', fat: 'FAT', delivery: 'Delivery',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ProjectCardSkeleton() {
  return (
    <div className="h-44 rounded-lg bg-white border animate-pulse">
      <div className="p-6 space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="space-y-2 mt-4">
          <div className="h-3 bg-muted rounded w-1/3" />
          <div className="h-3 bg-muted rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="h-24 rounded-lg bg-white border animate-pulse">
      <div className="p-6 space-y-2">
        <div className="h-3 bg-muted rounded w-1/2" />
        <div className="h-7 bg-muted rounded w-1/4 mt-2" />
      </div>
    </div>
  );
}

function actorName(log: ReturnType<typeof auditApi.getGlobalAudit> extends Promise<infer T> ? T['data'][number] : never) {
  const u = log.userId;
  if (typeof u === 'object' && u !== null) return `${u.firstName} ${u.lastName}`;
  return 'System';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => auditApi.getGlobalAudit({ limit: 8 }),
    staleTime: 30_000,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const create = useMutation({
    mutationFn: (dto: CreateProjectDto) => projectsApi.create(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      setOpen(false);
      reset();
      toast.success('Project created', 'Your new project workspace is ready.');
    },
    onError: () => toast.error('Failed to create project', 'Please check your input and try again.'),
  });

  const onSubmit = (data: Form) => {
    create.mutate({
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      targetEndDate: data.targetEndDate ? new Date(data.targetEndDate).toISOString() : undefined,
    });
  };

  // Derived stats
  const totalProjects  = projects.length;
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const totalMembers   = new Set(projects.flatMap((p) => p.members.map((m) => m.userId?._id ?? ''))).size;

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Overview of your SDLC workspace</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {projectsLoading ? (
            <>
              <StatSkeleton /><StatSkeleton /><StatSkeleton />
            </>
          ) : (
            <>
              <StatCard label="Total Projects" value={totalProjects} />
              <StatCard label="Active Projects" value={activeProjects} sub={totalProjects > 0 ? `${Math.round((activeProjects / totalProjects) * 100)}% of all projects` : undefined} />
              <StatCard label="Team Members" value={totalMembers} sub="across all projects" />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Projects grid */}
          <div className="xl:col-span-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Projects</h2>
            {projectsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProjectCardSkeleton /><ProjectCardSkeleton /><ProjectCardSkeleton />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center border rounded-lg bg-white">
                <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold text-foreground">No projects yet</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first project to get started.</p>
                <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Project</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <Link key={p._id} to={`/projects/${p._id}`}>
                    <Card className="hover:shadow-md transition-shadow h-full cursor-pointer group">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base group-hover:text-brand-600 transition-colors">{p.name}</CardTitle>
                          <Badge variant={statusVariant[p.status] ?? 'secondary'}>{p.status.replace('_', ' ')}</Badge>
                        </div>
                        <CardDescription>{p.clientName}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FolderKanban className="h-3.5 w-3.5" />
                            <span>{phaseLabel[p.currentPhase] ?? p.currentPhase}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{new Date(p.startDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3.5 w-3.5" />
                            <span>{p.members.length} member{p.members.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-brand-600 transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5" /> Recent Activity
            </h2>
            <Card>
              <CardContent className="p-0">
                {activityLoading ? (
                  <div className="p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                ) : (recentActivity?.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
                ) : (
                  <div className="divide-y">
                    {(recentActivity?.data ?? []).map((log) => (
                      <div key={log._id} className="px-4 py-3">
                        <p className="text-xs font-medium text-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {actorName(log as any)} · {timeAgo(log.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create project dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Fill in the details to create a new project workspace.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Project name</Label>
              <Input id="p-name" placeholder="e.g. ERP System v2" {...register('name')} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-client">Client name</Label>
              <Input id="p-client" placeholder="e.g. Acme Corp" {...register('clientName')} />
              {errors.clientName && <p className="text-xs text-red-600">{errors.clientName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-start">Start date</Label>
                <Input id="p-start" type="date" {...register('startDate')} />
                {errors.startDate && <p className="text-xs text-red-600">{errors.startDate.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-end">Target end date</Label>
                <Input id="p-end" type="date" {...register('targetEndDate')} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea id="p-desc" placeholder="Brief description…" {...register('description')} />
            </div>
            {create.isError && <p className="text-xs text-red-600">Failed to create project.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? 'Creating…' : 'Create Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
