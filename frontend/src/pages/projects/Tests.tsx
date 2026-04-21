import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testsApi } from '@/api/tests';
import { requirementsApi } from '@/api/requirements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const RESULT_COLORS = { pass: 'bg-green-600', fail: 'bg-red-600', blocked: 'bg-yellow-600', na: 'bg-gray-600' };
const STATUS_COLORS = { draft: 'bg-gray-600', active: 'bg-blue-600', deprecated: 'bg-gray-400' };

export default function Tests() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', linkedReqs: [] as string[] });

  // Selected test for run panel
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<string>('pass');
  const [runNotes, setRunNotes] = useState('');

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['tests', projectId, statusFilter],
    queryFn: () => testsApi.list(projectId!, statusFilter !== 'all' ? { status: statusFilter } : undefined),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn: () => requirementsApi.list(projectId!),
  });

  const { data: selectedTest } = useQuery({
    queryKey: ['test', projectId, selectedId],
    queryFn: () => testsApi.get(projectId!, selectedId!),
    enabled: !!selectedId,
  });

  const createMut = useMutation({
    mutationFn: () => testsApi.create(projectId!, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tests', projectId] }); setShowCreate(false); setForm({ title: '', description: '', linkedReqs: [] }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => testsApi.delete(projectId!, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tests', projectId] }); setSelectedId(null); },
  });

  const runMut = useMutation({
    mutationFn: () => testsApi.addRun(projectId!, selectedId!, { result: runResult, notes: runNotes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['test', projectId, selectedId] }); setRunNotes(''); },
  });

  const filtered = tests.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex h-full min-h-screen bg-[#1a1a2e]">
      {/* List pane */}
      <div className="w-80 bg-[#0f1c3a] border-r border-[#0f3460]/40 flex flex-col">
        <div className="p-4 border-b border-[#0f3460]/40 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Test Cases</p>
            <Button className="h-7 text-xs" onClick={() => setShowCreate(true)}>+ New</Button>
          </div>
          <Input className="bg-[#1a1a2e] border-[#0f3460] text-white text-xs h-8" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-[#1a1a2e] border-[#0f3460] text-white text-xs h-8"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white">
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && <p className="text-gray-400 text-xs p-4">Loading…</p>}
          {filtered.map(tc => (
            <button key={tc._id} onClick={() => setSelectedId(tc._id)}
              className={`w-full text-left px-4 py-3 border-b border-[#0f3460]/20 hover:bg-[#16213e] transition-colors ${selectedId === tc._id ? 'bg-[#16213e]' : ''}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs font-bold text-blue-400">{tc.testId}</span>
                <Badge className={`text-[10px] ${STATUS_COLORS[tc.status]} text-white`}>{tc.status}</Badge>
              </div>
              <p className="text-xs text-white truncate">{tc.title}</p>
              {tc.runs && tc.runs.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">Last: {(tc.runs as any).at?.(-1)?.result ?? '—'}</p>
              )}
            </button>
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-gray-500 text-xs p-4 text-center">No test cases yet.</p>
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedTest && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">Select a test case</p>
          </div>
        )}

        {selectedTest && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-blue-400 mb-1">{selectedTest.testId}</p>
                <h1 className="text-xl font-bold text-white">{selectedTest.title}</h1>
                {selectedTest.description && <p className="text-sm text-gray-400 mt-1">{selectedTest.description}</p>}
              </div>
              <div className="flex gap-2">
                <Select value={selectedTest.status} onValueChange={(v) => { testsApi.update(projectId!, selectedTest._id, { status: v as any }); qc.invalidateQueries({ queryKey: ['test', projectId, selectedId] }); qc.invalidateQueries({ queryKey: ['tests', projectId] }); }}>
                  <SelectTrigger className="w-32 h-8 text-xs bg-[#1a1a2e] border-[#0f3460] text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white">
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" className="h-8 text-xs text-red-400 hover:text-red-300" onClick={() => deleteMut.mutate(selectedTest._id)}>Delete</Button>
              </div>
            </div>

            {/* Steps */}
            {selectedTest.steps.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Steps</p>
                <div className="space-y-2">
                  {selectedTest.steps.map((s, i) => (
                    <div key={i} className="bg-[#16213e] border border-[#0f3460]/40 rounded p-3">
                      <p className="text-xs text-gray-400 mb-1">Step {s.order}</p>
                      <p className="text-sm text-white">{s.action}</p>
                      {s.expected && <p className="text-xs text-green-400 mt-1">→ {s.expected}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Linked requirements */}
            {selectedTest.linkedReqs.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Linked Requirements</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTest.linkedReqs.map((r) => (
                    <Badge key={r._id} className="bg-[#0f3460] text-white text-xs">{r.reqId} — {r.title}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Log a run */}
            <div className="bg-[#16213e] border border-[#0f3460]/40 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Log Test Run</p>
              <div className="flex gap-3 mb-3">
                {(['pass','fail','blocked','na'] as const).map(r => (
                  <button key={r} onClick={() => setRunResult(r)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${runResult === r ? RESULT_COLORS[r] + ' text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'}`}>
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
              <Textarea className="bg-[#1a1a2e] border-[#0f3460] text-white text-xs min-h-[60px] mb-3" placeholder="Notes (optional)…" value={runNotes} onChange={e => setRunNotes(e.target.value)} />
              <Button className="w-full h-8 text-xs" disabled={runMut.isPending} onClick={() => runMut.mutate()}>
                {runMut.isPending ? 'Logging…' : 'Log Run'}
              </Button>
            </div>

            {/* Run history */}
            {selectedTest.runs.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Run History ({selectedTest.runs.length})</p>
                <div className="space-y-2">
                  {[...selectedTest.runs].reverse().map((run) => (
                    <div key={run._id} className="flex items-center gap-3 bg-[#16213e] border border-[#0f3460]/20 rounded px-3 py-2">
                      <Badge className={`${RESULT_COLORS[run.result]} text-white text-xs w-14 justify-center`}>{run.result}</Badge>
                      <p className="text-xs text-gray-300 flex-1">{run.notes || '—'}</p>
                      <p className="text-[10px] text-gray-500">{new Date(run.executedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader><DialogTitle>New Test Case</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Verify login with valid credentials" /></div>
            <div><Label>Description</Label><Textarea className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!form.title || createMut.isPending} onClick={() => createMut.mutate()}>
              {createMut.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
