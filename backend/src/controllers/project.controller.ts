import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project';

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  clientName: z.string().min(1).max(100),
  startDate: z.string().datetime(),
  targetEndDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['active', 'on_hold', 'completed', 'archived']).optional(),
  currentPhase: z
    .enum(['requirements', 'srs', 'sds', 'implementation', 'testing', 'fat', 'delivery'])
    .optional(),
});

const addMemberSchema = z.object({
  userId: z.string(),
  role: z.enum([
    'project_manager',
    'business_analyst',
    'architect',
    'developer',
    'qa_engineer',
    'client_viewer',
    'client_approver',
  ]),
});

function isMember(project: InstanceType<typeof Project>, userId: string): boolean {
  // m.userId may be a populated document or a raw ObjectId
  const resolveId = (v: unknown): string =>
    v && typeof v === 'object' && '_id' in v
      ? (v as { _id: { toString(): string } })._id.toString()
      : String(v);

  return (
    project.createdBy.toString() === userId ||
    project.members.some((m) => resolveId(m.userId) === userId)
  );
}

export async function listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const projects = await Project.find({
      $or: [{ createdBy: userId }, { 'members.userId': userId }],
    }).sort({ updatedAt: -1 });

    res.json({ data: projects });
  } catch (err) {
    next(err);
  }
}

export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createProjectSchema.parse(req.body);
    const userId = req.user!.sub;

    const project = await Project.create({
      ...body,
      startDate: new Date(body.startDate),
      targetEndDate: body.targetEndDate ? new Date(body.targetEndDate) : undefined,
      createdBy: userId,
      members: [{ userId, role: 'project_manager', addedAt: new Date() }],
    });

    res.status(201).json({ data: project });
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await Project.findById(req.params.id).populate('members.userId', 'firstName lastName email');
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    if (!isMember(project, req.user!.sub)) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }
    res.json({ data: project });
  } catch (err) {
    next(err);
  }
}

export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updateProjectSchema.parse(req.body);
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    if (!isMember(project, req.user!.sub)) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    Object.assign(project, body);
    await project.save();
    res.json({ data: project });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = addMemberSchema.parse(req.body);
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: 'Project not found' });
      return;
    }
    if (!isMember(project, req.user!.sub)) {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    const alreadyMember = project.members.some((m) => m.userId.toString() === body.userId);
    if (alreadyMember) {
      res.status(409).json({ message: 'User is already a member' });
      return;
    }

    project.members.push({ userId: body.userId as unknown as import('mongoose').Types.ObjectId, role: body.role, addedAt: new Date() });
    await project.save();
    res.json({ data: project });
  } catch (err) {
    next(err);
  }
}
