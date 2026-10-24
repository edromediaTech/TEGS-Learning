// Routes API pour les classes CRNS (Phase 1.2 - Cours Maitre -> Instance).
//
// GET    /api/crns-classrooms              - liste mes classes (teacher) ou celles auxquelles je suis inscrit (student)
// POST   /api/crns-classrooms              - creer une classe (teacher/admin)
// POST   /api/crns-classrooms/:code/join   - rejoindre via code (student)
// DELETE /api/crns-classrooms/:id          - archiver (teacher proprietaire)
// GET    /api/crns-classrooms/:id          - detail + roster (teacher proprietaire)
// POST   /api/crns-classrooms/:id/students - creer des eleves (matricule + PIN), E4
// POST   /api/crns-classrooms/:id/credentials - regenerer les PIN d'eleves de la classe, E4

const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const CrnsClassroom = require('../models/CrnsClassroom');
const Statement = require('../models/Statement');
const User = require('../models/User');
const { createStudent, issueCredentials } = require('../services/studentCredentials');

const router = express.Router();
router.use(authenticate);
router.use(tenantIsolation);

// Noeud TEGS-Edge : classes et identifiants viennent du cloud (sinon le cloud rejetterait
// les traces d'eleves qu'il ne connait pas). Lecture et inscription restent possibles.
function cloudOnly(req, res, next) {
  if (process.env.EDGE_MODE === '1') {
    return res.status(409).json({ error: 'Sur un noeud de salle, classes et identifiants se gerent sur le cloud TEGS' });
  }
  next();
}

const TEACHER_ROLES = new Set(['teacher', 'admin_ddene', 'superadmin']);

function isTeacher(role) {
  return TEACHER_ROLES.has(role);
}

function generateCode() {
  // Format CL-XXXX (4 chars hex majuscules) - assez unique pour ~65k classes
  const buf = crypto.randomBytes(2);
  return 'CL-' + buf.toString('hex').toUpperCase();
}

// === GET / : liste filtree par role ===
router.get('/', async (req, res, next) => {
  try {
    const filter = { ...req.tenantFilter(), archived_at: null };
    if (isTeacher(req.user.role)) {
      filter.teacher_id = req.user.id;
    } else {
      // student : ses classes
      filter.student_ids = req.user.id;
    }
    const classrooms = await CrnsClassroom.find(filter).sort({ created_at: -1 }).lean();
    res.json({ classrooms, count: classrooms.length });
  } catch (err) {
    next(err);
  }
});

// === POST / : creer une classe ===
router.post('/', cloudOnly, async (req, res, next) => {
  try {
    if (!isTeacher(req.user.role)) {
      return res.status(403).json({ error: 'Role enseignant requis' });
    }
    const { course_id, course_label, name } = req.body || {};
    if (!course_id || !name) {
      return res.status(400).json({ error: 'course_id et name sont requis' });
    }
    // Genere un code unique avec retry simple
    let code;
    for (let i = 0; i < 5; i++) {
      const candidate = generateCode();
      const exists = await CrnsClassroom.exists({ code: candidate });
      if (!exists) { code = candidate; break; }
    }
    if (!code) return res.status(500).json({ error: 'Impossible de generer un code unique' });

    const classroom = await CrnsClassroom.create({
      course_id,
      course_label: course_label || '',
      name,
      code,
      teacher_id: req.user.id,
      tenant_id: req.user.tenant_id,
      student_ids: [],
    });
    res.status(201).json(classroom);
  } catch (err) {
    next(err);
  }
});

// === POST /:code/join : un eleve rejoint via le code ===
router.post('/:code/join', async (req, res, next) => {
  try {
    const code = String(req.params.code || '').toUpperCase();
    const classroom = await CrnsClassroom.findOne({
      code,
      ...req.tenantFilter(),
      archived_at: null,
    });
    if (!classroom) {
      return res.status(404).json({ error: 'Classe introuvable ou archivee' });
    }
    const userId = String(req.user.id);
    const already = classroom.student_ids.some((s) => String(s) === userId);
    if (!already) {
      classroom.student_ids.push(userId);
      await classroom.save();
    }
    res.json({ joined: true, already_member: already, classroom });
  } catch (err) {
    next(err);
  }
});

