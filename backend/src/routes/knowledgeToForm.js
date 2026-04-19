/**
 * Route Knowledge-to-Form — generation de quiz/formulaires depuis un document.
 *
 * POST /api/knowledge-to-form/analyze     (multipart ou JSON)
 * POST /api/knowledge-to-form/confirm/:id (body: overrides optionnels)
 * POST /api/knowledge-to-form/reject/:id
 *
 * Toutes les routes sont isolees par tenant et reservees aux roles
 * admin_ddene et superadmin. Les ecritures passent par le flux de
 * confirmation existant (meme pattern que l'agentic-layer).
 */

const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { getTool } = require('../agent/tools');
const {
  createConfirmation,
  executeConfirmation,
  rejectConfirmation,
  getConfirmation,
} = require('../agent/confirmationStore');

const router = express.Router();

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 Mo
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Type de fichier non supporte. Formats acceptes : PDF, DOCX, TXT.'));
  },
});

const adminMiddleware = [authenticate, tenantIsolation, authorize('admin_ddene', 'superadmin')];

/**
 * POST /api/knowledge-to-form/analyze
 *
 * Accepte soit un fichier (multipart champ "file"), soit une URL en JSON.
 * Champs supplementaires (form-data ou JSON) :
 *   - extractionMode : "DATA" (defaut) ou "STRUCTURE"
 *   - questionCount, questionType, optionCount
 *   - targetType : "module_draft" (defaut) ou "tournament_draft"
 *   - targetTitle : optionnel
 *   - url : URL a analyser (si pas de fichier)
 */
router.post('/analyze', ...adminMiddleware, memoryUpload.single('file'), async (req, res, next) => {
  try {
    const body = req.body || {};
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    if (!req.file && !url) {
      return res.status(400).json({ error: 'Fournissez un fichier ou une URL a analyser.' });
    }

    const source = req.file
      ? {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
        }
      : { url };

    const args = {
      source,
      extractionMode: body.extractionMode === 'STRUCTURE' ? 'STRUCTURE' : 'DATA',
      questionCount: body.questionCount ? Number(body.questionCount) : 10,
      questionType: body.questionType || 'quiz',
      optionCount: body.optionCount ? Number(body.optionCount) : 4,
      targetType: body.targetType === 'tournament_draft' ? 'tournament_draft' : 'module_draft',
      targetTitle: body.targetTitle || '',
    };

    const tool = getTool('knowledgeToForm');
    if (!tool) {
      return res.status(500).json({ error: 'Outil de generation indisponible.' });
    }

    const context = {
      user: { id: req.user.id, role: req.user.role, tenant_id: req.user.tenant_id },
      tenantId: req.tenantId,
      tenantFilter: req.tenantFilter || (() => ({ tenant_id: req.tenantId })),
      isSuperAdmin: req.isSuperAdmin,
      sessionId: `ktf:${Date.now()}`,
    };

    const result = await tool.run(args, context);

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Generation impossible.' });
    }

    if (!result.proposal) {
      return res.status(500).json({ error: 'Reponse inattendue de l\'outil de generation.' });
    }

    const confirmationId = createConfirmation(
      req.user.id.toString(),
      req.tenantId?.toString(),
      result.toolId,
      result.actionData,
      context.sessionId
    );

    res.json({
      confirmationId,
      summary: result.summary,
      toolId: result.toolId,
      mode: result.actionData.mode,
      title: result.actionData.title,
      targetType: result.actionData.targetType,
      questions: result.actionData.questions || [],
      fields: result.actionData.fields || [],
      sourceMeta: result.actionData.sourceMeta || {},
      expiresInMs: 5 * 60 * 1000,
    });
  } catch (err) {
    if (err.message && err.message.includes('Type de fichier')) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/knowledge-to-form/confirm/:id
 * Body : { title?, questions?, fields? } — modifications editees par l'admin.
 */
router.post('/confirm/:id', ...adminMiddleware, async (req, res, next) => {
  try {
    const body = req.body || {};
    const overrides = {};
    if (typeof body.title === 'string' && body.title.trim()) overrides.title = body.title.trim();
    if (Array.isArray(body.questions)) overrides.questions = body.questions;
    if (Array.isArray(body.fields)) overrides.fields = body.fields;

    const result = await executeConfirmation(
      req.params.id,
      req.user.id.toString(),
      Object.keys(overrides).length ? overrides : null
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, result: result.result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/knowledge-to-form/reject/:id
 */
router.post('/reject/:id', ...adminMiddleware, async (req, res, next) => {
  try {
    const result = await rejectConfirmation(req.params.id, req.user.id.toString());
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/knowledge-to-form/pending/:id — verifier si la proposition existe encore.
 */
router.get('/pending/:id', ...adminMiddleware, async (req, res) => {
  const conf = getConfirmation(req.params.id);
  if (!conf || conf.userId !== req.user.id.toString()) {
    return res.status(404).json({ error: 'Proposition introuvable.' });
  }
  res.json({
    status: conf.status,
    expiresAt: conf.expiresAt,
    remainingMs: Math.max(0, conf.expiresAt - Date.now()),
  });
});

module.exports = router;
