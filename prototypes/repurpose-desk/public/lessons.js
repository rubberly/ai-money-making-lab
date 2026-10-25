// Course content for Repurpose Desk. Prices match the defaults in Money & pricing; change them there.

export const TITLE = 'Start here: your first $150 from content repurposing';
export const INTRO = 'Eight short lessons, in order. Each one explains why it matters, tells you exactly what to do, and has a button that takes you to the right screen. Tick a lesson off when you’ve done it.';

export const LESSONS = [
  {
    id: 'business',
    title: 'How this business works',
    time: '5 min',
    why: 'Creators already do the hardest part: they record a long podcast or video every week. Most of them never turn it into newsletters, LinkedIn posts or short clips, because that takes hours. You do that work for them, in their voice, and you check every fact. That is what they pay for.',
    steps: [
      'Open your offer page and read it like a customer would. It is the page you can send people.',
      'Notice the three steps: a free sample (to earn trust), a $150 pilot (one episode), then a monthly plan (4 episodes).',
      'Remember who pays: the creator. Why they pay you instead of a $39 AI tool: your posts sound like them, nothing is made up, and they don’t have to do anything.',
    ],
    check: {
      q: 'A creator says: “I could just do this with ChatGPT.” What’s an honest answer?',
      a: '“You could. What I add is setting it up to sound like you, checking every fact against the episode, and doing it every week so you don’t have to. The free sample lets you judge if that’s worth it.”',
    },
    actions: [{ label: 'Open my offer page', action: 'url:/offer' }],
  },
  {
    id: 'practice',
    title: 'Practice round with a sample episode',
    time: '10 min',
    why: 'Learn the tool on made-up data first, so your first real sample isn’t also your first time using the app. The practice creates a SAMPLE client (Dana) and a SAMPLE episode about pricing a bakery stall.',
    steps: [
      'Click “Start practice round”. It opens the sample episode.',
      'Click “Generate all 6”. Each draft gets a quality check (QC).',
      'Open the LinkedIn post. QC says “must fix” because of the [EDIT] lines. Replace each [EDIT] line with your own sentence.',
      'Click “Save & re-check” until it says “QC passed”, then click “Approve”.',
      'Click “Download pack (HTML)” to see what a client would receive.',
    ],
    check: {
      q: 'QC says “Numbers not found in the transcript: 300%”. What do you do?',
      a: 'Remove it, or replace it with the real number from the episode. Never send a number the creator didn’t say. Made-up facts are the fastest way to lose a client.',
    },
    actions: [{ label: 'Start practice round', action: 'practice' }],
  },
  {
    id: 'niche',
    title: 'Pick one niche',
    time: '20 min',
    why: 'Pick one kind of creator to focus on. Your samples get better because you learn one audience, and creators in the same niche recommend each other.',
    steps: [
      'Pick creators who post a long show every week, sell something (coaching, consulting, a product or a service), and are missing one channel (no newsletter, a quiet LinkedIn, no clips).',
      'Good first niches: business coaches with podcasts, real-estate agents with YouTube channels, fitness or nutrition coaches with weekly shows, local experts (accountants, lawyers) who make videos.',
      'Write your niche in one sentence, e.g. “Business coaches with a weekly podcast and no newsletter.”',
    ],
    example: {
      title: 'Good vs weak first target',
      good: 'A solo coach with a weekly podcast (3k listeners) who sells a $2,000 program and has no newsletter.',
      bad: 'A famous comedy podcast with a full production team. They already have people for this and won’t answer a stranger.',
    },
    check: {
      q: 'Why does it matter that the creator sells something?',
      a: 'Because more reach makes them money. A hobby creator has no budget, so they may love your sample and still never pay.',
    },
  },
  {
    id: 'prospects',
    title: 'Find 20 prospects',
    time: '45 min',
    why: 'You need a list before you make anything. Most people won’t reply, so you need more names than you think. Write down each person’s gap: it becomes your first sentence and tells you which sample to make.',
    steps: [
      'Search Apple Podcasts or Spotify in your niche’s category. Look past the top 10, where the solo creators are.',
      'On YouTube, search your niche plus “podcast” and filter by Upload date: This month.',
      'For each creator, check they posted in the last 2 weeks. Check whether they have a newsletter and when they last posted on LinkedIn.',
      'Add each one in Prospects with the gap in one sentence and their public contact route (website form, listed email).',
      'Only use contact details they publish themselves. No scraping, no bought lists.',
    ],
    example: {
      title: 'Writing the gap',
      good: 'Weekly podcast for 2 years (90 episodes). No newsletter. LinkedIn last post 5 months ago.',
      bad: 'Seems cool, maybe needs help.',
    },
    check: {
      q: 'You found 20 creators but 6 haven’t posted in 2 months. Keep them?',
      a: 'No. Mark them lost or skip them. Inactive creators don’t need content help. They need motivation, and you can’t sell that.',
    },
    actions: [{ label: 'Open Prospects', action: '#/prospects' }],
  },
  {
    id: 'sample',
    title: 'Make your first real free sample',
    time: '60–90 min',
    why: 'The free sample does the selling for you. One excellent sample beats five average ones. Take your time on this.',
    steps: [
      'Pick the best fit from your 20.',
      'Get a transcript. On YouTube, open the video, click “…more” under it, then “Show transcript”, and copy it. Many podcasts also publish transcripts on their website.',
      'In Clients, add them with status “pilot”. Paste 3–5 of their own posts or show descriptions into “Samples of their own writing”, so drafts copy their style.',
      'In Episodes, create the episode, paste the transcript and click “Generate all”.',
      'Focus on the newsletter and the LinkedIn post. Clear every QC flag, rewrite every [EDIT] line, then read it out loud. If it doesn’t sound like them, change it.',
      'Click “Download pack (HTML)”. That file is your sample.',
    ],
    tip: 'QC catches wrong facts, not boring writing. Your job is to make it interesting.',
    check: {
      q: 'QC says “passed”. Is the sample ready to send?',
      a: 'Not yet. Read it out loud and ask: “Would this person actually post this?” If any line sounds generic, rewrite it with something specific from the episode.',
    },
    actions: [{ label: 'Open Clients', action: '#/clients' }, { label: 'Open Episodes', action: '#/jobs' }],
  },
  {
    id: 'send',
    title: 'Send it the right way',
    time: '15 min per person',
    why: 'A personal message with a real sample gets replies. A copy-pasted pitch gets ignored. Send to one person at a time, and be polite and easy to say no to.',
    steps: [
      'In Prospects, click “Draft message” on the person.',
      'Change the first line to something specific from their episode, including the timestamp.',
      'Upload your sample file to Google Drive (or similar), set it to “anyone with the link can view”, and paste the link into the message.',
      'Send it yourself through their public contact route. This app never sends anything.',
      'Set their stage to “Free sample sent”.',
      'If there’s no reply after 4–5 days, send one short follow-up. Then stop.',
    ],
    example: {
      title: 'First line',
      good: 'I listened to “Pricing your first stall”. The bit at 1:24 about pricing being a decision, not a number to copy, really stuck with me.',
      bad: 'Hi! I help creators grow with AI-powered content solutions. Would you like to hop on a call?',
    },
    check: {
      q: 'No reply after your follow-up. What now?',
      a: 'Move on and mark them “Not now / lost”. Silence is normal. If 1 in 5 people reply, you’re doing well.',
    },
    actions: [{ label: 'Open Prospects', action: '#/prospects' }],
  },
  {
    id: 'pilot',
    title: 'Turn a yes into $150',
    time: '15 min',
    why: 'Interest isn’t money. “This is great!” feels good, but your business only starts when someone pays. Make the next step small and specific.',
    steps: [
      'When someone replies positively, offer the pilot: “Want me to do your next episode? Full pack, back within 48 hours, $150.” If they hesitate, $100 is fine for a first client.',
      'Get paid before you deliver. Send a PayPal or Stripe payment link that you create in your own account. This app never takes payments.',
      'When the money arrives, log it in Money & pricing. That is your first real revenue.',
      'Set the prospect’s stage to “Paid pilot”.',
    ],
    example: {
      title: 'Replying to “Sounds great, I’ll think about it”',
      good: 'Totally fair. If it helps, I can do your next episode as a one-off: full pack within 48 hours for $150, no commitment after that. Want me to?',
      bad: 'Great!! Let me know!!',
    },
    check: {
      q: 'Someone says “I love it, let’s talk next month.” Do you count them as a customer?',
      a: 'No. Count them as interest. Only money received counts as a customer. Put a reminder in your notes and keep finding others.',
    },
    actions: [{ label: 'Open Money & pricing', action: '#/money' }],
  },
  {
    id: 'deliver',
    title: 'Deliver, keep them, and decide',
    time: 'ongoing',
    why: 'The money is in clients who stay every month. Deliver fast, track your time so you know whether the price works, and use clear numbers to decide whether to continue.',
    steps: [
      'Deliver within 48 hours. Use the timer on the episode page (+10m, +30m) to log your minutes honestly.',
      'After delivery, ask for one sentence they’re happy for you to quote, and whether they know one other creator who’d want this.',
      'Offer the monthly plan: 4 episodes for $600.',
      'Every week, look at the Dashboard, especially “Effective hourly rate”.',
      'After 15 samples: if you have 1 or more paid pilots, keep going and raise prices. If you have replies but no money, change niche or offer. After 30 samples with 0 sales (and one change), stop and try website makeovers instead.',
    ],
    check: {
      q: 'Your $150 pilot took 6 hours. Is that OK?',
      a: 'That’s $25 an hour, which is fine for a first one. By your third episode for the same client, aim for under 2 hours. If you can’t, raise the price.',
    },
    actions: [{ label: 'Open Dashboard', action: '#/' }],
  },
];

