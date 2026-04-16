const { defineTool } = require('./_baseTool');
const Tournament = require('../../models/Tournament');
const Participant = require('../../models/Participant');

module.exports = defineTool({
  id: 'tournamentList',
  name: 'Liste des Tournois',
  description: 'Liste les tournois disponibles avec leur statut, nombre de participants et informations cles. Peut filtrer par statut (draft, registration, active, completed, cancelled).',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filtrer par statut : draft, registration, active, completed, cancelled. Laisser vide pour tous.',
      },
      limit: {
        type: 'number',
        description: 'Nombre maximum de resultats (defaut: 10)',
      },
    },
  },
  requiredRoles: [], // Tous les roles
  isMutation: false,

  async execute(args, context) {
    const filter = { ...context.tenantFilter() };
    if (args.status) {
      filter.status = args.status;
    }

    const limit = Math.min(args.limit || 10, 25);

    const tournaments = await Tournament.find(filter)
      .select('title status registrationFee currency maxParticipants rounds currentRound createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Enrichir avec le nombre de participants
    const enriched = await Promise.all(
      tournaments.map(async (t) => {
        const participantCount = await Participant.countDocuments({ tournament_id: t._id });
        return {
          id: t._id.toString(),
          title: t.title,
          status: t.status,
          registrationFee: t.registrationFee,
          currency: t.currency,
          maxParticipants: t.maxParticipants,
          participantCount,
          roundCount: t.rounds?.length || 0,
          currentRound: t.currentRound,
          createdAt: t.createdAt,
        };
      })
    );

    return {
      tournaments: enriched,
      total: enriched.length,
      message: enriched.length === 0
        ? 'Aucun tournoi trouve avec ces criteres.'
        : `${enriched.length} tournoi(s) trouve(s).`,
    };
  },
});
