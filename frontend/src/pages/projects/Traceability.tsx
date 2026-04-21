import { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { tracelinksApi, type TraceNodeType, type LinkType, type GraphNode } from '@/api/tracelinks';
import { requirementsApi } from '@/api/requirements';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// ── Node colours by type ──────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  requirement:   '#0f3460',
  srs_section:   '#16213e',
  sds_component: '#1a4a6e',
  test_case:     '#1a4a3e',
  fat_item:      '#3e1a4a',
};

const STATUS_BORDER: Record<string, string> = {
  draft:        '#6b7280',
  under_review: '#f59e0b',
  approved:     '#22c55e',
  deprecated:   '#ef4444',
  // doc statuses
  in_review:    '#f59e0b',
  client_review:'#3b82f6',
};

function nodeStyle(graphNode: GraphNode) {
  const bg = TYPE_COLOR[graphNode.type] ?? '#1a1a2e';
  const border = STATUS_BORDER[graphNode.meta?.status ?? ''] ?? '#0f3460';
  return {
    background: bg,
    border: `2px solid ${border}`,
    borderRadius: 8,
    padding: '8px 12px',
    color: '#fff',
    fontSize: 11,
    minWidth: 140,
    maxWidth: 200,
  };
}

function toFlowNodes(graphNodes: GraphNode[]): Node[] {
  // Simple grid layout — React Flow auto-layout would need dagre which is optional
  const cols = Math.ceil(Math.sqrt(graphNodes.length)) || 1;
  return graphNodes.map((n, i) => ({
    id: n.id,
    position: { x: (i % cols) * 240, y: Math.floor(i / cols) * 120 },
    data: { label: n.label, graphNode: n },
    style: nodeStyle(n),
  }));
}

function toFlowEdges(edges: { id: string; source: string; target: string; linkType: string }[]): Edge[] {
  const LINK_COLOR: Record<string, string> = {
    derives:    '#6366f1',
    verifies:   '#22c55e',
    implements: '#f59e0b',
    tests:      '#ec4899',
  };
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.linkType,
    labelStyle: { fill: '#ccc', fontSize: 9 },
    style: { stroke: LINK_COLOR[e.linkType] ?? '#555' },
    markerEnd: { type: MarkerType.ArrowClosed, color: LINK_COLOR[e.linkType] ?? '#555' },
    animated: e.linkType === 'tests',
  }));
}

const LINK_TYPES: LinkType[] = ['derives', 'verifies', 'implements', 'tests'];
const NODE_TYPES_LIST: TraceNodeType[] = ['requirement', 'srs_section', 'sds_component', 'test_case', 'fat_item'];

