const express = require('express');
const crypto = require('crypto');
const Statement = require('../models/Statement');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

// Toutes les routes sync necessitent authentification + isolation tenant
router.use(authenticate);
router.use(tenantIsolation);

/**
 * POST /api/sync/batch
 *
 * Importe un lot de statements xAPI captures hors-ligne.
 * Utilise par SIGEEE-Desktop et Inspect-mobile pour synchroniser
 * les donnees collectees sur le terrain.
 *
 * Logique de deduplication :
 *   - Chaque statement doit avoir un `id` (UUID) genere cote client
 *   - Si un statement avec le meme `id` existe deja, il est ignore (pas de doublon)
 *   - Resolution par timestamp : si un statement duplique a un timestamp plus recent,
 *     il met a jour le result (score, completion, success)
 *
 * Payload attendu :
 * {
 *   "source": "inspect-mobile" | "sigeee-desktop" | "tegs-runtime",
 *   "deviceId": "tablet-001",  // optionnel, pour tracabilite
 *   "statements": [
 *     {
 *       "id": "uuid-genere-cote-client",
 *       "actor": {
 *         "user_id": "ObjectId du user",  // optionnel si absent, utilise le user connecte
 *         "name": "Jean Pierre",
 *         "mbox": "mailto:jean@ecole.edu.ht"
 *       },
 *       "verb": { "id": "http://adlnet.gov/expapi/verbs/completed", "display": {"fr-HT": "a complete"} },
 *       "object": { "id": "https://tegs-learning.edu.ht/activities/math-101" },
 *       "result": { "score": { "scaled": 0.85 }, "success": true, "completion": true },
 *       "timestamp": "2026-03-06T14:30:00Z"
 *     }
 *   ]
 * }
 *
 * Reponse :
 * {
 *   "synced": 95,       // Statements crees
 *   "duplicates": 5,    // Statements ignores (deja existants)
 *   "updated": 2,       // Statements mis a jour (timestamp plus recent)
 *   "errors": [],       // Erreurs individuelles
 *   "total": 100
 * }
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { statements, source, deviceId } = req.body;

    if (!Array.isArray(statements) || statements.length === 0) {
      return res.status(400).json({ error: 'statements doit etre un tableau non vide' });
    }

    // Limite de batch : 500 statements max par requete
    if (statements.length > 500) {
      return res.status(400).json({
        error: 'Maximum 500 statements par batch',
        received: statements.length,
      });
    }

    const results = {
      synced: 0,
      duplicates: 0,
      updated: 0,
      errors: [],
      total: statements.length,
    };

    // Recuperer le user connecte pour enrichir les actors si besoin
    const connectedUser = await User.findById(req.user.id);

    // Collecter tous les statementIds pour une seule requete de deduplication
    const incomingIds = statements
      .map(s => s.id)
      .filter(Boolean);

    // Charger les statements existants en une seule requete
    const existingStmts = await Statement.find({
      statementId: { $in: incomingIds },
      ...req.tenantFilter(),
    }).lean();

    const existingMap = new Map();
    for (const s of existingStmts) {
      existingMap.set(s.statementId, s);
    }

    // Traiter chaque statement
    const toInsert = [];
    const toUpdate = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Validation minimale
      if (!stmt.verb || !stmt.verb.id) {
        results.errors.push({ index: i, error: 'verb.id manquant' });
        continue;
      }
      if (!stmt.object || !stmt.object.id) {
        results.errors.push({ index: i, error: 'object.id manquant' });
        continue;
      }

      const stmtId = stmt.id || crypto.randomUUID();
      const stmtTimestamp = stmt.timestamp ? new Date(stmt.timestamp) : new Date();

      // Verifier si existe deja
      const existing = existingMap.get(stmtId);

      if (existing) {
        // Resolution par timestamp : si le nouveau est plus recent, mettre a jour le result
        const existingTs = new Date(existing.timestamp);
        if (stmtTimestamp > existingTs && stmt.result) {
          toUpdate.push({
            stmtId,
            result: buildResult(stmt.result),
            timestamp: stmtTimestamp,
          });
          results.updated++;
        } else {
          results.duplicates++;
        }
        continue;
      }

      // Construire l'actor
      const actor = buildActor(stmt.actor, connectedUser, req.user.id);

      // Construire le statement complet
      const statementData = {
        statementId: stmtId,
        actor,
        verb: {
          id: stmt.verb.id,
          display: stmt.verb.display || {},
        },
        object: {
          id: stmt.object.id,
          objectType: stmt.object.objectType || 'Activity',
          definition: stmt.object.definition || {},
        },
        tenant_id: req.tenantId,
        timestamp: stmtTimestamp,
        voided: false,
      };

      // Result
      if (stmt.result) {
        statementData.result = buildResult(stmt.result);
      }

      // Context : enrichir avec source et deviceId
      statementData.context = {
        registration: stmt.context?.registration || undefined,
        extensions: {
          ...(stmt.context?.extensions || {}),
          'https://tegs-learning.edu.ht/extensions/sync-source': source || 'unknown',
          'https://tegs-learning.edu.ht/extensions/device-id': deviceId || 'unknown',
          'https://tegs-learning.edu.ht/extensions/synced-at': new Date().toISOString(),
          syncSource: source || 'unknown',
          syncDeviceId: deviceId || 'unknown',
        },
      };

      toInsert.push(statementData);
    }

    // Insertion en batch (ordered: false pour continuer malgre les erreurs)
    if (toInsert.length > 0) {
      try {
        const inserted = await Statement.insertMany(toInsert, { ordered: false });
        results.synced = inserted.length;
      } catch (bulkErr) {
        // Certains ont pu etre inseres malgre les erreurs
        if (bulkErr.insertedDocs) {
          results.synced = bulkErr.insertedDocs.length;
        }
        // Les erreurs de duplication (code 11000) sont des doublons
        if (bulkErr.writeErrors) {
          for (const we of bulkErr.writeErrors) {
            if (we.code === 11000) {
              results.duplicates++;
            } else {
              results.errors.push({
                index: we.index,
                error: we.errmsg || 'Erreur insertion',
              });
            }
          }
        }
      }
    }

    // Updates en batch
    for (const upd of toUpdate) {
      await Statement.updateOne(
        { statementId: upd.stmtId, ...req.tenantFilter() },
        { $set: { result: upd.result, timestamp: upd.timestamp } }
      );
    }

    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sync/status
 *
 * Retourne les statistiques de synchronisation pour le tenant :
 * - Nombre total de statements
 * - Nombre de statements synchronises (avec sync-source)
 * - Dernier timestamp de synchronisation
 * - Repartition par source
 */
