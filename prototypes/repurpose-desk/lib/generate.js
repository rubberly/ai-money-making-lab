// Builds deliverables for one episode, either with an AI provider or as a
// clearly-labelled template draft assembled from the speaker's own sentences.

import { analyze, cleanSentence, formatTime, transcriptWithTimes } from './transcript.js';
import { complete, getProvider } from './ai.js';

export const DELIVERABLES = {
  newsletter: { label: 'Newsletter', hint: 'Email issue built from the episode' },
  linkedin: { label: 'LinkedIn post', hint: 'Max 3,000 characters' },
  x_thread: { label: 'X thread', hint: '5–8 posts, 280 characters each' },
  short_scripts: { label: 'Short-form clip plan', hint: '3 clips with timestamps to cut' },
  show_notes: { label: 'Show notes', hint: 'Summary + chapters + takeaways' },
  quotes: { label: 'Quote bank', hint: 'Verbatim lines for quote graphics' },
};

const TYPE_INSTRUCTIONS = {
  newsletter: `Write an email newsletter issue (400–800 words).
Start with "Subject options:" followed by 3 subject lines, one per line.
Then the body: a short personal opener, 3 key takeaways each with a short heading, and close with this call to action: {cta}.`,
  linkedin: `Write one LinkedIn post. Aim for under 1,300 characters (hard limit 3,000).
First line is a hook under 150 characters. Use short lines and white space. End with the call to action ({cta}) or a question.`,
  x_thread: `Write an X (Twitter) thread of 5–8 posts. Prefix each post with its number like "1/". Each post must be 280 characters or fewer including the number. The final post contains the call to action: {cta}.`,
  short_scripts: `Pick the 3 strongest 15–60 second moments to cut as vertical short-form clips.
For each, output:
Clip N — [start–end] (use timestamps exactly as they appear in the transcript)
On-screen hook: (max 8 words)
Excerpt to cut: (verbatim words from the transcript)
Caption: (max 150 characters)`,
  show_notes: `Write podcast/YouTube show notes: a 2–3 sentence summary, a chapter list using timestamps that appear in the transcript ("0:00 Intro" style), and 3–5 key takeaways as bullets.`,
  quotes: `List 6–8 quotable lines for quote graphics. Each must be the speaker's EXACT words from the transcript (you may trim filler words at the start or end only), followed by its timestamp in brackets.`,
};

export function buildSystemPrompt(client = {}) {
  const v = client.voice || {};
  const lines = [
    `You are a meticulous ghostwriter repurposing a long-form episode for ${client.name || 'a creator'}${client.show ? ` (${client.show})` : ''}.`,
    v.tone && `Voice and tone: ${v.tone}`,
    v.audience && `Audience: ${v.audience}`,
    v.signaturePhrases?.length && `Phrases the creator really uses (use sparingly, only where natural): ${v.signaturePhrases.join('; ')}`,
    v.bannedWords?.length && `Never use these words or phrases: ${v.bannedWords.join(', ')}`,
    v.samplePosts && `Examples of the creator's own writing, for style only (do not copy facts from them):\n<examples>\n${v.samplePosts}\n</examples>`,
    `Rules:
- Use only facts, numbers, names, stories and claims that appear in the transcript. Never invent statistics, quotes, anecdotes or results.
- Write in the first person as the creator, matching their voice. Avoid generic AI phrasing ("delve", "game-changer", "unlock", "in today's fast-paced world").
- Where the creator must add something you cannot know (a personal opener, a link), write [EDIT: what is needed].
- If a detail in the transcript looks garbled (auto-captions), mark it [CHECK: reason] instead of guessing.
- Output plain text only, with no preamble or commentary.`,
  ];
  return lines.filter(Boolean).join('\n\n');
}

export function buildUserPrompt(type, job, client = {}) {
  const cta = client.voice?.cta || '[EDIT: call to action]';
  const instr = TYPE_INSTRUCTIONS[type].replaceAll('{cta}', cta);
  const analysis = analyze(job.transcript);
  return `${instr}

Episode title: ${job.title || '(untitled)'}
${job.sourceUrl ? `Episode link: ${job.sourceUrl}\n` : ''}
<transcript>
${transcriptWithTimes(analysis.segments)}
</transcript>`;
}

// ---------- Template (non-AI) drafts ----------

const TEMPLATE_BANNER = 'TEMPLATE DRAFT (no AI): built from the speaker\'s own sentences. Rewrite in the client\'s voice and resolve every [EDIT]/[CHECK] before approval.';

