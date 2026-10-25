import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DEFAULT_SETTINGS = {
  senderName: '',
  senderBusiness: '',
  replyEmail: '',
  postalAddress: '',
  formAction: '',
  currency: '$',
  tiers: [
    { id: 'starter', name: 'One-page makeover', price: 350, unit: 'one-off', description: 'Mobile-friendly one-page site built from your current content, tap-to-call, contact form, set live on your domain.' },
    { id: 'standard', name: 'Small-business site', price: 750, unit: 'one-off', description: 'Up to 5 pages (home, services, about, reviews, contact), basic local SEO set-up, Google Business Profile link.' },
    { id: 'care', name: 'Care plan', price: 39, unit: 'per month', description: 'Hosting set-up help, up to 30 minutes of text/photo updates a month, monthly uptime check.' },
  ],
};

const empty = () => ({ prospects: [], audits: [], sites: [], leads: [], orders: [], settings: structuredClone(DEFAULT_SETTINGS) });

export function createStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'db.json');
  let db = empty();
  if (fs.existsSync(file)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
      db = { ...empty(), ...loaded, settings: { ...DEFAULT_SETTINGS, ...(loaded.settings || {}) } };
    } catch {
      fs.renameSync(file, `${file}.corrupt-${Date.now()}`);
    }
  }
  const save = () => {
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  };
  return { db, save, id: () => crypto.randomUUID(), file };
}
