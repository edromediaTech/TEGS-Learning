const express = require('express');
const { body, param, validationResult } = require('express-validator');
const DeviceToken = require('../models/DeviceToken');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const fcm = require('../services/fcm');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/notifications/register-device
// Enregistrer un token FCM (appelé au démarrage de l'app mobile)
// ---------------------------------------------------------------------------
router.post(
  '/register-device',
  [
    body('token').notEmpty().withMessage('Token FCM requis'),
    body('platform').optional().isIn(['android', 'ios', 'web']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, platform, participant_id } = req.body;

      // Upsert le device token
      const device = await DeviceToken.findOneAndUpdate(
        { token },
        {
          token,
          user_id: req.body.user_id || null,
          participant_id: participant_id || null,
          tenant_id: req.body.tenant_id || null,
          platform: platform || 'web',
          active: true,
        },
        { upsert: true, new: true }
      );

      res.json({ message: 'Device enregistre', device_id: device._id });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// Routes authentifiées
// ---------------------------------------------------------------------------
router.use(authenticate);
router.use(tenantIsolation);

// ---------------------------------------------------------------------------
// POST /api/notifications/send-tournament
// Envoyer une notification à tous les participants d'un tournoi
// ---------------------------------------------------------------------------
router.post(
  '/send-tournament',
  authorize('admin_ddene', 'teacher'),
  [
    body('tournament_id').isMongoId().withMessage('tournament_id invalide'),
    body('title').notEmpty().withMessage('Titre requis'),
    body('body').notEmpty().withMessage('Corps du message requis'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tournament_id, title, body: msgBody, data } = req.body;

      const result = await fcm.sendToTournament(tournament_id, {
        title,
        body: msgBody,
        data: data || {},
      });

      res.json({
        message: `Notification envoyee`,
        sent: result.sent,
        successes: result.successes,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/notifications/send-user
// Envoyer une notification à un utilisateur spécifique
// ---------------------------------------------------------------------------
router.post(
  '/send-user',
  authorize('admin_ddene', 'teacher'),
  [
    body('user_id').isMongoId().withMessage('user_id invalide'),
    body('title').notEmpty().withMessage('Titre requis'),
    body('body').notEmpty().withMessage('Corps du message requis'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const results = await fcm.sendToUser(req.body.user_id, {
        title: req.body.title,
        body: req.body.body,
        data: req.body.data || {},
      });

      res.json({
        message: 'Notification envoyee',
        devices: results.length,
        successes: results.filter((r) => r.success).length,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
