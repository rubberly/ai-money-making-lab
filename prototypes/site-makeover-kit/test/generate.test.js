import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForm, renderSite, templateCopy } from '../lib/generate.js';
import { aiProvider, callClaude, polishCopy } from '../lib/ai.js';

const base = {
  businessName: 'Greenleaf Gardening', trade: 'Gardener', town: 'Maidstone', serviceArea: 'Maidstone and nearby villages',
  phone: '01622 987654', email: 'hello@greenleaf-example.co.uk', services: 'Lawn care\nHedge trimming\nGarden clearance',
  hours: 'Mon–Fri: 8am–6pm\nSat: 9am–1pm', theme: 'forest',
};

function build(input, opts) {
  const n = normalizeForm(input);
  assert.equal(n.ok, true, JSON.stringify(n.errors));
  return renderSite(n.data, templateCopy(n.data), opts);
}

test('generates a complete standalone mobile-first page', () => {
  const html = build(base);
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /href="tel:01622987654"/);
  assert.match(html, /class="callbar"/);
  assert.match(html, /"@type":"LocalBusiness"/);
  assert.match(html, /template copy \(no AI\)/);
  assert.ok(!/<script(?![^>]*application\/ld\+json)/i.test(html), 'no executable scripts');
  assert.ok(!/https?:\/\/(?!schema\.org|www\.w3\.org)/.test(html), 'no external dependencies');
  for (const tag of ['html', 'head', 'body', 'header', 'section', 'footer', 'style', 'form']) {
    const open = (html.match(new RegExp(`<${tag}[\\s>]`, 'g')) || []).length;
    const close = (html.match(new RegExp(`</${tag}>`, 'g')) || []).length;
    assert.equal(open, close, `balanced <${tag}>`);
  }
});

test('never invents testimonials: shows a placeholder when none are given', () => {
  const html = build(base);
  assert.match(html, /Placeholder:<\/strong> add 2–3 real customer reviews/);
  assert.ok(!/<blockquote>/.test(html));
  assert.match(html, /class="placeholder"/); // about placeholder too
});

test('real testimonials require confirmation and are rendered when confirmed', () => {
  const n = normalizeForm({ ...base, testimonials: 'Lovely tidy job — Sarah P.' });
  assert.equal(n.ok, false);
  assert.ok(n.errors.testimonials);
  const html = build({ ...base, testimonials: 'Lovely tidy job — Sarah P.', testimonialsConfirmed: true });
  assert.match(html, /<blockquote>“Lovely tidy job”<\/blockquote><figcaption>— Sarah P\.<\/figcaption>/);
});

test('escapes injected content everywhere, including JSON-LD', () => {
  const html = build({ ...base, businessName: '</script><script>alert(1)</script>', services: '<img src=x onerror=alert(1)>', about: '"><svg onload=alert(1)>' });
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x'));
  assert.ok(!html.includes('<svg onload'));
  assert.ok(html.includes('\\u003c/script>'));
});

test('validates required fields and contact details', () => {
  const n = normalizeForm({ businessName: '', trade: '', town: '', services: '', email: 'nope' });
  assert.equal(n.ok, false);
  for (const k of ['businessName', 'trade', 'town', 'services', 'email']) assert.ok(n.errors[k], k);
  assert.ok(normalizeForm({ ...base, phone: '', email: '' }).errors.phone);
});

test('uses a configured https form endpoint instead of mailto', () => {
  const html = build(base, { formAction: 'https://formspree.io/f/abc123' });
  assert.match(html, /action="https:\/\/formspree\.io\/f\/abc123"/);
  assert.ok(!/action="mailto:/.test(html));
});

// ---- AI adapter (injected fake client; no live calls) ----
const n = normalizeForm(base).data;
const fallback = templateCopy(n);

function fakeClient(response) {
  const calls = [];
  return {
    calls,
    beta: { messages: { create: async params => { calls.push(params); return typeof response === 'function' ? response(params) : response; } } },
  };
}

test('provider selection', () => {
  assert.equal(aiProvider({}), null);
  assert.equal(aiProvider({ ANTHROPIC_API_KEY: 'k' }).model, 'claude-opus-5-5');
  assert.equal(aiProvider({ ANTHROPIC_API_KEY: 'k', AI_MODEL: 'claude-sonnet-5-5' }).model, 'claude-sonnet-5-5');
  assert.equal(aiProvider({ OPENAI_COMPAT_BASE_URL: 'http://127.0.0.1:11434/v1', OPENAI_COMPAT_MODEL: 'llama3.1' }).kind, 'local');
  assert.equal(aiProvider({ OPENAI_COMPAT_BASE_URL: 'https://api.example.com/v1', OPENAI_COMPAT_MODEL: 'x' }).kind, 'invalid');
});

test('Claude adapter sends the required request shape and joins text blocks', async () => {
  const client = fakeClient({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '...' }, { type: 'text', text: 'Hello ' }, { type: 'text', text: 'world' }] });
  const text = await callClaude({ system: 'sys', content: 'user msg', env: { ANTHROPIC_API_KEY: 'k' }, client });
  assert.equal(text, 'Hello world');
  const p = client.calls[0];
  assert.equal(p.model, 'claude-opus-5-5');
  assert.equal(p.max_tokens, 16000);
  assert.deepEqual(p.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(p.fallbacks, 'default');
  assert.deepEqual(p.output_config, { effort: 'medium' });
  assert.equal(p.system, 'sys');
  assert.deepEqual(p.messages, [{ role: 'user', content: 'user msg' }]);
  for (const k of ['temperature', 'top_p', 'top_k', 'thinking']) assert.ok(!(k in p), `must not send ${k}`);
});

