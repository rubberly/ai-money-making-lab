// Repurpose Desk front-end (vanilla JS, hash routing). All user content is escaped.
import { createLearn } from './learn.js';
import { TITLE, INTRO, LESSONS, GLOSSARY, TIPS } from './lessons.js';

const app = document.getElementById('app');
let META = null;

const learn = createLearn({
  storageKey: 'repurposeDesk.learn', title: TITLE, intro: INTRO, lessons: LESSONS, glossary: GLOSSARY, tips: TIPS,
  onAction: (action, btn) => {
    if (action === 'start') location.hash = '#/start';
    else if (action === 'practice') busy(btn, startPractice);
    else if (action.startsWith('url:')) window.open(action.slice(4), '_blank', 'noopener');
    else location.hash = action;
  },
});

// Practice round: a SAMPLE client + SAMPLE episode, created once and reused.
async function startPractice() {
  const clients = await api('/api/clients');
  let client = clients.find((c) => c.name === 'Dana (SAMPLE)');
  if (!client) {
    client = await api('/api/clients', { method: 'POST', body: {
      name: 'Dana (SAMPLE)', show: 'Flour and Profit (SAMPLE podcast)', status: 'pilot', monthlyRate: '0',
      platforms: 'newsletter, LinkedIn, X',
      voice: { tone: 'Warm, plain-spoken, practical. Short sentences. UK spelling.', audience: 'Home bakers thinking of selling at markets', cta: 'Send this to one friend who bakes', bannedWords: 'hustle, crush it' },
    } });
  }
  const jobs = await api('/api/jobs');
  let job = jobs.find((j) => j.clientId === client.id);
  if (!job) {
    const transcript = await fetch('/sample-transcript.txt').then((r) => r.text());
    job = await api('/api/jobs', { method: 'POST', body: { clientId: client.id, title: 'SAMPLE - Pricing your first market stall', transcript } });
  }
  toast('Practice episode ready. Click “Generate all 6”.');
  location.hash = `#/jobs/${job.id}`;
}

async function viewStart() {
  setNav('start');
  learn.render(app);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => (n == null ? '—' : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
const STAGE_LABELS = { identified: 'Identified', sample_sent: 'Free sample sent', replied: 'Replied', call_booked: 'Call booked', pilot_paid: 'Paid pilot', retainer: 'Monthly retainer', lost: 'Not now / lost' };

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = `toast${err ? ' err' : ''}`;
  t.setAttribute('role', err ? 'alert' : 'status');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), err ? 6000 : 3000);
}

async function busy(btn, fn) {
  const label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner" aria-hidden="true"></span> Working…`;
  try { return await fn(); } catch (e) { toast(e.message, true); } finally { btn.disabled = false; btn.innerHTML = label; }
}

function formData(form) {
  const out = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    const path = el.name.split('.');
    let o = out;
    while (path.length > 1) { const k = path.shift(); o = o[k] ||= {}; }
    o[path[0]] = el.value;
  }
  return out;
}

