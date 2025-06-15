import rateLimit from 'express-rate-limit';

const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => req.user?.id?.toString() || req.ip,
  handler: (req, res) => res.status(429).json({ error: 'Too many AI requests — slow down.' }),
});

export default aiLimiter;
