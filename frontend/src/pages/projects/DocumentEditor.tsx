import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi, type DocSection } from '@/api/documents';
import { requirementsApi } from '@/api/requirements';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  in_review: 'bg-yellow-500',
  client_review: 'bg-blue-500',
  approved: 'bg-green-500',
  superseded: 'bg-gray-400',
};

function resolveReviewerName(userId: unknown): string {
  if (userId && typeof userId === 'object' && 'name' in userId) {
    return (userId as { name: string }).name;
  }
  return String(userId);
}

export default function DocumentEditor() {
  const { id: projectId, docId } = useParams<{ id: string; docId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewerInput, setReviewerInput] = useState('');
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ status: 'approved' as 'approved' | 'rejected', comment: '' });

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', projectId, docId],
    queryFn: () => documentsApi.get(projectId!, docId!),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn: () => requirementsApi.list(projectId!),
  });

  const updateSectionMut = useMutation({
    mutationFn: ({ sectionId, content }: { sectionId: string; content: string }) =>
      documentsApi.updateSection(projectId!, docId!, sectionId, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', projectId, docId] });
      setActiveSection(null);
    },
  });

  const submitMut = useMutation({
    mutationFn: () => documentsApi.submit(projectId!, docId!, reviewerIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', projectId, docId] });
      setShowSubmit(false);
      setReviewerIds([]);
    },
  });

  const reviewMut = useMutation({
    mutationFn: () => documentsApi.review(projectId!, docId!, reviewForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', projectId, docId] });
      setShowReview(false);
    },
  });

  const approveMut = useMutation({
    mutationFn: () => documentsApi.approve(projectId!, docId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document', projectId, docId] }),
  });

  if (isLoading) return <div className="p-6 text-gray-400">Loading…</div>;
  if (!doc) return <div className="p-6 text-red-400">Document not found.</div>;

  const canEdit = ['draft', 'in_review'].includes(doc.status);
  const pdfUrl = documentsApi.pdfUrl(projectId!, docId!);

  return (
    <div className="flex h-full min-h-screen bg-[#1a1a2e]">
      {/* Sidebar: section nav */}
      <aside className="w-56 bg-[#0f1c3a] border-r border-[#0f3460]/40 flex flex-col">
        <div className="p-4 border-b border-[#0f3460]/40">
          <button onClick={() => navigate(`/projects/${projectId}/documents`)} className="text-xs text-gray-400 hover:text-white mb-2 block">← Documents</button>
          <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
          <Badge className={`${STATUS_COLORS[doc.status]} text-white text-xs mt-1`}>
            {doc.status.replace('_', ' ')}
          </Badge>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {doc.sections.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveSection(s.id);
                setEditContent(s.content);
              }}
              className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                activeSection === s.id
                  ? 'bg-[#0f3460] text-white'
                  : 'text-gray-400 hover:bg-[#16213e] hover:text-white'
              }`}
            >
              {i + 1}. {s.title}
            </button>
          ))}
        </nav>
        <div className="p-3 space-y-2 border-t border-[#0f3460]/40">
          <a href={pdfUrl} target="_blank" rel="noreferrer" className="block">
            <Button variant="ghost" className="w-full text-xs">Export PDF</Button>
          </a>
          {doc.status === 'draft' && (
            <Button className="w-full text-xs" onClick={() => setShowSubmit(true)}>
              Submit for Review
            </Button>
          )}
          {doc.status === 'in_review' && (
            <Button className="w-full text-xs bg-yellow-600 hover:bg-yellow-700" onClick={() => setShowReview(true)}>
              Submit Review
            </Button>
          )}
          {doc.status === 'client_review' && (
            <Button
              className="w-full text-xs bg-green-600 hover:bg-green-700"
              onClick={() => approveMut.mutate()}
              disabled={approveMut.isPending}
            >
              Approve Document
            </Button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-y-auto">
        {!activeSection && (
          <div className="text-center text-gray-500 mt-32">
            <p className="text-lg">Select a section from the left to edit</p>
          </div>
        )}

        {activeSection && (() => {
          const section = doc.sections.find((s) => s.id === activeSection)!;
          return (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
              {canEdit ? (
                <>
                  <Textarea
                    className="bg-[#16213e] border-[#0f3460] text-white min-h-[300px] font-mono text-sm"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Write section content here…"
                  />
                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => updateSectionMut.mutate({ sectionId: activeSection, content: editContent })}
                      disabled={updateSectionMut.isPending}
                    >
                      {updateSectionMut.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="ghost" onClick={() => setActiveSection(null)}>Cancel</Button>
                  </div>
                </>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{section.content || '(no content)'}</pre>
                </div>
              )}

              {/* Linked Requirements */}
              {section.linkedReqs.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-gray-400 mb-2">Linked Requirements</p>
                  {section.linkedReqs.map((rid) => {
                    const req = requirements.find((r) => r._id === rid);
                    return (
                      <div key={rid} className="bg-[#0f1c3a] border-l-2 border-[#0f3460] p-3 rounded mb-2">
                        <p className="text-xs font-bold text-blue-400">{req?.reqId ?? rid}</p>
                        <p className="text-sm text-white">{req?.title ?? '—'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* Reviewers panel */}
        {doc.reviewers.length > 0 && (
          <div className="mt-8 bg-[#16213e] border border-[#0f3460]/40 rounded-lg p-4">
            <p className="text-sm font-semibold text-white mb-3">Reviewers</p>
            {doc.reviewers.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#0f3460]/20 last:border-0">
                <p className="text-sm text-gray-300">{resolveReviewerName(r.userId)}</p>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${r.status === 'approved' ? 'bg-green-600' : r.status === 'rejected' ? 'bg-red-600' : 'bg-gray-600'} text-white`}>
                    {r.status}
                  </Badge>
                  {r.comment && <p className="text-xs text-gray-400 max-w-xs truncate">{r.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Submit for review dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader><DialogTitle>Submit for Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Reviewer User IDs (comma-separated)</Label>
            <Input
              className="bg-[#1a1a2e] border-[#0f3460] text-white"
              value={reviewerInput}
              onChange={(e) => setReviewerInput(e.target.value)}
              placeholder="Paste user IDs…"
            />
            <p className="text-xs text-gray-400">Enter the MongoDB _id of each reviewer, separated by commas.</p>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button
              disabled={!reviewerInput.trim() || submitMut.isPending}
              onClick={() => {
                setReviewerIds(reviewerInput.split(',').map((s) => s.trim()).filter(Boolean));
                submitMut.mutate();
              }}
            >
              {submitMut.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader><DialogTitle>Submit Your Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Button
                className={reviewForm.status === 'approved' ? 'bg-green-600' : 'bg-[#1a1a2e]'}
                onClick={() => setReviewForm({ ...reviewForm, status: 'approved' })}
              >Approve</Button>
              <Button
                className={reviewForm.status === 'rejected' ? 'bg-red-600' : 'bg-[#1a1a2e]'}
                onClick={() => setReviewForm({ ...reviewForm, status: 'rejected' })}
              >Reject</Button>
            </div>
            <Label>Comment (optional)</Label>
            <Textarea
              className="bg-[#1a1a2e] border-[#0f3460] text-white"
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowReview(false)}>Cancel</Button>
            <Button disabled={reviewMut.isPending} onClick={() => reviewMut.mutate()}>
              {reviewMut.isPending ? 'Submitting…' : 'Submit Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
