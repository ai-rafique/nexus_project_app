import type { Request, Response } from 'express';
import { FatPlan } from '../models/FatPlan';

// GET /api/projects/:projectId/fat
export async function listFatPlans(req: Request, res: Response) {
  try {
    const plans = await FatPlan.find({ projectId: req.params.projectId }).select('-items').sort({ createdAt: -1 });
    return res.json(plans);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/fat
export async function createFatPlan(req: Request, res: Response) {
  try {
    const { title, items } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const plan = await FatPlan.create({
      projectId: req.params.projectId,
      title,
      items: (items ?? []).map((item: any, i: number) => ({ ...item, order: item.order ?? i, result: 'pending', signedOff: false })),
      createdBy: req.user!.sub,
    });
    return res.status(201).json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/fat/:planId
export async function getFatPlan(req: Request, res: Response) {
  try {
    const plan = await FatPlan.findOne({ _id: req.params.planId, projectId: req.params.projectId })
      .populate('items.linkedReq', 'reqId title')
      .populate('items.signedBy', 'firstName lastName');
    if (!plan) return res.status(404).json({ message: 'FAT plan not found' });
    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/fat/:planId/items
export async function addFatItem(req: Request, res: Response) {
  try {
    const plan = await FatPlan.findOne({ _id: req.params.planId, projectId: req.params.projectId });
    if (!plan) return res.status(404).json({ message: 'FAT plan not found' });
    if (!req.body.title) return res.status(400).json({ message: 'title is required' });

    plan.items.push({
      order: plan.items.length,
      title: req.body.title,
      description: req.body.description ?? '',
      linkedReq: req.body.linkedReq,
      result: 'pending',
      observations: '',
      signedOff: false,
    } as any);
    await plan.save();
    return res.status(201).json(plan.items[plan.items.length - 1]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/projects/:projectId/fat/:planId/items/:itemId
export async function updateFatItem(req: Request, res: Response) {
  try {
    const plan = await FatPlan.findOne({ _id: req.params.planId, projectId: req.params.projectId });
    if (!plan) return res.status(404).json({ message: 'FAT plan not found' });

    const item = plan.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'FAT item not found' });

    const { result, observations, title, description } = req.body;
    if (result !== undefined) item.result = result;
    if (observations !== undefined) item.observations = observations;
    if (title !== undefined) item.title = title;
    if (description !== undefined) item.description = description;

    // Auto-set plan status to in_progress on first execution
    if (plan.status === 'draft' && result && result !== 'pending') plan.status = 'in_progress';

    // Auto-complete when all items have a non-pending result
    const allDone = plan.items.every((i) => i.result !== 'pending');
    if (allDone) plan.status = 'completed';

    await plan.save();
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/fat/:planId/items/:itemId/sign
export async function signFatItem(req: Request, res: Response) {
  try {
    const plan = await FatPlan.findOne({ _id: req.params.planId, projectId: req.params.projectId });
    if (!plan) return res.status(404).json({ message: 'FAT plan not found' });

    const item = plan.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'FAT item not found' });
    if (item.result === 'pending') return res.status(400).json({ message: 'Cannot sign off a pending item — record a result first' });

    item.signedOff = true;
    item.signedBy = req.user!.sub as any;
    item.signedAt = new Date();
    await plan.save();
    return res.json(item);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/fat/:planId/report
export async function getFatReport(req: Request, res: Response) {
  try {
    const plan = await FatPlan.findOne({ _id: req.params.planId, projectId: req.params.projectId })
      .populate('items.linkedReq', 'reqId title')
      .populate('items.signedBy', 'firstName lastName');
    if (!plan) return res.status(404).json({ message: 'FAT plan not found' });

    const total    = plan.items.length;
    const passed   = plan.items.filter((i) => i.result === 'pass').length;
    const failed   = plan.items.filter((i) => i.result === 'fail').length;
    const blocked  = plan.items.filter((i) => i.result === 'blocked').length;
    const pending  = plan.items.filter((i) => i.result === 'pending').length;
    const signedOff = plan.items.filter((i) => i.signedOff).length;
    const punchList = plan.items.filter((i) => i.result === 'fail');

    return res.json({
      planId:    plan._id,
      title:     plan.title,
      status:    plan.status,
      summary:   { total, passed, failed, blocked, pending, signedOff },
      passRate:  total > 0 ? Math.round((passed / total) * 100) : 0,
      punchList,
      generatedAt: new Date(),
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
