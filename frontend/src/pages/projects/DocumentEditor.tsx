import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FileText } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { documentsApi } from '@/api/documents';
import { requirementsApi } from '@/api/requirements';
import { projectsApi } from '@/api/projects';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const STATUS_COLORS: Record<string, string> = {
  draft:         'bg-gray-500',
  in_review:     'bg-yellow-500',
  client_review: 'bg-blue-500',
  approved:      'bg-green-500',
  superseded:    'bg-gray-400',
};

function resolveReviewerName(userId: unknown): string {
  if (userId && typeof userId === 'object' && 'firstName' in userId) {
    const u = userId as { firstName: string; lastName: string };
    return `${u.firstName} ${u.lastName}`;
  }
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
  const [editContent,   setEditContent]   = useState('');
  const [showSubmit,    setShowSubmit]     = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [showReview,    setShowReview]     = useState(false);
  const [reviewForm,    setReviewForm]     = useState({ status: 'approved' as 'approved' | 'rejected', comment: '' });

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', projectId, docId],
    queryFn: () => documentsApi.get(projectId!, docId!),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements', projectId],
    queryFn: () => requirementsApi.list(projectId!),
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
  });

  const updateSectionMut = useMutation({
    mutationFn: ({ sectionId, content }: { sectionId: string; content: string }) =>
      documentsApi.updateSection(projectId!, docId!, sectionId, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', projectId, docId] });
      setActiveSection(null);
      toast.success('Section saved');
    },
    onError: () => toast.error('Failed to save section'),
  });

  const submitMut = useMutation({
    mutationFn: () => documentsApi.submit(projectId!, docId!, selectedReviewers),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', projectId, docId] });
      setShowSubmit(false);
      setSelectedReviewers([]);
      toast.success('Submitted for review');
    },
    onError: () => toast.error('Failed to submit document'),
  });

  const reviewMut = useMutation({
    mutationFn: () => documentsApi.review(projectId!, docId!, reviewForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', projectId, docId] });
      setShowReview(false);
      toast.success('Review submitted');
    },
    onError: () => toast.error('Failed to submit review'),
  });

  const approveMut = useMutation({
    mutationFn: () => documentsApi.approve(projectId!, docId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', projectId, docId] });
      toast.success('Document approved');
    },
    onError: () => toast.error('Failed to approve document'),
  });

  if (isLoading) return <AppShell><div className="p-8 text-muted-foreground">Loading…</div></AppShell>;
  if (!doc)      return <AppShell><div className="p-8 text-red-500">Document not found.</div></AppShell>;

  const canEdit = ['draft', 'in_review'].includes(doc.status);
  const pdfUrl  = documentsApi.pdfUrl(projectId!, docId!);
  const members = project?.members ?? [];

  function toggleReviewer(id: string) {
    setSelectedReviewers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <AppShell>
      {/* Two-column layout within AppShell content area */}
      <div className="flex h-full overflow-hidden">
        {/* Section nav sidebar */}
        <aside className="w-56 bg-[#0f1c3a] border-r border-[#0f3460]/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-[#0f3460]/40">
            <button
              onClick={() => navigate(`/projects/${projectId}/documents`)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-3 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              All Documents
            </button>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{doc.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{doc.type.toUpperCase().replace(/_/g, ' ')} · v{doc.version}</p>
              </div>
            </div>
            <Badge className={`${STATUS_COLORS[doc.status]} text-white text-xs mt-2`}>
              {doc.status.replace(/_/g, ' ')}
            </Badge>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {doc.sections.map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setActiveSection(s.id); setEditContent(s.content); }}
                className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                  activeSection === s.id
                    ? 'bg-[#0f3460] text-white'
                    : 'text-gray-400 hover:bg-[#16213e] hover:text-white'
                }`}
              >
                <span className="text-gray-500 mr-1">{i + 1}.</span> {s.title}
              </button>
            ))}
          </nav>

          <div className="p-3 space-y-2 border-t border-[#0f3460]/40">
            <a href={pdfUrl} target="_blank" rel="noreferrer" className="block">
              <Button variant="ghost" size="sm" className="w-full text-xs text-gray-300 hover:text-white">
                Export PDF
              </Button>
            </a>
            {doc.status === 'draft' && (
              <Button size="sm" className="w-full text-xs" onClick={() => setShowSubmit(true)}>
                Submit for Review
              </Button>
            )}
            {doc.status === 'in_review' && (
              <Button size="sm" className="w-full text-xs bg-yellow-600 hover:bg-yellow-700" onClick={() => setShowReview(true)}>
                Submit Review
              </Button>
            )}
            {doc.status === 'client_review' && (
              <Button
                size="sm"
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
        <main className="flex-1 overflow-y-auto p-6 bg-[#1a1a2e]">
          {!activeSection ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <FileText className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-base">Select a section from the left to edit</p>
              <p className="text-sm mt-1 opacity-60">{doc.sections.length} section{doc.sections.length !== 1 ? 's' : ''} available</p>
            </div>
          ) : (() => {
            const section = doc.sections.find((s) => s.id === activeSection)!;
            return (
              <div className="max-w-3xl">
                <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
                {canEdit ? (
                  <>
                    <Textarea
                      className="bg-[#16213e] border-[#0f3460] text-white min-h-[320px] font-mono text-sm resize-none"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Write section content here…"
                    />
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => updateSectionMut.mutate({ sectionId: activeSection, content: editContent })}
                        disabled={updateSectionMut.isPending}
                      >
                        {updateSectionMut.isPending ? 'Saving…' : 'Save Section'}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => setActiveSection(null)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#16213e] border border-[#0f3460]/30 rounded-lg p-4">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">{section.content || '(no content)'}</pre>
                  </div>
                )}

                {section.linkedReqs.length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm font-semibold text-gray-400 mb-2">Linked Requirements</p>
                    {section.linkedReqs.map((rid) => {
                      const req = requirements.find((r) => r._id === rid);
                      return (
                        <div key={rid} className="bg-[#0f1c3a] border-l-2 border-blue-500 p-3 rounded mb-2">
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

          {doc.reviewers.length > 0 && (
            <div className="mt-8 max-w-3xl bg-[#16213e] border border-[#0f3460]/40 rounded-lg p-4">
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
      </div>

      {/* Submit for review — pick from project members */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="bg-[#16213e] border-[#0f3460] text-white">
          <DialogHeader><DialogTitle>Submit for Review</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-gray-400">Select reviewers from the project team:</p>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500">No project members found.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map((m) => {
                  const uid = m.userId?._id ?? '';
                  const name = m.userId ? `${m.userId.firstName} ${m.userId.lastName}` : uid;
                  const email = m.userId?.email ?? '';
                  return (
                    <label key={uid} className="flex items-center gap-3 p-2 rounded hover:bg-[#0f3460]/20 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedReviewers.includes(uid)}
                        onChange={() => toggleReviewer(uid)}
                        className="h-4 w-4 rounded accent-blue-500"
                      />
                      <div>
                        <p className="text-sm text-white">{name}</p>
                        <p className="text-xs text-gray-400">{email} · {m.role.replace(/_/g, ' ')}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setShowSubmit(false)}>Cancel</Button>
            <Button
              disabled={selectedReviewers.length === 0 || submitMut.isPending}
              onClick={() => submitMut.mutate()}
            >
              {submitMut.isPending ? 'Submitting…' : `Submit to ${selectedReviewers.length} reviewer${selectedReviewers.length !== 1 ? 's' : ''}`}
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
                size="sm"
                className={reviewForm.status === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-[#1a1a2e] hover:bg-[#0f3460]'}
                onClick={() => setReviewForm({ ...reviewForm, status: 'approved' })}
              >Approve</Button>
              <Button
                size="sm"
                className={reviewForm.status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1a1a2e] hover:bg-[#0f3460]'}
                onClick={() => setReviewForm({ ...reviewForm, status: 'rejected' })}
              >Reject</Button>
            </div>
            <Label>Comment (optional)</Label>
            <Textarea
              className="bg-[#1a1a2e] border-[#0f3460] text-white"
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              placeholder="Provide feedback…"
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
    </AppShell>
  );
}
