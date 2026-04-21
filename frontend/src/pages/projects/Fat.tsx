import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fatApi, type FatResult } from '@/api/fat';
import { requirementsApi } from '@/api/requirements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const RESULT_COLORS: Record<string, string> = {
  pending: 'bg-gray-600', pass: 'bg-green-600', fail: 'bg-red-600', blocked: 'bg-yellow-600',
};

export default function Fat() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [planTitle, setPlanTitle] = useState('');
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemForm, setItemForm] = useState({ title: '', description: '', linkedReq: '' });
  const [showReport, setShowReport] = useState(false);
  const [execItemId, setExecItemId] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<FatResult>('pass');
  const [execObs, setExecObs] = useState('');

  const { data: plans = [] } = useQuery({ queryKey: ['fat-plans', projectId], queryFn: () => fatApi.list(projectId!) });
  const { data: plan } = useQuery({ queryKey: ['fat-plan', projectId, selectedPlanId], queryFn: () => fatApi.get(projectId!, selectedPlanId!), enabled: !!selectedPlanId });
  const { data: report } = useQuery({ queryKey: ['fat-report', projectId, selectedPlanId], queryFn: () => fatApi.report(projectId!, selectedPlanId!), enabled: !!selectedPlanId && showReport });
  const { data: requirements = [] } = useQuery({ queryKey: ['requirements', projectId], queryFn: () => requirementsApi.list(projectId!) });

  const createPlanMut = useMutation({
    mutationFn: () => fatApi.create(projectId!, { title: planTitle }),
    onSuccess: (p) => { qc.invalidateQueries({ queryKey: ['fat-plans', projectId] }); setSelectedPlanId(p._id); setShowCreate(false); setPlanTitle(''); },
  });

  const addItemMut = useMutation({
    mutationFn: () => fatApi.addItem(projectId!, selectedPlanId!, { ...itemForm, linkedReq: itemForm.linkedReq || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fat-plan', projectId, selectedPlanId] }); setShowAddItem(false); setItemForm({ title: '', description: '', linkedReq: '' }); },
  });

  const execMut = useMutation({
    mutationFn: () => fatApi.updateItem(projectId!, selectedPlanId!, execItemId!, { result: execResult, observations: execObs }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fat-plan', projectId, selectedPlanId] }); setExecItemId(null); setExecObs(''); },
  });

  const signMut = useMutation({
    mutationFn: (itemId: string) => fatApi.signItem(projectId!, selectedPlanId!, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fat-plan', projectId, selectedPlanId] }),
  });

  const STATUS_BADGE: Record<string, string> = { draft: 'bg-gray-600', in_progress: 'bg-yellow-600', completed: 'bg-green-600' };

  return (
    <div className="flex h-full min-h-screen bg-[#1a1a2e]">
      {/* Plan list */}
      <div className="w-64 bg-[#0f1c3a] border-r border-[#0f3460]/40 flex flex-col">
        <div className="p-4 border-b border-[#0f3460]/40 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">FAT Plans</p>
          <Button className="h-7 text-xs" onClick={() => setShowCreate(true)}>+ New</Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {plans.map(p => (
            <button key={p._id} onClick={() => { setSelectedPlanId(p._id); setShowReport(false); }}
              className={`w-full text-left px-4 py-3 border-b border-[#0f3460]/20 hover:bg-[#16213e] ${selectedPlanId === p._id ? 'bg-[#16213e]' : ''}`}>
              <p className="text-xs text-white truncate">{p.title}</p>
              <Badge className={`text-[10px] mt-1 ${STATUS_BADGE[p.status]} text-white`}>{p.status.replace('_',' ')}</Badge>
            </button>
          ))}
          {plans.length === 0 && <p className="text-gray-500 text-xs p-4 text-center">No FAT plans yet.</p>}
        </div>
      </div>

      {/* Plan detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!plan && <div className="flex items-center justify-center h-full text-gray-500">Select a FAT plan</div>}

        {plan && !showReport && (
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-white">{plan.title}</h1>
                <Badge className={`${STATUS_BADGE[plan.status]} text-white text-xs mt-1`}>{plan.status.replace('_',' ')}</Badge>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" className="text-xs h-8" onClick={() => setShowAddItem(true)}>+ Add Item</Button>
                <Button className="text-xs h-8 bg-blue-700 hover:bg-blue-600" onClick={() => setShowReport(true)}>View Report</Button>
              </div>
            </div>

            {/* Summary bar */}
            {plan.items.length > 0 && (() => {
              const total = plan.items.length;
              const passed = plan.items.filter(i => i.result === 'pass').length;
              const failed = plan.items.filter(i => i.result === 'fail').length;
              const pct = Math.round((passed / total) * 100);
              return (
                <div className="bg-[#16213e] border border-[#0f3460]/40 rounded-lg p-4 mb-6 flex items-center gap-6">
                  <div className="text-center"><p className="text-2xl font-bold text-green-400">{pct}%</p><p className="text-xs text-gray-400">Pass Rate</p></div>
                  <div className="flex-1 space-y-1 text-xs text-gray-400">
                    <div className="flex gap-4">
                      <span className="text-green-400">✓ {passed} pass</span>
                      <span className="text-red-400">✗ {failed} fail</span>
                      <span className="text-yellow-400">⊘ {plan.items.filter(i=>i.result==='blocked').length} blocked</span>
                      <span className="text-gray-400">○ {plan.items.filter(i=>i.result==='pending').length} pending</span>
                    </div>
                  </div>
                  <div className="text-center"><p className="text-lg font-bold text-blue-400">{plan.items.filter(i=>i.signedOff).length}/{total}</p><p className="text-xs text-gray-400">Signed off</p></div>
                </div>
              );
            })()}

            {/* Items */}
            <div className="space-y-3">
              {plan.items.map((item, idx) => (
                <div key={item._id} className={`bg-[#16213e] border rounded-lg p-4 ${item.result === 'fail' ? 'border-red-700/60' : 'border-[#0f3460]/40'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">#{idx + 1}</span>
                        <Badge className={`${RESULT_COLORS[item.result]} text-white text-[10px]`}>{item.result}</Badge>
                        {item.signedOff && <Badge className="bg-blue-800 text-white text-[10px]">✓ Signed</Badge>}
                        {item.result === 'fail' && <Badge className="bg-red-900 text-red-300 text-[10px]">⚠ Punch List</Badge>}
                      </div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                      {item.observations && <p className="text-xs text-yellow-300 mt-1 italic">"{item.observations}"</p>}
                      {item.linkedReq && typeof item.linkedReq === 'object' && (
                        <p className="text-xs text-blue-400 mt-1">{(item.linkedReq as any).reqId} — {(item.linkedReq as any).title}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {item.result === 'pending' || !item.signedOff ? (
                        <Button className="h-7 text-xs" onClick={() => { setExecItemId(item._id); setExecResult('pass'); setExecObs(item.observations); }}>
                          {item.result === 'pending' ? 'Execute' : 'Update'}
                        </Button>
                      ) : null}
                      {item.result !== 'pending' && !item.signedOff && (
                        <Button variant="ghost" className="h-7 text-xs text-blue-400 hover:text-blue-300" onClick={() => signMut.mutate(item._id)}>Sign off</Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {plan.items.length === 0 && <p className="text-gray-500 text-sm text-center mt-12">No items yet. Add checklist items to start the FAT.</p>}
            </div>
          </div>
        )}

        {/* Report view */}
        {plan && showReport && report && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-white">FAT Report — {report.title}</h1>
              <Button variant="ghost" className="text-xs h-8" onClick={() => setShowReport(false)}>← Back to Plan</Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Pass Rate', value: `${report.passRate}%`, color: 'text-green-400' },
                { label: 'Passed', value: report.summary.passed, color: 'text-green-400' },
                { label: 'Failed', value: report.summary.failed, color: 'text-red-400' },
                { label: 'Blocked', value: report.summary.blocked, color: 'text-yellow-400' },
                { label: 'Signed Off', value: `${report.summary.signedOff}/${report.summary.total}`, color: 'text-blue-400' },
                { label: 'Status', value: report.status.replace('_',' '), color: 'text-white' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#16213e] border border-[#0f3460]/40 rounded p-3 text-center">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            {report.punchList.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-400 mb-3">Punch List — {report.punchList.length} failed item{report.punchList.length > 1 ? 's' : ''} requiring rework</p>
                <div className="space-y-2">
                  {report.punchList.map((item, i) => (
                    <div key={item._id} className="bg-red-900/20 border border-red-800/40 rounded p-3">
                      <p className="text-xs text-red-400 mb-0.5">#{i + 1}</p>
                      <p className="text-sm text-white font-medium">{item.title}</p>
                      {item.observations && <p className="text-xs text-yellow-300 mt-1 italic">"{item.observations}"</p>}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">Full rework tracking (assignee, re-test, resolution) — planned for future release.</p>
              </div>
            )}

            {report.punchList.length === 0 && (
              <div className="text-center py-8 text-green-400">
                <p className="text-2xl mb-2">✓</p>
                <p className="font-semibold">No failed items — FAT passed cleanly.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create plan dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader><DialogTitle>New FAT Plan</DialogTitle></DialogHeader>
          <div><Label>Title</Label><Input className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white" value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="e.g. FAT — Login Module v1.0" /></div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button disabled={!planTitle || createPlanMut.isPending} onClick={() => createPlanMut.mutate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add item dialog */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader><DialogTitle>Add FAT Item</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white" value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} /></div>
            <div><Label>Description</Label><Textarea className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white" value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} /></div>
            <div>
              <Label>Linked Requirement (optional)</Label>
              <select className="mt-1 w-full bg-[#1a1a2e] border border-[#0f3460] text-white text-sm rounded px-2 py-1.5" value={itemForm.linkedReq} onChange={e => setItemForm({...itemForm, linkedReq: e.target.value})}>
                <option value="">None</option>
                {requirements.map(r => <option key={r._id} value={r._id}>{r.reqId} — {r.title}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddItem(false)}>Cancel</Button>
            <Button disabled={!itemForm.title || addItemMut.isPending} onClick={() => addItemMut.mutate()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute item dialog */}
      <Dialog open={!!execItemId} onOpenChange={(o) => { if (!o) setExecItemId(null); }}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader><DialogTitle>Record Result</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Result</Label>
              <div className="flex gap-2 mt-2">
                {(['pass','fail','blocked'] as FatResult[]).map(r => (
                  <button key={r} onClick={() => setExecResult(r)}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${execResult === r ? RESULT_COLORS[r] + ' text-white' : 'bg-[#1a1a2e] text-gray-400 hover:text-white'}`}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div><Label>Observations</Label><Textarea className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white" value={execObs} onChange={e => setExecObs(e.target.value)} placeholder="What was observed during this test step…" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExecItemId(null)}>Cancel</Button>
            <Button disabled={execMut.isPending} onClick={() => execMut.mutate()}>Save Result</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
