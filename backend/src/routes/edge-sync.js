/**
 * Synchronisation Cloud <-> TEGS-Edge (CDC section 5, etape E3).
 *
 * POST /api/v1/edge/sync/pull  - roster des classes du centre + simulations a jour
 * POST /api/v1/edge/sync/push  - lot de copies (TP, examens) signe, ACK/REJECT par copie
 *
 * Auth : X-Center-ID + Bearer <jeton du noeud> (middleware/edgeAuth). Le push exige en
 * plus X-Edge-Signature (HMAC du corps brut).
 *
 * Horodatage par duree relative : le noeud envoie l'heure de son horloge au moment de
 * l'envoi (edge_sent_at) ; l'ecart serveur - noeud corrige completed_at de chaque copie.
 * duration_ms (duree mesuree localement) ne depend pas de l'horloge.
 */
const express = require('express');
const mongoose = require('mongoose');
const Statement = require('../models/Statement');
const User = require('../models/User');
const Module = require('../models/Module');
const CrnsClassroom = require('../models/CrnsClassroom');
const { authenticateEdge, requireEdgeSignature } = require('../middleware/edgeAuth');
const { getSimulations } = require('../services/simulationCatalog');

const router = express.Router();
router.use(authenticateEdge);

const MAX_BATCH = 500;
const MAX_PAYLOAD_BYTES = 64 * 1024;
const SIM_IRI = 'https://crns.tegs-learning.edu.ht/sim/';
const COURSE_IRI = 'https://tegs-learning.edu.ht/courses/';
const VERB_COMPLETED = 'http://adlnet.gov/expapi/verbs/completed';
const SHA256_RE = /^[0-9a-f]{64}$/;

function parseDate(value) {
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t) : null;
}

function isoDuration(ms) {
  return `PT${Math.round(ms) / 1000}S`;
}

async function centerClassrooms(center) {
  return CrnsClassroom.find({
    _id: { $in: center.classroom_ids },
    tenant_id: center.tenant_id,
    archived_at: null,
  }).lean();
}

