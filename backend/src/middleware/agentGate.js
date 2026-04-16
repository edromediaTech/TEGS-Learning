/**
 * Middlewares de securite pour le module Agentic Layer.
 *
 * 3 niveaux de controle :
 *   1. requireAgentEnabled — env var + runtime flag (Panic Mode)
 *   2. requireAgentEnabledForTenant — config tenant
 *   3. agentRateLimit — debit par utilisateur/heure
 *
 * + Detection d'anomalie globale avec auto-panic.
 */

const { isAgentEnabled, getProfileForRole, ANOMALY_THRESHOLD, ANOMALY_WINDOW_MS } = require('../config/agentConfig');
const { isPanicMode, panicActivate } = require('../agent/panicSwitch');
const Tenant = require('../models/Tenant');

// ── Rate limit : Map<userId, timestamps[]> ───────────────────
const rateLimitMap = new Map();

// ── Anomaly detection : compteur global glissant ─────────────
const globalRequestTimestamps = [];

/**
 * Nettoie les timestamps expires d'un tableau.
 */
function pruneTimestamps(arr, windowMs) {
  const cutoff = Date.now() - windowMs;
  while (arr.length > 0 && arr[0] < cutoff) {
    arr.shift();
  }
}

/**
 * Verifie le seuil d'anomalie global et declenche le Panic Mode
 * si le seuil est depasse.
 */
function checkAnomaly() {
  pruneTimestamps(globalRequestTimestamps, ANOMALY_WINDOW_MS);
  if (globalRequestTimestamps.length >= ANOMALY_THRESHOLD) {
    console.error(`[AGENT-GATE] ANOMALIE DETECTEE: ${globalRequestTimestamps.length} req/${ANOMALY_WINDOW_MS / 1000}s — PANIC MODE active automatiquement`);
    panicActivate('auto-anomaly');
    return true;
  }
  return false;
}

/**
 * Middleware 1 : Verifie que le systeme agentique est active.
 * Bloque si env var off, runtime panic, ou feature desactivee.
 */
function requireAgentEnabled(req, res, next) {
  if (!isAgentEnabled()) {
    return res.status(503).json({ error: 'Agent IA desactive (configuration serveur)' });
  }

  if (isPanicMode()) {
    return res.status(503).json({
      error: 'Agent IA temporairement suspendu (mode urgence)',
      panicMode: true,
    });
  }

  next();
}

/**
 * Middleware 2 : Verifie que le tenant a active l'agent.
 * Utilise le champ config.agentEnabled du modele Tenant.
 */
async function requireAgentEnabledForTenant(req, res, next) {
  // SuperAdmin bypass
  if (req.isSuperAdmin) return next();

  if (!req.tenantId) {
    return res.status(403).json({ error: 'Contexte tenant manquant' });
  }

  try {
    const tenant = await Tenant.findById(req.tenantId).select('config').lean();
    if (tenant && tenant.config && tenant.config.agentEnabled === false) {
      return res.status(403).json({
        error: 'Agent IA desactive pour votre organisation',
        tenantDisabled: true,
      });
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware 3 : Rate limit par utilisateur.
 * Limite basee sur le profil du role (maxRequestsPerHour).
 */
function agentRateLimit(req, res, next) {
  const userId = req.user?.id?.toString();
  if (!userId) return next();

  const profile = getProfileForRole(req.user.role);
  const maxPerHour = profile?.maxRequestsPerHour || 20;
  const windowMs = 60 * 60 * 1000; // 1 heure

  // User rate limit
  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, []);
  }
  const userTimestamps = rateLimitMap.get(userId);
  pruneTimestamps(userTimestamps, windowMs);

  if (userTimestamps.length >= maxPerHour) {
    return res.status(429).json({
      error: 'Limite de requetes agent atteinte',
      limit: maxPerHour,
      retryAfterMs: userTimestamps[0] + windowMs - Date.now(),
    });
  }

  const now = Date.now();
  userTimestamps.push(now);

  // Tracking anomalie globale
  globalRequestTimestamps.push(now);
  if (checkAnomaly()) {
    return res.status(503).json({
      error: 'Agent IA temporairement suspendu (anomalie detectee)',
      panicMode: true,
    });
  }

  // Injecter le nombre restant dans la requete
  req.agentRemainingRequests = maxPerHour - userTimestamps.length;

  next();
}

// Nettoyage periodique de la memoire (toutes les 10 minutes)
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const [userId, timestamps] of rateLimitMap) {
    pruneTimestamps(timestamps, 60 * 60 * 1000);
    if (timestamps.length === 0) {
      rateLimitMap.delete(userId);
    }
  }
  pruneTimestamps(globalRequestTimestamps, ANOMALY_WINDOW_MS);
}, 10 * 60 * 1000);

module.exports = {
  requireAgentEnabled,
  requireAgentEnabledForTenant,
  agentRateLimit,
};