function setNav(name) {
  document.querySelectorAll('nav.side a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
}

// ---------------- Views ----------------

async function viewDashboard() {
  setNav('dashboard');
  const [d, s] = await Promise.all([api('/api/dashboard'), api('/api/settings')]);
  const f = d.funnel;
  const next = [];
  if (!f.interest.prospectsReached && !Object.values(f.stages).some(Boolean)) next.push('Add 20 creators who post long-form content but have no newsletter/LinkedIn presence (Prospects).');
  if (f.stages.identified > 0) next.push(`${f.stages.identified} prospect(s) identified but not contacted - make a free sample for the best 3.`);
  if (f.stages.replied + f.stages.call_booked > 0) next.push('You have replies - offer the paid pilot at ' + money(s.pilotPrice) + '.');
  if (!next.length) next.push('Keep the loop going: 5 new prospects, 1 free sample per day.');
  const lp = learn.progress();
  const course = lp.done < lp.total
    ? `<div class="card spread"><div><h2 style="margin:0">New here? Start with the course</h2><p class="small muted" style="margin:4px 0 0">${lp.done} of ${lp.total} lessons done. Each lesson takes you step by step to your first paid client.</p></div><a class="btn primary" href="#/start">${lp.done ? 'Continue the course' : 'Start here'}</a></div>`
    : '';
  app.innerHTML = `
    <h1>Dashboard</h1><p class="sub">${esc(d.month)} · interest is not revenue: the right column is what counts.</p>${course}
    <div class="grid g4 stats">
      <div class="stat"><div class="v">${money(d.revenueMonth)}</div><div class="l">Revenue this month (logged)</div></div>
      <div class="stat"><div class="v">${money(d.mrr)}</div><div class="l">Recurring / month (active clients)</div></div>
      <div class="stat"><div class="v">${d.hoursMonth}h</div><div class="l">Delivery time this month</div></div>
      <div class="stat"><div class="v">${d.effectiveHourly == null ? '—' : money(d.effectiveHourly)}</div><div class="l">Effective hourly rate</div></div>
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h2>Evidence of interest</h2>
        <div class="funnel">
          <div><b>${f.interest.prospectsReached}</b>Prospects contacted</div>
          <div><b>${f.interest.replies}</b>Replied+</div>
          <div><b>${f.replyRate == null ? '—' : f.replyRate + '%'}</b>Reply rate</div>
          <div><b>${f.interest.leadsFromOfferPage}</b>Offer-page leads</div>
          <div><b>${f.interest.testCheckouts}</b>Test checkouts</div>
        </div></div>
      <div class="card"><h2>Evidence of payment</h2>
        <div class="funnel">
          <div><b>${f.payment.payingProspects}</b>Paying prospects</div>
          <div><b>${f.payment.paymentsLogged}</b>Payments logged</div>
          <div><b>${money(f.payment.revenueAll)}</b>Revenue all-time</div>
        </div></div>
    </div>
    <div class="card"><h2>Pipeline</h2><div class="funnel">${Object.entries(f.stages).map(([k, v]) => `<div><b>${v}</b>${esc(STAGE_LABELS[k])}</div>`).join('')}</div></div>
    <div class="card"><h2>Suggested next actions</h2><ul>${next.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
      <p class="small muted">${d.jobsMonth} episode(s) this month · ${d.approvedDeliverables} approved deliverable(s) all-time · ${d.activeClients} pilot/active client(s)</p></div>`;
}

// ----- Clients -----
function clientForm(c = {}) {
  const v = c.voice || {};
  return `
  <form id="clientForm" class="card">
    <h2>${c.id ? 'Edit client' : 'New client'}</h2>
    <div class="grid g2">
      <div><label>Client name *</label><input name="name" required maxlength="120" value="${esc(c.name)}"></div>
      <div><label>Show / channel</label><input name="show" maxlength="160" value="${esc(c.show)}" placeholder="e.g. The Bootstrapped Baker podcast"></div>
      <div><label>Contact <span class="hint">(email or DM handle)</span></label><input name="contact" maxlength="200" value="${esc(c.contact)}"></div>
      <div class="grid g2"><div><label>Status</label><select name="status">${META.clientStatuses.map((s) => `<option ${c.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div><label>Monthly rate ($)</label><input name="monthlyRate" type="number" min="0" step="1" value="${esc(c.monthlyRate ?? '')}"></div></div>
    </div>
    <label>Platforms they want content for <span class="hint">(comma separated)</span></label><input name="platforms" value="${esc((c.platforms || []).join(', '))}" placeholder="newsletter, LinkedIn, X, Shorts">
    <h3 style="margin-top:16px">Voice profile <span class="hint muted small">- this is what makes output sound like them, not like a robot</span></h3>
    <div class="grid g2">
      <div><label>Tone</label><textarea name="voice.tone" maxlength="600" placeholder="Warm, plain-spoken, a bit cheeky. Short sentences. Uses UK spelling.">${esc(v.tone)}</textarea></div>
      <div><label>Audience</label><textarea name="voice.audience" maxlength="400" placeholder="Home bakers thinking of selling at markets">${esc(v.audience)}</textarea></div>
      <div><label>Banned words <span class="hint">(comma separated)</span></label><input name="voice.bannedWords" value="${esc((v.bannedWords || []).join(', '))}" placeholder="hustle, crush it"></div>
      <div><label>Signature phrases</label><input name="voice.signaturePhrases" value="${esc((v.signaturePhrases || []).join(', '))}"></div>
    </div>
    <label>Standard call to action</label><input name="voice.cta" maxlength="300" value="${esc(v.cta)}" placeholder="Listen to the full episode - link in bio">
    <label>Samples of their own writing <span class="hint">(paste 2–5 posts; used for style only)</span></label><textarea name="voice.samplePosts" maxlength="12000">${esc(v.samplePosts)}</textarea>
    <div class="row" style="margin-top:12px"><button class="primary" type="submit">Save client</button>${c.id ? '<a class="btn" href="#/clients">Cancel</a>' : ''}</div>
  </form>`;
}

async function viewClients(editId) {
  setNav('clients');
  const clients = await api('/api/clients');
  const editing = editId ? clients.find((c) => c.id === editId) : null;
  app.innerHTML = `<h1>Clients</h1><p class="sub">One voice profile per client. Better profile in → less editing out.</p>
    ${clients.length ? `<div class="card table-wrap"><table><thead><tr><th>Name</th><th>Show</th><th>Status</th><th>Rate</th><th></th></tr></thead><tbody>
      ${clients.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td>${esc(c.show)}</td><td><span class="pill">${esc(c.status)}</span></td><td>${money(c.monthlyRate)}</td>
      <td class="row"><a class="btn" href="#/clients/${c.id}">Edit</a><button class="danger" data-del="${c.id}">Delete</button></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="card empty">No clients yet. Add one below - a prospect who agreed to a free sample counts as a "pilot".</div>'}
    ${clientForm(editing || {})}`;
  document.getElementById('clientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    await busy(btn, async () => {
      const body = formData(e.target);
      await api(editing ? `/api/clients/${editing.id}` : '/api/clients', { method: editing ? 'PUT' : 'POST', body });
      toast('Client saved');
      location.hash = '#/clients';
      if (!editing) viewClients();
    });
  });
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    if (!confirm('Delete this client?')) return;
    await api(`/api/clients/${b.dataset.del}`, { method: 'DELETE' });
    toast('Client deleted');
    viewClients();
  })));
}

