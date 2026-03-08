const express = require('express');
const crypto = require('crypto');
const { body, query, validationResult } = require('express-validator');
const Statement = require('../models/Statement');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');

const router = express.Router();

// Toutes les routes xAPI necessitent authentification + isolation tenant
router.use(authenticate);
router.use(tenantIsolation);

// ---------------------------------------------------------------------------
// POST /api/xapi/statements
// Enregistre un ou plusieurs statements xAPI.
// Le tenant_id et l'actor sont injectes automatiquement depuis le token JWT.
// ---------------------------------------------------------------------------
router.post(
  '/statements',
  [
    body('verb').notEmpty().withMessage('verb est requis'),
    body('verb.id').notEmpty().withMessage('verb.id est requis'),
    body('verb.display').notEmpty().withMessage('verb.display est requis'),
    body('object').notEmpty().withMessage('object est requis'),
    body('object.id').notEmpty().withMessage('object.id est requis'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { verb, object, result, context, timestamp } = req.body;

      // Construction du statement avec injection automatique de l'actor et du tenant
      const statementData = {
        statementId: req.body.id || crypto.randomUUID(),
        actor: {
          user_id: req.user.id,
          name: `${req.user.id}`, // Sera enrichi par le user lookup ci-dessous
          mbox: `mailto:${req.user.id}@tegs.local`,
        },
        verb,
        object: {
          id: object.id,
          objectType: object.objectType || 'Activity',
          definition: object.definition || {},
        },
        tenant_id: req.tenantId,
        timestamp: timestamp || new Date(),
        voided: false,
      };

      // Enrichir l'actor avec les infos reelles du user
      const User = require('../models/User');
      const user = await User.findById(req.user.id);
      if (user) {
        statementData.actor.name = `${user.firstName} ${user.lastName}`;
        statementData.actor.mbox = `mailto:${user.email}`;
      }

      // Ajouter result si present
      if (result) {
        statementData.result = {};
        if (result.score) {
          statementData.result.score = {};
          if (result.score.scaled !== undefined) statementData.result.score.scaled = result.score.scaled;
          if (result.score.raw !== undefined) statementData.result.score.raw = result.score.raw;
          if (result.score.min !== undefined) statementData.result.score.min = result.score.min;
          if (result.score.max !== undefined) statementData.result.score.max = result.score.max;
        }
        if (result.success !== undefined) statementData.result.success = result.success;
        if (result.completion !== undefined) statementData.result.completion = result.completion;
        if (result.duration) statementData.result.duration = result.duration;
        if (result.response) statementData.result.response = result.response;
      }

      // Ajouter context si present
      if (context) {
        statementData.context = {};
        if (context.registration) statementData.context.registration = context.registration;
        if (context.extensions) statementData.context.extensions = context.extensions;
      }

      const statement = await Statement.create(statementData);

      res.status(201).json({
        message: 'Statement enregistre avec succes',
        statementId: statement.statementId,
        statement: {
          id: statement.statementId,
          actor: statement.actor,
          verb: statement.verb,
          object: statement.object,
          result: statement.result,
          context: statement.context,
          timestamp: statement.timestamp,
          tenant_id: statement.tenant_id,
        },
      });
    } catch (err) {
      // Gestion des erreurs de validation Mongoose (ex: verbe invalide)
      if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ error: 'Validation xAPI echouee', details: messages });
      }
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/xapi/statements
// Recupere les statements avec isolation multi-tenant.
// - Un utilisateur standard ne voit que SES propres traces.
// - Un admin_ddene ou teacher voit les traces de TOUTE son ecole.
//
// Filtres optionnels via query params :
//   ?verb=<verb_id>   - Filtrer par verbe
//   ?activity=<id>    - Filtrer par activite (object.id)
//   ?agent=<user_id>  - Filtrer par user (admin/teacher uniquement)
//   ?since=<date>     - Traces depuis cette date
//   ?until=<date>     - Traces jusqu'a cette date
//   ?limit=<n>        - Nombre max de resultats (defaut 100)
// ---------------------------------------------------------------------------
router.get('/statements', async (req, res, next) => {
  try {
    // ISOLATION OBLIGATOIRE : toujours filtrer par tenant
    const filter = { ...req.tenantFilter(), voided: false };

    // Restriction par role : un student ne voit que ses propres traces
    if (req.user.role === 'student') {
      filter['actor.user_id'] = req.user.id;
    }

    // Filtres optionnels
    if (req.query.verb) {
      filter['verb.id'] = req.query.verb;
    }
    if (req.query.activity) {
      filter['object.id'] = req.query.activity;
    }
    if (req.query.agent && ['admin_ddene', 'teacher'].includes(req.user.role)) {
      filter['actor.user_id'] = req.query.agent;
    }

    // Filtre temporel
    if (req.query.since || req.query.until) {
      filter.timestamp = {};
      if (req.query.since) filter.timestamp.$gte = new Date(req.query.since);
      if (req.query.until) filter.timestamp.$lte = new Date(req.query.until);
    }

    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const statements = await Statement.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({
      statements,
      count: statements.length,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
