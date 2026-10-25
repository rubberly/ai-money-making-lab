import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTranscript, parseTimestamp, analyze, formatTime } from '../lib/transcript.js';
import { runQC } from '../lib/qc.js';
import { templateDraft, generateDeliverable, buildSystemPrompt, DELIVERABLES } from '../lib/generate.js';
import { getProvider, complete } from '../lib/ai.js';
import { toHTML, toMarkdown } from '../lib/export.js';

const SAMPLE = readFileSync(new URL('../public/sample-transcript.txt', import.meta.url), 'utf8');
const client = { name: 'Dana', show: 'Flour and Profit', voice: { cta: 'Send this to one friend who bakes', bannedWords: ['hustle'], tone: 'warm' } };

test('timestamps parse and format', () => {
  assert.equal(parseTimestamp('01:02'), 62);
  assert.equal(parseTimestamp('1:02:03'), 3723);
  assert.equal(parseTimestamp('00:00:05,500'), 5);
  assert.equal(formatTime(3723), '1:02:03');
  assert.equal(formatTime(62), '1:02');
});

test('parses bracketed, SRT, VTT and plain transcripts', () => {
  assert.equal(parseTranscript(SAMPLE)[1].start, 6);
  const srt = '1\n00:00:01,000 --> 00:00:03,000\nHello there friends\n\n2\n00:00:04,000 --> 00:00:06,000\nSecond <i>line</i> here';
  const s = parseTranscript(srt);
  assert.deepEqual(s.map((x) => x.start), [1, 4]);
  assert.equal(s[1].text, 'Second line here');
  const vtt = 'WEBVTT\n\n00:00:10.000 --> 00:00:12.000\nFirst cue\n\n00:00:12.000 --> 00:00:14.000\nFirst cue';
  assert.equal(parseTranscript(vtt).length, 1, 'duplicate rolling captions removed');
  const plain = parseTranscript('Para one.\n\nPara two.');
  assert.equal(plain.length, 2);
  assert.equal(plain[0].start, null);
});

test('analysis finds keywords, clips within the episode, and chapters', () => {
  const a = analyze(SAMPLE);
  assert.ok(a.stats.timed);
  assert.equal(a.stats.durationSec, 206);
  assert.ok(a.keywords.some((k) => ['loaf', 'pounds', 'pre-orders', 'stall'].includes(k.word)), JSON.stringify(a.keywords));
  assert.ok(a.clips.length >= 2);
  for (const c of a.clips) {
    assert.ok(c.end - c.start >= 15 && c.end - c.start <= 60, `clip ${c.start}-${c.end}`);
  }
  assert.ok(a.chapters.length >= 3);
});

test('unpunctuated auto-captions still split into usable sentences', () => {
  const words = Array.from({ length: 300 }, (_, i) => (i % 17 === 0 ? 'pricing' : 'word' + (i % 9)));
  const raw = Array.from({ length: 30 }, (_, i) => `[00:${String(i * 2).padStart(2, '0')}] ${words.slice(i * 10, i * 10 + 10).join(' ')}`).join('\n');
  const a = analyze(raw);
  assert.ok(a.sentences.length >= 10, `got ${a.sentences.length}`);
});

