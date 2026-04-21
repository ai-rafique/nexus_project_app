import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { verificationApi, VerifMethod, VerifStatus, VerifEntry } from '@/api/verification';
import { requirementsApi } from '@/api/requirements';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_COLORS: Record<VerifStatus, string> = {
  planned:     'bg-gray-500',
  in_progress: 'bg-blue-600',
  verified:    'bg-green-600',
  failed:      'bg-red-600',
};

const METHOD_LABELS: Record<VerifMethod, string> = {
  test:           'Test',
  review:         'Review',
  analysis:       'Analysis',
  demonstration:  'Demonstration',
};

function getReqLabel(entry: VerifEntry) {
  const r = entry.requirementId;
  if (typeof r === 'object' && r !== null) return `${r.reqId} — ${r.title}`;
  return String(r);
}

export default function VerificationMatrix() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [showAdd, setShowAdd]     = useState(false);
  const [editEntry, setEditEntry] = useState<VerifEntry | null>(null);
  const [form, setForm]           = useState({ requirementId: '', method: 'test' as VerifMethod, reference: '', notes: '' });
  const [editForm, setEditForm]   = useState({ status: 'planned' as VerifStatus, reference: '', notes: '' });

  const { data: matrix, isLoading } = useQuery({
    queryKey: ['verification', projectId],
    queryFn:  () => verificationApi.getMatrix(projectId!),
  });

  const { data: summary } = useQuery({
    queryKey: ['verification-summary', projectId],
    queryFn:  () => verificationApi.getSummary(projectId!),
  });

  const { data: reqsRes } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn:  () => requirementsApi.list(projectId!, {}),
  });
  const reqs = reqsRes?.data ?? [];

  const autoPopulateMut = useMutation({
    mutationFn: () => verificationApi.autoPopulate(projectId!),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['verification', projectId] }); qc.invalidateQueries({ queryKey: ['verification-summary', projectId] }); },
  });

  const addMut = useMutation({
    mutationFn: (body: Parameters<typeof verificationApi.addEntry>[1]) => verificationApi.addEntry(projectId!, body),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['verification', projectId] }); qc.invalidateQueries({ queryKey: ['verification-summary', projectId] }); setShowAdd(false); setForm({ requirementId: '', method: 'test', reference: '', notes: '' }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof verificationApi.updateEntry>[2] }) =>
      verificationApi.updateEntry(projectId!, id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['verification', projectId] }); qc.invalidateQueries({ queryKey: ['verification-summary', projectId] }); setEditEntry(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (entryId: string) => verificationApi.deleteEntry(projectId!, entryId),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['verification', projectId] }); qc.invalidateQueries({ queryKey: ['verification-summary', projectId] }); },
  });

  function openEdit(entry: VerifEntry) {
    setEditEntry(entry);
    setEditForm({ status: entry.status, reference: entry.reference, notes: entry.notes });
  }

  return (
    <AppShell>
      <div className="p-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Verification Matrix</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => autoPopulateMut.mutate()} disabled={autoPopulateMut.isPending}>
              {autoPopulateMut.isPending ? 'Populating…' : 'Auto-populate'}
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Entry</Button>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Coverage', value: `${summary.verificationRate}%` },
              { label: 'Verified', value: summary.verified },
              { label: 'Failed',   value: summary.failed },
              { label: 'Planned',  value: summary.planned },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{label}</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold">{value}</p></CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Requirement</th>
                  <th className="text-left px-4 py-2 font-medium">Method</th>
                  <th className="text-left px-4 py-2 font-medium">Reference</th>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Verified By</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {(matrix?.entries ?? []).map((entry) => (
                  <tr key={entry._id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 max-w-[280px]">
                      <span className="text-xs text-muted-foreground">{getReqLabel(entry)}</span>
                    </td>
                    <td className="px-4 py-2">{METHOD_LABELS[entry.method]}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{entry.reference || '—'}</td>
                    <td className="px-4 py-2">
                      <Badge className={`${STATUS_COLORS[entry.status]} text-white border-0`}>
                        {entry.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {typeof entry.verifiedBy === 'object' && entry.verifiedBy
                        ? `${entry.verifiedBy.firstName} ${entry.verifiedBy.lastName}`
                        : '—'}
                    </td>
                    <td className="px-4 py-2 flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={() => openEdit(entry)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => deleteMut.mutate(entry._id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
                {(matrix?.entries ?? []).length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No entries. Use Auto-populate or add manually.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Verification Entry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Requirement</Label>
                <Select value={form.requirementId} onValueChange={(v) => setForm((f) => ({ ...f, requirementId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select requirement" /></SelectTrigger>
                  <SelectContent>
                    {reqs.map((r) => <SelectItem key={r._id} value={r._id}>{r.reqId} — {r.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm((f) => ({ ...f, method: v as VerifMethod }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(METHOD_LABELS) as [VerifMethod, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="e.g. TC-001" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button disabled={!form.requirementId || addMut.isPending} onClick={() => addMut.mutate(form)}>
                {addMut.isPending ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editEntry} onOpenChange={(o) => !o && setEditEntry(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Entry</DialogTitle></DialogHeader>
            {editEntry && (
              <div className="space-y-3">
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as VerifStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['planned','in_progress','verified','failed'] as VerifStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reference</Label>
                  <Input value={editForm.reference} onChange={(e) => setEditForm((f) => ({ ...f, reference: e.target.value }))} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditEntry(null)}>Cancel</Button>
              <Button disabled={updateMut.isPending} onClick={() => updateMut.mutate({ id: editEntry!._id, body: editForm })}>
                {updateMut.isPending ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
