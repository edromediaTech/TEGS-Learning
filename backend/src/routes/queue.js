const express = require('express');
const { body, validationResult } = require('express-validator');
const trafficController = require('../services/trafficController');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

/**
 * Générer un session ID à partir de l'IP + user-agent.
 */
function getSessionId(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const ua = (req.headers['user-agent'] || '').substring(0, 50);
  return `${ip}:${Buffer.from(ua).toString('base64').substring(0, 20)}`;
}

// ===========================================================================
// ROUTES PUBLIQUES
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /api/queue/status
// Vérifier si l'utilisateur doit attendre
// ---------------------------------------------------------------------------
router.get('/status', (req, res) => {
  const sessionId = getSessionId(req);
  const tournamentId = req.query.tournament_id || null;
  const competitionToken = req.query.token || null;

  const result = trafficController.checkAccess(sessionId, { tournamentId, competitionToken });
  res.json(result);
});

// ---------------------------------------------------------------------------
// POST /api/queue/release
// Signaler un départ (libère la place)
// ---------------------------------------------------------------------------
router.post('/release', (req, res) => {
  const sessionId = getSessionId(req);
  trafficController.release(sessionId);
  res.json({ message: 'Session libérée' });
});

// ===========================================================================
// ROUTES ADMIN
// ===========================================================================
router.use(authenticate);
router.use(tenantIsolation);

// ---------------------------------------------------------------------------
// GET /api/queue/stats
// Dashboard admin : stats temps réel de la file d'attente
// ---------------------------------------------------------------------------
router.get('/stats', authorize('admin_ddene'), (req, res) => {
  res.json(trafficController.getStats());
});

// ---------------------------------------------------------------------------
// POST /api/queue/force
// Admin : activer/désactiver le sas manuellement
// ---------------------------------------------------------------------------
router.post(
  '/force',
  authorize('admin_ddene'),
  (req, res) => {
    const { enabled, tournament_id } = req.body;

    if (tournament_id) {
      trafficController.setForceForTournament(tournament_id, !!enabled);
      return res.json({
        message: `Sas ${enabled ? 'activé' : 'désactivé'} pour le tournoi`,
        tournament_id,
        enabled: !!enabled,
      });
    }

    trafficController.setForceEnabled(!!enabled);
    res.json({
      message: `Sas global ${enabled ? 'activé' : 'désactivé'}`,
      forceEnabled: trafficController.forceEnabled,
    });
  }
);

// ---------------------------------------------------------------------------
// PUT /api/queue/configure
// Admin : modifier les paramètres du contrôleur
// ---------------------------------------------------------------------------
router.put(
  '/configure',
  authorize('admin_ddene'),
  (req, res) => {
    const { maxConcurrent, batchSize, intervalSeconds } = req.body;
    trafficController.configure({ maxConcurrent, batchSize, intervalSeconds });
    res.json({
      message: 'Configuration mise à jour',
      config: {
        maxConcurrent: trafficController.maxConcurrent,
        batchSize: trafficController.batchSize,
        intervalSeconds: trafficController.intervalMs / 1000,
      },
    });
  }
);

module.exports = router;
