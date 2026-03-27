require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const userRoutes = require('./routes/users');
const xapiRoutes = require('./routes/xapi');
const moduleRoutes = require('./routes/modules');
const cmi5Routes = require('./routes/cmi5');
const shareRoutes = require('./routes/share');
const uploadRoutes = require('./routes/upload');
const syncRoutes = require('./routes/sync');
const analyticsRoutes = require('./routes/analytics');
const reportingRoutes = require('./routes/reporting');
const subscriptionRoutes = require('./routes/subscription');
const liveArenaRoutes = require('./routes/live-arena');
const qrcodeRoutes = require('./routes/qrcode');

const http = require('http');
const path = require('path');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

// --- Middlewares globaux ---
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// --- Cache headers CDN pour fichiers statiques ---
app.use('/public', express.static(path.join(__dirname, '..', 'public'), {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    // JS/CSS: cache longue duree avec revalidation
    if (/\.(js|css)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    }
    // Images/medias: cache 30 jours
    if (/\.(png|jpg|jpeg|gif|webp|svg|mp4|webm|mp3|wav|ogg|pdf)$/.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
  },
}));

// --- Routes ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'tegs-learning-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/xapi', xapiRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/cmi5', cmi5Routes);
app.use('/api/share', shareRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reporting', reportingRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/live-arena', liveArenaRoutes);
app.use('/api/qr', qrcodeRoutes);

// --- Gestion d'erreurs globale ---
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Erreur interne du serveur',
  });
});

// --- Demarrage ---
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    initSocket(server);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] TEGS-Learning backend demarre sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[FATAL] Impossible de se connecter a MongoDB:', err.message);
    process.exit(1);
  });

module.exports = app;
