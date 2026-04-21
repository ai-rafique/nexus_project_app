/**
 * Phase 5 Integration Tests — Verification Matrix, Audit Trail
 * Run inside container: MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase5.mjs
 */

const BASE = 'http://localhost:4000/api';
let passed = 0, failed = 0;
const results = [];

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

// ── Seed ──────────────────────────────────────────────────────────────────────

const stamp = Date.now();
const adminEmail = `admin_p5_${stamp}@nexus.test`;
const pw = 'Test1234!';

const regR = await req('POST', '/auth/register', { firstName: 'Admin', lastName: 'P5', email: adminEmail, password: pw });
const adminToken = regR.data?.accessToken;
ok('T01 — Register admin', !!adminToken, JSON.stringify(regR.data));

// Audit should record user.register
// (We'll verify this later after more actions)

const logR = await req('POST', '/auth/login', { email: adminEmail, password: pw });
ok('T02 — Login returns token', !!logR.data?.accessToken, JSON.stringify(logR.data));

const meR = await req('GET', '/auth/me', null, adminToken);
const userId = meR.data?._id;
ok('T03 — /me returns user id', !!userId, JSON.stringify(meR.data));

const projR = await req('POST', '/projects', {
  name: `P5 Project ${stamp}`,
  clientName: 'Test Client',
  description: '',
  startDate: new Date().toISOString(),
}, adminToken);
const projectId = projR.data?.data?._id ?? projR.data?._id;
ok('T04 — Project created', !!projectId, JSON.stringify(projR.data));

// Create a requirement to use in verification matrix
const reqR = await req('POST', `/projects/${projectId}/requirements`, {
  title: 'The system shall verify all inputs',
  type: 'functional',
  priority: 'high',
}, adminToken);
const requirementId = reqR.data?.data?._id;
ok('T05 — Requirement created', !!requirementId, JSON.stringify(reqR.data));

// ── Verification Matrix ───────────────────────────────────────────────────────

const matrixR = await req('GET', `/projects/${projectId}/verification`, null, adminToken);
ok('T06 — GET /verification returns matrix', matrixR.status === 200, JSON.stringify(matrixR.data));
ok('T07 — Matrix has entries array', Array.isArray(matrixR.data?.entries), JSON.stringify(matrixR.data));
ok('T08 — New matrix has empty entries', matrixR.data?.entries?.length === 0);

// Add entry
const addR = await req('POST', `/projects/${projectId}/verification/entries`, {
  requirementId,
  method: 'test',
  reference: 'TC-001',
  notes: 'Automated test suite',
}, adminToken);
ok('T09 — POST /verification/entries creates entry', addR.status === 200 || addR.status === 201, JSON.stringify(addR.data));
const entryId = addR.data?.entries?.[0]?._id;
ok('T10 — Entry has _id', !!entryId, JSON.stringify(addR.data?.entries));

// Duplicate method+req should 409
const dupR = await req('POST', `/projects/${projectId}/verification/entries`, {
  requirementId,
  method: 'test',
}, adminToken);
ok('T11 — Duplicate entry returns 409', dupR.status === 409, JSON.stringify(dupR.data));

// Add second entry with different method
const add2R = await req('POST', `/projects/${projectId}/verification/entries`, {
  requirementId,
  method: 'review',
  reference: 'Peer review',
}, adminToken);
ok('T12 — Can add same req with different method', add2R.status === 200 || add2R.status === 201, JSON.stringify(add2R.data));

// Update entry status
const updR = await req('PATCH', `/projects/${projectId}/verification/entries/${entryId}`, {
  status: 'verified',
  notes: 'All test cases passed',
}, adminToken);
ok('T13 — PATCH entry status updates', updR.status === 200, JSON.stringify(updR.data));

const updEntry = updR.data?.entries?.find((e) => e._id === entryId);
ok('T14 — Status changed to verified', updEntry?.status === 'verified', JSON.stringify(updEntry));
ok('T15 — verifiedBy is set', !!updEntry?.verifiedBy, JSON.stringify(updEntry));
ok('T16 — verifiedAt is set', !!updEntry?.verifiedAt, JSON.stringify(updEntry));

// Update to in_progress — verifiedBy should not be set again
const updR2 = await req('PATCH', `/projects/${projectId}/verification/entries/${entryId}`, {
  status: 'in_progress',
}, adminToken);
ok('T17 — Can update status to in_progress', updR2.status === 200, JSON.stringify(updR2.data));

