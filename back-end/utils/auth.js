import jwt from 'jsonwebtoken';

export function authenticateToken(handler) {
  return async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      return handler(req, res);
    } catch {
      return res.status(403).json({ error: 'Forbidden' });
    }
  };
}

export function optionalAuthenticateToken(handler) {
  return async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    req.user = null;
    if (token) {
      try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
      } catch {}
    }
    return handler(req, res);
  };
}
