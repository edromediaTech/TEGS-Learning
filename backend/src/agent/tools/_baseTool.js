/**
 * Factory pour definir un outil agentique.
 *
 * Chaque outil est un objet avec :
 *   - id, name, description, parameters (JSON Schema pour le LLM)
 *   - requiredRoles : roles autorises a utiliser cet outil
 *   - isMutation : si true, execute() retourne un PROPOSAL au lieu d'agir
 *   - execute(args, context) : la logique metier
 *
 * Le context contient :
 *   { user: { id, role, tenant_id }, tenantId, tenantFilter, isSuperAdmin }
 */

const AgentAuditLog = require('../../models/AgentAuditLog');

/**
 * Definit un outil agentique avec validation et audit integres.
 *
 * @param {object} config
 * @param {string} config.id - Identifiant unique
 * @param {string} config.name - Nom affiche
 * @param {string} config.description - Description pour le LLM
 * @param {object} config.parameters - JSON Schema des parametres
 * @param {string[]} config.requiredRoles - Roles autorises
 * @param {boolean} config.isMutation - Retourne un PROPOSAL si true
 * @param {Function} config.execute - async (args, context) => result
 * @returns {object} Tool defini et pret a l'emploi
 */
function defineTool(config) {
  const {
    id,
    name,
    description,
    parameters = { type: 'object', properties: {} },
    requiredRoles = [],
    isMutation = false,
    execute,
  } = config;

  return {
    id,
    name,
    description,
    parameters,
    requiredRoles,
    isMutation,

    /**
     * Verifie que le role de l'utilisateur a acces a cet outil.
     */
    canAccess(role) {
      if (role === 'superadmin') return true;
      return requiredRoles.length === 0 || requiredRoles.includes(role);
    },

    /**
     * Execute l'outil avec verification de permissions et audit.
     *
     * @param {object} args - Parametres de l'outil
     * @param {object} context - { user, tenantId, tenantFilter, isSuperAdmin, sessionId }
     * @returns {object} { success, data?, proposal?, error? }
     */
    async run(args, context) {
      const startMs = Date.now();
      const { user, sessionId } = context;

      // Verification RBAC
      if (!this.canAccess(user.role)) {
        await auditLog(context, id, args, null, 'rejected', startMs, {
          reason: 'role_insuffisant',
        });
        return {
          success: false,
          error: `Desole, votre role (${user.role}) ne permet pas d'utiliser l'outil "${name}".`,
        };
      }

      try {
        const result = await execute(args, context);

        // Si mutation, encapsuler en PROPOSAL
        if (isMutation && result && !result.error) {
          await auditLog(context, id, args, result, 'pending_confirmation', startMs);
          return {
            success: true,
            proposal: true,
            summary: result.summary || `Action "${name}" preparee.`,
            actionData: result.actionData || result,
            toolId: id,
          };
        }

        await auditLog(context, id, args, result, 'success', startMs);
        return { success: true, data: result };
      } catch (err) {
        await auditLog(context, id, args, { error: err.message }, 'error', startMs);
        return { success: false, error: `Erreur lors de l'execution de "${name}": ${err.message}` };
      }
    },

    /**
     * Retourne le schema JSON pour l'embedder dans le prompt LLM.
     */
    toSchema() {
      return {
        name: id,
        description,
        parameters,
      };
    },
  };
}

/**
 * Enregistre une entree d'audit (fire-and-forget).
 */
async function auditLog(context, action, input, output, status, startMs, metadata = {}) {
  try {
    await AgentAuditLog.create({
      tenant_id: context.tenantId || context.user?.tenant_id,
      user_id: context.user?.id,
      sessionId: context.sessionId || 'unknown',
      role: context.user?.role || 'unknown',
      action,
      input: sanitizeForAudit(input),
      output: sanitizeForAudit(output),
      status,
      executionMs: Date.now() - startMs,
      metadata,
    });
  } catch (err) {
    console.error('[AGENT-AUDIT] Log error:', err.message);
  }
}

/**
 * Sanitise les donnees pour l'audit (tronque les gros objets).
 */
function sanitizeForAudit(data) {
  if (!data) return null;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  if (str.length > 2000) {
    return str.substring(0, 2000) + '...[tronque]';
  }
  return data;
}

module.exports = { defineTool };
