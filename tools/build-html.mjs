// Builds the lab's public HTML site: <lab>/html/*.html, one page per document,
// a scorecard chart page and an index.html hub. Hosted as a Render static site.
// Usage: node tools/build-html.mjs <lab-folder>   (needs: npm install marked@12.0.2)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const LAB = process.argv[2];
const LIVE = {
  repurpose: 'https://repurpose-desk-flux.onrender.com',
  kit: 'https://site-makeover-kit.onrender.com',
  repo: 'https://github.com/rubberly/ai-money-making-lab',
};

const DOCS = [
  { token: 'start', file: 'guides/start_here.md', label: '★ Start here', blurb: 'What to do first, in order, and which app to use.' },
  { token: 'report', file: 'reports/final_report.md', label: 'Final report', blurb: 'Findings, rankings, prototypes and the first-$100 plan in one place.' },
  { token: 'video', file: 'research/video_notes.md', label: 'Video notes', blurb: 'All seven methods with timestamps, split into what was said and what is interpretation.' },
  { token: 'methods', file: 'research/seven_methods.md', label: 'The seven methods', blurb: 'Deep dive per method, including whether you need an app.' },
  { token: 'scorecard', file: 'research/feasibility_scorecard.md', label: 'Feasibility scorecard', blurb: 'Weighted scores with the reason behind every number.' },
  { token: 'chart', file: 'research/scorecard.csv', kind: 'chart', label: 'Scorecard chart', blurb: 'All seven methods ranked by weighted score, with every category score.' },
  { token: 'picks', file: 'research/business_recommendations.md', label: 'Recommendations', blurb: 'Why repurposing and website makeovers were built, and what to test.' },
  { token: 'plans', file: 'validation/seven_day_plans.md', label: '7-day plans', blurb: 'Day-by-day validation plans with continue, change or stop rules.' },
  { token: 'outreach', file: 'validation/outreach_templates.md', label: 'Outreach templates', blurb: 'First messages, follow-ups, pilot offer and research questions.' },
  { token: 'tracker', file: 'validation/experiment_tracker.csv', label: 'Experiment tracker', blurb: 'Targets for interest and payment metrics, with a column for actuals.' },
  { token: 'sources', file: 'research/sources.md', label: 'Sources', blurb: 'Every link used, with notes on how reliable each one is.' },
];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function csvToTable(text) {
  const rows = text.trim().split(/\r?\n/).map((l) => l.split(','));
  const [head, ...body] = rows;
  const label = (h) => h.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return `<h1>Experiment tracker</h1>
<p>Fill in <b>actual</b> as you go. Activity and interest show you are moving; only <b>payment</b> rows prove demand. The same file is <code>validation/experiment_tracker.csv</code>, which opens in Excel or Google Sheets.</p>
<div class="tw"><table><thead><tr>${head.map((h) => `<th>${esc(label(h))}</th>`).join('')}</tr></thead><tbody>
${body.map((r) => `<tr>${r.map((c, i) => `<td${/^target|actual/.test(head[i]) ? ' class="num"' : ''}>${head[i] === 'type' ? `<span class="tag tag-${esc(c)}">${esc(c)}</span>` : esc(c)}</td>`).join('')}</tr>`).join('\n')}
</tbody></table></div>`;
}

// ---- scorecard chart (drawn at build time as SVG; a small script adds hover details) ----
const WEIGHTS = { cost: 0.15, beginner: 0.15, speed: 0.15, demand: 0.15, profit: 0.15, build: 0.10, automate: 0.10, risk: 0.05 };
const COLS = [['cost', 'Low cost', '15%'], ['beginner', 'Beginner', '15%'], ['speed', 'Speed', '15%'], ['demand', 'Demand', '15%'], ['profit', 'Profit / effort', '15%'], ['build', 'Easy to build', '10%'], ['automate', 'Automatable', '10%'], ['risk', 'Low risk', '5%']];

function parseCsv(text) {
  const [head, ...lines] = text.trim().split(/\r?\n/).map((l) => l.split(','));
  return lines.map((cells) => Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? '').trim()])));
}

