import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.js';

let dir; let server; let base;
const basic = (p) => ({ authorization: 'Basic ' + Buffer.from(`any:${p}`).toString('base64') });

before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'rdesk-auth-'));
  ({ server } = await createApp({ dataDir: dir, env: { APP_PASSWORD: 'correct horse' } }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((r) => server.close(r)); await rm(dir, { recursive: true, force: true }); });

test('workspace and private API need the password', async () => {
  for (const p of ['/', '/app.js', '/api/clients', '/api/leads', '/api/backup']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 401, p);
    assert.match(r.headers.get('www-authenticate'), /Basic/);
  }
  assert.equal((await fetch(base + '/api/clients', { headers: basic('wrong') })).status, 401);
  assert.equal((await fetch(base + '/api/clients', { headers: basic('correct horse') })).status, 200);
});

test('offer page, its assets, lead form and health check stay public', async () => {
  for (const p of ['/offer', '/offer.js', '/styles.css', '/api/public/offer', '/healthz']) {
    assert.equal((await fetch(base + p)).status, 200, p);
  }
  const r = await fetch(base + '/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'A', email: 'a@b.co' }) });
  assert.equal(r.status, 200);
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
