/**
 * Worker de synchronisation d'un noeud TEGS-Edge (EDGE_MODE=1, etape E5).
 *
 * Chaque cycle : pull (etablissement, classes, eleves, modules de cours, simulations)
 * puis push de l'outbox (traces xAPI PENDING / RETRY). En cas d'echec (WAN coupe,
 * cloud indisponible) : repli exponentiel avec part aleatoire, sans rien perdre ; le
 * noeud continue de servir la salle avec ses donnees locales.
 *
 * Variables : TEGS_CENTER_ID, TEGS_CLOUD_GATEWAY_URL, TEGS_EDGE_API_KEY,
 * SYNC_INTERVAL_SECONDS (300), MODULES_STORAGE_PATH (./edge-data/modules).
 * Contrat d'API : docs/edge-sync-api.md.
 */
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const User = require('../models/User');
const Module = require('../models/Module');
const CrnsClassroom = require('../models/CrnsClassroom');
const Statement = require('../models/Statement');
const EdgeState = require('../models/EdgeState');
const { extractZip } = require('./zip');

const EDGE_VERSION = '1.0.0';
const PUSH_BATCH = 200;
const MAX_PUSH_BATCHES_PER_CYCLE = 10;
const BACKOFF_BASE_MS = 5 * 1000;
const BACKOFF_MAX_MS = 15 * 60 * 1000;

function config() {
  const cloud = (process.env.TEGS_CLOUD_GATEWAY_URL || '').replace(/\/$/, '');
  return {
    centerId: String(process.env.TEGS_CENTER_ID || '').trim().toUpperCase(),
    apiBase: cloud.endsWith('/api') ? cloud : `${cloud}/api`,
    token: process.env.TEGS_EDGE_API_KEY || '',
    intervalMs: Math.max(30, Number(process.env.SYNC_INTERVAL_SECONDS) || 300) * 1000,
    storage: path.resolve(process.env.MODULES_STORAGE_PATH || './edge-data/modules'),
  };
}

const log = (msg) => console.log(`[edge] ${new Date().toISOString()} ${msg}`);

