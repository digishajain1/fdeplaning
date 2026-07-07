import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { initDatabase } from './db/init.js';
import commentsRouter from './routes/comments.js';
import commitmentsRouter from './routes/commitments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Create HTTP server for both Express and WebSocket
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// Track connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`WebSocket client connected (${clients.size} total)`);
  
  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected (${clients.size} total)`);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
});

// Broadcast function to send updates to all connected clients
export function broadcast(type, payload) {
  const message = JSON.stringify({ type, payload });
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

// Security & performance middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for static/SPA routes (more permissive)
const staticLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// API routes
app.use('/api/comments', commentsRouter);
app.use('/api/commitments', commitmentsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(), 
    wsClients: clients.size,
    uptime: process.uptime(),
    memory: process.memoryUsage().heapUsed
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: isProd ? 'Internal server error' : err.message 
  });
});

// Serve static files in production
if (isProd) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  
  // SPA fallback
  app.get('*', staticLimiter, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Start server after database is ready
async function start() {
  await initDatabase();
  
  server.listen(PORT, () => {
    console.log(`🚀 FDE Planning server running on http://localhost:${PORT}`);
    console.log(`   WebSocket endpoint: ws://localhost:${PORT}/ws`);
    console.log(`   Mode: ${isProd ? 'production' : 'development'}`);
  });
}

start().catch(console.error);

export default app;
