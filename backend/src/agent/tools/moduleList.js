const { defineTool } = require('./_baseTool');
const Module = require('../../models/Module');

module.exports = defineTool({
  id: 'moduleList',
  name: 'Liste des Modules',
  description: 'Liste les modules (questionnaires/cours) disponibles dans l\'organisation. Peut filtrer par type ou statut.',
  parameters: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Recherche par titre',
      },
      limit: {
        type: 'number',
        description: 'Nombre max de resultats (defaut: 10)',
      },
    },
  },
  requiredRoles: ['teacher', 'admin_ddene', 'superadmin'],
  isMutation: false,

  async execute(args, context) {
    const filter = { ...context.tenantFilter() };

    if (args.search) {
      filter.title = { $regex: args.search, $options: 'i' };
    }

    const limit = Math.min(args.limit || 10, 25);

    const modules = await Module.find(filter)
      .select('title description evaluationType shareEnabled sections createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return {
      modules: modules.map((m) => ({
        id: m._id.toString(),
        title: m.title,
        description: m.description,
        evaluationType: m.evaluationType,
        shareEnabled: m.shareEnabled,
        sectionCount: m.sections?.length || 0,
        questionCount: countQuestions(m),
        createdAt: m.createdAt,
      })),
      total: modules.length,
    };
  },
});

function countQuestions(mod) {
  let count = 0;
  const questionTypes = ['quiz', 'true_false', 'numeric', 'fill_blank', 'matching', 'sequence', 'open_answer'];
  for (const section of mod.sections || []) {
    for (const screen of section.screens || []) {
      for (const block of screen.contentBlocks || []) {
        if (questionTypes.includes(block.type)) count++;
      }
    }
  }
  return count;
}
