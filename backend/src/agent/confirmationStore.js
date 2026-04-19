/**
 * Store des confirmations de mutations en attente.
 *
 * Quand un outil mutation retourne un PROPOSAL, il est stocke ici
 * avec un TTL de 5 minutes. L'utilisateur doit confirmer ou rejeter
 * avant l'expiration.
 */

const crypto = require('crypto');
const Tournament = require('../models/Tournament');
const Module = require('../models/Module');
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
 * @param {object} [overrides] - Modifications faites par l'admin (ex: questions editees)
 * @returns {{ success: boolean, result?: object, error?: string }}
 */
async function executeConfirmation(confirmationId, userId, overrides = null) {
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
    const mergedData = overrides && typeof overrides === 'object'
      ? { ...conf.actionData, ...overrides }
      : conf.actionData;
    const result = await executeMutation(conf.toolId, mergedData, conf.tenantId, userId);
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

    case 'knowledgeToForm': {
      const result = await persistKnowledgeToForm(actionData, tenantId, userId);
      return result;
    }

    default:
      throw new Error(`Mutation non supportee pour l'outil: ${toolId}`);
  }
}

/**
 * Persiste le resultat d'une generation knowledge-to-form.
 * Cree un Module brouillon avec une section contenant les questions ou les
 * champs de formulaire sous forme de contentBlocks. Si targetType vaut
 * 'tournament_draft', cree egalement un Tournament brouillon pointant sur
 * ce Module (1 round).
 */
async function persistKnowledgeToForm(actionData, tenantId, userId) {
  const crypto = require('crypto');
  const {
    title = 'Quiz genere',
    mode = 'DATA',
    questions = [],
    fields = [],
    sourceMeta = {},
    targetType = 'module_draft',
  } = actionData || {};

  const contentBlocks = mode === 'STRUCTURE'
    ? fields.map((f, i) => ({
        type: 'open_answer',
        order: i,
        data: {
          label: f.label,
          fieldType: f.type,
          required: !!f.required,
          options: Array.isArray(f.options) ? f.options : [],
        },
      }))
    : questions.map((q, i) => {
        if (q.type === 'true_false') {
          return {
            type: 'true_false',
            order: i,
            data: {
              question: q.prompt,
              correctAnswer: q.correctIndex === 0,
              explanation: q.explanation || '',
              points: 1,
              duration: 30,
            },
          };
        }
        if (q.type === 'open_answer') {
          return {
            type: 'open_answer',
            order: i,
            data: {
              question: q.prompt,
              expectedAnswer: q.explanation || '',
              points: 1,
              duration: 60,
            },
          };
        }
        return {
          type: 'quiz',
          order: i,
          data: {
            question: q.prompt,
            options: (q.options || []).map((label, idx) => ({
              text: label,
              isCorrect: idx === q.correctIndex,
            })),
            explanation: q.explanation || '',
            points: 1,
            duration: 45,
          },
        };
      });

  const sectionTitle = mode === 'STRUCTURE' ? 'Formulaire genere' : 'Questions generees';
  const screenTitle = sourceMeta?.url ? `Source : ${sourceMeta.url}` : `Source : ${sourceMeta?.kind || 'document'}`;

  const moduleDoc = await Module.create({
    title,
    description: `Brouillon genere automatiquement depuis une source externe (${sourceMeta?.kind || 'document'}).`,
    status: 'draft',
    sections: [
      {
        title: sectionTitle,
        order: 0,
        screens: [
          {
            title: screenTitle.slice(0, 120),
            order: 0,
            contentBlocks,
          },
        ],
      },
    ],
    tenant_id: tenantId,
    created_by: userId,
  });

  if (targetType === 'tournament_draft' && mode === 'DATA') {
    const tournament = await Tournament.create({
      title,
      description: `Brouillon genere automatiquement depuis ${sourceMeta?.url || sourceMeta?.kind || 'un document'}.`,
      status: 'draft',
      registrationFee: 0,
      currency: 'HTG',
      maxParticipants: 0,
      rounds: [
        {
          order: 0,
          label: 'Eliminatoire',
          module_id: moduleDoc._id,
          promoteTopX: 10,
          status: 'pending',
        },
      ],
      currentRound: 0,
      prizes: [],
      shareToken: crypto.randomBytes(6).toString('hex'),
      tenant_id: tenantId,
      created_by: userId,
    });

    return {
      message: `Tournoi brouillon "${title}" cree avec 1 round et ${contentBlocks.length} question(s). Module associe pret dans le Studio.`,
      moduleId: moduleDoc._id.toString(),
      tournamentId: tournament._id.toString(),
      shareToken: tournament.shareToken,
      status: 'draft',
      blocks: contentBlocks.length,
    };
  }

  return {
    message: `Module brouillon "${title}" cree avec ${contentBlocks.length} bloc(s).`,
    moduleId: moduleDoc._id.toString(),
    status: 'draft',
    blocks: contentBlocks.length,
  };
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