async function cloudCall(cfg, route, body, { sign = false } = {}) {
  const raw = JSON.stringify({ center_id: cfg.centerId, ...body });
  const headers = {
    'Content-Type': 'application/json',
    'X-Center-ID': cfg.centerId,
    Authorization: `Bearer ${cfg.token}`,
  };
  if (sign) {
    const key = crypto.createHash('sha256').update(cfg.token).digest('hex');
    headers['X-Edge-Signature'] = 'sha256=' + crypto.createHmac('sha256', key).update(raw).digest('hex');
  }
  let res;
  try {
    res = await fetch(`${cfg.apiBase}/v1/edge/sync/${route}`, {
      method: 'POST', headers, body: raw, signal: AbortSignal.timeout(60 * 1000),
    });
  } catch (err) {
    const why = err?.name === 'TimeoutError' ? 'delai depasse' : (err?.cause?.code || err?.message);
    throw new Error(`cloud injoignable (${why}) : liaison Internet coupee ou cloud indisponible`);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(`${route} HTTP ${res.status} : ${data?.error || ''}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Pull : application locale (miroir des donnees du cloud, memes _id)
// ---------------------------------------------------------------------------
const placeholderPassword = () => crypto.randomBytes(24).toString('base64url');
const oid = (id) => new mongoose.Types.ObjectId(id);

async function applyRoster(data) {
  const tenantId = oid(data.institution.id);
  await Tenant.updateOne(
    { _id: tenantId },
    { $set: { name: data.institution.name || data.center.name, isActive: true },
      $setOnInsert: { code: data.institution.code || data.center.center_id } },
    { upsert: true }
  );

  for (const t of data.teachers || []) {
    await User.updateOne(
      { _id: oid(t.id) },
      { $set: { firstName: t.first_name, lastName: t.last_name, role: t.role, tenant_id: tenantId },
        $setOnInsert: { email: `${t.id}@enseignants.edge.local`, password: placeholderPassword() } },
      { upsert: true }
    );
  }

  for (const s of data.roster_updates || []) {
    const set = { firstName: s.first_name, lastName: s.last_name, role: 'student', tenant_id: tenantId, isActive: true };
    if (s.matricule) set.matricule = s.matricule;
    // PIN regenere : on repart d'un compteur d'echecs vierge, comme le cloud.
    if (s.access_pin_hash) Object.assign(set, { pin_hash: s.access_pin_hash, pin_failed_attempts: 0 });
    const update = {
      $set: set,
      $setOnInsert: { email: `${(s.matricule || s.id).toLowerCase()}@eleves.edge.local`, password: placeholderPassword() },
    };
    if (s.access_pin_hash) update.$unset = { pin_locked_until: '' };
    await User.updateOne({ _id: oid(s.id) }, update, { upsert: true });
  }
  // Eleves sortis du roster : desactives, jamais supprimes (leurs traces doivent pouvoir partir).
  const active = (data.roster_active_ids || []).map(oid);
  await User.updateMany({ tenant_id: tenantId, role: 'student', _id: { $nin: active } }, { $set: { isActive: false } });

  const classIds = [];
  for (const c of data.classrooms || []) {
    classIds.push(oid(c.id));
    await CrnsClassroom.updateOne(
      { _id: oid(c.id) },
      { $set: {
        name: c.name, code: c.code, course_id: c.course_id, course_label: c.course_label || '',
        teacher_id: oid(c.teacher_id), tenant_id: tenantId, student_ids: c.student_ids.map(oid), archived_at: null,
      } },
      { upsert: true }
    );
  }
  await CrnsClassroom.updateMany(
    { tenant_id: tenantId, _id: { $nin: classIds }, archived_at: null },
    { $set: { archived_at: new Date() } }
  );
}

async function applyCourses(data) {
  const tenantId = oid(data.institution.id);
  for (const m of data.course_updates || []) {
    // Passage par le modele : sections, ecrans et blocs retrouvent leurs ObjectId et dates
    // (le JSON les transporte en texte). Ecriture brute pour garder updatedAt du cloud.
    const doc = new Module(m).toObject({ depopulate: true });
    doc.createdAt = m.createdAt ? new Date(m.createdAt) : new Date();
    doc.updatedAt = m.updatedAt ? new Date(m.updatedAt) : new Date();
    await Module.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }
  const active = (data.course_active_ids || []).map(oid);
  await Module.deleteMany({ tenant_id: tenantId, _id: { $nin: active } });
}

// --- Simulations : paquets cmi5 telecharges, verifies (sha256), extraits ---
async function installSimulation(cfg, state, upd) {
  const res = await fetch(upd.download_url, { signal: AbortSignal.timeout(5 * 60 * 1000) });
  if (!res.ok) throw new Error(`telechargement ${upd.id} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== upd.sha256) throw new Error(`empreinte invalide pour ${upd.id} (paquet altere ou incomplet)`);

  const pkgDir = path.join(cfg.storage, 'packages', upd.id);
  const tmpDir = `${pkgDir}.tmp-${process.pid}-${Date.now()}`;
  const files = await extractZip(buf, tmpDir);
  const glb = files.find((f) => f.endsWith('.glb') && !f.includes('/'));
  if (!glb || !files.includes('launch.html')) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw new Error(`paquet ${upd.id} incomplet (launch.html ou .glb manquant)`);
  }
  await fs.rm(pkgDir, { recursive: true, force: true });
  await fs.rename(tmpDir, pkgDir);

  // Copies servies au lecteur TEGS (/simulations/ via nginx).
  const simDir = path.join(cfg.storage, 'simulations');
  await fs.mkdir(path.join(simDir, 'configs'), { recursive: true });
  await fs.copyFile(path.join(pkgDir, glb), path.join(simDir, glb));
  const cfgFile = files.find((f) => f.endsWith('.json') && !f.includes('/'));
  if (cfgFile) await fs.copyFile(path.join(pkgDir, cfgFile), path.join(simDir, 'configs', `${upd.id}.json`));

  state.installed.set(upd.id, { version: upd.version, sha256: upd.sha256, glb, installed_at: new Date() });
}

