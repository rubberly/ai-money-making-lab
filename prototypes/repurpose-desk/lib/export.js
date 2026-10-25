// Client-ready delivery pack (Markdown or standalone HTML).

import { DELIVERABLES } from './generate.js';

const ORDER = Object.keys(DELIVERABLES);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function deliverablesForExport(job, { includeDrafts = false } = {}) {
  return ORDER.map((type) => ({ type, ...(job.deliverables?.[type] || {}) }))
    .filter((d) => d.content && (includeDrafts || d.status === 'approved'));
}

export function toMarkdown(job, client, opts) {
  const items = deliverablesForExport(job, opts);
  const head = [`# ${job.title || 'Episode'} — content pack`, '', `Client: ${client?.name || '-'}`, job.sourceUrl ? `Source: ${job.sourceUrl}` : '', `Prepared: ${new Date().toISOString().slice(0, 10)}`, ''];
  const body = items.flatMap((d) => [`## ${DELIVERABLES[d.type].label}${d.status !== 'approved' ? ' (DRAFT - not approved)' : ''}`, '', d.content, '']);
  return [...head, ...(items.length ? body : ['_No approved deliverables yet._'])].filter((l) => l !== null).join('\n');
}

export function toHTML(job, client, opts) {
  const items = deliverablesForExport(job, opts);
  const sections = items.map((d) => `<section><h2>${esc(DELIVERABLES[d.type].label)}${d.status !== 'approved' ? ' <span class="draft">draft</span>' : ''}</h2><pre>${esc(d.content)}</pre></section>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(job.title || 'Episode')} — content pack</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 16px;color:#1d2433;background:#fff}
h1{font-size:26px;margin-bottom:4px}.meta{color:#5b6475;font-size:14px}section{border-top:1px solid #e3e7ef;padding-top:12px;margin-top:24px}
h2{font-size:18px}pre{white-space:pre-wrap;font:inherit;background:#f6f8fb;padding:14px;border-radius:8px}.draft{font-size:12px;background:#fde68a;padding:2px 6px;border-radius:4px}
@media print{pre{background:none;padding:0}}</style></head><body>
<h1>${esc(job.title || 'Episode')} — content pack</h1>
<p class="meta">Client: ${esc(client?.name || '-')}${job.sourceUrl ? ` · Source: ${esc(job.sourceUrl)}` : ''} · Prepared ${new Date().toISOString().slice(0, 10)}</p>
${sections || '<p>No approved deliverables yet.</p>'}
</body></html>`;
}
