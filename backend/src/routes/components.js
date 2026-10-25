// Catalogue des composants 3D CRNS et leur qualification (QA a deux verrous).
//
// GET  /api/v1/components/catalog             - composants APPROVED uniquement (cours en salle), public
// GET  /api/v1/components/:id/model.glb       - modele (public si APPROVED, sinon personnel autorise)
// GET  /api/v1/components/:id/manifest.json   - manifeste (idem)
// POST /api/v1/components                     - depot { manifest, glb_base64 } : linter -> CI_PASSED | DRAFT
// GET  /api/v1/components                     - liste (personnel autorise)
// GET  /api/v1/components/:id                 - detail : manifeste, rapport du linter, revue, historique
// POST /api/v1/components/:id/submit          - CI_PASSED -> REVIEW_PENDING
// POST /api/v1/components/:id/approve         - REVIEW_PENDING -> APPROVED (check-list complete, inspecteur)
// POST /api/v1/components/:id/reject          - REVIEW_PENDING -> REJECTED (rapport d'anomalies, inspecteur)
//
// Un nouveau depot d'un composant existant (GLB ou manifeste modifie) relance le linter et
// remet le composant au debut du cycle : une modification n'est jamais publiee sans revue.

const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const SimulationComponent = require('../models/SimulationComponent');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validateComponent } = require('../qa/validateComponent');
const lifecycle = require('../services/componentLifecycle');

const router = express.Router();

// Deposer et soumettre : forge CRNS (enseignant concepteur ou administrateur).
const AUTHOR_ROLES = ['teacher', 'admin_ddene', 'superadmin'];
const MAX_GLB_BYTES = 3 * 1024 * 1024;

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
// Serialisation canonique (cles triees a tous les niveaux) : meme contenu = meme empreinte.
const canonical = (v) => (Array.isArray(v) ? `[${v.map(canonical).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`
    : JSON.stringify(v));

// Noeud de salle : le catalogue se qualifie sur le cloud (comme classes et identifiants).
function cloudOnly(req, res, next) {
  if (process.env.EDGE_MODE === '1') return res.status(409).json({ error: 'Sur un noeud de salle, les composants se gerent sur le cloud TEGS' });
  next();
}

// Utilisateur facultatif : modele et manifeste sont publics une fois APPROVED.
async function optionalUser(req) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role isActive');
    return user?.isActive ? user : null;
  } catch {
    return null;
  }
}

function summary(c) {
  return {
    component_id: c.component_id,
    title: c.title,
    version: c.version,
    category: c.category,
    status: c.status,
    glb_sha256: c.glb_sha256,
    size_bytes: c.size_bytes,
    errors: c.lint_report?.errors?.length ?? null,
    warnings: c.lint_report?.warnings?.length ?? null,
    updated_at: c.updatedAt,
  };
}

function pushStatus(c, status, userId, note = '') {
  c.status = status;
  c.history.push({ status, by: userId || null, note });
}

