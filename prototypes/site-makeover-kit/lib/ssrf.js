// Outbound fetch guard: only public http(s) hosts, re-checked on every redirect and at connect time.
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import zlib from 'node:zlib';

export class UrlError extends Error {
  constructor(message, code = 'EURL') {
    super(message);
    this.code = code;
  }
}

const ALLOWED_PORTS = new Set(['', '80', '443', '8080', '8443']);

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    if (x === '::' || x === '::1') return true;
    const dotted = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (dotted) return isPrivateAddress(dotted[1]);
    const hex = x.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16), lo = parseInt(hex[2], 16);
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    }
    if (/^f[cd]/.test(x)) return true;      // unique local fc00::/7
    if (/^fe[89ab]/.test(x)) return true;   // link-local fe80::/10
    if (/^ff/.test(x)) return true;         // multicast
    if (x.startsWith('64:ff9b:')) return true; // NAT64 can map to private v4
    return false;
  }
  return true; // unknown format: block
}

export function validateUrlShape(raw) {
  let u;
  try {
    u = new URL(String(raw ?? '').trim());
  } catch {
    throw new UrlError('That is not a valid web address. Include http:// or https://.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new UrlError('Only http:// and https:// addresses can be audited.');
  }
  if (u.username || u.password) throw new UrlError('Addresses with embedded credentials are not allowed.');
  if (!ALLOWED_PORTS.has(u.port)) throw new UrlError('Only standard web ports (80, 443, 8080, 8443) are allowed.');
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host) throw new UrlError('The address has no host name.');
  if (
    host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    host.endsWith('.internal') || host.endsWith('.home.arpa')
  ) {
    throw new UrlError('Local and internal addresses cannot be audited.');
  }
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new UrlError('Private, loopback and link-local IP addresses cannot be audited.');
  } else if (!host.includes('.')) {
    throw new UrlError('Use a full public domain name, such as example.com.');
  }
  return u;
}

export async function assertPublicUrl(raw, lookup = dns.promises.lookup) {
  const u = validateUrlShape(raw);
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (!net.isIP(host)) {
    let addrs;
    try {
      addrs = await lookup(host, { all: true });
    } catch {
      throw new UrlError(`Could not find the domain "${host}". Check the spelling.`);
    }
    if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) {
      throw new UrlError('That domain points to a private or internal address, so it is blocked.', 'EBLOCKED');
    }
  }
  return u;
}

// Re-validates at connect time so a DNS answer that changes after the pre-check is still blocked.
function guardedLookup(hostname, opts, cb) {
  dns.lookup(hostname, { all: true, family: opts?.family || 0 }, (err, addrs) => {
    if (err) return cb(err);
    if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) {
      return cb(new UrlError('Blocked: the domain resolved to a private or internal address.', 'EBLOCKED'));
    }
    if (opts && opts.all) return cb(null, addrs);
    cb(null, addrs[0].address, addrs[0].family);
  });
}

function requestOnce(u, timeoutMs, maxBytes) {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === 'https:' ? https : http;
    let settled = false;
    const done = (fn, v) => { if (!settled) { settled = true; clearTimeout(hard); fn(v); } };
    const req = mod.request(u, {
      method: 'GET',
      lookup: guardedLookup,
      timeout: timeoutMs,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; SiteMakeoverKit/0.1; local website audit)',
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
        'accept-encoding': 'gzip, deflate, br',
      },
    }, res => {
      const status = res.statusCode;
      if (status >= 300 && status < 400) {
        res.resume();
        return done(resolve, { status, location: res.headers.location });
      }
      const type = String(res.headers['content-type'] || '');
      if (type && !/html|xml|text\/plain/i.test(type)) {
        res.resume();
        req.destroy();
        return done(reject, new UrlError(`That address returned "${type.split(';')[0]}", not a web page.`));
      }
      let stream = res;
      const enc = String(res.headers['content-encoding'] || '').toLowerCase();
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
      else if (enc === 'br') stream = res.pipe(zlib.createBrotliDecompress());
      const chunks = [];
      let size = 0;
      stream.on('data', c => {
        size += c.length;
        if (size > maxBytes) {
          req.destroy();
          done(reject, new UrlError('The page is larger than 3 MB, so the audit stopped.'));
        } else chunks.push(c);
      });
      stream.on('end', () => done(resolve, {
        status, headers: res.headers, body: Buffer.concat(chunks).toString('utf8'), bytes: size,
      }));
      stream.on('error', e => done(reject, new UrlError(`Could not read the page (${e.message}).`)));
    });
    const hard = setTimeout(() => req.destroy(new UrlError(`The site took longer than ${timeoutMs / 1000} seconds to respond.`)), timeoutMs);
    req.on('timeout', () => req.destroy(new UrlError(`The site took longer than ${timeoutMs / 1000} seconds to respond.`)));
    req.on('error', e => done(reject, e instanceof UrlError ? e : new UrlError(`Could not reach the site (${e.code || e.message}).`)));
    req.end();
  });
}

export async function safeFetch(raw, { timeoutMs = 10000, maxBytes = 3 * 1024 * 1024, maxRedirects = 3 } = {}) {
  let current = raw;
  const chain = [];
  for (let i = 0; i <= maxRedirects; i++) {
    const u = await assertPublicUrl(current);
    const res = await requestOnce(u, timeoutMs, maxBytes);
    chain.push({ url: u.href, status: res.status });
    if ([301, 302, 303, 307, 308].includes(res.status) && res.location) {
      if (i === maxRedirects) throw new UrlError(`The site redirected more than ${maxRedirects} times.`);
      current = new URL(res.location, u).href;
      continue;
    }
    if (res.status >= 400) throw new UrlError(`The site answered with HTTP ${res.status}.`);
    return { ...res, finalUrl: u.href, chain };
  }
  throw new UrlError('Too many redirects.');
}
