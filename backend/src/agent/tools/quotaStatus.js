const { defineTool } = require('./_baseTool');
const User = require('../../models/User');

module.exports = defineTool({
  id: 'quotaStatus',
  name: 'Statut Quota Agent',
  description: 'Affiche le quota, la garantie et le statut de blocage d\'un agent POS.',
  parameters: {
    type: 'object',
    properties: {
      agentId: {
        type: 'string',
        description: 'ID de l\'agent (admin uniquement). Defaut: l\'utilisateur connecte.',
      },
    },
  },
  requiredRoles: ['authorized_agent', 'admin_ddene', 'superadmin'],
  isMutation: false,

  async execute(args, context) {
    let agentId = context.user.id;
    if (args.agentId && (context.user.role === 'admin_ddene' || context.isSuperAdmin)) {
      agentId = args.agentId;
    }

    const agent = await User.findOne({
      _id: agentId,
      ...context.tenantFilter(),
    }).select('firstName lastName role guaranteeBalance usedQuota maxPaymentLimit currentPaymentCount isBlocked isAgentVerified commissionRate contractAcceptedAt').lean();

    if (!agent) {
      return { error: 'Agent introuvable.' };
    }

    if (agent.role !== 'authorized_agent') {
      return { error: 'Cet utilisateur n\'est pas un agent POS.' };
    }

    const quotaPercent = agent.maxPaymentLimit > 0
      ? Math.round((agent.currentPaymentCount / agent.maxPaymentLimit) * 100)
      : 0;

    return {
      agent: `${agent.firstName} ${agent.lastName}`,
      isVerified: agent.isAgentVerified,
      isBlocked: agent.isBlocked,
      guaranteeBalance: `${agent.guaranteeBalance || 0} HTG`,
      usedQuota: agent.usedQuota || 0,
      maxPaymentLimit: agent.maxPaymentLimit || 'Illimite',
      currentPaymentCount: agent.currentPaymentCount || 0,
      quotaPercent: `${quotaPercent}%`,
      commissionRate: `${agent.commissionRate || 5}%`,
      contractAccepted: agent.contractAcceptedAt ? 'Oui' : 'Non',
    };
  },
});
