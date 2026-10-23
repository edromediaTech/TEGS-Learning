const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { callAIGateway } = require('../services/aiGateway');

const router = express.Router();

router.use(authenticate);
router.use(tenantIsolation);

// ---------------------------------------------------------------------------
// POST /api/tutor/explain
// Tuteur IA pour les simulations CRNS. Le frontend envoie le contexte
// pedagogique (sim, event, runtime) et recoit une explication en francais
// adaptee au niveau secondaire haitien.
// ---------------------------------------------------------------------------
router.post(
  '/explain',
  [
    body('simulation_id').isString().notEmpty(),
    body('event_id').optional().isString(),
    body('title').optional().isString(),
    body('subject').optional().isString(),
    body('grade_level').optional().isString(),
    body('objective').optional().isString(),
    body('event_description').optional().isString(),
    body('runtime').optional({ nullable: true }).isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        simulation_id,
        event_id,
        title,
        subject,
        grade_level,
        objective,
        event_description,
        runtime,
      } = req.body;

      const lines = [];
      lines.push(
        "Tu es un tuteur scientifique pour le secondaire haitien. Tu travailles pour le CRNS (Centre de Ressources Numeriques et de Simulation) sous la DDENE."
      );
      lines.push("Reponds en francais simple, avec des analogies du quotidien haitien si pertinent (energie solaire, eau, agriculture).");
      lines.push("Sois concis (3 a 5 phrases). Termine par UNE question qui pousse l'eleve a reflechir.");
      lines.push("");
      lines.push(`Simulation : ${title || simulation_id}`);
      if (subject) lines.push(`Matiere : ${subject}`);
      if (grade_level) lines.push(`Niveau : ${grade_level}`);
      if (objective) lines.push(`Objectif pedagogique : ${objective}`);
      if (event_id || event_description) {
        lines.push('');
        lines.push(`Evenement declenche : ${event_id || ''}${event_description ? ' - ' + event_description : ''}`);
      }
      if (runtime && Object.keys(runtime).length > 0) {
        lines.push('');
        lines.push('Variables actuelles :');
        for (const [k, v] of Object.entries(runtime)) {
          lines.push(`  - ${k} = ${typeof v === 'object' ? JSON.stringify(v) : v}`);
        }
      }
      lines.push('');
      lines.push("Explique a l'eleve ce qui se passe et pourquoi.");

      const prompt = lines.join('\n');
      const explanation = await callAIGateway(prompt, 'generate', req.tenantId, {
        max_tokens: 500,
        temperature: 0.5,
      });

      res.json({
        simulation_id,
        event_id: event_id || null,
        explanation: typeof explanation === 'string' ? explanation : String(explanation),
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