// ----- Episodes -----
async function viewJobs() {
  setNav('jobs');
  const [jobs, clients] = await Promise.all([api('/api/jobs'), api('/api/clients')]);
  const cname = (id) => clients.find((c) => c.id === id)?.name || '?';
  app.innerHTML = `<h1>Episodes</h1><p class="sub">Paste a transcript → generate drafts → fix what QC flags → approve → export the client pack.</p>
    ${jobs.length ? `<div class="card table-wrap"><table><thead><tr><th>Episode</th><th>Client</th><th>Deliverables</th><th>Time</th><th>Created</th></tr></thead><tbody>
      ${jobs.map((j) => `<tr><td><a href="#/jobs/${j.id}"><b>${esc(j.title)}</b></a></td><td>${esc(cname(j.clientId))}</td><td>${j.approvedCount}/${j.deliverableCount} approved</td><td>${j.minutesSpent} min</td><td>${esc(j.createdAt.slice(0, 10))}</td></tr>`).join('')}
    </tbody></table></div>` : '<div class="card empty">No episodes yet.</div>'}
    ${clients.length ? `
    <form id="jobForm" class="card">
      <h2>New episode</h2>
      <div class="grid g3">
        <div><label>Client *</label><select name="clientId" required>${clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div><label>Episode title</label><input name="title" maxlength="200"></div>
        <div><label>Episode link</label><input name="sourceUrl" type="url" placeholder="https://"></div>
      </div>
      <label>Transcript * <span class="hint">- paste text, or load a .txt / .srt / .vtt file. Timestamps like [12:34] are kept for clips &amp; chapters.</span></label>
      <div class="row" style="margin-bottom:6px"><input type="file" id="tfile" accept=".txt,.srt,.vtt,text/plain" style="max-width:280px"><button type="button" id="sampleBtn">Load SAMPLE transcript</button></div>
      <textarea name="transcript" class="mono" required style="min-height:220px" placeholder="[00:00] Welcome back to the show…"></textarea>
      <p class="small muted">Where to get transcripts: the client's own export (Riverside, Descript, YouTube Studio captions), or a local Whisper run. Only use content the client owns and has asked you to repurpose.</p>
      <button class="primary" type="submit">Create episode</button>
    </form>` : '<div class="card empty">Add a client first, then create an episode for them. <a href="#/clients">Add client →</a></div>'}`;
  const form = document.getElementById('jobForm');
  if (!form) return;
  document.getElementById('tfile').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2_000_000) return toast('File too large (max 2 MB).', true);
    const r = new FileReader();
    r.onload = () => { form.transcript.value = r.result; if (!form.title.value) form.title.value = f.name.replace(/\.[^.]+$/, ''); };
    r.onerror = () => toast('Could not read file.', true);
    r.readAsText(f);
  });
  document.getElementById('sampleBtn').addEventListener('click', async () => {
    const t = await fetch('/sample-transcript.txt').then((r) => r.text());
    form.transcript.value = t;
    if (!form.title.value) form.title.value = 'SAMPLE - Pricing your first market stall';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.submitter, async () => {
      const j = await api('/api/jobs', { method: 'POST', body: formData(form) });
      location.hash = `#/jobs/${j.id}`;
    });
  });
}

