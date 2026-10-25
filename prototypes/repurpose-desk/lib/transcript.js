// Transcript parsing and lightweight, deterministic analysis (no AI).
// Supports SRT, WebVTT, "[mm:ss] text" style transcripts and plain text.

const STOPWORDS = new Set(`a about above after again against all also am an and any are aren't as at be because been
before being below between both but by can can't cannot could couldn't did didn't do does doesn't doing don't down
during each few for from further get got gonna had hadn't has hasn't have haven't having he he'd he'll he's her here
here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it it's its itself just know
let's like lot me more most mustn't my myself no nor not now of off on once only or other ought our ours ourselves out
over own really right same say said see shan't she she'd she'll she's should shouldn't so some such than that that's
the their theirs them themselves then there there's these they they'd they'll they're they've thing things think this
those through to too under until up us very want was wasn't way we we'd we'll we're we've well were weren't what what's
when when's where where's which while who who's whom why why's will with won't would wouldn't yeah yes you you'd you'll
you're you've your yours yourself yourselves okay ok actually going go one two also even much many make makes made
something someone everyone people kind sort mean basically literally pretty quite still back first look looking`.split(/\s+/));

const FILLERS = [/\bum+\b/gi, /\buh+\b/gi, /\byou know\b/gi, /\bsort of\b/gi, /\bkind of\b/gi, /\bi mean\b/gi];
const HOOK_WORDS = /\b(mistake|secret|truth|never|always|most people|nobody|everyone|actually|biggest|wrong|stop|why|how|exactly|worst|best|simple|real|money|free)\b/gi;

export function parseTimestamp(str) {
  const m = String(str).trim().match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const [, h, mm, ss] = m;
  return (Number(h || 0) * 3600) + Number(mm) * 60 + Number(ss);
}

export function formatTime(sec) {
  if (sec == null || Number.isNaN(sec)) return '';
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** Parse raw transcript text into [{start: seconds|null, text}] segments. */
export function parseTranscript(raw) {
  const text = String(raw || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '').trim();
  if (!text) return [];

  // SRT / VTT: blocks with "start --> end" cue lines.
  if (/-->/.test(text)) {
    const segs = [];
    for (const block of text.split(/\n{2,}/)) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const cueIdx = lines.findIndex((l) => l.includes('-->'));
      if (cueIdx === -1) continue;
      const start = parseTimestamp(lines[cueIdx].split('-->')[0]);
      const body = lines.slice(cueIdx + 1).join(' ').replace(/<[^>]+>/g, '').trim();
      if (body) segs.push({ start, text: body });
    }
    if (segs.length) return dedupeRollingCaptions(segs);
  }

  // Line-prefixed timestamps: "[00:51] text", "(1:02:03) text", "00:51 text", "00:51 - text"
  const lineRe = /^[[(]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\])]?\s*[-–:]?\s*(.*)$/;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const stamped = lines.filter((l) => lineRe.test(l)).length;
  if (stamped >= Math.max(2, lines.length * 0.5)) {
    const segs = [];
    for (const line of lines) {
      const m = line.match(lineRe);
      if (m) {
        if (m[2]) segs.push({ start: parseTimestamp(m[1]), text: m[2] });
        else segs.push({ start: parseTimestamp(m[1]), text: '' });
      } else if (segs.length) {
        segs[segs.length - 1].text += ' ' + line;
      } else {
        segs.push({ start: null, text: line });
      }
    }
    return segs.filter((s) => s.text.trim());
  }

  // Plain text: paragraphs without timing.
  return text.split(/\n+/).map((t) => ({ start: null, text: t.trim() })).filter((s) => s.text);
}

// Auto-generated captions often repeat the previous cue's words; drop exact repeats.
function dedupeRollingCaptions(segs) {
  const out = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (prev && prev.text === s.text) continue;
    out.push(s);
  }
  return out;
}

export function transcriptToPlain(segments) {
  return segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
}

export function transcriptWithTimes(segments) {
  return segments.map((s) => (s.start != null ? `[${formatTime(s.start)}] ${s.text}` : s.text)).join('\n');
}

/**
 * Split segments into sentences, each tagged with the start time of the
 * segment where it begins. Auto-captions often lack punctuation, so when
 * sentences come out very long we fall back to ~20-word chunks on segment boundaries.
 */
