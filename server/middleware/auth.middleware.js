import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';

function readToken(value) { return String(value || '').replace(/^Bearer\s+/i, '').trim(); }
function verifyToken(token) { return jwt.verify(readToken(token), JWT_SECRET); }
function requireAuth(req, res, next) {
  try {
    req.user = verifyToken(req.headers.authorization);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' });
  }
}

export { requireAuth, verifyToken };