async function removeSimulation(cfg, state, id) {
  const glb = state.installed.get(id)?.glb;
  await fs.rm(path.join(cfg.storage, 'packages', id), { recursive: true, force: true });
  await fs.rm(path.join(cfg.storage, 'simulations', 'configs', `${id}.json`), { force: true });
  if (glb) await fs.rm(path.join(cfg.storage, 'simulations', glb), { force: true });
  state.installed.delete(id);
}

// Manifeste local (meme schema que celui de CRNS), lu par le frontend du noeud.
async function writeLocalManifest(cfg, state) {
  const simDir = path.join(cfg.storage, 'simulations');
  await fs.mkdir(simDir, { recursive: true });
  const simulations = [];
  for (const [id, inst] of state.installed) {
    let meta = {};
    let cfgJson = null;
    try {
      cfgJson = JSON.parse(await fs.readFile(path.join(simDir, 'configs', `${id}.json`), 'utf8'));
      meta = cfgJson.metadata || {};
    } catch { /* config absente : entree minimale */ }
    simulations.push({
      simulation_id: id,
      title: meta.title || id,
      subject: meta.subject || null,
      grade_level: meta.grade_level || null,
      language: meta.language || 'fr',
      duration_minutes: meta.duration_minutes || null,
      objective: meta.pedagogical_objective || null,
      asset_url: `/simulations/${inst.glb}`,
      config_url: `/simulations/configs/${id}.json`,
      n_events: (cfgJson?.events || []).length,
      n_assets: (cfgJson?.assets || []).length,
      version: inst.version,
      package: { url: `/packages/${id}/launch.html`, sha256: inst.sha256, format: 'cmi5' },
    });
  }
  simulations.sort((a, b) => a.simulation_id.localeCompare(b.simulation_id));
  const manifest = { schema_version: 2, generated_at: new Date().toISOString(), count: simulations.length, simulations };
  const tmp = path.join(simDir, `manifest.json.tmp-${process.pid}`);
  await fs.writeFile(tmp, JSON.stringify(manifest, null, 2));
  await fs.rename(tmp, path.join(simDir, 'manifest.json'));
}

async function pull(cfg, state) {
  const installed = Object.fromEntries([...state.installed].map(([id, v]) => [id, v.sha256]));
  const data = await cloudCall(cfg, 'pull', {
    edge_version: EDGE_VERSION,
    last_roster_sync: state.roster_cursor,
    last_course_sync: state.course_cursor,
    installed_modules: installed,
  });
  state.clock_offset_ms = Date.parse(data.server_time) - Date.now();

  await applyRoster(data);
  state.roster_cursor = data.roster_cursor;
  await applyCourses(data);
  state.course_cursor = data.course_cursor;

  let simErrors = 0;
  for (const id of data.modules_removed || []) await removeSimulation(cfg, state, id);
  for (const upd of data.module_updates || []) {
    try {
      await installSimulation(cfg, state, upd);
    } catch (err) {
      simErrors += 1; // reessaye au prochain cycle (pas installee, donc redemandee)
      log(`simulation ${upd.id} non installee : ${err.message}`);
    }
  }
  if ((data.module_updates || []).length || (data.modules_removed || []).length || !state.last_pull_ok_at) {
    await writeLocalManifest(cfg, state);
  }
  state.last_pull_ok_at = new Date();
  await state.save();
  return {
    roster: (data.roster_updates || []).length,
    courses: (data.course_updates || []).length,
    sims: (data.module_updates || []).length - simErrors,
    simErrors,
  };
}