test('polishCopy uses AI JSON, ignores invented services, and labels the source', async () => {
  const client = fakeClient({
    stop_reason: 'end_turn',
    content: [{ type: 'text', text: JSON.stringify({
      headline: 'Tidy gardens across Maidstone', subheadline: 'Lawn care, hedges and clearances.', about: 'A local gardener.',
      services: [{ name: 'Lawn care', blurb: 'Regular mowing and edging.' }, { name: 'Swimming pools', blurb: 'Invented' }],
    }) }],
  });
  const r = await polishCopy(n, fallback, { env: { ANTHROPIC_API_KEY: 'k' }, client });
  assert.equal(r.source, 'ai');
  assert.match(r.label, /Claude/);
  assert.equal(r.copy.headline, 'Tidy gardens across Maidstone');
  assert.equal(r.copy.serviceBlurbs['Lawn care'], 'Regular mowing and edging.');
  assert.equal(r.copy.serviceBlurbs['Hedge trimming'], fallback.serviceBlurbs['Hedge trimming']);
  assert.ok(!('Swimming pools' in r.copy.serviceBlurbs));
});

test('refusal is surfaced and falls back to template copy', async () => {
  const client = fakeClient({ stop_reason: 'refusal', content: [] });
  const r = await polishCopy(n, fallback, { env: { ANTHROPIC_API_KEY: 'k' }, client });
  assert.equal(r.source, 'template');
  assert.match(r.warning, /refusal/);
  assert.equal(r.copy, fallback);
});

test('non-JSON reply and API errors fall back with a warning', async () => {
  let r = await polishCopy(n, fallback, { env: { ANTHROPIC_API_KEY: 'k' }, client: fakeClient({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Sure! Here you go.' }] }) });
  assert.equal(r.source, 'template');
  assert.match(r.warning, /not JSON/);
  r = await polishCopy(n, fallback, { env: { ANTHROPIC_API_KEY: 'k' }, client: fakeClient(() => { throw new Error('401 invalid x-api-key'); }) });
  assert.equal(r.source, 'template');
  assert.match(r.warning, /401/);
});

test('missing SDK with a key set gives a clear "npm install" message', async t => {
  try {
    await import('@anthropic-ai/sdk');
    t.skip('SDK is installed here');
    return;
  } catch { /* expected when not installed */ }
  const r = await polishCopy(n, fallback, { env: { ANTHROPIC_API_KEY: 'k' } });
  assert.equal(r.source, 'template');
  assert.match(r.warning, /npm install/);
});

test('local OpenAI-compatible adapter (fake fetch)', async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, body: JSON.parse(init.body) });
    return { ok: true, json: async () => ({ choices: [{ message: { content: '{"headline":"Local headline"}' } }] }) };
  };
  const r = await polishCopy(n, fallback, { env: { OPENAI_COMPAT_BASE_URL: 'http://127.0.0.1:11434/v1/', OPENAI_COMPAT_MODEL: 'llama3.1' }, fetchImpl });
  assert.equal(r.source, 'ai');
  assert.equal(r.copy.headline, 'Local headline');
  assert.equal(seen[0].url, 'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(seen[0].body.model, 'llama3.1');
});

test('no provider: template copy, no warning', async () => {
  const r = await polishCopy(n, fallback, { env: {} });
  assert.deepEqual(r, { copy: fallback, source: 'template' });
});
