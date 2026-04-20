/**
 * NEXUS Phase 1 — Integration Test Suite
 * Projects (full CRUD + members) + Requirements (CRUD, versioning, comments, CSV import)
 * Run: MSYS_NO_PATHCONV=1 docker exec nexus_backend node /app/tests/phase1.mjs
 */

const BASE = 'http://localhost:4000';
let pass = 0, fail = 0;

const g = '\x1b[32m', r = '\x1b[31m', x = '\x1b[0m';
const ok  = (t)      => { console.log(`${g}  PASS${x}  ${t}`); pass++; };
const err = (t, why) => { console.log(`${r}  FAIL${x}  ${t}  →  ${why}`); fail++; };

async function req(method, path, body, token, isForm = false) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isForm) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: isForm ? body : (body ? JSON.stringify(body) : undefined),
    });
    let json = null;
    try { json = await res.json(); } catch {}
    return { status: res.status, json };
  } catch (e) {
    return { status: 0, json: null, error: e.message };
  }
}

function section(name) {
  console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 42 - name.length))}`);
}

// ── Setup: register two users ─────────────────────────────────────────────────
const ts = Date.now();
const EMAIL1 = `p1_user1_${ts}@nexus.test`;
const EMAIL2 = `p1_user2_${ts}@nexus.test`;

let res = await req('POST', '/api/auth/register', { email: EMAIL1, password: 'Passw0rd!', firstName: 'Alice', lastName: 'One' });
const TOKEN1  = res.json?.accessToken;
const USER1ID = res.json?.user?.id;

res = await req('POST', '/api/auth/register', { email: EMAIL2, password: 'Passw0rd!', firstName: 'Bob', lastName: 'Two' });
const TOKEN2  = res.json?.accessToken;
const USER2ID = res.json?.user?.id;

if (!TOKEN1 || !TOKEN2) { console.error('Setup failed — could not register test users'); process.exit(1); }

console.log('\n╔══════════════════════════════════════════╗');
console.log('║  NEXUS Phase 1 — Integration Test Suite ║');
console.log('╚══════════════════════════════════════════╝');

// ═══════════════════════════════════════════
// PROJECTS
// ═══════════════════════════════════════════
section('Projects — CRUD');

// T01 Create
res = await req('POST', '/api/projects', {
  name: 'Phase1 Project', clientName: 'Test Corp',
  startDate: '2026-01-01T00:00:00.000Z', description: 'Integration test project',
}, TOKEN1);
res.status === 201
  ? ok('T01  POST /api/projects returns 201')
  : err('T01  POST /api/projects returns 201', `${res.status} — ${JSON.stringify(res.json)}`);

const PID = res.json?.data?._id;
PID ? ok('T02  Created project has _id') : err('T02  Created project has _id', 'missing');

// T03 List — creator sees their project
res = await req('GET', '/api/projects', null, TOKEN1);
const found = res.json?.data?.some(p => p._id === PID);
res.status === 200 && found
  ? ok('T03  GET /api/projects lists creator\'s project')
  : err('T03  GET /api/projects lists creator\'s project', `status=${res.status} found=${found}`);

// T04 Get by id
res = await req('GET', `/api/projects/${PID}`, null, TOKEN1);
res.status === 200 && res.json?.data?._id === PID
  ? ok('T04  GET /api/projects/:id returns correct project')
  : err('T04  GET /api/projects/:id returns correct project', `${res.status}`);

// T05 Patch status
res = await req('PATCH', `/api/projects/${PID}`, { status: 'on_hold' }, TOKEN1);
res.status === 200 && res.json?.data?.status === 'on_hold'
  ? ok('T05  PATCH /api/projects/:id updates status')
  : err('T05  PATCH /api/projects/:id updates status', `${res.status} — ${JSON.stringify(res.json)}`);

// T06 Patch phase
res = await req('PATCH', `/api/projects/${PID}`, { currentPhase: 'srs' }, TOKEN1);
res.status === 200 && res.json?.data?.currentPhase === 'srs'
  ? ok('T06  PATCH /api/projects/:id updates currentPhase')
  : err('T06  PATCH /api/projects/:id updates currentPhase', `${res.status}`);

// T07 Non-member cannot access
res = await req('GET', `/api/projects/${PID}`, null, TOKEN2);
res.status === 403
  ? ok('T07  Non-member GET returns 403')
  : err('T07  Non-member GET returns 403', `${res.status}`);

// T08 Missing required field
res = await req('POST', '/api/projects', { name: 'No client' }, TOKEN1);
res.status === 400
  ? ok('T08  Missing clientName returns 400')
  : err('T08  Missing clientName returns 400', `${res.status}`);

// ── Member management ─────────────────────────────────────────────────────────
section('Projects — Member Management');

// T09 Add member
res = await req('POST', `/api/projects/${PID}/members`, { userId: USER2ID, role: 'business_analyst' }, TOKEN1);
res.status === 200
  ? ok('T09  POST /api/projects/:id/members adds member')
  : err('T09  POST /api/projects/:id/members adds member', `${res.status} — ${JSON.stringify(res.json)}`);

// T10 Member can now access project
res = await req('GET', `/api/projects/${PID}`, null, TOKEN2);
res.status === 200
  ? ok('T10  Newly added member can access project')
  : err('T10  Newly added member can access project', `${res.status}`);

// T11 Duplicate member rejected
res = await req('POST', `/api/projects/${PID}/members`, { userId: USER2ID, role: 'developer' }, TOKEN1);
res.status === 409
  ? ok('T11  Duplicate member returns 409')
  : err('T11  Duplicate member returns 409', `${res.status}`);

// T12 Member appears in project roster
res = await req('GET', `/api/projects/${PID}`, null, TOKEN1);
const members = res.json?.data?.members ?? [];
members.length >= 2
  ? ok('T12  Project roster has ≥ 2 members after add')
  : err('T12  Project roster has ≥ 2 members after add', `got ${members.length}`);

// ═══════════════════════════════════════════
// REQUIREMENTS
// ═══════════════════════════════════════════
section('Requirements — CRUD');

// T13 Create requirement
res = await req('POST', `/api/projects/${PID}/requirements`, {
  title: 'User Authentication', description: 'System must support JWT auth',
  acceptanceCriteria: 'Login returns access + refresh token',
  type: 'functional', priority: 'critical', source: 'Kickoff meeting',
}, TOKEN1);
res.status === 201
  ? ok('T13  POST /requirements returns 201')
  : err('T13  POST /requirements returns 201', `${res.status} — ${JSON.stringify(res.json)}`);

const RID  = res.json?.data?._id;
const REQID = res.json?.data?.reqId;
RID   ? ok('T14  Requirement has _id')     : err('T14  Requirement has _id', 'missing');
REQID ? ok('T15  Requirement has reqId (REQ-xxx)') : err('T15  Requirement has reqId', 'missing');

// T16 reqId auto-increments
res = await req('POST', `/api/projects/${PID}/requirements`, { title: 'Password Reset', type: 'functional', priority: 'high' }, TOKEN1);
const REQID2 = res.json?.data?.reqId;
res.status === 201 && REQID2 && REQID2 !== REQID
  ? ok('T16  Second requirement gets unique incremented reqId')
  : err('T16  Second requirement gets unique incremented reqId', `${REQID} vs ${REQID2}`);
const RID2 = res.json?.data?._id;

// T17 List requirements
res = await req('GET', `/api/projects/${PID}/requirements`, null, TOKEN1);
res.status === 200 && Array.isArray(res.json?.data) && res.json.data.length >= 2
  ? ok('T17  GET /requirements lists all requirements')
  : err('T17  GET /requirements lists all requirements', `${res.status} count=${res.json?.data?.length}`);

// T18 Get single requirement
res = await req('GET', `/api/projects/${PID}/requirements/${RID}`, null, TOKEN1);
res.status === 200 && res.json?.data?._id === RID
  ? ok('T18  GET /requirements/:reqId returns correct item')
  : err('T18  GET /requirements/:reqId returns correct item', `${res.status}`);

// T19 Filter by status
res = await req('GET', `/api/projects/${PID}/requirements?status=draft`, null, TOKEN1);
res.status === 200 && res.json?.data?.every(r => r.status === 'draft')
  ? ok('T19  Filter by status=draft works')
  : err('T19  Filter by status=draft works', `${res.status}`);

// T20 Filter by priority
res = await req('GET', `/api/projects/${PID}/requirements?priority=critical`, null, TOKEN1);
res.status === 200 && res.json?.data?.every(r => r.priority === 'critical')
  ? ok('T20  Filter by priority=critical works')
  : err('T20  Filter by priority=critical works', `${res.status}`);

// T21 Search by title
res = await req('GET', `/api/projects/${PID}/requirements?search=Authentication`, null, TOKEN1);
res.status === 200 && res.json?.data?.length >= 1
  ? ok('T21  Search by title works')
  : err('T21  Search by title works', `${res.status} count=${res.json?.data?.length}`);

// ── Versioning ─────────────────────────────────────────────────────────────────
section('Requirements — Versioning');

// T22 Update creates new version
res = await req('PATCH', `/api/projects/${PID}/requirements/${RID}`, {
  title: 'User Authentication (Updated)', status: 'under_review',
}, TOKEN1);
res.status === 200 && res.json?.data?.version === 2
  ? ok('T22  PATCH increments version to 2')
  : err('T22  PATCH increments version', `version=${res.json?.data?.version}`);

// T23 Version history is recorded
res = await req('GET', `/api/projects/${PID}/requirements/${RID}`, null, TOKEN1);
const vHistory = res.json?.data?.versionHistory ?? [];
vHistory.length >= 1
  ? ok('T23  Version history has ≥ 1 entry after update')
  : err('T23  Version history has ≥ 1 entry after update', `length=${vHistory.length}`);

// T24 Second update increments to v3
res = await req('PATCH', `/api/projects/${PID}/requirements/${RID}`, { status: 'approved' }, TOKEN1);
res.status === 200 && res.json?.data?.version === 3
  ? ok('T24  Second PATCH increments version to 3')
  : err('T24  Second PATCH increments version to 3', `version=${res.json?.data?.version}`);

// ── Comments ──────────────────────────────────────────────────────────────────
section('Requirements — Comments');

// T25 Add comment
res = await req('POST', `/api/projects/${PID}/requirements/${RID}/comments`, { text: 'Looks good, needs AC detail.' }, TOKEN1);
res.status === 201
  ? ok('T25  POST /comments returns 201')
  : err('T25  POST /comments returns 201', `${res.status} — ${JSON.stringify(res.json)}`);

// T26 Second user (member) can comment
res = await req('POST', `/api/projects/${PID}/requirements/${RID}/comments`, { text: 'Agreed, will update.' }, TOKEN2);
res.status === 201
  ? ok('T26  Member can add comment')
  : err('T26  Member can add comment', `${res.status}`);

// T27 Comments appear on GET
res = await req('GET', `/api/projects/${PID}/requirements/${RID}`, null, TOKEN1);
const comments = res.json?.data?.comments ?? [];
comments.length >= 2
  ? ok('T27  GET requirement shows ≥ 2 comments')
  : err('T27  GET requirement shows ≥ 2 comments', `got ${comments.length}`);

// T28 Empty comment rejected
res = await req('POST', `/api/projects/${PID}/requirements/${RID}/comments`, { text: '' }, TOKEN1);
res.status === 400
  ? ok('T28  Empty comment returns 400')
  : err('T28  Empty comment returns 400', `${res.status}`);

// ── Delete (soft) ─────────────────────────────────────────────────────────────
section('Requirements — Soft Delete');

// T29 Delete sets status to deprecated
res = await req('DELETE', `/api/projects/${PID}/requirements/${RID2}`, null, TOKEN1);
res.status === 204
  ? ok('T29  DELETE /requirements/:reqId returns 204')
  : err('T29  DELETE /requirements/:reqId returns 204', `${res.status}`);

// T30 Deleted requirement excluded from default list (filter status!=deprecated)
res = await req('GET', `/api/projects/${PID}/requirements?status=draft`, null, TOKEN1);
const stillThere = res.json?.data?.some(r => r._id === RID2);
!stillThere
  ? ok('T30  Deprecated requirement not in draft filter results')
  : err('T30  Deprecated requirement not in draft filter results', 'still visible');

// ── CSV Import ────────────────────────────────────────────────────────────────
section('Requirements — CSV Import');

const csvContent = `title,description,type,priority,source,tags
CSV Requirement 1,First imported req,functional,high,CSV import,import;test
CSV Requirement 2,Second imported req,non_functional,medium,CSV import,import
CSV Requirement 3,Third imported req,constraint,low,CSV import,`;

const { FormData, Blob } = await import('node:buffer').then(() => globalThis);
const form = new FormData();
form.append('file', new Blob([csvContent], { type: 'text/csv' }), 'reqs.csv');

res = await req('POST', `/api/projects/${PID}/requirements/import`, form, TOKEN1, true);
res.status === 201 && res.json?.imported === 3
  ? ok(`T31  POST /requirements/import imports 3 rows, returns 201`)
  : err('T31  POST /requirements/import imports 3 rows', `${res.status} imported=${res.json?.imported} — ${JSON.stringify(res.json)}`);

// T32 Imported requirements appear in list
res = await req('GET', `/api/projects/${PID}/requirements`, null, TOKEN1);
const total = res.json?.data?.length ?? 0;
total >= 4
  ? ok(`T32  List shows ≥ 4 requirements after import (got ${total})`)
  : err('T32  List shows ≥ 4 requirements after import', `got ${total}`);

// ── Access control ────────────────────────────────────────────────────────────
section('Requirements — Access Control');

// T33 Non-member cannot list requirements
const EMAIL3 = `p1_user3_${ts}@nexus.test`;
res = await req('POST', '/api/auth/register', { email: EMAIL3, password: 'Passw0rd!', firstName: 'Eve', lastName: 'Three' });
const TOKEN3 = res.json?.accessToken;
res = await req('GET', `/api/projects/${PID}/requirements`, null, TOKEN3);
res.status === 403
  ? ok('T33  Non-member cannot list requirements (403)')
  : err('T33  Non-member cannot list requirements (403)', `${res.status}`);

// T34 Non-member cannot create requirement
res = await req('POST', `/api/projects/${PID}/requirements`, { title: 'Sneaky req', type: 'functional', priority: 'low' }, TOKEN3);
res.status === 403
  ? ok('T34  Non-member cannot create requirement (403)')
  : err('T34  Non-member cannot create requirement (403)', `${res.status}`);

// ── Summary ───────────────────────────────────────────────────────────────────
const total2 = pass + fail;
console.log('\n' + '─'.repeat(44));
console.log(`Results: ${g}${pass} passed${x}  |  ${r}${fail} failed${x}  |  ${total2} total\n`);
process.exit(fail > 0 ? 1 : 0);