// ---------------------------------------------------------------------------
// PULL
// ---------------------------------------------------------------------------
router.post('/pull', async (req, res, next) => {
  try {
    const center = req.center;
    const now = new Date();
    const since = parseDate(req.body?.last_roster_sync);
    const installed = req.body?.installed_modules && typeof req.body.installed_modules === 'object'
      ? req.body.installed_modules : {};

    // --- Roster : eleves actifs des classes du centre ---
    const classrooms = await centerClassrooms(center);
    const classesByStudent = new Map();
    const changedClassStudents = new Set();
    for (const c of classrooms) {
      for (const sid of c.student_ids || []) {
        const k = String(sid);
        if (!classesByStudent.has(k)) classesByStudent.set(k, []);
        classesByStudent.get(k).push(String(c._id));
        // Une classe modifiee (eleve ajoute ou retire) renvoie tout son effectif.
        if (!since || (c.updated_at && c.updated_at > since)) changedClassStudents.add(k);
      }
    }
    const students = await User.find({
      _id: { $in: [...classesByStudent.keys()] },
      tenant_id: center.tenant_id,
      role: 'student',
      isActive: true,
    }).select('firstName lastName matricule +pin_hash updatedAt').lean();

    const rosterUpdates = students
      .filter((s) => !since || changedClassStudents.has(String(s._id)) || s.updatedAt > since)
      .map((s) => {
        const classIds = classesByStudent.get(String(s._id));
        return {
          id: String(s._id),
          first_name: s.firstName,
          last_name: s.lastName,
          classroom_id: classIds[0],
          classroom_ids: classIds,
          // Connexion hors ligne (E4) : matricule + empreinte bcrypt du PIN ; null tant que
          // l'enseignant n'a pas genere d'identifiants. Un nouveau PIN change updatedAt.
          matricule: s.matricule || null,
          access_pin_hash: s.pin_hash || null,
          action: 'UPSERT',
        };
      });

    // --- Simulations : paquets a (re)telecharger ---
    // installed_modules[id] = sha256 du paquet installe (recommande) ou sa version.
    const wanted = new Set(center.simulation_ids || []);
    const catalog = (await getSimulations())
      .filter((s) => s.package?.sha256 && (wanted.size === 0 || wanted.has(s.simulation_id)));
    const moduleUpdates = catalog
      .filter((s) => {
        const have = installed[s.simulation_id];
        if (!have) return true;
        return SHA256_RE.test(have) ? have !== s.package.sha256 : have !== s.version;
      })
      .map((s) => ({
        id: s.simulation_id,
        title: s.title,
        version: s.version,
        download_url: s.package.url,
        sha256: s.package.sha256,
        size_bytes: s.package.size_bytes,
        format: s.package.format || 'cmi5',
      }));
    const catalogIds = new Set(catalog.map((s) => s.simulation_id));
    const modulesRemoved = Object.keys(installed).filter((id) => !catalogIds.has(id));

    center.last_pull_at = now;
    center.last_seen_at = now;
    if (req.body?.edge_version) center.edge_version = String(req.body.edge_version).slice(0, 32);
    await center.save();

    res.json({
      status: 'SUCCESS',
      server_time: now.toISOString(),
      roster_cursor: now.toISOString(), // a renvoyer en last_roster_sync au prochain pull
      classrooms: classrooms.map((c) => ({ id: String(c._id), name: c.name, code: c.code, course_id: c.course_id })),
      roster_updates: rosterUpdates,
      roster_active_ids: students.map((s) => String(s._id)), // les autres sont a desactiver en local
      module_updates: moduleUpdates,
      modules_removed: modulesRemoved,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUSH
// ---------------------------------------------------------------------------
function reject(rejected, submissionId, code, message, retryable = false) {
  rejected.push({ submission_id: submissionId ?? null, code, message, retryable });
}

router.post('/push', requireEdgeSignature, async (req, res, next) => {
  try {
    const center = req.center;
    const receivedAt = new Date();
    const { batch_id: batchId, submissions } = req.body || {};

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return res.status(400).json({ status: 'REJECT', error: 'submissions doit etre un tableau non vide' });
    }
    if (submissions.length > MAX_BATCH) {
      return res.status(413).json({ status: 'REJECT', error: `Maximum ${MAX_BATCH} copies par lot` });
    }

    // Ecart d'horloge serveur - noeud ; 0 si le noeud n'envoie pas son heure.
    const edgeSentAt = parseDate(req.body.edge_sent_at);
    const clockOffsetMs = edgeSentAt ? receivedAt - edgeSentAt : 0;

    // --- Prechargement : eleves de l'etablissement, simulations, modules de cours ---
    const studentIds = submissions
      .map((s) => s?.student_id)
      .filter((id) => mongoose.isValidObjectId(id));
    const students = new Map(
      (await User.find({ _id: { $in: studentIds }, tenant_id: center.tenant_id, role: 'student' })
        .select('firstName lastName email').lean())
        .map((u) => [String(u._id), u])
    );
    const simulations = new Map((await getSimulations()).map((s) => [s.simulation_id, s]));
    const courseIds = submissions.map((s) => s?.module_id).filter((id) => mongoose.isValidObjectId(id));
    const courses = new Map(
      (await Module.find({ _id: { $in: courseIds }, tenant_id: center.tenant_id }).select('title').lean())
        .map((m) => [String(m._id), m])
    );

    const processed = [];
    const rejected = [];
    let duplicates = 0;

    for (const sub of submissions) {
      const id = typeof sub?.submission_id === 'string' ? sub.submission_id.trim() : '';
      if (!/^[A-Za-z0-9_.:-]{8,128}$/.test(id)) {
        reject(rejected, sub?.submission_id, 'invalid_submission_id', 'submission_id : 8 a 128 caracteres [A-Za-z0-9_.:-]');
        continue;
      }
      const student = students.get(String(sub.student_id));
      if (!student) {
        reject(rejected, id, 'unknown_student', "Eleve inconnu dans l'etablissement du centre");
        continue;
      }
      const sim = simulations.get(sub.module_id);
      const course = courses.get(String(sub.module_id));
      if (!sim && !course) {
        reject(rejected, id, 'unknown_module', 'module_id : ni simulation publiee, ni module de cours de l\'etablissement');
        continue;
      }
      const completedAt = parseDate(sub.completed_at);
      if (!completedAt) {
        reject(rejected, id, 'invalid_completed_at', 'completed_at doit etre une date ISO 8601');
        continue;
      }
      const score = sub.score ?? null;
      const maxScore = sub.max_score ?? null;
      const durationMs = sub.duration_ms ?? null;
      if ((score !== null && !Number.isFinite(score))
        || (maxScore !== null && !(Number.isFinite(maxScore) && maxScore > 0))
        || (score !== null && (score < 0 || (maxScore !== null && score > maxScore)))
        || (durationMs !== null && !(Number.isFinite(durationMs) && durationMs >= 0))) {
        reject(rejected, id, 'invalid_score', 'score, max_score (> 0, score <= max) et duration_ms (>= 0) doivent etre numeriques');
        continue;
      }
      const payloadSize = Buffer.byteLength(JSON.stringify(sub.submission_payload ?? {}))
        + Buffer.byteLength(JSON.stringify(sub.anti_fraud_logs ?? {}));
      if (payloadSize > MAX_PAYLOAD_BYTES) {
        reject(rejected, id, 'payload_too_large', `submission_payload + anti_fraud_logs > ${MAX_PAYLOAD_BYTES} octets`);
        continue;
      }

      const passed = sub.submission_payload?.passed_validation;
      const result = { completion: true };
      if (typeof passed === 'boolean') result.success = passed;
      if (durationMs !== null) result.duration = isoDuration(durationMs);
      if (score !== null) {
        result.score = { raw: score, min: 0 };
        if (maxScore !== null) Object.assign(result.score, { max: maxScore, scaled: score / maxScore });
      }

      const doc = {
        statementId: id,
        actor: {
          user_id: student._id,
          name: `${student.firstName} ${student.lastName}`.trim(),
          mbox: `mailto:${student.email}`,
        },
        verb: { id: VERB_COMPLETED, display: { 'fr-FR': 'a termine' } },
        object: {
          id: sim ? `${SIM_IRI}${sub.module_id}` : `${COURSE_IRI}${sub.module_id}`,
          definition: { name: { 'fr-FR': sim ? sim.title : course.title } },
        },
        result,
        context: {
          extensions: {
            edge: {
              center_id: center.center_id,
              batch_id: batchId ?? null,
              classroom_id: sub.classroom_id ?? null,
              edge_completed_at: completedAt.toISOString(),
              clock_offset_ms: clockOffsetMs,
              duration_ms: durationMs,
              submission_payload: sub.submission_payload ?? null,
              anti_fraud_logs: sub.anti_fraud_logs ?? null,
            },
          },
        },
        tenant_id: center.tenant_id,
        // Heure corrigee : horloge du noeud + ecart mesure a l'envoi.
        timestamp: new Date(completedAt.getTime() + clockOffsetMs),
      };

      try {
        await Statement.create(doc);
        processed.push(id);
      } catch (err) {
        if (err?.code === 11000) {
          // Deja recu (renvoi apres coupure) : ACK si c'est bien la meme copie du meme etablissement.
          const existing = await Statement.findOne({ statementId: id }).select('tenant_id').lean();
          if (existing && String(existing.tenant_id) === String(center.tenant_id)) {
            processed.push(id);
            duplicates += 1;
          } else {
            reject(rejected, id, 'id_conflict', 'submission_id deja utilise par un autre etablissement');
          }
        } else if (err?.name === 'ValidationError') {
          reject(rejected, id, 'invalid_payload', err.message.slice(0, 200));
        } else {
          reject(rejected, id, 'server_error', 'Erreur serveur, a renvoyer', true);
        }
      }
    }

    center.last_push_at = receivedAt;
    center.last_seen_at = receivedAt;
    center.last_clock_offset_ms = clockOffsetMs;
    await center.save();

    res.json({
      status: rejected.length === 0 ? 'ACK' : processed.length === 0 ? 'REJECT' : 'PARTIAL',
      batch_id: batchId ?? null,
      processed_ids: processed,
      rejected,
      duplicates,
      server_time: receivedAt.toISOString(),
      clock_offset_ms: clockOffsetMs,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
