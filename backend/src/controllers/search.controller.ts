import type { Request, Response } from 'express';
import { Project } from '../models/Project';
import { Requirement } from '../models/Requirement';
import { ProjectDocument } from '../models/Document';
import { TestCase } from '../models/TestCase';

// GET /api/search?q=<query>
export async function search(req: Request, res: Response) {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) return res.json({ results: [] });

    const userId = req.user!.sub;
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const projects = await Project.find({
      $or: [{ createdBy: userId }, { 'members.userId': userId }],
    }).select('_id name');

    const projectIds = projects.map((p) => p._id);
    const projectMap = new Map(projects.map((p) => [p._id.toString(), p.name]));

    const [reqs, docs, tests] = await Promise.all([
      Requirement.find({
        projectId: { $in: projectIds },
        status: { $ne: 'deprecated' },
        $or: [{ title: regex }, { reqId: regex }],
      }).select('reqId title projectId status priority').limit(6),

      ProjectDocument.find({
        projectId: { $in: projectIds },
        title: regex,
      }).select('title projectId type status').limit(4),

      TestCase.find({
        projectId: { $in: projectIds },
        $or: [{ title: regex }, { testId: regex }],
      }).select('testId title projectId status').limit(4),
    ]);

    const results = [
      ...reqs.map((r) => ({
        type: 'requirement' as const,
        id: r._id.toString(),
        label: `${r.reqId} — ${r.title}`,
        sub: projectMap.get(r.projectId.toString()) ?? '',
        url: `/projects/${r.projectId}/requirements/${r._id}`,
      })),
      ...docs.map((d) => ({
        type: 'document' as const,
        id: d._id.toString(),
        label: d.title,
        sub: `${d.type.toUpperCase()} · ${projectMap.get(d.projectId.toString()) ?? ''}`,
        url: `/projects/${d.projectId}/documents/${d._id}`,
      })),
      ...tests.map((t) => ({
        type: 'test' as const,
        id: t._id.toString(),
        label: `${t.testId} — ${t.title}`,
        sub: projectMap.get(t.projectId.toString()) ?? '',
        url: `/projects/${t.projectId}/tests`,
      })),
    ];

    return res.json({ results });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
