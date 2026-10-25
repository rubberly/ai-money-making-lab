import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.js';
import { safeFetch, UrlError, validateUrlShape } from './lib/ssrf.js';
import { auditHtml, renderReport } from './lib/audit.js';
import { extractDetails } from './lib/extract.js';
import { normalizeForm, renderSite, templateCopy, THEMES } from './lib/generate.js';
import { aiProvider, polishCopy } from './lib/ai.js';
import { draftOutreach } from './lib/outreach.js';
import { calcPricing } from './lib/pricing.js';
import { askForPassword, passwordOk } from './lib/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');

export const STAGES = ['found', 'audited', 'sample_built', 'emailed', 'replied', 'call', 'paid', 'care_plan', 'lost'];
const MAX_BODY = 4 * 1024 * 1024;
const EMAIL_RE = /^[^@\s<>"]+@[^@\s<>"]+\.[a-z]{2,}$/i;

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/offer': ['offer.html', 'text/html; charset=utf-8'],
  '/assets/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/assets/offer.js': ['offer.js', 'text/javascript; charset=utf-8'],
  '/assets/styles.css': ['styles.css', 'text/css; charset=utf-8'],
};

// Reachable without the workspace password: the customer-facing offer page and its form endpoints.
const PUBLIC_GET = new Set(['/offer', '/assets/offer.js', '/assets/styles.css', '/api/offer-config', '/healthz']);
const PUBLIC_POST = new Set(['/api/leads', '/api/test-orders']);
const isPublic = (method, pathname) => (method === 'GET' ? PUBLIC_GET : method === 'POST' ? PUBLIC_POST : new Set()).has(pathname);

const APP_CSP ="default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";
const GENERATED_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src data: https:; form-action https: mailto:; base-uri 'none'; frame-ancestors 'self'";
const REPORT_CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'";

export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function loadDotEnv(file, env = process.env) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith('#')) continue;
    const val = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (env[m[1]] === undefined && val !== '') env[m[1]] = val;
  }
}

