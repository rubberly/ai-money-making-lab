import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.js';

const good = fs.readFileSync(new URL('./fixtures/good.html', import.meta.url), 'utf8');
const bad = fs.readFileSync(new URL('./fixtures/bad-2003.html', import.meta.url), 'utf8');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smk-test-'));

// Fake page fetcher so URL audits are tested without network access.
const fetchPage = async url => ({ body: bad, bytes: Buffer.byteLength(bad), finalUrl: url, chain: [{ url, status: 200 }] });
const fakeClaude = {
  beta: { messages: { create: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"headline":"AI headline for Bob"}' }] }) } },
};

let server, base;
async function start(opts = {}) {
  const s = createApp({ dataDir, fetchPage, env: { ANTHROPIC_API_KEY: 'test-key' }, aiOptions: { client: fakeClaude }, ...opts });
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  return [s, `http://127.0.0.1:${s.address().port}`];
}
const stop = s => new Promise(r => s.close(r));

async function call(method, p, body, headers = {}) {
  const res = await fetch(base + p, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json', ...headers } : headers,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  return { status: res.status, headers: res.headers, body: type.includes('json') ? await res.json() : await res.text() };
}

before(async () => { [server, base] = await start(); });
after(async () => { await stop(server); fs.rmSync(dataDir, { recursive: true, force: true }); });

let prospectId;

test('serves the app, the offer page and static assets with a CSP', async () => {
  for (const p of ['/', '/offer', '/assets/app.js', '/assets/offer.js', '/assets/styles.css']) {
    const r = await call('GET', p);
    assert.equal(r.status, 200, p);
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  }
  assert.equal((await call('GET', '/nope')).status, 404);
  assert.equal((await call('GET', '/api/nope')).status, 404);
});

test('health reports AI provider and themes', async () => {
  const r = await call('GET', '/api/health');
  assert.equal(r.body.ok, true);
  assert.equal(r.body.ai.kind, 'anthropic');
  assert.ok(r.body.themes.forest);
});

test('prospect CRUD with validation', async () => {
  let r = await call('POST', '/api/prospects', { name: '', email: 'bad', website: 'http://127.0.0.1/' });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.name && r.body.errors.email && r.body.errors.website);

  r = await call('POST', '/api/prospects', { name: "Bob's Gardens", trade: 'Gardener', town: 'Maidstone', website: 'bobsgardens-example.co.uk', email: 'Bob@Example.com', source: 'Google Maps' });
  assert.equal(r.status, 201);
  assert.equal(r.body.stage, 'found');
  assert.equal(r.body.website, 'https://bobsgardens-example.co.uk/');
  assert.equal(r.body.email, 'bob@example.com');
  prospectId = r.body.id;

  r = await call('PUT', `/api/prospects/${prospectId}`, { stage: 'nonsense' });
  assert.equal(r.status, 400);
  r = await call('PUT', `/api/prospects/${prospectId}`, { priceQuoted: 350, notes: 'Owner is Bob' });
  assert.equal(r.status, 200);
  assert.equal(r.body.priceQuoted, 350);
  assert.equal(r.body.name, "Bob's Gardens"); // partial update keeps other fields

  const tmp = await call('POST', '/api/prospects', { name: 'Delete me' });
  assert.equal((await call('DELETE', `/api/prospects/${tmp.body.id}`)).status, 200);
  assert.equal((await call('GET', `/api/prospects/${tmp.body.id}`)).status, 404);
  assert.equal((await call('GET', '/api/prospects')).body.length, 1);
});

test('rejects non-JSON writes (blocks cross-site form posts)', async () => {
  const r = await call('POST', '/api/prospects', 'name=x', { 'content-type': 'application/x-www-form-urlencoded' });
  assert.equal(r.status, 415);
  const r2 = await call('POST', '/api/prospects', '{not json');
  assert.equal(r2.status, 400);
});

test('audit via pasted HTML', async () => {
  const r = await call('POST', '/api/audit', { html: good });
  assert.equal(r.status, 201);
  assert.equal(r.body.mode, 'pasted');
  assert.ok(r.body.score >= 90);
  assert.equal(r.body.details.businessName, 'Greenleaf Gardening');
});

test('audit via URL for a prospect updates score and stage, and the report renders', async () => {
  const r = await call('POST', '/api/audit', { prospectId });
  assert.equal(r.status, 201);
  assert.equal(r.body.mode, 'fetched');
  assert.equal(r.body.url, 'https://bobsgardens-example.co.uk/');
  assert.ok(r.body.score < 40);
  const p = (await call('GET', `/api/prospects/${prospectId}`)).body;
  assert.equal(p.stage, 'audited');
  assert.equal(p.lastScore, r.body.score);
  const rep = await call('GET', `/api/audits/${r.body.id}/report`);
  assert.equal(rep.status, 200);
  assert.match(rep.body, /Website check for Bob&#39;s Gardens/);
  assert.match(rep.headers.get('content-security-policy'), /default-src 'none'/);
});

test('audit via URL blocks private addresses with the real fetcher', async () => {
  const [s, b] = await start({ fetchPage: undefined, dataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'smk-ssrf-')) });
  for (const url of ['http://127.0.0.1:3200/', 'http://169.254.169.254/latest/meta-data/', 'http://localhost/', 'file:///C:/Windows/win.ini']) {
    const res = await fetch(`${b}/api/audit`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
    assert.equal(res.status, 400, url);
  }
  await stop(s);
});

test('audit needs a URL or HTML', async () => {
  assert.equal((await call('POST', '/api/audit', {})).status, 400);
});

let siteId;
test('generate a sample site (template), preview and download', async () => {
  const bad1 = await call('POST', '/api/sites', { form: { businessName: '' } });
  assert.equal(bad1.status, 400);
  assert.ok(bad1.body.errors.businessName);

  const r = await call('POST', '/api/sites', {
    prospectId,
    form: { businessName: "Bob's Gardens", trade: 'Gardener', town: 'Maidstone', phone: '01622 123456', services: 'Lawns\nHedges', theme: 'forest' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.source, 'template');
  assert.equal(r.body.copySource, 'template copy (no AI)');
  siteId = r.body.id;

  const html = await call('GET', r.body.previewUrl);
  assert.equal(html.status, 200);
  assert.match(html.body, /href="tel:01622123456"/);
  assert.match(html.headers.get('content-security-policy'), /default-src 'none'/);
  const dl = await call('GET', r.body.downloadUrl);
  assert.match(dl.headers.get('content-disposition'), /attachment; filename="bob-s-gardens-index.html"/);
  assert.equal((await call('GET', `/api/prospects/${prospectId}`)).body.stage, 'sample_built');
});

test('generate with AI polish labels the copy as AI-assisted', async () => {
  const r = await call('POST', '/api/sites', {
    useAi: true,
    form: { businessName: "Bob's Gardens", trade: 'Gardener', town: 'Maidstone', phone: '01622 123456', services: 'Lawns' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.source, 'ai');
  assert.match(r.body.copySource, /AI-assisted \(Claude/);
  const html = await call('GET', r.body.previewUrl);
  assert.match(html.body, /AI headline for Bob/);
});

test('outreach draft uses the audit and settings', async () => {
  let r = await call('PUT', '/api/settings', { senderName: 'Alex', postalAddress: '1 Example Road, Leeds', formAction: 'javascript:alert(1)' });
  assert.equal(r.status, 400);
  assert.ok(r.body.errors.formAction);
  r = await call('PUT', '/api/settings', { senderName: 'Alex', postalAddress: '1 Example Road, Leeds', tiers: [{ price: 400 }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.tiers[0].price, 400);

  r = await call('POST', '/api/outreach', { prospectId, sampleLink: 'https://bob-preview.netlify.app' });
  assert.equal(r.status, 200);
  assert.match(r.body.body, /isn't set up for phones/);
  assert.match(r.body.body, /1 Example Road, Leeds/);
  assert.equal((await call('POST', '/api/outreach', { prospectId, sampleLink: 'ftp://x' })).status, 400);
  assert.equal((await call('POST', '/api/outreach', { prospectId: 'missing' })).status, 404);
});

test('pricing endpoint', async () => {
  const r = await call('POST', '/api/pricing', { buildFee: 350, monthlyFee: 39, buildHours: 5, monthlyHours: 0.5, months: 12 });
  assert.equal(r.status, 200);
  assert.equal(r.body.revenue, 818);
  assert.equal((await call('POST', '/api/pricing', { buildFee: 'abc' })).status, 400);
});

test('offer page: config, leads (validation + honeypot), test-mode orders', async () => {
  const cfg = await call('GET', '/api/offer-config');
  assert.equal(cfg.body.tiers.length, 3);
  assert.equal((await call('POST', '/api/leads', { name: '', email: 'x' })).status, 400);
  assert.equal((await call('POST', '/api/leads', { name: 'Spam', email: 'spam@example.com', company_url: 'http://spam' })).status, 201);
  assert.equal((await call('POST', '/api/leads', { name: 'Jo', email: 'jo@example.com', business: 'Jo Plumbing' })).status, 201);
  const leads = (await call('GET', '/api/leads')).body;
  assert.equal(leads.length, 1); // honeypot submission dropped
  assert.equal(leads[0].name, 'Jo');

  assert.equal((await call('POST', '/api/test-orders', { tierId: 'nope', name: 'Jo', email: 'jo@example.com' })).status, 400);
  const o = await call('POST', '/api/test-orders', { tierId: 'starter', name: 'Jo', email: 'jo@example.com' });
  assert.equal(o.status, 201);
  assert.equal(o.body.mode, 'test');
  assert.match(o.body.status, /no payment taken/);
});

test('data persists across a restart', async () => {
  await stop(server);
  [server, base] = await start();
  const ps = (await call('GET', '/api/prospects')).body;
  assert.equal(ps.length, 1);
  assert.equal(ps[0].priceQuoted, 350);
  assert.equal((await call('GET', '/api/orders')).body.length, 1);
  assert.equal((await call('GET', '/api/settings')).body.senderName, 'Alex');
  assert.equal((await call('GET', `/api/sites/${siteId}/html`)).status, 200);
});

test('405 for wrong method on a known route', async () => {
  assert.equal((await call('DELETE', '/api/settings')).status, 405);
});
