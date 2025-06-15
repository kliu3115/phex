const requests = new Map();
const WINDOW_MS = 60_000; // 1 minute window
const MAX_REQUESTS = 5;

export default function aiLimiter(handler) {
  return async function (req, res) {
    const userId = req.user?.id?.toString();
    const key = userId || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';

    const now = Date.now();
    let entry = requests.get(key);

    if (!entry) {
      entry = { count: 1, startTime: now };
      requests.set(key, entry);
    } else {
      if (now - entry.startTime > WINDOW_MS) {
        entry.count = 1;
        entry.startTime = now;
      } else {
        entry.count++;
      }
    }

    if (entry.count > MAX_REQUESTS) {
      return res.status(429).json({ error: 'Too many AI requests — slow down.' });
    }

    return handler(req, res);
  };
}
