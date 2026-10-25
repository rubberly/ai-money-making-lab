import { attr, esc, findPhones, findTags, innerTexts, metaContent, textOf } from './html.js';

// Plain-English copy per check: what a business owner would understand, plus a one-line outreach phrasing.
const COPY = {
  https: {
    label: 'Secure connection (HTTPS)',
    fix: 'Serve the site over HTTPS. Most hosts include a free certificate.',
    outreach: 'the site loads without HTTPS, so some browsers label it "Not secure"',
  },
  viewport: {
    label: 'Works on phones',
    fix: 'Add a mobile viewport tag and a layout that reflows on small screens.',
    outreach: "the site isn't set up for phones, so mobile visitors have to pinch and zoom",
  },
  title: {
    label: 'Page title',
    fix: 'Write a 10–70 character title naming the trade and town, e.g. "Garden Maintenance in Maidstone | Name".',
    outreach: "the page title doesn't say what you do or where, which matters for Google results",
  },
  description: {
    label: 'Search result description',
    fix: 'Add a 50–160 character meta description that sells the service and mentions the area.',
    outreach: 'there is no search description, so Google picks random text for your listing',
  },
  telLink: {
    label: 'Tap-to-call button',
    fix: 'Link the phone number with tel: so mobile visitors can call in one tap.',
    outreach: "the phone number isn't tappable, so people on mobile can't call you in one tap",
  },
  phoneVisible: {
    label: 'Phone number visible',
    fix: 'Show the phone number in the header and footer.',
    outreach: "I couldn't find a phone number on the page",
  },
  contact: {
    label: 'Contact form or email',
    fix: 'Add a short contact form or a clickable email address.',
    outreach: "there's no quick way to send an enquiry from the page",
  },
  h1: {
    label: 'Main headline',
    fix: 'Use exactly one H1 headline that says what you do and where.',
    outreach: "the page has no clear main headline saying what you do",
  },
  imgAlt: {
    label: 'Image descriptions (alt text)',
    fix: 'Add short alt text to images for accessibility and image search.',
    outreach: 'most images have no descriptions, which hurts accessibility and search',
  },
  size: {
    label: 'Page weight',
    fix: 'Trim the HTML and remove unused code so the page loads quickly on mobile data.',
    outreach: 'the page is heavy, so it is slow to load on mobile data',
  },
  scripts: {
    label: 'Script count',
    fix: 'Remove unused plugins and tracking scripts.',
    outreach: 'the page loads a lot of scripts, which slows it down',
  },
  copyright: {
    label: 'Up-to-date footer',
    fix: 'Update the footer year, or remove it, so the business does not look inactive.',
    outreach: 'the footer still shows an old year, which can make the business look closed',
  },
  legacy: {
    label: 'Modern building blocks',
    fix: 'Replace table layouts, <font>, marquees, frames or Flash with modern responsive HTML/CSS.',
    outreach: 'the site uses very old web techniques that break on modern phones',
  },
  favicon: {
    label: 'Browser tab icon',
    fix: 'Add a small favicon (logo icon) so the site looks finished in tabs and bookmarks.',
    outreach: 'there is no browser tab icon, a small detail that makes the site look unfinished',
  },
  cta: {
    label: 'Clear call to action',
    fix: 'Add obvious buttons like "Call now", "Get a free quote" or "Book online".',
    outreach: "there's no clear button telling visitors what to do next (call, book or get a quote)",
  },
};

// Weights total 100. Higher weight = more impact on enquiries for a local service business.
const WEIGHTS = {
  https: 10, viewport: 15, title: 6, description: 6, telLink: 10, phoneVisible: 6, contact: 8,
  h1: 5, imgAlt: 5, size: 5, scripts: 4, copyright: 5, legacy: 5, favicon: 3, cta: 7,
};

const CTA_RE = /\b(call (us|now|today)|book (now|online|a|an|your)|get a (free )?(quote|estimate)|free (quote|estimate)|request a (quote|call|callback|estimate)|schedule (a|an|your)|get in touch|contact us)\b/i;

