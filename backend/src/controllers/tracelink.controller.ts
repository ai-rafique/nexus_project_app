import type { Request, Response } from 'express';
import { TraceLink } from '../models/TraceLink';
import { Requirement } from '../models/Requirement';
import { ProjectDocument } from '../models/Document';

// GET /api/projects/:projectId/tracelinks
export async function listTraceLinks(req: Request, res: Response) {
  try {
    const links = await TraceLink.find({ projectId: req.params.projectId });
    return res.json(links);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/tracelinks
export async function createTraceLink(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { sourceType, sourceId, targetType, targetId, linkType } = req.body;

    if (!sourceType || !sourceId || !targetType || !targetId || !linkType) {
      return res.status(400).json({ message: 'sourceType, sourceId, targetType, targetId, linkType all required' });
    }

    if (sourceId === targetId) {
      return res.status(400).json({ message: 'Source and target cannot be the same' });
    }

    const link = await TraceLink.create({
      projectId,
      sourceType,
      sourceId,
      targetType,
      targetId,
      linkType,
      createdBy: req.user!.sub,
    });

    return res.status(201).json(link);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'This trace link already exists' });
    }
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// DELETE /api/projects/:projectId/tracelinks/:linkId
export async function deleteTraceLink(req: Request, res: Response) {
  try {
    const link = await TraceLink.findOneAndDelete({
      _id: req.params.linkId,
      projectId: req.params.projectId,
    });
    if (!link) return res.status(404).json({ message: 'Trace link not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/traceability/graph
export async function getGraph(req: Request, res: Response) {
  try {
    const { projectId } = req.params;

    const [links, requirements, documents] = await Promise.all([
      TraceLink.find({ projectId }),
      Requirement.find({ projectId, status: { $ne: 'deprecated' } }).select('_id reqId title status priority type'),
      ProjectDocument.find({ projectId }).select('_id title type status sections'),
    ]);

    // Build node set from requirements + srs_sections referenced in links
    const nodeMap = new Map<string, object>();

    // Requirement nodes
    for (const r of requirements) {
      nodeMap.set(r._id.toString(), {
        id: r._id.toString(),
        type: 'requirement',
        label: `${r.reqId}: ${r.title}`,
        meta: { reqId: r.reqId, status: r.status, priority: r.priority, docType: r.type },
      });
    }

    // SRS section nodes from documents
    for (const doc of documents) {
      for (const section of doc.sections) {
        const nodeId = section.id;
        nodeMap.set(nodeId, {
          id: nodeId,
          type: 'srs_section',
          label: `${doc.type.toUpperCase()}: ${section.title}`,
          meta: { docTitle: doc.title, docType: doc.type, docStatus: doc.status },
        });
      }
    }

    // Any other node types referenced in links that we don't have models for yet
    for (const link of links) {
      const sid = link.sourceId;
      const tid = link.targetId;
      if (!nodeMap.has(sid)) {
        nodeMap.set(sid, { id: sid, type: link.sourceType, label: `${link.sourceType}:${sid.slice(-6)}`, meta: {} });
      }
      if (!nodeMap.has(tid)) {
        nodeMap.set(tid, { id: tid, type: link.targetType, label: `${link.targetType}:${tid.slice(-6)}`, meta: {} });
      }
    }

    // Only emit nodes that appear in at least one link
    const linkedIds = new Set<string>();
    for (const link of links) {
      linkedIds.add(link.sourceId);
      linkedIds.add(link.targetId);
    }

    const nodes = [...nodeMap.values()].filter((n: any) => linkedIds.has(n.id));

    const edges = links.map((l) => ({
      id: l._id.toString(),
      source: l.sourceId,
      target: l.targetId,
      linkType: l.linkType,
    }));

    return res.json({ nodes, edges });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/traceability/coverage
export async function getCoverage(req: Request, res: Response) {
  try {
    const { projectId } = req.params;

    const [requirements, links] = await Promise.all([
      Requirement.find({ projectId, status: { $ne: 'deprecated' } }).select('_id reqId title status priority'),
      TraceLink.find({ projectId }),
    ]);

    // Which requirement IDs appear as a source or target in any link
    const linkedReqIds = new Set<string>();
    for (const l of links) {
      if (l.sourceType === 'requirement') linkedReqIds.add(l.sourceId);
      if (l.targetType === 'requirement') linkedReqIds.add(l.targetId);
    }

    const total = requirements.length;
    const covered = requirements.filter((r) => linkedReqIds.has(r._id.toString())).length;
    const orphans = requirements
      .filter((r) => !linkedReqIds.has(r._id.toString()))
      .map((r) => ({ _id: r._id, reqId: r.reqId, title: r.title, status: r.status, priority: r.priority }));

    return res.json({
      total,
      covered,
      orphans: orphans.length,
      coveragePercent: total > 0 ? Math.round((covered / total) * 100) : 0,
      orphanList: orphans,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
