import type { Request, Response } from 'express';
import { ProjectDocument } from '../models/Document';
import { Requirement } from '../models/Requirement';
import { Settings } from '../models/Settings';
import { Project } from '../models/Project';
import { generateSrsPdf, IEEE_830_SECTIONS } from '../services/pdf.service';
import { createNotification, notifyMany } from '../services/notification.service';
import type { IDocSection } from '../models/Document';
import type { Types } from 'mongoose';

// POST /api/projects/:projectId/documents
export async function createDocument(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { type, title, version } = req.body;

    if (!type || !title) {
      return res.status(400).json({ message: 'type and title are required' });
    }

    const sections: IDocSection[] = type === 'srs'
      ? IEEE_830_SECTIONS.map((s) => ({ ...s, content: '', linkedReqs: [] }))
      : [];

    const doc = await ProjectDocument.create({
      projectId,
      type,
      title,
      version: version ?? '1.0',
      sections,
      createdBy: req.user!.sub,
    });

    return res.status(201).json(doc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/documents
export async function listDocuments(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const docs = await ProjectDocument.find({ projectId })
      .select('-sections')
      .sort({ createdAt: -1 });
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/documents/:docId
export async function getDocument(req: Request, res: Response) {
  try {
    const doc = await ProjectDocument.findOne({
      _id: req.params.docId,
      projectId: req.params.projectId,
    }).populate('reviewers.userId', 'name email');

    if (!doc) return res.status(404).json({ message: 'Document not found' });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// PATCH /api/projects/:projectId/documents/:docId/sections/:sectionId
export async function updateSection(req: Request, res: Response) {
  try {
    const { docId, projectId, sectionId } = req.params;
    const { content, linkedReqs } = req.body;

    const doc = await ProjectDocument.findOne({ _id: docId, projectId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (!['draft', 'in_review'].includes(doc.status)) {
      return res.status(400).json({ message: 'Cannot edit a document that is not in draft or in_review' });
    }

    const section = doc.sections.find((s) => s.id === sectionId);
    if (!section) return res.status(404).json({ message: 'Section not found' });

    if (content !== undefined) section.content = content;
    if (linkedReqs !== undefined) section.linkedReqs = linkedReqs;

    await doc.save();
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/documents/:docId/submit
export async function submitForReview(req: Request, res: Response) {
  try {
    const { docId, projectId } = req.params;
    const { reviewerIds } = req.body as { reviewerIds: string[] };

    if (!reviewerIds?.length) {
      return res.status(400).json({ message: 'reviewerIds required' });
    }

    const doc = await ProjectDocument.findOne({ _id: docId, projectId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.status !== 'draft') {
      return res.status(400).json({ message: 'Only draft documents can be submitted' });
    }

    doc.status = 'in_review';
    doc.reviewers = reviewerIds.map((uid) => ({
      userId: uid as unknown as Types.ObjectId,
      status: 'pending',
      comment: '',
    }));
    await doc.save();

    const project = await Project.findById(projectId).select('name');
    await notifyMany(
      reviewerIds,
      'review_request',
      'Review Requested',
      `You have been asked to review "${doc.title}" in project ${project?.name ?? ''}`,
      `/projects/${projectId}/documents/${docId}`,
    );

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/documents/:docId/review
export async function submitReview(req: Request, res: Response) {
  try {
    const { docId, projectId } = req.params;
    const { status, comment } = req.body as { status: 'approved' | 'rejected'; comment?: string };
    const reviewerId = req.user!.sub;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be approved or rejected' });
    }

    const doc = await ProjectDocument.findOne({ _id: docId, projectId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.status !== 'in_review') {
      return res.status(400).json({ message: 'Document is not in review' });
    }

    const reviewer = doc.reviewers.find((r) => r.userId.toString() === reviewerId);
    if (!reviewer) return res.status(403).json({ message: 'You are not a reviewer for this document' });

    reviewer.status = status;
    reviewer.comment = comment ?? '';
    reviewer.signedAt = new Date();

    const allDone = doc.reviewers.every((r) => r.status !== 'pending');
    const anyRejected = doc.reviewers.some((r) => r.status === 'rejected');

    if (allDone) {
      doc.status = anyRejected ? 'draft' : 'client_review';
    }

    await doc.save();

    const notifType = status === 'approved' ? 'review_approved' : 'review_rejected';
    const project = await Project.findById(projectId).select('name');
    await createNotification(
      doc.createdBy.toString(),
      notifType,
      status === 'approved' ? 'Review Approved' : 'Review Rejected',
      `"${doc.title}" was ${status} by a reviewer in ${project?.name ?? ''}`,
      `/projects/${projectId}/documents/${docId}`,
    );

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// POST /api/projects/:projectId/documents/:docId/approve
export async function approveDocument(req: Request, res: Response) {
  try {
    const { docId, projectId } = req.params;
    const doc = await ProjectDocument.findOne({ _id: docId, projectId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (doc.status !== 'client_review') {
      return res.status(400).json({ message: 'Document must be in client_review to approve' });
    }

    doc.status = 'approved';
    await doc.save();

    const project = await Project.findById(projectId).select('name');
    await createNotification(
      doc.createdBy.toString(),
      'client_signed',
      'Document Approved',
      `"${doc.title}" has been approved in ${project?.name ?? ''}`,
      `/projects/${projectId}/documents/${docId}`,
    );

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// GET /api/projects/:projectId/documents/:docId/pdf
export async function exportPdf(req: Request, res: Response) {
  try {
    const { docId, projectId } = req.params;

    const [doc, project, settings] = await Promise.all([
      ProjectDocument.findOne({ _id: docId, projectId }),
      Project.findById(projectId).select('name clientName'),
      Settings.findOne(),
    ]);

    if (!doc) return res.status(404).json({ message: 'Document not found' });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const reqIds = doc.sections.flatMap((s) => s.linkedReqs.map((r) => r.toString()));
    const reqs = reqIds.length
      ? await Requirement.find({ _id: { $in: reqIds } })
      : [];
    const reqMap = new Map(reqs.map((r) => [r._id.toString(), r]));

    const buffer = await generateSrsPdf(
      doc,
      { name: project.name, clientName: project.clientName ?? '' },
      reqMap as Map<string, any>,
      { logoPath: settings?.logoPath, companyName: settings?.companyName ?? 'NEXUS' },
    );

    const filename = `${doc.title.replace(/\s+/g, '_')}_v${doc.version}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}

// DELETE /api/projects/:projectId/documents/:docId
export async function deleteDocument(req: Request, res: Response) {
  try {
    const { docId, projectId } = req.params;
    const doc = await ProjectDocument.findOneAndDelete({ _id: docId, projectId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    return res.json({ message: 'Deleted' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: String(err) });
  }
}
