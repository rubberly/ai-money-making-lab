// Small dependency-free HTML helpers. Regex-based on purpose: good enough for auditing, not a full parser.

export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeEntities(s) {
  const cp = n => (n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '');
  return String(s)
    .replace(/&#(\d+);/g, (_, n) => cp(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => cp(parseInt(n, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/gi, '©')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

export function stripNonContent(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}

export function textOf(html) {
  return decodeEntities(stripNonContent(html).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Text split into rough visual lines (block tags and <br> become newlines).
export function linesOf(html) {
  return decodeEntities(
    stripNonContent(html)
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/address|\/td|\/tr|\/section|\/footer|\/header)\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

export function findTags(html, name) {
  return String(html).match(new RegExp(`<${name}\\b[^>]*>`, 'gi')) || [];
}

export function attr(tag, name) {
  const m = String(tag).match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decodeEntities(m[1] ?? m[2] ?? m[3] ?? '') : null;
}

export function innerTexts(html, name) {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi');
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const t = textOf(m[1]);
    if (t) out.push(t);
  }
  return out;
}

export function metaContent(html, key) {
  for (const tag of findTags(html, 'meta')) {
    const n = (attr(tag, 'name') || attr(tag, 'property') || '').toLowerCase();
    if (n === key) return attr(tag, 'content');
  }
  return null;
}

const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,5}\)|\d{2,5})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g;

export function findPhones(text) {
  const out = [];
  const seen = new Set();
  for (const m of String(text).match(PHONE_RE) || []) {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 13) continue;
    if (/^(19|20)\d{2}\s*[-–]?\s*(19|20)\d{2}$/.test(m.trim())) continue; // year ranges
    if (seen.has(digits)) continue;
    seen.add(digits);
    out.push(m.trim());
  }
  return out;
}
