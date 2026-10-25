import { esc } from './html.js';

export const THEMES = {
  forest: { name: 'Forest (gardens, landscaping)', primary: '#2f6b3a', dark: '#1d4425', accent: '#e9b949', bg: '#f6f4ee', ink: '#1b231d', soft: '#e7efe5' },
  ocean: { name: 'Ocean (plumbing, cleaning)', primary: '#1f5fa8', dark: '#143f70', accent: '#f2a541', bg: '#f4f7fb', ink: '#15202e', soft: '#e3edf8' },
  ember: { name: 'Ember (roofing, building, electrical)', primary: '#c2512b', dark: '#7f3218', accent: '#ffd166', bg: '#faf6f3', ink: '#25201d', soft: '#f6e6de' },
  slate: { name: 'Slate (professional services)', primary: '#334155', dark: '#1e293b', accent: '#0ea5e9', bg: '#f8fafc', ink: '#0f172a', soft: '#e8edf3' },
};

const lines = v => (Array.isArray(v) ? v : String(v ?? '').split(/\r?\n/)).map(s => String(s).trim()).filter(Boolean);
const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[a-z]{2,}$/i;

// Testimonials: one per line as `Quote text — Customer name`. Only real, permission-given reviews.
function parseTestimonials(v) {
  return lines(v).slice(0, 6).map(l => {
    const m = l.match(/^(.*?)\s+[—–-]\s+([^—–-]{2,60})$/);
    return m ? { quote: m[1].replace(/^["“]|["”]$/g, '').trim(), name: m[2].trim() } : { quote: l.replace(/^["“]|["”]$/g, ''), name: '' };
  }).filter(t => t.quote.length >= 3);
}

export function normalizeForm(input = {}) {
  const errors = {};
  const s = (k, max) => String(input[k] ?? '').trim().slice(0, max);
  const d = {
    businessName: s('businessName', 80),
    trade: s('trade', 60),
    town: s('town', 60),
    serviceArea: s('serviceArea', 160),
    phone: s('phone', 30),
    email: s('email', 120),
    address: s('address', 200),
    about: s('about', 800),
    cta: s('cta', 40) || 'Call for a quote',
    theme: THEMES[input.theme] ? input.theme : 'ocean',
    services: lines(input.services).map(x => x.slice(0, 60)).slice(0, 12),
    hours: lines(input.hours).map(x => x.slice(0, 60)).slice(0, 8),
    testimonials: parseTestimonials(input.testimonials),
    testimonialsConfirmed: Boolean(input.testimonialsConfirmed),
  };
  if (!d.businessName) errors.businessName = 'Business name is required.';
  if (!d.trade) errors.trade = 'Trade is required (e.g. "Gardener").';
  if (!d.town) errors.town = 'Town is required.';
  if (!d.phone && !d.email) errors.phone = 'Add a phone number or an email so customers can get in touch.';
  if (d.phone && d.phone.replace(/\D/g, '').length < 7) errors.phone = 'That phone number looks too short.';
  if (d.email && !EMAIL_RE.test(d.email)) errors.email = 'That email address does not look valid.';
  if (!d.services.length) errors.services = 'List at least one service, one per line.';
  if (d.testimonials.length && !d.testimonialsConfirmed) {
    errors.testimonials = 'Tick the box confirming these are real reviews you have permission to use, or remove them.';
  }
  return { ok: Object.keys(errors).length === 0, errors, data: d };
}

const joinList = arr => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);

export function templateCopy(d) {
  const area = d.serviceArea || d.town;
  const top = d.services.slice(0, 3).map(x => x.toLowerCase());
  const serviceBlurbs = {};
  for (const svc of d.services) serviceBlurbs[svc] = `${svc} for customers in ${area}. Get in touch to talk through what you need.`;
  return {
    headline: `${d.trade} in ${d.town}`,
    subheadline: `${d.businessName} offers ${joinList(top)} across ${area}. ${d.cta} today.`,
    about: d.about || `${d.businessName} is a local ${d.trade.toLowerCase()} serving ${area}. [Placeholder: add a few real sentences about the owner, experience and what makes the business different.]`,
    aboutIsPlaceholder: !d.about,
    serviceBlurbs,
  };
}

const telHref = phone => `tel:${phone.replace(/[^\d+]/g, '')}`;