export function auditHtml(html, { url = '', bytes, now = new Date() } = {}) {
  const page = String(html ?? '');
  const text = textOf(page);
  const checks = [];
  const add = (id, status, finding) => {
    const max = WEIGHTS[id];
    const points = status === 'pass' ? max : status === 'warn' ? Math.round(max / 2) : 0;
    checks.push({
      id, label: COPY[id].label, status, finding, fix: COPY[id].fix,
      max: status === 'skip' ? 0 : max, points: status === 'skip' ? 0 : points,
    });
  };

  // HTTPS
  if (!url) add('https', 'skip', 'Not checked: HTML was pasted without a URL.');
  else if (/^https:/i.test(url)) add('https', 'pass', 'The site loads over HTTPS.');
  else add('https', 'fail', 'The site loads over plain HTTP. Browsers show "Not secure".');

  // Viewport
  const viewport = findTags(page, 'meta').find(t => (attr(t, 'name') || '').toLowerCase() === 'viewport');
  const vpContent = viewport ? attr(viewport, 'content') || '' : '';
  if (/width\s*=\s*device-width/i.test(vpContent)) add('viewport', 'pass', 'Has a mobile viewport tag.');
  else if (viewport) add('viewport', 'warn', `Viewport tag present but not set to device width ("${vpContent}").`);
  else add('viewport', 'fail', 'No mobile viewport tag: phones show a shrunken desktop page.');

  // Title
  const title = (innerTexts(page, 'title')[0] || '').trim();
  if (!title) add('title', 'fail', 'The page has no title.');
  else if (title.length < 10 || title.length > 70) add('title', 'warn', `Title is ${title.length} characters ("${title.slice(0, 80)}"). Aim for 10–70.`);
  else add('title', 'pass', `Title: "${title}".`);

  // Meta description
  const desc = (metaContent(page, 'description') || '').trim();
  if (!desc) add('description', 'fail', 'No meta description.');
  else if (desc.length < 50 || desc.length > 170) add('description', 'warn', `Description is ${desc.length} characters. Aim for 50–160.`);
  else add('description', 'pass', 'Has a meta description of a sensible length.');

  // Click-to-call
  const anchors = findTags(page, 'a');
  const telLinks = anchors.filter(a => /^\s*tel:/i.test(attr(a, 'href') || ''));
  if (telLinks.length) add('telLink', 'pass', `${telLinks.length} tap-to-call link(s) found.`);
  else add('telLink', 'fail', 'No tap-to-call (tel:) links.');

  // Visible phone
  const phones = findPhones(text);
  if (phones.length) add('phoneVisible', 'pass', `Phone number shown: ${phones[0]}.`);
  else add('phoneVisible', 'fail', 'No phone number found in the page text.');

  // Contact path
  const mailto = anchors.some(a => /^\s*mailto:/i.test(attr(a, 'href') || ''));
  const forms = findTags(page, 'form').length;
  if (mailto || forms) add('contact', 'pass', forms ? 'Has a form.' : 'Has a clickable email link.');
  else if (/contact/i.test(text)) add('contact', 'warn', 'Mentions "contact" but has no form or clickable email on this page.');
  else add('contact', 'fail', 'No form or clickable email address.');

  // H1
  const h1s = innerTexts(page, 'h1');
  if (h1s.length === 1) add('h1', 'pass', `Headline: "${h1s[0].slice(0, 80)}".`);
  else if (h1s.length > 1) add('h1', 'warn', `${h1s.length} H1 headlines; one clear headline is better.`);
  else add('h1', 'fail', 'No H1 headline.');

  // Image alt text
  const imgs = findTags(page, 'img');
  const missingAlt = imgs.filter(t => attr(t, 'alt') === null).length;
  if (!imgs.length) add('imgAlt', 'pass', 'No images on the page.');
  else if (!missingAlt) add('imgAlt', 'pass', `All ${imgs.length} images have alt text.`);
  else if (missingAlt / imgs.length <= 0.3) add('imgAlt', 'warn', `${missingAlt} of ${imgs.length} images lack alt text.`);
  else add('imgAlt', 'fail', `${missingAlt} of ${imgs.length} images lack alt text.`);

  // HTML weight
  const size = bytes ?? Buffer.byteLength(page, 'utf8');
  const kb = Math.round(size / 1024);
  if (size < 150 * 1024) add('size', 'pass', `HTML is ${kb} KB.`);
  else if (size < 400 * 1024) add('size', 'warn', `HTML is ${kb} KB, heavier than needed.`);
  else add('size', 'fail', `HTML is ${kb} KB, very heavy for mobile.`);

  // Scripts
  const scripts = findTags(page, 'script').filter(t => !/application\/ld\+json/i.test(t)).length;
  if (scripts <= 15) add('scripts', 'pass', `${scripts} script(s).`);
  else if (scripts <= 30) add('scripts', 'warn', `${scripts} scripts. Some are probably unused.`);
  else add('scripts', 'fail', `${scripts} scripts. That slows the page down.`);

  // Copyright year
  const years = [...text.matchAll(/(?:©|copyright|\(c\))\s*(?:(?:19|20)\d{2}\s*[-–]\s*)?((?:19|20)\d{2})/gi)].map(m => Number(m[1]));
  const year = now.getFullYear();
  if (!years.length) add('copyright', 'pass', 'No footer year to go stale.');
  else {
    const latest = Math.max(...years);
    if (latest >= year - 1) add('copyright', 'pass', `Footer year is ${latest}.`);
    else add('copyright', 'fail', `Footer says © ${latest}, which makes the business look inactive.`);
  }

  // Legacy techniques
  const legacy = [];
  if (/\.swf\b|application\/x-shockwave-flash/i.test(page)) legacy.push('Flash');
  if (/<frameset\b|<frame\b/i.test(page)) legacy.push('frames');
  if (/<marquee\b/i.test(page)) legacy.push('scrolling marquee');
  if (/<font\b/i.test(page)) legacy.push('<font> tags');
  if (/<center\b/i.test(page)) legacy.push('<center> tags');
  const layoutTables = findTags(page, 'table').filter(t => /\s(width|bgcolor|cellpadding|background)\s*=/i.test(t)).length;
  if (layoutTables) legacy.push(`${layoutTables} layout table(s)`);
  if (!legacy.length) add('legacy', 'pass', 'No obsolete layout techniques detected.');
  else if (legacy.length === 1) add('legacy', 'warn', `Uses ${legacy[0]}.`);
  else add('legacy', 'fail', `Uses ${legacy.join(', ')}.`);

  // Favicon
  const icon = findTags(page, 'link').some(t => /icon/i.test(attr(t, 'rel') || ''));
  add('favicon', icon ? 'pass' : 'fail', icon ? 'Has a favicon.' : 'No favicon declared.');

  // CTA
  const ctaMatch = text.match(CTA_RE);
  if (ctaMatch) add('cta', 'pass', `Found a call to action: "${ctaMatch[0]}".`);
  else add('cta', 'fail', 'No clear call to action (call, book, get a quote).');

  const max = checks.reduce((s, c) => s + c.max, 0);
  const points = checks.reduce((s, c) => s + c.points, 0);
  const score = max ? Math.round((points / max) * 100) : 0;
  const grade = score >= 80 ? 'Good' : score >= 55 ? 'Needs work' : 'Poor';
  const topIssues = checks
    .filter(c => c.status === 'fail' || c.status === 'warn')
    .sort((a, b) => (b.max - b.points) - (a.max - a.points))
    .map(c => c.id);

  return {
    score, grade, checks, topIssues,
    stats: { bytes: size, scripts, images: imgs.length, words: text ? text.split(' ').length : 0 },
  };
}

