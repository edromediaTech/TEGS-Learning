const { defineTool } = require('./_baseTool');
const User = require('../../models/User');
const Transaction = require('../../models/Transaction');

module.exports = defineTool({
  id: 'commissionCalc',
  name: 'Calcul de Commission',
  description: 'Calcule la commission d\'un agent POS : montant total collecte, commission gagnee, montant a reverser a la plateforme.',
  parameters: {
    type: 'object',
    properties: {
      since: {
        type: 'string',
        description: 'Date de debut (ISO string ou "lundi", "semaine", "mois"). Defaut: tout.',
      },
      agentId: {
        type: 'string',
        description: 'ID de l\'agent (admin uniquement). Defaut: l\'utilisateur connecte.',
      },
    },
  },
  requiredRoles: ['authorized_agent', 'admin_ddene', 'superadmin'],
  isMutation: false,

  async execute(args, context) {
    // Determiner l'agent cible
    let agentId = context.user.id;
    if (args.agentId && (context.user.role === 'admin_ddene' || context.isSuperAdmin)) {
      agentId = args.agentId;
    }

    const agent = await User.findOne({
      _id: agentId,
      ...context.tenantFilter(),
    }).select('firstName lastName commissionRate guaranteeBalance usedQuota isBlocked').lean();

    if (!agent) {
      return { error: 'Agent introuvable.' };
    }

    // Filtrer les transactions par date
    const txFilter = { agent_id: agentId, status: 'completed' };
    if (args.since) {
      const sinceDate = parseDateHint(args.since);
      if (sinceDate) {
        txFilter.createdAt = { $gte: sinceDate };
      }
    }

    const transactions = await Transaction.find(txFilter)
      .select('amount createdAt')
      .lean();

    const totalCollected = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const commissionRate = agent.commissionRate || 5;
    const commissionAmount = Math.round(totalCollected * commissionRate / 100);
    const netToPlatform = totalCollected - commissionAmount;

    return {
      agent: `${agent.firstName} ${agent.lastName}`,
      commissionRate: `${commissionRate}%`,
      totalCollected: `${totalCollected} HTG`,
      commissionGagnee: `${commissionAmount} HTG`,
      montantAVerser: `${netToPlatform} HTG`,
      transactionCount: transactions.length,
      guaranteeBalance: `${agent.guaranteeBalance || 0} HTG`,
      usedQuota: agent.usedQuota || 0,
      isBlocked: agent.isBlocked || false,
      period: args.since || 'total',
    };
  },
});

function parseDateHint(hint) {
  if (!hint) return null;
  const lower = hint.toLowerCase();

  if (lower === 'lundi' || lower === 'semaine') {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Lundi
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (lower === 'mois') {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (lower === 'aujourd\'hui' || lower === 'aujourdhui') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  const parsed = new Date(hint);
  return isNaN(parsed.getTime()) ? null : parsed;
}
