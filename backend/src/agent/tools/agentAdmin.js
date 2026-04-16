const { defineTool } = require('./_baseTool');
const AgentAuditLog = require('../../models/AgentAuditLog');
const { activeSessionCount } = require('../sessionStore');
const { getPanicStatus } = require('../panicSwitch');

module.exports = defineTool({
  id: 'agentAdmin',
  name: 'Administration Agent IA',
  description: 'Permet aux SuperAdmins de consulter les logs d\'audit, les statistiques d\'usage et le statut du systeme agentique.',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        description: 'Action : "logs" (derniers logs), "stats" (statistiques d\'usage), "status" (statut systeme)',
      },
      limit: {
        type: 'number',
        description: 'Nombre de logs a retourner (defaut: 10)',
      },
    },
    required: ['action'],
  },
  requiredRoles: ['superadmin'],
  isMutation: false,

  async execute(args, context) {
    switch (args.action) {
      case 'logs': {
        const limit = Math.min(args.limit || 10, 50);
        const logs = await AgentAuditLog.find(context.tenantFilter())
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        return {
          logs: logs.map((l) => ({
            id: l._id.toString(),
            user: l.user_id?.toString(),
            role: l.role,
            action: l.action,
            status: l.status,
            executionMs: l.executionMs,
            input: typeof l.input === 'string' ? l.input.substring(0, 100) : null,
            createdAt: l.createdAt,
          })),
          total: logs.length,
        };
      }

      case 'stats': {
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [totalLogs, lastHour, lastDay, errors, proposals] = await Promise.all([
          AgentAuditLog.countDocuments(context.tenantFilter()),
          AgentAuditLog.countDocuments({ ...context.tenantFilter(), createdAt: { $gte: hourAgo } }),
          AgentAuditLog.countDocuments({ ...context.tenantFilter(), createdAt: { $gte: dayAgo } }),
          AgentAuditLog.countDocuments({ ...context.tenantFilter(), status: 'error' }),
          AgentAuditLog.countDocuments({ ...context.tenantFilter(), status: { $in: ['pending_confirmation', 'confirmed'] } }),
        ]);

        return {
          totalLogs,
          lastHour,
          lastDay,
          errors,
          proposals,
          activeSessions: activeSessionCount(),
          panicStatus: getPanicStatus(),
        };
      }

      case 'status': {
        return {
          panicStatus: getPanicStatus(),
          activeSessions: activeSessionCount(),
          agentEnabled: process.env.PROCESS_AGENTIC_ON === 'true',
        };
      }

      default:
        return { error: `Action inconnue: "${args.action}". Actions valides: logs, stats, status.` };
    }
  },
});
