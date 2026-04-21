/**
 * Phase 4 Integration Tests — Test Cases, Test Runs, FAT Plan, FAT Execution, Report
 * Run: MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase4.mjs
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

const r1 = await req('POST', '/auth/register', { firstName: 'P4', lastName: 'User', email: `p4_${stamp}@nexus.test`, password: pw });
const token = r1.data?.accessToken;
ok('T01 — User registers', !!token);

const projR = await req('POST', '/projects', { name: `P4 Project ${stamp}`, clientName: 'Client', startDate: new Date().toISOString() }, token);
const projectId = projR.data?.data?._id ?? projR.data?._id;
ok('T02 — Project created', !!projectId, JSON.stringify(projR.data));

const reqR = await req('POST', `/projects/${projectId}/requirements`, { title: 'Login', type: 'functional', priority: 'high' }, token);
const reqId = reqR.data?.data?._id;
ok('T03 — Requirement created', !!reqId);

// ── Test Cases ────────────────────────────────────────────────────────────────

const tc1R = await req('POST', `/projects/${projectId}/tests`, {
  title: 'Verify login with valid credentials',
  description: 'Check that a registered user can log in.',
  steps: [
    { order: 1, action: 'Navigate to /login', expected: 'Login page loads' },
    { order: 2, action: 'Enter valid credentials', expected: 'Dashboard displayed' },
  ],
  linkedReqs: [reqId],
}, token);
ok('T04 — POST /tests creates test case', tc1R.status === 201, JSON.stringify(tc1R.data));
const tc1Id = tc1R.data?._id;
ok('T05 — Test case has auto-assigned testId (TC-001)', tc1R.data?.testId === 'TC-001');
ok('T06 — Test case has steps', tc1R.data?.steps?.length === 2);

const tc2R = await req('POST', `/projects/${projectId}/tests`, { title: 'Verify login with invalid password', type: 'functional', priority: 'high' }, token);
ok('T07 — Second test case gets TC-002', tc2R.data?.testId === 'TC-002');
const tc2Id = tc2R.data?._id;

// Missing title
const badTcR = await req('POST', `/projects/${projectId}/tests`, { description: 'no title' }, token);
ok('T08 — Missing title returns 400', badTcR.status === 400);

// List
const listTcR = await req('GET', `/projects/${projectId}/tests`, null, token);
ok('T09 — GET /tests returns array', Array.isArray(listTcR.data));
ok('T10 — List has 2 test cases', listTcR.data?.length === 2);

// Get single
const getTcR = await req('GET', `/projects/${projectId}/tests/${tc1Id}`, null, token);
ok('T11 — GET /tests/:id returns test case', getTcR.data?._id === tc1Id);
ok('T12 — Test case has populated linkedReqs', Array.isArray(getTcR.data?.linkedReqs));

// Update
const patchTcR = await req('PATCH', `/projects/${projectId}/tests/${tc1Id}`, { status: 'active', description: 'Updated desc' }, token);
ok('T13 — PATCH /tests/:id updates fields', patchTcR.data?.status === 'active');

// Filter by status
const filterR = await req('GET', `/projects/${projectId}/tests?status=active`, null, token);
ok('T14 — Filter by status=active works', filterR.data?.every((t) => t.status === 'active'));

// ── Test Runs ─────────────────────────────────────────────────────────────────

const run1R = await req('POST', `/projects/${projectId}/tests/${tc1Id}/runs`, { result: 'pass', notes: 'All steps passed.' }, token);
ok('T15 — POST /runs logs a pass result', run1R.status === 201, JSON.stringify(run1R.data));
ok('T16 — Run has result=pass', run1R.data?.result === 'pass');

const run2R = await req('POST', `/projects/${projectId}/tests/${tc1Id}/runs`, { result: 'fail', notes: 'Step 2 failed.' }, token);
ok('T17 — Second run logs a fail result', run2R.data?.result === 'fail');

// Invalid result
const badRunR = await req('POST', `/projects/${projectId}/tests/${tc1Id}/runs`, { result: 'invalid' }, token);
ok('T18 — Invalid run result returns 400', badRunR.status === 400);

// Get runs
const runsR = await req('GET', `/projects/${projectId}/tests/${tc1Id}/runs`, null, token);
ok('T19 — GET /runs returns array of runs', Array.isArray(runsR.data));
ok('T20 — Run history has 2 entries', runsR.data?.length === 2);

// Delete test case
const delTcR = await req('DELETE', `/projects/${projectId}/tests/${tc2Id}`, null, token);
ok('T21 — DELETE /tests/:id returns 200', delTcR.status === 200);
const afterDel = await req('GET', `/projects/${projectId}/tests/${tc2Id}`, null, token);
ok('T22 — Deleted test case returns 404', afterDel.status === 404);

// ── FAT Plan ──────────────────────────────────────────────────────────────────

const fatR = await req('POST', `/projects/${projectId}/fat`, {
  title: 'Factory Acceptance Test — Login Module',
  items: [
    { title: 'Login with valid credentials', description: 'Verify successful login', linkedReq: reqId },
    { title: 'Login with invalid password', description: 'Verify error message shown' },
    { title: 'Session timeout behaviour', description: 'Verify session expires after idle' },
  ],
}, token);
ok('T23 — POST /fat creates FAT plan', fatR.status === 201, JSON.stringify(fatR.data));
const planId = fatR.data?._id;
ok('T24 — FAT plan has 3 items', fatR.data?.items?.length === 3);
ok('T25 — FAT plan status is draft', fatR.data?.status === 'draft');
ok('T26 — All items default to pending', fatR.data?.items?.every((i) => i.result === 'pending'));

// Missing title
const badFatR = await req('POST', `/projects/${projectId}/fat`, { items: [] }, token);
ok('T27 — Missing FAT title returns 400', badFatR.status === 400);

// List plans
const listFatR = await req('GET', `/projects/${projectId}/fat`, null, token);
ok('T28 — GET /fat returns array', Array.isArray(listFatR.data));
ok('T29 — List contains created plan', listFatR.data?.length >= 1);

// Get plan
const getFatR = await req('GET', `/projects/${projectId}/fat/${planId}`, null, token);
ok('T30 — GET /fat/:planId returns plan with items', getFatR.data?.items?.length === 3);

// Add item
const addItemR = await req('POST', `/projects/${projectId}/fat/${planId}/items`, { title: 'Password reset flow', description: 'Verify reset email received' }, token);
ok('T31 — POST /fat/:planId/items adds item', addItemR.status === 201);
ok('T32 — Item starts as pending', addItemR.data?.result === 'pending');

// ── FAT Execution ─────────────────────────────────────────────────────────────

const item0Id = getFatR.data?.items?.[0]?._id;
const item1Id = getFatR.data?.items?.[1]?._id;
const item2Id = getFatR.data?.items?.[2]?._id;

// Pass first item
const exec1R = await req('PATCH', `/projects/${projectId}/fat/${planId}/items/${item0Id}`, { result: 'pass', observations: 'Logged in successfully.' }, token);
ok('T33 — PATCH item sets result=pass', exec1R.data?.result === 'pass');

// Check plan moves to in_progress
const midPlanR = await req('GET', `/projects/${projectId}/fat/${planId}`, null, token);
ok('T34 — Plan status moves to in_progress after first execution', midPlanR.data?.status === 'in_progress');

// Sign off on passed item
const signR = await req('POST', `/projects/${projectId}/fat/${planId}/items/${item0Id}/sign`, {}, token);
ok('T35 — POST /sign marks item as signedOff', signR.data?.signedOff === true);
ok('T36 — Sign records signedBy and signedAt', !!signR.data?.signedBy && !!signR.data?.signedAt);

// Cannot sign pending item
const noSignR = await req('POST', `/projects/${projectId}/fat/${planId}/items/${item1Id}/sign`, {}, token);
ok('T37 — Cannot sign a pending item (400)', noSignR.status === 400);

// Fail second item
await req('PATCH', `/projects/${projectId}/fat/${planId}/items/${item1Id}`, { result: 'fail', observations: 'Error message not shown.' }, token);

// Finish remaining items to trigger auto-complete
const addedItemR = await req('GET', `/projects/${projectId}/fat/${planId}`, null, token);
const addedItemId = addedItemR.data?.items?.[3]?._id;
await req('PATCH', `/projects/${projectId}/fat/${planId}/items/${item2Id}`, { result: 'pass', observations: 'Session expired correctly.' }, token);
await req('PATCH', `/projects/${projectId}/fat/${planId}/items/${addedItemId}`, { result: 'blocked', observations: 'Email server not configured.' }, token);

const donePlanR = await req('GET', `/projects/${projectId}/fat/${planId}`, null, token);
ok('T38 — Plan auto-completes when all items have results', donePlanR.data?.status === 'completed');

// ── FAT Report ────────────────────────────────────────────────────────────────

const reportR = await req('GET', `/projects/${projectId}/fat/${planId}/report`, null, token);
ok('T39 — GET /fat/:planId/report returns 200', reportR.status === 200, JSON.stringify(reportR.data));
ok('T40 — Report has summary object', typeof reportR.data?.summary === 'object');
ok('T41 — Report summary total = 4', reportR.data?.summary?.total === 4);
ok('T42 — Report summary passed = 2', reportR.data?.summary?.passed === 2);
ok('T43 — Report summary failed = 1', reportR.data?.summary?.failed === 1);
ok('T44 — Report summary blocked = 1', reportR.data?.summary?.blocked === 1);
ok('T45 — Report has punchList array', Array.isArray(reportR.data?.punchList));
ok('T46 — Punch list contains the 1 failed item', reportR.data?.punchList?.length === 1);
ok('T47 — Report has passRate', typeof reportR.data?.passRate === 'number');
ok('T48 — Sign count = 1 in summary', reportR.data?.summary?.signedOff === 1);

// ── Auth guard ────────────────────────────────────────────────────────────────

const noAuth = await req('GET', `/projects/${projectId}/tests`, null, null);
ok('T49 — Unauthenticated /tests returns 401', noAuth.status === 401);

const noAuthFat = await req('GET', `/projects/${projectId}/fat`, null, null);
ok('T50 — Unauthenticated /fat returns 401', noAuthFat.status === 401);

// ── Print ─────────────────────────────────────────────────────────────────────
console.log('\n📋 Phase 4 Test Results\n');
results.forEach((r) => console.log(r));
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
