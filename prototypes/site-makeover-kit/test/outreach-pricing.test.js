import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditHtml } from '../lib/audit.js';
import { draftOutreach } from '../lib/outreach.js';
import { calcPricing } from '../lib/pricing.js';

const bad = fs.readFileSync(new URL('./fixtures/bad-2003.html', import.meta.url), 'utf8');
const audit = auditHtml(bad, { url: 'http://bobsgardens-example.co.uk/', now: new Date('2026-10-25') });
const prospect = {
  name: "Bob's Gardens", trade: 'Gardeners', town: 'Kent', website: 'http://bobsgardens-example.co.uk/',
  email: 'bob@example.com', source: "Google Maps 'gardeners in Kent'", priceQuoted: 350,
};
const settings = { senderName: 'Alex', senderBusiness: 'Alex Web', postalAddress: '1 Example Road, Leeds LS1 1AA', currency: '£' };

test('draft mentions the top two real issues, price, opt-out and address', () => {
  const d = draftOutreach({ prospect, audit, settings, sampleLink: 'https://bob-preview.netlify.app' });
  assert.equal(d.issuesUsed, 2);
  assert.match(d.body, /isn't set up for phones/);
  assert.match(d.body, /https:\/\/bob-preview\.netlify\.app/);
  assert.match(d.body, /£350/);
  assert.match(d.body, /reply "no thanks"/);
  assert.match(d.body, /Reply "unsubscribe"/);
  assert.match(d.body, /1 Example Road, Leeds LS1 1AA/);
  assert.match(d.subject, /Bob's Gardens/);
  assert.match(d.body, /looking at gardeners websites in Kent and came across bobsgardens-example\.co\.uk/);
  assert.deepEqual(d.warnings, []);
});

test('warns when address, audit or email are missing', () => {
  const d = draftOutreach({ prospect: { name: 'X' }, audit: null, settings: {} });
  assert.ok(d.warnings.some(w => /postal address/.test(w)));
  assert.ok(d.warnings.some(w => /Run an audit/.test(w)));
  assert.ok(d.warnings.some(w => /no public email/.test(w)));
  assert.match(d.body, /\[Your physical postal address: required\]/);
});

test('pricing maths', () => {
  const r = calcPricing({ buildFee: 350, monthlyFee: 39, hostingCostMonthly: 2, toolCostMonthly: 0, buildHours: 5, monthlyHours: 0.5, months: 12 });
  assert.equal(r.ok, true);
  assert.equal(r.result.revenue, 818);
  assert.equal(r.result.costs, 24);
  assert.equal(r.result.profit, 794);
  assert.equal(r.result.hours, 11);
  assert.equal(r.result.effectiveHourly, 72.18);
  assert.equal(r.result.monthlyMargin, 37);
});

test('pricing validation', () => {
  const r = calcPricing({ buildFee: -1, months: 0 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.buildFee && r.errors.months);
  assert.equal(calcPricing({ buildFee: 100, months: 1 }).result.effectiveHourly, null);
});
