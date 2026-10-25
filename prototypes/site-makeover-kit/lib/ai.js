// Optional AI copy polish. Two adapters:
//  - Claude via the official @anthropic-ai/sdk (optional dependency, loaded only when ANTHROPIC_API_KEY is set)
//  - A local OpenAI-compatible server (Ollama / LM Studio) on this machine
// With neither configured, the generator uses deterministic template copy and labels it as such.

export class AiError extends Error {}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function aiProvider(env = process.env) {
  if (env.ANTHROPIC_API_KEY) {
    const model = env.AI_MODEL || 'claude-opus-5-5';
    return { kind: 'anthropic', model, label: `Claude (${model})` };
  }
  if (env.OPENAI_COMPAT_BASE_URL && env.OPENAI_COMPAT_MODEL) {
    let host = '';
    try { host = new URL(env.OPENAI_COMPAT_BASE_URL).hostname; } catch { /* reported below */ }
    if (!LOCAL_HOSTS.has(host)) {
      return { kind: 'invalid', label: 'OPENAI_COMPAT_BASE_URL must point to a local server (localhost / 127.0.0.1).' };
    }
    return { kind: 'local', model: env.OPENAI_COMPAT_MODEL, baseUrl: env.OPENAI_COMPAT_BASE_URL.replace(/\/+$/, ''), label: `Local model (${env.OPENAI_COMPAT_MODEL})` };
  }
  return null;
}

async function loadAnthropic() {
  try {
    const mod = await import('@anthropic-ai/sdk');
    return mod.default ?? mod.Anthropic;
  } catch {
    throw new AiError('ANTHROPIC_API_KEY is set but the Anthropic SDK is not installed. Run "npm install" in prototypes/site-makeover-kit, then restart the server.');
  }
}

export async function callClaude({ system, content, env = process.env, client }) {
  let c = client;
  if (!c) {
    const Anthropic = await loadAnthropic();
    c = new Anthropic();
  }
  const r = await c.beta.messages.create({
    model: env.AI_MODEL || 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system,
    messages: [{ role: 'user', content }],
  });
  if (r.stop_reason === 'refusal') {
    throw new AiError('Claude declined this request (stop_reason "refusal").');
  }
  return r.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

export async function callLocal({ system, content, provider, env = process.env, fetchImpl = fetch }) {
  const headers = { 'content-type': 'application/json' };
  if (env.OPENAI_COMPAT_API_KEY) headers.authorization = `Bearer ${env.OPENAI_COMPAT_API_KEY}`;
  let res;
  try {
    res = await fetchImpl(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        model: provider.model,
        stream: false,
        messages: [{ role: 'system', content: system }, { role: 'user', content }],
      }),
    });
  } catch (e) {
    throw new AiError(`Could not reach the local model at ${provider.baseUrl} (${e.message}). Is Ollama / LM Studio running?`);
  }
  if (!res.ok) throw new AiError(`Local model returned HTTP ${res.status}.`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

const SYSTEM = `You write website copy for small local service businesses.
Rules:
- Use ONLY the facts provided. Never invent years in business, awards, certifications, insurance, guarantees, prices, review counts, testimonials or statistics.
- Plain, warm, specific language. No hype words like "best", "#1", "world-class". No emojis.
- Match the spelling style of the input (UK or US).
- Reply with JSON only, no markdown fences.`;

export function buildPrompt(d) {
  const facts = {
    businessName: d.businessName, trade: d.trade, town: d.town, serviceArea: d.serviceArea,
    services: d.services, hours: d.hours, ownerProvidedAbout: d.about || null, callToAction: d.cta,
  };
  return `Facts (JSON):\n${JSON.stringify(facts, null, 2)}\n\nReturn JSON with exactly these keys:
{"headline": string (max 70 chars), "subheadline": string (max 180 chars), "about": string (max 600 chars; if ownerProvidedAbout is null, write a short factual intro using only the facts), "services": [{"name": string (copy exactly from facts.services), "blurb": string (max 160 chars)}]}`;
}

export function parseCopyJson(text, d, fallback) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new AiError('The AI reply was not JSON.');
  let obj;
  try { obj = JSON.parse(text.slice(start, end + 1)); } catch { throw new AiError('The AI reply was not valid JSON.'); }
  const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
  const blurbs = { ...fallback.serviceBlurbs };
  if (Array.isArray(obj.services)) {
    for (const s of obj.services) {
      const match = d.services.find(n => n.toLowerCase() === String(s?.name || '').toLowerCase());
      const b = str(s?.blurb, 160);
      if (match && b) blurbs[match] = b;
    }
  }
  return {
    headline: str(obj.headline, 70) || fallback.headline,
    subheadline: str(obj.subheadline, 180) || fallback.subheadline,
    about: str(obj.about, 600) || fallback.about,
    aboutIsPlaceholder: !str(obj.about, 600) && fallback.aboutIsPlaceholder,
    serviceBlurbs: blurbs,
  };
}

export async function polishCopy(d, fallback, { env = process.env, client, fetchImpl } = {}) {
  const provider = aiProvider(env);
  if (!provider) return { copy: fallback, source: 'template' };
  if (provider.kind === 'invalid') return { copy: fallback, source: 'template', warning: provider.label };
  try {
    const content = buildPrompt(d);
    const text = provider.kind === 'anthropic'
      ? await callClaude({ system: SYSTEM, content, env, client })
      : await callLocal({ system: SYSTEM, content, provider, env, fetchImpl });
    return { copy: parseCopyJson(text, d, fallback), source: 'ai', label: provider.label };
  } catch (e) {
    const msg = e instanceof AiError ? e.message : `AI request failed: ${e.message}`;
    return { copy: fallback, source: 'template', warning: `${msg} Template copy was used instead.` };
  }
}
