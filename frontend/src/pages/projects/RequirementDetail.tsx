import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Edit2, MessageSquare, Clock } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { requirementsApi } from '@/api/requirements';

const editSchema = z.object({
  title:              z.string().min(1).max(200),
  description:        z.string().max(5000).default(''),
  acceptanceCriteria: z.string().max(5000).default(''),
  type:     z.enum(['functional','non_functional','constraint','interface']),
  priority: z.enum(['critical','high','medium','low']),
  status:   z.enum(['draft','under_review','approved','deprecated']),
  source:   z.string().max(200).default(''),
});
type EditForm = z.infer<typeof editSchema>;

const priorityVariant: Record<string, 'destructive' | 'warning' | 'info' | 'secondary'> = {
  critical: 'destructive', high: 'warning', medium: 'info', low: 'secondary',
};
const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  draft: 'secondary', under_review: 'warning', approved: 'success', deprecated: 'secondary',
};

export default function RequirementDetail() {
  const { id: projectId, reqId } = useParams<{ id: string; reqId: string }>();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [comment, setComment] = useState('');

  const { data: req, isLoading } = useQuery({
    queryKey: ['requirement', projectId, reqId],
    queryFn:  () => requirementsApi.get(projectId!, reqId!),
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: req ? {
      title: req.title, description: req.description, acceptanceCriteria: req.acceptanceCriteria,
      type: req.type, priority: req.priority, status: req.status, source: req.source,
    } : undefined,
  });

  const update = useMutation({
    mutationFn: (dto: Partial<EditForm>) => requirementsApi.update(projectId!, reqId!, dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirement', projectId, reqId] }); setEditing(false); },
  });

  const addComment = useMutation({
    mutationFn: () => requirementsApi.addComment(projectId!, reqId!, comment),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requirement', projectId, reqId] }); setComment(''); },
  });

  if (isLoading) return <AppShell><div className="p-8 text-muted-foreground">Loading…</div></AppShell>;
  if (!req)      return <AppShell><div className="p-8 text-red-600">Not found.</div></AppShell>;

  return (
    <AppShell>
      <div className="p-8 max-w-4xl">
        {/* Back + header */}
        <Link to={`/projects/${projectId}/requirements`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Requirements
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{req.reqId}</span>
            <Badge variant={priorityVariant[req.priority]}>{req.priority}</Badge>
            <Badge variant={statusVariant[req.status]}>{req.status.replace('_', ' ')}</Badge>
            <Badge variant="outline">v{req.version}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
            <Edit2 className="h-4 w-4" /> {editing ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit((d) => update.mutate(d))} className="space-y-4 mb-8">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input {...register('title')} />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={watch('type')} onValueChange={(v) => setValue('type', v as EditForm['type'])}>
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
                <Select value={watch('priority')} onValueChange={(v) => setValue('priority', v as EditForm['priority'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={watch('status')} onValueChange={(v) => setValue('status', v as EditForm['status'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={4} {...register('description')} />
            </div>
            <div className="space-y-1.5">
              <Label>Acceptance Criteria</Label>
              <Textarea rows={4} {...register('acceptanceCriteria')} />
            </div>
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input {...register('source')} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save changes'}</Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6 mb-8">
            <h1 className="text-xl font-bold">{req.title}</h1>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div><p className="text-muted-foreground mb-1">Type</p><p className="font-medium capitalize">{req.type.replace('_', ' ')}</p></div>
              <div><p className="text-muted-foreground mb-1">Source</p><p className="font-medium">{req.source || '—'}</p></div>
            </div>
            {req.description && (
              <div>
                <p className="text-sm font-semibold mb-2">Description</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{req.description}</p>
              </div>
            )}
            {req.acceptanceCriteria && (
              <div>
                <p className="text-sm font-semibold mb-2">Acceptance Criteria</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{req.acceptanceCriteria}</p>
              </div>
            )}
            {req.tags?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {req.tags.map((t) => <span key={t} className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">{t}</span>)}
              </div>
            )}
          </div>
        )}

        <Separator className="my-6" />

        {/* Version history */}
        {req.versionHistory?.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Version History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {[...req.versionHistory].reverse().map((v, i) => (
                  <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                    <span className="font-mono text-muted-foreground">v{v.version}</span>
                    <span className="flex-1 mx-4 truncate">{v.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(v.changedAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Comments */}
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4" /> Comments ({req.comments?.length ?? 0})
          </h2>
          <div className="space-y-3 mb-4">
            {req.comments?.map((c) => (
              <div key={c._id} className="bg-muted rounded-lg px-4 py-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium">{typeof c.userId === 'object' ? `${c.userId.firstName} ${c.userId.lastName}` : 'User'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-sm">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder="Add a comment…"
              rows={2}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              disabled={!comment.trim() || addComment.isPending}
              onClick={() => addComment.mutate()}
            >
              Post
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
