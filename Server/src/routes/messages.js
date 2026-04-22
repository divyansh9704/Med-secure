import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { v2 as cloudinary } from 'cloudinary';
import User from '../models/User.js';
import Message from '../models/Message.js';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

const STEGO_BASE = process.env.STEGO_SERVICE_URL || 'http://127.0.0.1:6001';

// Cloudinary setup
let CLOUDINARY_READY = false;
if (process.env.CLOUDINARY_URL) {
  const url = new URL(process.env.CLOUDINARY_URL);
  cloudinary.config({
    cloud_name: url.hostname,
    api_key: url.username,
    api_secret: url.password
  });
  CLOUDINARY_READY = true;
}

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

// Auth middleware
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

// Caesar cipher
function caesarShift(text, shift = 3) {
  return text.split('').map(c => {
    if (c.match(/[a-z]/i)) {
      const base = c === c.toUpperCase() ? 65 : 97;
      return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
    }
    return c;
  }).join('');
}

// Vigenere cipher
function vigenereCipher(text, key) {
  let result = '';
  let ki = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c.match(/[a-z]/i)) {
      const base = c === c.toUpperCase() ? 65 : 97;
      const kBase = key[ki % key.length].toUpperCase().charCodeAt(0) - 65;
      result += String.fromCharCode(((c.charCodeAt(0) - base + kBase) % 26) + base);
      ki++;
    } else {
      result += c;
    }
  }
  return result;
}

router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { patient_id, patient_name, recipient, recipients, data, file } = req.body;

    if (!patient_id || !patient_name || !data) {
      return res.status(400).json({
        message: 'patient_id, patient_name and data are required'
      });
    }

    // Normalise into an array of recipient identifiers
    let targetRecipients = [];
    if (Array.isArray(recipients) && recipients.length) {
      targetRecipients = recipients;
    } else if (recipient) {
      targetRecipients = [recipient];
    }

    if (!targetRecipients.length) {
      return res.status(400).json({
        message: 'At least one recipient is required'
      });
    }

    // Special flag: broadcast to all doctors
    if (targetRecipients.includes('__ALL_DOCTORS__')) {
      const doctors = await User.find({ role: 'doctor' }).select('email');
      targetRecipients = doctors.map(d => d.email).filter(Boolean);
    }

    if (!targetRecipients.length) {
      return res.status(400).json({
        message: 'No valid recipients resolved'
      });
    }

    // 🔒 SAFELY sanitize file (VERY IMPORTANT)
    const safeFile =
      file && file.b64 && file.mime
        ? {
            b64: file.b64,
            mime: file.mime,
            filename: file.filename || 'file'
          }
        : undefined;

    const results = [];
    let firstStego = null;

    for (const rawRecipient of targetRecipients) {
      const recipientKey = String(rawRecipient).trim().toLowerCase();
      if (!recipientKey) continue;

      // Resolve recipient username (optional)
      let recipientUser = null;
      try {
        recipientUser = await User.findOne({
          $or: [{ email: recipientKey }, { username: rawRecipient }]
        }).select('username email');
      } catch (_) {}

      // 🔐 CALL ENCRYPTION SERVICE
      let encResp;
      try {
        encResp = await axios.post(
          `${STEGO_BASE}/encrypt`,
          {
            patient_id,
            patient_name,
            data,
            sender: req.user.sub,
            recipient: recipientUser?.username || recipientKey,
            file: safeFile
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 15000
          }
        );
      } catch (err) {
        console.error('[encrypt] stego service error:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message
        });

        return res.status(err.response?.status || 500).json({
          message: 'Encryption service failed',
          error: err.response?.data || err.message
        });
      }

      const cipher_text = encResp.data?.cipher_text;
      if (!cipher_text) {
        return res.status(502).json({
          message: 'Encryption failed: missing cipher_text'
        });
      }

      const stego = encResp.data?.stego_file || null;

      // Extra ciphers (optional)
      const mono_cipher = caesarShift(data);
      const vigenere_cipher = vigenereCipher(
        data,
        process.env.VIGENERE_KEY || 'MEDSECURE'
      );

      // ☁️ Cloudinary uploads (optional)
      let file_url = null;
      let original_file_url = null;

      if (CLOUDINARY_READY) {
        if (stego?.b64) {
          try {
            const up = await cloudinary.uploader.upload(
              `data:${stego.mime};base64,${stego.b64}`,
              { folder: 'medsecure/stego', resource_type: 'auto' }
            );
            file_url = up.secure_url;
          } catch (e) {
            console.warn('[cloudinary] stego upload failed:', e.message);
          }
        }

        if (safeFile?.b64) {
          try {
            const up = await cloudinary.uploader.upload(
              `data:${safeFile.mime};base64,${safeFile.b64}`,
              { folder: 'medsecure/original', resource_type: 'auto' }
            );
            original_file_url = up.secure_url;
          } catch (e) {
            console.warn('[cloudinary] original upload failed:', e.message);
          }
        }
      }

      // 📦 Packaged file fallback
      let packagedFile;
      if (stego?.b64) {
        packagedFile = {
          mime: stego.mime,
          filename: stego.filename || 'stego',
          stego: {
            b64: stego.b64,
            mime: stego.mime,
            filename: stego.filename || 'stego'
          }
        };

        if (safeFile?.b64) {
          packagedFile.original = {
            b64: safeFile.b64,
            mime: safeFile.mime,
            filename: safeFile.filename
          };
        }
      } else {
        packagedFile = {
          b64: Buffer.from(cipher_text, 'utf8').toString('base64'),
          mime: 'application/octet-stream',
          filename: `message-${Date.now()}.enc`
        };
      }

      // 💾 Save to DB
      const created = await Message.create({
        sender: req.user.sub,
        senderUsername: req.user.sub,
        recipient: recipientKey,
        recipientUsername: recipientUser?.username || null,
        patient_id,
        patient_name,
        cipher_text,
        mono_cipher,
        vigenere_cipher,
        file_url,
        original_file_url,
        packagedFile
      });

      await AuditLog.create({
        username: req.user.sub,
        action: 'SEND_MESSAGE',
        patient_id
      });

      if (!firstStego && stego) {
        firstStego = stego;
      }

      results.push({
        id: created._id,
        recipient: recipientKey
      });

      // ── Real-time socket notification ─────────────────────────
      const io = req.app.get('io');
      if (io) {
        io.to(recipientKey).emit('receive_message', {
          fromName: req.user.sub,
          toId: recipientKey,
          toName: recipientUser?.username || recipientKey,
          patientId: patient_id,
          timestamp: new Date().toISOString()
        });
        console.log(`[SOCKET] Message from Dr. ${req.user.sub} → Dr. ${recipientUser?.username || recipientKey} (room: ${recipientKey}) — ${new Date().toISOString()}`);
      }
    }

    return res.status(201).json({
      ok: true,
      count: results.length,
      messages: results,
      stego_file: firstStego || null
    });

  } catch (err) {
    console.error('[send] unexpected error:', err);
    return res.status(500).json({
      message: 'Send failed',
      error: err.message
    });
  }
});

