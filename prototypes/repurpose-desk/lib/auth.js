// Optional password gate (HTTP Basic auth). Off unless APP_PASSWORD is set.
// Any username is accepted; only the password is checked.
import { createHash, timingSafeEqual } from 'node:crypto';

export function passwordOk(req, password) {
  if (!password) return true;
  const m = (req.headers.authorization || '').match(/^Basic\s+([A-Za-z0-9+/=]+)$/i);
  if (!m) return false;
  const decoded = Buffer.from(m[1], 'base64').toString('utf8');
  const given = decoded.slice(decoded.indexOf(':') + 1);
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(password).digest();
  return timingSafeEqual(a, b);
}

export function askForPassword(res) {
  res.writeHead(401, { 'www-authenticate': 'Basic realm="Workspace", charset="UTF-8"', 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  res.end('Password required. Any username works; use the APP_PASSWORD value.');
}