export const GLOSSARY = [
  ['Free sample', 'Real work you make for free so a stranger can see your quality before paying.'],
  ['Pilot', 'A small first paid job (one episode) that lets a client try you with little risk.'],
  ['Monthly plan / retainer', 'A client paying every month for a set amount of work. This is the goal.'],
  ['Prospect', 'Someone who might become a client. Not a client yet.'],
  ['Pipeline', 'Your list of prospects and the stage each one is at.'],
  ['Transcript', 'The written text of everything said in an episode, often with timestamps.'],
  ['Voice profile', 'Notes on how a client talks and writes, so drafts sound like them.'],
  ['QC (quality check)', 'Automatic checks for made-up numbers, fake quotes, wrong timestamps, banned words and length limits.'],
  ['[EDIT] / [CHECK]', 'Gaps the draft left for you to fill in or verify. A draft can’t be approved while they remain.'],
  ['CTA (call to action)', 'The one thing you ask readers to do at the end, e.g. “Listen to the full episode”.'],
  ['Reply rate', 'Replies divided by people contacted. Around 1 in 5 is good for personal messages.'],
  ['Effective hourly rate', 'Money earned divided by hours worked. Tells you whether your price is right.'],
  ['Test mode', 'The offer page’s “Reserve” buttons only record interest. No payment is ever taken.'],
];

