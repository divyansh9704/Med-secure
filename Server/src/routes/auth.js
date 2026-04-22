
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import speakeasy from 'speakeasy';

const router = express.Router();

// Endpoint to verify TOTP code after QR scan and enable TOTP
router.post('/verify-totp', async (req, res) => {
  try {
    const { identifier, totp } = req.body;
    const id = (identifier || '').toString();
    const query = id.includes('@') ? { email: id.toLowerCase() } : { username: id };
    const user = await User.findOne(query);
    if (!user || !user.totpSecret) return res.status(400).json({ error: 'User or TOTP secret not found' });
    const validTotp = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: String(totp),
      window: 1
    });
    if (!validTotp) {
      return res.status(401).json({ error: 'Invalid authenticator code' });
    }
    user.isTotpEnabled = true;
    await user.save();
    return res.json({ ok: true, message: 'TOTP setup complete. You can now log in.' });
  } catch (e) {
    return res.status(500).json({ error: 'TOTP verification failed' });
  }
});

const signToken = (username, email, role) => jwt.sign({ sub: username, email, role }, process.env.JWT_SECRET, { expiresIn: '1h' });

// Helper: extract JWT from either cookie or Authorization header
const getTokenFromRequest = (req) => {
  const cookieName = process.env.COOKIE_NAME || 'auth_token';
  const cookieToken = req.cookies?.[cookieName];

  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let bearerToken = null;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.slice(7).trim();
  }

  return cookieToken || bearerToken || null;
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username & password required' });
    const exists = await User.findOne({ $or: [{ username }, { email: email?.toLowerCase() }] });
    if (exists) return res.status(409).json({ error: 'User exists' });
    const passwordHash = await bcrypt.hash(password, 12);
    // Generate TOTP secret for Google Authenticator
    const totpSecret = speakeasy.generateSecret({
      name: `MediSecure (${username})`,
      length: 20
    });

    const user = await User.create({
      username,
      email: email?.toLowerCase(),
      passwordHash,
      role: role || 'doctor',
      totpSecret: totpSecret.base32,
      isTotpEnabled: true
    });
    await AuditLog.create({ username: user.username, action: 'REGISTER' });
    return res.json({
      ok: true,
      user: { username: user.username, email: user.email, role: user.role },
      totp: {
        secret: totpSecret.base32,
        otpauth_url: totpSecret.otpauth_url
      }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Register failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, email, identifier, password, totp } = req.body;
    const id = (identifier || email || username || '').toString();
    const query = id.includes('@') ? { email: id.toLowerCase() } : { username: id };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // If user does not have TOTP set up, initiate TOTP enrollment
    if (!user.totpSecret || !user.isTotpEnabled) {
      // Generate a new TOTP secret
      const speakeasy = require('speakeasy');
      const qrcode = require('qrcode');
      const secret = speakeasy.generateSecret({ name: `MedSecure (${user.email || user.username})` });
      // Save secret temporarily in DB (not enabled until verified)
      user.totpSecret = secret.base32;
      await user.save();
      // Generate QR code data URL
      const otpauthUrl = secret.otpauth_url;
      const qr = await qrcode.toDataURL(otpauthUrl);
      return res.status(200).json({
        requireTotpSetup: true,
        qr,
        otpauthUrl,
        message: 'Scan the QR code with your authenticator app and enter the code to complete login.'
      });
    }
    // Enforce TOTP verification if enabled for the account
    if (user.isTotpEnabled && user.totpSecret) {
      if (!totp) {
        return res.status(401).json({ error: 'Authenticator code required' });
      }
      const validTotp = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: String(totp),
        window: 1
      });
      if (!validTotp) {
        return res.status(401).json({ error: 'Invalid authenticator code' });
      }
    }
    const token = signToken(user.username, user.email, user.role);

    // Set HTTP-only cookie for same-origin or browsers that still allow it
    res.cookie(process.env.COOKIE_NAME || 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 60 * 60 * 1000
    });

    await AuditLog.create({ username: user.username, action: 'LOGIN' });
    // Also return token in body so SPA can send it via Authorization header
    return res.json({
      ok: true,
      token,
      user: { username: user.username, email: user.email, role: user.role }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

const authMiddleware = (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// List all registered doctors (for recipient selection)
router.get('/doctors', authMiddleware, async (_req, res) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('username email');
    return res.json({ doctors });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load doctors' });
  }
});

router.post('/logout', authMiddleware, (req, res) => {
  const username = req.user?.sub;
  const cookieName = process.env.COOKIE_NAME || 'auth_token';

  // Clear cookie with the same attributes used when setting it so
  // browsers actually remove the cross-site, secure cookie in prod.
  res.clearCookie(cookieName, {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
    path: '/'
  });
  if (username) AuditLog.create({ username, action: 'LOGOUT' }).catch(()=>{});
  return res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: { username: req.user.sub, email: req.user.email, role: req.user.role } });
});

// Fetch full profile for the logged-in user
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.sub }).select('username email role createdAt');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Update profile fields: username, email
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { username, email } = req.body || {};
    const user = await User.findOne({ username: req.user.sub });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const oldUsername = user.username;

    // Username uniqueness check if changed
    if (typeof username === 'string' && username.trim() && username !== user.username) {
      const trimmed = username.trim();
      if (trimmed.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
      const exists = await User.findOne({ username: trimmed });
      if (exists) return res.status(409).json({ error: 'Username already taken' });
      user.username = trimmed;
    }

    // Email uniqueness check if changed
    if (typeof email === 'string' && email.toLowerCase() !== (user.email || '').toLowerCase()) {
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists) return res.status(409).json({ error: 'Email already in use' });
      user.email = email.toLowerCase();
    }

    await user.save();
    await AuditLog.create({ username: user.username, action: 'UPDATE_PROFILE', details: `Changed from ${oldUsername}` }).catch(() => {});

    // Issue new token if username changed
    let newToken = null;
    if (user.username !== oldUsername) {
      newToken = signToken(user.username, user.email, user.role);
      res.cookie(process.env.COOKIE_NAME || 'auth_token', newToken, {
        httpOnly: true,
        secure: process.env.COOKIE_SECURE === 'true',
        sameSite: 'Strict',
        maxAge: 8 * 60 * 60 * 1000
      });
    }

    return res.json({
      ok: true,
      user: {
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      tokenRefreshed: !!newToken
    });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
