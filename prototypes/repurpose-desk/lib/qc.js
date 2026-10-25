// Quality control for a draft deliverable. This is the part clients actually pay
// for: catching invented facts, off-voice wording, platform limits and leftover
// placeholders before anything is sent.

import { analyze, formatTime, transcriptToPlain } from './transcript.js';

const AI_CLICHES = [
  'delve', 'game-changer', 'game changer', 'unlock the', 'unleash', 'elevate your', 'in today\'s fast-paced',
  'tapestry', 'navigate the complexities', 'it\'s important to note', 'in conclusion', 'look no further',
  'revolutionize', 'supercharge', 'harness the power', 'embark on', 'a testament to', 'ever-evolving',
];

const FILLER_RE = /\b(um+|uh+|you know|sort of|kind of|i mean)\b/g;

export function normalize(text) {
  return String(text).toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"')
    .replace(FILLER_RE, ' ').replace(/[^a-z0-9$%' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normNumber(n) {
  return n.replace(/[,\s]/g, '').replace(/\.0+$/, '');
}

const LIMITS = { linkedin: { warn: 1300, fail: 3000 }, x_post: 280 };

function add(checks, level, id, message) {
  checks.push({ level, id, message });
}

export function runQC(type, content, { transcript = '', client = {}, title = '' } = {}) {
  const checks = [];
  const text = String(content || '');
  if (!text.trim()) {
    add(checks, 'fail', 'empty', 'Draft is empty.');
    return summarize(checks);
  }

  const analysis = analyze(transcript);
  const plain = transcriptToPlain(analysis.segments);
  const normTranscript = normalize(plain);
  const transcriptNumbers = new Set((plain.match(/\d[\d,]*(?:\.\d+)?/g) || []).map(normNumber));

  // 1. Unresolved placeholders block approval.
  const placeholders = text.match(/\[(?:EDIT|CHECK)[^\]]*\]/g) || [];
  if (placeholders.length) add(checks, 'fail', 'placeholders', `${placeholders.length} unresolved [EDIT]/[CHECK] placeholder(s).`);

  // 2. Client banned words.
  const banned = (client.voice?.bannedWords || []).filter(Boolean);
  const hits = banned.filter((w) => new RegExp(`(^|[^a-z])${escapeRe(w.toLowerCase())}([^a-z]|$)`, 'i').test(text));
  if (hits.length) add(checks, 'fail', 'banned', `Uses words the client banned: ${hits.join(', ')}.`);

  // 3. Generic AI phrasing.
  const cliches = AI_CLICHES.filter((c) => text.toLowerCase().includes(c));
  if (cliches.length) add(checks, 'warn', 'cliches', `Generic AI-sounding phrasing: ${cliches.join(', ')}.`);

  // 4. Numbers that don't appear in the transcript (possible invented stats).
  const withoutTimes = text.replace(/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g, ' ').replace(/^\s*\d+[/.)]\s/gm, ' ').replace(/Clip \d+/g, ' ');
  const numbers = [...new Set((withoutTimes.match(/\$?\d[\d,]*(?:\.\d+)?%?/g) || []))];
  const unverified = numbers.filter((raw) => {
    const n = normNumber(raw.replace(/[$%]/g, ''));
    const isMoneyOrPct = /[$%]/.test(raw);
    if (!isMoneyOrPct && Number(n) <= 10) return false; // structural small numbers ("3 takeaways")
    return !transcriptNumbers.has(n);
  });
  if (unverified.length) add(checks, 'warn', 'numbers', `Numbers not found in the transcript - verify or remove: ${unverified.slice(0, 8).join(', ')}.`);

  // 5. Quoted text must be verbatim from the transcript.
  const quotes = [...text.matchAll(/["“]([^"”\n]{15,}?)["”]/g)].map((m) => m[1]);
  const fakeQuotes = quotes.filter((q) => {
    const nq = normalize(q).replace(/^(and|so|but|or) /, '');
    return nq.split(' ').length >= 4 && !normTranscript.includes(nq) && nq !== normalize(title);
  });
  if (fakeQuotes.length) add(checks, 'warn', 'quotes', `${fakeQuotes.length} quoted line(s) are not verbatim in the transcript: "${fakeQuotes[0].slice(0, 70)}${fakeQuotes[0].length > 70 ? '…' : ''}"`);

  // 6. Timestamps must exist within the episode.
  const dur = analysis.stats.durationSec;
  if (dur != null) {
    const stamps = text.match(/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g) || [];
    const bad = stamps.filter((s) => {
      const p = s.split(':').map(Number);
      const sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
      return sec > dur + 60;
    });
    if (bad.length) add(checks, 'fail', 'timestamps', `Timestamp(s) beyond the episode length (${formatTime(dur)}): ${bad.join(', ')}.`);
  } else if (['short_scripts', 'show_notes'].includes(type)) {
    add(checks, 'info', 'untimed', 'Transcript has no timestamps, so chapter/clip times cannot be verified.');
  }

  // 7. Platform limits.
  if (type === 'linkedin') {
    if (text.length > LIMITS.linkedin.fail) add(checks, 'fail', 'length', `LinkedIn limit is 3,000 characters (draft: ${text.length}).`);
    else if (text.length > LIMITS.linkedin.warn) add(checks, 'warn', 'length', `Long for LinkedIn (${text.length} chars); posts under ~1,300 are easier to read in-feed.`);
  }
  if (type === 'x_thread') {
    const posts = text.split(/\n\s*\n|(?=^\s*\d+\/)/m).map((p) => p.trim()).filter(Boolean);
    const over = posts.map((p, i) => ({ i: i + 1, len: [...p].length })).filter((p) => p.len > LIMITS.x_post);
    if (over.length) add(checks, 'fail', 'length', `Post(s) over 280 characters: ${over.map((o) => `#${o.i} (${o.len})`).join(', ')}.`);
    if (posts.length < 3) add(checks, 'warn', 'thread', `Only ${posts.length} post(s) - is this really a thread?`);
  }
  if (type === 'newsletter') {
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 150) add(checks, 'warn', 'length', `Short for a newsletter (${words} words).`);
    if (words > 1500) add(checks, 'warn', 'length', `Long for a newsletter (${words} words).`);
    if (!/subject/i.test(text)) add(checks, 'info', 'subject', 'No subject line found.');
  }

  // 8. Call to action present (where expected).
  const cta = client.voice?.cta;
  if (cta && ['newsletter', 'linkedin', 'x_thread'].includes(type) && !normalize(text).includes(normalize(cta).slice(0, 25))) {
    add(checks, 'info', 'cta', 'The client\'s standard call to action is not included.');
  }

  return summarize(checks);
}

function summarize(checks) {
  const status = checks.some((c) => c.level === 'fail') ? 'fail' : checks.some((c) => c.level === 'warn') ? 'warn' : 'pass';
  return { status, checks, checkedAt: new Date().toISOString() };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