// Helper to build all identifiers that might have been stored in `recipient`
function buildRecipientKeys(user) {
  const keys = new Set();
  if (!user) return [];

  if (user.sub) keys.add(String(user.sub));
  if (user.email) {
    const email = String(user.email).toLowerCase();
    keys.add(email);
    const local = email.split('@')[0];
    keys.add(local);
  }

  return Array.from(keys);
}

// Check if the authenticated user is a participant in the message,
// accounting for historical variations (username, email, local part).
function userCanAccessMessage(user, msg) {
  if (!user || !msg) return false;

  const userKeys = buildRecipientKeys(user).map(v => String(v).toLowerCase());
  const msgKeys = [
    msg.sender,
    msg.senderUsername,
    msg.recipient,
    msg.recipientUsername
  ]
    .filter(Boolean)
    .map(v => String(v).toLowerCase());

  return msgKeys.some(v => userKeys.includes(v));
}

// Get inbox messages (messages where current user is the recipient)
router.get('/inbox', authMiddleware, async (req, res) => {
  try {
    const recipientKeys = buildRecipientKeys(req.user);

    const messages = await Message.find({
      $or: [
        { recipient: { $in: recipientKeys } },
        { recipientUsername: req.user.sub }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    const items = messages.map(m => ({
      ...m,
      has_stego: !!(m.file_url || m.packagedFile?.stego?.b64),
      has_original: !!(m.original_file_url || m.packagedFile?.original?.b64)
    }));

    return res.json({ items });
  } catch (err) {
    console.error('[inbox] error:', err);
    return res.status(500).json({ message: 'Failed to fetch inbox' });
  }
});

// Get sent messages (messages where current user is the sender)
router.get('/sent', authMiddleware, async (req, res) => {
  try {
    const senderKeys = buildRecipientKeys(req.user); // re‑use helper for historical data

    const messages = await Message.find({
      $or: [
        { sender: req.user.sub },
        { sender: { $in: senderKeys } },
        { senderUsername: req.user.sub }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    const items = messages.map(m => ({
      ...m,
      has_stego: !!(m.file_url || m.packagedFile?.stego?.b64),
      has_original: !!(m.original_file_url || m.packagedFile?.original?.b64)
    }));

    return res.json({ items });
  } catch (err) {
    console.error('[sent] error:', err);
    return res.status(500).json({ message: 'Failed to fetch sent messages' });
  }
});

// Download stego file - proxies through backend to avoid CORS
router.get('/:id/file/stego', authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check authorization against all historical identity forms
    if (!userCanAccessMessage(req.user, msg)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // If Cloudinary URL exists, proxy it
    if (msg.file_url) {
      try {
        const response = await axios.get(msg.file_url, { 
          responseType: 'arraybuffer',
          timeout: 15000
        });
        const mime = response.headers['content-type'] || 'application/octet-stream';
        const filename = `stego_${msg._id}.${mime.includes('png') ? 'png' : mime.includes('wav') ? 'wav' : 'bin'}`;
        
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        return res.send(Buffer.from(response.data));
      } catch (err) {
        console.error('[stego download] Cloudinary error:', err.message);
        // Fall through to packaged file
      }
    }

    // Fall back to packagedFile
    if (msg.packagedFile?.stego?.b64) {
      const buffer = Buffer.from(msg.packagedFile.stego.b64, 'base64');
      const mime = msg.packagedFile.stego.mime || 'application/octet-stream';
      const filename = msg.packagedFile.stego.filename || `stego_${msg._id}.bin`;
      
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    return res.status(404).json({ message: 'Stego file not found' });
  } catch (err) {
    console.error('[stego download] error:', err);
    return res.status(500).json({ message: 'Download failed' });
  }
});

// Download original file - proxies through backend to avoid CORS
router.get('/:id/file/original', authMiddleware, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check authorization against all historical identity forms
    if (!userCanAccessMessage(req.user, msg)) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // If Cloudinary URL exists, proxy it
    if (msg.original_file_url) {
      try {
        const response = await axios.get(msg.original_file_url, { 
          responseType: 'arraybuffer',
          timeout: 15000
        });
        const mime = response.headers['content-type'] || 'application/octet-stream';
        const filename = `original_${msg._id}.${mime.includes('png') ? 'png' : mime.includes('jpg') ? 'jpg' : mime.includes('wav') ? 'wav' : 'bin'}`;
        
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_ORIGIN || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        return res.send(Buffer.from(response.data));
      } catch (err) {
        console.error('[original download] Cloudinary error:', err.message);
        // Fall through to packaged file
      }
    }

    // Fall back to packagedFile
    if (msg.packagedFile?.original?.b64) {
      const buffer = Buffer.from(msg.packagedFile.original.b64, 'base64');
      const mime = msg.packagedFile.original.mime || 'application/octet-stream';
      const filename = msg.packagedFile.original.filename || `original_${msg._id}.bin`;
      
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    }

    return res.status(404).json({ message: 'Original file not found' });
  } catch (err) {
    console.error('[original download] error:', err);
    return res.status(500).json({ message: 'Download failed' });
  }
});

// Extract and decrypt from file
router.post('/extract', authMiddleware, async (req, res) => {
  try {
    const { file } = req.body;
    
    if (!file?.b64 || !file?.mime) {
      return res.status(400).json({ message: 'file {b64, mime} required' });
    }

    // Call encryption service to extract
    const extractResp = await axios.post(
      `${STEGO_BASE}/extract`,
      { file },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const cipher_text = extractResp.data?.cipher_text;
    if (!cipher_text) {
      return res.status(400).json({ message: 'Failed to extract data from file' });
    }

    // Decrypt the cipher text
    const decryptResp = await axios.post(
      `${STEGO_BASE}/decrypt`,
      { cipher_text },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );

    const payload = decryptResp.data?.data;
    if (!payload) {
      return res.status(400).json({ message: 'Failed to decrypt data' });
    }

    // Mark message as decrypted if found
    await Message.updateOne(
      { cipher_text, recipient: req.user.sub },
      { $set: { decrypted: true } }
    );

    await AuditLog.create({
      username: req.user.sub,
      action: 'DECRYPT_MESSAGE',
      patient_id: payload.patient_id
    });

    return res.json({
      patient_id: payload.patient_id,
      patient_name: payload.patient_name,
      decrypted_message: payload.message,
      payload,
      cipher_text
    });
  } catch (err) {
    console.error('[extract] error:', err);
    // If the error is from the Python service, forward its status and message
    if (err.response && err.response.data) {
      return res.status(err.response.status || 500).json({
        message: err.response.data.error || err.response.data.message || 'Extraction failed',
        error: err.response.data
      });
    }
    return res.status(500).json({ 
      message: 'Extraction failed',
      error: err.message
    });
  }
});

export default router;
