/**
 * Gestion des centres TEGS-Edge (une salle / un noeud par centre), etape E3.
 *
 * GET    /api/centers                   - centres de l'etablissement (superadmin : ?tenant_id=)
 * GET    /api/centers/options           - classes, modules et simulations proposes au choix
 * POST   /api/centers                   - creer un centre ; renvoie le jeton du noeud UNE fois
 * PATCH  /api/centers/:id               - nom, classes servies, simulations, activation
 * POST   /api/centers/:id/rotate-token  - nouveau jeton (l'ancien cesse de fonctionner)
 *
 * Roles : admin_ddene (son etablissement) et superadmin (tenant_id dans le corps a la creation).
 */
const express = require('express');
const mongoose = require('mongoose');
const Center = require('../models/Center');
const CrnsClassroom = require('../models/CrnsClassroom');
const Module = require('../models/Module');
const { authenticate, authorize } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const { generateToken, hashToken } = require('../middleware/edgeAuth');
const User = require('../models/User');
const { getSimulations } = require('../services/simulationCatalog');

const router = express.Router();
router.use(authenticate);
router.use(tenantIsolation);
router.use(authorize('admin_ddene'));

function publicView(c) {
  return {
    id: c._id,
    center_id: c.center_id,
    name: c.name,
    tenant_id: c.tenant_id,
    classroom_ids: c.classroom_ids,
    simulation_ids: c.simulation_ids,
    module_ids: c.module_ids,
    token_prefix: c.token_prefix,
    token_rotated_at: c.token_rotated_at,
    isActive: c.isActive,
    edge_version: c.edge_version,
    last_seen_at: c.last_seen_at,
    last_pull_at: c.last_pull_at,
    last_push_at: c.last_push_at,
    last_clock_offset_ms: c.last_clock_offset_ms,
  };
}

function newToken() {
  const token = generateToken();
  return { token, fields: { token_hash: hashToken(token), token_prefix: token.slice(0, 14), token_rotated_at: new Date() } };
}

// Les classes servies doivent appartenir a l'etablissement du centre.
async function checkClassrooms(ids, tenantId) {
  if (!Array.isArray(ids)) return 'classroom_ids doit etre un tableau';
  if (!ids.every((id) => mongoose.isValidObjectId(id))) return 'classroom_ids : identifiants invalides';
  const n = await CrnsClassroom.countDocuments({ _id: { $in: ids }, tenant_id: tenantId });
  return n === new Set(ids.map(String)).size ? null : "classroom_ids : classe inconnue dans l'etablissement";
}

// Les modules de cours installes doivent appartenir a l'etablissement du centre.
async function checkModules(ids, tenantId) {
  if (!Array.isArray(ids)) return 'module_ids doit etre un tableau';
  if (!ids.every((id) => mongoose.isValidObjectId(id))) return 'module_ids : identifiants invalides';
  const n = await Module.countDocuments({ _id: { $in: ids }, tenant_id: tenantId });
  return n === new Set(ids.map(String)).size ? null : "module_ids : module inconnu dans l'etablissement";
}

// Choix proposes dans la page d'administration des centres (superadmin : ?tenant_id=).
router.get('/options', async (req, res, next) => {
  try {
    const tenantId = req.isSuperAdmin ? req.query.tenant_id : req.tenantId;
    if (!tenantId || !mongoose.isValidObjectId(tenantId)) return res.status(400).json({ error: 'tenant_id requis' });
    const classrooms = await CrnsClassroom.find({ tenant_id: tenantId, archived_at: null })
      .select('name code teacher_id student_ids').sort({ name: 1 }).lean();
    const teachers = new Map((await User.find({ _id: { $in: classrooms.map((c) => c.teacher_id) } })
      .select('firstName lastName').lean()).map((u) => [String(u._id), `${u.firstName} ${u.lastName}`]));
    const modules = await Module.find({ tenant_id: tenantId }).select('title status').sort({ title: 1 }).lean();
    let simulations = [];
    try {
      simulations = (await getSimulations()).map((s) => ({ id: s.simulation_id, title: s.title }));
    } catch { /* catalogue injoignable : liste vide, le centre recevra tout le catalogue */ }
    res.json({
      classrooms: classrooms.map((c) => ({
        id: c._id, name: c.name, code: c.code, students: (c.student_ids || []).length, teacher: teachers.get(String(c.teacher_id)) || '',
      })),
      modules: modules.map((m) => ({ id: m._id, title: m.title, status: m.status })),
      simulations,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const centers = await Center.find(req.tenantFilter()).sort({ center_id: 1 }).lean();
    res.json({ centers: centers.map(publicView), count: centers.length });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { center_id, name, classroom_ids = [], simulation_ids = [], module_ids = [] } = req.body || {};
    const tenantId = req.isSuperAdmin ? req.body?.tenant_id : req.tenantId;
    if (!tenantId || !mongoose.isValidObjectId(tenantId)) {
      return res.status(400).json({ error: 'tenant_id (etablissement parent) requis' });
    }
    const classErr = (await checkClassrooms(classroom_ids, tenantId)) || (await checkModules(module_ids, tenantId));
    if (classErr) return res.status(400).json({ error: classErr });

    const { token, fields } = newToken();
    const center = await Center.create({
      center_id, name, tenant_id: tenantId, classroom_ids, simulation_ids, module_ids, ...fields,
    });
    res.status(201).json({
      center: publicView(center),
      token, // seule occasion de le voir : a mettre dans TEGS_EDGE_API_KEY du noeud
    });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'center_id deja utilise' });
    if (err?.name === 'ValidationError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Centre introuvable' });
    const center = await Center.findOne({ _id: req.params.id, ...req.tenantFilter() });
    if (!center) return res.status(404).json({ error: 'Centre introuvable' });

    const { name, classroom_ids, simulation_ids, module_ids, isActive } = req.body || {};
    if (module_ids !== undefined) {
      const modErr = await checkModules(module_ids, center.tenant_id);
      if (modErr) return res.status(400).json({ error: modErr });
      center.module_ids = module_ids;
    }
    if (classroom_ids !== undefined) {
      const classErr = await checkClassrooms(classroom_ids, center.tenant_id);
      if (classErr) return res.status(400).json({ error: classErr });
      center.classroom_ids = classroom_ids;
    }
    if (name !== undefined) center.name = name;
    if (simulation_ids !== undefined) center.simulation_ids = simulation_ids;
    if (isActive !== undefined) center.isActive = Boolean(isActive);
    await center.save();
    res.json({ center: publicView(center) });
  } catch (err) {
    if (err?.name === 'ValidationError') return res.status(400).json({ error: err.message });
    next(err);
  }
});

router.post('/:id/rotate-token', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Centre introuvable' });
    const center = await Center.findOne({ _id: req.params.id, ...req.tenantFilter() });
    if (!center) return res.status(404).json({ error: 'Centre introuvable' });
    const { token, fields } = newToken();
    Object.assign(center, fields);
    await center.save();
    res.json({ center: publicView(center), token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
