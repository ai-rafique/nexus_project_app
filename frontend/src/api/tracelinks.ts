import { apiClient } from './client';

export type TraceNodeType = 'requirement' | 'srs_section' | 'sds_component' | 'test_case' | 'fat_item';
export type LinkType = 'derives' | 'verifies' | 'implements' | 'tests';

export interface TraceLink {
  _id: string;
  projectId: string;
  sourceType: TraceNodeType;
  sourceId: string;
  targetType: TraceNodeType;
  targetId: string;
  linkType: LinkType;
  createdBy: string;
  createdAt: string;
}

export interface GraphNode {
  id: string;
  type: TraceNodeType;
  label: string;
  meta: Record<string, string>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  linkType: LinkType;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CoverageData {
  total: number;
  covered: number;
  orphans: number;
  coveragePercent: number;
  orphanList: { _id: string; reqId: string; title: string; status: string; priority: string }[];
}

export const tracelinksApi = {
  list: (projectId: string) =>
    apiClient.get<TraceLink[]>(`/projects/${projectId}/tracelinks`).then((r) => r.data),

  create: (projectId: string, body: {
    sourceType: TraceNodeType; sourceId: string;
    targetType: TraceNodeType; targetId: string;
    linkType: LinkType;
  }) => apiClient.post<TraceLink>(`/projects/${projectId}/tracelinks`, body).then((r) => r.data),

  delete: (projectId: string, linkId: string) =>
    apiClient.delete(`/projects/${projectId}/tracelinks/${linkId}`).then((r) => r.data),

  graph: (projectId: string) =>
    apiClient.get<GraphData>(`/projects/${projectId}/traceability/graph`).then((r) => r.data),

  coverage: (projectId: string) =>
    apiClient.get<CoverageData>(`/projects/${projectId}/traceability/coverage`).then((r) => r.data),
};
