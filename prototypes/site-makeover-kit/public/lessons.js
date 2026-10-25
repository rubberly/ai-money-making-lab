// Course content for Site Makeover Kit. Prices match the default tiers; change them in Settings.

export const TITLE = 'Start here: your first paid website makeover';
export const INTRO = 'Seven short lessons, in order. Each one explains why it matters, tells you exactly what to do, and has a button that takes you to the right screen. Tick a lesson off when you’ve done it.';

export const LESSONS = [
  {
    id: 'business',
    title: 'How this business works',
    time: '5 min',
    why: 'Lots of local businesses (gardeners, plumbers, cleaners) have websites that are slow, old, or impossible to use on a phone. Most customers search on their phone, so a bad site loses calls. You show the owner the problem with a free audit, show the fix with a free sample site, then charge to put it live and look after it.',
    steps: [
      'Open your offer page. It’s what an owner sees if you send them the link.',
      'Learn the price ladder: a $300–600 launch fee for a one-page site on their own domain, then $25–50 a month to host it and make small changes.',
      'Remember what you really sell: more phone calls and bookings. Not “a nicer website”.',
    ],
    check: {
      q: 'An owner says: “My nephew made my site, it’s fine.” What’s a good reply?',
      a: '“That’s great. One thing I noticed: on a phone, your number isn’t tappable, so people have to copy it by hand. That’s an easy fix if you ever want it.” Point to one real problem, don’t argue, and leave the door open.',
    },
    actions: [{ label: 'Open my offer page', action: 'url:/offer' }],
  },
  {
    id: 'practice',
    title: 'Practice round with a sample old website',
    time: '10 min',
    why: 'Try the whole flow on a made-up business first. The practice creates a SAMPLE prospect (Bob’s Gardens) and audits a deliberately old-fashioned SAMPLE web page.',
    steps: [
      'Click “Start practice round”. It runs the audit and shows the score.',
      'Read “Fix these first”. These are the problems you’ll mention to an owner, in plain words.',
      'Click “Build a sample site from this”. Check the details it found (name, phone, services), choose a colour theme and click Generate.',
      'Switch the preview to “Mobile (375px)”. This is the moment owners say “oh, that’s better”.',
      'Open “Outreach draft” and pick Bob’s Gardens to see the email it writes.',
    ],
    check: {
      q: 'The audit scores 30 and the top problem is “no tap-to-call”. What goes in your email?',
      a: 'That one problem, in plain words (“on a phone, customers can’t tap your number to call you”), plus a screenshot of your sample. One clear problem beats a list of ten.',
    },
    actions: [{ label: 'Start practice round', action: 'practice' }],
  },
  {
    id: 'trade',
    title: 'Pick one trade in one area',
    time: '15 min',
    why: 'Focus makes you faster and more believable. After five gardener sites you’ll know exactly what gardeners need, and you can say so.',
    steps: [
      'Pick a trade where customers call in a hurry or compare options on their phone: plumbers, electricians, roofers, locksmiths, cleaners, gardeners, dog groomers.',
      'Pick your town or county. Local is easier to trust, and you might meet them.',
      'Skip franchises and big chains. Head office controls their website.',
    ],
    example: {
      title: 'Good vs weak target',
      good: 'A family-run roofer with 4.8★ from 120 Google reviews and a website that shows desktop layout on phones.',
      bad: 'A national plumbing chain’s local branch. They can’t change their own website.',
    },
    check: {
      q: 'Why do good reviews matter if you’re selling a website?',
      a: 'Good reviews mean a real, busy business that can afford you and will get more calls from a better site. It also means you can say: “Your reviews are great, your website doesn’t show that.”',
    },
  },
  {
    id: 'find',
    title: 'Find and audit 30 businesses',
    time: '60 min',
    why: 'Most owners won’t reply, so you need a decent list. The audit tells you who needs help most, and gives you something specific to say.',
    steps: [
      'Search Google Maps for “[trade] in [town]”, e.g. “roofers in Maidstone”.',
      'Open each business’s website on your phone first. If it’s painful to use, that’s a prospect.',
      'In Prospects, add the business (name, trade, town, website, public phone).',
      'In Audit, pick the prospect and click Run audit. Note the score.',
      'Skip businesses with no website for now. That’s a different, bigger sale.',
    ],
    check: {
      q: 'A business has 4.9★, 200 reviews and an audit score of 32. Good prospect?',
      a: 'Yes. Great business, bad website: exactly who you can help most. Put them near the top of your list.',
    },
    actions: [{ label: 'Open Prospects', action: '#pipeline' }, { label: 'Open Audit', action: '#audit' }],
  },
  {
    id: 'build',
    title: 'Build 5 sample sites',
    time: '60–90 min',
    why: 'Showing beats telling. An owner who sees their own business looking good on a phone understands the value in seconds.',
    steps: [
      'Pick the 5 best prospects: good business, low score.',
      'From each audit, click “Build a sample site from this”. Check every detail against their real site and Google listing: phone, hours, services, area.',
      'Never make up reviews or claims. Only use reviews they’ve published themselves, and tick the box to confirm.',
      'Look at the mobile preview, then download the file.',
      'Keep samples private. Send a screenshot, not a public link, until they say yes.',
    ],
    tip: 'Spend your effort on the top of the page: their name, what they do, where, and a big “Call” button. That’s what gets calls.',
    check: {
      q: 'Their old site says “Est. 1998”, but you can’t confirm it anywhere else. Include it?',
      a: 'Only if it’s on their own site or listing, and then it’s fine to keep. If you’re not sure about something, leave it out and ask them on the call.',
    },
    actions: [{ label: 'Open Build sample', action: '#build' }],
  },
  {
    id: 'email',
    title: 'Send the email the right way',
    time: '10 min per business',
    why: 'Short, specific and honest emails get replies. Emailing businesses is allowed, but the law (CAN-SPAM in the US) requires your real name, a postal address and an easy way to opt out.',
    steps: [
      'Fill in your name and postal address in Settings, so every draft has the legal footer.',
      'In Outreach draft, pick the prospect. The email uses their top two audit problems.',
      'Add a screenshot of your sample on a phone.',
      'Send it yourself from your email account, one business at a time. This app never sends anything.',
      'Set their stage to “Emailed”. If there’s no reply, follow up once after 4–5 days, then stop.',
    ],
    example: {
      title: 'Opening line',
      good: 'I was looking for a roofer in Maidstone and found you. Great reviews. On my phone, your number isn’t tappable and the text is tiny, so I mocked up a fix (screenshot below).',
      bad: 'Dear Sir/Madam, we are a leading digital agency offering cutting-edge web solutions to grow your business.',
    },
    check: {
      q: 'An owner replies “Not interested, please don’t email again.” What do you do?',
      a: 'Thank them in one line, mark them “Not interested”, and never contact them again. Honouring opt-outs is the law, and it’s also just decent.',
    },
    actions: [{ label: 'Open Settings', action: '#settings' }, { label: 'Open Outreach draft', action: '#outreach' }],
  },
  {
    id: 'close',
    title: 'Close the sale, go live, decide',
    time: 'ongoing',
    why: 'A “yes” only counts once you’re paid, and the steady money is the monthly care plan. Have a simple plan for taking payment and putting the site live.',
    steps: [
      'Offer two options: a full launch ($300–600) or a $100 quick fix (tap-to-call and mobile tweaks on their current site).',
      'Take payment first, or a 50% deposit, through your own PayPal or Stripe payment link. This app never takes payments.',
      'Put the site live for free: on Netlify Drop (app.netlify.com/drop), drag in the downloaded index.html. Then connect their domain using their domain provider’s “invite a user” or DNS settings. Never ask them to email you a password.',
      'Offer the care plan ($25–50/month) for hosting checks and small edits. Record payments in Leads & orders and on the prospect.',
      'After 20 emails: if you have 1 or more sales, keep going and add a care plan to every sale. If you have replies but no sales, lead with the $100 quick fix or try another trade. After 40 emails with 0 sales, stop and try content repurposing instead.',
    ],
    check: {
      q: 'They say “Looks great, I’ll get back to you.” Is that a sale?',
      a: 'No, that’s interest. Offer one easy next step with a price: “I can put it live this week for $350. Want me to?” If they go quiet, follow up once and move on.',
    },
    actions: [{ label: 'Open Pricing', action: '#pricing' }],
  },
];

