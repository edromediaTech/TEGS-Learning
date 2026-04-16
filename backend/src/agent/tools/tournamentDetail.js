const { defineTool } = require('./_baseTool');
const Tournament = require('../../models/Tournament');
const Participant = require('../../models/Participant');

module.exports = defineTool({
  id: 'tournamentDetail',
  name: 'Detail d\'un Tournoi',
  description: 'Affiche les details complets d\'un tournoi : rounds, prix, participants, statut. Necessite l\'ID ou le titre du tournoi.',
  parameters: {
    type: 'object',
    properties: {
      tournamentId: {
        type: 'string',
        description: 'ID MongoDB du tournoi',
      },
      title: {
        type: 'string',
        description: 'Titre du tournoi (recherche partielle si ID non fourni)',
      },
    },
  },
  requiredRoles: [], // Tous les roles
  isMutation: false,

  async execute(args, context) {
    let tournament;

    if (args.tournamentId) {
      tournament = await Tournament.findOne({
        _id: args.tournamentId,
        ...context.tenantFilter(),
      }).lean();
    } else if (args.title) {
      tournament = await Tournament.findOne({
        title: { $regex: args.title, $options: 'i' },
        ...context.tenantFilter(),
      }).lean();
    } else {
      return { error: 'Veuillez fournir un ID ou un titre de tournoi.' };
    }

    if (!tournament) {
      return { error: 'Tournoi introuvable.' };
    }

    const participantCount = await Participant.countDocuments({
      tournament_id: tournament._id,
    });

    const paidCount = await Participant.countDocuments({
      tournament_id: tournament._id,
      paymentStatus: 'paid',
    });

    const totalPrize = (tournament.prizes || []).reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      id: tournament._id.toString(),
      title: tournament.title,
      description: tournament.description,
      status: tournament.status,
      registrationFee: tournament.registrationFee,
      currency: tournament.currency,
      maxParticipants: tournament.maxParticipants,
      participantCount,
      paidCount,
      spotsLeft: tournament.maxParticipants > 0
        ? Math.max(0, tournament.maxParticipants - participantCount)
        : null,
      rounds: (tournament.rounds || []).map((r) => ({
        order: r.order,
        label: r.label,
        status: r.status,
        promoteTopX: r.promoteTopX,
      })),
      currentRound: tournament.currentRound,
      prizes: tournament.prizes || [],
      totalPrize,
      shareToken: tournament.shareToken,
      registrationOpen: tournament.registrationOpen,
      registrationClose: tournament.registrationClose,
      createdAt: tournament.createdAt,
    };
  },
});
