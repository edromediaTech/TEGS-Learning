const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Module = require('../models/Module');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { requireLimit } = require('../middleware/featureGate');

const router = express.Router();

// Toutes les routes modules : auth + tenant isolation
router.use(authenticate);
router.use(tenantIsolation);
// Seuls admin_ddene et teacher peuvent gerer les modules
router.use(authorize('admin_ddene', 'teacher'));

// ---------------------------------------------------------------------------
// POST /api/modules
// Creer un nouveau module (cours)
// ---------------------------------------------------------------------------
router.post(
  '/',
  requireLimit('modules', async (req) => {
    return Module.countDocuments({ tenant_id: req.tenantId });
  }),
  [
    body('title').notEmpty().withMessage('Le titre est requis'),
    body('language').optional().isIn(['fr', 'ht', 'en']).withMessage('Langue invalide'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, description, language, coverImage } = req.body;

      // superadmin must specify tenant_id
      const targetTenant = req.body.tenant_id || req.tenantId;
      if (!targetTenant) {
        return res.status(400).json({ error: 'tenant_id requis pour creer un module' });
      }

      const mod = await Module.create({
        title,
        description: description || '',
        language: language || 'fr',
        coverImage: coverImage || '',
        sections: [],
        tenant_id: targetTenant,
        created_by: req.user.id,
      });

      res.status(201).json({
        message: 'Module cree avec succes',
        module: mod,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/modules
// Lister les modules de l'ecole (tenant-isolated)
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const modules = await Module.find(req.tenantFilter())
      .sort({ createdAt: -1 })
      .lean();

    res.json({ modules, count: modules.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/modules/:id
// Recuperer un module par ID (avec ses sections/ecrans)
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    });

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    res.json({ module: mod });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/modules/:id
// Mettre a jour les infos du module (titre, description, langue, image)
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  [
    body('title').optional().notEmpty().withMessage('Le titre ne peut pas etre vide'),
    body('language').optional().isIn(['fr', 'ht', 'en']).withMessage('Langue invalide'),
    body('surveillanceMode').optional().isIn(['light', 'strict']).withMessage('Mode de surveillance invalide (light ou strict)'),
    body('globalTimeLimit').optional().isNumeric().withMessage('globalTimeLimit doit etre un nombre'),
    body('evaluationType').optional().isIn(['live', 'personalized']).withMessage('evaluationType invalide (live ou personalized)'),
    body('liveStartTime').optional({ nullable: true }),
    body('liveEndTime').optional({ nullable: true }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Validate live mode dates
      if (req.body.evaluationType === 'live') {
        if (!req.body.liveStartTime || !req.body.liveEndTime) {
          return res.status(400).json({ error: 'Les dates de debut et fin sont requises pour le mode Live' });
        }
        if (new Date(req.body.liveEndTime) <= new Date(req.body.liveStartTime)) {
          return res.status(400).json({ error: 'La date de fin doit etre posterieure a la date de debut' });
        }
      }

      const allowed = ['title', 'description', 'language', 'coverImage', 'status', 'theme', 'surveillanceMode', 'strictSettings', 'globalTimeLimit', 'evaluationType', 'liveStartTime', 'liveEndTime', 'contestMode', 'proctoring', 'snapshotInterval'];
      const updates = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const mod = await Module.findOneAndUpdate(
        { _id: req.params.id, ...req.tenantFilter() },
        updates,
        { new: true, runValidators: true }
      );

      if (!mod) {
        return res.status(404).json({ error: 'Module introuvable' });
      }

      res.json({ message: 'Module mis a jour', module: mod });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /api/modules/:id
// Supprimer un module
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  try {
    const mod = await Module.findOneAndDelete({
      _id: req.params.id,
      ...req.tenantFilter(),
    });

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    res.json({ message: 'Module supprime avec succes' });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/modules/:id/structure
// Remplacer toute l'arborescence sections/ecrans du module
// ---------------------------------------------------------------------------
router.put('/:id/structure', async (req, res, next) => {
  try {
    const { sections } = req.body;

    if (!Array.isArray(sections)) {
      return res.status(400).json({ error: 'sections doit etre un tableau' });
    }

    // Valider la structure
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.title || typeof s.title !== 'string') {
        return res.status(400).json({ error: `Section ${i}: titre requis` });
      }
      if (s.screens && !Array.isArray(s.screens)) {
        return res.status(400).json({ error: `Section ${i}: screens doit etre un tableau` });
      }
      if (s.screens) {
        for (let j = 0; j < s.screens.length; j++) {
          if (!s.screens[j].title || typeof s.screens[j].title !== 'string') {
            return res.status(400).json({ error: `Section ${i}, Ecran ${j}: titre requis` });
          }
        }
      }
    }

    // Charger le module existant pour preserver les contentBlocks
    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    });

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    // Index des ecrans existants par _id pour preserver leur contenu
    const existingScreens = {};
    for (const sec of mod.sections) {
      for (const sc of sec.screens) {
        existingScreens[sc._id.toString()] = sc.contentBlocks || [];
      }
    }

    // Normaliser les ordres et preserver les contentBlocks
    const normalized = sections.map((s, i) => ({
      title: s.title,
      order: s.order !== undefined ? s.order : i,
      screens: (s.screens || []).map((sc, j) => ({
        ...(sc._id ? { _id: sc._id } : {}),
        title: sc.title,
        order: sc.order !== undefined ? sc.order : j,
        contentBlocks: sc._id && existingScreens[sc._id] ? existingScreens[sc._id] : (sc.contentBlocks || []),
      })),
    }));

    mod.sections = normalized;
    await mod.save();

    res.json({ message: 'Structure mise a jour', module: mod });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/modules/:id/screens/:screenId
// Recuperer un ecran specifique avec ses blocs de contenu
// ---------------------------------------------------------------------------
router.get('/:id/screens/:screenId', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    });

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    let foundScreen = null;
    let sectionTitle = '';
    for (const section of mod.sections) {
      const screen = section.screens.id(req.params.screenId);
      if (screen) {
        foundScreen = screen;
        sectionTitle = section.title;
        break;
      }
    }

    if (!foundScreen) {
      return res.status(404).json({ error: 'Ecran introuvable' });
    }

    res.json({
      screen: foundScreen,
      sectionTitle,
      moduleTitle: mod.title,
      moduleId: mod._id,
    });
  } catch (err) {
    next(err);
  }
});

// Nettoie le HTML dangereux d'une chaine (balises script, event handlers, etc.)
function sanitizeText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|style|meta|base)[^>]*>/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
    .replace(/javascript\s*:/gi, '');
}