export function renderSite(d, copy, { copySource = 'template copy (no AI)', formAction = '', year = new Date().getFullYear() } = {}) {
  const t = THEMES[d.theme] || THEMES.ocean;
  const area = d.serviceArea || d.town;
  const phoneBtn = d.phone ? `<a class="btn" href="${esc(telHref(d.phone))}">${esc(d.cta)} · ${esc(d.phone)}</a>` : '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: d.businessName,
    description: copy.subheadline,
    areaServed: area,
    ...(d.phone && { telephone: d.phone }),
    ...(d.email && { email: d.email }),
    ...(d.address && { address: d.address }),
    ...(d.hours.length && { openingHours: d.hours }),
  };
  const services = d.services.map(svc => `
        <article class="card"><h3>${esc(svc)}</h3><p>${esc(copy.serviceBlurbs[svc] || '')}</p></article>`).join('');
  const reviews = d.testimonials.length
    ? d.testimonials.map(r => `
        <figure class="review"><blockquote>“${esc(r.quote)}”</blockquote>${r.name ? `<figcaption>— ${esc(r.name)}</figcaption>` : ''}</figure>`).join('')
    : `
        <div class="placeholder"><strong>Placeholder:</strong> add 2–3 real customer reviews here (with permission), or link to your Google reviews. No reviews have been made up.</div>`;
  const hours = d.hours.length
    ? `<ul class="hours">${d.hours.map(h => `<li>${esc(h)}</li>`).join('')}</ul>`
    : '<p class="placeholder">Placeholder: add opening hours.</p>';

  let form = '';
  if (formAction) {
    form = `<form class="form" action="${esc(formAction)}" method="POST">`;
  } else if (d.email) {
    form = `<!-- PLACEHOLDER: mailto forms open the visitor's email app and are unreliable. Replace the action with a form endpoint (e.g. Formspree, Netlify Forms) before going live. -->
      <form class="form" action="mailto:${esc(d.email)}" method="post" enctype="text/plain">`;
  }
  if (form) {
    form += `
        <label>Name<input name="name" autocomplete="name" required></label>
        <label>Phone or email<input name="contact" required></label>
        <label>How can we help?<textarea name="message" rows="4" required></textarea></label>
        <button class="btn" type="submit">Send enquiry</button>
      </form>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(`${d.businessName} | ${d.trade} in ${d.town}`)}</title>
<meta name="description" content="${esc(copy.subheadline.slice(0, 160))}">
<meta name="generator" content="Site Makeover Kit; copy: ${esc(copySource)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='${encodeURIComponent(t.primary)}'/%3E%3C/svg%3E">
<style>
  :root{--p:${t.primary};--d:${t.dark};--a:${t.accent};--bg:${t.bg};--ink:${t.ink};--soft:${t.soft}}
  *{box-sizing:border-box}
  body{margin:0;font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg)}
  a{color:var(--p)}
  .wrap{max-width:1080px;margin:0 auto;padding:0 20px}
  .top{position:sticky;top:0;z-index:5;background:#fff;border-bottom:1px solid rgba(0,0,0,.08)}
  .top .wrap{display:flex;justify-content:space-between;align-items:center;min-height:64px;gap:12px}
  .brand{font-weight:800;font-size:19px;text-decoration:none;color:var(--ink)}
  .nav{display:flex;gap:18px;font-size:15px}.nav a{text-decoration:none;color:var(--ink)}
  .btn{display:inline-block;background:var(--p);color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:10px;border:0;font-size:16px;cursor:pointer}
  .btn:hover{background:var(--d)} .btn-ghost{background:transparent;color:var(--p);box-shadow:inset 0 0 0 2px var(--p)}
  .btn-ghost:hover{background:var(--soft)} .btn-sm{padding:9px 14px;font-size:14px}
  .hero{background:linear-gradient(135deg,var(--d),var(--p));color:#fff;padding:72px 0 80px}
  .eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:13px;font-weight:700;color:var(--a);margin:0 0 10px}
  .hero h1{font-size:clamp(32px,5vw,52px);line-height:1.1;margin:0 0 16px;max-width:760px}
  .lead{font-size:19px;max-width:640px;opacity:.95;margin:0 0 28px}
  .hero .btn{background:var(--a);color:var(--ink)} .hero .btn-ghost{background:transparent;color:#fff;box-shadow:inset 0 0 0 2px #fff}
  .actions{display:flex;flex-wrap:wrap;gap:12px}
  section{padding:64px 0} h2{font-size:30px;margin:0 0 24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}
  .card{background:#fff;border-radius:14px;padding:22px;box-shadow:0 1px 3px rgba(0,0,0,.06);border-top:4px solid var(--p)}
  .card h3{margin:0 0 6px;font-size:19px}.card p{margin:0;color:#4a5560;font-size:15px}
  .alt{background:#fff}
  .two{display:grid;grid-template-columns:1fr 1fr;gap:40px}
  .review{margin:0 0 16px;background:var(--soft);padding:18px 20px;border-radius:12px}
  .review blockquote{margin:0;font-size:17px}.review figcaption{margin-top:8px;font-weight:700;font-size:15px}
  .placeholder{border:2px dashed #b9c0c8;border-radius:12px;padding:16px;color:#5b6573;background:#fff}
  .hours{list-style:none;padding:0;margin:0}.hours li{padding:8px 0;border-bottom:1px solid rgba(0,0,0,.08)}
  .form{display:grid;gap:14px;background:#fff;padding:24px;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .form label{display:grid;gap:6px;font-weight:600;font-size:15px}
  .form input,.form textarea{font:inherit;padding:12px;border:1px solid #c9d0d8;border-radius:8px}
  footer{background:var(--ink);color:#cfd6dd;padding:32px 0 96px;font-size:15px} footer a{color:#fff}
  .callbar{position:fixed;left:0;right:0;bottom:0;display:none;gap:8px;padding:10px;background:#fff;box-shadow:0 -2px 12px rgba(0,0,0,.12);z-index:10}
  .callbar a{flex:1;text-align:center}
  @media (max-width:760px){
    .nav{display:none}.top .btn-sm{display:none}
    .two{grid-template-columns:1fr;gap:28px}
    .hero{padding:48px 0 56px} section{padding:48px 0}
    .callbar{display:flex}
  }
</style>
<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand" href="#top">${esc(d.businessName)}</a>
  <nav class="nav"><a href="#services">Services</a><a href="#about">About</a><a href="#hours">Hours</a><a href="#contact">Contact</a></nav>
  ${d.phone ? `<a class="btn btn-sm" href="${esc(telHref(d.phone))}">Call ${esc(d.phone)}</a>` : ''}
</div></header>

<section class="hero" id="top"><div class="wrap">
  <p class="eyebrow">${esc(d.trade)} · ${esc(area)}</p>
  <h1>${esc(copy.headline)}</h1>
  <p class="lead">${esc(copy.subheadline)}</p>
  <div class="actions">${phoneBtn}<a class="btn btn-ghost" href="#contact">Send a message</a></div>
</div></section>

<section id="services"><div class="wrap">
  <h2>Services</h2>
  <div class="grid">${services}
  </div>
</div></section>

<section class="alt" id="about"><div class="wrap two">
  <div><h2>About ${esc(d.businessName)}</h2><p${copy.aboutIsPlaceholder ? ' class="placeholder"' : ''}>${esc(copy.about)}</p></div>
  <div><h2>What customers say</h2>${reviews}
  </div>
</div></section>

<section id="hours"><div class="wrap two">
  <div><h2>Opening hours</h2>${hours}</div>
  <div><h2>Areas we cover</h2><p>${esc(area)}</p>${d.address ? `<p><strong>Address:</strong> ${esc(d.address)}</p>` : ''}</div>
</div></section>

<section class="alt" id="contact"><div class="wrap two">
  <div>
    <h2>Get in touch</h2>
    ${d.phone ? `<p><strong>Phone:</strong> <a href="${esc(telHref(d.phone))}">${esc(d.phone)}</a></p>` : ''}
    ${d.email ? `<p><strong>Email:</strong> <a href="mailto:${esc(d.email)}">${esc(d.email)}</a></p>` : ''}
    <p>${esc(d.cta)}: we'll get back to you as soon as we can.</p>
  </div>
  <div>${form}</div>
</div></section>

<footer><div class="wrap">© ${year} ${esc(d.businessName)} · ${esc(d.trade)} in ${esc(d.town)}</div></footer>

<div class="callbar">${d.phone ? `<a class="btn" href="${esc(telHref(d.phone))}">Call now</a>` : ''}<a class="btn btn-ghost" href="#contact">Message</a></div>
</body>
</html>
`;
}
