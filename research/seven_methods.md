# The seven methods: deep dive

Each method follows the same structure:
- **The idea** (what the video says, with timestamps)
- **How it actually works**: the real workflow
- **Customers and demand**
- **Competitors and pricing**
- **Costs**
- **Legal and platform risk**
- **AI vs. human work**
- **Do you need an app?**
- **First 7 days**, the **path to $100**, **why it fails**, and **what evidence justifies more investment**

All money and time figures below are **estimates** unless they're cited. Source numbers in [brackets] refer to `sources.md`. Price data from third-party blogs often conflicts; where it does, I give the range and flag it.

### Short answer to "do I need an app for these?"

| # | Method | Need an app? | Why |
|---|---|---|---|
| 1 | Listing photo/video makeovers | **No** | Higgsfield etc. *are* the app. A spreadsheet tracks prospects. What matters is sales and compliant labelling. |
| 2 | Content repurposing | **Yes, a small one helps a lot** | Delivery repeats weekly per client. Voice profiles, fact-checking and approvals save hours and protect quality. **Built: Repurpose Desk.** |
| 3 | Dead-lead reactivation | **No, and don't build one** | SMS has to run through registered, compliant infrastructure (10DLC). HighLevel/Twilio cover it. A home-made texting bot is the riskiest possible shortcut. |
| 4 | Website makeovers | **Partly** | Builders exist. But an **audit tool plus fast spec-site generator** is a sales weapon: a personalised "here's what's broken" report, and a free-hosted site with no builder subscription. **Built: Site Makeover Kit.** |
| 5 | AI UGC ads | **No** | Arcads/Creatify/Higgsfield are the app. The bottleneck is ad-strategy skill and FTC-compliant scripting, which software can't fix. |
| 6 | Support chatbots | **No** | Chatbase/Tidio are the app. The service is setup and *testing*. A spreadsheet of 50 test questions with expected answers is the only extra tool you need. |
| 7 | Unrevealed | **Unknown** | Not disclosed in the video. |

---

## Method 1: AI-enhanced property listing photos and walkthrough videos

**The idea (video, 00:51–04:56).** Find listings with bad photos, improve them with AI (Higgsfield), send before/afters free, and upsell AI "cinematic walkthrough" videos at about $100 per listing. Then move to monthly retainers.

**How it actually works.**
1. Pick one niche. Short-term-rental hosts are a better fit than real estate agents: Airbnb photos are marketing, while sale listings fall under MLS rules (see Risk).
2. Find 30 listings with dark or crooked photos on Airbnb/Booking. Contact hosts through the platform's own messaging, not scraped emails. Zillow's terms prohibit automated scraping [21].
3. **Ask before you edit.** The photos belong to the host or their photographer. Offer: "I can brighten and straighten your 5 darkest photos for free. Want me to?"
4. Edit with an AI tool. Do lighting, straightening, sky and white balance only. Don't add or remove permanent features.
5. Deliver before/after pairs. Upsell a short video tour.

**Customers and demand.** Agents and hosts clearly pay for photo editing. An established market already exists: BoxBrownie lists image enhancement at about **$1.60/image** and virtual staging at **$24–32/image**, and AI editors like Imagen charge **~$0.32/photo** [10]. That's the problem: the market price for *editing* is very low. The $100 figure only holds if the video tour is valued.

**Costs (estimate).** Higgsfield's paid plans are reported at about $15–$39/mo entry level (sources conflict; Ultra is $99/mo) [1]. Video generation uses credits quickly. Minimum realistic outlay is **~$15–40/mo**.

**Legal and platform risk: high.**
- MLS/state rules are tightening. California's CRMLS requires the **original image alongside** any digitally enhanced one plus a disclosure. Wisconsin Act 69 requires disclosure of materially altered images. NorthstarMLS has proposed similar rules. Florida Realtors advises labelling all virtually staged images [4].
- Airbnb reportedly asks hosts to remove AI-edited content that hides flaws or adds non-existent features. Booking.com and Expedia have similar rules [12].
- An AI "walkthrough video" generated from still photos can **invent a layout that doesn't exist**. That is misrepresentation risk for your client, and therefore for you.
- Cold-contacting agents by email must follow CAN-SPAM [13].

**AI vs. human.** AI does the editing and video generation. A human has to choose which edits stay honest, label outputs ("virtually enhanced"), and check every frame of the video for invented features.

**Do you need an app?** No. A checklist ("no structural changes; label every enhanced image; keep originals") does more for this business than any software.

