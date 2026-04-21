import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { Requirement } from '../models/Requirement';
import { Project } from '../models/Project';
import { audit } from '../services/audit.service';

// ── Schemas ────────────────────────────────────────────────────────────────────

const bodySchema = z.object({
  title:              z.string().min(1).max(200),
  description:        z.string().max(5000).optional().default(''),
  acceptanceCriteria: z.string().max(5000).optional().default(''),
  type:     z.enum(['functional','non_functional','constraint','interface']).optional().default('functional'),
  priority: z.enum(['critical','high','medium','low']).optional().default('medium'),
  status:   z.enum(['draft','under_review','approved','deprecated']).optional().default('draft'),
  source:   z.string().max(200).optional().default(''),
  tags:     z.array(z.string()).optional().default([]),
  assignedTo: z.string().optional(),
});

const commentSchema = z.object({ text: z.string().min(1).max(2000) });

// ── Helpers ────────────────────────────────────────────────────────────────────

async function assertMember(projectId: string, userId: string): Promise<boolean> {
  const project = await Project.findById(projectId);
  if (!project) return false;
  return (
    project.createdBy.toString() === userId ||
    project.members.some((m) => m.userId.toString() === userId)
  );
}

async function nextReqId(projectId: string): Promise<string> {
  const count = await Requirement.countDocuments({ projectId });
  return `REQ-${String(count + 1).padStart(3, '0')}`;
}

// ── Controllers ────────────────────────────────────────────────────────────────

export async function listRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId } = req.params;
    if (!(await assertMember(projectId, req.user!.sub))) { res.status(403).json({ message: 'Access denied' }); return; }

    const { status, type, priority, search } = req.query as Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { projectId };
    if (status)   filter.status   = status;
    if (type)     filter.type     = type;
    if (priority) filter.priority = priority;
    if (search)   filter.title    = { $regex: search, $options: 'i' };

    const requirements = await Requirement.find(filter)
      .select('-versionHistory -comments')
      .sort({ createdAt: -1 });

    res.json({ data: requirements });
  } catch (err) { next(err); }
}

export async function createRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId } = req.params;
    if (!(await assertMember(projectId, req.user!.sub))) { res.status(403).json({ message: 'Access denied' }); return; }

    const body = bodySchema.parse(req.body);
    const reqId = await nextReqId(projectId);

    const requirement = await Requirement.create({
      ...body,
      projectId,
      reqId,
      createdBy: req.user!.sub,
      versionHistory: [{
        version: 1, title: body.title, description: body.description,
        acceptanceCriteria: body.acceptanceCriteria, changedBy: req.user!.sub,
      }],
    });

    await audit(req.user!.sub, 'requirement.create', 'Requirement', requirement._id.toString(), { reqId, title: body.title }, projectId);
    res.status(201).json({ data: requirement });
  } catch (err) { next(err); }
}

export async function getRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId, reqId } = req.params;
    if (!(await assertMember(projectId, req.user!.sub))) { res.status(403).json({ message: 'Access denied' }); return; }

    const requirement = await Requirement.findOne({ projectId, _id: reqId })
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('comments.userId', 'firstName lastName');

    if (!requirement) { res.status(404).json({ message: 'Requirement not found' }); return; }
    res.json({ data: requirement });
  } catch (err) { next(err); }
}

export async function updateRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId, reqId } = req.params;
    if (!(await assertMember(projectId, req.user!.sub))) { res.status(403).json({ message: 'Access denied' }); return; }

    const requirement = await Requirement.findOne({ projectId, _id: reqId });
    if (!requirement) { res.status(404).json({ message: 'Requirement not found' }); return; }

    const body = bodySchema.partial().parse(req.body);

    // Snapshot current state into version history before applying changes
    requirement.versionHistory.push({
      version:            requirement.version,
      title:              requirement.title,
      description:        requirement.description,
      acceptanceCriteria: requirement.acceptanceCriteria,
      changedBy:          req.user!.sub as unknown as import('mongoose').Types.ObjectId,
      changedAt:          new Date(),
    });

    Object.assign(requirement, body);
    requirement.version += 1;
    await requirement.save();

    res.json({ data: requirement });
  } catch (err) { next(err); }
}

export async function deleteRequirement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId, reqId } = req.params;
    if (!(await assertMember(projectId, req.user!.sub))) { res.status(403).json({ message: 'Access denied' }); return; }

    const requirement = await Requirement.findOne({ projectId, _id: reqId });
    if (!requirement) { res.status(404).json({ message: 'Requirement not found' }); return; }

    // Soft-delete via status
    requirement.status = 'deprecated';
    await requirement.save();

    res.status(204).send();
  } catch (err) { next(err); }
}

export async function addComment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId, reqId } = req.params;
    if (!(await assertMember(projectId, req.user!.sub))) { res.status(403).json({ message: 'Access denied' }); return; }

    const { text } = commentSchema.parse(req.body);
    const requirement = await Requirement.findOne({ projectId, _id: reqId });
    if (!requirement) { res.status(404).json({ message: 'Requirement not found' }); return; }

    requirement.comments.push({ userId: req.user!.sub as unknown as import('mongoose').Types.ObjectId, text, createdAt: new Date() });
    await requirement.save();

    res.status(201).json({ data: requirement.comments.at(-1) });
  } catch (err) { next(err); }
}

export async function importRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id: projectId } = req.params;
    if (!(await assertMember(projectId, req.user!.sub))) { res.status(403).json({ message: 'Access denied' }); return; }

    if (!req.file) { res.status(400).json({ message: 'No file uploaded' }); return; }

    const records = parse(req.file.buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    if (!records.length) { res.status(400).json({ message: 'CSV is empty' }); return; }

    const created = [];
    for (const row of records) {
      const title = row['title'] || row['Title'];
      if (!title) continue;

      const reqId = await nextReqId(projectId);
      const req_ = await Requirement.create({
        projectId,
        reqId,
        title,
        description:        row['description']        || row['Description']        || '',
        acceptanceCriteria: row['acceptanceCriteria']  || row['Acceptance Criteria'] || '',
        type:     (['functional','non_functional','constraint','interface'].includes(row['type']) ? row['type'] : 'functional') as import('../models/Requirement').ReqType,
        priority: (['critical','high','medium','low'].includes(row['priority'])                  ? row['priority'] : 'medium')  as import('../models/Requirement').ReqPriority,
        source:   row['source']   || '',
        tags:     row['tags']     ? row['tags'].split(';').map((t: string) => t.trim()) : [],
        createdBy: req.user!.sub,
        versionHistory: [{ version: 1, title, description: '', acceptanceCriteria: '', changedBy: req.user!.sub }],
      });
      created.push(req_);
    }

    res.status(201).json({ data: created, imported: created.length });
  } catch (err) { next(err); }
}