// ---------------------------------------------------------------------------
// Push : outbox des traces xAPI
// ---------------------------------------------------------------------------
async function push(cfg, state) {
  let sent = 0;
  let failed = 0;
  for (let n = 0; n < MAX_PUSH_BATCHES_PER_CYCLE; n++) {
    const batch = await Statement.find({ 'edge_sync.status': { $in: ['PENDING', 'RETRY'] } })
      .sort({ createdAt: 1 }).limit(PUSH_BATCH).lean();
    if (!batch.length) break;

    const res = await cloudCall(cfg, 'push', {
      batch_id: `${cfg.centerId}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      edge_sent_at: new Date().toISOString(),
      statements: batch.map((s) => ({
        statementId: s.statementId,
        actor: { user_id: String(s.actor.user_id) },
        verb: s.verb,
        object: s.object,
        result: s.result,
        context: s.context,
        timestamp: new Date(s.timestamp).toISOString(),
      })),
    }, { sign: true });

    const now = new Date();
    if (res.processed_ids?.length) {
      await Statement.updateMany(
        { statementId: { $in: res.processed_ids } },
        { $set: { 'edge_sync.status': 'SYNCED', 'edge_sync.synced_at': now }, $unset: { 'edge_sync.last_error': '' } }
      );
    }
    for (const r of res.rejected || []) {
      await Statement.updateOne(
        { statementId: r.statement_id },
        { $set: { 'edge_sync.status': r.retryable ? 'RETRY' : 'FAILED', 'edge_sync.last_error': `${r.code}: ${r.message}` },
          $inc: { 'edge_sync.attempts': 1 } }
      );
      if (!r.retryable) failed += 1;
    }
    if (typeof res.clock_offset_ms === 'number') state.clock_offset_ms = res.clock_offset_ms;
    sent += res.processed_ids?.length || 0;
    // Uniquement des rejets reessayables : on arrete ce cycle plutot que de boucler.
    if (!res.processed_ids?.length) break;
    if (batch.length < PUSH_BATCH) break;
  }
  state.last_push_ok_at = new Date();
  await state.save();
  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Boucle
// ---------------------------------------------------------------------------
let timer = null;
let running = false;

async function runCycle() {
  if (running) return null;
  running = true;
  const cfg = config();
  const state = await EdgeState.load();
  const t0 = Date.now();
  try {
    const p = await pull(cfg, state);
    const q = await push(cfg, state);
    state.consecutive_failures = 0;
    state.last_error = undefined;
    state.next_attempt_at = new Date(Date.now() + cfg.intervalMs);
    await state.save();
    log(`sync OK en ${Date.now() - t0} ms : eleves ${p.roster}, cours ${p.courses}, simulations ${p.sims}`
      + `${p.simErrors ? ` (${p.simErrors} en echec)` : ''}, traces envoyees ${q.sent}${q.failed ? `, rejetees ${q.failed}` : ''}`);
    return cfg.intervalMs;
  } catch (err) {
    // Repli exponentiel avec part aleatoire : evite que N centres relancent tous en meme temps.
    state.consecutive_failures = (state.consecutive_failures || 0) + 1;
    const cap = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** (state.consecutive_failures - 1));
    const delay = Math.round(cap / 2 + Math.random() * (cap / 2));
    state.last_error = err.message.slice(0, 300);
    state.last_error_at = new Date();
    state.next_attempt_at = new Date(Date.now() + delay);
    await state.save().catch(() => {});
    log(`sync en echec (${state.consecutive_failures}) : ${err.message} ; nouvel essai dans ${Math.round(delay / 1000)} s`);
    return delay;
  } finally {
    running = false;
  }
}

function schedule(delayMs) {
  clearTimeout(timer);
  timer = setTimeout(async () => schedule((await runCycle().catch(() => null)) ?? config().intervalMs), delayMs);
  timer.unref?.();
}

function start() {
  const cfg = config();
  const missing = ['centerId', 'apiBase', 'token'].filter((k) => !cfg[k] || cfg[k] === '/api');
  if (missing.length) {
    log(`synchronisation desactivee : configurer TEGS_CENTER_ID, TEGS_CLOUD_GATEWAY_URL, TEGS_EDGE_API_KEY`);
    return;
  }
  log(`noeud ${cfg.centerId} -> ${cfg.apiBase}, intervalle ${cfg.intervalMs / 1000} s, stockage ${cfg.storage}`);
  schedule(1000);
}

/** Declenche un cycle tout de suite (ex. bouton "Synchroniser" de la page d'etat). */
function syncNow() {
  schedule(0);
}

module.exports = { start, syncNow, runCycle, EDGE_VERSION };