function qcBlock(qc) {
  if (!qc) return '';
  const icon = { pass: 'QC passed', warn: 'QC: check warnings', fail: 'QC: must fix' }[qc.status];
  return `<div class="row"><span class="pill ${qc.status}">${icon}</span></div>
    ${qc.checks.length ? `<ul class="checks">${qc.checks.map((c) => `<li class="${c.level}">${esc(c.message)}</li>`).join('')}</ul>` : ''}`;
}

function deliverableCard(type, d) {
  const meta = META.deliverables[type];
  if (!d) {
    return `<div class="card deliverable" data-type="${type}"><div class="spread"><h3>${esc(meta.label)}</h3><span class="muted small">${esc(meta.hint)}</span></div>
      <p class="muted small">Not generated yet.</p><button data-gen="${type}">Generate</button></div>`;
  }
  const origin = d.mode === 'ai' ? `AI draft · ${esc(d.model || d.provider)}` : d.mode === 'template' ? 'Template draft (no AI)' : 'Written manually';
  return `<div class="card deliverable" data-type="${type}">
    <div class="spread"><h3>${esc(meta.label)} <span class="pill ${d.status}">${esc(d.status)}</span></h3><span class="muted small">${origin}${d.editedAt ? ' · edited' : ''}</span></div>
    ${d.note ? `<div class="notice ${d.mode === 'ai' ? '' : 'info'}">${esc(d.note)}</div>` : ''}
    <textarea class="mono" aria-label="${esc(meta.label)} content">${esc(d.content)}</textarea>
    <div class="small muted" data-count></div>
    ${qcBlock(d.qc)}
    <div class="row" style="margin-top:10px">
      <button data-save="${type}">Save &amp; re-check</button>
      ${d.status === 'approved' ? `<button data-unapprove="${type}">Unapprove</button>` : `<button class="primary" data-approve="${type}">Approve</button>`}
      <button data-copy="${type}">Copy</button>
      <button data-gen="${type}">Regenerate</button>
    </div>
    ${d.qc?.status === 'fail' && d.status !== 'approved' ? `<details style="margin-top:8px"><summary class="small">Approve anyway (override)</summary>
      <div class="row" style="margin-top:6px"><input data-override="${type}" placeholder="Why is this OK? e.g. number confirmed with client" maxlength="500" style="flex:1"><button data-approve-override="${type}">Approve with note</button></div></details>` : ''}
    ${d.overrideNote ? `<p class="small muted">Override note: ${esc(d.overrideNote)}</p>` : ''}
  </div>`;
}

