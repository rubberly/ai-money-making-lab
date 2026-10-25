import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.js';

const SAMPLE = readFileSync(new URL('../public/sample-transcript.txt', import.meta.url), 'utf8');
let dir; let server; let base;

async function start() {
  ({ server } = await createApp({ dataDir: dir, env: {} }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { await new Promise((r) => server.close(r)); }
async function call(method, path, body, headers = {}) {
  const res = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text, headers: res.headers };
}

before(async () => { dir = await mkdtemp(join(tmpdir(), 'rdesk-')); await start(); });
after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });

test('static pages and meta', async () => {
  for (const p of ['/', '/offer', '/app.js', '/styles.css', '/sample-transcript.txt']) {
    const r = await call('GET', p);
    assert.equal(r.status, 200, p);
  }
  assert.equal((await call('GET', '/../server.js')).status, 404);
  const m = await call('GET', '/api/meta');
  assert.equal(m.json.provider, 'none');
  assert.ok(m.headers.get('content-security-policy'));
});

test('full workflow: client → episode → generate → edit → QC → approve → export → persists', async () => {
  const bad = await call('POST', '/api/clients', { name: '' });
  assert.equal(bad.status, 400);
  const c = await call('POST', '/api/clients', { name: 'Dana', show: 'Flour and Profit', status: 'active', monthlyRate: '600', voice: { cta: 'Send this to one friend who bakes', bannedWords: 'hustle, crush it' } });
  assert.equal(c.status, 200);
  assert.deepEqual(c.json.voice.bannedWords, ['hustle', 'crush it']);

  assert.equal((await call('POST', '/api/jobs', { clientId: c.json.id, transcript: 'too short' })).status, 400);
  const j = await call('POST', '/api/jobs', { clientId: c.json.id, title: 'Pricing', transcript: SAMPLE, sourceUrl: 'https://example.com/ep1' });
  assert.equal(j.status, 200);
  const id = j.json.id;

  const an = await call('GET', `/api/jobs/${id}/analysis`);
  assert.ok(an.json.clips.length >= 2);

  const g = await call('POST', `/api/jobs/${id}/generate`, { mode: 'auto' });
  assert.equal(g.status, 200);
  assert.equal(Object.keys(g.json.job.deliverables).length, 6);
  assert.equal(g.json.job.deliverables.linkedin.mode, 'template');
  assert.equal(g.json.job.deliverables.linkedin.qc.status, 'fail');

  // Cannot approve a failing draft without an override note.
  assert.equal((await call('POST', `/api/jobs/${id}/deliverables/linkedin/approve`, {})).status, 409);

  const edited = await call('PUT', `/api/jobs/${id}/deliverables/linkedin`, { content: 'Your price is not a number you copy.\n\nPre-orders changed everything for me.\n\nSend this to one friend who bakes' });
  assert.equal(edited.json.qc.status, 'pass', JSON.stringify(edited.json.qc));
  assert.equal((await call('POST', `/api/jobs/${id}/deliverables/linkedin/approve`, {})).status, 200);
  assert.equal((await call('POST', `/api/jobs/${id}/deliverables/quotes/approve`, { overrideNote: 'checked with client' })).json.overrideNote, 'checked with client');

  const md = await call('GET', `/api/jobs/${id}/export?format=md`);
  assert.match(md.headers.get('content-disposition'), /attachment/);
  assert.match(md.text, /Pre-orders changed everything/);
  assert.ok(!md.text.includes('Newsletter'), 'unapproved newsletter excluded');

  await call('PUT', `/api/jobs/${id}`, { addMinutes: 45 });
  await call('POST', '/api/payments', { clientId: c.json.id, amount: 150, date: new Date().toISOString().slice(0, 10), note: 'pilot' });
  const d = await call('GET', '/api/dashboard');
  assert.equal(d.json.revenueMonth, 150);
  assert.equal(d.json.mrr, 600);
  assert.equal(d.json.effectiveHourly, 200);

  // client with episodes cannot be deleted
  assert.equal((await call('DELETE', `/api/clients/${c.json.id}`)).status, 409);

  // restart → data persisted
  await stop(); await start();
  const again = await call('GET', `/api/jobs/${id}`);
  assert.equal(again.json.deliverables.linkedin.status, 'approved');
  assert.equal(again.json.minutesSpent, 45);
});

test('prospects, CSV injection guard, leads, test checkout, validation', async () => {
  const p = await call('POST', '/api/prospects', { name: '=HYPERLINK("x")', platform: 'Podcast', gap: 'no newsletter', link: 'https://example.com' });
  assert.equal(p.status, 200);
  assert.equal((await call('PUT', `/api/prospects/${p.json.id}`, { stage: 'sample_sent' })).json.stage, 'sample_sent');
  assert.equal((await call('PUT', `/api/prospects/${p.json.id}`, { stage: 'bogus' })).status, 400);
  assert.equal((await call('POST', '/api/prospects', { name: 'x', link: 'javascript:alert(1)' })).status, 400);
  const csv = await call('GET', '/api/prospects.csv');
  assert.match(csv.text, /"'=HYPERLINK/);

  assert.equal((await call('POST', '/api/public/leads', { name: 'A', email: 'nope' })).status, 400);
  assert.equal((await call('POST', '/api/public/leads', { name: 'A', email: 'a@b.co', interest: 'pilot' })).status, 200);
  const order = await call('POST', '/api/public/test-checkout', { plan: 'monthly', email: 'a@b.co' });
  assert.equal(order.json.testMode, true);
  const leads = await call('GET', '/api/leads');
  assert.equal(leads.json.leads.length, 1);
  assert.equal(leads.json.testOrders.length, 1);
  const d = await call('GET', '/api/dashboard');
  assert.equal(d.json.funnel.interest.testCheckouts, 1);
  assert.equal(d.json.funnel.payment.paymentsLogged, 1, 'test checkout is NOT counted as a payment');

  assert.equal((await call('POST', '/api/clients', { name: 'x' }, { origin: 'http://evil.example' })).status, 403);
  const big = await fetch(base + '/api/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"name":"' + 'a'.repeat(3.5 * 1024 * 1024) + '"}' }).catch((e) => ({ status: 'reset', e }));
  assert.ok(big.status === 413 || big.status === 'reset');
  assert.equal((await call('POST', '/api/clients', undefined, {})).status, 400);
});
