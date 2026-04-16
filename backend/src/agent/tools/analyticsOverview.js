const { defineTool } = require('./_baseTool');
const Tournament = require('../../models/Tournament');
const Participant = require('../../models/Participant');
const User = require('../../models/User');
const Module = require('../../models/Module');
const Transaction = require('../../models/Transaction');

module.exports = defineTool({
  id: 'analyticsOverview',
  name: 'Vue d\'ensemble Analytics',
  description: 'Fournit les KPIs principaux du dashboard : nombre de tournois, participants, modules, revenus, agents actifs.',
  parameters: {
    type: 'object',
    properties: {
      period: {
        type: 'string',
        description: 'Periode : "all", "month", "week" (defaut: all)',
      },
    },
  },
  requiredRoles: ['admin_ddene', 'superadmin'],
  isMutation: false,

  async execute(args, context) {
    const tf = context.tenantFilter();
    const dateFilter = {};

    if (args.period === 'month') {
      dateFilter.createdAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
    } else if (args.period === 'week') {
      dateFilter.createdAt = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }

    const [
      tournamentCount,
      activeTournaments,
      totalParticipants,
      moduleCount,
      userCount,
      agentCount,
    ] = await Promise.all([
      Tournament.countDocuments({ ...tf, ...dateFilter }),
      Tournament.countDocuments({ ...tf, status: { $in: ['registration', 'active'] } }),
      Participant.countDocuments(dateFilter),
      Module.countDocuments({ ...tf, ...dateFilter }),
      User.countDocuments({ ...tf, ...dateFilter }),
      User.countDocuments({ ...tf, role: 'authorized_agent' }),
    ]);

    // Revenus approximatifs (participants payants)
    let revenue = 0;
    try {
      const paidParticipants = await Participant.find({
        ...dateFilter,
        paymentStatus: 'paid',
      }).select('tournament_id').lean();

      const tournamentIds = [...new Set(paidParticipants.map((p) => p.tournament_id?.toString()))];
      const tournaments = await Tournament.find({
        _id: { $in: tournamentIds },
        ...tf,
      }).select('registrationFee').lean();

      const feeMap = {};
      for (const t of tournaments) {
        feeMap[t._id.toString()] = t.registrationFee || 0;
      }

      for (const p of paidParticipants) {
        revenue += feeMap[p.tournament_id?.toString()] || 0;
      }
    } catch {
      // Calcul approximatif, pas critique
    }

    return {
      period: args.period || 'all',
      kpis: {
        tournamentCount,
        activeTournaments,
        totalParticipants,
        moduleCount,
        userCount,
        agentCount,
        estimatedRevenue: revenue,
        currency: 'HTG',
      },
      message: `${tournamentCount} tournois, ${totalParticipants} participants, ${moduleCount} modules, ~${revenue} HTG de revenus.`,
    };
  },
});