function send(res, status, body, headers = {}) {
  const isString = typeof body === 'string';
  res.writeHead(status, {
    'content-type': isString ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(isString ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Request is too large (max 4 MB).'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function readJson(req) {
  // Requiring JSON also blocks cross-site form posts (no CORS is ever granted).
  if (!/^application\/json/i.test(req.headers['content-type'] || '')) {
    throw new HttpError(415, 'Send JSON with Content-Type: application/json.');
  }
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error();
    return v;
  } catch {
    throw new HttpError(400, 'Request body is not valid JSON.');
  }
}

const str = (v, max) => String(v ?? '').trim().slice(0, max);

function normalizeWebsite(v) {
  let s = str(v, 300);
  if (!s) return '';
  if (!/^[a-z]+:\/\//i.test(s)) s = `https://${s}`;
  const u = validateUrlShape(s);
  return u.href;
}

export function validateProspect(input, existing = null) {
  const errors = {};
  const p = existing ? { ...existing } : { stage: 'found', revenue: 0, priceQuoted: '', notes: '' };
  const has = k => Object.prototype.hasOwnProperty.call(input, k);
  for (const [k, max] of [['name', 100], ['trade', 60], ['town', 60], ['phone', 30], ['contactName', 60], ['source', 200], ['notes', 4000]]) {
    if (has(k) || !existing) p[k] = str(input[k], max);
  }
  if (has('website') || !existing) {
    try { p.website = normalizeWebsite(input.website); } catch (e) { errors.website = e.message; }
  }
  if (has('email') || !existing) {
    p.email = str(input.email, 120).toLowerCase();
    if (p.email && !EMAIL_RE.test(p.email)) errors.email = 'That email address does not look valid.';
  }
  if (has('stage')) {
    if (!STAGES.includes(input.stage)) errors.stage = 'Unknown stage.';
    else p.stage = input.stage;
  }
  for (const k of ['priceQuoted', 'revenue']) {
    if (!has(k)) continue;
    if (input[k] === '' || input[k] === null) { p[k] = k === 'revenue' ? 0 : ''; continue; }
    const n = Number(input[k]);
    if (!Number.isFinite(n) || n < 0) errors[k] = 'Must be a number of 0 or more.';
    else p[k] = Math.round(n * 100) / 100;
  }
  if (!p.name) errors.name = 'Business name is required.';
  return { errors, prospect: p };
}

function validateSettings(input, current) {
  const errors = {};
  const s = { ...current };
  for (const [k, max] of [['senderName', 80], ['senderBusiness', 80], ['postalAddress', 300], ['currency', 3]]) {
    if (k in input) s[k] = str(input[k], max);
  }
  if ('replyEmail' in input) {
    s.replyEmail = str(input.replyEmail, 120);
    if (s.replyEmail && !EMAIL_RE.test(s.replyEmail)) errors.replyEmail = 'That email address does not look valid.';
  }
  if ('formAction' in input) {
    s.formAction = str(input.formAction, 300);
    if (s.formAction && !/^https:\/\/[^\s"'<>]+$/i.test(s.formAction)) errors.formAction = 'Form endpoint must be an https:// URL (or empty).';
  }
  if (Array.isArray(input.tiers)) {
    s.tiers = current.tiers.map((t, i) => {
      const n = input.tiers[i] || {};
      const price = Number(n.price ?? t.price);
      if (!Number.isFinite(price) || price < 0) errors[`tier${i}`] = `Price for "${t.name}" must be 0 or more.`;
      return {
        ...t,
        name: str(n.name ?? t.name, 60) || t.name,
        price: Number.isFinite(price) && price >= 0 ? price : t.price,
        description: str(n.description ?? t.description, 300),
      };
    });
  }
  if (!s.currency) s.currency = '$';
  return { errors, settings: s };
}

async function runPageSpeed(url, key) {
  const api = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&key=${encodeURIComponent(key)}`;
  const r = await fetch(api, { signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`PageSpeed API returned HTTP ${r.status}`);
  const j = await r.json();
  const score = j?.lighthouseResult?.categories?.performance?.score;
  if (typeof score !== 'number') throw new Error('PageSpeed returned no performance score');
  return { performance: Math.round(score * 100), source: 'Google PageSpeed Insights (mobile)' };
}

export function createApp({ dataDir = path.join(__dirname, 'data'), env = process.env, fetchPage = safeFetch, aiOptions = {} } = {}) {
  const store = createStore(dataDir);
  const { db } = store;
  const findProspect = id => db.prospects.find(p => p.id === id);
  const needProspect = id => {
    const p = findProspect(id);
    if (!p) throw new HttpError(404, 'Prospect not found.');
    return p;
  };
  const advance = (p, from, to) => { if (p && from.includes(p.stage)) p.stage = to; };

  const routes = [
    ['GET', /^\/api\/health$/, () => {
      const ai = aiProvider(env);
      return { ok: true, ai: ai ? { kind: ai.kind, label: ai.label } : null, pagespeed: Boolean(env.PAGESPEED_API_KEY), stages: STAGES, themes: Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.name])) };
    }],

    // Prospects
    ['GET', /^\/api\/prospects$/, () => db.prospects],
    ['POST', /^\/api\/prospects$/, async req => {
      const { errors, prospect } = validateProspect(await readJson(req));
      if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', { errors });
      const now = new Date().toISOString();
      const p = { id: store.id(), createdAt: now, updatedAt: now, ...prospect };
      db.prospects.unshift(p);
      store.save();
      return [201, p];
    }],
    ['GET', /^\/api\/prospects\/([\w-]+)$/, (req, m) => needProspect(m[1])],
    ['PUT', /^\/api\/prospects\/([\w-]+)$/, async (req, m) => {
      const existing = needProspect(m[1]);
      const { errors, prospect } = validateProspect(await readJson(req), existing);
      if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', { errors });
      Object.assign(existing, prospect, { updatedAt: new Date().toISOString() });
      store.save();
      return existing;
    }],
    ['DELETE', /^\/api\/prospects\/([\w-]+)$/, (req, m) => {
      needProspect(m[1]);
      db.prospects = db.prospects.filter(p => p.id !== m[1]);
      store.db.prospects = db.prospects;
      store.save();
      return { ok: true };
    }],

    // Audits
    ['POST', /^\/api\/audit$/, async req => {
      const body = await readJson(req);
      const prospect = body.prospectId ? needProspect(body.prospectId) : null;
      const html = typeof body.html === 'string' ? body.html : '';
      let url = str(body.url, 500) || (prospect?.website ?? '');
      let page, bytes, mode, chain;
      if (html.trim()) {
        mode = 'pasted';
        page = html;
        if (url) url = normalizeWebsite(url);
      } else if (url) {
        mode = 'fetched';
        const fetched = await fetchPage(normalizeWebsite(url));
        page = fetched.body;
        bytes = fetched.bytes;
        url = fetched.finalUrl;
        chain = fetched.chain;
      } else {
        throw new HttpError(400, 'Enter a website address or paste the page HTML.');
      }
      const audit = auditHtml(page, { url, bytes });
      const record = {
        id: store.id(), prospectId: prospect?.id || null, createdAt: new Date().toISOString(),
        url, mode, chain, ...audit, details: extractDetails(page, url),
      };
      if (mode === 'fetched' && env.PAGESPEED_API_KEY) {
        try { record.pagespeed = await runPageSpeed(url, env.PAGESPEED_API_KEY); } catch (e) { record.pagespeedError = e.message; }
      }
      db.audits.unshift(record);
      db.audits.length = Math.min(db.audits.length, 500);
      if (prospect) {
        prospect.lastAuditId = record.id;
        prospect.lastScore = record.score;
        advance(prospect, ['found'], 'audited');
      }
      store.save();
      return [201, record];
    }],
    ['GET', /^\/api\/audits$/, req => {
      const pid = new URL(req.url, 'http://x').searchParams.get('prospectId');
      return db.audits.filter(a => !pid || a.prospectId === pid)
        .map(({ id, prospectId, createdAt, url, score, grade, mode }) => ({ id, prospectId, createdAt, url, score, grade, mode }));
    }],
    ['GET', /^\/api\/audits\/([\w-]+)$/, (req, m) => {
      const a = db.audits.find(x => x.id === m[1]);
      if (!a) throw new HttpError(404, 'Audit not found.');
      return a;
    }],
    ['GET', /^\/api\/audits\/([\w-]+)\/report$/, (req, m, res) => {
      const a = db.audits.find(x => x.id === m[1]);
      if (!a) throw new HttpError(404, 'Audit not found.');
      const p = a.prospectId ? findProspect(a.prospectId) : null;
      const html = renderReport(a, { businessName: p?.name || a.details?.businessName || '', url: a.url, preparedBy: db.settings.senderName });
      send(res, 200, html, { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': REPORT_CSP });
    }],

    // Generated sites
    ['POST', /^\/api\/sites$/, async req => {
      const body = await readJson(req);
      const prospect = body.prospectId ? needProspect(body.prospectId) : null;
      const { ok, errors, data } = normalizeForm(body.form || {});
      if (!ok) throw new HttpError(400, 'Please fix the highlighted fields.', { errors });
      const fallback = templateCopy(data);
      const polished = body.useAi ? await polishCopy(data, fallback, { env, ...aiOptions }) : { copy: fallback, source: 'template' };
      const copySource = polished.source === 'ai' ? `AI-assisted (${polished.label}); review every line` : 'template copy (no AI)';
      const html = renderSite(data, polished.copy, { copySource, formAction: db.settings.formAction });
      const record = {
        id: store.id(), prospectId: prospect?.id || null, createdAt: new Date().toISOString(),
        businessName: data.businessName, theme: data.theme, form: data, source: polished.source, copySource,
        warning: polished.warning || null, html,
      };
      db.sites.unshift(record);
      db.sites.length = Math.min(db.sites.length, 200);
      if (prospect) {
        prospect.lastSiteId = record.id;
        advance(prospect, ['found', 'audited'], 'sample_built');
      }
      store.save();
      const { html: _omit, ...meta } = record;
      return [201, { ...meta, previewUrl: `/api/sites/${record.id}/html`, downloadUrl: `/api/sites/${record.id}/html?download=1` }];
    }],
    ['GET', /^\/api\/sites$/, () => db.sites.map(({ html, form, ...meta }) => meta)],
    ['GET', /^\/api\/sites\/([\w-]+)\/html$/, (req, m, res) => {
      const s = db.sites.find(x => x.id === m[1]);
      if (!s) throw new HttpError(404, 'Site not found.');
      const download = new URL(req.url, 'http://x').searchParams.get('download') === '1';
      const slug = s.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
      send(res, 200, s.html, {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': GENERATED_CSP,
        ...(download && { 'content-disposition': `attachment; filename="${slug}-index.html"` }),
      });
    }],

    // Outreach drafts (never sent)
    ['POST', /^\/api\/outreach$/, async req => {
      const body = await readJson(req);
      const prospect = needProspect(body.prospectId);
      const audit = db.audits.find(a => a.prospectId === prospect.id) || null;
      let sampleLink = str(body.sampleLink, 300);
      if (sampleLink && !/^https?:\/\//i.test(sampleLink)) throw new HttpError(400, 'Sample link must start with http:// or https://', { errors: { sampleLink: 'Must be a full link.' } });
      return draftOutreach({ prospect, audit, settings: db.settings, sampleLink });
    }],

    // Settings & pricing
    ['GET', /^\/api\/settings$/, () => db.settings],
    ['PUT', /^\/api\/settings$/, async req => {
      const { errors, settings } = validateSettings(await readJson(req), db.settings);
      if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', { errors });
      db.settings = settings;
      store.db.settings = settings;
      store.save();
      return settings;
    }],
    ['POST', /^\/api\/pricing$/, async req => {
      const r = calcPricing(await readJson(req));
      if (!r.ok) throw new HttpError(400, 'Please fix the highlighted fields.', { errors: r.errors });
      return r.result;
    }],

    // Public offer page
    ['GET', /^\/api\/offer-config$/, () => ({ businessName: db.settings.senderBusiness || 'Website Makeovers', currency: db.settings.currency, tiers: db.settings.tiers })],
    ['POST', /^\/api\/leads$/, async req => {
      const b = await readJson(req);
      if (str(b.company_url, 10)) return [201, { ok: true }]; // honeypot: silently drop bots
      const lead = {
        id: store.id(), createdAt: new Date().toISOString(),
        name: str(b.name, 80), email: str(b.email, 120).toLowerCase(), business: str(b.business, 100),
        website: str(b.website, 300), message: str(b.message, 2000), tierId: str(b.tierId, 20),
      };
      const errors = {};
      if (!lead.name) errors.name = 'Please enter your name.';
      if (!EMAIL_RE.test(lead.email)) errors.email = 'Please enter a valid email.';
      if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', { errors });
      db.leads.unshift(lead);
      store.save();
      return [201, { ok: true }];
    }],
    ['GET', /^\/api\/leads$/, () => db.leads],
    ['POST', /^\/api\/test-orders$/, async req => {
      const b = await readJson(req);
      const tier = db.settings.tiers.find(t => t.id === b.tierId);
      const errors = {};
      if (!tier) errors.tierId = 'Unknown package.';
      if (!str(b.name, 80)) errors.name = 'Please enter your name.';
      if (!EMAIL_RE.test(str(b.email, 120))) errors.email = 'Please enter a valid email.';
      if (Object.keys(errors).length) throw new HttpError(400, 'Please fix the highlighted fields.', { errors });
      const order = {
        id: store.id(), createdAt: new Date().toISOString(), mode: 'test', tierId: tier.id, tierName: tier.name,
        amount: tier.price, unit: tier.unit, name: str(b.name, 80), email: str(b.email, 120).toLowerCase(),
        status: 'TEST MODE: no payment taken',
      };
      db.orders.unshift(order);
      store.save();
      return [201, order];
    }],
    ['GET', /^\/api\/orders$/, () => db.orders],
  ];

  async function handle(req, res) {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/healthz') return send(res, 200, { ok: true });
    if (!isPublic(req.method, pathname) && !passwordOk(req, env.APP_PASSWORD)) return askForPassword(res);
    if (req.method === 'GET' && STATIC[pathname]) {
      const [file, type] = STATIC[pathname];
      const body = fs.readFileSync(path.join(PUBLIC, file));
      res.writeHead(200, { 'content-type': type, 'content-security-policy': APP_CSP, 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'cache-control': 'no-cache' });
      return res.end(body);
    }
    for (const [method, re, fn] of routes) {
      const m = pathname.match(re);
      if (!m) continue;
      if (req.method !== method) continue;
      const out = await fn(req, m, res);
      if (res.headersSent) return;
      const [status, body] = Array.isArray(out) && typeof out[0] === 'number' ? out : [200, out];
      return send(res, status, body);
    }
    const known = routes.some(([, re]) => re.test(pathname));
    if (known) return send(res, 405, { error: 'Method not allowed.' });
    send(res, 404, pathname.startsWith('/api/') ? { error: 'Not found.' } : 'Not found');
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch(err => {
      if (res.headersSent) return res.end();
      if (err instanceof HttpError) return send(res, err.status, { error: err.message, ...err.extra });
      if (err instanceof UrlError) return send(res, 400, { error: err.message, errors: { url: err.message } });
      console.error(err);
      send(res, 500, { error: 'Something went wrong on the server. Check the terminal for details.' });
    });
  });
  server.store = store;
  return server;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  loadDotEnv(path.join(__dirname, '.env'));
  const port = Number(process.env.PORT) || 3200;
  const host = process.env.HOST || '127.0.0.1';
  const server = createApp({ dataDir: process.env.DATA_DIR || path.join(__dirname, 'data') });
  server.listen(port, host, () => {
    const ai = aiProvider(process.env);
    console.log(`Site Makeover Kit running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(`Offer page:            http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/offer`);
    console.log(`AI copy polish:        ${ai ? ai.label : 'off (template copy only)'}`);
    console.log(`PageSpeed Insights:    ${process.env.PAGESPEED_API_KEY ? 'on' : 'off'}`);
  });
}
