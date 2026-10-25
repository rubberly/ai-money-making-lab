import { attr, findPhones, findTags, innerTexts, linesOf, metaContent, textOf } from './html.js';

const NAV_WORDS = /^(home|contact( us)?|about( us)?|welcome|testimonials?|reviews?|gallery|menu|hours|opening (hours|times)|find us|get in touch|our services|services|faqs?|blog|news|links|privacy.*|terms.*|cookies?|follow us|location|map|why choose us|meet the team)$/i;
const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/;
const US_ZIP_LINE = /\b[A-Z][a-zA-Z .'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/;
const DAY_RE = /\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\b/i;
const TIME_RE = /\b\d{1,2}(?::\d{2})?\s*(am|pm)\b|\b\d{1,2}:\d{2}\b|\bclosed\b|24\s*hours/i;

const uniq = (arr, key = x => x.toLowerCase()) => {
  const seen = new Set();
  return arr.filter(x => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

export function extractDetails(html, url = '') {
  const page = String(html ?? '');
  const title = (innerTexts(page, 'title')[0] || '').trim();
  const siteName = (metaContent(page, 'og:site_name') || '').trim();
  const businessName = siteName || title.split(/\s+[|\-–—:]\s+/)[0].trim();

  const anchors = findTags(page, 'a');
  const telPhones = anchors
    .map(a => attr(a, 'href') || '')
    .filter(h => /^\s*tel:/i.test(h))
    .map(h => {
      const raw = h.replace(/^\s*tel:/i, '').trim();
      try { return decodeURIComponent(raw); } catch { return raw; }
    });
  const phones = uniq([...telPhones, ...findPhones(textOf(page))], p => p.replace(/\D/g, '').slice(-9)).slice(0, 5);

  const mailtoEmails = anchors
    .map(a => attr(a, 'href') || '')
    .filter(h => /^\s*mailto:/i.test(h))
    .map(h => h.replace(/^\s*mailto:/i, '').split('?')[0].trim());
  const textEmails = textOf(page).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const emails = uniq([...mailtoEmails, ...textEmails])
    .filter(e => /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e) && !/\.(png|jpe?g|gif|webp|svg)$/i.test(e))
    .map(e => e.toLowerCase())
    .slice(0, 5);

  const headings = uniq([...innerTexts(page, 'h1'), ...innerTexts(page, 'h2'), ...innerTexts(page, 'h3')])
    .filter(h => h.length <= 80)
    .slice(0, 12);
  const serviceHints = uniq([...innerTexts(page, 'h2'), ...innerTexts(page, 'h3')])
    .map(h => h.replace(/[:.!]+$/, '').trim())
    .filter(h => h.length >= 3 && h.length <= 50 && !NAV_WORDS.test(h))
    .slice(0, 8);

  const lines = linesOf(page);
  const addressLines = uniq(lines.filter(l => l.length <= 120 && (UK_POSTCODE.test(l) || US_ZIP_LINE.test(l)))).slice(0, 3);
  const hoursLines = uniq(lines.filter(l => l.length <= 60 && DAY_RE.test(l) && TIME_RE.test(l))).slice(0, 7);

  return {
    url,
    title,
    businessName,
    metaDescription: (metaContent(page, 'description') || '').trim(),
    phones,
    emails,
    headings,
    serviceHints,
    addressLines,
    hoursLines,
  };
}