export function toSentences(segments) {
  const words = [];
  for (const s of segments) {
    for (const w of s.text.split(/\s+/).filter(Boolean)) words.push({ w, t: s.start });
  }
  if (!words.length) return [];

  const sentences = [];
  let cur = [];
  for (const item of words) {
    cur.push(item);
    if (/[.!?]["')\]]?$/.test(item.w)) {
      sentences.push(cur);
      cur = [];
    }
  }
  if (cur.length) sentences.push(cur);

  const avgLen = words.length / sentences.length;
  let groups = sentences;
  if (avgLen > 45) {
    groups = [];
    let chunk = [];
    for (const item of words) {
      chunk.push(item);
      if (chunk.length >= 20 && /[,.!?;:]$/.test(item.w)) { groups.push(chunk); chunk = []; } else if (chunk.length >= 28) { groups.push(chunk); chunk = []; }
    }
    if (chunk.length) groups.push(chunk);
  }

  return groups.map((g, i) => ({
    i,
    text: g.map((x) => x.w).join(' '),
    start: g[0].t,
    words: g.length,
  }));
}

export function tokenize(text) {
  return String(text).toLowerCase().replace(/[’']/g, "'").match(/[a-z][a-z'-]{2,}/g) || [];
}

export function keywords(sentences, n = 12) {
  const freq = new Map();
  for (const s of sentences) {
    for (const tok of tokenize(s.text)) {
      if (STOPWORDS.has(tok) || tok.endsWith("'s") && STOPWORDS.has(tok.slice(0, -2))) continue;
      freq.set(tok, (freq.get(tok) || 0) + 1);
    }
  }
  return [...freq.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n).map(([word, count]) => ({ word, count }));
}

/** Heuristic "how quotable/useful is this sentence" score. Higher is better. */
export function scoreSentence(sentence, kwSet) {
  const { text, words } = sentence;
  if (words < 7 || words > 45) return 0;
  const toks = tokenize(text);
  let score = 0;
  for (const t of toks) if (kwSet.has(t)) score += 1;
  score = score / Math.sqrt(words) * 2;
  if (/\d/.test(text)) score += 1;
  if (/\byou(r)?\b/i.test(text)) score += 0.5;
  if (/\?$/.test(text)) score += 0.4;
  score += Math.min(2, (text.match(HOOK_WORDS) || []).length * 0.6);
  for (const re of FILLERS) score -= (text.match(re) || []).length * 0.6;
  if (/^(and|so|but|or|because)\b/i.test(text)) score -= 0.4;
  return Math.round(score * 100) / 100;
}

export function cleanSentence(text) {
  let t = text;
  for (const re of FILLERS) t = t.replace(re, '');
  t = t.replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').replace(/^(and|so|but|or)\s+/i, '').trim();
  if (!t) return t;
  t = t[0].toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

/** Choose up to n non-overlapping 15–60s windows with the highest summed sentence score. */
export function pickClips(scored, n = 3, { minSec = 15, maxSec = 60 } = {}) {
  const timed = scored.every((s) => s.start != null);
  const candidates = [];
  for (let i = 0; i < scored.length; i++) {
    let sum = 0;
    for (let j = i; j < scored.length; j++) {
      sum += scored[j].score;
      const startT = scored[i].start;
      const endT = scored[j + 1]?.start ?? (scored[j].start != null ? scored[j].start + Math.ceil(scored[j].words / 2.5) : null);
      const dur = timed ? endT - startT : null;
      const count = j - i + 1;
      if (timed ? dur > maxSec : count > 6) break;
      if (timed ? dur >= minSec : count >= 3) {
        candidates.push({ from: i, to: j, score: sum / Math.sqrt(count), start: startT, end: endT });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const chosen = [];
  for (const c of candidates) {
    if (chosen.some((x) => !(c.to < x.from || c.from > x.to))) continue;
    chosen.push(c);
    if (chosen.length === n) break;
  }
  return chosen.sort((a, b) => a.from - b.from).map((c) => ({
    start: c.start,
    end: c.end,
    text: scored.slice(c.from, c.to + 1).map((s) => s.text).join(' '),
    hook: cleanSentence(scored.slice(c.from, c.to + 1).reduce((best, s) => (s.score > best.score ? s : best)).text),
  }));
}

/** Split the episode into up to `parts` chapters, label each with its top keywords. */
export function chapters(scored, parts = 5) {
  if (!scored.length) return [];
  const size = Math.ceil(scored.length / parts);
  const out = [];
  for (let i = 0; i < scored.length; i += size) {
    const slice = scored.slice(i, i + size);
    const kws = keywords(slice, 3).map((k) => k.word);
    const best = slice.reduce((b, s) => (s.score > b.score ? s : b), slice[0]);
    out.push({ start: slice[0].start, label: kws.length ? kws.join(' · ') : 'Section', lead: cleanSentence(best.text) });
  }
  return out;
}

export function analyze(rawTranscript) {
  const segments = parseTranscript(rawTranscript);
  const sentences = toSentences(segments);
  const kws = keywords(sentences, 12);
  const kwSet = new Set(kws.map((k) => k.word));
  const scored = sentences.map((s) => ({ ...s, score: scoreSentence(s, kwSet) }));
  const ranked = [...scored].filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  const lastStart = [...segments].reverse().find((s) => s.start != null)?.start ?? null;
  const wordCount = sentences.reduce((n, s) => n + s.words, 0);
  return {
    segments,
    sentences: scored,
    keywords: kws,
    top: ranked.slice(0, 12),
    clips: pickClips(scored, 3),
    chapters: chapters(scored, 5),
    stats: {
      segments: segments.length,
      sentences: sentences.length,
      words: wordCount,
      timed: segments.some((s) => s.start != null),
      durationSec: lastStart,
      estMinutes: lastStart != null ? Math.round(lastStart / 60) : Math.round(wordCount / 150),
    },
  };
}
