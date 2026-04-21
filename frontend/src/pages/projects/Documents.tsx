import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/api/documents';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  in_review: 'bg-yellow-500',
  client_review: 'bg-blue-500',
  approved: 'bg-green-500',
  superseded: 'bg-gray-400',
};

const DOC_TYPES = [
  { value: 'srs', label: 'SRS — Software Requirements Specification' },
  { value: 'sds', label: 'SDS — Software Design Specification' },
  { value: 'fat_plan', label: 'FAT Plan' },
  { value: 'fat_report', label: 'FAT Report' },
  { value: 'verification_matrix', label: 'Verification Matrix' },
];

export default function Documents() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: 'srs', title: '', version: '1.0' });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => documentsApi.list(projectId!),
  });

  const createMut = useMutation({
    mutationFn: () => documentsApi.create(projectId!, form),
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      setShowCreate(false);
      toast.success('Document created');
      navigate(`/projects/${projectId}/documents/${doc._id}`);
    },
    onError: () => toast.error('Failed to create document'),
  });

  const deleteMut = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(projectId!, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', projectId] }); toast.success('Document deleted'); },
    onError: () => toast.error('Failed to delete document'),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Document Centre</h1>
        <Button onClick={() => setShowCreate(true)}>+ New Document</Button>
      </div>

      {isLoading && <p className="text-gray-400">Loading…</p>}

      {!isLoading && docs.length === 0 && (
        <p className="text-gray-400 text-center mt-20">No documents yet. Create one to get started.</p>
      )}

      <div className="space-y-3">
        {docs.map((doc) => (
          <div
            key={doc._id}
            className="bg-[#16213e] border border-[#0f3460]/40 rounded-lg p-4 flex items-center justify-between hover:border-[#0f3460] transition-colors"
          >
            <button
              className="flex-1 text-left"
              onClick={() => navigate(`/projects/${projectId}/documents/${doc._id}`)}
            >
              <p className="text-white font-medium">{doc.title}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {doc.type.toUpperCase().replace('_', ' ')} · v{doc.version}
              </p>
            </button>
            <div className="flex items-center gap-3">
              <Badge className={`${STATUS_COLORS[doc.status]} text-white text-xs`}>
                {doc.status.replace('_', ' ')}
              </Badge>
              <a
                href={documentsApi.pdfUrl(projectId!, doc._id)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                PDF
              </a>
              <button
                className="text-red-400 hover:text-red-300 text-xs"
                onClick={(e) => { e.stopPropagation(); deleteMut.mutate(doc._id); }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader>
            <DialogTitle>New Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white">
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. System Requirements Specification"
              />
            </div>
            <div>
              <Label>Version</Label>
              <Input
                className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0"
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!form.title || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
