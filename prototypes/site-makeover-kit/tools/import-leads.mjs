// Imports a lead CSV into this computer's Site Makeover Kit (data/db.json) through the app's own API,
// so every row gets the same validation as the Prospects form. Skips businesses already present.
// Usage: node tools/import-leads.mjs <path-to-csv>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.error('Usage: node tools/import-leads.mjs <csv>'); process.exit(1); }

// Small CSV parser (quoted fields, commas and newlines inside quotes).
function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.some((x) => x.trim()));
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] || '').trim()])));
}

const leads = parseCsv(fs.readFileSync(file, 'utf8'));
const server = createApp({ dataDir: process.env.DATA_DIR || path.join(here, '..', 'data'), env: {} });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const post = (body) => fetch(`${base}/api/prospects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const existing = new Set((await (await fetch(`${base}/api/prospects`)).json()).map((p) => p.name.toLowerCase()));
let added = 0, skipped = 0, noSite = 0;
const failed = [];
for (const l of leads) {
  const name = l.business_name.slice(0, 100);
  if (existing.has(name.toLowerCase())) { skipped++; continue; }
  const notes = [`Lead ${l.id} · ${l.group}`, l.notes, `Source: ${l.source_url}`].filter(Boolean).join('\n');
  const body = { name, trade: l.trade.slice(0, 60), town: l.town.slice(0, 60), phone: l.phone.slice(0, 30), website: l.website, email: l.email, source: 'DuPage lead list (public listings)', notes };
  let res = await post(body);
  if (res.status === 400 && body.website) { body.website = ''; body.notes += `\nWebsite (not accepted by the form): ${l.website}`; res = await post(body); noSite++; }
  if (res.status === 400 && body.email) { body.email = ''; body.notes += `\nEmail (not accepted by the form): ${l.email}`; res = await post(body); }
  if (res.ok) { added++; existing.add(name.toLowerCase()); } else failed.push(`${l.id} ${name}: ${(await res.json()).error}`);
}
await new Promise((r) => server.close(r));
await new Promise((r) => setTimeout(r, 300)); // let the store finish its last write
console.log(`added ${added}, already there ${skipped}, failed ${failed.length}${noSite ? `, ${noSite} website(s) moved to notes` : ''}`);
failed.forEach((f) => console.log('  ' + f));