test('every template draft builds and is labelled as needing edits', () => {
  for (const type of Object.keys(DELIVERABLES)) {
    const out = templateDraft(type, { title: 'Pricing', transcript: SAMPLE }, client);
    assert.ok(out.length > 40, type);
  }
  const nl = templateDraft('newsletter', { title: 'Pricing', transcript: SAMPLE }, client);
  assert.match(nl, /\[EDIT/);
  assert.equal(runQC('newsletter', nl, { transcript: SAMPLE, client }).status, 'fail', 'template must not pass QC until edited');
});

test('QC flags invented numbers, fake quotes, banned words, placeholders, and bad timestamps', () => {
  const draft = 'I raised my price and profit went up 300% overnight. As I said, "pricing is the only thing that matters in life". Stop the hustle. [EDIT: opener] See 9:59 for more.';
  const r = runQC('linkedin', draft, { transcript: SAMPLE, client });
  const ids = r.checks.map((c) => c.id);
  assert.equal(r.status, 'fail');
  for (const id of ['numbers', 'quotes', 'banned', 'placeholders', 'timestamps']) assert.ok(ids.includes(id), `missing ${id}: ${ids}`);
});

test('QC passes a faithful draft', () => {
  const draft = `Your price is not a number you copy.

Each loaf cost me two pounds ten before I paid myself. At 4 pounds I was earning about seven an hour.

"Pre-orders mean the money is committed before you switch the oven on."

Send this to one friend who bakes`;
  const r = runQC('linkedin', draft, { transcript: SAMPLE, client });
  assert.equal(r.status, 'pass', JSON.stringify(r.checks));
});

test('QC enforces X 280-char post limit', () => {
  const long = '1/ ' + 'a'.repeat(300) + '\n\n2/ ok\n\n3/ ok';
  const r = runQC('x_thread', long, { transcript: SAMPLE, client });
  assert.ok(r.checks.some((c) => c.id === 'length' && c.level === 'fail'));
});

test('provider selection and no-AI fallback', async () => {
  assert.equal(getProvider({}).name, 'none');
  assert.equal(getProvider({ ANTHROPIC_API_KEY: 'x' }).model, 'claude-opus-5-5');
  assert.equal(getProvider({ OPENAI_COMPAT_BASE_URL: 'http://127.0.0.1:11434/v1/', OPENAI_COMPAT_MODEL: 'llama3.1' }).baseUrl, 'http://127.0.0.1:11434/v1');
  const g = await generateDeliverable('linkedin', { title: 't', transcript: SAMPLE }, client, { env: {} });
  assert.equal(g.mode, 'template');
  await assert.rejects(() => generateDeliverable('linkedin', { transcript: SAMPLE }, client, { env: {}, mode: 'ai' }), /No AI provider/);
});

test('Anthropic adapter sends the expected request and reads text blocks (fake client)', async () => {
  let sent;
  const fake = { beta: { messages: { create: async (req) => { sent = req; return { model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Hello draft' }] }; } } } };
  const r = await complete({ system: 'sys', user: 'u' }, { env: { ANTHROPIC_API_KEY: 'k' }, anthropicClient: fake });
  assert.equal(r.text, 'Hello draft');
  assert.equal(sent.model, 'claude-opus-5-5');
  assert.equal(sent.fallbacks, 'default');
  assert.deepEqual(sent.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(sent.temperature, undefined);
  const refusing = { beta: { messages: { create: async () => ({ stop_reason: 'refusal', content: [] }) } } };
  await assert.rejects(() => complete({ system: 's', user: 'u' }, { env: { ANTHROPIC_API_KEY: 'k' }, anthropicClient: refusing }), /declined/);
});

test('OpenAI-compatible local adapter (fake fetch)', async () => {
  let url;
  const fetchImpl = async (u, init) => { url = u; JSON.parse(init.body); return { ok: true, json: async () => ({ model: 'llama3.1', choices: [{ message: { content: 'Local draft' }, finish_reason: 'stop' }] }) }; };
  const r = await complete({ system: 's', user: 'u' }, { env: { OPENAI_COMPAT_BASE_URL: 'http://127.0.0.1:11434/v1', OPENAI_COMPAT_MODEL: 'llama3.1' }, fetchImpl });
  assert.equal(r.text, 'Local draft');
  assert.equal(url, 'http://127.0.0.1:11434/v1/chat/completions');
});

test('system prompt carries the voice profile and anti-fabrication rules', () => {
  const p = buildSystemPrompt(client);
  assert.match(p, /hustle/);
  assert.match(p, /Never invent/);
});

test('export escapes HTML and only includes approved items by default', () => {
  const job = { title: '<script>x</script>', deliverables: { linkedin: { content: '<b>hi</b>', status: 'approved' }, quotes: { content: 'draft q', status: 'draft' } } };
  const html = toHTML(job, { name: 'A&B' });
  assert.ok(!html.includes('<script>x</script>'));
  assert.ok(html.includes('&lt;b&gt;hi&lt;/b&gt;'));
  assert.ok(!html.includes('draft q'));
  assert.ok(toMarkdown(job, {}, { includeDrafts: true }).includes('DRAFT - not approved'));
});

test('QC does not treat the episode title as a fabricated quote', () => {
  const r = runQC('newsletter', 'This week\'s episode, "SAMPLE - Pricing your first market stall", covered pricing.', { transcript: SAMPLE, client, title: 'SAMPLE - Pricing your first market stall' });
  assert.ok(!r.checks.some((c) => c.id === 'quotes'), JSON.stringify(r.checks));
});
