// Builds HTML versions of the lab's documents:
//  - <lab>/html/*.html  one standalone page per document + index.html hub
//  - <out>/lab-report.html  one combined page (published as an artifact)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

const LAB = process.argv[2];
const OUT = process.argv[3];
const LIVE = {
  repurpose: 'https://repurpose-desk-flux.onrender.com',
  kit: 'https://site-makeover-kit.onrender.com',
  chart: 'https://claude.ai/artifact/CdEKPZyz5YMNcks6iPKq8t',
  repo: 'https://github.com/rubberly/ai-money-making-lab',
};

const DOCS = [
  { token: 'report', file: 'reports/final_report.md', label: 'Final report', blurb: 'Findings, rankings, prototypes and the first-$100 plan in one place.' },
  { token: 'video', file: 'research/video_notes.md', label: 'Video notes', blurb: 'All seven methods with timestamps, split into what was said and what is interpretation.' },
  { token: 'methods', file: 'research/seven_methods.md', label: 'The seven methods', blurb: 'Deep dive per method, including whether you need an app.' },
  { token: 'scorecard', file: 'research/feasibility_scorecard.md', label: 'Feasibility scorecard', blurb: 'Weighted scores with the reason behind every number.' },
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

function render(doc) {
  const raw = readFileSync(join(LAB, doc.file), 'utf8');
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
  .shell { grid-template-columns: 1fr; gap: 1.5rem; padding-block: 1.25rem 3rem; }
  .rail { position: static; }
  .toc { flex-direction: row; overflow-x: auto; gap: 4px; padding-bottom: 4px; }
  .toc a, .toc button { white-space: nowrap; }
  .live { flex-direction: row; flex-wrap: wrap; gap: .4rem 1rem; }
  .live b { width: 100%; }
}
`;

const liveLinks = `<div class="live"><b>Live apps</b>
<a href="${LIVE.repurpose}" target="_blank" rel="noopener noreferrer">Repurpose Desk</a>
<a href="${LIVE.kit}" target="_blank" rel="noopener noreferrer">Site Makeover Kit</a>
<a href="${LIVE.chart}" target="_blank" rel="noopener noreferrer">Scorecard chart</a>
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
<div class="tw"><table><thead><tr><th>App</th><th>Workspace (password)</th><th>Public offer page</th></tr></thead><tbody>
<tr><td>Repurpose Desk</td><td><a href="${LIVE.repurpose}" target="_blank" rel="noopener noreferrer">${LIVE.repurpose.replace('https://', '')}</a></td><td><a href="${LIVE.repurpose}/offer" target="_blank" rel="noopener noreferrer">/offer</a></td></tr>
<tr><td>Site Makeover Kit</td><td><a href="${LIVE.kit}" target="_blank" rel="noopener noreferrer">${LIVE.kit.replace('https://', '')}</a></td><td><a href="${LIVE.kit}/offer" target="_blank" rel="noopener noreferrer">/offer</a></td></tr>
</tbody></table></div>
<p>The password for each workspace is in Render, under the service's Environment tab (<code>APP_PASSWORD</code>). Free hosting sleeps when idle and resets saved data on restart.</p>
<p class="foot">Generated from the Markdown files in this folder on ${new Date().toISOString().slice(0, 10)}. Edit the Markdown, then rebuild.</p></article>`;

writeFileSync(join(dir, 'index.html'), page({ title: 'AI Money Lab', nav: navFor('index'), body: hubBody }));
for (const d of DOCS) {
  writeFileSync(join(dir, `${d.token}.html`), page({ title: `${d.label} · AI Money Lab`, nav: navFor(d.token), body: `<article class="doc">${render(d)}<p class="foot">Source: <code>${esc(d.file)}</code></p></article>` }));
}

// ---- combined single page (artifact) ----
const combinedNav = `<nav class="toc" aria-label="Documents">${DOCS.map((d, i) => `<button type="button" data-go="${d.token}"${i === 0 ? ' aria-current="page"' : ''}>${esc(d.label)}</button>`).join('')}</nav>`;
const sections = DOCS.map((d, i) => `<section class="doc" id="${d.token}"${i === 0 ? '' : ' hidden'}>${render(d)}</section>`).join('\n');
const combined = `<title>AI Money Lab</title>
<meta name="claude:viewport-fit-sides" content="cover">
${FONTS}<style>${CSS}</style>
<div class="shell"><aside class="rail"><div class="brand">AI Money Lab<small>Research and prototypes</small></div>${combinedNav}${liveLinks}</aside>
<main>${sections}</main></div>
<script>
(function () {
  var buttons = document.querySelectorAll('[data-go]');
  function show(token, scroll) {
    var target = document.getElementById(token);
    if (!target || target.tagName !== 'SECTION') return;
    document.querySelectorAll('main > section').forEach(function (s) { s.hidden = s !== target; });
    buttons.forEach(function (b) { if (b.dataset.go === token) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (scroll) window.scrollTo(0, 0);
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.go, true); }); });
  var start = location.hash.slice(1);
  if (start) show(start, false);
})();
</script>
`;
writeFileSync(join(OUT, 'lab-report.html'), combined);
console.log('built', DOCS.length + 1, 'pages in', dir, 'and lab-report.html');
