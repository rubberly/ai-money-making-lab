// Optional login gate (HTTP Basic auth). Off unless APP_PASSWORD is set.
// APP_USERNAME is optional: when set, the username must match too; otherwise any username works.
import { createHash, timingSafeEqual } from 'node:crypto';

const same = (a, b) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export function passwordOk(req, password, username) {
  if (!password) return true;
  const m = (req.headers.authorization || '').match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!m) return false;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  const givenUser = decoded.slice(0, sep);
  const givenPass = decoded.slice(sep + 1);
  const userOk = username ? same(givenUser, username) : true;
  return same(givenPass, password) && userOk;
}

export function askForPassword(res) {
  res.writeHead(401, { 'www-authenticate': 'Basic realm="Workspace", charset="UTF-8"', 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  res.end('Sign in required. Use the APP_USERNAME and APP_PASSWORD values set for this app.');
}
