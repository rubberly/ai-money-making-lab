# Repurpose Desk

A local web app for running a **content-repurposing service** (Method 2 in the research): you take a creator's long-form episode (podcast or YouTube) and deliver a newsletter, a LinkedIn post, an X thread, a short-clip plan, show notes and a quote bank, all **in their voice and checked against what they actually said**.

The video's own advice is that the human quality check is what clients pay for ("this quality control is what they'll end up paying me", ~07:57). This tool is built around that: every draft goes through automated checks before you can approve it.

## Quick start

```bash
cd prototypes/repurpose-desk
npm start                # Node 20+; no install needed for offline mode
# open http://localhost:3100        (your workspace)
# open http://localhost:3100/offer  (customer-facing offer page)
npm test                 # 17 automated tests
```

To try it: **Clients → add a client → Episodes → "Load SAMPLE transcript" → Create → Generate all**. Then edit a draft, **Save & re-check**, and **Approve**. Finally, **Download pack**.

## What works (tested)

| Area | What it does |
|---|---|
| Transcript import | Paste, or load .txt / .srt / .vtt. Keeps timestamps. Handles unpunctuated auto-captions. |
| Episode analysis (no AI) | Keywords, strongest moments, 3 suggested 15–60s clips, 5 chapters |
| Drafts | 6 deliverable types. **AI mode** (Claude or a local model) or **template mode** (no AI, clearly labelled) |
| Quality control | Flags numbers missing from the transcript, quotes that aren't verbatim, out-of-range timestamps, client-banned words, generic AI phrasing, platform limits (X 280 / LinkedIn 3,000), and unresolved `[EDIT]`/`[CHECK]` placeholders. Failing drafts can't be approved without a written override note. |
| Delivery | Client pack export as HTML (printable) or Markdown, approved items only by default |
| Business tracking | Prospect pipeline (7 stages, CSV export), outreach-message drafts (copy only, never sent), per-episode time tracking, payments log, dashboard that keeps **interest** and **payment** evidence separate, pricing calculator |
| Offer page | `/offer` landing page with an interest form and **test-mode** "Reserve" buttons. No card is collected and no payment is taken. |
| Storage | `data/db.json`, written atomically. Full JSON backup download. |

## AI configuration (optional)

Copy `.env.example` to `.env`.

- **No configuration**: template drafts only. These reuse the speaker's strongest sentences and leave `[EDIT]` gaps for you to write. They are **not AI output** and are labelled that way everywhere.
- **Claude (paid)**: set `ANTHROPIC_API_KEY`, then run `npm install` (installs the official `@anthropic-ai/sdk` as an optional dependency). The default model is `claude-opus-5-5`; set `AI_MODEL=claude-sonnet-5-5` or `claude-haiku-5-5` to cut cost. Server-side refusal fallback is enabled (`fallbacks: "default"`): if the model declines, the API retries on a fallback model. Remove those two lines in `lib/ai.js` if you don't want that.
- **Local model (free)**: run Ollama or LM Studio and set `OPENAI_COMPAT_BASE_URL` plus `OPENAI_COMPAT_MODEL`. Quality varies by model.

The AI prompt tells the model to use only facts from the transcript and to mark unknowns as `[EDIT]`/`[CHECK]`. QC then checks the result independently, so the prompt alone is not trusted.

## Running it online (Render)

The repo's root `render.yaml` deploys this app as a free Render web service.
- **Password:** set `APP_PASSWORD` to lock the workspace (Render generates one; see the service's *Environment* tab). Your browser asks for it, and any username works. `/offer` and its form stay public, so you can share that link with prospects.
- **Data is not permanent on the free plan.** Render's free instances lose files when they restart, redeploy or wake from sleep. Use *Money & pricing → Download full backup* regularly, or move to a paid instance with a persistent disk (costs money) before relying on it.
- Free instances sleep after ~15 minutes idle, so the first load after that takes up to a minute.

## Not verified / limitations

- **No live AI generation was tested.** No API key or local model was available on the build machine. The Claude path was tested with a fake client (request shape, refusal handling) and against the real API with a deliberately invalid key, which confirmed the SDK loads and returns a clean 401 error. The first real run with your key is the real test.
- QC is heuristic. It catches invented numbers, invented quotes and bad timestamps, but it cannot judge whether a paraphrase is fair or whether the voice is right. You are still the editor.
- Short numbers (≤10) are not checked, to avoid flagging "3 takeaways".
- No transcription built in. Get transcripts from the client's own tools (Riverside, Descript, YouTube Studio captions) or run Whisper locally.
- Single user, local only, no login. The server binds to 127.0.0.1 and rejects cross-origin writes. Don't expose it to the internet as-is.
- The offer page works locally. To show it to real people you'd host it (e.g. copy `public/offer.html` to a static host and point the form at a free service such as Tally or Google Forms), or deploy the whole app behind authentication.
- Never enable real payments without a proper provider (Stripe Payment Links is the simplest) and your own decision.

## Files

```
server.js            HTTP server + JSON API
lib/transcript.js    parsing (SRT/VTT/timestamped/plain) + analysis
lib/generate.js      prompts, template drafts, generation
lib/ai.js            Claude / local-model adapter
lib/qc.js            quality checks
lib/export.js        client pack export
lib/db.js            JSON store
public/              UI (index.html, app.js), offer page (offer.html, offer.js), SAMPLE transcript
test/                node:test suites (unit + API end-to-end)
```