function t(sec) {
  const f = formatTime(sec);
  return f ? `[${f}]` : '';
}

export function templateDraft(type, job, client = {}) {
  const a = analyze(job.transcript);
  if (!a.sentences.length) throw new Error('Transcript is empty.');
  const cta = client.voice?.cta || '[EDIT: call to action]';
  const top = a.top.length ? a.top : a.sentences.slice(0, 5);
  const best = (i) => cleanSentence((top[i] || top[0]).text);
  const topics = a.keywords.slice(0, 5).map((k) => k.word);
  const title = job.title || '[EDIT: episode title]';

  switch (type) {
    case 'newsletter':
      return [
        'Subject options:',
        `${title}`,
        `"${best(0).replace(/[.!?]$/, '')}"`,
        `[EDIT: curiosity-driven subject about ${topics[0] || 'the main topic'}]`,
        '',
        '[EDIT: 1–2 sentence personal opener in the client\'s voice]',
        '',
        `This week's episode, "${title}", covered ${topics.slice(0, 3).join(', ') || '[EDIT: topics]'}. Here are the three ideas worth keeping:`,
        '',
        ...[0, 1, 2].flatMap((i) => [`${i + 1}. [EDIT: short heading]`, `${best(i)} ${t((top[i] || top[0]).start)}`, '[EDIT: one or two lines of context or why it matters]', '']),
        job.sourceUrl ? `Watch/listen to the full episode: ${job.sourceUrl}` : 'Full episode: [EDIT: link]',
        '',
        cta,
      ].join('\n');

    case 'linkedin':
      return [
        best(0),
        '',
        `[EDIT: one-line bridge into the lesson]`,
        '',
        `→ ${best(1)}`,
        `→ ${best(2)}`,
        `→ ${best(3)}`,
        '',
        `[EDIT: one-sentence takeaway in the client's words]`,
        '',
        cta,
      ].join('\n');

    case 'x_thread': {
      const posts = [
        `${best(0)} A thread from this week's episode 🧵`,
        ...[1, 2, 3, 4].map((i) => best(i)),
        `[EDIT: personal takeaway]. ${cta}`,
      ];
      return posts.map((p, i) => `${i + 1}/ ${p}`).join('\n\n');
    }

    case 'short_scripts':
      if (!a.clips.length) return 'Not enough material to pick clips. [EDIT: choose clips manually]';
      return a.clips.map((c, i) => [
        `Clip ${i + 1} — [${formatTime(c.start) || '?'}–${formatTime(c.end) || '?'}]`,
        `On-screen hook: [EDIT: ≤8 words based on: "${c.hook.slice(0, 80)}"]`,
        `Excerpt to cut: ${c.text}`,
        `Caption: [EDIT: ≤150 characters]`,
      ].join('\n')).join('\n\n');

    case 'show_notes':
      return [
        `${title}`,
        '',
        `In this episode: ${topics.slice(0, 4).join(', ') || '[EDIT: topics]'}. ${best(0)} [EDIT: tighten into a 2–3 sentence summary]`,
        '',
        'Chapters',
        ...a.chapters.map((c, i) => `${formatTime(c.start) || '-'} ${i === 0 ? 'Intro — ' : ''}[EDIT: chapter title] (${c.label})`),
        '',
        'Key takeaways',
        ...[0, 1, 2].map((i) => `• ${best(i)}`),
        '',
        job.sourceUrl ? `Full episode: ${job.sourceUrl}` : '',
      ].filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim();

    case 'quotes':
      return top.slice(0, 8).map((s) => `"${cleanSentence(s.text)}" ${t(s.start)}`).join('\n');

    default:
      throw new Error(`Unknown deliverable type: ${type}`);
  }
}

/**
 * Generate one deliverable. mode: 'auto' (AI if configured, else template) | 'template' | 'ai'.
 */
export async function generateDeliverable(type, job, client, { mode = 'auto', env = process.env, deps = {} } = {}) {
  if (!DELIVERABLES[type]) throw new Error(`Unknown deliverable type: ${type}`);
  const provider = getProvider(env);
  const useAI = mode === 'ai' || (mode === 'auto' && provider.name !== 'none');
  if (useAI) {
    const r = await complete({ system: buildSystemPrompt(client), user: buildUserPrompt(type, job, client) }, { env, ...deps });
    return { content: r.text, mode: 'ai', provider: r.provider, model: r.model, note: r.truncated ? 'Output hit the length limit and may be cut off.' : '' };
  }
  return { content: templateDraft(type, job, client), mode: 'template', provider: 'none', model: null, note: TEMPLATE_BANNER };
}