function chartPage(raw) {
  const rows = parseCsv(raw).map((r) => {
    const keys = Object.keys(WEIGHTS);
    const scored = keys.every((k) => r[k] !== '');
    return { ...r, total: scored ? Math.round(keys.reduce((s, k) => s + Number(r[k]) * WEIGHTS[k], 0) * 100) / 10 : null };
  }).sort((a, b) => (a.total == null) - (b.total == null) || (b.total ?? 0) - (a.total ?? 0));
  const [first, second] = rows.filter((r) => r.total != null);

  // HTML bars (not a scaled SVG) so the text stays readable at phone width.
  const TICKS = [0, 25, 50, 75, 100];
  const grid = `<div class="gridlayer" aria-hidden="true">${TICKS.map((t) => `<span class="${t === 0 ? 'gl axis' : 'gl'}" style="left:${t}%"></span>`).join('')}</div>`;
  const axis = `<div class="ticks" aria-hidden="true">${TICKS.map((t) => `<span style="left:${t}%">${t}</span>`).join('')}</div>`;
  const bars = rows.map((r) => {
    const tipText = [r.method, r.total == null ? 'Not scored' : `Score: ${r.total} / 100`, `Startup cost: ${r.startup_cost}`, `First customer: ${r.first_customer}`, r.prototype ? `Prototype: ${r.prototype}` : ''].filter(Boolean).join('|');
    const mark = r.total == null
      ? `<div class="note">Not scored: never revealed in the video</div>`
      : `<div class="track"><span class="${r.prototype ? 'bar built' : 'bar'}" style="width:${r.total}%"></span><span class="val" style="left:${r.total}%">${r.total}</span></div>`;
    return `<div class="row" tabindex="0" role="listitem" data-tip="${esc(tipText)}" aria-label="${esc(r.method)}: ${r.total == null ? 'not scored' : `${r.total} out of 100`}"><div class="label">${esc(r.method)}</div>${mark}</div>`;
  }).join('');

  const breakdown = `<div class="tw"><table><thead><tr><th>Method</th>${COLS.map(([, l, w]) => `<th class="num">${l}<br><small>${w}</small></th>`).join('')}<th class="num">Total<br><small>/100</small></th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${esc(r.method)}</td>${COLS.map(([k]) => `<td class="num">${esc(r[k] || '—')}</td>`).join('')}<td class="num"><b>${r.total ?? '—'}</b></td></tr>`).join('\n')}
</tbody></table></div>`;
  const costs = `<div class="tw"><table><thead><tr><th>Method</th><th>Video time</th><th>Video's tier</th><th>Startup cost</th><th>First customer</th><th>Prototype</th></tr></thead><tbody>
${rows.map((r) => `<tr><td>${esc(r.method)}</td><td>${esc(r.video_time)}</td><td>${esc(r.their_tier)}</td><td>${esc(r.startup_cost)}</td><td>${esc(r.first_customer)}</td><td>${esc(r.prototype || '—')}</td></tr>`).join('\n')}
</tbody></table></div>`;

  return `<h1>Scorecard chart</h1>
