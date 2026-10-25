# Site Makeover Kit

A local tool for running a **website-makeover service for local businesses** (Method 4 in the research). It covers the full loop the video describes: find a business with a weak site, check what's wrong, build a free sample, send a personalised email, then track the deal.

- **Prospects:** pipeline from *found* through *audited*, *sample built*, *emailed*, *replied*, *call*, *paid* and *monthly care plan* (or *lost*), with quotes and revenue.
- **Audit:** fetches a public site (or uses pasted HTML) and runs 15 weighted checks: mobile viewport, HTTPS, tap-to-call, visible phone, contact path, title/description, H1, alt text, page weight, scripts, stale © year, legacy tech (tables, `<font>`, Flash, frames), favicon and call to action. Output is a score out of 100, plain-English findings, and a printable report for the owner.
- **Detail extraction:** pulls business name, phones, emails, service headings, opening hours and UK postcode / US ZIP address lines to prefill the builder.
- **Sample site builder:** generates a standalone, dependency-free, mobile-first one-page site with:
  - a tap-to-call button and a sticky mobile call bar
  - services, hours, service area and a contact form
  - LocalBusiness JSON-LD and 4 colour themes

  You can preview it at desktop or 375px, then download it.
- **Outreach draft:** a short, honest email built from the audit's two biggest issues, with your name, physical postal address and an opt-out line. **The app never sends email.**
- **Pricing calculator:** build fee, care plan, costs and hours, giving profit and your effective hourly rate.
- **Offer page** (`/offer`): a public-style landing page with packages, an interest form (saved locally) and a **test-mode** "reserve" flow that records an order without taking payment.

## Setup

Requires Node.js 20+ (built and tested on Node 24). **No `npm install` is needed** unless you want Claude copy polish.

```bash
cd ai-money-making-lab/prototypes/site-makeover-kit
npm start            # http://127.0.0.1:3200  (offer page: http://127.0.0.1:3200/offer)
npm test             # node:test suite
```

Optional configuration: `cp .env.example .env` and fill in what you need. The server reads `.env` at startup, and real environment variables take precedence.

| Variable | What it does | Cost |
|---|---|---|
| `PORT`, `HOST`, `DATA_DIR` | Server port (3200), bind address (127.0.0.1), data folder (`./data`) | – |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | Claude rewrites the sample-site copy from your facts. Needs `npm install` (installs the optional `@anthropic-ai/sdk`). Default model `claude-opus-5-5`. | Paid API |
| `OPENAI_COMPAT_BASE_URL`, `OPENAI_COMPAT_MODEL` | Same, using a **local** model (Ollama / LM Studio). Must point at localhost. | Free |
| `PAGESPEED_API_KEY` | Adds Google's mobile performance score to URL audits | Free key |

If `ANTHROPIC_API_KEY` is set but the SDK isn't installed, the builder shows *"Run npm install…"* and falls back to template copy.

**Server-side refusal fallbacks are enabled.** Claude requests send the `server-side-fallback-2026-07-01` beta with `fallbacks: "default"`, so if the primary model declines, the API can retry with a fallback model server-side. To turn this off, remove the `betas` and `fallbacks` lines in `lib/ai.js` (`callClaude`). If a request still ends with `stop_reason: "refusal"`, the app shows a warning and uses template copy.

## Using it: the workflow

1. **Prospects:** search Google Maps for *trade + town* (e.g. "roofers in Leeds"), open their websites on your phone, and add the ones that look outdated. Record where you found them.
2. **Audit:** click *Audit* on a prospect. If a site blocks automated requests, tick *Paste HTML instead* and paste the page source. Open the printable report to attach it or save it as a PDF.
3. **Build sample:** click *Build a sample site from this*. Fields prefill from the prospect and audit; **check every one**. Add real services, hours and phone. Leave *About* and *Reviews* blank unless you have real facts or real reviews: blanks become clearly dashed placeholders, never invented content. Download `index.html`.
4. **Share the sample (free hosting):**
   - **Netlify Drop:** <https://app.netlify.com/drop>. Drag a folder containing `index.html` to get a public link.
   - **Cloudflare Pages:** dashboard → *Workers & Pages* → *Upload assets*.
   - **GitHub Pages:** a repo with `index.html`, then *Settings → Pages*.

   Use a neutral preview name, not the business's brand name as a domain.
