/**
 * Store des confirmations de mutations en attente.
 *
 * Quand un outil mutation retourne un PROPOSAL, il est stocke ici
 * avec un TTL de 5 minutes. L'utilisateur doit confirmer ou rejeter
 * avant l'expiration.
 */

const crypto = require('crypto');
const Tournament = require('../models/Tournament');
const AgentAuditLog = require('../models/AgentAuditLog');

const CONFIRMATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

const confirmations = new Map();

/**
 * Cree une confirmation en attente.
 *
 * @param {string} userId
 * @param {string} tenantId
 * @param {string} toolId
 * @param {object} actionData - Donnees preparees par l'outil
 * @param {string} sessionId
 * @returns {string} confirmationId
 */
function createConfirmation(userId, tenantId, toolId, actionData, sessionId) {
  const confirmationId = `conf:${crypto.randomBytes(8).toString('hex')}`;

  confirmations.set(confirmationId, {
    userId,
    tenantId,
    toolId,
    actionData,
    sessionId,
    createdAt: Date.now(),
    expiresAt: Date.now() + CONFIRMATION_TTL_MS,
    status: 'pending',
  });

  return confirmationId;
}

/**
 * Execute une confirmation (apres validation).
 *
 * @param {string} confirmationId
 * @param {string} userId - L'utilisateur qui confirme (doit etre le createur)
 * @returns {{ success: boolean, result?: object, error?: string }}
 */
async function executeConfirmation(confirmationId, userId) {
  const conf = confirmations.get(confirmationId);

  if (!conf) {
    return { success: false, error: 'Confirmation introuvable ou expiree.' };
  }

  if (conf.userId !== userId) {
    return { success: false, error: 'Vous n\'etes pas autorise a confirmer cette action.' };
  }

  if (Date.now() > conf.expiresAt) {
    confirmations.delete(confirmationId);
    return { success: false, error: 'La confirmation a expire (5 minutes). Veuillez relancer la demande.' };
  }

  if (conf.status !== 'pending') {
    return { success: false, error: `Cette confirmation a deja ete ${conf.status === 'confirmed' ? 'executee' : 'rejetee'}.` };
  }

  try {
    const result = await executeMutation(conf.toolId, conf.actionData, conf.tenantId, userId);
    conf.status = 'confirmed';

    // Audit
    await AgentAuditLog.create({
      tenant_id: conf.tenantId,
      user_id: userId,
      sessionId: conf.sessionId || 'unknown',
      role: 'admin_ddene',
      action: `${conf.toolId}:confirmed`,
      input: { confirmationId, toolId: conf.toolId },
      output: result,
      status: 'confirmed',
      confirmedByUser: true,
      executionMs: 0,
    }).catch((err) => console.error('[CONFIRM] Audit error:', err.message));

    // Cleanup
    setTimeout(() => confirmations.delete(confirmationId), 60000);

    return { success: true, result };
  } catch (err) {
    conf.status = 'error';
    return { success: false, error: `Erreur lors de l'execution: ${err.message}` };
  }
}

/**
 * Rejette une confirmation.
 */
async function rejectConfirmation(confirmationId, userId) {
  const conf = confirmations.get(confirmationId);

  if (!conf) {
    return { success: false, error: 'Confirmation introuvable.' };
  }

  if (conf.userId !== userId) {
    return { success: false, error: 'Non autorise.' };
  }

  conf.status = 'rejected';

  await AgentAuditLog.create({
    tenant_id: conf.tenantId,
    user_id: userId,
    sessionId: conf.sessionId || 'unknown',
    role: 'admin_ddene',
    action: `${conf.toolId}:rejected`,
    input: { confirmationId, toolId: conf.toolId },
    output: null,
    status: 'rejected',
    confirmedByUser: false,
    executionMs: 0,
  }).catch((err) => console.error('[CONFIRM] Audit error:', err.message));

  setTimeout(() => confirmations.delete(confirmationId), 60000);

  return { success: true };
}

/**
 * Retourne le statut d'une confirmation.
 */
function getConfirmation(confirmationId) {
  return confirmations.get(confirmationId) || null;
}

/**
 * Execute la mutation selon le type d'outil.
 */
async function executeMutation(toolId, actionData, tenantId, userId) {
  switch (toolId) {
    case 'tournamentCreate': {
      const tournament = await Tournament.create({
        ...actionData,
        tenant_id: tenantId,
        created_by: userId,
      });
      return {
        message: `Tournoi "${tournament.title}" cree avec succes.`,
        tournamentId: tournament._id.toString(),
        shareToken: tournament.shareToken,
      };
    }

    case 'reportGenerate': {
      // Pour le MVP, on retourne les donnees preparees
      // (la generation PDF reel se fait via les routes existantes)
      return {
        message: 'Rapport prepare. Utilisez la page Rapports pour telecharger le PDF.',
        reportData: actionData,
      };
    }

    default:
      throw new Error(`Mutation non supportee pour l'outil: ${toolId}`);
  }
}

// Cleanup periodique (toutes les 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [id, conf] of confirmations) {
    if (now > conf.expiresAt + 60000) {
      confirmations.delete(id);
    }
  }
}, 5 * 60 * 1000);

module.exports = {
  createConfirmation,
  executeConfirmation,
  rejectConfirmation,
  getConfirmation,
};
