import crypto from 'node:crypto';

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
// both sides hashed to 32 bytes, so lengths always match
const same = (a, b) => typeof a === 'string' && crypto.timingSafeEqual(sha(a), sha(b));

export const LOOPBACK = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
export const defaultIsLocal = (req) => LOOPBACK.has(req.socket.remoteAddress);

const PAGE = '<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Token দরকার</title><body style="font-family:sans-serif;padding:2rem"><p>এই dashboard-এ ঢুকতে token লাগে। ঠিকানার শেষে ?key=&lt;আপনার token&gt; যোগ করুন।</p></body></html>';

export function authMiddleware({ token, isLocal = defaultIsLocal }) {
  if (!token) return (req, res, next) => next();
  const cookieVal = sha(token).toString('hex');
  return (req, res, next) => {
    if (isLocal(req)) return next();
    const cookie = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith('dash_auth='));
    if (cookie && same(cookie.slice(10), cookieVal)) return next();
    if (same(req.query.key, token)) {
      res.setHeader('Set-Cookie', `dash_auth=${cookieVal}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000`);
      const u = new URL(req.originalUrl, 'http://x');
      u.searchParams.delete('key');
      return res.redirect(302, u.pathname + u.search);
    }
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'token needed' });
    res.status(401).type('html').send(PAGE);
  };
}