export const TIPS = {
  dashboard: [
    'This page shows how the business is doing this month.',
    'Left box = interest (replies, form fills). Right box = payment (real money). Only the right box proves the business works.',
    '“Suggested next actions” tells you what to do today.',
  ],
  jobs: [
    'An episode is one piece of a client’s long content (a podcast or video).',
    'To start: pick the client, paste the transcript (or load a .txt/.srt/.vtt file), then click Create episode.',
    'New here? Click “Load SAMPLE transcript” to practise.',
  ],
  job: [
    'Click “Generate all” to draft 6 pieces from this episode.',
    'Each draft gets a QC box. Red = must fix, yellow = check, green = passed.',
    'Edit the text, click “Save & re-check”, then “Approve”. Only approved pieces go in the downloaded pack.',
    'Use the +10m / +30m buttons to log your time. This is how you’ll know if your price works.',
  ],
  clients: [
    'A client is a creator you’re making content for, including free-sample people (set status to “pilot”).',
    'The voice profile matters most: tone, audience, banned words, and 3–5 samples of their own writing.',
  ],
  prospects: [
    'Add people you might work with. Write the specific gap you noticed for each one.',
    'Change the stage as things happen: Free sample sent, then Replied, then Paid pilot.',
    '“Draft message” writes a starting message for you to personalise and send yourself.',
  ],
  leads: [
    'People who filled in the form on your public offer page show up here.',
    '“Test-mode checkout clicks” are people who clicked Reserve. That’s strong interest, but no money was taken.',
  ],
  money: [
    'Set your name and prices here. They also appear on your offer page.',
    'Log a payment only when real money arrives. The calculator shows if your price beats your target hourly rate.',
    'Download a backup now and then, because online (free hosting) data can reset.',
  ],
};
