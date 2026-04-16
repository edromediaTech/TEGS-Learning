/**
 * Gestion des settings agentiques par tenant.
 *
 * Les settings sont stockes dans Tenant.config.agentSettings (Mixed field).
 *
 * Structure attendue :
 * {
 *   agentEnabled: true/false,
 *   publicAgentEnabled: true/false,
 *   preferredModel: 'gemini-2.0-flash' | 'gemini-1.5-pro',
 *   rateLimits: { student: 20, authorized_agent: 30, ... },
 *   disabledTools: { student: ['tournamentCreate'], ... },
 *   publicDocsWhitelist: ['inscription', 'paiement', ...] | null (null = tous publics),
 *   confidentialityMessage: "Pour des raisons de securite...",
 * }
 */

const Tenant = require('../models/Tenant');

// Cache en memoire (TTL 5 min)
const settingsCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Charge les settings agentiques d'un tenant.
 * @param {string} tenantId
 * @returns {object} Settings avec valeurs par defaut
 */
async function getAgentSettings(tenantId) {
  if (!tenantId) return getDefaultSettings();

  const key = tenantId.toString();
  const cached = settingsCache.get(key);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return cached.settings;
  }

  const tenant = await Tenant.findById(tenantId).select('config').lean();
  const raw = tenant?.config?.agentSettings || {};
  const settings = { ...getDefaultSettings(), ...raw };

  settingsCache.set(key, { settings, loadedAt: Date.now() });
  return settings;
}

/**
 * Sauvegarde les settings agentiques d'un tenant.
 * @param {string} tenantId
 * @param {object} newSettings - Settings partiels a merger
 */
async function saveAgentSettings(tenantId, newSettings) {
  const current = await getAgentSettings(tenantId);
  const merged = { ...current, ...newSettings };

  await Tenant.findByIdAndUpdate(tenantId, {
    $set: { 'config.agentSettings': merged },
  });

  // Invalider le cache
  settingsCache.delete(tenantId.toString());

  return merged;
}

/**
 * Verifie si un outil est desactive pour un role dans le tenant.
 */
async function isToolDisabled(tenantId, role, toolId) {
  const settings = await getAgentSettings(tenantId);
  const disabledForRole = settings.disabledTools?.[role] || [];
  return disabledForRole.includes(toolId);
}

/**
 * Retourne le rate limit personnalise pour un role dans le tenant.
 * Retourne null si pas de personnalisation (utiliser le defaut agentConfig).
 */
async function getCustomRateLimit(tenantId, role) {
  const settings = await getAgentSettings(tenantId);
  return settings.rateLimits?.[role] ?? null;
}

/**
 * Retourne le modele LLM prefere pour le tenant.
 */
async function getPreferredModel(tenantId) {
  const settings = await getAgentSettings(tenantId);
  return settings.preferredModel || 'gemini-2.0-flash';
}

function getDefaultSettings() {
  return {
    agentEnabled: true,
    publicAgentEnabled: true,
    preferredModel: 'gemini-2.0-flash',
    rateLimits: {},
    disabledTools: {},
    publicDocsWhitelist: null, // null = tous les docs publics
    confidentialityMessage: 'Pour des raisons de securite, je ne peux pas discuter de ce sujet.',
  };
}

/**
 * Invalide le cache pour un tenant.
 */
function invalidateCache(tenantId) {
  if (tenantId) settingsCache.delete(tenantId.toString());
}

module.exports = {
  getAgentSettings,
  saveAgentSettings,
  isToolDisabled,
  getCustomRateLimit,
  getPreferredModel,
  invalidateCache,
  getDefaultSettings,
};
