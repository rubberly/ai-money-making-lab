import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server.js';

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smk-auth-'));
const basic = p => ({ authorization: 'Basic ' + Buffer.from(`any:${p}`).toString('base64') });
let server, base;

before(async () => {
  server = createApp({ dataDir, env: { APP_PASSWORD: 'correct horse' } });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(r => server.close(r));
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test('workspace and private API need the password', async () => {
  for (const p of ['/', '/assets/app.js', '/api/prospects', '/api/leads', '/api/orders']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 401, p);
    assert.match(r.headers.get('www-authenticate'), /Basic/);
  }
  assert.equal((await fetch(base + '/api/prospects', { headers: basic('wrong') })).status, 401);
  assert.equal((await fetch(base + '/api/prospects', { headers: basic('correct horse') })).status, 200);
  const audit = await fetch(base + '/api/audit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ html: '<html></html>' }) });
  assert.equal(audit.status, 401, 'the URL fetcher is not usable without the password');
});

test('offer page, its assets, lead form, test order and health check stay public', async () => {
  for (const p of ['/offer', '/assets/offer.js', '/assets/styles.css', '/api/offer-config', '/healthz']) {
    assert.equal((await fetch(base + p)).status, 200, p);
  }
  const lead = await fetch(base + '/api/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) });
  assert.notEqual(lead.status, 401, 'lead form reaches validation, not the password gate');
});

test('when APP_USERNAME is set, the username must match too', async () => {
  const { passwordOk } = await import('../lib/auth.js');
  const req = (u, p) => ({ headers: { authorization: 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64') } });
  assert.equal(passwordOk(req('lucas', 'pw'), 'pw', 'lucas'), true);
  assert.equal(passwordOk(req('someone', 'pw'), 'pw', 'lucas'), false);
  assert.equal(passwordOk(req('lucas', 'nope'), 'pw', 'lucas'), false);
  assert.equal(passwordOk(req('anyone', 'pw'), 'pw', ''), true, 'no APP_USERNAME: any username');
  assert.equal(passwordOk({ headers: {} }, '', 'lucas'), true, 'no APP_PASSWORD: gate off');
});
