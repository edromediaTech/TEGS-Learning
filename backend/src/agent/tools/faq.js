const { defineTool } = require('./_baseTool');

/**
 * FAQ statique + aide generale.
 * Accessible a tous les roles. Lecture seule.
 */

const FAQ_ENTRIES = {
  inscription: 'Pour vous inscrire a un concours, rendez-vous sur la page du tournoi et cliquez sur "S\'inscrire". Vous aurez besoin de renseigner votre nom, prenom, etablissement et eventuellement payer les frais d\'inscription via MonCash ou Natcash.',
  paiement: 'Les paiements sont acceptes via MonCash et Natcash. Vous pouvez aussi utiliser un code BOURSE si un sponsor vous en a fourni un. Apres paiement, vous recevrez un ticket numerique (TKT-XXX) avec un QR code.',
  regles: 'Chaque concours se deroule en rounds eliminatoires. Vous devez repondre aux questions dans le temps imparti. Les meilleurs candidats sont qualifies pour le round suivant. Le nombre de places qualificatives est affiche avant chaque round.',
  resultats: 'Les resultats sont affiches en temps reel sur la page du tournoi. Apres chaque round, un classement est publie. Les certificats PDF sont disponibles a la fin du concours.',
  agent_pos: 'En tant qu\'agent collecteur, vous pouvez collecter les paiements des candidats depuis votre caisse. Votre commission est calculee automatiquement. Consultez votre quota et garantie depuis la page Caisse Agent.',
  commission: 'Votre commission est un pourcentage sur chaque inscription collectee. Le taux est defini par l\'administrateur. Votre bordereau de versement est genere automatiquement.',
  technique: 'En cas de probleme technique pendant un quiz, signalez-le immediatement. Ne quittez pas le mode plein ecran sous peine d\'elimination. Assurez-vous d\'avoir une connexion Internet stable.',
  bourse: 'Les codes BOURSE (BOURSE-XXX) sont fournis par les sponsors. Entrez le code lors de l\'inscription pour beneficier d\'une place gratuite ou a tarif reduit.',
  certificat: 'Les certificats sont generes automatiquement apres la fin du concours. Vous pouvez les telecharger en PDF depuis la page de resultats.',
  contact: 'Pour toute question, consultez le Centre d\'Aide dans le menu principal ou contactez l\'administrateur de votre organisation.',
};

module.exports = defineTool({
  id: 'faq',
  name: 'FAQ & Aide',
  description: 'Repond aux questions frequentes sur la plateforme TEGS-Learning : inscription, paiement, regles, resultats, commissions, bourses, certificats.',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'Le sujet de la question (inscription, paiement, regles, resultats, agent_pos, commission, technique, bourse, certificat, contact)',
      },
      question: {
        type: 'string',
        description: 'La question complete de l\'utilisateur si le sujet n\'est pas clair',
      },
    },
  },
  requiredRoles: [], // Tous les roles
  isMutation: false,

  async execute(args) {
    const { topic, question } = args;

    // Recherche directe par topic
    if (topic && FAQ_ENTRIES[topic.toLowerCase()]) {
      return {
        answer: FAQ_ENTRIES[topic.toLowerCase()],
        source: 'faq_statique',
      };
    }

    // Recherche par mots-cles dans la question
    if (question) {
      const q = question.toLowerCase();
      for (const [key, answer] of Object.entries(FAQ_ENTRIES)) {
        if (q.includes(key) || q.includes(key.replace('_', ' '))) {
          return { answer, source: 'faq_statique', matchedTopic: key };
        }
      }
    }

    // Pas de match — retourner les sujets disponibles
    return {
      answer: null,
      availableTopics: Object.keys(FAQ_ENTRIES),
      suggestion: 'Je n\'ai pas trouve de reponse directe. Essayez un de ces sujets ou reformulez votre question.',
    };
  },
});
