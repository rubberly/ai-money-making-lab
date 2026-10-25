# Final report: AI money-making research and prototype lab

*Prepared 2026-10-25. All income, cost and time figures are estimates or quoted claims, not promises.*

## 1. Executive summary

- **The video was found and analysed from its full caption track** (Chrome blocked YouTube, so the video wasn't watched). Its published title is "…(**No** Experience)", not "Without Experience". Same creator, same 7-method structure.
- **Only six methods are actually explained.** Method 7, the "S tier", is held back to promote a free 5-day "AI Income Challenge" (Nov 7), which is the top of a sales funnel. Its content is unknown and unscored.
- **Recommendation: content repurposing for podcasters and YouTubers (Method 2).** Score 78/100. You can start for $0, legal risk is lowest, income is recurring, and it can be validated with 15 personal free samples. Website makeovers (68/100) is a solid second.
- **On whether you need an app:** for most of these ideas, no. The SaaS tools *are* the app, and the bottleneck is selling, staying legal, and quality. Software genuinely helps in two places: repurposing (repeatable delivery and fact-checking) and website makeovers (audit-led pitching and free spec sites). **I built both, tested both, and they work.**
- **Watch-outs the video doesn't mention:**
  - AI-edited property photos are hitting MLS and platform disclosure rules.
  - The UGC-ad demo (an AI person describing their own experience) is the kind of fake testimonial the FTC's 2024 rule bans.
  - Dead-lead SMS needs TCPA consent and 10DLC registration.

## 2. Video findings

Tilbury & Gadzhi, published 2026-10-24, 26:24, https://www.youtube.com/watch?v=hriu0irRcpE. Full notes: `research/video_notes.md`.

| # | Time | Presenter | Method | Their tier | Price/income claimed | Tools named |
|---|---|---|---|---|---|---|
| 1 | 00:51 | Gadzhi | AI-enhanced property listing photos + AI walkthrough videos for agents and hosts. Free before/after sample, upsell video. | B | ~$100 per listing. "$5k–10k/mo" with retainers | Higgsfield. Airbnb, Zillow, Property24, Booking.com |
| 2 | 05:00 | Tilbury | Repurpose creators' long-form content into newsletter, X, LinkedIn and short scripts in their voice. Free sample first, QC is the value. | A | "Few hundred to a couple thousand $/mo per client" | Claude Projects, a transcription tool |
| 3 | 09:55 | Gadzhi | Reactivate businesses' old leads with AI texting. Paid per booked, attended appointment. | B | $50 to a few hundred per show. "~$10k/mo" | HighLevel + Conversation AI, Claude |
| 4 | 13:46 | Tilbury | Local business website makeovers with an AI builder. Free spec site, then launch plus monthly care. | B/C | "Few hundred to a couple thousand" + monthly | Google Maps, an unnamed AI website builder |
| 5 | 17:48 | Gadzhi | AI UGC-style ads with AI avatars for brands. | A (for potential, with a warning) | Real creators get $100–600/video. "Few $1,000/mo" retainers | Higgsfield |
| 6 | 21:23 | Tilbury | Set up and test AI support chatbots for businesses. | B | Setup + monthly (no figures) | Chatbase, Tidio ("TDO") |
| 7 | 24:46 | Both | **Not revealed.** Promotes the free "AI Income Challenge" (Nov 7–15). Description advertises "$373/day". | "S" | Unverified marketing claim | – |

None of the income figures were backed by case studies in the video. They're treated as unverified.

## 3. Feasibility rankings

Weights: cost 15, beginner 15, speed 15, demand 15, profit/effort 15, build 10, automate 10, risk 5. Reasons for every score: `research/feasibility_scorecard.md`.

| Rank | Method | Score | Min. startup cost (est.) | First customer (est.) | Main reason |
|---|---|---:|---|---|---|
| 1 | Content repurposing | **78.0** | $0 ($20/mo optional AI) | 1–3 weeks | Free to test, recurring, low risk. Paid market exists, but $19–39 tools cap the price |
| 2 | Website makeovers | **68.0** | $0 (free hosting) | 2–4 weeks | Universal need, priced below $500–5k freelance rates. Spec work and selling effort |
| 3 | Support chatbots | **63.5** | ~$0–40/mo | 2–4 weeks | Easy demo, but businesses can self-serve, and they're liable for wrong answers |
| 4 | Listing photo/video makeovers | **63.0** | ~$15–40/mo | ~1–2 weeks | Fast, but editing sells for ~$1.60/image and disclosure rules are tightening |
| 5 | Dead-lead reactivation | **54.5** | ~$150–250/mo | 3–6 weeks | Software and registration costs first. TCPA/10DLC consent |
| 6 | AI UGC ads | **50.5** | ~$39–110/mo | 4+ weeks | Needs ad expertise. The demo's fake testimonials are FTC-risky |
| 7 | Unrevealed | n/a | unknown | unknown | Not disclosed |

- **Little or no money:** repurposing.
- **Fastest plausible revenue:** a small, honest photo refresh, or a repurposing pilot.
- **Long-term growth:** repurposing retainers. UGC ads have the highest ceiling, but only for skilled ad makers.
- **Easiest to test free:** repurposing and website makeovers.
- **Avoid or postpone:** dead-lead SMS and fake-testimonial UGC ads.

## 4. Best opportunities

**A. Content repurposing.** Target weekly podcasters and YouTubers who sell something and are missing a channel. Offer a free sample → $150 pilot → $400–600/mo for 4 episodes. You win on voice and accuracy, which DIY tools don't give and "paste into ChatGPT" freelancers skip.
**What could make it fail:**
- generic-sounding output
- targeting creators who don't care about the missing channel
- underpricing that leaves you below minimum wage
- self-serve tools pushing prices down

**B. Website makeovers.** Target local trades with bad mobile sites who show they want customers. The pitch leads with a specific audit of their site plus a spec site. Offer: a $300–600 launch plus a $25–50/mo care plan.
**What could make it fail:**
- wasted spec work
- cold email ignored
- one-off revenue with no care plan
- a crowded market

Full definitions (customer, problem, product, revenue, differentiation, smallest version, validation, assumptions): `research/business_recommendations.md`.

## 5. Prototypes built

### Repurpose Desk: `prototypes/repurpose-desk` (port 3100)

- **What it does:** runs the whole repurposing service. It stores voice profiles per client and imports transcripts (paste or .txt/.srt/.vtt, timestamps kept). It analyses the episode: keywords, strongest moments, 3 clip windows of 15–60s, chapters. It drafts 6 deliverables (newsletter, LinkedIn, X thread, clip plan, show notes, quotes).
- **Automatic QC:** flags numbers not in the transcript, non-verbatim quotes, impossible timestamps, client-banned words, AI clichés, the X 280 and LinkedIn 3,000 character limits, and leftover `[EDIT]` placeholders. Failing drafts can't be approved without a written override.
- **Delivery and business tracking:** client-pack export (HTML/Markdown), prospect pipeline with CSV export, outreach drafts (copy only), per-episode time tracking, a payments log, and a dashboard that keeps **interest** separate from **payment**. A public `/offer` page has an interest form and test-mode "Reserve" buttons.
- **Who uses it:** you, as the service provider.
- **Problem solved:** consistent quality, fewer hours per episode, and a record of what was checked.
- **What actually works (tested):** 17 automated tests pass, covering parsing, analysis, every QC rule, export escaping, both AI adapters (with fakes), the full API workflow, persistence after restart, validation, CSV formula-injection guard and cross-origin write blocking. I also clicked through the full workflow in Chrome: create client → load sample → generate → approval blocked by QC → edit → QC passed → approve → dashboard updated → offer-page form and test checkout recorded. Phone-width (375px) layouts showed no horizontal overflow. The real Anthropic SDK loads, and a call with a deliberately invalid key returned a clean 401 error.
- **What's incomplete:**
  - **No live AI generation was tested** (no API key or local model on this machine).
  - QC is heuristic and can't judge voice.
  - No built-in transcription.
  - Single-user and local only.
  - The offer page needs hosting to be seen by real people.
- **Revenue path:** pilot and monthly fees from creators.

### Site Makeover Kit: `prototypes/site-makeover-kit` (port 3200)

- **What it does:** keeps a prospect pipeline of local businesses. It fetches and audits a live site, with protection against requests to private or internal addresses on every redirect. The audit runs 15 weighted checks (HTTPS, mobile viewport, click-to-call, contact route, CTA, H1, alt text, page weight, stale copyright year, etc.) and produces a score out of 100 plus a printable client report. It extracts the business's details from the page.
- **Spec-site generator:** builds a fast, mobile-first, single-file site. It includes a sticky call bar, LocalBusiness schema and 4 themes, and it **never invents reviews**. Real reviews appear only after you tick a confirmation box.
- **Selling tools:** an outreach email draft built from the audit's top issues with a CAN-SPAM footer, a pricing calculator, and an `/offer` page with test-mode orders.
- **Who uses it:** you, as the freelancer.
- **Problem solved:** specific, credible pitches at speed, and no builder subscription.
- **What actually works (tested):** 45 automated tests pass (rerun by me independently). In Chrome I ran a live audit of https://example.com (score 58, findings accurate), built a sample site from it, saw the template copy correctly labelled "(no AI)", and checked the app and offer page at 375px (no horizontal overflow). The building agent also tested the offer form, the test-mode order, and the redirect handling.
- **What's incomplete:**
  - The audit uses pattern matching, not a real browser. Speed is measured only with a free PageSpeed key.
  - Phone and address extraction covers UK and US formats.
  - AI copy polish was tested only with fakes.
  - Contact forms on generated sites use `mailto:` unless you configure a form endpoint.
- **Revenue path:** launch fees plus care plans.

## 6. Files and access

All files are under `C:\Users\lucas\ai-money-making-lab\`. A ZIP of the whole project (without `node_modules` or local data) is at `C:\Users\lucas\ai-money-making-lab.zip`.

| What | Path |
|---|---|
| This report | `reports\final_report.md` |
| Video notes | `research\video_notes.md` |
| Method deep dives | `research\seven_methods.md` |
| Scorecard | `research\feasibility_scorecard.md` |
| Recommendations | `research\business_recommendations.md` |
| Sources | `research\sources.md` |
| 7-day plans / outreach / tracker | `validation\` |
| Repurpose Desk | `prototypes\repurpose-desk\` (README inside) |
| Site Makeover Kit | `prototypes\site-makeover-kit\` (README inside) |

## 7. First $100 plan (repurposing)

- **Today (2–3 hours):** start Repurpose Desk. Set your name and prices. Pick one niche (e.g. business coaches with podcasts). Log 20 creators who post weekly and are missing a newsletter or LinkedIn.
- **This week:** make 5 excellent free samples (newsletter + LinkedIn) that pass QC and that you'd be proud to sign. Send them as 5 personal messages. Follow up once. Offer anyone positive the $150 pilot (fall back to $100).
- **After the first feedback:** if they like it but don't pay, ask what would make it worth paying for, and adjust the deliverable mix or price. If they pay, deliver within 48h, track your minutes, ask for a testimonial and a referral, then offer the monthly plan. If 15 samples get 0 replies, get an honest critique of 2 samples and switch niche.

## 8. Final recommendation

**Pursue content repurposing first.** It costs nothing to test. It uses a skill (careful editing) you can show off in the free sample itself. Monthly clients add up, and the legal risk is low. The tool already handles delivery, QC and tracking, so your time goes into finding the right 15 creators.

**Next three actions:**
1. Run `cd C:\Users\lucas\ai-money-making-lab\prototypes\repurpose-desk && npm start` and add 20 prospects with the specific gap you saw for each.
2. Make 3 free samples this week that pass QC with zero overrides, and send them personally using `validation/outreach_templates.md`.
3. Log every reply and payment in the app. After 15 samples, apply the continue/change/stop rules in `validation/seven_day_plans.md`.