// === GET /:id : detail + agreges xAPI par eleve ===
router.get('/:id', async (req, res, next) => {
  try {
    const classroom = await CrnsClassroom.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    }).populate('student_ids', 'firstName lastName email').lean();
    if (!classroom) return res.status(404).json({ error: 'Classe introuvable' });
    if (isTeacher(req.user.role)) {
      // OK : prof proprietaire ou admin du tenant
    } else {
      // student : doit etre inscrit
      const me = String(req.user.id);
      const is_member = (classroom.student_ids || []).some((s) => String(s._id || s) === me);
      if (!is_member) return res.status(403).json({ error: 'Non inscrit a cette classe' });
    }

    // Aggregat xAPI : pour chaque eleve, compter ses statements completed/passed
    const studentIds = (classroom.student_ids || []).map((s) => String(s._id || s));
    const stmts = studentIds.length
      ? await Statement.find({
          tenant_id: classroom.tenant_id,
          'actor.user_id': { $in: studentIds },
          'verb.id': { $in: [
            'http://adlnet.gov/expapi/verbs/passed',
            'http://adlnet.gov/expapi/verbs/completed',
            'http://adlnet.gov/expapi/verbs/experienced',
          ]},
          voided: false,
        }).select('actor.user_id verb.id object.id timestamp').lean()
      : [];

    const progress_by_student = {};
    for (const sid of studentIds) progress_by_student[sid] = { passed: 0, completed: 0, experienced: 0, last_seen: null };
    for (const s of stmts) {
      const uid = String(s.actor?.user_id || '');
      if (!progress_by_student[uid]) continue;
      const v = s.verb?.id?.split('/').pop() || '';
      if (v === 'passed') progress_by_student[uid].passed++;
      else if (v === 'completed') progress_by_student[uid].completed++;
      else if (v === 'experienced') progress_by_student[uid].experienced++;
      const t = new Date(s.timestamp);
      if (!progress_by_student[uid].last_seen || t > new Date(progress_by_student[uid].last_seen)) {
        progress_by_student[uid].last_seen = s.timestamp;
      }
    }

    res.json({ classroom, progress_by_student });
  } catch (err) {
    next(err);
  }
});

// === DELETE /:id : archiver ===
router.delete('/:id', cloudOnly, async (req, res, next) => {
  try {
    const classroom = await CrnsClassroom.findOne({
      _id: req.params.id,
      ...req.tenantFilter(),
    });
    if (!classroom) return res.status(404).json({ error: 'Classe introuvable' });
    if (String(classroom.teacher_id) !== String(req.user.id) && req.user.role !== 'admin_ddene') {
      return res.status(403).json({ error: 'Seul le proprietaire peut archiver' });
    }
    classroom.archived_at = new Date();
    await classroom.save();
    res.json({ archived: true });
  } catch (err) {
    next(err);
  }
});

// --- Identifiants eleves (E4) : matricule + PIN, distribues par l'enseignant ---

const MAX_NEW_STUDENTS = 100;

// Classe active du tenant, geree par son enseignant, un admin_ddene ou un superadmin.
async function ownedClassroom(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ error: 'Classe introuvable' });
    return null;
  }
  const classroom = await CrnsClassroom.findOne({ _id: req.params.id, ...req.tenantFilter(), archived_at: null });
  if (!classroom) {
    res.status(404).json({ error: 'Classe introuvable ou archivee' });
    return null;
  }
  const isOwner = String(classroom.teacher_id) === String(req.user.id);
  if (!isOwner && !['admin_ddene', 'superadmin'].includes(req.user.role)) {
    res.status(403).json({ error: "Seul l'enseignant de la classe peut gerer ses identifiants" });
    return null;
  }
  return classroom;
}

function sheetRow(user, pin) {
  return { id: user._id, first_name: user.firstName, last_name: user.lastName, matricule: user.matricule, pin };
}

// === POST /:id/students : { students: [{ first_name, last_name }] } ===
// Renvoie les PIN en clair UNE seule fois (fiche a imprimer et distribuer).
router.post('/:id/students', cloudOnly, async (req, res, next) => {
  try {
    const classroom = await ownedClassroom(req, res);
    if (!classroom) return;
    const list = Array.isArray(req.body?.students) ? req.body.students : null;
    if (!list || list.length === 0 || list.length > MAX_NEW_STUDENTS) {
      return res.status(400).json({ error: `students : 1 a ${MAX_NEW_STUDENTS} eleves` });
    }
    const clean = list.map((s) => ({
      firstName: String(s?.first_name || '').trim(),
      lastName: String(s?.last_name || '').trim(),
    }));
    const bad = clean.findIndex((s) => !s.firstName || !s.lastName || s.firstName.length > 60 || s.lastName.length > 60);
    if (bad >= 0) return res.status(400).json({ error: `Eleve ${bad + 1} : prenom et nom requis (60 caracteres max)` });

    const sheet = [];
    for (const s of clean) {
      const { user, pin } = await createStudent({ ...s, tenantId: classroom.tenant_id });
      classroom.student_ids.push(user._id);
      sheet.push(sheetRow(user, pin));
    }
    await classroom.save();
    res.status(201).json({ classroom: { id: classroom._id, name: classroom.name, code: classroom.code }, students: sheet });
  } catch (err) {
    next(err);
  }
});

