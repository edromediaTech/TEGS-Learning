const express = require('express');
const QRCode = require('qrcode');
const Module = require('../models/Module');
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

router.use(authenticate);
router.use(tenantIsolation);

// -----------------------------------------------------------------------
// GET /api/qr/module/:id
// Generate QR code for a module (links to share page or exam join)
// -----------------------------------------------------------------------
router.get('/module/:id', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    }).select('title shareToken shareEnabled');

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://luminous-mesh-459718-p4.web.app';
    const shareUrl = mod.shareEnabled && mod.shareToken
      ? `${baseUrl}/share/${mod.shareToken}`
      : `${baseUrl}/admin/modules/${mod._id}`;

    const format = req.query.format || 'png';

    if (format === 'svg') {
      const svg = await QRCode.toString(shareUrl, {
        type: 'svg',
        width: parseInt(req.query.size) || 300,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' },
      });
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    }

    // PNG (default)
    const buffer = await QRCode.toBuffer(shareUrl, {
      type: 'png',
      width: parseInt(req.query.size) || 300,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-${mod._id}.png"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/qr/module/:id/data
// Return QR code as data URL (base64) for embedding in pages
// -----------------------------------------------------------------------
router.get('/module/:id/data', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    }).select('title shareToken shareEnabled');

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://luminous-mesh-459718-p4.web.app';
    const shareUrl = mod.shareEnabled && mod.shareToken
      ? `${baseUrl}/share/${mod.shareToken}`
      : `${baseUrl}/admin/modules/${mod._id}`;

    const dataUrl = await QRCode.toDataURL(shareUrl, {
      width: parseInt(req.query.size) || 300,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    });

    res.json({
      moduleId: mod._id,
      title: mod.title,
      shareUrl,
      qrDataUrl: dataUrl,
    });
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// GET /api/qr/badge/:moduleId/:userId
// Generate a student badge QR (links to student results)
// Used by Inspect-mobile to scan and get student performance
// -----------------------------------------------------------------------
router.get('/badge/:moduleId/:userId', async (req, res, next) => {
  try {
    const { moduleId, userId } = req.params;

    const [mod, user] = await Promise.all([
      Module.findOne({ _id: moduleId, ...req.tenantFilter() }).select('title'),
      User.findById(userId).select('firstName lastName'),
    ]);

    if (!mod || !user) {
      return res.status(404).json({ error: 'Module ou utilisateur introuvable' });
    }

    // Badge data: encoded as JSON in QR
    const badgeData = JSON.stringify({
      type: 'tegs-badge',
      moduleId,
      userId,
      tenant: req.tenantId,
      ts: Date.now(),
    });

    const buffer = await QRCode.toBuffer(badgeData, {
      type: 'png',
      width: parseInt(req.query.size) || 250,
      margin: 2,
      color: { dark: '#1e3a5f', light: '#ffffff' },
    });

    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------
// POST /api/qr/decode
// Decode a TEGS badge QR and return student performance
// Used by Inspect-mobile after scanning
// -----------------------------------------------------------------------
router.post('/decode', async (req, res, next) => {
  try {
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({ error: 'qrData est requis' });
    }

    let parsed;
    try {
      parsed = JSON.parse(qrData);
    } catch {
      return res.status(400).json({ error: 'QR invalide - format JSON attendu' });
    }

    if (parsed.type !== 'tegs-badge') {
      return res.status(400).json({ error: 'QR non reconnu - type tegs-badge attendu' });
    }

    const { moduleId, userId } = parsed;

    const [mod, user, result] = await Promise.all([
      Module.findById(moduleId).select('title'),
      User.findById(userId).select('firstName lastName email district className'),
      QuizResult.findOne({ module_id: moduleId, user_id: userId })
        .sort({ completedAt: -1 })
        .lean(),
    ]);

    if (!mod || !user) {
      return res.status(404).json({ error: 'Donnees introuvables pour ce badge' });
    }

    res.json({
      student: {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        district: user.district || '',
        className: user.className || '',
      },
      module: {
        id: mod._id,
        title: mod.title,
      },
      result: result ? {
        score: result.percentage,
        totalScore: result.totalScore,
        maxScore: result.maxScore,
        passed: result.percentage >= 50,
        completedAt: result.completedAt,
        duration: result.duration,
        questionsCorrect: result.answers?.filter(a => a.isCorrect).length || 0,
        questionsTotal: result.answers?.length || 0,
      } : null,
      badge: result && result.percentage >= 50 ? {
        type: result.percentage >= 80 ? 'gold' : result.percentage >= 60 ? 'silver' : 'bronze',
        label: result.percentage >= 80 ? 'Excellence' : result.percentage >= 60 ? 'Bien' : 'Acquis',
      } : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