<p class="lede"><b>${esc(first.method)}</b> scores highest at <b>${first.total}</b> out of 100, ${Math.round((first.total - second.total) * 10) / 10} points ahead of <b>${esc(second.method)}</b>. The video never reveals method 7, so it has no score.</p>
<h2>Weighted score by method</h2>
<p>Out of 100. Higher is better for a beginner. Hover or tap a row for startup cost and time to first customer.</p>
<div class="legend"><span><i class="sw built"></i>Prototype built</span><span><i class="sw"></i>Not built</span></div>
<figure class="chart" id="chart"><div class="plot">${grid}<div class="rows" role="list" aria-label="Weighted score by method, out of 100">${bars}</div></div>${axis}<div class="tip" id="tip" hidden></div></figure>
<h2>Score breakdown</h2>
<p>Each category is scored 1–10, where higher is more favourable (cheaper, faster, less risky). The weight is under each heading. Total = each score × its weight, added up, × 10.</p>
${breakdown}
<h2>Cost and timing</h2>
<p>Estimates from the research, not promises.</p>
${costs}
<script>
(function () {
  var fig = document.getElementById('chart'), tip = document.getElementById('tip');
  function show(row, cx, cy) {
    var parts = row.getAttribute('data-tip').split('|');
    tip.replaceChildren();
    parts.forEach(function (p, i) { var d = document.createElement('div'); if (i === 0) d.className = 't'; d.textContent = p; tip.appendChild(d); });
    tip.hidden = false;
    var b = fig.getBoundingClientRect(), left = cx - b.left + 14, topPx = cy - b.top + 14;
    if (left + tip.offsetWidth > b.width) left = Math.max(0, cx - b.left - tip.offsetWidth - 14);
    if (topPx + tip.offsetHeight > b.height) topPx = Math.max(0, cy - b.top - tip.offsetHeight - 14);
    tip.style.left = left + 'px'; tip.style.top = topPx + 'px';
  }
  fig.querySelectorAll('.row').forEach(function (row) {
    row.addEventListener('mousemove', function (e) { show(row, e.clientX, e.clientY); });
    row.addEventListener('mouseleave', function () { tip.hidden = true; });
    row.addEventListener('focus', function () { var r = row.getBoundingClientRect(); show(row, r.left + 40, r.top + 10); });
    row.addEventListener('blur', function () { tip.hidden = true; });
  });
})();
</script>`;
}

function render(doc) {
  const raw = readFileSync(join(LAB, doc.file), 'utf8');
  if (doc.kind === 'chart') return chartPage(raw);
  if (doc.file.endsWith('.csv')) return csvToTable(raw);
  let html = marked.parse(raw, { gfm: true });
  html = html.replace(/<table>/g, '<div class="tw"><table>').replace(/<\/table>/g, '</table></div>');
  html = html.replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
  return html;
}

const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Public+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap">';

const CSS = `
/* Layout: a fixed contents rail beside one reading column; rail becomes a scrolling strip on phones. */
:root {
  --paper: #fafaf8; --ink: #1d2430; --muted: #5b6473; --rule: #e1e4ea; --panel: #f1f3f6;
  --accent: #24467a; --accent-soft: #e6ecf6; --ok: #1f7a45; --warn: #9a5b00;
  --display: "Source Serif 4", Georgia, "Times New Roman", serif;
  --body: "Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, Consolas, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --paper: #13161c; --ink: #e5e8ee; --muted: #9aa3b2; --rule: #2a303b; --panel: #1b1f27;
  --accent: #93b2e8; --accent-soft: #1f2a3f; --ok: #6fd39a; --warn: #f0b860; color-scheme: dark; } }
:root[data-theme="dark"] {
  --paper: #13161c; --ink: #e5e8ee; --muted: #9aa3b2; --rule: #2a303b; --panel: #1b1f27;
  --accent: #93b2e8; --accent-soft: #1f2a3f; --ok: #6fd39a; --warn: #f0b860; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--paper); color: var(--ink); font: 16px/1.6 var(--body); }
a { color: var(--accent); text-underline-offset: 2px; }
.doc a { overflow-wrap: anywhere; }
a:focus-visible, button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }
.shell { display: grid; grid-template-columns: 15rem minmax(0, 1fr); gap: 3rem; max-width: 76rem; margin: 0 auto;
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 2.5rem 4rem; }
.rail { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 1.5rem); align-self: start; display: flex; flex-direction: column; gap: 1.25rem; }
.brand { font-family: var(--display); font-size: 1.15rem; font-weight: 600; line-height: 1.25; color: var(--ink); text-decoration: none; }
.brand small { display: block; font-family: var(--body); font-size: .78rem; font-weight: 400; color: var(--muted); margin-top: .25rem; }
.toc { display: flex; flex-direction: column; gap: 2px; }
.toc a, .toc button { display: block; text-align: left; padding: .38rem .6rem; border-radius: 6px; border: 0; background: none; font: 500 .9rem/1.35 var(--body); color: var(--muted); text-decoration: none; cursor: pointer; }
.toc a:hover, .toc button:hover { color: var(--ink); background: var(--panel); }
.toc [aria-current="page"] { color: var(--accent); background: var(--accent-soft); }
.live { border-top: 1px solid var(--rule); padding-top: 1rem; display: flex; flex-direction: column; gap: .35rem; font-size: .85rem; }
.live b { font-size: .72rem; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
main { min-width: 0; }
.doc { max-width: 46rem; }
.doc h1 { font: 600 clamp(1.8rem, 4vw, 2.4rem)/1.15 var(--display); margin: 0 0 1rem; text-wrap: balance; letter-spacing: -.01em; }
.doc h2 { font: 600 1.45rem/1.25 var(--display); margin: 2.4rem 0 .6rem; padding-top: 1.2rem; border-top: 1px solid var(--rule); text-wrap: balance; }
.doc h3 { font: 600 1.08rem/1.35 var(--body); margin: 1.8rem 0 .4rem; }
.doc h4 { font: 600 1rem/1.35 var(--body); margin: 1.4rem 0 .3rem; color: var(--muted); }
.doc p, .doc li { max-width: 68ch; }
.doc ul, .doc ol { padding-left: 1.3rem; }
.doc li { margin: .2rem 0; }
.doc hr { border: 0; border-top: 1px solid var(--rule); margin: 2rem 0; }
.doc blockquote { margin: 1rem 0; padding: .75rem 1rem; border-left: 3px solid var(--accent); background: var(--panel); border-radius: 0 6px 6px 0; }
.doc blockquote p { margin: .4rem 0; }
.doc code { font: .86em var(--mono); background: var(--panel); padding: .1em .35em; border-radius: 4px; overflow-wrap: anywhere; }
.doc pre { background: var(--panel); padding: 1rem; border-radius: 8px; overflow-x: auto; }
.doc pre code { background: none; padding: 0; overflow-wrap: normal; }
.tw { overflow-x: auto; margin: 1rem 0 1.4rem; border: 1px solid var(--rule); border-radius: 8px; }
.doc table { border-collapse: collapse; width: 100%; font-size: .9rem; font-variant-numeric: tabular-nums; }
.doc th, .doc td { text-align: left; vertical-align: top; padding: .5rem .7rem; border-bottom: 1px solid var(--rule); }
.doc th { background: var(--panel); font-weight: 600; font-size: .8rem; color: var(--muted); white-space: nowrap; }
.doc tr:last-child td { border-bottom: 0; }
.doc td.num { text-align: right; }
.tag { display: inline-block; font-size: .75rem; font-weight: 600; padding: 0 .5rem; border-radius: 999px; background: var(--panel); color: var(--muted); }
.tag-payment { background: var(--accent-soft); color: var(--accent); }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr)); gap: 1rem; margin: 1.5rem 0 2rem; }
.card { display: flex; flex-direction: column; gap: .3rem; padding: 1rem 1.1rem; border: 1px solid var(--rule); border-radius: 8px; text-decoration: none; color: var(--ink); background: var(--paper); }
.card:hover { border-color: var(--accent); }
.card strong { font: 600 1.05rem/1.3 var(--display); color: var(--accent); }
.card span { color: var(--muted); font-size: .9rem; }
.lede { font-size: 1.08rem; color: var(--muted); max-width: 62ch; }
.foot { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--rule); font-size: .82rem; color: var(--muted); }
@media (max-width: 860px) {
  .shell { grid-template-columns: minmax(0, 1fr); gap: 1.5rem; padding-block: 1.25rem 3rem; }
  .rail, main { min-width: 0; }
  .rail { position: static; }
  .toc { flex-direction: row; overflow-x: auto; gap: 4px; padding-bottom: 4px; }
  .toc a, .toc button { white-space: nowrap; }
  .live { flex-direction: row; flex-wrap: wrap; gap: .4rem 1rem; }
  .live b { width: 100%; }
}
/* chart page */
:root { --bar: #b7bfcc; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bar: #4a5366; } }
:root[data-theme="dark"] { --bar: #4a5366; }
.legend { display: flex; gap: 1.2rem; flex-wrap: wrap; font-size: .85rem; color: var(--muted); margin: .5rem 0; }
.legend span { display: inline-flex; align-items: center; gap: .4rem; }
.sw { width: 10px; height: 10px; border-radius: 2px; display: inline-block; background: var(--bar); }
.sw.built { background: var(--accent); }
.chart { position: relative; margin: .5rem 0 1.5rem; --gutter: 2.75rem; }
.chart .plot { position: relative; }
.chart .gridlayer { position: absolute; inset: 0 var(--gutter) 0 0; pointer-events: none; }
.chart .gl { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--rule); }
.chart .gl.axis { background: var(--muted); }
.chart .rows { position: relative; display: flex; flex-direction: column; }
.chart .row { padding: .35rem 0; border-radius: 6px; cursor: default; }
.chart .row:hover, .chart .row:focus-visible { background: color-mix(in srgb, var(--panel) 70%, transparent); outline: none; }
.chart .label { font-size: .88rem; font-weight: 500; color: var(--ink); margin-bottom: .25rem; padding-left: .35rem; }
.chart .track { position: relative; height: 16px; margin-right: var(--gutter); }
.chart .bar { position: absolute; left: 0; top: 0; height: 100%; min-width: 2px; border-radius: 0 4px 4px 0; background: var(--bar); }
.chart .bar.built { background: var(--accent); }
.chart .val { position: absolute; top: 50%; transform: translateY(-50%); margin-left: 6px; font-size: .82rem; color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.chart .note { font-size: .82rem; color: var(--muted); padding-left: .35rem; }
.chart .ticks { position: relative; height: 1.4rem; margin-right: var(--gutter); font-size: .75rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.chart .ticks span { position: absolute; top: .3rem; transform: translateX(-50%); }
.chart .ticks span:first-child { transform: none; }
.chart .ticks span:last-child { transform: translateX(-100%); }
.tip { position: absolute; pointer-events: none; background: var(--paper); border: 1px solid var(--rule); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.12); padding: .45rem .65rem; font-size: .82rem; min-width: 11rem; }
.tip .t { color: var(--muted); font-weight: 600; margin-bottom: 2px; }
.doc th small { font-weight: 400; }
`;

const liveLinks = `<div class="live"><b>Live apps</b>
<a href="${LIVE.repurpose}" target="_blank" rel="noopener noreferrer">Repurpose Desk</a>
<a href="${LIVE.kit}" target="_blank" rel="noopener noreferrer">Site Makeover Kit</a>
<a href="${LIVE.repo}" target="_blank" rel="noopener noreferrer">GitHub repo</a></div>`;

function page({ title, nav, body }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>${FONTS}<style>${CSS}</style></head>
<body><div class="shell"><aside class="rail"><a class="brand" href="index.html">AI Money Lab<small>Research and prototypes</small></a>${nav}${liveLinks}</aside>
<main>${body}</main></div></body></html>
`;
}

// ---- standalone pages ----
const dir = join(LAB, 'html');
mkdirSync(dir, { recursive: true });
const navFor = (current) => `<nav class="toc" aria-label="Documents"><a href="index.html"${current === 'index' ? ' aria-current="page"' : ''}>Overview</a>${DOCS.map((d) => `<a href="${d.token}.html"${current === d.token ? ' aria-current="page"' : ''}>${esc(d.label)}</a>`).join('')}</nav>`;

const hubBody = `<article class="doc"><h1>AI Money Lab</h1>
<p class="lede">Research on Mark Tilbury's "7 Proven Ways to Make Money With AI (No Experience)", a weighted ranking of all seven methods, and two working apps for the strongest ones.</p>
<div class="cards">${DOCS.map((d) => `<a class="card" href="${d.token}.html"><strong>${esc(d.label)}</strong><span>${esc(d.blurb)}</span></a>`).join('')}</div>
<h2>Live apps</h2>
<div class="tw"><table><thead><tr><th>App</th><th>Workspace</th><th>Public offer page</th></tr></thead><tbody>
<tr><td>Repurpose Desk</td><td><a href="${LIVE.repurpose}" target="_blank" rel="noopener noreferrer">${LIVE.repurpose.replace('https://', '')}</a></td><td><a href="${LIVE.repurpose}/offer" target="_blank" rel="noopener noreferrer">/offer</a></td></tr>
<tr><td>Site Makeover Kit</td><td><a href="${LIVE.kit}" target="_blank" rel="noopener noreferrer">${LIVE.kit.replace('https://', '')}</a></td><td><a href="${LIVE.kit}/offer" target="_blank" rel="noopener noreferrer">/offer</a></td></tr>
</tbody></table></div>
<p>Both workspaces are public: anyone with the link can open them. Free hosting sleeps when idle (the first load can take a minute) and resets saved data on restart, so download backups.</p>
<p class="foot">Generated from the Markdown files in this folder on ${new Date().toISOString().slice(0, 10)}. Edit the Markdown, then rebuild.</p></article>`;

writeFileSync(join(dir, 'index.html'), page({ title: 'AI Money Lab', nav: navFor('index'), body: hubBody }));
for (const d of DOCS) {
  writeFileSync(join(dir, `${d.token}.html`), page({ title: `${d.label} · AI Money Lab`, nav: navFor(d.token), body: `<article class="doc">${render(d)}<p class="foot">Source: <code>${esc(d.file)}</code></p></article>` }));
}

console.log('built', DOCS.length + 1, 'pages in', dir);
