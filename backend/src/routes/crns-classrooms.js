// Routes API pour les classes CRNS (Phase 1.2 - Cours Maitre -> Instance).
//
// GET    /api/crns-classrooms              - liste mes classes (teacher) ou celles auxquelles je suis inscrit (student)
// POST   /api/crns-classrooms              - creer une classe (teacher/admin)
// POST   /api/crns-classrooms/:code/join   - rejoindre via code (student)
// DELETE /api/crns-classrooms/:id          - archiver (teacher proprietaire)
// GET    /api/crns-classrooms/:id          - detail + roster (teacher proprietaire)

const express = require('express');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const tenantIsolation = require('../middleware/tenantIsolation');
const CrnsClassroom = require('../models/CrnsClassroom');
const Statement = require('../models/Statement');

const router = express.Router();
router.use(authenticate);
router.use(tenantIsolation);

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
router.post('/', async (req, res, next) => {
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
router.delete('/:id', async (req, res, next) => {
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

module.exports = router;
