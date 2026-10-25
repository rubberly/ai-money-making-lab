import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertPublicUrl, isPrivateAddress, validateUrlShape, UrlError } from '../lib/ssrf.js';

test('private, loopback, link-local and special addresses are private', () => {
  for (const ip of ['127.0.0.1', '127.8.8.8', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a00:1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['93.184.215.14', '8.8.8.8', '172.32.0.1', '2606:2800:21f:cb07:6820:80da:af6b:8b2c']) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test('rejects unsafe URLs before any network access', () => {
  const bad = [
    'http://127.0.0.1/', 'http://10.1.2.3/', 'http://192.168.0.10/admin', 'http://169.254.169.254/latest/meta-data/',
    'http://[::1]/', 'http://localhost:3200/', 'http://app.localhost/', 'http://printer.local/', 'file:///etc/passwd',
    'ftp://example.com/', 'javascript:alert(1)', 'gopher://example.com/', 'http://user:pw@example.com/', 'http://example.com:22/',
    'http://intranet/', 'not a url', '',
  ];
  for (const u of bad) assert.throws(() => validateUrlShape(u), UrlError, u);
});

test('accepts normal public URLs', () => {
  assert.equal(validateUrlShape('https://example.com/path?q=1').hostname, 'example.com');
  assert.equal(validateUrlShape('http://example.com:8080/').port, '8080');
});

test('blocks domains whose DNS answer is private (rebinding-style)', async () => {
  const fakeLookup = async () => [{ address: '10.0.0.7', family: 4 }];
  await assert.rejects(assertPublicUrl('https://evil-rebind.example/', fakeLookup), e => e.code === 'EBLOCKED');
  const mixed = async () => [{ address: '93.184.215.14', family: 4 }, { address: '::1', family: 6 }];
  await assert.rejects(assertPublicUrl('https://mixed.example/', mixed), e => e.code === 'EBLOCKED');
  const ok = async () => [{ address: '93.184.215.14', family: 4 }];
  assert.equal((await assertPublicUrl('https://fine.example/', ok)).hostname, 'fine.example');
});

test('unknown domains give a friendly error', async () => {
  const fail = async () => { throw new Error('ENOTFOUND'); };
  await assert.rejects(assertPublicUrl('https://no-such-host.example/', fail), /Could not find the domain/);
});
