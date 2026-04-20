import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FolderKanban, Calendar, Users, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { projectsApi, type CreateProjectDto } from '@/api/projects';

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

export default function Dashboard() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const create = useMutation({
    mutationFn: (dto: CreateProjectDto) => projectsApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setOpen(false); reset(); },
  });

  const onSubmit = (data: Form) => {
    create.mutate({ ...data, startDate: new Date(data.startDate).toISOString(), targetEndDate: data.targetEndDate ? new Date(data.targetEndDate).toISOString() : undefined });
  };

  return (
    <AppShell>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-44 rounded-lg bg-white animate-pulse" />)}
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderKanban className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="font-semibold text-foreground">No projects yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Create your first project to get started.</p>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Project</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                    <div className="space-y-2 text-sm text-muted-foreground">
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
            {create.error && <p className="text-xs text-red-600">Failed to create project.</p>}
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