async function viewJob(id) {
  setNav('jobs');
  const [j, clients] = await Promise.all([api(`/api/jobs/${id}`), api('/api/clients')]);
  const a = await api(`/api/jobs/${id}/analysis`);
  const client = clients.find((c) => c.id === j.clientId);
  const types = Object.keys(META.deliverables);
  const approved = types.filter((t) => j.deliverables[t]?.status === 'approved').length;
  app.innerHTML = `
    <div class="spread"><div><h1>${esc(j.title)}</h1><p class="sub">${esc(client?.name || '')}${j.sourceUrl ? ` · <a href="${esc(j.sourceUrl)}" target="_blank" rel="noopener noreferrer">source</a>` : ''} · ${a.stats.words.toLocaleString()} words · ~${a.stats.estMinutes} min${a.stats.timed ? '' : ' · no timestamps'}</p></div>
    <div class="row"><a class="btn" href="#/jobs">← Episodes</a><button class="danger" id="delJob">Delete</button></div></div>
    <div class="grid g2">
      <div class="card"><h2>Generate</h2>
        <p class="small muted">${META.provider === 'none' ? 'No AI provider configured: drafts are built from the transcript\'s strongest sentences, with [EDIT] gaps for you to write. Configure an API key or local model in .env for AI drafts.' : `AI drafts via ${esc(META.providerLabel)} (${esc(META.model)}). Every draft still goes through QC and your review.`}</p>
        <div class="row"><button class="primary" id="genAll">Generate all ${types.length}</button>${META.provider !== 'none' ? '<button id="genTpl">Template drafts only</button>' : ''}</div>
        <h3 style="margin-top:14px">Delivery</h3>
        <p class="small">${approved}/${types.length} approved</p>
        <div class="row"><a class="btn" href="/api/jobs/${j.id}/export?format=html">Download pack (HTML)</a><a class="btn" href="/api/jobs/${j.id}/export?format=md">Markdown</a><a class="btn" href="/api/jobs/${j.id}/export?format=html&drafts=1">Incl. drafts</a></div>
        <h3 style="margin-top:14px">Time on this episode: <span id="mins">${j.minutesSpent}</span> min</h3>
        <div class="row">${[10, 30, 60].map((m) => `<button data-min="${m}">+${m}m</button>`).join('')}<button data-min="-10">−10m</button></div>
        <p class="small muted">Track honestly - this is how you'll know if your price works.</p>
      </div>
      <div class="card"><h2>What's in this episode</h2>
        <div>${a.keywords.map((k) => `<span class="kw">${esc(k.word)} ×${k.count}</span>`).join('') || '<span class="muted small">No repeated keywords found.</span>'}</div>
        <h3 style="margin-top:12px">Strongest moments</h3>
        <ol class="small">${a.top.slice(0, 5).map((s) => `<li>${s.time ? `<b>${esc(s.time)}</b> ` : ''}${esc(s.text)}</li>`).join('')}</ol>
        <h3>Suggested clips</h3>
        <ul class="small">${a.clips.map((c) => `<li><b>${esc(c.startLabel || '?')}–${esc(c.endLabel || '?')}</b> ${esc(c.hook)}</li>`).join('') || '<li class="muted">Not enough material.</li>'}</ul>
      </div>
    </div>
    <div id="deliverables">${types.map((t) => deliverableCard(t, j.deliverables[t])).join('')}</div>`;

  const refresh = () => viewJob(id);
  const counts = () => app.querySelectorAll('.deliverable').forEach((card) => {
    const ta = card.querySelector('textarea');
    const out = card.querySelector('[data-count]');
    if (ta && out) out.textContent = `${ta.value.length.toLocaleString()} characters · ${ta.value.split(/\s+/).filter(Boolean).length} words`;
  });
  counts();
  app.oninput = counts;

  const gen = (btn, body) => busy(btn, async () => {
    const r = await api(`/api/jobs/${id}/generate`, { method: 'POST', body });
    const errs = Object.entries(r.errors || {});
    if (errs.length) toast(`Some drafts failed: ${errs.map(([k, v]) => `${k}: ${v}`).join(' | ')}`, true); else toast('Drafts generated - review the QC notes');
    refresh();
  });
  document.getElementById('genAll').addEventListener('click', (e) => gen(e.currentTarget, { mode: 'auto' }));
  document.getElementById('genTpl')?.addEventListener('click', (e) => gen(e.currentTarget, { mode: 'template' }));
  document.getElementById('delJob').addEventListener('click', (e) => busy(e.currentTarget, async () => {
    if (!confirm('Delete this episode and its drafts?')) return;
    await api(`/api/jobs/${id}`, { method: 'DELETE' });
    location.hash = '#/jobs';
  }));
  app.querySelectorAll('[data-min]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    const r = await api(`/api/jobs/${id}`, { method: 'PUT', body: { addMinutes: Number(b.dataset.min) } });
    document.getElementById('mins').textContent = r.minutesSpent;
  })));
  const content = (type) => app.querySelector(`.deliverable[data-type="${type}"] textarea`).value;
  app.querySelectorAll('[data-gen]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.gen;
    const d = j.deliverables[t];
    if (d && d.editedAt && !confirm('Regenerating will replace your edits. Continue?')) return;
    gen(b, { types: [t], mode: 'auto' });
  }));
  app.querySelectorAll('[data-save]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    await api(`/api/jobs/${id}/deliverables/${b.dataset.save}`, { method: 'PUT', body: { content: content(b.dataset.save) } });
    toast('Saved and re-checked');
    refresh();
  })));
  const approve = (b, type, overrideNote) => busy(b, async () => {
    const current = content(type);
    if (current !== j.deliverables[type].content) await api(`/api/jobs/${id}/deliverables/${type}`, { method: 'PUT', body: { content: current } });
    await api(`/api/jobs/${id}/deliverables/${type}/approve`, { method: 'POST', body: { overrideNote } });
    toast('Approved');
    refresh();
  });
  app.querySelectorAll('[data-approve]').forEach((b) => b.addEventListener('click', () => approve(b, b.dataset.approve, '')));
  app.querySelectorAll('[data-approve-override]').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.approveOverride;
    const note = app.querySelector(`[data-override="${t}"]`).value.trim();
    if (!note) return toast('Write a short note explaining the override.', true);
    approve(b, t, note);
  }));
  app.querySelectorAll('[data-unapprove]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    await api(`/api/jobs/${id}/deliverables/${b.dataset.unapprove}/unapprove`, { method: 'POST' });
    refresh();
  })));
  app.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(content(b.dataset.copy)); toast('Copied'); } catch { toast('Copy failed - select the text and copy manually.', true); }
  }));
}

