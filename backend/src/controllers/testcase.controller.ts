import type { Request, Response } from 'express';
import { TestCase } from '../models/TestCase';

async function nextTestId(projectId: string): Promise<string> {
  const count = await TestCase.countDocuments({ projectId });
  return `TC-${String(count + 1).padStart(3, '0')}`;
}

// GET /api/projects/:projectId/tests
export async function listTestCases(req: Request, res: Response) {
  try {
    const { status, search } = req.query as Record<string, string>;
    const filter: Record<string, unknown> = { projectId: req.params.projectId };
    if (status) filter.status = status;
    if (search) filter.title = { $regex: search, $options: 'i' };

    const tests = await TestCase.find(filter)
      .select('-runs')
      .populate('linkedReqs', 'reqId title')
      .sort({ testId: 1 });
    return res.json(tests);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/tests
export async function createTestCase(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { title, description, steps, linkedReqs, status } = req.body;
    if (!title) return res.status(400).json({ message: 'title is required' });

    const testId = await nextTestId(projectId);
    const tc = await TestCase.create({
      projectId,
      testId,
      title,
      description,
      steps: steps ?? [],
      linkedReqs: linkedReqs ?? [],
      status: status ?? 'draft',
      createdBy: req.user!.sub,
    });
    return res.status(201).json(tc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/tests/:testId
export async function getTestCase(req: Request, res: Response) {
  try {
    const tc = await TestCase.findOne({ _id: req.params.testId, projectId: req.params.projectId })
      .populate('linkedReqs', 'reqId title')
      .populate('runs.executedBy', 'firstName lastName');
    if (!tc) return res.status(404).json({ message: 'Test case not found' });
    return res.json(tc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/projects/:projectId/tests/:testId
export async function updateTestCase(req: Request, res: Response) {
  try {
    const tc = await TestCase.findOne({ _id: req.params.testId, projectId: req.params.projectId });
    if (!tc) return res.status(404).json({ message: 'Test case not found' });

    const { title, description, steps, linkedReqs, status } = req.body;
    if (title !== undefined) tc.title = title;
    if (description !== undefined) tc.description = description;
    if (steps !== undefined) tc.steps = steps;
    if (linkedReqs !== undefined) tc.linkedReqs = linkedReqs;
    if (status !== undefined) tc.status = status;

    await tc.save();
    return res.json(tc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// DELETE /api/projects/:projectId/tests/:testId
export async function deleteTestCase(req: Request, res: Response) {
  try {
    const tc = await TestCase.findOneAndDelete({ _id: req.params.testId, projectId: req.params.projectId });
    if (!tc) return res.status(404).json({ message: 'Test case not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/tests/:testId/runs
export async function addRun(req: Request, res: Response) {
  try {
    const { result, notes } = req.body;
    if (!['pass','fail','blocked','na'].includes(result)) {
      return res.status(400).json({ message: 'result must be pass, fail, blocked, or na' });
    }

    const tc = await TestCase.findOne({ _id: req.params.testId, projectId: req.params.projectId });
    if (!tc) return res.status(404).json({ message: 'Test case not found' });

    tc.runs.push({ result, notes: notes ?? '', executedBy: req.user!.sub as any, executedAt: new Date() } as any);
    await tc.save();
    return res.status(201).json(tc.runs[tc.runs.length - 1]);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/tests/:testId/runs
export async function getRuns(req: Request, res: Response) {
  try {
    const tc = await TestCase.findOne({ _id: req.params.testId, projectId: req.params.projectId })
      .select('runs')
      .populate('runs.executedBy', 'firstName lastName');
    if (!tc) return res.status(404).json({ message: 'Test case not found' });
    return res.json(tc.runs);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
