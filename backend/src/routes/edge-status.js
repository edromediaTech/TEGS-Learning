/**
 * Etat d'un noeud TEGS-Edge (monte uniquement en EDGE_MODE).
 *
 * GET  /api/edge/status    - derniere synchro, outbox, simulations installees, contenu local
 * POST /api/edge/sync-now  - declenche un cycle de synchronisation tout de suite
 */
const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const EdgeState = require('../models/EdgeState');
const Statement = require('../models/Statement');
const User = require('../models/User');
const Module = require('../models/Module');
const CrnsClassroom = require('../models/CrnsClassroom');
const syncWorker = require('../edge/syncWorker');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin_ddene', 'teacher'));

router.get('/status', async (req, res, next) => {
  try {
    const state = await EdgeState.load();
    const outbox = Object.fromEntries(
      (await Statement.aggregate([
        { $match: { 'edge_sync.status': { $exists: true } } },
        { $group: { _id: '$edge_sync.status', n: { $sum: 1 } } },
      ])).map((g) => [g._id, g.n])
    );
    const lastFailed = await Statement.find({ 'edge_sync.status': 'FAILED' })
      .sort({ updatedAt: -1 }).limit(5).select('statementId edge_sync.last_error').lean();
    res.json({
      center_id: (process.env.TEGS_CENTER_ID || '').toUpperCase(),
      edge_version: syncWorker.EDGE_VERSION,
      sync: {
        last_pull_ok_at: state.last_pull_ok_at,
        last_push_ok_at: state.last_push_ok_at,
        last_error: state.last_error || null,
        last_error_at: state.last_error_at || null,
        consecutive_failures: state.consecutive_failures,
        next_attempt_at: state.next_attempt_at,
        clock_offset_ms: state.clock_offset_ms ?? null,
      },
      outbox: {
        pending: outbox.PENDING || 0,
        retry: outbox.RETRY || 0,
        failed: outbox.FAILED || 0,
        synced: outbox.SYNCED || 0,
        last_failed: lastFailed.map((s) => ({ statement_id: s.statementId, error: s.edge_sync?.last_error })),
      },
      simulations: [...state.installed].map(([id, v]) => ({ id, version: v.version, installed_at: v.installed_at })),
      local: {
        students: await User.countDocuments({ role: 'student', isActive: true }),
        classrooms: await CrnsClassroom.countDocuments({ archived_at: null }),
        modules: await Module.countDocuments({}),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/sync-now', (req, res) => {
  syncWorker.syncNow();
  res.status(202).json({ status: 'scheduled' });
});

module.exports = router;