// ----- Prospects -----
function outreachDraft(p, settings) {
  const me = settings.yourName || '[your name]';
  return `Subject: Made something from your latest ${p.platform ? p.platform.toLowerCase() + ' ' : ''}episode

Hi ${p.name.split(' ')[0]},

I enjoyed your recent episode. I noticed ${p.gap || '[specific gap, e.g. you publish a weekly podcast but there is no newsletter]'}, so I turned that episode into a newsletter issue, a LinkedIn post and three short-clip picks with timestamps, written to sound like you rather than a bot.

It's attached / linked here: [link to the free sample]. No cost and no strings. If it's useful, I can do this for every episode.

Either way, thanks for the show.
${me}

P.S. If you'd rather not hear from me again, just say so and I won't follow up.`;
}

async function viewProspects() {
  setNav('prospects');
  const [ps, settings] = await Promise.all([api('/api/prospects'), api('/api/settings')]);
  app.innerHTML = `<h1>Prospects</h1>
    <p class="sub">Creators who publish long-form content but are missing a channel. Find them by hand on YouTube, Spotify, Apple Podcasts or Listen Notes. One personal message each - no bulk sending, no bought lists.</p>
    <div class="card table-wrap">
      <div class="spread"><h2>Pipeline (${ps.length})</h2><a class="btn" href="/api/prospects.csv">Export CSV</a></div>
      ${ps.length ? `<table><thead><tr><th>Name</th><th>Gap you spotted</th><th>Stage</th><th>Deal $</th><th></th></tr></thead><tbody>
      ${ps.map((p) => `<tr><td><b>${esc(p.name)}</b><div class="small muted">${esc(p.platform)} ${esc(p.audience)} ${p.link ? `· <a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">link</a>` : ''}</div></td>
        <td class="small">${esc(p.gap)}</td>
        <td><select data-stage="${p.id}" aria-label="Stage">${META.stages.map((s) => `<option value="${s}" ${p.stage === s ? 'selected' : ''}>${esc(STAGE_LABELS[s])}</option>`).join('')}</select></td>
        <td>${money(p.dealValue)}</td>
        <td class="row"><button data-draft="${p.id}">Draft message</button><button class="danger" data-del="${p.id}">✕</button></td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">No prospects yet. Aim for 20 before you send anything, then pick the best 3–5 for free samples.</p>'}
    </div>
    <div id="draftBox"></div>
    <form id="pForm" class="card"><h2>Add prospect</h2>
      <div class="grid g3">
        <div><label>Name *</label><input name="name" required maxlength="160"></div>
        <div><label>Platform</label><input name="platform" placeholder="Podcast / YouTube" maxlength="80"></div>
        <div><label>Link</label><input name="link" type="url" placeholder="https://"></div>
        <div><label>Audience size <span class="hint">(rough)</span></label><input name="audience" placeholder="~8k subs" maxlength="80"></div>
        <div><label>Public contact route</label><input name="contactRoute" placeholder="Contact form on site" maxlength="200"></div>
        <div><label>Potential deal ($/mo)</label><input name="dealValue" type="number" min="0"></div>
      </div>
      <label>Gap you spotted</label><input name="gap" maxlength="400" placeholder="Weekly podcast for 2 years, no newsletter, LinkedIn last post 8 months ago">
      <label>Notes</label><textarea name="notes" maxlength="4000"></textarea>
      <button class="primary" type="submit" style="margin-top:10px">Add prospect</button>
    </form>`;
  document.getElementById('pForm').addEventListener('submit', (e) => {
    e.preventDefault();
    busy(e.submitter, async () => { await api('/api/prospects', { method: 'POST', body: formData(e.target) }); toast('Prospect added'); viewProspects(); });
  });
  app.querySelectorAll('[data-stage]').forEach((s) => s.addEventListener('change', async () => {
    try { await api(`/api/prospects/${s.dataset.stage}`, { method: 'PUT', body: { stage: s.value } }); toast('Stage updated'); } catch (e) { toast(e.message, true); }
  }));
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    if (!confirm('Delete this prospect?')) return;
    await api(`/api/prospects/${b.dataset.del}`, { method: 'DELETE' });
    viewProspects();
  })));
  app.querySelectorAll('[data-draft]').forEach((b) => b.addEventListener('click', () => {
    const p = ps.find((x) => x.id === b.dataset.draft);
    document.getElementById('draftBox').innerHTML = `<div class="card"><div class="spread"><h2>Message draft for ${esc(p.name)}</h2><button id="copyDraft">Copy</button></div>
      <div class="notice">Nothing is sent from this app. Personalise it, attach a real free sample, and send it yourself through their public contact route. Stop after one polite follow-up.</div>
      <textarea class="mono" id="draftText" style="min-height:260px">${esc(outreachDraft(p, settings))}</textarea></div>`;
    document.getElementById('copyDraft').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(document.getElementById('draftText').value); toast('Copied'); } catch { toast('Copy failed', true); }
    });
    document.getElementById('draftBox').scrollIntoView({ behavior: 'smooth' });
  }));
}

// ----- Leads -----
async function viewLeads() {
  setNav('leads');
  const { leads, testOrders } = await api('/api/leads');
  app.innerHTML = `<h1>Leads &amp; offer page</h1>
    <p class="sub">Your public offer page runs at <a href="/offer" target="_blank" rel="noopener">/offer</a>. To share it with real people you'd host it (see README). Payments are <b>test mode only</b>.</p>
    <div class="card table-wrap"><h2>Interest form submissions (${leads.length})</h2>
      ${leads.length ? `<table><thead><tr><th>When</th><th>Name</th><th>Email</th><th>Show</th><th>Wants</th><th>Message</th><th></th></tr></thead><tbody>
      ${leads.map((l) => `<tr><td class="small">${esc(l.createdAt.slice(0, 16).replace('T', ' '))}</td><td>${esc(l.name)}</td><td>${esc(l.email)}</td><td class="small">${esc(l.show)}</td><td><span class="pill">${esc(l.interest)}</span></td><td class="small">${esc(l.message)}</td><td><button class="danger" data-del="${l.id}">✕</button></td></tr>`).join('')}
      </tbody></table>` : '<p class="empty">No leads yet.</p>'}</div>
    <div class="card table-wrap"><h2>Test-mode checkout clicks (${testOrders.length})</h2>
      <p class="small muted">Someone clicked "reserve" on a plan. No card was taken. It's a stronger intent signal than a form fill, but still not revenue.</p>
      ${testOrders.length ? `<table><thead><tr><th>When</th><th>Plan</th><th>Email</th><th>Price shown</th></tr></thead><tbody>
      ${testOrders.map((o) => `<tr><td class="small">${esc(o.createdAt.slice(0, 16).replace('T', ' '))}</td><td>${esc(o.plan)}</td><td>${esc(o.email)}</td><td>${money(o.amount)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">None yet.</p>'}</div>`;
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    if (!confirm('Delete this lead?')) return;
    await api(`/api/leads/${b.dataset.del}`, { method: 'DELETE' });
    viewLeads();
  })));
}

