// Tiny JSON-file store. Writes are serialized and atomic (write temp file, then rename).

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const EMPTY = () => ({
  clients: [],
  jobs: [],
  prospects: [],
  leads: [],
  testOrders: [],
  settings: {
    yourName: '',
    businessName: 'Repurpose Desk',
    pilotPrice: 150,
    monthlyPrice: 600,
    episodesPerMonth: 4,
    toolCostsMonthly: 20,
    targetHourlyRate: 40,
  },
});

export function newId() {
  return randomUUID().slice(0, 8);
}

export class Store {
  constructor(dir) {
    this.dir = dir;
    this.file = join(dir, 'db.json');
    this.data = null;
    this.queue = Promise.resolve();
  }

  async load() {
    await mkdir(this.dir, { recursive: true });
    if (existsSync(this.file)) {
      const raw = await readFile(this.file, 'utf8');
      try {
        this.data = { ...EMPTY(), ...JSON.parse(raw) };
        this.data.settings = { ...EMPTY().settings, ...this.data.settings };
      } catch {
        // Keep the unreadable file for manual recovery rather than overwriting it.
        await rename(this.file, `${this.file}.corrupt-${Date.now()}`);
        this.data = EMPTY();
      }
    } else {
      this.data = EMPTY();
      await this.save();
    }
    return this;
  }

  save() {
    const snapshot = JSON.stringify(this.data, null, 2);
    this.queue = this.queue.then(async () => {
      const tmp = `${this.file}.tmp`;
      await writeFile(tmp, snapshot, 'utf8');
      await rename(tmp, this.file);
    });
    return this.queue;
  }
}
