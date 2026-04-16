const { defineTool } = require('./_baseTool');
const crypto = require('crypto');

/**
 * Outil MUTATION : Creer un tournoi.
 * Retourne un PROPOSAL — la creation effective ne se fait qu'apres confirmation.
 */
module.exports = defineTool({
  id: 'tournamentCreate',
  name: 'Creer un Tournoi',
  description: 'Prepare la creation d\'un nouveau tournoi avec ses rounds, frais d\'inscription et prix. L\'action necessite une confirmation humaine avant execution.',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Titre du tournoi (obligatoire)',
      },
      description: {
        type: 'string',
        description: 'Description du tournoi',
      },
      roundCount: {
        type: 'number',
        description: 'Nombre de rounds (defaut: 3)',
      },
      registrationFee: {
        type: 'number',
        description: 'Frais d\'inscription en HTG (defaut: 0)',
      },
      maxParticipants: {
        type: 'number',
        description: 'Nombre max de participants (0 = illimite)',
      },
      subject: {
        type: 'string',
        description: 'Sujet/matiere du concours (pour nommer les rounds)',
      },
    },
    required: ['title'],
  },
  requiredRoles: ['admin_ddene', 'superadmin'],
  isMutation: true,

  async execute(args, context) {
    const {
      title,
      description = '',
      roundCount = 3,
      registrationFee = 0,
      maxParticipants = 0,
      subject = '',
    } = args;

    if (!title || title.trim().length < 3) {
      return { error: 'Le titre du tournoi doit contenir au moins 3 caracteres.' };
    }

    // Generer les rounds avec des labels pertinents
    const rounds = [];
    const roundLabels = ['Eliminatoire', 'Demi-finale', 'Finale'];
    for (let i = 0; i < Math.min(roundCount, 10); i++) {
      const label = i < roundLabels.length
        ? roundLabels[i]
        : `Round ${i + 1}`;
      rounds.push({
        order: i,
        label: subject ? `${label} — ${subject}` : label,
        promoteTopX: Math.max(1, Math.floor((maxParticipants || 100) / Math.pow(2, i + 1))),
        status: 'pending',
      });
    }

    // Generer un shareToken
    const shareToken = crypto.randomBytes(6).toString('hex');

    // Construire les donnees pour la creation
    const tournamentData = {
      title: title.trim(),
      description: description.trim(),
      status: 'draft',
      registrationFee,
      currency: 'HTG',
      maxParticipants,
      rounds,
      currentRound: 0,
      prizes: [],
      shareToken,
      tenant_id: context.tenantId,
      created_by: context.user.id,
    };

    // Construire un resume lisible
    const summary = [
      `Tournoi "${title}"`,
      `${rounds.length} round(s)`,
      registrationFee > 0 ? `Frais: ${registrationFee} HTG` : 'Gratuit',
      maxParticipants > 0 ? `Max ${maxParticipants} participants` : 'Participants illimites',
    ].join(' | ');

    return {
      summary,
      actionData: tournamentData,
      details: {
        title: tournamentData.title,
        rounds: rounds.map((r) => `${r.label} (Top ${r.promoteTopX})`),
        registrationFee: `${registrationFee} HTG`,
        maxParticipants: maxParticipants || 'Illimite',
      },
    };
  },
});