// === GET /catalog : uniquement APPROVED ===
router.get('/catalog', async (_req, res, next) => {
  try {
    const items = await SimulationComponent.find({ status: 'APPROVED' }).sort({ title: 1 }).lean();
    res.json({
      count: items.length,
      components: items.map((c) => ({
        component_id: c.component_id,
        title: c.title,
        version: c.version,
        category: c.category,
        glb_sha256: c.glb_sha256,
        size_bytes: c.size_bytes,
        model_url: `/api/v1/components/${c.component_id}/model.glb`,
        manifest_url: `/api/v1/components/${c.component_id}/manifest.json`,
        approved_at: c.review?.decided_at || null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// === GET /:id/model.glb et /:id/manifest.json ===
async function servable(req, res, withGlb) {
  const query = SimulationComponent.findOne({ component_id: req.params.id });
  const c = await (withGlb ? query.select('+glb') : query);
  if (!c) { res.status(404).json({ error: 'Composant introuvable' }); return null; }
  if (c.status !== 'APPROVED') {
    const user = await optionalUser(req);
    if (!user || !AUTHOR_ROLES.includes(user.role)) { res.status(404).json({ error: 'Composant introuvable' }); return null; }
  }
  return c;
}

router.get('/:id/model.glb', async (req, res, next) => {
  try {
    const c = await servable(req, res, true);
    if (!c) return;
    res.set({ 'Content-Type': 'model/gltf-binary', ETag: `"${c.glb_sha256}"`, 'Cache-Control': 'no-cache' });
    res.send(c.glb);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/manifest.json', async (req, res, next) => {
  try {
    const c = await servable(req, res, false);
    if (!c) return;
    res.set('Cache-Control', 'no-cache').json(c.manifest);
  } catch (err) {
    next(err);
  }
});

// --- Routes du personnel ---
router.use(authenticate);

// === POST / : depot (cree ou met a jour), linter execute par le serveur ===
router.post('/', cloudOnly, authorize(...AUTHOR_ROLES), async (req, res, next) => {
  try {
    const { manifest, glb_base64: glbBase64 } = req.body || {};
    if (!manifest || typeof manifest !== 'object' || typeof glbBase64 !== 'string') {
      return res.status(400).json({ error: 'manifest (objet) et glb_base64 (texte) sont requis' });
    }
    const glb = Buffer.from(glbBase64, 'base64');
    if (!glb.length || glb.length > MAX_GLB_BYTES) return res.status(400).json({ error: `GLB vide ou trop lourd (maximum ${MAX_GLB_BYTES / 1024 / 1024} Mo)` });

    const report = validateComponent({ manifest, glb });
    if (!manifest.id || !/^[a-z0-9_]+$/.test(manifest.id)) return res.status(400).json({ error: 'manifest.id invalide', report });

    const glbSha = sha256(glb);
    const manifestSha = sha256(canonical(manifest));
    let c = await SimulationComponent.findOne({ component_id: manifest.id });
    if (c && c.glb_sha256 === glbSha && c.manifest_sha256 === manifestSha) {
      return res.json({ component: summary(c), report: c.lint_report, unchanged: true });
    }
    const status = lifecycle.statusAfterLint(report);
    const note = report.ok ? 'linter : conforme' : `linter : ${report.errors.length} erreur(s) bloquante(s)`;
    if (!c) {
      c = new SimulationComponent({ component_id: manifest.id, uploaded_by: req.user.id, history: [] });
    }
    Object.assign(c, {
      title: manifest.title || manifest.id,
      version: manifest.version,
      category: manifest.category || '',
      manifest,
      manifest_sha256: manifestSha,
      glb,
      glb_sha256: glbSha,
      size_bytes: glb.length,
      lint_report: report,
      review: { checklist: Object.fromEntries(lifecycle.CHECKLIST.map((k) => [k, false])), reviewer_id: null, decided_at: null, comment: '' },
    });
    pushStatus(c, status, req.user.id, note);
    await c.save();
    res.status(201).json({ component: summary(c), report });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

// === GET / : liste ===
router.get('/', authorize(...AUTHOR_ROLES), async (req, res, next) => {
  try {
    const filter = req.query.status && lifecycle.STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
    const items = await SimulationComponent.find(filter).sort({ updatedAt: -1 });
    res.json({ count: items.length, components: items.map(summary) });
  } catch (err) {
    next(err);
  }
});

// === GET /:id : detail ===
router.get('/:id', authorize(...AUTHOR_ROLES), async (req, res, next) => {
  try {
    const c = await SimulationComponent.findOne({ component_id: req.params.id }).populate('review.reviewer_id', 'firstName lastName');
    if (!c) return res.status(404).json({ error: 'Composant introuvable' });
    res.json({
      component: summary(c),
      manifest: c.manifest,
      lint_report: c.lint_report,
      review: c.review,
      history: c.history,
      checklist_labels: lifecycle.CHECKLIST_LABELS,
    });
  } catch (err) {
    next(err);
  }
});

async function transition(req, res, to, { roles, check }) {
  if (!roles.includes(req.user.role) && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acces refuse : role insuffisant' });
  }
  const c = await SimulationComponent.findOne({ component_id: req.params.id }).select('+glb');
  if (!c) return res.status(404).json({ error: 'Composant introuvable' });
  if (!lifecycle.canTransition(c.status, to)) {
    return res.status(409).json({ error: `Transition ${c.status} -> ${to} impossible`, status: c.status });
  }
  const blocked = await check?.(c);
  if (blocked) return res.status(blocked.status || 400).json(blocked.body);
  return c;
}

// === POST /:id/submit : vers la revue humaine ===
router.post('/:id/submit', cloudOnly, async (req, res, next) => {
  try {
    const c = await transition(req, res, 'REVIEW_PENDING', { roles: AUTHOR_ROLES });
    if (!c || res.headersSent) return;
    pushStatus(c, 'REVIEW_PENDING', req.user.id, (req.body?.note || '').slice(0, 500));
    await c.save();
    res.json({ component: summary(c) });
  } catch (err) {
    next(err);
  }
});

// === POST /:id/approve : check-list complete + linter relance sur le paquet stocke ===
router.post('/:id/approve', cloudOnly, async (req, res, next) => {
  try {
    const checklist = req.body?.checklist || {};
    const c = await transition(req, res, 'APPROVED', {
      roles: lifecycle.REVIEWER_ROLES,
      check: (comp) => {
        const missing = lifecycle.missingChecklist(checklist);
        if (missing.length) return { body: { error: 'Check-list incomplete : les 4 points doivent etre valides', missing } };
        const report = validateComponent({ manifest: comp.manifest, glb: comp.glb });
        if (!report.ok) return { status: 409, body: { error: 'Le linter ne valide plus ce composant', report } };
        return null;
      },
    });
    if (!c || res.headersSent) return;
    c.review = {
      checklist: Object.fromEntries(lifecycle.CHECKLIST.map((k) => [k, true])),
      reviewer_id: req.user.id,
      decided_at: new Date(),
      comment: String(req.body?.comment || '').slice(0, 2000),
    };
    pushStatus(c, 'APPROVED', req.user.id, 'revue : check-list complete');
    await c.save();
    res.json({ component: summary(c) });
  } catch (err) {
    next(err);
  }
});

// === POST /:id/reject : rapport d'anomalies obligatoire ===
router.post('/:id/reject', cloudOnly, async (req, res, next) => {
  try {
    const comment = String(req.body?.comment || '').trim();
    const c = await transition(req, res, 'REJECTED', {
      roles: lifecycle.REVIEWER_ROLES,
      check: () => (comment.length < 10 ? { body: { error: 'Rapport d\'anomalies requis (10 caracteres minimum)' } } : null),
    });
    if (!c || res.headersSent) return;
    c.review = {
      checklist: { ...Object.fromEntries(lifecycle.CHECKLIST.map((k) => [k, false])), ...(req.body?.checklist || {}) },
      reviewer_id: req.user.id,
      decided_at: new Date(),
      comment: comment.slice(0, 2000),
    };
    pushStatus(c, 'REJECTED', req.user.id, comment.slice(0, 500));
    await c.save();
    res.json({ component: summary(c) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
