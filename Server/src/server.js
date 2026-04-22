import 'dotenv/config';                // ← must be FIRST so env vars are available to all imports
import http from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './routes/auth.js';
import messageRoutes from './routes/messages.js';
import auditRoutes from './routes/audit.js';
import debugRoutes from './routes/debug.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));
// Rate limiting: 10 requests per minute per IP for sensitive endpoints
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


// Allow Vercel frontend and localhost for dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

const corsConfig = {
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/.*vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsConfig));

// ── Socket.IO setup (all handlers inline, no separate files) ────
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: corsConfig });
app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[SOCKET] New client connected — socket id: ${socket.id} — ${new Date().toISOString()}`);

  socket.on('join_room', ({ doctorId, doctorName }) => {
    socket.join(doctorId);
    console.log(`[SOCKET] Dr. ${doctorName} joined room: ${doctorId} — ${new Date().toISOString()}`);
  });

  socket.on('send_message', ({ fromName, toId, toName, patientId }) => {
    const targets = Array.isArray(toId) ? toId : [toId];
    const names   = Array.isArray(toName) ? toName : [toName];

    targets.forEach((id, i) => {
      const name = names[i] || names[0] || 'Unknown';
      io.to(id).emit('receive_message', { fromName, toId: id, toName: name, patientId, timestamp: new Date().toISOString() });
      console.log(`[SOCKET] Message from Dr. ${fromName} → Dr. ${name} (room: ${id}) — ${new Date().toISOString()}`);
    });
  });

  socket.on('leave_room', ({ doctorId, doctorName }) => {
    socket.leave(doctorId);
    console.log(`[SOCKET] Dr. ${doctorName} left room: ${doctorId} — ${new Date().toISOString()}`);
  });

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Client disconnected — socket id: ${socket.id} — ${new Date().toISOString()}`);
  });
});

// ── MongoDB connection with fallback ──
const MONGO_URI = process.env.MONGO_URI;
let dbConnected = false;

if (!MONGO_URI) {
  console.warn('[DB] Missing MONGO_URI in env — running in limited mode (no database)');
} else {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 15000,
    });
    dbConnected = true;
    console.log('[DB] MongoDB connected successfully');
  } catch (err) {
    console.error(`[DB] MongoDB connection failed: ${err.message}`);
    console.warn('[DB] MongoDB unavailable — running in limited mode');
  }
}

// Expose DB status so routes can check it
app.set('dbConnected', dbConnected);

// Apply rate limiter to sensitive message endpoints
app.use('/messages/send', messageLimiter);
app.use('/messages/extract', messageLimiter);
app.get('/health', (_req, res) => res.json({ ok: true, db: dbConnected }));

app.use('/auth', authRoutes);
app.use('/messages', messageRoutes);
app.use('/audit', auditRoutes);
app.use('/debug', debugRoutes);

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Node backend running on port ${PORT}`);
});