// ---------------------------------------------------------------------------
// PUT /api/modules/:id/screens/:screenId/content
// Sauvegarder les blocs de contenu d'un ecran
// ---------------------------------------------------------------------------
router.put('/:id/screens/:screenId/content', async (req, res, next) => {
  try {
    const { contentBlocks } = req.body;

    if (!Array.isArray(contentBlocks)) {
      return res.status(400).json({ error: 'contentBlocks doit etre un tableau' });
    }

    const validTypes = [
      'text', 'media', 'quiz',
      'heading', 'separator', 'image', 'text_image', 'video', 'audio', 'pdf', 'embed',
      'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'likert', 'open_answer', 'callout',
    ];
    for (let i = 0; i < contentBlocks.length; i++) {
      const block = contentBlocks[i];
      if (!block.type || !validTypes.includes(block.type)) {
        return res.status(400).json({
          error: `Bloc ${i}: type invalide (attendu: ${validTypes.join(', ')})`,
        });
      }
      if (!block.data || typeof block.data !== 'object') {
        return res.status(400).json({ error: `Bloc ${i}: data requis` });
      }

      // Validation specifique par type (legacy strict pour text/media/quiz)
      if (block.type === 'text' && typeof block.data.content !== 'string') {
        return res.status(400).json({ error: `Bloc ${i}: data.content requis pour un bloc texte` });
      }
      if (block.type === 'media') {
        if (!block.data.url || typeof block.data.url !== 'string') {
          return res.status(400).json({ error: `Bloc ${i}: data.url requis pour un bloc media` });
        }
        if (!['image', 'video'].includes(block.data.mediaType)) {
          return res.status(400).json({ error: `Bloc ${i}: data.mediaType doit etre image ou video` });
        }
      }
      if (block.type === 'quiz') {
        if (!block.data.question || typeof block.data.question !== 'string') {
          return res.status(400).json({ error: `Bloc ${i}: data.question requis pour un bloc quiz` });
        }
        if (!Array.isArray(block.data.options) || block.data.options.length < 2) {
          return res.status(400).json({ error: `Bloc ${i}: au moins 2 options requises` });
        }
        const hasCorrect = block.data.options.some((o) => o.isCorrect === true)
          || (typeof block.data.correctIndex === 'number' && block.data.correctIndex >= 0 && block.data.correctIndex < block.data.options.length);
        if (!hasCorrect) {
          return res.status(400).json({ error: `Bloc ${i}: au moins une bonne reponse requise` });
        }
      }
    }

    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    });

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    // Trouver l'ecran dans les sections
    let foundScreen = null;
    for (const section of mod.sections) {
      const screen = section.screens.id(req.params.screenId);
      if (screen) {
        foundScreen = screen;
        break;
      }
    }

    if (!foundScreen) {
      return res.status(404).json({ error: 'Ecran introuvable' });
    }

    // Mettre a jour les blocs avec les ordres normalises + sanitisation
    foundScreen.contentBlocks = contentBlocks.map((b, i) => {
      const data = { ...b.data };
      // Sanitiser le contenu textuel de chaque type de bloc
      if (b.type === 'text') {
        data.content = sanitizeText(data.content);
      }
      if (b.type === 'quiz') {
        data.question = sanitizeText(data.question);
        data.explanation = sanitizeText(data.explanation || '');
        if (data.options) {
          data.options = data.options.map((o) => ({ ...o, text: sanitizeText(o.text) }));
        }
      }
      if (b.type === 'media') {
        data.caption = sanitizeText(data.caption || '');
      }
      // Sanitisation des nouveaux types
      if (b.type === 'heading') data.text = sanitizeText(data.text || '');
      if (b.type === 'image') { data.caption = sanitizeText(data.caption || ''); data.alt = sanitizeText(data.alt || ''); }
      if (b.type === 'text_image') data.text = sanitizeText(data.text || '');
      if (b.type === 'video') data.caption = sanitizeText(data.caption || '');
      if (b.type === 'audio') data.title = sanitizeText(data.title || '');
      if (b.type === 'pdf') data.title = sanitizeText(data.title || '');
      if (b.type === 'embed') data.title = sanitizeText(data.title || '');
      if (b.type === 'true_false') {
        data.statement = sanitizeText(data.statement || '');
        data.explanation = sanitizeText(data.explanation || '');
      }
      if (b.type === 'numeric') {
        data.question = sanitizeText(data.question || '');
        data.explanation = sanitizeText(data.explanation || '');
        data.unit = sanitizeText(data.unit || '');
      }
      if (b.type === 'fill_blank') {
        data.text = sanitizeText(data.text || '');
        data.explanation = sanitizeText(data.explanation || '');
      }
      if (b.type === 'matching') {
        data.instruction = sanitizeText(data.instruction || '');
        data.explanation = sanitizeText(data.explanation || '');
        if (data.pairs) data.pairs = data.pairs.map((p) => ({ left: sanitizeText(p.left || ''), right: sanitizeText(p.right || '') }));
      }
      if (b.type === 'sequence') {
        data.instruction = sanitizeText(data.instruction || '');
        data.explanation = sanitizeText(data.explanation || '');
        if (data.items) data.items = data.items.map((it) => sanitizeText(it || ''));
      }
      if (b.type === 'likert') data.question = sanitizeText(data.question || '');
      return { type: b.type, order: b.order !== undefined ? b.order : i, data };
    });

    await mod.save();

    res.json({
      message: 'Contenu de l\'ecran sauvegarde',
      screen: foundScreen,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/modules/:id/share
// Activer/desactiver le partage et generer un token signe
// ---------------------------------------------------------------------------
const crypto = require('crypto');

router.post('/:id/share', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    });

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    const { enabled } = req.body;

    if (enabled) {
      // Generer un token signe unique si pas deja present
      if (!mod.shareToken) {
        mod.shareToken = crypto.createHash('sha256')
          .update(`${mod._id}-${mod.tenant_id}-${Date.now()}-${crypto.randomUUID()}`)
          .digest('hex')
          .slice(0, 32);
      }
      mod.shareEnabled = true;
    } else {
      mod.shareEnabled = false;
      // On garde le token pour pouvoir reactiver sans casser les liens existants
    }

    await mod.save();

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = mod.shareEnabled
      ? `${baseUrl}/api/share/public/${mod.shareToken}`
      : null;

    res.json({
      message: mod.shareEnabled ? 'Partage active' : 'Partage desactive',
      shareEnabled: mod.shareEnabled,
      shareToken: mod.shareToken,
      shareUrl,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/modules/:id/share
// Recuperer les infos de partage du module
// ---------------------------------------------------------------------------
router.get('/:id/share', async (req, res, next) => {
  try {
    const mod = await Module.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    }).select('shareEnabled shareToken');

    if (!mod) {
      return res.status(404).json({ error: 'Module introuvable' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = mod.shareEnabled && mod.shareToken
      ? `${baseUrl}/api/share/public/${mod.shareToken}`
      : null;

    res.json({
      shareEnabled: mod.shareEnabled,
      shareToken: mod.shareToken,
      shareUrl,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/modules/:id/ai-generate
// Generate quiz questions via AI Gateway
// ---------------------------------------------------------------------------
router.post(
  '/:id/ai-generate',
  [
    param('id').isMongoId(),
    body('topic').notEmpty().withMessage('Le sujet est requis'),
    body('count').optional().isInt({ min: 1, max: 10 }),
    body('types').optional().isArray(),
    body('difficulty').optional().isIn(['facile', 'moyen', 'difficile']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const mod = await Module.findOne({ _id: req.params.id, ...req.tenantFilter() });
      if (!mod) return res.status(404).json({ error: 'Module introuvable' });

      const { topic, count = 5, types = ['quiz', 'true_false', 'fill_blank'], difficulty = 'moyen' } = req.body;

      const typesDesc = types.map(t => {
        const labels = {
          quiz: 'QCM (4 choix, 1 correct)',
          true_false: 'Vrai/Faux (statement + answer true/false)',
          numeric: 'Numérique (question + answer number)',
          fill_blank: 'Texte à trous (text avec ___ + answer)',
          matching: 'Appariement (pairs [{left, right}])',
          sequence: 'Séquence (items à ordonner)',
        };
        return labels[t] || t;
      }).join(', ');

      const prompt = `Tu es un expert pédagogique haïtien. Génère exactement ${count} questions de quiz sur le sujet : "${topic}".

Contexte : Module "${mod.title}" pour des élèves haïtiens.
Difficulté : ${difficulty}
Types de questions à utiliser : ${typesDesc}

IMPORTANT : Réponds UNIQUEMENT avec un tableau JSON valide (pas de texte avant/après). Chaque élément doit avoir cette structure exacte :

Pour type "quiz" :
{"type":"quiz","data":{"question":"...","options":[{"text":"...","isCorrect":true},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false},{"text":"...","isCorrect":false}],"explanation":"...","points":5,"duration":1}}

Pour type "true_false" :
{"type":"true_false","data":{"statement":"...","answer":true,"explanation":"...","points":5,"duration":1}}

Pour type "numeric" :
{"type":"numeric","data":{"question":"...","answer":42,"tolerance":0,"unit":"","explanation":"...","points":5,"duration":1}}

Pour type "fill_blank" :
{"type":"fill_blank","data":{"text":"La capitale de Haïti est ___.","answer":"Port-au-Prince","explanation":"...","points":5,"duration":1}}

Pour type "matching" :
{"type":"matching","data":{"instruction":"...","pairs":[{"left":"...","right":"..."},{"left":"...","right":"..."}],"explanation":"...","points":5,"duration":1}}

Pour type "sequence" :
{"type":"sequence","data":{"instruction":"...","items":["premier","deuxieme","troisieme"],"explanation":"...","points":5,"duration":1}}

Varie les types parmi ceux demandés. Les questions doivent être pertinentes, éducatives et adaptées au niveau ${difficulty}.`;

      const aiText = await callAIGateway(prompt, 'generate', req.tenantId);

      // Parse JSON from AI response
      let questions = [];
      try {
        // Extract JSON array from response (handle markdown code blocks)
        const jsonMatch = aiText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON array found');
        }
      } catch (parseErr) {
        return res.status(422).json({
          error: 'L\'IA n\'a pas retourné un format valide',
          raw: aiText.substring(0, 500),
        });
      }

      // Validate and sanitize each question
      const validTypes = ['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence'];
      const sanitized = questions
        .filter(q => q && q.type && validTypes.includes(q.type) && q.data)
        .slice(0, 10)
        .map((q, i) => ({
          type: q.type,
          order: i,
          data: q.data,
        }));

      res.json({
        message: `${sanitized.length} questions générées par l'IA`,
        blocks: sanitized,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Call the dp-ai-gateway-service for AI generation.
 */
async function callAIGateway(prompt, taskType, tenantId) {
  const gatewayUrl = process.env.AI_GATEWAY_URL || 'https://dp-ai-gateway-service-746425674533.us-central1.run.app';
  const gatewayToken = process.env.GATEWAY_AUTH_TOKEN;

  if (!gatewayToken) {
    console.warn('[MODULES] GATEWAY_AUTH_TOKEN not set — returning placeholder');
    return '[IA non disponible — configurez GATEWAY_AUTH_TOKEN]';
  }

  try {
    const { default: fetch } = await import('node-fetch').catch(() => ({ default: globalThis.fetch }));

    const response = await fetch(`${gatewayUrl}/api/ai-gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`,
      },
      body: JSON.stringify({
        prompt,
        task_type: taskType,
        preferred_tier: 'free',
        preferred_model: 'gemini-2.0-flash',
        service_id: 'tegs-learning',
        user_id: String(tenantId),
        max_tokens: 3000,
        temperature: 0.7,
        language: 'fr',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gateway ${response.status}: ${errText}`);
    }

    const data = await response.json();
    return data.response || data.text || data.content || '';
  } catch (err) {
    console.error('[MODULES] AI Gateway error:', err.message);
    return `[Erreur IA: ${err.message}]`;
  }
}

module.exports = router;