// ----- Money -----
function calc(s) {
  const perEpisodeHours = Number(s.hoursPerEpisode || 1.5);
  const eps = Number(s.episodesPerMonth || 0);
  const revenue = Number(s.monthlyPrice || 0);
  const costs = Number(s.toolCostsMonthly || 0);
  const hours = perEpisodeHours * eps;
  const profit = revenue - costs;
  return { hours, profit, hourly: hours ? profit / hours : 0, clientsFor: (target) => (profit > 0 ? Math.ceil(target / profit) : '—') };
}

async function viewMoney() {
  setNav('money');
  const [s, payments, clients] = await Promise.all([api('/api/settings'), api('/api/payments'), api('/api/clients')]);
  const cname = (id) => clients.find((c) => c.id === id)?.name || '—';
  app.innerHTML = `<h1>Money &amp; pricing</h1><p class="sub">Log real payments only. Estimates below are estimates.</p>
    <div class="grid g2">
      <form id="sForm" class="card"><h2>Your offer settings</h2>
        <div class="grid g2">
          <div><label>Your name</label><input name="yourName" value="${esc(s.yourName)}" maxlength="120"></div>
          <div><label>Business name</label><input name="businessName" value="${esc(s.businessName)}" maxlength="120"></div>
          <div><label>Pilot price ($, one episode)</label><input name="pilotPrice" type="number" min="0" value="${esc(s.pilotPrice)}"></div>
          <div><label>Monthly price ($)</label><input name="monthlyPrice" type="number" min="0" value="${esc(s.monthlyPrice)}"></div>
          <div><label>Episodes / month included</label><input name="episodesPerMonth" type="number" min="0" value="${esc(s.episodesPerMonth)}"></div>
          <div><label>Tool costs / month ($)</label><input name="toolCostsMonthly" type="number" min="0" value="${esc(s.toolCostsMonthly)}"></div>
          <div><label>Your target hourly ($)</label><input name="targetHourlyRate" type="number" min="0" value="${esc(s.targetHourlyRate)}"></div>
          <div><label>Your hours per episode <span class="hint">(estimate)</span></label><input name="hoursPerEpisode" type="number" min="0" step="0.25" value="1.5"></div>
        </div>
        <button class="primary" type="submit" style="margin-top:10px">Save settings</button>
      </form>
      <div class="card"><h2>Calculator (estimate)</h2><div id="calcOut"></div></div>
    </div>
    <div class="card table-wrap"><h2>Payments received</h2>
      ${payments.length ? `<table><thead><tr><th>Date</th><th>Client</th><th>Amount</th><th>Note</th><th></th></tr></thead><tbody>
      ${payments.map((p) => `<tr><td>${esc(p.date)}</td><td>${esc(cname(p.clientId))}</td><td>${money(p.amount)}</td><td class="small">${esc(p.note)}</td><td><button class="danger" data-del="${p.id}">✕</button></td></tr>`).join('')}</tbody></table>` : '<p class="empty">No payments logged yet. Your first one is the milestone that matters.</p>'}
      <form id="payForm" class="grid g4" style="margin-top:10px;align-items:end">
        <div><label>Client</label><select name="clientId"><option value="">—</option>${clients.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div><label>Amount ($) *</label><input name="amount" type="number" min="0.01" step="0.01" required></div>
        <div><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div><label>Note</label><input name="note" maxlength="300"></div>
        <div><button class="primary" type="submit">Log payment</button></div>
      </form>
    </div>
    <p class="small"><a href="/api/backup">Download full backup (JSON)</a></p>`;
  const form = document.getElementById('sForm');
  const render = () => {
    const v = formData(form);
    const c = calc(v);
    document.getElementById('calcOut').innerHTML = `
      <p>Per client: <b>${money(v.monthlyPrice)}</b>/mo − ${money(v.toolCostsMonthly)} tools = <b>${money(c.profit)}</b> profit for ~<b>${c.hours.toFixed(1)}h</b> work.</p>
      <p>Effective hourly: <b>${money(c.hourly)}</b> ${c.hourly < Number(v.targetHourlyRate) ? '<span class="pill warn">below your target</span>' : '<span class="pill pass">meets target</span>'}</p>
      <p>Clients needed for $1,000/mo profit: <b>${c.clientsFor(1000)}</b> · for $3,000/mo: <b>${c.clientsFor(3000)}</b></p>
      <p class="small muted">Tool costs are shared across clients in reality, so this is conservative. Hours per episode falls as voice profiles mature - measure it with the episode timer.</p>`;
  };
  form.addEventListener('input', render);
  render();
  form.addEventListener('submit', (e) => { e.preventDefault(); busy(e.submitter, async () => { await api('/api/settings', { method: 'PUT', body: formData(form) }); toast('Settings saved'); }); });
  document.getElementById('payForm').addEventListener('submit', (e) => { e.preventDefault(); busy(e.submitter, async () => { await api('/api/payments', { method: 'POST', body: formData(e.target) }); toast('Payment logged'); viewMoney(); }); });
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => busy(b, async () => {
    if (!confirm('Delete this payment record?')) return;
    await api(`/api/payments/${b.dataset.del}`, { method: 'DELETE' });
    viewMoney();
  })));
}

