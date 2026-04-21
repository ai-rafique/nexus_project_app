import { useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Upload, Search, Filter, ArrowRight } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { requirementsApi, type CreateRequirementDto } from '@/api/requirements';
import { toast } from '@/lib/toast';

const schema = z.object({
  title:              z.string().min(1, 'Required').max(200),
  description:        z.string().max(5000).optional().default(''),
  acceptanceCriteria: z.string().max(5000).optional().default(''),
  type:     z.enum(['functional','non_functional','constraint','interface']).default('functional'),
  priority: z.enum(['critical','high','medium','low']).default('medium'),
  source:   z.string().max(200).optional().default(''),
});
type Form = z.infer<typeof schema>;

const priorityVariant: Record<string, 'destructive' | 'warning' | 'info' | 'secondary'> = {
  critical: 'destructive', high: 'warning', medium: 'info', low: 'secondary',
};
const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  draft: 'secondary', under_review: 'warning', approved: 'success', deprecated: 'secondary',
};

export default function Requirements() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filters: Record<string, string> = {};
  if (search)         filters.search   = search;
  if (statusFilter)   filters.status   = statusFilter;
  if (priorityFilter) filters.priority = priorityFilter;

  const { data: reqs = [], isLoading } = useQuery({
    queryKey: ['requirements', projectId, filters],
    queryFn:  () => requirementsApi.list(projectId!, Object.keys(filters).length ? filters : undefined),
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'functional', priority: 'medium' },
  });

  const create = useMutation({
    mutationFn: (dto: CreateRequirementDto) => requirementsApi.create(projectId!, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirements', projectId] }); setOpen(false); reset(); toast.success('Requirement created'); },
    onError: () => toast.error('Failed to create requirement'),
  });

  const importMut = useMutation({
    mutationFn: (file: File) => requirementsApi.import(projectId!, file),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['requirements', projectId] }); toast.success(`Imported ${res.imported} requirements`); },
    onError: () => toast.error('Import failed', 'Check your CSV format and try again.'),
  });

  const onSubmit = (data: Form) => create.mutate(data as CreateRequirementDto);

  return (
    <AppShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Requirements</h1>
            <p className="text-sm text-muted-foreground mt-1">{reqs.length} requirement{reqs.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) importMut.mutate(e.target.files[0]); e.target.value = ''; }} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importMut.isPending}>
              <Upload className="h-4 w-4" /> Import CSV
            </Button>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> New Requirement
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter || 'all'} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="under_review">Under review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter || 'all'} onValueChange={(v) => setPriorityFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-lg bg-white animate-pulse" />)}</div>
        ) : reqs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">No requirements found.</p>
            <p className="text-sm mt-1">Create one or import from CSV.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reqs.map((r) => (
              <Link key={r._id} to={`/projects/${projectId}/requirements/${r._id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer group">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{r.reqId}</span>
                      <p className="text-sm font-medium flex-1 group-hover:text-brand-600 transition-colors">{r.title}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={priorityVariant[r.priority]}>{r.priority}</Badge>
                        <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-brand-600 transition-colors" />
                      </div>
                    </div>
                    {r.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 ml-24">
                        {r.tags.map((t) => <span key={t} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t}</span>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Requirement Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New Requirement</DialogTitle>
            <DialogDescription>Add a new requirement to this project.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="r-title">Title</Label>
              <Input id="r-title" placeholder="Short description of the requirement" {...register('title')} />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={watch('type')} onValueChange={(v) => setValue('type', v as Form['type'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="functional">Functional</SelectItem>
                    <SelectItem value="non_functional">Non-functional</SelectItem>
                    <SelectItem value="constraint">Constraint</SelectItem>
                    <SelectItem value="interface">Interface</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={watch('priority')} onValueChange={(v) => setValue('priority', v as Form['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Description</Label>
              <Textarea id="r-desc" placeholder="Detailed description…" rows={3} {...register('description')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-ac">Acceptance Criteria</Label>
              <Textarea id="r-ac" placeholder="How will this be verified?" rows={3} {...register('acceptanceCriteria')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="r-source">Source</Label>
              <Input id="r-source" placeholder="e.g. Client meeting 2026-01-10" {...register('source')} />
            </div>
            {create.error && <p className="text-xs text-red-600">Failed to create requirement.</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Creating…' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
