import express from 'express';
import jwt from 'jsonwebtoken';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.cookies[process.env.COOKIE_NAME || 'auth_token'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.get('/', authMiddleware, async (req, res) => {
  const { role, sub } = req.user;
  const query = role === 'admin' ? {} : { username: sub };
  const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(500);
  res.json({ logs });
});

export default router;