// ---------------- Router ----------------
async function router() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  app.oninput = null;
  try {
    if (!META) {
      META = await api('/api/meta');
      document.getElementById('provider').textContent = META.provider === 'none' ? 'AI: not configured (template drafts)' : `AI: ${META.providerLabel} · ${META.model}`;
    }
    let tipKey = null;
    if (!parts.length) { await viewDashboard(); tipKey = 'dashboard'; }
    else if (parts[0] === 'start') await viewStart();
    else if (parts[0] === 'clients') { await viewClients(parts[1]); tipKey = 'clients'; }
    else if (parts[0] === 'jobs' && parts[1]) { await viewJob(parts[1]); tipKey = 'job'; }
    else if (parts[0] === 'jobs') { await viewJobs(); tipKey = 'jobs'; }
    else if (parts[0] === 'prospects') { await viewProspects(); tipKey = 'prospects'; }
    else if (parts[0] === 'leads') { await viewLeads(); tipKey = 'leads'; }
    else if (parts[0] === 'money') { await viewMoney(); tipKey = 'money'; }
    else app.innerHTML = '<div class="card empty">Page not found. <a href="#/">Dashboard</a></div>';
    if (tipKey) learn.tip(app, tipKey, app.querySelector(':scope > .spread') || app.querySelector(':scope > .sub'));
    window.scrollTo(0, 0);
  } catch (e) {
    app.innerHTML = `<div class="card"><h2>Something went wrong</h2><p>${esc(e.message)}</p><p class="small muted">Is the server still running? Check the terminal.</p></div>`;
  }
}
window.addEventListener('hashchange', router);
router();