**First 7 days.** Find 30 listings with weak photos. Message 15 hosts offering a free 5-photo fix. Deliver 3–5 samples. Ask for a testimonial and a referral.
**Path to $100.** Sell 2–3 photo-refresh packages at ~$40–50 to hosts (an estimate, priced against BoxBrownie's low per-image anchor).
**Why it fails.** Cheap competitors set the price, platform/MLS rules limit what you can change, and AI videos misrepresent the space.
**Continue if:** 3+ paying hosts out of the first 30 contacted, and no complaints about accuracy.

---

## Method 2: Repurposing creators' long-form content ✅ selected

**The idea (05:00–09:52).** Turn a creator's podcast or YouTube episode into a newsletter, X post, LinkedIn post and short-form scripts in *their* voice, using a dedicated Claude Project per client. Win clients with a free sample. Charge monthly by volume ("a few hundred to a couple of $1,000 per client"). Quality control is what they pay for.

**How it actually works.**
1. Find creators publishing weekly long-form content who are missing a channel (podcast but no newsletter, YouTube but no LinkedIn).
2. Pull one recent episode's transcript. YouTube auto-captions are free, or run Whisper locally.
3. Build a voice profile from their own posts. Draft every format. **Fact-check every number, quote and timestamp.** Edit for voice.
4. Send the free sample with one short, personal message.
5. Convert to a paid pilot (one episode), then to a monthly plan (e.g. 4 episodes).

**Customers and demand: evidence of real spending.**
- Podcast consumption is at a record: 58% of Americans 12+ consumed a podcast in the last month (Edison Infinite Dial 2026, via secondary coverage) [11]. Listen Notes indexes 3.7M+ podcasts, though many are inactive [11].
- People already sell this service: Fiverr has monthly "podcast content partner" repurposing gigs [5]. Podcast production agencies sell $350–$1,200/mo packages [5]. A newsletter/LinkedIn ghostwriting bundle sells at $2,497/mo [5].
- Self-serve tools exist and are cheap: **Castmagic from ~$39/mo** [6], CastNova ~$19/mo [5]. Your price must be justified by *voice and accuracy*, not by "AI can do it", because the creator can buy that for $39.

**Competitors.** Self-serve AI tools (Castmagic, Opus Clip, Descript), freelancers on Fiverr/Upwork, and podcast agencies. The gap is creators too busy to run tools and edit output, who want done-for-you work that sounds like them.

**Costs (estimate).** **$0** to start: free transcripts, and Repurpose Desk's template mode works offline. A Claude Pro/API or other LLM subscription (~$20/mo) speeds drafting but is optional at first.

**Legal and platform risk: low.** You work on the client's own content with their permission. Main risks: misquoting the client (QC addresses this) and posting AI-written content under their name without approval. Always get sign-off.

**AI vs. human.** AI drafts formats and finds strong moments. A human checks facts and quotes, matches the voice, judges what's interesting, and handles the relationship.

**Do you need an app?** **Yes, a small one, and it's built.** The video's method (a Claude Project per client) covers drafting only. It has no fact-check, approval trail, time tracking, pipeline or client pack. Those are exactly the parts that decide whether a $300–600/mo client stays and whether your hourly rate is worth it. **Repurpose Desk** adds:
- voice profiles
- grounded drafts
- automatic QC (invented numbers or quotes, bad timestamps, banned words, platform limits)
- approve/override
- export
- prospect pipeline
- time and revenue tracking

**First 7 days.** List 20 creators → pick 5 → make 3 excellent free samples → send 3 personal messages → follow up once. See `validation/seven_day_plans.md`.
**Path to $100.** One paid pilot at $100–150 for a full pack of one episode (estimate).
**Why it fails.** Generic output ("sounds like AI"), no replies because samples are sent to creators who don't care about the missing channel, or underpricing into an hourly rate below minimum wage.
**Continue if:** ≥3 replies from 15 personal samples, ≥1 paid pilot, and delivery time ≤2 hours per episode by episode 3.

---

## Method 3: Dead-lead reactivation

**The idea (09:55–13:44).** Load a business's old leads into HighLevel. Use AI to text them and handle replies with Conversation AI. Charge $50 to a few hundred dollars per booked and attended appointment.

**How it actually works.** You need:
- a client willing to hand over customer data
- a HighLevel (or similar) account
- **A2P 10DLC brand and campaign registration**, without which US carriers block traffic (since Feb 2025, per secondary sources) [9]
- documented consent for each contact
- an AI agent configured with accurate prices and services
- appointment tracking good enough to bill per show

**Customers and demand.** Many local service businesses do sit on old leads, and agencies sell this service (the video acknowledges competition). This is strong demand in principle, but trust is a big barrier: a stranger asks for the customer list.

**Costs (estimate).** HighLevel Starter **$97/mo** plus an AI Employee add-on (~$50–97/mo) or per-message pricing, plus SMS/phone fees and registration fees [3]. Realistically **~$150–250/mo** before your first client pays.

**Legal and platform risk: highest of the seven.**
- **TCPA**: automated marketing texts generally need prior express written consent. An old inquiry may not cover it [9].
- **10DLC**: brand and campaign registration, opt-in documentation and STOP/HELP handling are required [9].
- State "mini-TCPA" laws (e.g. Florida) add stricter rules [9].
- **Health data**: the video's examples are dentists and med spas. Patient contact lists may be protected health information under HIPAA, which would require a business associate agreement *(my interpretation; not verified for any specific case, so get professional advice)*.
- Pay-per-show billing invites disputes about attribution.

**AI vs. human.** AI writes messages and handles routine replies. A human checks consent, handles complaints and escalations, checks prices, and reconciles bookings for billing.

**Do you need an app?** **No, and don't build one.** Compliance has to run through registered infrastructure. The useful tools are a **consent-audit checklist** and an **ROI calculator** for the pitch ("500 old leads × 2% booked × $X = …").

**First 7 days.** Learn HighLevel on a trial. Write a compliant campaign. Pitch 10 local businesses that have their own opt-in lists (e.g. existing patients who opted into texts).
**Path to $100.** One client, 1–2 shows at $50–100 each (video's range). This depends on carrier registration, which can take days to weeks.
**Why it fails.** Running costs come before revenue, registration delays, consent problems, distrust from businesses, and attribution disputes.
**Continue if:** a client provides a consented list *and* your first campaign books shows at a cost per show well under your fee.

---

## Method 4: Website makeovers for local businesses ✅ selected (second)

**The idea (13:46–17:46).** Find local businesses with bad websites on Google Maps. Build a better site with an AI builder. Email it as a free sample. Charge "a few hundred to a couple thousand" plus monthly care.

**How it actually works.**
1. Search one trade in one town.
2. Audit each site: mobile, HTTPS, click-to-call, clear services, speed.
3. Build a spec one-page site with their real details.
4. Send a short, honest email that names the problems you found.
5. Charge to launch on their domain, then offer monthly hosting and edits.

**Customers and demand.** Strong and ongoing. Freelancer site prices range from **$500–$5,000** (beginner to mid) up to $10k, and redesigns cost about as much as new builds [7]. A beginner charging $300–800 is clearly below market, which helps conversion. Many tradespeople get work from referrals and don't care about their site, so qualify by whether they run Google Ads or post a lot online.

**Competitors.** Crowded: agencies, freelancers, AI builders (Durable from ~$12–15/mo; its free plan only offers a subdomain) [8], Wix and Squarespace. Stand out by focusing on calls and bookings, not looks (the video's own advice).

**Costs (estimate).** **$0** with static hosting (Netlify, Cloudflare Pages, GitHub Pages free tiers). Domain ~$10–20/yr, usually paid by the client. An AI builder subscription is optional.

**Legal and platform risk: low-to-medium.** Cold email must follow CAN-SPAM: accurate sender, physical address, working opt-out, honour opt-outs within 10 business days [13]. Use their real reviews and photos only with permission. Never invent testimonials (FTC rule [2]). A spec site should not be public or indexed before they agree.

**AI vs. human.** AI or templates handle layout and copy drafts. A human picks *which* businesses to approach, checks facts (hours, services, licence numbers), writes a credible outreach message, and handles domain and DNS hand-off.

**Do you need an app?** **Partly, and it's built.** **Site Makeover Kit** fetches and audits a prospect's site, writes a client-friendly audit report (the honest hook for your email), generates a fast mobile-first one-page site from their real details, drafts the outreach email with the CAN-SPAM footer, and tracks the pipeline. It saves the builder subscription, and it makes each pitch specific instead of generic.

**First 7 days.** Audit 30 sites in one trade → build 5 spec sites → send 5–10 personalised emails → follow up once.
**Path to $100.** One $150–300 "launch" sale, or a $100 tune-up of an existing site (e.g. adding click-to-call and fixing mobile issues).
**Why it fails.** Spec work wasted on owners who don't care, generic emails that get ignored, and one-off revenue with no care plan.
**Continue if:** ≥1 sale from the first 20 emails, or ≥3 "tell me more" replies.

---

## Method 5: AI-generated UGC-style ads

**The idea (17:48–21:21).** Use an AI ad tool to produce UGC-style videos with AI avatars holding the brand's product, then sell ad packages or retainers to brands. Gadzhi warns it's crowded and needs real ad skill.

**Customers and demand.** Brands do buy lots of ad creative (the video's $100–600 per video applies to *real* creators). But the tools are self-serve and cheap: Creatify **$39–99/mo**, Arcads **~$110/mo for ~10 videos** (≈ $11/video) [14]. Brands can make these themselves, so you need strategy to be worth paying.

**Costs (estimate).** $39–110/mo for tools before any client.

**Legal and platform risk: high.**
- The FTC's final rule on fake reviews and testimonials (in force since Oct 2024) bans **testimonials from people who don't exist or who misrepresent their experience**, explicitly including AI-generated ones, with civil penalties [2]. The video's demo script, an AI avatar saying "everyone kept asking me… I've had so many compliments", is a first-person consumer testimonial from a non-existent person. **Avoid this format.** Use clearly fictional or brand-voiced scripts instead ("Here's what [brand] does…").
- TikTok requires disclosure labels on realistic AI-generated ad content, with detection via C2PA [15].
- Product claims (cosmetics, supplements) must be substantiated by the brand.

**AI vs. human.** AI handles avatars, voice and edits. A human handles strategy (hooks, angles, offers), compliance review and performance analysis.

**Do you need an app?** No. The ad platforms are the app. Building a generator is pointless.

**First 7 days.** Study 50 winning ads in one product category. Make 5 compliant spec ads for a small brand. Pitch 10 brands.
**Path to $100.** Sell a 3-ad test pack for ~$100–150 to a small e-commerce brand (estimate). This is hard without proven results.
**Why it fails.** No ad expertise, crowded market, brands doing it themselves, and compliance issues with fake testimonials.
**Continue if:** a client's ad *performs* (they rerun or scale it), not just "they liked it".

---

## Method 6: AI customer-support chatbots for businesses

**The idea (21:23–24:42).** Set up Chatbase or Tidio for a business. Train it on their website, FAQs and policies. Write guardrails, test thoroughly, and charge a setup fee plus a monthly fee (no figures given).

**Customers and demand.** Moderate. Many small businesses want fewer repeat questions, but the tools are designed for self-serve. Your value is setup and testing, and the business can skip you.

**Costs (estimate).** Chatbase free plan: 100 message credits, and it **deletes bots after 14 days of inactivity**. Paid plans start at ~$32–40/mo (sources conflict) [16]. Tidio's Lyro AI from ~$39/mo [17]. The client typically pays for the subscription.

**Legal and platform risk: medium.** Businesses are liable for what their bot says. In *Moffatt v. Air Canada* (2024), a tribunal held the airline liable for its chatbot's wrong refund information [18]. The video agrees: "the blame lands on you" (24:34–24:38). You also handle customer conversations, so privacy matters.

**AI vs. human.** AI answers routine questions. A human curates the knowledge base, writes guardrails, runs a 50-question test set, sets up escalation, and does monthly reviews.

**Do you need an app?** No. A **test-question spreadsheet** (question, expected answer, bot answer, pass/fail) is the differentiator, and it's also your sales demo.

**First 7 days.** Build a free demo bot on one local business's public FAQ (don't deploy it on their site). Record a 60-second screen video of it answering correctly *and* handing off when unsure. Show it to 10 businesses with lots of FAQs (e.g. dog groomers, letting agents).
**Path to $100.** One $100–200 setup fee (estimate).
**Why it fails.** Businesses buy the tool directly, bots give wrong answers, and the monthly fee seems unjustified once it's set up.
**Continue if:** 1 paying setup plus a client willing to pay monthly for tuning after seeing real transcripts.

---

## Method 7: Unrevealed "S tier"

The video doesn't say what this is (24:46–26:24). It promotes a free 5-day "AI Income Challenge" (Nov 7) instead. No workflow, cost or evidence was given, so it **can't be scored**. My recommendation: if you want to learn it, attend the free event, but don't buy any upsell until you can see the method's evidence for yourself. Judge it with the same scorecard.