export default function Traceability() {
  const { id: projectId } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    sourceType: 'requirement' as TraceNodeType,
    sourceId: '',
    targetType: 'srs_section' as TraceNodeType,
    targetId: '',
    linkType: 'derives' as LinkType,
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Data queries
  const { data: graphData, isLoading: graphLoading } = useQuery({
    queryKey: ['rtm-graph', projectId],
    queryFn: () => tracelinksApi.graph(projectId!),
  });

  const { data: coverage } = useQuery({
    queryKey: ['rtm-coverage', projectId],
    queryFn: () => tracelinksApi.coverage(projectId!),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn: () => requirementsApi.list(projectId!),
  });

  // Build flow nodes/edges
  const filteredGraphNodes = useMemo(() => {
    if (!graphData) return [];
    return typeFilter === 'all'
      ? graphData.nodes
      : graphData.nodes.filter((n) => n.type === typeFilter);
  }, [graphData, typeFilter]);

  const filteredEdges = useMemo(() => {
    if (!graphData) return [];
    const nodeIds = new Set(filteredGraphNodes.map((n) => n.id));
    return graphData.edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
  }, [graphData, filteredGraphNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(toFlowNodes(filteredGraphNodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState(toFlowEdges(filteredEdges));

  // Re-sync when data changes
  useMemo(() => {
    setNodes(toFlowNodes(filteredGraphNodes));
    setEdges(toFlowEdges(filteredEdges));
  }, [filteredGraphNodes, filteredEdges]);

  const onConnect: OnConnect = useCallback(
    (connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const createMut = useMutation({
    mutationFn: () => tracelinksApi.create(projectId!, addForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rtm-graph', projectId] });
      qc.invalidateQueries({ queryKey: ['rtm-coverage', projectId] });
      setShowAdd(false);
      setAddForm({ sourceType: 'requirement', sourceId: '', targetType: 'srs_section', targetId: '', linkType: 'derives' });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (linkId: string) => tracelinksApi.delete(projectId!, linkId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rtm-graph', projectId] });
      qc.invalidateQueries({ queryKey: ['rtm-coverage', projectId] });
    },
  });

  const coveragePct = coverage?.coveragePercent ?? 0;
  const coverageColor = coveragePct >= 80 ? 'text-green-400' : coveragePct >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="flex h-full min-h-screen bg-[#1a1a2e]">
      {/* Left panel — coverage + orphans */}
      <aside className="w-64 bg-[#0f1c3a] border-r border-[#0f3460]/40 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-[#0f3460]/40">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Coverage</p>
          <div className={`text-4xl font-bold ${coverageColor}`}>{coveragePct}%</div>
          <p className="text-xs text-gray-400 mt-1">
            {coverage?.covered ?? 0} / {coverage?.total ?? 0} requirements traced
          </p>

          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Covered</span>
              <span className="text-green-400">{coverage?.covered ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Orphans</span>
              <span className="text-red-400">{coverage?.orphans ?? 0}</span>
            </div>
          </div>

          <div className="mt-3 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${coveragePct >= 80 ? 'bg-green-500' : coveragePct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${coveragePct}%` }}
            />
          </div>
        </div>

        {/* Orphan list */}
        {(coverage?.orphanList?.length ?? 0) > 0 && (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-2">Orphan Requirements</p>
            <div className="space-y-2">
              {coverage!.orphanList.map((r) => (
                <div key={r._id} className="bg-red-900/20 border border-red-800/40 rounded p-2">
                  <p className="text-xs font-bold text-red-400">{r.reqId}</p>
                  <p className="text-xs text-gray-300 truncate">{r.title}</p>
                  <Badge className="text-[10px] mt-1 bg-gray-700 text-gray-300">{r.priority}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {coverage?.orphans === 0 && (
          <div className="p-4 text-xs text-green-400">All requirements traced ✓</div>
        )}
      </aside>

      {/* Graph area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#16213e] border-b border-[#0f3460]/40">
          <p className="text-sm font-semibold text-white mr-2">Requirement Traceability Matrix</p>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40 h-8 text-xs bg-[#1a1a2e] border-[#0f3460] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white">
              <SelectItem value="all">All types</SelectItem>
              {NODE_TYPES_LIST.map((t) => (
                <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button className="h-8 text-xs" onClick={() => setShowAdd(true)}>+ Add Link</Button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 px-4 py-2 bg-[#1a1a2e] border-b border-[#0f3460]/20 text-xs text-gray-400">
          {[
            { color: '#6366f1', label: 'derives' },
            { color: '#22c55e', label: 'verifies' },
            { color: '#f59e0b', label: 'implements' },
            { color: '#ec4899', label: 'tests' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5" style={{ background: color }} />
              {label}
            </span>
          ))}
          <span className="ml-4 text-gray-500">Border: gray=draft · amber=review · green=approved</span>
        </div>

        {graphLoading && (
          <div className="flex-1 flex items-center justify-center text-gray-400">Loading graph…</div>
        )}

        {!graphLoading && nodes.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <p className="text-lg mb-2">No trace links yet</p>
            <p className="text-sm mb-4">Add links between requirements, SRS sections, test cases, and more.</p>
            <Button onClick={() => setShowAdd(true)}>+ Add First Link</Button>
          </div>
        )}

        {!graphLoading && nodes.length > 0 && (
          <div className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_evt, node) => setSelectedNode((node.data as any).graphNode)}
              fitView
              colorMode="dark"
            >
              <Background color="#0f3460" gap={24} />
              <Controls />
              <MiniMap
                nodeColor={(n) => TYPE_COLOR[(n.data as any)?.graphNode?.type ?? ''] ?? '#1a1a2e'}
                maskColor="rgba(10,15,30,0.7)"
              />
              <Panel position="bottom-right">
                <p className="text-xs text-gray-500">{nodes.length} nodes · {edges.length} edges</p>
              </Panel>
            </ReactFlow>
          </div>
        )}
      </div>

      {/* Right drawer — selected node detail */}
      {selectedNode && (
        <aside className="w-72 bg-[#0f1c3a] border-l border-[#0f3460]/40 flex flex-col overflow-hidden shrink-0">
          <div className="p-4 border-b border-[#0f3460]/40 flex items-start justify-between">
            <div>
              <Badge className="text-xs bg-[#0f3460] text-white mb-2">{selectedNode.type.replace('_', ' ')}</Badge>
              <p className="text-sm font-semibold text-white">{selectedNode.label}</p>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
          </div>

          <div className="p-4 space-y-2 flex-1 overflow-y-auto">
            {Object.entries(selectedNode.meta).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>

          {/* Links from/to this node */}
          <div className="p-4 border-t border-[#0f3460]/40">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Links</p>
            {graphData?.edges
              .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
              .map((e) => {
                const isSource = e.source === selectedNode.id;
                const otherId = isSource ? e.target : e.source;
                const otherNode = graphData.nodes.find((n) => n.id === otherId);
                return (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-[#0f3460]/20 last:border-0">
                    <div className="text-xs text-gray-300 truncate flex-1">
                      <span className="text-gray-500">{isSource ? '→' : '←'} </span>
                      {otherNode?.label ?? otherId.slice(-8)}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Badge className="text-[10px] bg-[#0f3460] text-gray-300">{e.linkType}</Badge>
                      <button
                        className="text-red-400 hover:text-red-300 text-xs"
                        onClick={() => deleteMut.mutate(e.id)}
                      >×</button>
                    </div>
                  </div>
                );
              })}
            {!graphData?.edges.some((e) => e.source === selectedNode.id || e.target === selectedNode.id) && (
              <p className="text-xs text-gray-500">No links for this node</p>
            )}
          </div>
        </aside>
      )}

      {/* Add link dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white max-w-md">
          <DialogHeader><DialogTitle>Add Trace Link</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            {/* Source */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400">Source Type</Label>
                <Select value={addForm.sourceType} onValueChange={(v) => setAddForm({ ...addForm, sourceType: v as TraceNodeType })}>
                  <SelectTrigger className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white">
                    {NODE_TYPES_LIST.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Source ID</Label>
                {addForm.sourceType === 'requirement' ? (
                  <Select value={addForm.sourceId} onValueChange={(v) => setAddForm({ ...addForm, sourceId: v })}>
                    <SelectTrigger className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white text-xs h-8">
                      <SelectValue placeholder="Pick req…" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white max-h-48 overflow-y-auto">
                      {requirements.map((r) => (
                        <SelectItem key={r._id} value={r._id}>{r.reqId} — {r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    className="mt-1 w-full bg-[#1a1a2e] border border-[#0f3460] text-white text-xs rounded px-2 h-8"
                    placeholder="Paste ObjectId…"
                    value={addForm.sourceId}
                    onChange={(e) => setAddForm({ ...addForm, sourceId: e.target.value })}
                  />
                )}
              </div>
            </div>

            {/* Link type */}
            <div>
              <Label className="text-xs text-gray-400">Link Type</Label>
              <Select value={addForm.linkType} onValueChange={(v) => setAddForm({ ...addForm, linkType: v as LinkType })}>
                <SelectTrigger className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white">
                  {LINK_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Target */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-400">Target Type</Label>
                <Select value={addForm.targetType} onValueChange={(v) => setAddForm({ ...addForm, targetType: v as TraceNodeType })}>
                  <SelectTrigger className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white">
                    {NODE_TYPES_LIST.map((t) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-400">Target ID</Label>
                {addForm.targetType === 'requirement' ? (
                  <Select value={addForm.targetId} onValueChange={(v) => setAddForm({ ...addForm, targetId: v })}>
                    <SelectTrigger className="mt-1 bg-[#1a1a2e] border-[#0f3460] text-white text-xs h-8">
                      <SelectValue placeholder="Pick req…" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-[#0f3460] text-white max-h-48 overflow-y-auto">
                      {requirements.map((r) => (
                        <SelectItem key={r._id} value={r._id}>{r.reqId} — {r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <input
                    className="mt-1 w-full bg-[#1a1a2e] border border-[#0f3460] text-white text-xs rounded px-2 h-8"
                    placeholder="Paste ObjectId…"
                    value={addForm.targetId}
                    onChange={(e) => setAddForm({ ...addForm, targetId: e.target.value })}
                  />
                )}
              </div>
            </div>

            <p className="text-xs text-gray-500">For srs_section: use the section's string id (e.g. "introduction"). For other types: paste the MongoDB ObjectId.</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              disabled={!addForm.sourceId || !addForm.targetId || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? 'Adding…' : 'Add Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