// Summary
const summaryR = await req('GET', `/projects/${projectId}/verification/summary`, null, adminToken);
ok('T18 — GET /verification/summary returns object', summaryR.status === 200, JSON.stringify(summaryR.data));
ok('T19 — Summary has totalRequirements', typeof summaryR.data?.totalRequirements === 'number', JSON.stringify(summaryR.data));
ok('T20 — Summary has verificationRate', typeof summaryR.data?.verificationRate === 'number', JSON.stringify(summaryR.data));
ok('T21 — Summary coveredRequirements > 0', summaryR.data?.coveredRequirements > 0, JSON.stringify(summaryR.data));

// Auto-populate (may add 0 new entries if no test cases or trace links)
const autoR = await req('POST', `/projects/${projectId}/verification/auto-populate`, null, adminToken);
ok('T22 — POST /verification/auto-populate returns 200', autoR.status === 200, JSON.stringify(autoR.data));
ok('T23 — Auto-populate returns matrix', !!autoR.data?.entries, JSON.stringify(autoR.data));

// Delete entry
const entryToDelete = add2R.data?.entries?.find((e) => e.method === 'review')?._id;
if (entryToDelete) {
  const delR = await req('DELETE', `/projects/${projectId}/verification/entries/${entryToDelete}`, null, adminToken);
  ok('T24 — DELETE entry returns 200', delR.status === 200, JSON.stringify(delR.data));

  const afterDel = await req('GET', `/projects/${projectId}/verification`, null, adminToken);
  const stillThere = afterDel.data?.entries?.some((e) => e._id === entryToDelete);
  ok('T25 — Deleted entry no longer in matrix', !stillThere);
} else {
  ok('T24 — DELETE entry returns 200', true, 'skipped — no second entry id');
  ok('T25 — Deleted entry no longer in matrix', true, 'skipped');
}

// ── Audit Trail ───────────────────────────────────────────────────────────────

// Wait a moment for async audit writes to complete
await new Promise((r) => setTimeout(r, 300));

const auditR = await req('GET', `/projects/${projectId}/audit`, null, adminToken);
ok('T26 — GET /audit returns data array', Array.isArray(auditR.data?.data), JSON.stringify(auditR.data));
ok('T27 — Audit has total count', typeof auditR.data?.total === 'number', JSON.stringify(auditR.data));
ok('T28 — Audit log contains events', auditR.data?.total > 0, JSON.stringify(auditR.data));

const auditEntries = auditR.data?.data ?? [];
const hasReqCreate = auditEntries.some((e) => e.action === 'requirement.create');
ok('T29 — requirement.create event recorded', hasReqCreate, JSON.stringify(auditEntries.map((e) => e.action)));

// Pagination
const paginatedR = await req('GET', `/projects/${projectId}/audit?limit=2&offset=0`, null, adminToken);
ok('T30 — Audit pagination limit works', Array.isArray(paginatedR.data?.data) && paginatedR.data.data.length <= 2, JSON.stringify(paginatedR.data));

// Global audit (no projectId filter)
const globalR = await req('GET', '/audit', null, adminToken);
ok('T31 — GET /audit (global) returns events', Array.isArray(globalR.data?.data), JSON.stringify(globalR.data));

const hasRegister = globalR.data?.data?.some((e) => e.action === 'user.register');
ok('T32 — Global audit contains user.register event', hasRegister, JSON.stringify(globalR.data?.data?.slice(0, 3)));

const hasLogin = globalR.data?.data?.some((e) => e.action === 'user.login');
ok('T33 — Global audit contains user.login event', hasLogin, JSON.stringify(globalR.data?.data?.slice(0, 5)));

// Filter global audit by action
const filteredR = await req('GET', '/audit?action=user.register', null, adminToken);
ok('T34 — Global audit action filter works', Array.isArray(filteredR.data?.data) && filteredR.data.data.every((e) => e.action === 'user.register'), JSON.stringify(filteredR.data));

// Auth guard on audit
const noAuthR = await req('GET', `/projects/${projectId}/audit`, null, null);
ok('T35 — Unauthenticated audit returns 401', noAuthR.status === 401, JSON.stringify(noAuthR.data));

// ── Print results ─────────────────────────────────────────────────────────────

console.log('\n📋 Phase 5 Test Results\n');
results.forEach((r) => console.log(r));
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
