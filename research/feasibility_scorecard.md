# Feasibility scorecard

Each category is scored 1–10, where higher is always **more favourable**: cheaper, easier, faster, more demand, less risk. Weighted total = Σ(score × weight) × 10, out of 100.

The scores are **my judgements**, based on the evidence in `seven_methods.md` and `sources.md`. They are not measurements. Re-score after your own 7-day test.

| Category | Weight |
|---|---:|
| Startup cost / affordability | 15% |
| Beginner friendliness | 15% |
| Speed to first paying customer | 15% |
| Evidence of customer demand | 15% |
| Profit potential relative to effort | 15% |
| Ease of building a small working version | 10% |
| Ability to automate/scale with AI | 10% |
| Low operational/legal/platform risk | 5% |

## Scores

| # | Method | Cost | Beginner | Speed | Demand | Profit/effort | Build | Automate | Risk | **Total** |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | Content repurposing | 9 | 8 | 7 | 7 | 7 | 9 | 8 | 8 | **78.0** |
| 4 | Website makeovers | 8 | 6 | 6 | 7 | 6 | 9 | 6 | 7 | **68.0** |
| 6 | Support chatbots | 7 | 7 | 6 | 6 | 5 | 7 | 8 | 4 | **63.5** |
| 1 | Listing photo/video makeovers | 7 | 8 | 7 | 6 | 5 | 6 | 6 | 3 | **63.0** |
| 3 | Dead-lead reactivation | 4 | 4 | 5 | 7 | 7 | 5 | 8 | 2 | **54.5** |
| 5 | AI UGC ads | 5 | 3 | 4 | 7 | 6 | 5 | 7 | 2 | **50.5** |
| 7 | Unrevealed | – | – | – | – | – | – | – | – | **not scorable** |

Arithmetic check for method 2: (9+8+7+7+7)×0.15 + (9+8)×0.10 + 8×0.05 = 5.70 + 1.70 + 0.40 = 7.80 → 78.0.

## Reasons for every score

### Method 2: Content repurposing (78.0)
- **Cost 9**: transcripts can be free (YouTube captions, local Whisper), drafting works offline in Repurpose Desk, and an LLM subscription (~$20/mo) is optional.
- **Beginner 8**: the skill is reading and editing. The video says a few days if you "can tell good writing from boring writing" (08:31).
- **Speed 7**: free sample, then pilot. It still needs a reply from a busy creator (estimate: 1–3 weeks).
- **Demand 7**: paid gigs, agencies ($350–1,200/mo) and ghostwriting bundles exist [5]. Podcast reach is at record highs [11]. Docked because self-serve tools at $19–39/mo set a ceiling on price [5][6].
- **Profit/effort 7**: recurring monthly income. Effort per episode falls as voice profiles mature.
- **Build 9**: a working delivery tool was built and tested in this project.
- **Automate 8**: AI drafts everything. QC partly automated. Final review stays human.
- **Risk 8**: client-owned content with permission. The main risk is misquoting, which QC addresses.

### Method 4: Website makeovers (68.0)
- **Cost 8**: free static hosting. The client pays for the domain.
- **Beginner 6**: you need basic web, domain and DNS skills plus sales emails.
- **Speed 6**: spec work is fast, but owners respond slowly and many don't care.
- **Demand 7**: universal need. Freelancer prices of $500–5,000+ leave room for a cheap offer [7].
- **Profit/effort 6**: one-off unless you sell care plans, and some spec work is wasted.
- **Build 9**: a working audit and site generator was built.
- **Automate 6**: generation is automated, but prospecting and hand-off are manual.
- **Risk 7**: CAN-SPAM compliance for cold email [13]. Otherwise low.

