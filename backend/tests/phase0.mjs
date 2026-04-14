/**
 * NEXUS Phase 0 — Integration Test Suite
 * Runs with: node tests/phase0.mjs
 * Requires Node 18+ (native fetch)
 */

const BASE = 'http://localhost:4000';
let pass = 0, fail = 0;

const g = '\x1b[32m', r = '\x1b[31m', x = '\x1b[0m';
const ok  = (t)      => { console.log(`${g}  PASS${x}  ${t}`); pass++; };
const err = (t, why) => { console.log(`${r}  FAIL${x}  ${t}  →  ${why}`); fail++; };

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
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

console.log('\n╔══════════════════════════════════════════╗');
console.log('║  NEXUS Phase 0 — Integration Test Suite ║');
console.log('╚══════════════════════════════════════════╝');

// ── Infra ─────────────────────────────────────────────────────────────────────
section('Infra');

let res = await req('GET', '/healthz');
res.status === 200
  ? ok('T01  GET /healthz returns 200')
  : err('T01  GET /healthz returns 200', `HTTP ${res.status} ${res.error ?? ''}`);

// ── Register ──────────────────────────────────────────────────────────────────
section('Auth — Register');

const ts    = Date.now();
const EMAIL = `test_${ts}@nexus.test`;

res = await req('POST', '/api/auth/register', {
  email: EMAIL, password: 'Passw0rd!', firstName: 'Test', lastName: 'User',
});
res.status === 201
  ? ok('T02  POST /api/auth/register returns 201')
  : err('T02  POST /api/auth/register returns 201', `HTTP ${res.status} — ${JSON.stringify(res.json)}`);

const ACCESS  = res.json?.accessToken;
const REFRESH = res.json?.refreshToken;

ACCESS  ? ok('T03  Response contains accessToken')  : err('T03  Response contains accessToken',  'field missing');
REFRESH ? ok('T04  Response contains refreshToken') : err('T04  Response contains refreshToken', 'field missing');

res = await req('POST', '/api/auth/register', {
  email: EMAIL, password: 'Passw0rd!', firstName: 'Test', lastName: 'User',
});
res.status === 409
  ? ok('T05  Duplicate email returns 409')
  : err('T05  Duplicate email returns 409', `HTTP ${res.status}`);

res = await req('POST', '/api/auth/register', { email: 'bad-email', password: 'x' });
res.status === 400
  ? ok('T06  Invalid payload returns 400')
  : err('T06  Invalid payload returns 400', `HTTP ${res.status}`);

// ── Login ─────────────────────────────────────────────────────────────────────
section('Auth — Login');

res = await req('POST', '/api/auth/login', { email: EMAIL, password: 'Passw0rd!' });
res.status === 200
  ? ok('T07  POST /api/auth/login returns 200')
  : err('T07  POST /api/auth/login returns 200', `HTTP ${res.status} — ${JSON.stringify(res.json)}`);

const LOGIN_ACCESS  = res.json?.accessToken;
const LOGIN_REFRESH = res.json?.refreshToken;

LOGIN_ACCESS
  ? ok('T08  Login response contains accessToken')
  : err('T08  Login response contains accessToken', 'missing');

res = await req('POST', '/api/auth/login', { email: EMAIL, password: 'wrongpass' });
res.status === 401
  ? ok('T09  Wrong password returns 401')
  : err('T09  Wrong password returns 401', `HTTP ${res.status}`);

res = await req('POST', '/api/auth/login', { email: 'ghost@nexus.test', password: 'Passw0rd!' });
res.status === 401
  ? ok('T10  Unknown email returns 401')
  : err('T10  Unknown email returns 401', `HTTP ${res.status}`);

res = await req('POST', '/api/auth/login', {});
res.status === 400
  ? ok('T11  Empty body returns 400')
  : err('T11  Empty body returns 400', `HTTP ${res.status}`);

// ── Token Refresh ─────────────────────────────────────────────────────────────
section('Auth — Token Refresh');

res = await req('POST', '/api/auth/refresh', { refreshToken: LOGIN_REFRESH });
res.status === 200
  ? ok('T12  POST /api/auth/refresh returns 200')
  : err('T12  POST /api/auth/refresh returns 200', `HTTP ${res.status} — ${JSON.stringify(res.json)}`);

const NEW_REFRESH = res.json?.refreshToken;

res = await req('POST', '/api/auth/refresh', { refreshToken: LOGIN_REFRESH });
res.status === 401
  ? ok('T13  Reused refresh token returns 401 (rotation enforced)')
  : err('T13  Reused refresh token returns 401 (rotation enforced)', `HTTP ${res.status}`);

