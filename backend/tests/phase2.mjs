/**
 * Phase 2 Integration Tests — Documents, Approvals, Notifications, Settings
 * Run inside container: MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase2.mjs
 */

const BASE = 'http://localhost:4000/api';
let passed = 0, failed = 0;
const results = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

function ok(name, cond, detail = '') {
  if (cond) {
    passed++;
    results.push(`  ✅ ${name}`);
  } else {
    failed++;
    results.push(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(method, path, body, token) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, opts);
  let data;
  try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
}

// ── Seed users ────────────────────────────────────────────────────────────────

async function register(firstName, lastName, email, password) {
  const r = await req('POST', '/auth/register', { firstName, lastName, email, password });
  return r.data?.accessToken;
}
async function login(email, password) {
  const r = await req('POST', '/auth/login', { email, password });
  return r.data?.accessToken;
}

const stamp = Date.now();
const adminEmail = `admin_p2_${stamp}@nexus.test`;
const reviewerEmail = `reviewer_p2_${stamp}@nexus.test`;
const pw = 'Test1234!';

const adminToken = await register('Admin', 'P2', adminEmail, pw);
const reviewerToken = await register('Reviewer', 'P2', reviewerEmail, pw);
ok('T01 — Seed: admin registers', !!adminToken);
ok('T02 — Seed: reviewer registers', !!reviewerToken);

// Get reviewer user id
const meR = await req('GET', '/auth/me', null, reviewerToken);
const reviewerId = meR.data?._id ?? meR.data?.data?._id;
ok('T03 — Seed: reviewer /me returns id', !!reviewerId, JSON.stringify(meR.data));

// Create project (project controller wraps in { data: ... })
const projR = await req('POST', '/projects', { name: `P2 Project ${stamp}`, clientName: 'Client', description: '', startDate: new Date().toISOString() }, adminToken);
const projectId = projR.data?.data?._id ?? projR.data?._id;
ok('T04 — Seed: project created', !!projectId, JSON.stringify(projR.data));

// ── Settings ──────────────────────────────────────────────────────────────────

const settingsR = await req('GET', '/settings', null, adminToken);
ok('T05 — GET /settings returns companyName', typeof settingsR.data?.companyName === 'string', JSON.stringify(settingsR.data));

const patchSettings = await req('PATCH', '/settings', { companyName: 'NEXUS Test Corp' }, adminToken);
ok('T06 — PATCH /settings updates companyName', patchSettings.data?.companyName === 'NEXUS Test Corp', JSON.stringify(patchSettings.data));

// ── Documents ─────────────────────────────────────────────────────────────────

const createDocR = await req('POST', `/projects/${projectId}/documents`, { type: 'srs', title: 'System Requirements Specification', version: '1.0' }, adminToken);
ok('T07 — POST /documents creates SRS doc', createDocR.status === 201, JSON.stringify(createDocR.data));
const docId = createDocR.data?._id;
ok('T08 — SRS doc has sections (IEEE 830)', Array.isArray(createDocR.data?.sections) && createDocR.data.sections.length > 0);
ok('T09 — SRS first section is Introduction', createDocR.data?.sections?.[0]?.title === 'Introduction');

const listDocsR = await req('GET', `/projects/${projectId}/documents`, null, adminToken);
ok('T10 — GET /documents lists created doc', Array.isArray(listDocsR.data) && listDocsR.data.length >= 1);

const getDocR = await req('GET', `/projects/${projectId}/documents/${docId}`, null, adminToken);
ok('T11 — GET /documents/:id returns full doc with sections', Array.isArray(getDocR.data?.sections));

// Update a section
const sectionId = createDocR.data?.sections?.[0]?.id;
const patchSecR = await req('PATCH', `/projects/${projectId}/documents/${docId}/sections/${sectionId}`, { content: 'This document describes system requirements.' }, adminToken);
ok('T12 — PATCH section updates content', patchSecR.status === 200, JSON.stringify(patchSecR.data?.sections?.[0]?.content));

// Cannot update non-draft section after submit? — test editing draft first
const updatedContent = patchSecR.data?.sections?.find((s) => s.id === sectionId)?.content;
ok('T13 — Section content saved correctly', updatedContent === 'This document describes system requirements.');

// ── Review workflow ───────────────────────────────────────────────────────────

const submitR = await req('POST', `/projects/${projectId}/documents/${docId}/submit`, { reviewerIds: [reviewerId] }, adminToken);
ok('T14 — POST /submit changes status to in_review', submitR.data?.status === 'in_review', JSON.stringify(submitR.data?.status));
ok('T15 — /submit sets reviewer with pending status', submitR.data?.reviewers?.[0]?.status === 'pending');

// Cannot edit section when in_review? Actually our controller allows editing in in_review
const patchWhenInReviewR = await req('PATCH', `/projects/${projectId}/documents/${docId}/sections/${sectionId}`, { content: 'Updated in review.' }, adminToken);
ok('T16 — PATCH section allowed during in_review', patchWhenInReviewR.status === 200);

// Submit review (approve)
const reviewR = await req('POST', `/projects/${projectId}/documents/${docId}/review`, { status: 'approved', comment: 'LGTM' }, reviewerToken);
ok('T17 — POST /review returns 200', reviewR.status === 200, JSON.stringify(reviewR.data));
ok('T18 — All reviewers approved → status becomes client_review', reviewR.data?.status === 'client_review', JSON.stringify(reviewR.data?.status));

// Approve document (client approval)
const approveR = await req('POST', `/projects/${projectId}/documents/${docId}/approve`, null, adminToken);
ok('T19 — POST /approve changes status to approved', approveR.data?.status === 'approved', JSON.stringify(approveR.data?.status));

// Cannot submit approved doc for review
const resubmitR = await req('POST', `/projects/${projectId}/documents/${docId}/submit`, { reviewerIds: [reviewerId] }, adminToken);
ok('T20 — Cannot resubmit approved document (400)', resubmitR.status === 400);

// ── PDF export ────────────────────────────────────────────────────────────────

const pdfR = await fetch(`${BASE}/projects/${projectId}/documents/${docId}/pdf`, {
  headers: { Authorization: `Bearer ${adminToken}` },
});
ok('T21 — GET /pdf returns 200', pdfR.status === 200, `status=${pdfR.status}`);
ok('T22 — PDF content-type is application/pdf', pdfR.headers.get('content-type')?.includes('application/pdf'));

// ── Rejection flow ────────────────────────────────────────────────────────────

const doc2R = await req('POST', `/projects/${projectId}/documents`, { type: 'sds', title: 'Software Design Spec', version: '1.0' }, adminToken);
const doc2Id = doc2R.data?._id;
await req('POST', `/projects/${projectId}/documents/${doc2Id}/submit`, { reviewerIds: [reviewerId] }, adminToken);
const rejectR = await req('POST', `/projects/${projectId}/documents/${doc2Id}/review`, { status: 'rejected', comment: 'Needs more detail' }, reviewerToken);
ok('T23 — Rejected doc reverts to draft', rejectR.data?.status === 'draft', JSON.stringify(rejectR.data?.status));

// ── Notifications ─────────────────────────────────────────────────────────────

// reviewer should have received a notification when doc was submitted
const notifsR = await req('GET', '/notifications', null, reviewerToken);
ok('T24 — GET /notifications returns array', Array.isArray(notifsR.data), JSON.stringify(notifsR.data));
ok('T25 — Reviewer received review_request notification', notifsR.data?.some((n) => n.type === 'review_request'));

const countR = await req('GET', '/notifications/unread-count', null, reviewerToken);
ok('T26 — GET /notifications/unread-count returns count', typeof countR.data?.count === 'number', JSON.stringify(countR.data));

const firstNotif = notifsR.data?.[0];
if (firstNotif) {
  const markR = await req('PATCH', `/notifications/${firstNotif._id}/read`, null, reviewerToken);
  ok('T27 — PATCH /notifications/:id/read marks as read', markR.data?.read === true);
}

const markAllR = await req('PATCH', '/notifications/read-all', null, reviewerToken);
ok('T28 — PATCH /notifications/read-all returns 200', markAllR.status === 200);

// admin should have received notifications about review outcomes
const adminNotifsR = await req('GET', '/notifications', null, adminToken);
ok('T29 — Admin received review outcome notification', adminNotifsR.data?.length > 0);

// ── Delete document ───────────────────────────────────────────────────────────

const doc3R = await req('POST', `/projects/${projectId}/documents`, { type: 'fat_plan', title: 'FAT Plan to Delete', version: '1.0' }, adminToken);
const doc3Id = doc3R.data?._id;
const delR = await req('DELETE', `/projects/${projectId}/documents/${doc3Id}`, null, adminToken);
ok('T30 — DELETE /documents/:id returns 200', delR.status === 200);

const afterDelR = await req('GET', `/projects/${projectId}/documents/${doc3Id}`, null, adminToken);
ok('T31 — Deleted doc returns 404', afterDelR.status === 404);

// ── Auth guard ────────────────────────────────────────────────────────────────

const noTokenR = await req('GET', `/projects/${projectId}/documents`, null, null);
ok('T32 — Unauthenticated request returns 401', noTokenR.status === 401);

// ── Print results ─────────────────────────────────────────────────────────────

console.log('\n📋 Phase 2 Test Results\n');
results.forEach((r) => console.log(r));
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