export function outreachPhrase(id) {
  return COPY[id]?.outreach || '';
}

const ICON = { pass: '✓', warn: '!', fail: '✗', skip: '–' };

export function renderReport(audit, { businessName = '', url = '', preparedBy = '' } = {}) {
  const rows = audit.checks.map(c => `
    <tr class="${c.status}">
      <td class="st">${ICON[c.status]}</td>
      <td><strong>${esc(c.label)}</strong><br><span>${esc(c.finding)}</span></td>
      <td>${c.status === 'pass' || c.status === 'skip' ? '' : esc(c.fix)}</td>
    </tr>`).join('');
  const first = audit.topIssues.slice(0, 3).map(id => {
    const c = audit.checks.find(x => x.id === id);
    return `<li><strong>${esc(c.label)}:</strong> ${esc(c.fix)}</li>`;
  }).join('');
  const date = new Date(audit.createdAt || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Website check: ${esc(businessName || url || 'pasted page')}</title>
<style>
  body{font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1c2430;background:#fff;margin:0}
  .wrap{max-width:860px;margin:0 auto;padding:32px 20px}
  h1{font-size:26px;margin:0 0 4px} .muted{color:#5b6573}
  .score{display:flex;gap:20px;align-items:center;margin:24px 0;padding:20px;border:1px solid #e3e7ec;border-radius:12px}
  .num{font-size:44px;font-weight:700} .grade{font-size:18px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin-top:12px} td{padding:10px 8px;border-top:1px solid #e3e7ec;vertical-align:top}
  td span{color:#5b6573} .st{width:28px;font-weight:700;text-align:center}
  tr.pass .st{color:#1a7f37} tr.warn .st{color:#b26b00} tr.fail .st{color:#c62828} tr.skip .st{color:#8a94a3}
  ol li{margin:6px 0} .note{margin-top:28px;font-size:13px;color:#5b6573}
  @media print{.wrap{padding:0}}
</style></head><body><div class="wrap">
<h1>Website check${businessName ? ` for ${esc(businessName)}` : ''}</h1>
<div class="muted">${esc(url || 'Pasted HTML')} · ${esc(date)}${preparedBy ? ` · Prepared by ${esc(preparedBy)}` : ''}</div>
<div class="score"><div class="num">${audit.score}<small>/100</small></div><div><div class="grade">${esc(audit.grade)}</div>
<div class="muted">${audit.checks.filter(c => c.status === 'pass').length} of ${audit.checks.filter(c => c.status !== 'skip').length} checks passed</div></div></div>
${first ? `<h2>What I'd fix first</h2><ol>${first}</ol>` : '<h2>No major issues found</h2>'}
<h2>All checks</h2>
<table>${rows}</table>
${audit.pagespeed ? `<p><strong>Google PageSpeed (mobile performance):</strong> ${esc(audit.pagespeed.performance)}/100</p>` : ''}
<p class="note">Automated check of the page's HTML on ${esc(date)}. It does not measure real-world load time${audit.pagespeed ? ' (except the PageSpeed figure above, from Google)' : ''}, search rankings, or visual design. To save as PDF, use your browser's Print → Save as PDF.</p>
</div></body></html>`;
}