export const GLOSSARY = [
  ['Audit', 'An automatic check of a website: mobile layout, tap-to-call, contact options, speed hints. It gives a score out of 100 and a list of problems.'],
  ['Sample site / spec site', 'A free mock-up of their new site, built before they pay, to show what you mean.'],
  ['Tap-to-call', 'A phone number on a website that starts a call when tapped on a phone.'],
  ['Mobile-friendly', 'A site that fits a phone screen without zooming or scrolling sideways.'],
  ['Domain', 'The website address, e.g. bobsgardens.co.uk. The business should always own it.'],
  ['DNS', 'The settings that point a domain at the server that hosts the website.'],
  ['Hosting', 'Where the website files live online. Netlify, Cloudflare Pages and GitHub Pages have free plans.'],
  ['Care plan', 'A monthly fee for keeping the site online and making small changes. It’s your recurring income.'],
  ['CAN-SPAM', 'The US law for commercial email: real sender, postal address, working opt-out, honour opt-outs within 10 business days.'],
  ['Deposit', 'Part of the price paid upfront (often 50%) before you start the work.'],
  ['Test mode', 'The offer page’s “Reserve” buttons only record interest. No payment is ever taken.'],
];

export const TIPS = {
  pipeline: [
    'Your list of local businesses, from first find to paying client.',
    'Add a business with its website and public phone. Then use “Audit” or “Build sample” on its row.',
    'Move each business through the stages as things happen. The numbers at the top update.',
  ],
  audit: [
    'Pick a prospect (or type a website address) and click Run audit.',
    'Read “Fix these first”: those are the problems you’ll mention to the owner.',
    'If a site blocks the check, tick “Paste HTML instead” and paste the page source.',
  ],
  build: [
    'Fill in the business’s real details. The audit fills in what it found, but check it.',
    'Choose a theme, click Generate, then switch the preview to Mobile.',
    'Download the file to keep it. Don’t publish it until the owner agrees.',
  ],
  outreach: [
    'Pick a prospect to get an email draft based on their audit.',
    'Add your name and postal address in Settings first (the law requires them).',
    'Copy the draft, personalise the first line, and send it yourself.',
  ],
  pricing: [
    'Try different prices and hours to see your real hourly rate.',
    'Compare a one-off launch with a launch plus monthly care plan.',
  ],
  leads: [
    'People who filled in the form on your public offer page appear here.',
    'Test orders are “Reserve” clicks: strong interest, but no money was taken.',
  ],
  settings: [
    'Your name, business name and postal address go into every email draft.',
    'Prices set here appear on your public offer page.',
  ],
};