### Method 6: Support chatbots (63.5)
- **Cost 7**: free tiers are tiny (Chatbase: 100 credits, bots deleted after 14 idle days) [16]. Paid plans ~$32–40/mo, often paid by the client.
- **Beginner 7**: no-code tools, set up in an afternoon (24:02).
- **Speed 6**: needs trust before a business lets a bot talk to its customers.
- **Demand 6**: real, but the tools are self-serve, so clients can bypass you.
- **Profit/effort 5**: setup fees are modest, and monthly fees are hard to justify.
- **Build 7**: a demo bot is easy to build.
- **Automate 8**: the bot itself is automation.
- **Risk 4**: the business is liable for wrong answers (*Moffatt v. Air Canada*) [18]. Privacy too.

### Method 1: Listing photo/video makeovers (63.0)
- **Cost 7**: tool ~$15–39/mo [1]. Video credits add up.
- **Beginner 8**: prompt-based editing.
- **Speed 7**: samples are quick, and hosts can decide quickly.
- **Demand 6**: proven demand for editing, but the market prices it very low ($1.60/image enhancement, ~$24 staging) [10].
- **Profit/effort 5**: price pressure from cheap services.
- **Build 6**: not much to build.
- **Automate 6**: editing is automated. Honesty checks and sales are not.
- **Risk 3**: MLS disclosure rules [4], platform bans on misleading AI images [12], photo copyright, and risk of AI videos inventing layouts.

### Method 3: Dead-lead reactivation (54.5)
- **Cost 4**: ~$150–250/mo of software and messaging fees before revenue [3].
- **Beginner 4**: CRM setup, 10DLC registration and AI agent tuning [9].
- **Speed 5**: carrier registration plus trust to get a client's customer list.
- **Demand 7**: businesses do hold unused leads, and pay-on-results is easy to sell.
- **Profit/effort 7**: performance fees can be high if it works.
- **Build 5**: depends on third-party infrastructure.
- **Automate 8**: AI handles conversations.
- **Risk 2**: TCPA consent, 10DLC, state laws, possible health-data rules, billing disputes [9].

### Method 5: AI UGC ads (50.5)
- **Cost 5**: $39–110/mo for tools [14].
- **Beginner 3**: the video's own warning: you need to learn hooks and angles (20:33–20:40).
- **Speed 4**: brands want proof of performance.
- **Demand 7**: brands buy lots of creative.
- **Profit/effort 6**: big potential for experts, low for beginners.
- **Build 5**: no custom software needed.
- **Automate 7**: production is automated.
- **Risk 2**: the FTC fake-testimonial rule [2] applies directly to the format shown. TikTok AI labelling too [15].

### Method 7: Not scorable
The method isn't disclosed. Scoring it would mean making up details.

## Ranking (most to least feasible for a beginner)

1. **Content repurposing, 78.0.** Best overall: cheapest, lowest risk, recurring, and easy to test.
2. **Website makeovers, 68.0.** Strong demand and free to test. More selling effort.
3. **Support chatbots, 63.5.** Easy to demo, but businesses can bypass you, and liability is real.
4. **Listing makeovers, 63.0.** Fast to start, but low prices and rising disclosure rules.
5. **Dead-lead reactivation, 54.5.** Real money potential, but costs and legal complexity come first.
6. **AI UGC ads, 50.5.** Highest ceiling for experts, but the demo format has FTC problems.
7. **Unrevealed method.** Can't be assessed.

| Question | Answer |
|---|---|
| Best with little or no money | **Content repurposing** ($0 possible) |
| Fastest plausible path to revenue | **Listing photo refresh**, if you keep it honest and small. **Content repurposing** is a close second with lower risk. |
| Strongest long-term growth | **Content repurposing** (recurring retainers that grow into an agency). AI UGC ads have the highest ceiling, but only with real ad skill. |
| Easiest to test without spending | **Content repurposing** and **website makeovers** (both $0 with the built tools) |
| Avoid or postpone | **Dead-lead reactivation** (pay-to-play software, TCPA/10DLC consent) and **AI UGC ads as demoed** (fake first-person testimonials). Postpone until you have a proven client base and legal advice. |

Estimates per method (startup cost, time to first customer, 7-day plan, path to $100, failure reasons, continue criteria) are in `seven_methods.md`. The summary table is in `reports/final_report.md`.
