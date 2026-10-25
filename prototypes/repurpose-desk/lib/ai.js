// AI provider adapter. Three modes:
//   anthropic          - Claude via the official @anthropic-ai/sdk (needs ANTHROPIC_API_KEY + `npm install`)
//   openai-compatible  - a LOCAL model server such as Ollama or LM Studio (OPENAI_COMPAT_BASE_URL + OPENAI_COMPAT_MODEL)
//   none               - no AI configured; callers fall back to template (non-AI) drafts
// Nothing here ever fakes an AI response.

export const DEFAULT_CLAUDE_MODEL = 'claude-opus-5-5';

export function getProvider(env = process.env) {
  if (env.ANTHROPIC_API_KEY) {
    return { name: 'anthropic', model: env.AI_MODEL || DEFAULT_CLAUDE_MODEL, label: 'Claude (Anthropic API)' };
  }
  if (env.OPENAI_COMPAT_BASE_URL && env.OPENAI_COMPAT_MODEL) {
    return { name: 'openai-compatible', model: env.OPENAI_COMPAT_MODEL, baseUrl: env.OPENAI_COMPAT_BASE_URL.replace(/\/+$/, ''), label: 'Local model (OpenAI-compatible server)' };
  }
  return { name: 'none', model: null, label: 'No AI configured - template drafts only' };
}

export class AIError extends Error {}

async function loadAnthropicClient(env) {
  let mod;
  try {
    mod = await import('@anthropic-ai/sdk');
  } catch {
    throw new AIError('ANTHROPIC_API_KEY is set but the Anthropic SDK is not installed. Run `npm install` in prototypes/repurpose-desk.');
  }
  const Anthropic = mod.default || mod.Anthropic;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

/**
 * Run one completion. `deps` lets tests inject a fake client / fetch.
 * Returns { text, provider, model }.
 */
export async function complete({ system, user }, { env = process.env, anthropicClient, fetchImpl = fetch } = {}) {
  const provider = getProvider(env);
  if (provider.name === 'none') throw new AIError('No AI provider configured.');

  if (provider.name === 'anthropic') {
    const client = anthropicClient || await loadAnthropicClient(env);
    let r;
    try {
      r = await client.beta.messages.create({
        model: provider.model,
        max_tokens: 16000,
        // Server-side refusal fallback: if the model declines, the API retries on a fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'medium' },
        system,
        messages: [{ role: 'user', content: user }],
      });
    } catch (err) {
      throw new AIError(`Claude API error: ${err?.message || err}`);
    }
    if (r.stop_reason === 'refusal') throw new AIError('The model declined this request (refusal). Review the transcript content.');
    const text = (r.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (!text) throw new AIError('The model returned no text.');
    return { text, provider: provider.name, model: r.model || provider.model, truncated: r.stop_reason === 'max_tokens' };
  }

  // OpenAI-compatible local server (Ollama: http://127.0.0.1:11434/v1)
  const headers = { 'content-type': 'application/json' };
  if (env.OPENAI_COMPAT_API_KEY) headers.authorization = `Bearer ${env.OPENAI_COMPAT_API_KEY}`;
  let res;
  try {
    res = await fetchImpl(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: provider.model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      signal: AbortSignal.timeout(Number(env.AI_TIMEOUT_MS || 300000)),
    });
  } catch (err) {
    throw new AIError(`Could not reach local model server at ${provider.baseUrl}: ${err.message}`);
  }
  if (!res.ok) throw new AIError(`Local model server returned HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new AIError('Local model returned no text.');
  return { text, provider: provider.name, model: data.model || provider.model, truncated: data?.choices?.[0]?.finish_reason === 'length' };
}
