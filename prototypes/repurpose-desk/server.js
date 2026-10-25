// Repurpose Desk - local server (Node >= 20, no required dependencies).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, newId } from './lib/db.js';
import { DELIVERABLES, generateDeliverable } from './lib/generate.js';
import { runQC } from './lib/qc.js';
import { analyze, formatTime } from './lib/transcript.js';
import { getProvider, AIError } from './lib/ai.js';
import { toHTML, toMarkdown } from './lib/export.js';
import { askForPassword, passwordOk } from './lib/auth.js';

// Reachable without the workspace password: the customer-facing offer page and its form endpoints.
const PUBLIC_PATHS = new Set(['/offer', '/offer.html', '/offer.js', '/styles.css', '/healthz']);
const isPublic = (pathname) => PUBLIC_PATHS.has(pathname) || pathname.startsWith('/api/public/');

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, 'public');
const MAX_BODY = 3 * 1024 * 1024;

export const PROSPECT_STAGES = ['identified', 'sample_sent', 'replied', 'call_booked', 'pilot_paid', 'retainer', 'lost'];
const CLIENT_STATUSES = ['pilot', 'active', 'paused', 'ended'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ---------- validation helpers ----------
function str(v, field, { max = 500, required = false } = {}) {
  if (v == null || v === '') {
    if (required) throw new HttpError(400, `${field} is required.`);
    return '';
  }
  if (typeof v !== 'string') throw new HttpError(400, `${field} must be text.`);
  const s = v.trim();
  if (required && !s) throw new HttpError(400, `${field} is required.`);
  if (s.length > max) throw new HttpError(400, `${field} is too long (max ${max} characters).`);
  return s;
}
function num(v, field, { min = 0, max = 1e7 } = {}) {
  if (v === '' || v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${field} must be a number between ${min} and ${max}.`);
  return n;
}
function list(v, field) {
  if (Array.isArray(v)) return v.map((x) => str(String(x), field, { max: 80 })).filter(Boolean).slice(0, 50);
  return str(v, field, { max: 2000 }).split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 50);
}
function url(v, field) {
  const s = str(v, field, { max: 500 });
  if (!s) return '';
  try {
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
    return u.toString();
  } catch { throw new HttpError(400, `${field} must be a valid http(s) URL.`); }
}
function email(v, field, required) {
  const s = str(v, field, { max: 200, required });
  if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new HttpError(400, `${field} must be a valid email address.`);
  return s;
}
function oneOf(v, field, options, dflt) {
  if (v == null || v === '') return dflt;
  if (!options.includes(v)) throw new HttpError(400, `${field} must be one of: ${options.join(', ')}.`);
  return v;
}

// ---------- shaping ----------
function clientFrom(body, prev = {}) {
  return {
    ...prev,
    name: str(body.name, 'Client name', { required: true, max: 120 }),
    show: str(body.show, 'Show/channel', { max: 160 }),
    contact: str(body.contact, 'Contact', { max: 200 }),
    status: oneOf(body.status, 'Status', CLIENT_STATUSES, prev.status || 'pilot'),
    monthlyRate: num(body.monthlyRate, 'Monthly rate', { max: 100000 }),
    platforms: list(body.platforms ?? '', 'Platforms'),
    voice: {
      tone: str(body.voice?.tone, 'Tone', { max: 600 }),
      audience: str(body.voice?.audience, 'Audience', { max: 400 }),
      cta: str(body.voice?.cta, 'Call to action', { max: 300 }),
      bannedWords: list(body.voice?.bannedWords ?? '', 'Banned words'),
      signaturePhrases: list(body.voice?.signaturePhrases ?? '', 'Signature phrases'),
      samplePosts: str(body.voice?.samplePosts, 'Sample posts', { max: 12000 }),
    },
  };
}

function prospectFrom(body, prev = {}) {
  return {
    ...prev,
    name: str(body.name, 'Name', { required: true, max: 160 }),
    platform: str(body.platform, 'Platform', { max: 80 }),
    link: url(body.link, 'Link'),
    audience: str(body.audience, 'Audience size', { max: 80 }),
    gap: str(body.gap, 'Gap', { max: 400 }),
    contactRoute: str(body.contactRoute, 'Contact route', { max: 200 }),
    stage: oneOf(body.stage, 'Stage', PROSPECT_STAGES, prev.stage || 'identified'),
    dealValue: num(body.dealValue, 'Deal value', { max: 100000 }),
    notes: str(body.notes, 'Notes', { max: 4000 }),
  };
}

function jobSummary(j) {
  const ds = Object.values(j.deliverables || {});
  return {
    id: j.id, clientId: j.clientId, title: j.title, createdAt: j.createdAt, minutesSpent: j.minutesSpent || 0,
    status: j.status, deliverableCount: ds.length, approvedCount: ds.filter((d) => d.status === 'approved').length,
  };
}

function monthKey(d = new Date()) { return new Date(d).toISOString().slice(0, 7); }

function dashboard(db) {
  const month = monthKey();
  const activeClients = db.clients.filter((c) => c.status === 'active' || c.status === 'pilot');
  const mrr = db.clients.filter((c) => c.status === 'active').reduce((s, c) => s + (c.monthlyRate || 0), 0);
  const paymentsThisMonth = (db.payments || []).filter((p) => monthKey(p.date) === month);
  const revenueMonth = paymentsThisMonth.reduce((s, p) => s + p.amount, 0);
  const revenueAll = (db.payments || []).reduce((s, p) => s + p.amount, 0);
  const minutesMonth = db.jobs.filter((j) => monthKey(j.createdAt) === month).reduce((s, j) => s + (j.minutesSpent || 0), 0);
  const stages = Object.fromEntries(PROSPECT_STAGES.map((s) => [s, db.prospects.filter((p) => p.stage === s).length]));
  const reached = db.prospects.filter((p) => p.stage !== 'identified').length;
  const responded = db.prospects.filter((p) => ['replied', 'call_booked', 'pilot_paid', 'retainer'].includes(p.stage)).length;
  const paying = db.prospects.filter((p) => ['pilot_paid', 'retainer'].includes(p.stage)).length;
  return {
    month,
    activeClients: activeClients.length,
    mrr,
    revenueMonth,
    revenueAll,
    hoursMonth: Math.round((minutesMonth / 60) * 10) / 10,
    effectiveHourly: minutesMonth > 0 ? Math.round((revenueMonth / (minutesMonth / 60)) * 100) / 100 : null,
    jobsMonth: db.jobs.filter((j) => monthKey(j.createdAt) === month).length,
    approvedDeliverables: db.jobs.reduce((s, j) => s + Object.values(j.deliverables || {}).filter((d) => d.status === 'approved').length, 0),
    funnel: {
      stages,
      interest: { prospectsReached: reached, replies: responded, leadsFromOfferPage: db.leads.length, testCheckouts: db.testOrders.length },
      payment: { payingProspects: paying, paymentsLogged: (db.payments || []).length, revenueAll },
      replyRate: reached ? Math.round((responded / reached) * 100) : null,
    },
  };
}

// ---------- server ----------
export async function createApp({ dataDir = process.env.DATA_DIR || join(ROOT, 'data'), env = process.env, deps = {} } = {}) {
  const store = await new Store(dataDir).load();
  const db = store.data;
  db.payments ||= [];

  const routes = [];
  const route = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([\\w-]+)'; }) + '$');
    routes.push({ method, re, keys, handler });
  };
  const find = (coll, id, label) => {
    const item = db[coll].find((x) => x.id === id);
    if (!item) throw new HttpError(404, `${label} not found.`);
    return item;
  };

  route('GET', '/api/meta', () => {
    const p = getProvider(env);
    return { provider: p.name, providerLabel: p.label, model: p.model, deliverables: DELIVERABLES, stages: PROSPECT_STAGES, clientStatuses: CLIENT_STATUSES };
  });
  route('GET', '/api/dashboard', () => dashboard(db));

  // Settings
  route('GET', '/api/settings', () => db.settings);
  route('PUT', '/api/settings', async ({ body }) => {
    db.settings = {
      yourName: str(body.yourName, 'Your name', { max: 120 }),
      businessName: str(body.businessName, 'Business name', { max: 120 }) || 'Repurpose Desk',
      pilotPrice: num(body.pilotPrice, 'Pilot price', { max: 100000 }),
      monthlyPrice: num(body.monthlyPrice, 'Monthly price', { max: 100000 }),
      episodesPerMonth: num(body.episodesPerMonth, 'Episodes per month', { max: 100 }),
      toolCostsMonthly: num(body.toolCostsMonthly, 'Tool costs', { max: 100000 }),
      targetHourlyRate: num(body.targetHourlyRate, 'Target hourly rate', { max: 10000 }),
    };
    await store.save();
    return db.settings;
  });

  // Clients
  route('GET', '/api/clients', () => db.clients);
  route('POST', '/api/clients', async ({ body }) => {
    const c = { id: newId(), createdAt: new Date().toISOString(), ...clientFrom(body) };
    db.clients.push(c);
    await store.save();
    return c;
  });
  route('PUT', '/api/clients/:id', async ({ params, body }) => {
    const c = find('clients', params.id, 'Client');
    Object.assign(c, clientFrom(body, c));
    await store.save();
    return c;
  });
  route('DELETE', '/api/clients/:id', async ({ params }) => {
    find('clients', params.id, 'Client');
    if (db.jobs.some((j) => j.clientId === params.id)) throw new HttpError(409, 'This client has episodes. Delete those first, or set the client to "ended".');
    db.clients = db.clients.filter((c) => c.id !== params.id);
    await store.save();
    return { ok: true };
  });

  // Jobs (episodes)
  route('GET', '/api/jobs', () => db.jobs.map(jobSummary).reverse());
  route('POST', '/api/jobs', async ({ body }) => {
    const clientId = str(body.clientId, 'Client', { required: true, max: 20 });
    find('clients', clientId, 'Client');
    const transcript = str(body.transcript, 'Transcript', { required: true, max: 2_000_000 });
    const a = analyze(transcript);
    if (a.stats.words < 50) throw new HttpError(400, 'Transcript is too short (need at least ~50 words).');
    const j = {
      id: newId(), clientId, createdAt: new Date().toISOString(), status: 'drafting',
      title: str(body.title, 'Title', { max: 200 }) || 'Untitled episode',
      sourceUrl: url(body.sourceUrl, 'Source URL'),
      transcript, minutesSpent: 0, deliverables: {},
    };
    db.jobs.push(j);
    await store.save();
    return j;
  });
  route('GET', '/api/jobs/:id', ({ params }) => find('jobs', params.id, 'Episode'));
  route('PUT', '/api/jobs/:id', async ({ params, body }) => {
    const j = find('jobs', params.id, 'Episode');
    if (body.title !== undefined) j.title = str(body.title, 'Title', { max: 200 }) || j.title;
    if (body.sourceUrl !== undefined) j.sourceUrl = url(body.sourceUrl, 'Source URL');
    if (body.status !== undefined) j.status = oneOf(body.status, 'Status', ['drafting', 'in_review', 'delivered'], j.status);
    if (body.addMinutes !== undefined) j.minutesSpent = Math.max(0, (j.minutesSpent || 0) + num(body.addMinutes, 'Minutes', { min: -600, max: 600 }));
    await store.save();
    return j;
  });
  route('DELETE', '/api/jobs/:id', async ({ params }) => {
    find('jobs', params.id, 'Episode');
    db.jobs = db.jobs.filter((j) => j.id !== params.id);
    await store.save();
    return { ok: true };
  });
  route('GET', '/api/jobs/:id/analysis', ({ params }) => {
    const a = analyze(find('jobs', params.id, 'Episode').transcript);
    return {
      stats: a.stats, keywords: a.keywords,
      top: a.top.slice(0, 8).map((s) => ({ text: s.text, time: formatTime(s.start), score: s.score })),
      clips: a.clips.map((c) => ({ ...c, startLabel: formatTime(c.start), endLabel: formatTime(c.end) })),
      chapters: a.chapters.map((c) => ({ ...c, time: formatTime(c.start) })),
    };
  });
  route('POST', '/api/jobs/:id/generate', async ({ params, body }) => {
    const j = find('jobs', params.id, 'Episode');
    const client = find('clients', j.clientId, 'Client');
    const types = Array.isArray(body.types) && body.types.length ? body.types : Object.keys(DELIVERABLES);
    for (const t of types) if (!DELIVERABLES[t]) throw new HttpError(400, `Unknown deliverable: ${t}`);
    const mode = oneOf(body.mode, 'Mode', ['auto', 'template', 'ai'], 'auto');
    const results = {};
    const errors = {};
    for (const type of types) {
      try {
        const g = await generateDeliverable(type, j, client, { mode, env, deps });
        j.deliverables[type] = {
          ...g, status: 'draft', generatedAt: new Date().toISOString(), editedAt: null,
          qc: runQC(type, g.content, { transcript: j.transcript, client, title: j.title }),
        };
        results[type] = j.deliverables[type];
      } catch (err) {
        errors[type] = err instanceof AIError ? err.message : `Generation failed: ${err.message}`;
      }
    }
    j.status = 'drafting';
    await store.save();
    if (!Object.keys(results).length) throw new HttpError(502, Object.values(errors)[0] || 'Generation failed.');
    return { job: j, errors };
  });
  route('PUT', '/api/jobs/:id/deliverables/:type', async ({ params, body }) => {
    const j = find('jobs', params.id, 'Episode');
    const client = find('clients', j.clientId, 'Client');
    if (!DELIVERABLES[params.type]) throw new HttpError(404, 'Unknown deliverable.');
    const content = str(body.content, 'Content', { required: true, max: 60000 });
    const prev = j.deliverables[params.type] || { mode: 'manual', provider: 'none' };
    j.deliverables[params.type] = { ...prev, content, status: 'draft', editedAt: new Date().toISOString(), qc: runQC(params.type, content, { transcript: j.transcript, client, title: j.title }) };
    await store.save();
    return j.deliverables[params.type];
  });
  route('POST', '/api/jobs/:id/deliverables/:type/approve', async ({ params, body }) => {
    const j = find('jobs', params.id, 'Episode');
    const d = j.deliverables[params.type];
    if (!d) throw new HttpError(404, 'Generate this deliverable first.');
    const override = str(body.overrideNote, 'Override note', { max: 500 });
    if (d.qc?.status === 'fail' && !override) throw new HttpError(409, 'Quality checks failed. Fix the issues, or approve with an override note explaining why.');
    d.status = 'approved';
    d.approvedAt = new Date().toISOString();
    d.overrideNote = override || null;
    const all = Object.values(j.deliverables);
    if (all.length && all.every((x) => x.status === 'approved')) j.status = 'in_review';
    await store.save();
    return d;
  });
  route('POST', '/api/jobs/:id/deliverables/:type/unapprove', async ({ params }) => {
    const d = find('jobs', params.id, 'Episode').deliverables[params.type];
    if (!d) throw new HttpError(404, 'Deliverable not found.');
    d.status = 'draft';
    await store.save();
    return d;
  });
  route('GET', '/api/jobs/:id/export', ({ params, query }) => {
    const j = find('jobs', params.id, 'Episode');
    const client = db.clients.find((c) => c.id === j.clientId);
    const includeDrafts = query.get('drafts') === '1';
    const safe = (j.title || 'episode').replace(/[^\w-]+/g, '-').slice(0, 60);
    if (query.get('format') === 'html') return { raw: toHTML(j, client, { includeDrafts }), type: MIME['.html'], filename: `${safe}-content-pack.html` };
    return { raw: toMarkdown(j, client, { includeDrafts }), type: 'text/markdown; charset=utf-8', filename: `${safe}-content-pack.md` };
  });

  // Ad-hoc QC
  route('POST', '/api/qc', ({ body }) => {
    const type = oneOf(body.type, 'Type', Object.keys(DELIVERABLES), 'linkedin');
    return runQC(type, str(body.content, 'Content', { required: true, max: 60000 }), { transcript: str(body.transcript, 'Transcript', { max: 2_000_000 }) });
  });

  // Prospects
  route('GET', '/api/prospects', () => db.prospects);
  route('POST', '/api/prospects', async ({ body }) => {
    const p = { id: newId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...prospectFrom(body) };
    db.prospects.push(p);
    await store.save();
    return p;
  });
  route('PUT', '/api/prospects/:id', async ({ params, body }) => {
    const p = find('prospects', params.id, 'Prospect');
    Object.assign(p, prospectFrom({ ...p, ...body }, p), { updatedAt: new Date().toISOString() });
    await store.save();
    return p;
  });
  route('DELETE', '/api/prospects/:id', async ({ params }) => {
    find('prospects', params.id, 'Prospect');
    db.prospects = db.prospects.filter((p) => p.id !== params.id);
    await store.save();
    return { ok: true };
  });
  route('GET', '/api/prospects.csv', () => {
    const cols = ['name', 'platform', 'link', 'audience', 'gap', 'contactRoute', 'stage', 'dealValue', 'notes', 'createdAt', 'updatedAt'];
    const cell = (v) => {
      let s = String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = `'${s}`; // avoid spreadsheet formula injection
      return `"${s.replace(/"/g, '""')}"`;
    };
    return { raw: [cols.join(','), ...db.prospects.map((p) => cols.map((c) => cell(p[c])).join(','))].join('\n'), type: 'text/csv; charset=utf-8', filename: 'prospects.csv' };
  });

  // Payments (real money you record manually)
  route('GET', '/api/payments', () => db.payments);
  route('POST', '/api/payments', async ({ body }) => {
    const p = {
      id: newId(),
      clientId: str(body.clientId, 'Client', { max: 20 }),
      amount: num(body.amount, 'Amount', { min: 0.01, max: 100000 }),
      date: str(body.date, 'Date', { max: 10 }) || new Date().toISOString().slice(0, 10),
      note: str(body.note, 'Note', { max: 300 }),
    };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) throw new HttpError(400, 'Date must be YYYY-MM-DD.');
    if (p.clientId) find('clients', p.clientId, 'Client');
    db.payments.push(p);
    await store.save();
    return p;
  });
  route('DELETE', '/api/payments/:id', async ({ params }) => {
    find('payments', params.id, 'Payment');
    db.payments = db.payments.filter((p) => p.id !== params.id);
    await store.save();
    return { ok: true };
  });

  // Offer page (public) - interest capture + TEST-MODE checkout only
  route('GET', '/api/public/offer', () => ({ businessName: db.settings.businessName, pilotPrice: db.settings.pilotPrice, monthlyPrice: db.settings.monthlyPrice, episodesPerMonth: db.settings.episodesPerMonth }));
  route('POST', '/api/public/leads', async ({ body }) => {
    if (body.website) return { ok: true }; // honeypot
    const lead = {
      id: newId(), createdAt: new Date().toISOString(),
      name: str(body.name, 'Name', { required: true, max: 120 }),
      email: email(body.email, 'Email', true),
      show: str(body.show, 'Show link or name', { max: 300 }),
      interest: oneOf(body.interest, 'Interest', ['pilot', 'monthly', 'question'], 'question'),
      message: str(body.message, 'Message', { max: 2000 }),
    };
    db.leads.push(lead);
    await store.save();
    return { ok: true };
  });
  route('POST', '/api/public/test-checkout', async ({ body }) => {
    const order = {
      id: newId(), createdAt: new Date().toISOString(), testMode: true,
      plan: oneOf(body.plan, 'Plan', ['pilot', 'monthly'], 'pilot'),
      email: email(body.email, 'Email', true),
      amount: body.plan === 'monthly' ? db.settings.monthlyPrice : db.settings.pilotPrice,
    };
    db.testOrders.push(order);
    await store.save();
    return { ok: true, testMode: true, message: 'TEST MODE: no payment was taken. This click was recorded as a purchase-intent signal.', order };
  });
  route('GET', '/api/leads', () => ({ leads: db.leads, testOrders: db.testOrders }));
  route('DELETE', '/api/leads/:id', async ({ params }) => {
    find('leads', params.id, 'Lead');
    db.leads = db.leads.filter((l) => l.id !== params.id);
    await store.save();
    return { ok: true };
  });
  route('GET', '/api/backup', () => ({ raw: JSON.stringify(db, null, 2), type: 'application/json', filename: `repurpose-desk-backup-${new Date().toISOString().slice(0, 10)}.json` }));

  async function serveStatic(pathname, res) {
    let p = pathname === '/' ? '/index.html' : pathname === '/offer' ? '/offer.html' : pathname;
    const file = normalize(join(PUBLIC, p));
    if (!file.startsWith(PUBLIC)) throw new HttpError(403, 'Forbidden');
    if (!existsSync(file) || !(await stat(file)).isFile()) throw new HttpError(404, 'Not found');
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', ...SECURITY_HEADERS });
    res.end(await readFile(file));
  }

  const server = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost');
    try {
      if (u.pathname === '/healthz') return sendJson(res, 200, { ok: true });
      if (!isPublic(u.pathname) && !passwordOk(req, env.REQUIRE_LOGIN === 'false' ? '' : env.APP_PASSWORD, env.APP_USERNAME)) return askForPassword(res);
      if (!u.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
        return await serveStatic(u.pathname, res);
      }
      // Reject cross-site browser writes to the local API.
      if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw new HttpError(403, 'Cross-origin request blocked.');
      const r = routes.find((x) => x.method === req.method && x.re.test(u.pathname));
      if (!r) throw new HttpError(404, 'Unknown API route.');
      const m = u.pathname.match(r.re);
      const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
      const body = ['POST', 'PUT'].includes(req.method) ? await readJson(req) : {};
      const out = await r.handler({ params, body, query: u.searchParams });
      if (out && out.raw !== undefined) {
        res.writeHead(200, { 'content-type': out.type, 'content-disposition': `attachment; filename="${out.filename}"`, ...SECURITY_HEADERS });
        return res.end(out.raw);
      }
      sendJson(res, 200, out);
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error(err);
      sendJson(res, status, { error: status === 500 ? 'Internal error - see server log.' : err.message });
    }
  });
  return { server, store };
}

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'SAMEORIGIN',
  'content-security-policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'self'",
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...SECURITY_HEADERS });
  res.end(JSON.stringify(obj));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new HttpError(413, 'Request too large (max 3 MB).')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { reject(new HttpError(400, 'Invalid JSON body.')); }
    });
    req.on('error', reject);
  });
}

function loadDotEnv() {
  const f = join(ROOT, '.env');
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  loadDotEnv();
  const port = Number(process.env.PORT || 3100);
  const host = process.env.HOST || '127.0.0.1';
  const { server } = await createApp();
  server.listen(port, host, () => {
    const p = getProvider();
    console.log(`Repurpose Desk running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
    console.log(`Offer page:            http://localhost:${port}/offer`);
    console.log(`AI provider:           ${p.label}${p.model ? ` (${p.model})` : ''}`);
  });
}
