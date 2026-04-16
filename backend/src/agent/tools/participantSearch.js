const { defineTool } = require('./_baseTool');
const Participant = require('../../models/Participant');
const Tournament = require('../../models/Tournament');

module.exports = defineTool({
  id: 'participantSearch',
  name: 'Recherche de Participants',
  description: 'Recherche des participants inscrits a un tournoi par nom, email ou statut de paiement.',
  parameters: {
    type: 'object',
    properties: {
      tournamentId: {
        type: 'string',
        description: 'ID du tournoi (obligatoire)',
      },
      query: {
        type: 'string',
        description: 'Nom ou email a rechercher',
      },
      paymentStatus: {
        type: 'string',
        description: 'Filtrer par statut de paiement : paid, pending, free',
      },
      limit: {
        type: 'number',
        description: 'Nombre max de resultats (defaut: 20)',
      },
    },
    required: ['tournamentId'],
  },
  requiredRoles: ['authorized_agent', 'admin_ddene', 'superadmin'],
  isMutation: false,

  async execute(args, context) {
    // Verifier que le tournoi appartient au tenant
    const tournament = await Tournament.findOne({
      _id: args.tournamentId,
      ...context.tenantFilter(),
    }).select('title').lean();

    if (!tournament) {
      return { error: 'Tournoi introuvable.' };
    }

    const filter = { tournament_id: args.tournamentId };

    if (args.query) {
      filter.$or = [
        { fullName: { $regex: args.query, $options: 'i' } },
        { email: { $regex: args.query, $options: 'i' } },
      ];
    }

    if (args.paymentStatus) {
      filter.paymentStatus = args.paymentStatus;
    }

    const limit = Math.min(args.limit || 20, 50);

    const participants = await Participant.find(filter)
      .select('fullName email phone establishment paymentStatus competitionToken createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return {
      tournamentTitle: tournament.title,
      participants: participants.map((p) => ({
        id: p._id.toString(),
        name: p.fullName,
        email: p.email,
        phone: p.phone,
        establishment: p.establishment,
        paymentStatus: p.paymentStatus,
        ticket: p.competitionToken,
        inscritLe: p.createdAt,
      })),
      total: participants.length,
    };
  },
});