5. **Outreach draft:** paste the sample link, then *Write draft*. Fill in *Settings* first (your name and **physical postal address**). Edit the draft, copy it, and send it **yourself** to an address the business publishes for enquiries. Click *I sent it* to move the stage.
6. **Track it:** move stages as replies come in, and record the quote and revenue. The *Prospects* header shows reply rate and revenue.
7. **Pricing:** sanity-check the quote against your hours before you send it.

## What is real vs. not

| Feature | Status |
|---|---|
| Fetching and auditing a live public site | **Real.** Server-side fetch with SSRF protection. |
| Audit scores | **Real but heuristic.** HTML pattern checks, not a browser render. No real load-time measurement unless PageSpeed is enabled. |
| Generated sample site | **Real**, standalone HTML you can host anywhere. |
| AI copy | **Only with a key or local model.** Otherwise the badge says *template copy (no AI)*. AI output is labelled *AI-assisted* and must be reviewed. |
| Email | **Drafts only.** Nothing is ever sent. |
| Payments | **Test mode only.** Orders say *TEST MODE: no payment taken*. For real payments, link a Stripe Payment Link or invoice manually. Not integrated. |
| Contact form on generated sites | Uses `mailto:` (opens the visitor's email app; unreliable) unless you set a form endpoint (e.g. Formspree) in Settings. |
| Data storage | A local JSON file (`data/db.json`). Single user, no accounts, no backups: copy the file to back it up. |

## Security notes

- Binds to `127.0.0.1` by default. Set `APP_PASSWORD` before exposing it anywhere: it locks the workspace and API (HTTP Basic auth, any username), while `/offer` and its form stay public.
- **On Render** (root `render.yaml`): the password is generated by Render (service → *Environment*). Free instances sleep when idle and **lose `data/db.json` on restart or redeploy**, so treat the hosted copy as a demo unless you add a paid persistent disk.
- URL audits only allow public `http(s)` hosts on standard ports. Localhost, private, link-local, CGNAT, multicast and IPv6 local ranges are blocked. Every redirect is re-checked (max 3), and DNS answers are re-validated at connect time. Fetches are capped at 10 s and 3 MB.
- All page-derived and user text is escaped. The app uses a strict CSP with no inline scripts. Generated sites are previewed in a sandboxed iframe and served with a CSP that blocks scripts.
- Writes require `Content-Type: application/json`, which blocks cross-site form posts.

## Compliance and ethics (read before emailing anyone)

- **US CAN-SPAM** applies to B2B cold email: accurate headers, a non-deceptive subject, a valid physical postal address, and a working opt-out honoured within 10 business days. The draft includes these, but you are responsible for sending lawfully. The UK, EU and Canada (PECR, GDPR, CASL) have **stricter** rules for emailing individuals and sole traders, so check your jurisdiction.
- Email one business at a time, only at addresses they publish for enquiries. Don't scrape or buy lists. Stop at the first "no".
- Don't put invented reviews, awards or years in business on a sample site. The FTC's 2024 rule bans fake testimonials, including AI-generated ones.
- A sample built from someone's public details is fine to *show* them privately. Don't publish it as if it were their real site.

## Limitations

- The audit parses HTML with regular expressions, not a full DOM. Unusual markup can produce false positives or negatives (e.g. a phone number shown only as an image won't be found).
- JavaScript-rendered sites (some Wix/Squarespace pages) may look emptier to the audit than they do in a browser.
- Phone and address extraction is tuned for UK and US formats.
- Only one-page sample sites are generated. Multi-page builds are done by you, or with a site builder, once the client pays.
- No user accounts, multi-user support or cloud sync.

## Project layout

```
server.js            HTTP server, routes, validation
lib/ssrf.js          Safe outbound fetch (public hosts only)
lib/audit.js         15 weighted checks + printable report
lib/extract.js       Business-detail extraction
lib/generate.js      Sample-site generator (themes, template copy)
lib/ai.js            Optional Claude (SDK) / local-model copy polish
lib/outreach.js      Email draft builder (never sends)
lib/pricing.js       Pricing calculator
lib/store.js         JSON file storage
public/              SPA (index.html, app.js, styles.css) and offer page (offer.html, offer.js)
test/                node:test suites + HTML fixtures
```
