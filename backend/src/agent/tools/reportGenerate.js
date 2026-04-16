const { defineTool } = require('./_baseTool');
const Tournament = require('../../models/Tournament');
const QuizResult = require('../../models/QuizResult');
const Participant = require('../../models/Participant');

/**
 * Outil MUTATION : Generer un rapport.
 * Retourne un PROPOSAL avec les donnees pre-calculees.
 */
module.exports = defineTool({
  id: 'reportGenerate',
  name: 'Generer un Rapport',
  description: 'Prepare un rapport (top eleves, resultats par zone, bordereau agent). L\'action necessite confirmation avant generation du PDF.',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Type de rapport : "top_students", "results_summary", "agent_bordereau"',
      },
      tournamentId: {
        type: 'string',
        description: 'ID du tournoi (pour top_students et results_summary)',
      },
      limit: {
        type: 'number',
        description: 'Nombre de resultats (defaut: 10 pour top_students)',
      },
      zone: {
        type: 'string',
        description: 'Zone/district a filtrer (optionnel)',
      },
    },
    required: ['type'],
  },
  requiredRoles: ['authorized_agent', 'admin_ddene', 'superadmin'],
  isMutation: true,

  async execute(args, context) {
    switch (args.type) {
      case 'top_students':
        return await prepareTopStudents(args, context);
      case 'results_summary':
        return await prepareResultsSummary(args, context);
      case 'agent_bordereau':
        return await prepareAgentBordereau(args, context);
      default:
        return { error: `Type de rapport inconnu: "${args.type}". Types valides: top_students, results_summary, agent_bordereau.` };
    }
  },
});

async function prepareTopStudents(args, context) {
  if (!args.tournamentId) {
    return { error: 'tournamentId requis pour le rapport top_students.' };
  }

  const tournament = await Tournament.findOne({
    _id: args.tournamentId,
    ...context.tenantFilter(),
  }).select('title').lean();

  if (!tournament) return { error: 'Tournoi introuvable.' };

  const limit = args.limit || 10;

  const results = await QuizResult.find({ tournament_id: args.tournamentId })
    .sort({ percentage: -1, durationSec: 1 })
    .limit(limit)
    .lean();

  const participantIds = results.map((r) => r.participant_id);
  const participants = await Participant.find({ _id: { $in: participantIds } })
    .select('fullName establishment')
    .lean();

  const partMap = {};
  for (const p of participants) {
    partMap[p._id.toString()] = p;
  }

  const topStudents = results.map((r, i) => {
    const part = partMap[r.participant_id?.toString()] || {};
    return {
      rank: i + 1,
      name: part.fullName || 'Inconnu',
      establishment: part.establishment || '',
      score: r.score,
      maxScore: r.maxScore,
      percentage: r.percentage,
      duration: r.durationSec ? `${Math.floor(r.durationSec / 60)}min ${r.durationSec % 60}s` : 'N/A',
    };
  });

  return {
    summary: `Rapport Top ${limit} eleves — ${tournament.title} (${topStudents.length} resultats)`,
    actionData: {
      reportType: 'top_students',
      tournamentId: args.tournamentId,
      tournamentTitle: tournament.title,
      students: topStudents,
    },
  };
}

async function prepareResultsSummary(args, context) {
  if (!args.tournamentId) {
    return { error: 'tournamentId requis pour le rapport results_summary.' };
  }

  const tournament = await Tournament.findOne({
    _id: args.tournamentId,
    ...context.tenantFilter(),
  }).select('title rounds').lean();

  if (!tournament) return { error: 'Tournoi introuvable.' };

  const totalParticipants = await Participant.countDocuments({ tournament_id: args.tournamentId });
  const paidCount = await Participant.countDocuments({ tournament_id: args.tournamentId, paymentStatus: 'paid' });
  const resultCount = await QuizResult.countDocuments({ tournament_id: args.tournamentId });

  return {
    summary: `Resume resultats — ${tournament.title} (${totalParticipants} inscrits, ${resultCount} resultats)`,
    actionData: {
      reportType: 'results_summary',
      tournamentId: args.tournamentId,
      tournamentTitle: tournament.title,
      totalParticipants,
      paidCount,
      resultCount,
      roundCount: tournament.rounds?.length || 0,
    },
  };
}

async function prepareAgentBordereau(args, context) {
  // Reutilise la logique de commissionCalc mais en mode rapport
  const User = require('../../models/User');
  const Transaction = require('../../models/Transaction');

  const agent = await User.findOne({
    _id: context.user.id,
    ...context.tenantFilter(),
  }).select('firstName lastName commissionRate').lean();

  if (!agent) return { error: 'Agent introuvable.' };

  const transactions = await Transaction.find({
    agent_id: context.user.id,
    status: 'completed',
  }).select('amount createdAt').lean();

  const total = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const commission = Math.round(total * (agent.commissionRate || 5) / 100);

  return {
    summary: `Bordereau agent ${agent.firstName} ${agent.lastName} — ${total} HTG collectes, ${commission} HTG commission, ${transactions.length} transactions`,
    actionData: {
      reportType: 'agent_bordereau',
      agentName: `${agent.firstName} ${agent.lastName}`,
      totalCollected: total,
      commissionAmount: commission,
      netToPlatform: total - commission,
      transactionCount: transactions.length,
    },
  };
}
