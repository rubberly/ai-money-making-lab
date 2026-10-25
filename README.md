# AI Money-Making Research and Prototype Lab

Research on Mark Tilbury's video **"7 Proven Ways to Make Money With AI (No Experience)"** (with Iman Gadzhi, published 2026-10-24), a weighted feasibility ranking of all seven methods, and two working, tested prototypes for the strongest opportunities.

**Start here:** `reports/final_report.md`

```
ai-money-making-lab/
├── README.md
├── research/
│   ├── video_notes.md               every method with timestamps; said vs. interpreted
│   ├── seven_methods.md             deep dive per method, incl. "do you need an app?"
│   ├── feasibility_scorecard.md     weighted scores with a reason for every score
│   ├── business_recommendations.md  why these two were built; customer, offer, assumptions
│   └── sources.md                   all links, with reliability notes
├── prototypes/
│   ├── repurpose-desk/              Method 2: content-repurposing service delivery app (port 3100)
│   └── site-makeover-kit/           Method 4: website audit + spec-site builder (port 3200)
├── validation/
│   ├── seven_day_plans.md           day-by-day plans, milestones, continue/change/stop rules
│   ├── outreach_templates.md        first message, follow-up, pilot offer, research questions
│   └── experiment_tracker.csv       interest vs. payment metrics
└── reports/
    └── final_report.md
```

## Live on Render (free plan)

| App | Workspace (password) | Public offer page |
|---|---|---|
| Repurpose Desk | https://repurpose-desk-flux.onrender.com | https://repurpose-desk-flux.onrender.com/offer |
| Site Makeover Kit | https://site-makeover-kit.onrender.com | https://site-makeover-kit.onrender.com/offer |

- **Password:** Render dashboard → service → *Environment* → `APP_PASSWORD` (any username).
- **Deploys:** pushing to `main` redeploys both apps (Blueprint `ai-money-making-lab`).
- **Free plan limits:** apps sleep when idle (first load can take ~1 min) and **saved data is wiped on every restart or redeploy**. Download backups, or add a paid persistent disk, before relying on the hosted copies.

## Run the prototypes (Node.js 20+, no install needed)

```bash
cd prototypes/repurpose-desk     && npm start   # http://localhost:3100   (offer page: /offer)
cd prototypes/site-makeover-kit  && npm start   # http://127.0.0.1:3200   (offer page: /offer)
npm test                                         # in either folder
```

Both run fully offline with clearly labelled template (non-AI) output. Optional AI: Claude via `ANTHROPIC_API_KEY` + `npm install`, or a free local model (Ollama) via `.env`. See each prototype's README.

Nothing in this project sends messages, publishes content, or takes payments. Checkout buttons are test mode only.
