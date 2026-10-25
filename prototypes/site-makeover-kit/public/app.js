// Site Makeover Kit: single-page UI. All user/remote content is inserted via textContent (no innerHTML).
import { createLearn } from './learn.js';
import { TITLE, INTRO, LESSONS, GLOSSARY, TIPS } from './lessons.js';

const STAGE_LABELS = {
  found: 'Found', audited: 'Audited', sample_built: 'Sample built', emailed: 'Emailed (by you)',
  replied: 'Replied', call: 'Call booked', paid: 'Paid', care_plan: 'Monthly care plan', lost: 'Not interested',
};

const state = { health: null, prospects: [], settings: null, audit: null, prefill: null, lastSite: null };
const main = document.getElementById('main');

// ---------- helpers ----------
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = Boolean(v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the local server. Is it still running?'), { errors: {} });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { errors: data.errors || {} });
  return data;
}

let toastTimer;
function toast(msg, bad = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show${bad ? ' bad' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

const money = n => `${state.settings?.currency || '$'}${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const scoreClass = s => (s >= 80 ? 'good' : s >= 55 ? 'warn' : 'bad');
const fmtDate = iso => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

function field(name, label, { type = 'text', value = '', hint = '', full = false, rows, options, placeholder = '', required = false } = {}) {
  let input;
  if (type === 'textarea') input = h('textarea', { name, rows: rows || 4, placeholder }, );
  else if (type === 'select') input = h('select', { name }, options.map(([v, l]) => h('option', { value: v }, l)));
  else input = h('input', { name, type, placeholder, required, ...(type === 'number' ? { min: 0, step: 'any' } : {}) });
  input.value = value ?? '';
  return h('label', { class: `field${full ? ' full' : ''}`, 'data-field': name },
    h('span', {}, label, required ? ' *' : ''), input, hint ? h('span', { class: 'hint' }, hint) : null, h('span', { class: 'err' }));
}

function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    out[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return out;
}

function showErrors(form, errors = {}) {
  form.querySelectorAll('[data-field]').forEach(l => {
    const msg = errors[l.dataset.field];
    l.classList.toggle('invalid', Boolean(msg));
    const errEl = l.querySelector('.err');
    if (errEl) errEl.textContent = msg || '';
  });
}

async function withBusy(btn, label, fn) {
  const original = [...btn.childNodes];
  btn.disabled = true;
  btn.replaceChildren(h('span', { class: 'spinner' }), label);
  try { return await fn(); } finally {
    btn.disabled = false;
    btn.replaceChildren(...original);
  }
}

function emptyState(title, text, action) {
  return h('div', { class: 'empty' }, h('strong', {}, title), h('div', {}, text), action ? h('div', { class: 'actions', style: null }, action) : null);
}

function prospectOptions(includeNone = true) {
  return [...(includeNone ? [['', 'None (not linked to a prospect)']] : []), ...state.prospects.map(p => [p.id, p.name + (p.town ? ` (${p.town})` : '')])];
}

async function loadProspects() { state.prospects = await api('/api/prospects'); }

function go(view, params = {}) {
  const q = new URLSearchParams(params).toString();
  location.hash = `${view}${q ? `?${q}` : ''}`;
}

function pageHead(title, sub, right) {
  return h('div', { class: 'page-head' }, h('div', {}, h('h1', {}, title), h('div', { class: 'muted' }, sub)), right || null);
}

// ---------- 1. Pipeline ----------
async function viewPipeline() {
  await loadProspects();
  const ps = state.prospects;
  const active = ps.filter(p => p.stage !== 'lost');
  const revenue = ps.reduce((s, p) => s + Number(p.revenue || 0), 0);
  const paying = ps.filter(p => ['paid', 'care_plan'].includes(p.stage)).length;
  const contacted = ps.filter(p => ['emailed', 'replied', 'call', 'paid', 'care_plan', 'lost'].includes(p.stage)).length;
  const replied = ps.filter(p => ['replied', 'call', 'paid', 'care_plan'].includes(p.stage)).length;

  let editing = null;
  const form = h('form', { novalidate: true },
    h('div', { class: 'fields' },
      field('name', 'Business name', { required: true, placeholder: 'e.g. Greenleaf Gardening' }),
      field('website', 'Current website', { placeholder: 'greenleaf-example.co.uk' }),
      field('trade', 'Trade', { placeholder: 'Gardener' }),
      field('town', 'Town / city', { placeholder: 'Maidstone' }),
      field('phone', 'Public phone'),
      field('email', 'Public email', { type: 'email', hint: 'Only an address the business publishes for enquiries.' }),
      field('contactName', 'Contact name (if known)'),
      field('source', 'Where you found them', { placeholder: "Google Maps: 'gardeners in Kent'" }),
      field('priceQuoted', 'Price quoted', { type: 'number' }),
      field('revenue', 'Revenue received', { type: 'number', value: '' }),
      field('notes', 'Notes', { type: 'textarea', rows: 2, full: true }),
    ),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', type: 'submit', id: 'saveProspect' }, 'Add prospect'),
      h('button', { class: 'btn secondary hidden', type: 'button', id: 'cancelEdit', onclick: () => resetForm() }, 'Cancel edit'),
    ),
  );
  const formPanel = h('div', { class: 'panel' }, h('h2', { id: 'formTitle' }, 'Add a local business'), form);

  function resetForm() {
    editing = null;
    form.reset();
    showErrors(form, {});
    formPanel.querySelector('#formTitle').textContent = 'Add a local business';
    form.querySelector('#saveProspect').textContent = 'Add prospect';
    form.querySelector('#cancelEdit').classList.add('hidden');
  }
  function startEdit(p) {
    editing = p.id;
    for (const el of form.elements) if (el.name && el.name in p) el.value = p[el.name] ?? '';
    formPanel.querySelector('#formTitle').textContent = `Edit ${p.name}`;
    form.querySelector('#saveProspect').textContent = 'Save changes';
    form.querySelector('#cancelEdit').classList.remove('hidden');
    formPanel.scrollIntoView({ behavior: 'smooth' });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('#saveProspect');
    const data = formData(form);
    await withBusy(btn, 'Saving…', async () => {
      try {
        if (editing) await api(`/api/prospects/${editing}`, { method: 'PUT', body: data });
        else await api('/api/prospects', { method: 'POST', body: data });
        toast(editing ? 'Prospect updated' : 'Prospect added');
        render();
      } catch (err) {
        showErrors(form, err.errors);
        toast(err.message, true);
      }
    });
  });

  const list = h('div', {});
  if (!ps.length) {
    list.append(emptyState('No prospects yet',
      'Search Google Maps for a trade + town (e.g. "roofers in Leeds"), open a few websites, and add any that look outdated or break on a phone.'));
  }
  for (const p of ps) {
    const stageSel = h('select', { 'aria-label': `Stage for ${p.name}` },
      Object.entries(STAGE_LABELS).map(([v, l]) => h('option', { value: v }, l)));
    stageSel.value = p.stage;
    stageSel.addEventListener('change', async () => {
      try {
        await api(`/api/prospects/${p.id}`, { method: 'PUT', body: { stage: stageSel.value } });
        toast(`Moved to "${STAGE_LABELS[stageSel.value]}"`);
        render();
      } catch (err) { toast(err.message, true); }
    });
    const del = h('button', { class: 'btn danger sm', type: 'button' }, 'Delete');
    del.addEventListener('click', async () => {
      if (!del.classList.contains('confirm')) {
        del.classList.add('confirm');
        del.textContent = 'Click again to delete';
        setTimeout(() => { del.classList.remove('confirm'); del.textContent = 'Delete'; }, 3000);
        return;
      }
      try { await api(`/api/prospects/${p.id}`, { method: 'DELETE' }); toast('Prospect deleted'); render(); } catch (err) { toast(err.message, true); }
    });
    list.append(h('div', { class: 'prospect' },
      h('div', {},
        h('div', {}, h('strong', {}, p.name), ' ',
          typeof p.lastScore === 'number' ? h('span', { class: `badge ${scoreClass(p.lastScore)}` }, `Site score ${p.lastScore}`) : h('span', { class: 'badge' }, 'Not audited')),
        h('div', { class: 'meta' },
          [p.trade, p.town].filter(Boolean).join(' · ') || null,
          p.website ? h('a', { href: p.website, target: '_blank', rel: 'noopener noreferrer' }, p.website.replace(/^https?:\/\//, '').replace(/\/$/, '')) : 'No website',
          p.priceQuoted !== '' && p.priceQuoted !== undefined ? `Quoted ${money(p.priceQuoted)}` : null,
          Number(p.revenue) ? h('span', { class: 'badge good' }, `Paid ${money(p.revenue)}`) : null,
        ),
        p.notes ? h('div', { class: 'small muted' }, p.notes) : null,
      ),
      h('div', { class: 'side' },
        stageSel,
        h('div', { class: 'btns' },
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('audit', { prospect: p.id, run: p.website ? 1 : 0 }) }, 'Audit'),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('build', { prospect: p.id }) }, 'Build sample'),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => go('outreach', { prospect: p.id }) }, 'Email draft'),
          h('button', { class: 'btn ghost sm', type: 'button', onclick: () => startEdit(p) }, 'Edit'),
          del,
        ),
      ),
    ));
  }

  const counts = {};
  for (const p of ps) counts[p.stage] = (counts[p.stage] || 0) + 1;

  main.replaceChildren(
    pageHead('Prospects', 'Local businesses with weak websites, from first find to paying client.'),
    h('div', { class: 'stats' },
      h('div', { class: 'stat' }, h('div', { class: 'k' }, 'Active prospects'), h('div', { class: 'v' }, active.length)),
      h('div', { class: 'stat' }, h('div', { class: 'k' }, 'Contacted'), h('div', { class: 'v' }, contacted)),
      h('div', { class: 'stat' }, h('div', { class: 'k' }, 'Reply rate'), h('div', { class: 'v' }, contacted ? `${Math.round((replied / contacted) * 100)}%` : '–')),
      h('div', { class: 'stat' }, h('div', { class: 'k' }, `Revenue (${paying} paying)`), h('div', { class: 'v' }, money(revenue))),
    ),
    h('div', { class: 'panel' },
      h('h2', {}, 'Pipeline'),
      ps.length ? h('div', { class: 'stagebar' }, Object.entries(STAGE_LABELS).filter(([k]) => counts[k]).map(([k, l]) => h('span', { class: 'badge brand' }, `${l}: ${counts[k]}`))) : null,
      list,
    ),
    formPanel,
  );
}

// ---------- 2. Audit ----------
function renderAuditResult(a) {
  const ring = h('div', { class: 'ring' }, h('div', {}, String(a.score)));
  ring.style.setProperty('--pct', a.score);
  ring.style.setProperty('--col', a.score >= 80 ? 'var(--good)' : a.score >= 55 ? 'var(--warn)' : 'var(--bad)');
  const prospect = state.prospects.find(p => p.id === a.prospectId);
  const top = a.topIssues.slice(0, 3).map(id => a.checks.find(c => c.id === id));
  const d = a.details || {};
  const kv = (k, v) => [h('dt', {}, k), h('dd', {}, v && (Array.isArray(v) ? v.length : true) ? (Array.isArray(v) ? v.join(' · ') : v) : '–')];

  return h('div', {},
    h('div', { class: 'panel' },
      h('div', { class: 'scorebox' },
        ring,
        h('div', { class: 'stack' },
          h('div', {}, h('span', { class: `badge ${scoreClass(a.score)}` }, a.grade), ' ', h('span', { class: 'muted small' }, `${a.mode === 'pasted' ? 'Pasted HTML' : 'Fetched'} · ${fmtDate(a.createdAt)}`)),
          h('div', { class: 'small' }, a.url || 'No URL (pasted HTML)'),
          h('div', { class: 'small muted' }, `${Math.round(a.stats.bytes / 1024)} KB HTML · ${a.stats.scripts} scripts · ${a.stats.images} images · ~${a.stats.words} words`),
          a.pagespeed ? h('div', { class: 'small' }, h('strong', {}, 'Google PageSpeed (mobile): '), `${a.pagespeed.performance}/100`) : null,
          a.pagespeedError ? h('div', { class: 'small err' }, `PageSpeed unavailable: ${a.pagespeedError}`) : null,
        ),
      ),
      h('div', { class: 'actions' },
        h('a', { class: 'btn secondary', href: `/api/audits/${a.id}/report`, target: '_blank', rel: 'noopener' }, 'Open printable report ↗'),
        h('button', { class: 'btn', type: 'button', onclick: () => { state.prefill = { auditId: a.id, prospectId: a.prospectId }; go('build', a.prospectId ? { prospect: a.prospectId, audit: a.id } : { audit: a.id }); } }, 'Build a sample site from this'),
        prospect ? h('button', { class: 'btn secondary', type: 'button', onclick: () => go('outreach', { prospect: prospect.id }) }, 'Draft outreach email') : null,
      ),
    ),
    h('div', { class: 'grid2' },
      h('div', { class: 'panel' },
        h('h2', {}, top.length ? 'Fix these first' : 'No significant issues'),
        top.length ? h('ol', {}, top.map(c => h('li', {}, h('strong', {}, c.label), ': ', c.fix))) : h('p', { class: 'muted' }, 'This site already covers the basics. It may not be a good prospect for a makeover.'),
        h('h2', {}, 'All checks'),
        h('ul', { class: 'checks' }, a.checks.map(c => h('li', {},
          h('span', { class: `ico ${c.status}`, title: c.status }, { pass: '✓', warn: '!', fail: '✗', skip: '–' }[c.status]),
          h('div', {}, h('strong', {}, c.label), ' ', c.max ? h('span', { class: 'muted small' }, `${c.points}/${c.max}`) : null,
            h('div', { class: 'small' }, c.finding), c.status === 'warn' || c.status === 'fail' ? h('div', { class: 'fix' }, `Fix: ${c.fix}`) : null),
        ))),
      ),
      h('div', { class: 'panel' },
        h('h2', {}, 'Details found on the page'),
        h('p', { class: 'small muted' }, 'Extracted automatically. Check each one before using it.'),
        h('dl', { class: 'kv' },
          kv('Business name', d.businessName), kv('Title', d.title), kv('Phones', d.phones), kv('Emails', d.emails),
          kv('Service hints', d.serviceHints), kv('Address lines', d.addressLines), kv('Hours', d.hoursLines),
        ),
      ),
    ),
  );
}

async function viewAudit(params) {
  await loadProspects();
  const result = h('div', {});
  const pasteToggle = h('input', { type: 'checkbox', id: 'pasteMode' });
  const form = h('form', { novalidate: true },
    h('div', { class: 'fields' },
      field('prospectId', 'Prospect', { type: 'select', options: prospectOptions(), full: true }),
      field('url', 'Website address', { placeholder: 'https://example.com', full: true, hint: 'The server fetches this page once (10s timeout, 3 MB max). Private/internal addresses are blocked.' }),
      h('label', { class: 'check full' }, pasteToggle, h('span', {}, 'Paste HTML instead (offline, or when a site blocks automated requests: View Source → copy all)')),
      field('html', 'Page HTML', { type: 'textarea', rows: 8, full: true, placeholder: '<!doctype html>…' }),
    ),
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'submit', id: 'runAudit' }, 'Run audit')),
  );
  const htmlField = form.querySelector('[data-field="html"]');
  htmlField.classList.add('hidden');
  pasteToggle.addEventListener('change', () => htmlField.classList.toggle('hidden', !pasteToggle.checked));
  const sel = form.elements.prospectId;
  sel.addEventListener('change', () => {
    const p = state.prospects.find(x => x.id === sel.value);
    if (p?.website) form.elements.url.value = p.website;
  });
  if (params.get('prospect')) { sel.value = params.get('prospect'); sel.dispatchEvent(new Event('change')); }
  if (params.get('show')) {
    api(`/api/audits/${encodeURIComponent(params.get('show'))}`)
      .then(full => { state.audit = full; result.replaceChildren(renderAuditResult(full)); })
      .catch(err => toast(err.message, true));
  }

  async function run() {
    const data = formData(form);
    const body = { prospectId: data.prospectId || undefined, url: data.url };
    if (pasteToggle.checked) body.html = data.html;
    showErrors(form, {});
    if (!body.url && !body.html) { showErrors(form, { url: 'Enter a website address, or tick "Paste HTML".' }); return; }
    if (pasteToggle.checked && !body.html.trim()) { showErrors(form, { html: 'Paste the page HTML.' }); return; }
    await withBusy(form.querySelector('#runAudit'), pasteToggle.checked ? 'Checking…' : 'Fetching & checking… (up to 10s)', async () => {
      try {
        const a = await api('/api/audit', { method: 'POST', body });
        state.audit = a;
        await loadProspects();
        result.replaceChildren(renderAuditResult(a));
        result.scrollIntoView({ behavior: 'smooth' });
        loadHistory();
      } catch (err) {
        showErrors(form, err.errors);
        result.replaceChildren(h('div', { class: 'notice bad' }, h('strong', {}, 'Audit failed: '), err.message,
          pasteToggle.checked ? null : h('div', { class: 'small' }, 'Tip: some sites block automated requests. Tick "Paste HTML instead" and paste the page source.')));
      }
    });
  }
  form.addEventListener('submit', e => { e.preventDefault(); run(); });

  const history = h('ul', { class: 'history' });
  async function loadHistory() {
    try {
      const items = await api('/api/audits');
      history.replaceChildren(...(items.length ? items.slice(0, 15).map(a => h('li', {},
        h('button', { type: 'button', onclick: async () => {
          try { const full = await api(`/api/audits/${a.id}`); state.audit = full; result.replaceChildren(renderAuditResult(full)); result.scrollIntoView({ behavior: 'smooth' }); } catch (err) { toast(err.message, true); }
        } }, a.url || 'Pasted HTML'),
        h('span', {}, h('span', { class: `badge ${scoreClass(a.score)}` }, a.score), ' ', h('span', { class: 'muted small' }, fmtDate(a.createdAt))),
      )) : [h('li', { class: 'muted' }, 'No audits yet.')]));
    } catch (err) { history.replaceChildren(h('li', { class: 'err' }, err.message)); }
  }

  main.replaceChildren(
    pageHead('Website audit', '15 checks that matter to a local business: mobile, tap-to-call, contact path, freshness, speed basics.'),
    h('div', { class: 'panel' }, form),
    result,
    h('div', { class: 'panel' }, h('h2', {}, 'Recent audits'), history),
  );
  loadHistory();
  if (params.get('run') === '1' && form.elements.url.value) run();
}

// ---------- 3. Build sample ----------
async function viewBuild(params) {
  await loadProspects();
  const themes = state.health?.themes || {};
  const ai = state.health?.ai;
  const aiUsable = ai && ai.kind !== 'invalid';
  const form = h('form', { novalidate: true },
    h('div', { class: 'fields' },
      field('prospectId', 'Prospect', { type: 'select', options: prospectOptions(), full: true }),
      field('businessName', 'Business name', { required: true }),
      field('trade', 'Trade', { required: true, placeholder: 'Gardener' }),
      field('town', 'Town', { required: true }),
      field('serviceArea', 'Service area', { placeholder: 'Maidstone and surrounding villages' }),
      field('phone', 'Phone', { hint: 'Becomes the tap-to-call button.' }),
      field('email', 'Email', { type: 'email' }),
      field('services', 'Services (one per line)', { type: 'textarea', rows: 5, required: true }),
      field('hours', 'Opening hours (one per line)', { type: 'textarea', rows: 5, placeholder: 'Mon–Fri: 8am–5pm\nSat: 9am–1pm' }),
      field('address', 'Address (optional)', { full: true }),
      field('about', 'About (real facts only)', { type: 'textarea', rows: 3, full: true, hint: 'Leave blank to show a clearly marked placeholder. Never invent years, awards or qualifications.' }),
      field('testimonials', 'Real reviews (optional, one per line: "Quote — Name")', { type: 'textarea', rows: 3, full: true, hint: 'Only reviews the business really received and you may reuse, e.g. copied from their Google profile. Leave blank for a placeholder.' }),
      h('label', { class: 'check full', 'data-field': 'testimonials-confirm' }, h('input', { type: 'checkbox', name: 'testimonialsConfirmed' }), h('span', {}, 'I confirm these reviews are real and I have permission to use them.')),
      field('cta', 'Main call to action', { value: 'Call for a free quote' }),
      field('theme', 'Colour theme', { type: 'select', options: Object.entries(themes) }),
      h('label', { class: 'check full' },
        h('input', { type: 'checkbox', name: 'useAi', disabled: !aiUsable }),
        h('span', {}, aiUsable ? `Polish the copy with ${ai.label} (uses only the facts above; review every line)` : ai?.kind === 'invalid' ? `AI disabled: ${ai.label}` : 'AI copy polish is off. Set ANTHROPIC_API_KEY or a local model in .env to enable. Template copy is used.')),
    ),
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'submit', id: 'gen' }, 'Generate sample site')),
  );

  const preview = h('div', {});

  function applyPrefill(p, a) {
    const set = (k, v) => { if (v && form.elements[k] && !form.elements[k].value) form.elements[k].value = v; };
    if (p) {
      form.elements.prospectId.value = p.id;
      set('businessName', p.name); set('trade', p.trade); set('town', p.town); set('phone', p.phone); set('email', p.email);
    }
    const d = a?.details;
    if (d) {
      set('businessName', d.businessName); set('phone', d.phones?.[0]); set('email', d.emails?.[0]);
      set('services', (d.serviceHints || []).join('\n')); set('hours', (d.hoursLines || []).join('\n')); set('address', d.addressLines?.[0]);
    }
    if (p?.trade) {
      const t = p.trade.toLowerCase();
      form.elements.theme.value = /garden|landscap|tree|lawn/.test(t) ? 'forest' : /roof|build|electric|joiner|carpent|plaster/.test(t) ? 'ember' : /account|law|solicit|consult|tutor/.test(t) ? 'slate' : 'ocean';
    }
  }

  const pid = params.get('prospect');
  const prospect = pid ? state.prospects.find(p => p.id === pid) : null;
  let audit = null;
  const aid = params.get('audit') || prospect?.lastAuditId;
  if (aid) { try { audit = await api(`/api/audits/${aid}`); } catch { /* audit may have been pruned */ } }
  applyPrefill(prospect, audit);
  form.elements.prospectId.addEventListener('change', () => {
    const p = state.prospects.find(x => x.id === form.elements.prospectId.value);
    if (p) applyPrefill(p, null);
  });

  function showPreview(site) {
    const frameWrap = h('div', { class: 'frame-wrap' }, h('iframe', { src: site.previewUrl, title: 'Generated site preview', sandbox: '' }));
    const desktop = h('button', { type: 'button', class: 'on' }, 'Desktop');
    const mobile = h('button', { type: 'button' }, 'Mobile (375px)');
    desktop.addEventListener('click', () => { frameWrap.classList.remove('mobile'); desktop.classList.add('on'); mobile.classList.remove('on'); });
    mobile.addEventListener('click', () => { frameWrap.classList.add('mobile'); mobile.classList.add('on'); desktop.classList.remove('on'); });
    preview.replaceChildren(h('div', { class: 'panel' },
      site.warning ? h('div', { class: 'notice warn' }, site.warning) : null,
      h('div', { class: 'preview-bar' },
        h('div', {}, h('strong', {}, site.businessName), ' ', h('span', { class: `badge ${site.source === 'ai' ? 'brand' : ''}` }, site.copySource)),
        h('div', { class: 'actions', style: null },
          h('span', { class: 'seg' }, desktop, mobile),
          h('a', { class: 'btn secondary', href: site.previewUrl, target: '_blank', rel: 'noopener' }, 'Open full page ↗'),
          h('a', { class: 'btn', href: site.downloadUrl }, 'Download index.html'),
        ),
      ),
      frameWrap,
      h('p', { class: 'small muted' }, 'Dashed boxes are placeholders for real details only the owner can supply. Deploy the downloaded file free on Netlify Drop, Cloudflare Pages or GitHub Pages to share a preview link (see README).'),
    ));
    preview.scrollIntoView({ behavior: 'smooth' });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = formData(form);
    const { prospectId, useAi, ...rest } = data;
    await withBusy(form.querySelector('#gen'), useAi ? 'Writing copy & building…' : 'Building…', async () => {
      try {
        const site = await api('/api/sites', { method: 'POST', body: { prospectId: prospectId || undefined, useAi, form: rest } });
        showErrors(form, {});
        state.lastSite = site;
        showPreview(site);
        toast('Sample site generated');
      } catch (err) {
        showErrors(form, err.errors);
        toast(err.message, true);
      }
    });
  });

  main.replaceChildren(
    pageHead('Build a sample site', 'A fast, mobile-first one-page site to show the owner: tap-to-call, services, hours, contact form, local SEO schema.'),
    h('div', { class: 'panel' }, audit ? h('div', { class: 'notice info' }, `Prefilled from the audit of ${audit.url || 'pasted HTML'}. Check every detail.`) : null, form),
    preview,
  );
}

// ---------- 4. Outreach ----------
async function viewOutreach(params) {
  await loadProspects();
  const out = h('div', {});
  if (!state.prospects.length) {
    main.replaceChildren(pageHead('Outreach draft', 'Personalised, honest first emails.'), h('div', { class: 'panel' }, emptyState('Add a prospect first', 'Drafts are built from a prospect and their latest audit.', h('a', { class: 'btn', href: '#pipeline' }, 'Go to prospects'))));
    return;
  }
  const form = h('form', { novalidate: true },
    h('div', { class: 'fields' },
      field('prospectId', 'Prospect', { type: 'select', options: prospectOptions(false), full: true }),
      field('sampleLink', 'Link to the sample site (optional)', { full: true, placeholder: 'https://greenleaf-preview.netlify.app', hint: 'Deploy the downloaded sample first (README explains free options).' }),
    ),
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'submit', id: 'draft' }, 'Write draft')),
  );
  if (params.get('prospect')) form.elements.prospectId.value = params.get('prospect');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = formData(form);
    await withBusy(form.querySelector('#draft'), 'Writing…', async () => {
      try {
        const d = await api('/api/outreach', { method: 'POST', body: data });
        showErrors(form, {});
        const subj = h('input', { value: d.subject });
        const body = h('textarea', { rows: 16 }); body.value = d.body;
        const copy = async (el, what) => {
          try { await navigator.clipboard.writeText(el.value); toast(`${what} copied`); } catch { el.select(); toast('Press Ctrl+C to copy', true); }
        };
        const p = state.prospects.find(x => x.id === data.prospectId);
        out.replaceChildren(h('div', { class: 'panel' },
          d.warnings.length ? h('div', { class: 'notice warn' }, h('strong', {}, 'Check before sending:'), h('ul', {}, d.warnings.map(w => h('li', {}, w)))) : null,
          h('label', { class: 'field' }, h('span', {}, 'Subject'), subj),
          h('label', { class: 'field' }, h('span', {}, 'Body (edit freely)'), body),
          h('div', { class: 'actions' },
            h('button', { class: 'btn secondary', type: 'button', onclick: () => copy(subj, 'Subject') }, 'Copy subject'),
            h('button', { class: 'btn', type: 'button', onclick: () => copy(body, 'Email') }, 'Copy email'),
            p && ['found', 'audited', 'sample_built'].includes(p.stage) ? h('button', { class: 'btn secondary', type: 'button', onclick: async () => {
              try { await api(`/api/prospects/${p.id}`, { method: 'PUT', body: { stage: 'emailed' } }); toast('Marked as emailed'); await loadProspects(); } catch (err) { toast(err.message, true); }
            } }, 'I sent it: mark as emailed') : null,
          ),
          h('p', { class: 'small muted' }, 'This app never sends email. Send from your own account, one business at a time, to addresses they publish for enquiries. Honour every opt-out.'),
        ));
      } catch (err) {
        showErrors(form, err.errors);
        toast(err.message, true);
      }
    });
  });

  main.replaceChildren(
    pageHead('Outreach draft', 'Short, specific, honest: mentions two real issues from the audit and makes opting out easy.'),
    h('div', { class: 'panel' }, form),
    out,
  );
}

// ---------- 5. Pricing ----------
async function viewPricing() {
  const tiers = state.settings?.tiers || [];
  const starter = tiers.find(t => t.id === 'starter')?.price ?? 350;
  const care = tiers.find(t => t.id === 'care')?.price ?? 39;
  const form = h('form', { novalidate: true },
    h('div', { class: 'fields' },
      field('buildFee', 'Build fee (one-off)', { type: 'number', value: starter }),
      field('monthlyFee', 'Care plan (per month)', { type: 'number', value: care }),
      field('hostingCostMonthly', 'Your hosting/domain cost per month', { type: 'number', value: 2, hint: 'Static hosting is often free; a domain is roughly $10–20/year.' }),
      field('toolCostMonthly', 'Tool cost per month, per client', { type: 'number', value: 0, hint: 'e.g. a share of an AI or website-builder subscription.' }),
      field('buildHours', 'Hours to build & launch', { type: 'number', value: 5 }),
      field('monthlyHours', 'Hours per month on care', { type: 'number', value: 0.5 }),
      field('months', 'Months to model', { type: 'number', value: 12 }),
    ),
  );
  const res = h('div', {});
  let timer;
  async function calc() {
    try {
      const r = await api('/api/pricing', { method: 'POST', body: formData(form) });
      showErrors(form, {});
      const tile = (k, v) => h('div', { class: 'tile' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));
      res.replaceChildren(
        h('div', { class: 'tiles' },
          tile(`Revenue over ${r.months} months`, money(r.revenue)),
          tile('Your costs', money(r.costs)),
          tile('Profit', money(r.profit)),
          tile('Total hours', String(r.hours)),
          tile('Effective hourly rate', r.effectiveHourly === null ? '–' : money(r.effectiveHourly)),
          tile('Monthly margin per care client', money(r.monthlyMargin)),
        ),
        h('p', { class: 'small muted' }, 'Estimates from your inputs only. Track real hours per client to see your true rate.'),
      );
    } catch (err) { showErrors(form, err.errors); }
  }
  form.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(calc, 250); });
  main.replaceChildren(
    pageHead('Pricing calculator', 'Check a quote is worth your time before you send it.'),
    h('div', { class: 'grid2' }, h('div', { class: 'panel' }, form), h('div', { class: 'panel' }, h('h2', {}, 'Result'), res)),
  );
  calc();
}

// ---------- 6. Leads & orders ----------
async function viewLeads() {
  const [leads, orders] = await Promise.all([api('/api/leads'), api('/api/orders')]);
  const table = (cols, rows) => h('div', { class: 'table-scroll' }, h('table', { class: 'data' },
    h('thead', {}, h('tr', {}, cols.map(c => h('th', {}, c[0])))),
    h('tbody', {}, rows.map(r => h('tr', {}, cols.map(c => h('td', {}, c[1](r)))))),
  ));
  main.replaceChildren(
    pageHead('Leads & orders', 'Interest captured by your public offer page.', h('a', { class: 'btn secondary', href: '/offer', target: '_blank', rel: 'noopener' }, 'Open offer page ↗')),
    h('div', { class: 'panel' }, h('h2', {}, `Enquiries (${leads.length})`),
      leads.length ? table([
        ['Date', r => fmtDate(r.createdAt)], ['Name', r => r.name], ['Email', r => r.email], ['Business', r => r.business || '–'],
        ['Website', r => r.website || '–'], ['Message', r => r.message || '–'],
      ], leads) : emptyState('No enquiries yet', 'Share the offer page link when you reply to interested owners.')),
    h('div', { class: 'panel' }, h('h2', {}, `Test-mode orders (${orders.length})`),
      h('div', { class: 'notice info' }, 'Orders here are TEST MODE ONLY. No payment was taken. Real payments need a provider such as Stripe Payment Links, which is not connected.'),
      orders.length ? table([
        ['Date', r => fmtDate(r.createdAt)], ['Package', r => r.tierName], ['Amount', r => `${money(r.amount)} ${r.unit}`],
        ['Name', r => r.name], ['Email', r => r.email], ['Status', r => h('span', { class: 'badge warn' }, r.status)],
      ], orders) : emptyState('No test orders', 'Use the offer page to try the order flow.')),
  );
}

// ---------- 7. Settings ----------
async function viewSettings() {
  state.settings = await api('/api/settings');
  const s = state.settings;
  const form = h('form', { novalidate: true },
    h('h2', {}, 'You (used in email drafts and reports)'),
    h('div', { class: 'fields' },
      field('senderName', 'Your name', { value: s.senderName }),
      field('senderBusiness', 'Your business name', { value: s.senderBusiness, hint: 'Shown on the offer page.' }),
      field('replyEmail', 'Reply email', { type: 'email', value: s.replyEmail }),
      field('currency', 'Currency symbol', { value: s.currency }),
      field('postalAddress', 'Physical postal address', { value: s.postalAddress, full: true, hint: 'Required in US commercial email (CAN-SPAM). A registered PO box or mail-receiving address can be used.' }),
      field('formAction', 'Form endpoint for generated sites (optional)', { value: s.formAction, full: true, placeholder: 'https://formspree.io/f/xxxxxxx', hint: 'If empty, sample sites use a mailto: form (fine for previews, unreliable live).' }),
    ),
    h('h2', {}, 'Packages (offer page & pricing)'),
    ...s.tiers.map((t, i) => h('div', { class: 'fields' },
      field(`tier${i}_name`, `Package ${i + 1} name`, { value: t.name }),
      field(`tier${i}_price`, `Price (${t.unit})`, { type: 'number', value: t.price }),
      field(`tier${i}_description`, 'Description', { value: t.description, full: true }),
      h('span', { class: 'err full', 'data-field': `tier${i}` }),
    )),
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'submit', id: 'saveSettings' }, 'Save settings')),
  );
  form.querySelectorAll('span.err[data-field]').forEach(sp => sp.replaceWith(h('label', { class: 'full', 'data-field': sp.dataset.field }, h('span', { class: 'err' }))));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = formData(form);
    const body = {
      senderName: d.senderName, senderBusiness: d.senderBusiness, replyEmail: d.replyEmail, currency: d.currency,
      postalAddress: d.postalAddress, formAction: d.formAction,
      tiers: s.tiers.map((_, i) => ({ name: d[`tier${i}_name`], price: d[`tier${i}_price`], description: d[`tier${i}_description`] })),
    };
    await withBusy(form.querySelector('#saveSettings'), 'Saving…', async () => {
      try { state.settings = await api('/api/settings', { method: 'PUT', body }); showErrors(form, {}); toast('Settings saved'); } catch (err) { showErrors(form, err.errors); toast(err.message, true); }
    });
  });
  const ai = state.health?.ai;
  main.replaceChildren(
    pageHead('Settings', 'Stored locally in data/db.json.'),
    h('div', { class: 'panel' }, form),
    h('div', { class: 'panel' }, h('h2', {}, 'Integrations (configured in .env)'),
      h('dl', { class: 'kv' },
        h('dt', {}, 'AI copy polish'), h('dd', {}, ai ? ai.label : 'Off. Template copy only.'),
        h('dt', {}, 'PageSpeed Insights'), h('dd', {}, state.health?.pagespeed ? 'On (mobile performance score added to audits)' : 'Off (set PAGESPEED_API_KEY to enable)'),
        h('dt', {}, 'Email sending'), h('dd', {}, 'Not available by design. Drafts only.'),
        h('dt', {}, 'Payments'), h('dd', {}, 'Test mode only. No real payments.'),
      )),
  );
}

// ---------- start here (course) ----------
const learn = createLearn({
  storageKey: 'siteMakeoverKit.learn', title: TITLE, intro: INTRO, lessons: LESSONS, glossary: GLOSSARY, tips: TIPS,
  onAction: (action, btn) => {
    if (action === 'start') go('start');
    else if (action === 'practice') withBusy(btn, 'Setting up…', startPractice).catch(err => toast(err.message, true));
    else if (action.startsWith('url:')) window.open(action.slice(4), '_blank', 'noopener');
    else location.hash = action;
  },
});

// Practice round: a SAMPLE prospect plus an audit of a deliberately outdated SAMPLE page.
async function startPractice() {
  await loadProspects();
  let p = state.prospects.find(x => x.name === "Bob's Gardens (SAMPLE)");
  if (!p) {
    p = await api('/api/prospects', { method: 'POST', body: { name: "Bob's Gardens (SAMPLE)", trade: 'Gardener', town: 'Maidstone', source: 'Practice round (fictional business)' } });
  }
  const html = await fetch('/assets/sample-old-site.html').then(r => r.text());
  const a = await api('/api/audit', { method: 'POST', body: { prospectId: p.id, html } });
  toast('Practice audit done. Read “Fix these first”, then build the sample site.');
  go('audit', { prospect: p.id, show: a.id });
}

async function viewStart() {
  learn.render(main);
}

// ---------- router ----------
const VIEWS = { start: viewStart, pipeline: viewPipeline, audit: viewAudit, build: viewBuild, outreach: viewOutreach, pricing: viewPricing, leads: viewLeads, settings: viewSettings };

async function render() {
  const [name, query] = (location.hash.slice(1) || 'pipeline').split('?');
  const view = VIEWS[name] ? name : 'pipeline';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  main.replaceChildren(h('div', { class: 'empty' }, h('span', { class: 'spinner' }), ' Loading…'));
  try {
    await VIEWS[view](new URLSearchParams(query || ''));
    if (view !== 'start') learn.tip(main, view, main.querySelector(':scope > .page-head'));
  } catch (err) {
    main.replaceChildren(h('div', { class: 'notice bad' }, h('strong', {}, 'Could not load this page. '), err.message));
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
(async () => {
  try {
    [state.health, state.settings] = await Promise.all([api('/api/health'), api('/api/settings')]);
  } catch (err) {
    main.replaceChildren(h('div', { class: 'notice bad' }, err.message));
    return;
  }
  render();
})();
