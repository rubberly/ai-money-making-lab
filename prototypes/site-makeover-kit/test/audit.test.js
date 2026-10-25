import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditHtml, renderReport } from '../lib/audit.js';
import { extractDetails } from '../lib/extract.js';

const good = fs.readFileSync(new URL('./fixtures/good.html', import.meta.url), 'utf8');
const bad = fs.readFileSync(new URL('./fixtures/bad-2003.html', import.meta.url), 'utf8');
const now = new Date('2026-10-25T12:00:00Z');
const status = (a, id) => a.checks.find(c => c.id === id).status;

test('good modern site scores high and passes the key checks', () => {
  const a = auditHtml(good, { url: 'https://greenleaf-example.co.uk/', now });
  assert.ok(a.score >= 90, `score ${a.score}`);
  assert.equal(a.grade, 'Good');
  for (const id of ['https', 'viewport', 'title', 'description', 'telLink', 'phoneVisible', 'contact', 'h1', 'imgAlt', 'copyright', 'legacy', 'favicon', 'cta']) {
    assert.equal(status(a, id), 'pass', id);
  }
});

test('2003-style site scores low and flags the expected problems', () => {
  const a = auditHtml(bad, { url: 'http://bobsgardens-example.co.uk/', now });
  assert.ok(a.score < 40, `score ${a.score}`);
  assert.equal(a.grade, 'Poor');
  for (const id of ['https', 'viewport', 'description', 'telLink', 'h1', 'imgAlt', 'copyright', 'legacy', 'favicon', 'cta']) {
    assert.equal(status(a, id), 'fail', id);
  }
  assert.equal(status(a, 'phoneVisible'), 'pass');
  assert.equal(status(a, 'title'), 'warn'); // "Welcome" is too short
  assert.match(a.checks.find(c => c.id === 'legacy').finding, /Flash/);
  assert.match(a.checks.find(c => c.id === 'copyright').finding, /2009/);
  assert.equal(a.topIssues[0], 'viewport'); // biggest weight lost first
});

test('pasted HTML without URL skips the HTTPS check and normalises the score', () => {
  const a = auditHtml(good, { now });
  assert.equal(status(a, 'https'), 'skip');
  assert.equal(a.checks.find(c => c.id === 'https').max, 0);
  assert.ok(a.score >= 90);
});

test('empty input does not throw', () => {
  const a = auditHtml('', { now });
  assert.ok(a.score >= 0 && a.score <= 100);
});

test('report escapes page-controlled text', () => {
  const evil = '<title>&lt;script&gt;alert(1)&lt;/script&gt; Evil Plumbing Ltd</title><h1><img src=x onerror=alert(1)>Hi</h1>';
  const a = auditHtml(evil, { now });
  const html = renderReport(a, { businessName: '<b>x</b>', url: 'https://e.com' });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<b>x</b>'));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
});

test('extracts business details from a real-looking page', () => {
  const d = extractDetails(good, 'https://greenleaf-example.co.uk/');
  assert.equal(d.businessName, 'Greenleaf Gardening');
  assert.ok(d.phones.some(p => p.replace(/\D/g, '').endsWith('1622987654')));
  assert.deepEqual(d.emails, ['hello@greenleaf-example.co.uk']);
  assert.deepEqual(d.serviceHints, ['Lawn Care', 'Hedge Trimming', 'Garden Clearance']);
  assert.ok(d.hoursLines.includes('Mon–Fri: 8am–6pm'));
  assert.ok(d.hoursLines.includes('Sun: Closed'));
});

test('extracts phone, postcode address and hours from the old site', () => {
  const d = extractDetails(bad);
  assert.equal(d.title, 'Welcome');
  assert.ok(d.phones.includes('01622 123456'));
  assert.deepEqual(d.addressLines, ['12 High Street, Maidstone, ME14 1AB']);
  assert.ok(d.hoursLines.some(l => l.startsWith('Mon - Fri')));
  assert.deepEqual(d.emails, []);
});
