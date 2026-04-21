/**
 * Phase 3 Integration Tests — Traceability (TraceLinks + RTM graph + Coverage)
 * Run: MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase3.mjs
 */

const BASE = 'http://localhost:4000/api';
let passed = 0, failed = 0;
const results = [];

function ok(name, cond, detail = '') {
  if (cond) { passed++; results.push(`  ✅ ${name}`); }
  else       { failed++; results.push(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
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

// ── Seed ──────────────────────────────────────────────────────────────────────
const stamp = Date.now();
const pw = 'Test1234!';

const r1 = await req('POST', '/auth/register', { firstName: 'P3', lastName: 'User', email: `p3_${stamp}@nexus.test`, password: pw });
const token = r1.data?.accessToken;
ok('T01 — User registers', !!token);

const projR = await req('POST', '/projects', { name: `P3 Project ${stamp}`, clientName: 'Client', startDate: new Date().toISOString() }, token);
const projectId = projR.data?.data?._id ?? projR.data?._id;
ok('T02 — Project created', !!projectId, JSON.stringify(projR.data));

// Create two requirements
const req1R = await req('POST', `/projects/${projectId}/requirements`, { title: 'Login feature', type: 'functional', priority: 'high' }, token);
const req1Id = req1R.data?.data?._id;
ok('T03 — Requirement 1 created', !!req1Id);

const req2R = await req('POST', `/projects/${projectId}/requirements`, { title: 'Logout feature', type: 'functional', priority: 'medium' }, token);
const req2Id = req2R.data?.data?._id;
ok('T04 — Requirement 2 created', !!req2Id);

// Create an SRS doc to get a section ID
const docR = await req('POST', `/projects/${projectId}/documents`, { type: 'srs', title: 'SRS for P3', version: '1.0' }, token);
const docId = docR.data?._id;
const sectionId = docR.data?.sections?.[0]?.id;
ok('T05 — SRS document created with sections', !!sectionId);

// ── TraceLinks CRUD ───────────────────────────────────────────────────────────

// Create: requirement → srs_section (derives)
const link1R = await req('POST', `/projects/${projectId}/tracelinks`, {
  sourceType: 'requirement', sourceId: req1Id,
  targetType: 'srs_section', targetId: sectionId,
  linkType: 'derives',
}, token);
ok('T06 — POST /tracelinks creates link (derives)', link1R.status === 201, JSON.stringify(link1R.data));
const link1Id = link1R.data?._id;

// Create: requirement → requirement (verifies)
const link2R = await req('POST', `/projects/${projectId}/tracelinks`, {
  sourceType: 'requirement', sourceId: req1Id,
  targetType: 'requirement', targetId: req2Id,
  linkType: 'verifies',
}, token);
ok('T07 — POST /tracelinks creates link (verifies)', link2R.status === 201);
const link2Id = link2R.data?._id;

// Duplicate link rejected
const dupR = await req('POST', `/projects/${projectId}/tracelinks`, {
  sourceType: 'requirement', sourceId: req1Id,
  targetType: 'srs_section', targetId: sectionId,
  linkType: 'derives',
}, token);
ok('T08 — Duplicate link returns 409', dupR.status === 409);

// Self-link rejected
const selfR = await req('POST', `/projects/${projectId}/tracelinks`, {
  sourceType: 'requirement', sourceId: req1Id,
  targetType: 'requirement', targetId: req1Id,
  linkType: 'verifies',
}, token);
ok('T09 — Self-link returns 400', selfR.status === 400);

// Missing fields rejected
const badR = await req('POST', `/projects/${projectId}/tracelinks`, { sourceType: 'requirement', sourceId: req1Id }, token);
ok('T10 — Missing fields returns 400', badR.status === 400);

// List links
const listR = await req('GET', `/projects/${projectId}/tracelinks`, null, token);
ok('T11 — GET /tracelinks returns array', Array.isArray(listR.data));
ok('T12 — List contains both created links', listR.data?.length >= 2);

// ── Graph endpoint ────────────────────────────────────────────────────────────

const graphR = await req('GET', `/projects/${projectId}/traceability/graph`, null, token);
ok('T13 — GET /traceability/graph returns 200', graphR.status === 200, JSON.stringify(graphR.data));
ok('T14 — Graph has nodes array', Array.isArray(graphR.data?.nodes));
ok('T15 — Graph has edges array', Array.isArray(graphR.data?.edges));
ok('T16 — Graph nodes include requirement nodes', graphR.data?.nodes?.some((n) => n.type === 'requirement'));
ok('T17 — Graph nodes include srs_section nodes', graphR.data?.nodes?.some((n) => n.type === 'srs_section'));
ok('T18 — Graph edges count matches link count', graphR.data?.edges?.length >= 2);
ok('T19 — Edge has source, target, linkType fields', graphR.data?.edges?.[0]?.source && graphR.data?.edges?.[0]?.linkType);

// ── Coverage endpoint ─────────────────────────────────────────────────────────

const covR = await req('GET', `/projects/${projectId}/traceability/coverage`, null, token);
ok('T20 — GET /traceability/coverage returns 200', covR.status === 200, JSON.stringify(covR.data));
ok('T21 — Coverage has total field', typeof covR.data?.total === 'number');
ok('T22 — Coverage total equals requirement count (2)', covR.data?.total === 2);
ok('T23 — Coverage has coveragePercent', typeof covR.data?.coveragePercent === 'number');
ok('T24 — Coverage has orphanList array', Array.isArray(covR.data?.orphanList));
// req1 is linked twice, req2 is linked as target — both should be covered
ok('T25 — Both requirements covered (0 orphans)', covR.data?.orphans === 0, `orphans=${covR.data?.orphans}`);
ok('T26 — Coverage percent is 100 when all linked', covR.data?.coveragePercent === 100);

// ── Orphan detection ──────────────────────────────────────────────────────────

// Create a 3rd requirement with NO links → should appear as orphan
const req3R = await req('POST', `/projects/${projectId}/requirements`, { title: 'Unlinked feature', type: 'constraint', priority: 'low' }, token);
const req3Id = req3R.data?.data?._id;
ok('T27 — Orphan requirement created', !!req3Id);

const covR2 = await req('GET', `/projects/${projectId}/traceability/coverage`, null, token);
ok('T28 — Coverage total now 3', covR2.data?.total === 3, `total=${covR2.data?.total}`);
ok('T29 — Orphan count is 1', covR2.data?.orphans === 1, `orphans=${covR2.data?.orphans}`);
ok('T30 — Orphan list contains unlinked requirement', covR2.data?.orphanList?.some((r) => r._id === req3Id));
ok('T31 — Coverage percent dropped below 100', covR2.data?.coveragePercent < 100);

// ── Delete link ───────────────────────────────────────────────────────────────

const delR = await req('DELETE', `/projects/${projectId}/tracelinks/${link2Id}`, null, token);
ok('T32 — DELETE /tracelinks/:id returns 200', delR.status === 200);

const listAfterDel = await req('GET', `/projects/${projectId}/tracelinks`, null, token);
ok('T33 — Link removed from list after delete', listAfterDel.data?.length === listR.data?.length - 1);

// Delete non-existent
const del404 = await req('DELETE', `/projects/${projectId}/tracelinks/${link2Id}`, null, token);
ok('T34 — Delete already-deleted link returns 404', del404.status === 404);

// ── Auth guard ────────────────────────────────────────────────────────────────

const noAuth = await req('GET', `/projects/${projectId}/tracelinks`, null, null);
ok('T35 — Unauthenticated request returns 401', noAuth.status === 401);

// ── Print ─────────────────────────────────────────────────────────────────────
console.log('\n📋 Phase 3 Test Results\n');
results.forEach((r) => console.log(r));
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
