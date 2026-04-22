import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';

const router = express.Router();

router.get('/status', async (req, res) => {
  const stegoBase = process.env.STEGO_SERVICE_URL || 'http://127.0.0.1:6001';
  const out = {
    node_ok: true,
    mongo_connected: mongoose.connection.readyState === 1,
    stego_service_url: stegoBase,
    stego_health: { ok: false },
    client_origin: process.env.CLIENT_ORIGIN,
    cookie_name: process.env.COOKIE_NAME || 'auth_token',
    cookie_secure: process.env.COOKIE_SECURE === 'true'
  };
  try {
    const r = await axios.get(`${stegoBase}/health`, { timeout: 2000 });
    out.stego_health = r.data || { ok: true };
  } catch (e) {
    out.stego_health = { ok: false, error: e.message };
  }
  res.json(out);
});

export default router;
