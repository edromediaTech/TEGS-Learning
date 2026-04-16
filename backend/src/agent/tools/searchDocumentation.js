const { defineTool } = require('./_baseTool');
const { searchDocs } = require('../knowledge/docsIndex');

/**
 * Outil de recherche dans la documentation TEGS-Learning.
 *
 * L'orchestrateur appelle cet outil AVANT de repondre aux questions
 * sur le fonctionnement de la plateforme.
 *
 * Le scope est determine automatiquement :
 *   - 'public' pour les visiteurs non connectes
 *   - 'all' pour les utilisateurs authentifies
 */
module.exports = defineTool({
  id: 'searchDocumentation',
  name: 'Recherche Documentation',
  description: 'Recherche dans la base de connaissances TEGS-Learning. Utilise cet outil pour repondre aux questions sur : inscription, paiement, concours, quiz, resultats, agents, administration, securite, sponsors, bourses.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'La question ou les mots-cles a rechercher dans la documentation',
      },
    },
    required: ['query'],
  },
  requiredRoles: [], // Tous les roles + public
  isMutation: false,

  async execute(args, context) {
    const scope = context.isPublic ? 'public' : 'all';

    // Determiner l'audience en fonction du role
    let audience = null;
    if (context.user?.role === 'student') audience = 'candidat';
    else if (context.user?.role === 'authorized_agent') audience = 'agent';
    else if (['admin_ddene', 'superadmin'].includes(context.user?.role)) audience = null; // Admins voient tout
    else if (context.user?.role === 'teacher') audience = null;

    const results = searchDocs(args.query, scope, audience);

    if (results.length === 0) {
      return {
        found: false,
        message: 'Aucun document trouve pour cette recherche.',
        suggestion: 'Reformulez votre question ou consultez le Centre d\'Aide.',
      };
    }

    return {
      found: true,
      results: results.map((r) => ({
        title: r.title,
        content: r.content,
        audience: r.audience,
        relevance: r.score,
      })),
      totalResults: results.length,
    };
  },
});
