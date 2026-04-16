/**
 * Orchestrateur central de l'agent IA TEGS.
 *
 * Flux :
 * 1. Charge le profil du role
 * 2. Construit le system prompt avec les schemas des outils disponibles
 * 3. Appelle le LLM via le gateway IA
 * 4. Parse la reponse : texte libre ou tool_call
 * 5. Si tool_call → execute l'outil → renvoie le resultat au LLM
 * 6. Si mutation → retourne un PROPOSAL avec confirmationId
 * 7. Audit chaque etape
 *
 * Max 3 iterations de tool calls pour eviter les boucles infinies.
 */

const { getProfileForRole } = require('../config/agentConfig');
const { getToolsForRole, getToolSchemas, getTool } = require('./tools');
const { buildSystemPrompt } = require('./promptTemplates');
const { callAIGatewayWithTools } = require('../services/aiGateway');
const { getOrCreateSession, addMessage, getHistory } = require('./sessionStore');
const { createConfirmation } = require('./confirmationStore');
const AgentAuditLog = require('../models/AgentAuditLog');

const MAX_TOOL_ITERATIONS = 3;
const MAX_MESSAGE_LENGTH = 2000;

/**
 * Traite un message utilisateur et retourne la reponse de l'agent.
 *
 * @param {string} userMessage - Le message de l'utilisateur
 * @param {object} context - { user: { id, role, tenant_id, firstName }, tenantId, tenantFilter, isSuperAdmin, isPublic, tenantName }
 * @returns {{ response: string, sessionId: string, proposal?: object }}
 */
async function processMessage(userMessage, context) {
  const startMs = Date.now();
  const { user } = context;
  const isPublic = context.isPublic || false;

  // Sanitiser le message
  const sanitized = sanitizeMessage(userMessage);
  if (!sanitized) {
    return { response: 'Message vide. Comment puis-je vous aider ?', sessionId: null };
  }

  // Charger le profil (public ou role-based)
  const profileRole = isPublic ? 'public' : user.role;
  const profile = getProfileForRole(profileRole);
  if (!profile) {
    return {
      response: 'Votre role ne dispose pas d\'un profil agent. Contactez votre administrateur.',
      sessionId: null,
    };
  }

  // Session
  const userId = isPublic ? `public:${context.sessionHint || Date.now()}` : user.id.toString();
  const { sessionId } = getOrCreateSession(userId, context.tenantId?.toString() || 'public');
  addMessage(sessionId, 'user', sanitized);

  // System prompt avec contexte dynamique
  const toolSchemas = getToolSchemas(profileRole);
  const systemPrompt = buildSystemPrompt(profile, toolSchemas, {
    firstName: user?.firstName || '',
    role: profileRole,
    tenantName: context.tenantName || '',
    isPublic,
  });

  // Historique
  const history = getHistory(sessionId, 10);

  try {
    // Boucle d'orchestration (max 3 iterations)
    let currentMessages = [...history];
    let finalResponse = '';
    let proposal = null;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const llmResult = await callAIGatewayWithTools(
        systemPrompt,
        currentMessages,
        context.tenantId?.toString() || 'system',
        { max_tokens: 2000, temperature: 0.4 }
      );

      // Pas de tool_call → reponse texte finale
      if (!llmResult.toolCall) {
        finalResponse = llmResult.text || 'Je n\'ai pas compris. Pouvez-vous reformuler ?';
        break;
      }

      // Tool call detected
      const { name: toolName, arguments: toolArgs } = llmResult.toolCall;
      const tool = getTool(toolName);

      if (!tool) {
        finalResponse = `Outil "${toolName}" inconnu. Je ne peux pas executer cette action.`;
        break;
      }

      // Verifier l'acces au tool
      if (!tool.canAccess(user.role)) {
        finalResponse = `Desole, votre role ne permet pas d'utiliser l'outil "${tool.name}".`;
        break;
      }

      // Executer le tool
      const toolResult = await tool.run(toolArgs, {
        ...context,
        sessionId,
      });

      // Si c'est un PROPOSAL (mutation)
      if (toolResult.proposal) {
        const confirmationId = createConfirmation(
          user.id.toString(),
          context.tenantId?.toString(),
          toolResult.toolId,
          toolResult.actionData,
          sessionId
        );

        proposal = {
          confirmationId,
          summary: toolResult.summary,
          toolId: toolResult.toolId,
          details: toolResult.actionData?.details || toolResult.actionData,
        };

        finalResponse = `J'ai prepare l'action suivante :\n\n**${toolResult.summary}**\n\nVeuillez confirmer ou annuler cette action.`;
        break;
      }

      // Tool result normal → renvoyer au LLM pour formulation
      if (toolResult.success) {
        const resultText = typeof toolResult.data === 'string'
          ? toolResult.data
          : JSON.stringify(toolResult.data, null, 2);

        currentMessages.push({
          role: 'assistant',
          content: `[Outil ${toolName} execute]`,
        });
        currentMessages.push({
          role: 'tool_result',
          content: resultText.substring(0, 3000),
        });

        addMessage(sessionId, 'tool_result', `[${toolName}] ${resultText.substring(0, 500)}`);

        // Derniere iteration → demander au LLM de formuler la reponse
        if (iteration === MAX_TOOL_ITERATIONS - 1) {
          const finalLlm = await callAIGatewayWithTools(
            systemPrompt,
            currentMessages,
            context.tenantId?.toString() || 'system',
            { max_tokens: 1500, temperature: 0.5 }
          );
          finalResponse = finalLlm.text || resultText;
        }
        // Sinon continuer la boucle
      } else {
        finalResponse = toolResult.error || 'Une erreur est survenue.';
        break;
      }
    }

    // Sauvegarder la reponse dans la session
    addMessage(sessionId, 'assistant', finalResponse);

    // Audit
    await AgentAuditLog.create({
      tenant_id: context.tenantId,
      user_id: user.id,
      sessionId,
      role: user.role,
      action: proposal ? `proposal:${proposal.toolId}` : 'chat',
      input: sanitized.substring(0, 500),
      output: finalResponse.substring(0, 500),
      status: proposal ? 'pending_confirmation' : 'success',
      executionMs: Date.now() - startMs,
      metadata: { iterations: MAX_TOOL_ITERATIONS, hasProposal: !!proposal },
    }).catch((err) => console.error('[ORCHESTRATOR] Audit error:', err.message));

    return { response: finalResponse, sessionId, proposal };
  } catch (err) {
    console.error('[ORCHESTRATOR] Error:', err.message);

    // Audit l'erreur
    await AgentAuditLog.create({
      tenant_id: context.tenantId,
      user_id: user.id,
      sessionId,
      role: user.role,
      action: 'chat',
      input: sanitized.substring(0, 500),
      output: err.message,
      status: 'error',
      executionMs: Date.now() - startMs,
    }).catch(() => {});

    return {
      response: 'Desole, une erreur est survenue. Veuillez reessayer dans quelques instants.',
      sessionId,
    };
  }
}

/**
 * Sanitise le message utilisateur.
 * - Tronque a MAX_MESSAGE_LENGTH
 * - Supprime les caracteres de controle
 */
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return '';
  return message
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control chars
    .trim()
    .substring(0, MAX_MESSAGE_LENGTH);
}

module.exports = { processMessage };
