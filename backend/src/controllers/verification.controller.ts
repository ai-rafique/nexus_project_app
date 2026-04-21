import type { Request, Response } from 'express';
import { VerificationMatrix } from '../models/VerificationMatrix';
import { Requirement } from '../models/Requirement';
import { TestCase } from '../models/TestCase';
import { TraceLink } from '../models/TraceLink';
import { audit } from '../services/audit.service';

// GET /api/projects/:projectId/verification
export async function getMatrix(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    let matrix = await VerificationMatrix.findOne({ projectId })
      .populate('entries.requirementId', 'reqId title status priority')
      .populate('entries.verifiedBy', 'firstName lastName');
    if (!matrix) matrix = await VerificationMatrix.create({ projectId, entries: [] });
    return res.json(matrix);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/verification/entries
export async function addEntry(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { requirementId, method, reference, status, notes } = req.body;

    if (!requirementId || !method) {
      return res.status(400).json({ message: 'requirementId and method are required' });
    }

    let matrix = await VerificationMatrix.findOne({ projectId });
    if (!matrix) matrix = await VerificationMatrix.create({ projectId, entries: [] });

    // One entry per requirement+method combination
    const exists = matrix.entries.some(
      (e) => e.requirementId.toString() === requirementId && e.method === method,
    );
    if (exists) return res.status(409).json({ message: 'Entry for this requirement + method already exists' });

    matrix.entries.push({ requirementId, method, reference: reference ?? '', status: status ?? 'planned', notes: notes ?? '' } as any);
    await matrix.save();

    await audit(req.user!.sub, 'verification.entry_add', 'VerificationMatrix', matrix._id.toString(), { requirementId, method }, projectId);

    const populated = await VerificationMatrix.findById(matrix._id)
      .populate('entries.requirementId', 'reqId title')
      .populate('entries.verifiedBy', 'firstName lastName');
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/projects/:projectId/verification/entries/:entryId
export async function updateEntry(req: Request, res: Response) {
  try {
    const { projectId, entryId } = req.params;
    const matrix = await VerificationMatrix.findOne({ projectId });
    if (!matrix) return res.status(404).json({ message: 'Verification matrix not found' });

    const entry = matrix.entries.id(entryId);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    const { status, reference, notes } = req.body;
    if (status !== undefined) entry.status = status;
    if (reference !== undefined) entry.reference = reference;
    if (notes !== undefined) entry.notes = notes;

    if (status === 'verified') {
      entry.verifiedBy = req.user!.sub as any;
      entry.verifiedAt = new Date();
    }

    await matrix.save();
    await audit(req.user!.sub, 'verification.entry_update', 'VerificationMatrix', matrix._id.toString(), { entryId, status }, projectId);

    const populated = await VerificationMatrix.findById(matrix._id)
      .populate('entries.requirementId', 'reqId title')
      .populate('entries.verifiedBy', 'firstName lastName');
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// DELETE /api/projects/:projectId/verification/entries/:entryId
export async function deleteEntry(req: Request, res: Response) {
  try {
    const { projectId, entryId } = req.params;
    const matrix = await VerificationMatrix.findOne({ projectId });
    if (!matrix) return res.status(404).json({ message: 'Verification matrix not found' });

    const entry = matrix.entries.id(entryId);
    if (!entry) return res.status(404).json({ message: 'Entry not found' });

    entry.deleteOne();
    await matrix.save();
    const populated = await VerificationMatrix.findById(matrix._id)
      .populate('entries.requirementId', 'reqId title')
      .populate('entries.verifiedBy', 'firstName lastName');
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/verification/auto-populate
// Derives entries from existing TestCase links and TraceLinks
export async function autoPopulate(req: Request, res: Response) {
  try {
    const { projectId } = req.params;

    const [requirements, testCases, traceLinks] = await Promise.all([
      Requirement.find({ projectId, status: { $ne: 'deprecated' } }).select('_id reqId'),
      TestCase.find({ projectId }).select('_id linkedReqs testId'),
      TraceLink.find({ projectId, targetType: 'requirement', linkType: 'verifies' }).select('targetId'),
    ]);

    let matrix = await VerificationMatrix.findOne({ projectId });
    if (!matrix) matrix = await VerificationMatrix.create({ projectId, entries: [] });

    const existing = new Set(
      matrix.entries.map((e) => `${e.requirementId.toString()}:${e.method}`),
    );

    let added = 0;

    // Test cases → 'test' method for each linked requirement
    for (const tc of testCases) {
      for (const reqId of tc.linkedReqs) {
        const key = `${reqId.toString()}:test`;
        if (!existing.has(key)) {
          matrix.entries.push({ requirementId: reqId, method: 'test', reference: tc.testId, status: 'planned', notes: '' } as any);
          existing.add(key);
          added++;
        }
      }
    }

    // TraceLinks with verifies → 'review' method
    for (const link of traceLinks) {
      const key = `${link.targetId}:review`;
      if (!existing.has(key)) {
        matrix.entries.push({ requirementId: link.targetId as any, method: 'review', reference: `TraceLink:${link._id.toString().slice(-6)}`, status: 'planned', notes: '' } as any);
        existing.add(key);
        added++;
      }
    }

    await matrix.save();
    const populated = await VerificationMatrix.findById(matrix._id)
      .populate('entries.requirementId', 'reqId title')
      .populate('entries.verifiedBy', 'firstName lastName');
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/verification/summary
export async function getSummary(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const [matrix, reqCount] = await Promise.all([
      VerificationMatrix.findOne({ projectId }),
      Requirement.countDocuments({ projectId, status: { $ne: 'deprecated' } }),
    ]);

    const entries = matrix?.entries ?? [];
    const verified = entries.filter((e) => e.status === 'verified').length;
    const failed   = entries.filter((e) => e.status === 'failed').length;
    const planned  = entries.filter((e) => e.status === 'planned').length;
    const inProg   = entries.filter((e) => e.status === 'in_progress').length;

    const coveredReqIds = new Set(entries.map((e) => e.requirementId.toString()));

    return res.json({
      totalRequirements: reqCount,
      coveredRequirements: coveredReqIds.size,
      totalEntries: entries.length,
      verified, failed, planned, inProgress: inProg,
      verificationRate: entries.length > 0 ? Math.round((verified / entries.length) * 100) : 0,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