router.get('/status', async (req, res, next) => {
  try {
    const filter = req.tenantFilter();

    const [total, syncedStatements] = await Promise.all([
      Statement.countDocuments(filter),
      Statement.find({
        ...filter,
        'context.extensions.syncSource': { $exists: true, $ne: 'unknown' },
      })
        .sort({ timestamp: -1 })
        .limit(1)
        .lean(),
    ]);

    // Compter par source via aggregation
    const sourceBreakdown = await Statement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            $ifNull: [
              '$context.extensions.syncSource',
              'direct',
            ],
          },
          count: { $sum: 1 },
          lastSync: { $max: '$timestamp' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      total,
      sources: sourceBreakdown.map(s => ({
        source: s._id,
        count: s.count,
        lastSync: s.lastSync,
      })),
      lastSyncedStatement: syncedStatements[0] || null,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/sync/resolve-conflicts
 *
 * Resolution manuelle de conflits pour les admins.
 * Compare deux statements et garde celui avec le timestamp le plus recent
 * ou celui specifie par l'admin.
 */
router.post('/resolve-conflicts',
  authorize('admin_ddene'),
  async (req, res, next) => {
    try {
      const { statementIds, strategy } = req.body;

      if (!Array.isArray(statementIds) || statementIds.length < 2) {
        return res.status(400).json({ error: 'Au moins 2 statementIds requis' });
      }

      const statements = await Statement.find({
        statementId: { $in: statementIds },
        ...req.tenantFilter(),
      }).sort({ timestamp: -1 });

      if (statements.length < 2) {
        return res.status(404).json({ error: 'Statements non trouves dans ce tenant' });
      }

      // Strategie par defaut : garder le plus recent, voider les autres
      const keep = strategy === 'oldest' ? statements[statements.length - 1] : statements[0];
      const toVoid = statements.filter(s => s.statementId !== keep.statementId);

      for (const s of toVoid) {
        s.voided = true;
        await s.save();
      }

      res.json({
        kept: keep.statementId,
        voided: toVoid.map(s => s.statementId),
        strategy: strategy || 'newest',
      });
    } catch (err) {
      next(err);
    }
  }
);

// --- Helpers ---

function buildActor(stmtActor, connectedUser, connectedUserId) {
  if (stmtActor && stmtActor.user_id) {
    return {
      user_id: stmtActor.user_id,
      name: stmtActor.name || 'Unknown',
      mbox: stmtActor.mbox || `mailto:${stmtActor.user_id}@tegs.local`,
    };
  }
  // Fallback : utiliser le user connecte
  return {
    user_id: connectedUserId,
    name: connectedUser
      ? `${connectedUser.firstName} ${connectedUser.lastName}`
      : `${connectedUserId}`,
    mbox: connectedUser
      ? `mailto:${connectedUser.email}`
      : `mailto:${connectedUserId}@tegs.local`,
  };
}

function buildResult(result) {
  const r = {};
  if (result.score) {
    r.score = {};
    if (result.score.scaled !== undefined) r.score.scaled = result.score.scaled;
    if (result.score.raw !== undefined) r.score.raw = result.score.raw;
    if (result.score.min !== undefined) r.score.min = result.score.min;
    if (result.score.max !== undefined) r.score.max = result.score.max;
  }
  if (result.success !== undefined) r.success = result.success;
  if (result.completion !== undefined) r.completion = result.completion;
  if (result.duration) r.duration = result.duration;
  if (result.response) r.response = result.response;
  return r;
}

module.exports = router;