// === POST /:id/credentials : { student_ids?: [...] } (defaut : toute la classe) ===
// Nouveau PIN (l'ancien cesse de fonctionner), matricule attribue s'il manquait.
router.post('/:id/credentials', cloudOnly, async (req, res, next) => {
  try {
    const classroom = await ownedClassroom(req, res);
    if (!classroom) return;
    const members = new Set(classroom.student_ids.map(String));
    const wanted = Array.isArray(req.body?.student_ids) ? req.body.student_ids.map(String) : [...members];
    const outsiders = wanted.filter((id) => !members.has(id));
    if (outsiders.length) return res.status(400).json({ error: 'student_ids : eleve hors de la classe', student_ids: outsiders });

    const students = await User.find({ _id: { $in: wanted }, tenant_id: classroom.tenant_id, role: 'student' });
    const sheet = [];
    for (const user of students) {
      const { pin } = await issueCredentials(user);
      sheet.push(sheetRow(user, pin));
    }
    sheet.sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, 'fr'));
    res.json({ classroom: { id: classroom._id, name: classroom.name, code: classroom.code }, students: sheet });
  } catch (err) {
    next(err);
  }
});

// === GET /:id/integrity : rapport d'integrite des copies (E6) ===
// Derniere tentative par eleve et par activite, d'apres le resume joint aux traces de fin
// (context.extensions.integrity). Des indices pour l'enseignant, pas une sanction.
const LEVEL_RANK = { suspect: 0, attention: 1, ok: 2 };
const FINAL_VERBS = ['completed', 'passed', 'failed', 'terminated'].map((v) => `http://adlnet.gov/expapi/verbs/${v}`);

router.get('/:id/integrity', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Classe introuvable' });
    const classroom = await CrnsClassroom.findOne({ _id: req.params.id, ...req.tenantFilter() }).lean();
    if (!classroom) return res.status(404).json({ error: 'Classe introuvable' });
    const isOwner = String(classroom.teacher_id) === String(req.user.id);
    if (!isOwner && !['admin_ddene', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Seul l'enseignant de la classe peut voir ce rapport" });
    }

    const students = await User.find({ _id: { $in: classroom.student_ids } }).select('firstName lastName matricule').lean();
    const byId = new Map(students.map((u) => [String(u._id), u]));
    const stmts = await Statement.find({
      tenant_id: classroom.tenant_id,
      'actor.user_id': { $in: classroom.student_ids },
      'verb.id': { $in: FINAL_VERBS },
      'context.extensions.integrity': { $exists: true },
      voided: false,
    }).sort({ timestamp: -1 }).limit(5000).lean();

    // Derniere tentative par (eleve, activite) ; "completed" prefere a "terminated".
    const latest = new Map();
    for (const st of stmts) {
      const key = `${st.actor.user_id}|${st.object.id}`;
      const cur = latest.get(key);
      const isTerminated = st.verb.id.endsWith('/terminated');
      if (!cur || (cur.terminated && !isTerminated && Math.abs(cur.at - st.timestamp) < 60000)) {
        latest.set(key, { st, terminated: isTerminated, at: st.timestamp });
      }
    }

    const rows = [...latest.values()].map(({ st }) => {
      const integ = st.context.extensions.integrity || {};
      const u = byId.get(String(st.actor.user_id));
      const name = st.object.definition?.name || {};
      return {
        student_id: st.actor.user_id,
        student: u ? `${u.lastName} ${u.firstName}` : st.actor.name,
        matricule: u?.matricule || null,
        activity: Object.values(name)[0] || st.object.id,
        at: st.timestamp,
        level: integ.level || 'ok',
        duration_ms: integ.duration_ms ?? null,
        focus_loss_count: integ.focus_loss_count ?? 0,
        focus_lost_ms: integ.focus_lost_ms ?? 0,
        tab_hidden_count: integ.tab_hidden_count ?? 0,
        hidden_ms: integ.hidden_ms ?? 0,
        fullscreen_exit_count: integ.fullscreen_exit_count ?? 0,
        copy_paste_count: (integ.copy_count ?? 0) + (integ.paste_count ?? 0),
        center_id: st.context.extensions.edge?.center_id || null,
      };
    }).sort((a, b) => (LEVEL_RANK[a.level] ?? 3) - (LEVEL_RANK[b.level] ?? 3) || new Date(b.at) - new Date(a.at));

    const counts = { ok: 0, attention: 0, suspect: 0 };
    for (const r of rows) counts[r.level] = (counts[r.level] || 0) + 1;
    res.json({ classroom: { id: classroom._id, name: classroom.name }, counts, rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
