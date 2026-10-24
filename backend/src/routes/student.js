/**
 * Espace eleve.
 *
 * GET /api/student/home - classes de l'eleve et modules qu'il peut ouvrir : publies sur le
 *   cloud, tous ceux installes sur un noeud edge. Pas besoin de lien public (E6) : le
 *   lecteur accepte l'eleve connecte de l'etablissement.
 */
const crypto = require('crypto');
const express = require('express');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const CrnsClassroom = require('../models/CrnsClassroom');
const Module = require('../models/Module');
const User = require('../models/User');

const router = express.Router();
router.use(authenticate);
router.use(tenantIsolation);

// Identifiant d'ouverture d'un module jamais partage : deterministe, donc identique sur le
// cloud et sur un noeud (les liens ne changent pas d'une synchro a l'autre). Il n'ouvre
// rien a lui seul : sans partage public, le lecteur exige un eleve connecte.
function playerToken(mod) {
  return crypto.createHash('sha256').update(`${mod._id}:${mod.tenant_id}:tegs-player`).digest('hex').slice(0, 32);
}

router.get('/home', async (req, res, next) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Espace reserve aux eleves' });
    const me = await User.findById(req.user.id).select('firstName lastName matricule').lean();
    const classrooms = await CrnsClassroom.find({ ...req.tenantFilter(), student_ids: req.user.id, archived_at: null })
      .select('name code course_label').lean();
    // Sur un noeud, les modules presents sont ceux que le centre a recus : tous ouverts.
    const statusFilter = process.env.EDGE_MODE === '1' ? {} : { status: 'published' };
    const modules = await Module.find({ ...req.tenantFilter(), ...statusFilter })
      .select('title description coverImage shareToken tenant_id').sort({ title: 1 }).lean();
    for (const m of modules) {
      if (m.shareToken) continue;
      m.shareToken = playerToken(m);
      // updateOne : ne touche pas updatedAt (sinon le module repartirait a chaque synchro).
      await Module.collection.updateOne({ _id: m._id, shareToken: { $in: [null, ''] } }, { $set: { shareToken: m.shareToken } });
    }
    res.json({
      student: { first_name: me?.firstName, last_name: me?.lastName, matricule: me?.matricule || null },
      classrooms: classrooms.map((c) => ({ id: c._id, name: c.name, code: c.code, course_label: c.course_label })),
      modules: modules.map((m) => ({
        id: m._id, title: m.title, description: m.description, cover_image: m.coverImage, share_token: m.shareToken,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