res = await req('POST', '/api/auth/refresh', { refreshToken: 'not.a.real.token' });
res.status === 401
  ? ok('T14  Invalid refresh token returns 401')
  : err('T14  Invalid refresh token returns 401', `HTTP ${res.status}`);

// ── Logout ────────────────────────────────────────────────────────────────────
section('Auth — Logout');

res = await req('POST', '/api/auth/logout', { refreshToken: NEW_REFRESH });
res.status === 204
  ? ok('T15  POST /api/auth/logout returns 204')
  : err('T15  POST /api/auth/logout returns 204', `HTTP ${res.status}`);

// ── Protected route guard ─────────────────────────────────────────────────────
section('Auth — Protected route guard');

res = await req('GET', '/api/projects');
res.status === 401
  ? ok('T16  GET /api/projects without token returns 401')
  : err('T16  GET /api/projects without token returns 401', `HTTP ${res.status}`);

res = await req('POST', '/api/auth/login', { email: EMAIL, password: 'Passw0rd!' });
const FRESH_TOKEN = res.json?.accessToken;

res = await req('GET', '/api/projects', null, FRESH_TOKEN);
res.status === 200
  ? ok('T17  GET /api/projects with valid token returns 200')
  : err('T17  GET /api/projects with valid token returns 200', `HTTP ${res.status} — ${JSON.stringify(res.json)}`);

// ── Projects CRUD ─────────────────────────────────────────────────────────────
section('Projects — CRUD');

res = await req('POST', '/api/projects', {
  name: 'Alpha Project',
  clientName: 'Acme Corp',
  startDate: '2026-01-01T00:00:00.000Z',
  description: 'Phase 0 test project',
}, FRESH_TOKEN);
res.status === 201
  ? ok('T18  POST /api/projects returns 201')
  : err('T18  POST /api/projects returns 201', `HTTP ${res.status} — ${JSON.stringify(res.json)}`);

const PROJECT_ID = res.json?.data?._id;
PROJECT_ID
  ? ok('T19  Created project has _id')
  : err('T19  Created project has _id', `missing in: ${JSON.stringify(res.json)}`);

res = await req('GET', `/api/projects/${PROJECT_ID}`, null, FRESH_TOKEN);
res.status === 200
  ? ok('T20  GET /api/projects/:id returns 200')
  : err('T20  GET /api/projects/:id returns 200', `HTTP ${res.status}`);

res = await req('PATCH', `/api/projects/${PROJECT_ID}`, { status: 'on_hold' }, FRESH_TOKEN);
res.status === 200
  ? ok('T21  PATCH /api/projects/:id returns 200')
  : err('T21  PATCH /api/projects/:id returns 200', `HTTP ${res.status} — ${JSON.stringify(res.json)}`);

res = await req('POST', '/api/projects', { name: 'No client' }, FRESH_TOKEN);
res.status === 400
  ? ok('T22  Missing required field returns 400')
  : err('T22  Missing required field returns 400', `HTTP ${res.status}`);

const EMAIL2 = `test2_${ts}@nexus.test`;
res = await req('POST', '/api/auth/register', {
  email: EMAIL2, password: 'Passw0rd!', firstName: 'Other', lastName: 'User',
});
const TOKEN2 = res.json?.accessToken;

res = await req('GET', `/api/projects/${PROJECT_ID}`, null, TOKEN2);
res.status === 403
  ? ok('T23  Non-member cannot access another user\'s project (403)')
  : err('T23  Non-member cannot access another user\'s project (403)', `HTTP ${res.status}`);

// ── 2FA ───────────────────────────────────────────────────────────────────────
section('Auth — 2FA');

res = await req('POST', '/api/auth/2fa/setup');
res.status === 401
  ? ok('T24  POST /api/auth/2fa/setup without auth returns 401')
  : err('T24  POST /api/auth/2fa/setup without auth returns 401', `HTTP ${res.status}`);

res = await req('POST', '/api/auth/2fa/setup', null, FRESH_TOKEN);
res.status === 200 && res.json?.secret && res.json?.qrCode
  ? ok('T25  POST /api/auth/2fa/setup returns secret + qrCode')
  : err('T25  POST /api/auth/2fa/setup returns secret + qrCode', `HTTP ${res.status} — ${JSON.stringify(res.json)}`);

// ── Summary ───────────────────────────────────────────────────────────────────
const total = pass + fail;
console.log('\n' + '─'.repeat(44));
console.log(`Results: ${g}${pass} passed${x}  |  ${r}${fail} failed${x}  |  ${total} total\n`);
process.exit(fail > 0 ? 1 : 0);
