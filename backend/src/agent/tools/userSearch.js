const { defineTool } = require('./_baseTool');
const User = require('../../models/User');

module.exports = defineTool({
  id: 'userSearch',
  name: 'Recherche Utilisateurs',
  description: 'Recherche des utilisateurs par nom, email ou role dans l\'organisation.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Nom ou email a rechercher',
      },
      role: {
        type: 'string',
        description: 'Filtrer par role : superadmin, admin_ddene, teacher, student, authorized_agent',
      },
      limit: {
        type: 'number',
        description: 'Nombre max de resultats (defaut: 15)',
      },
    },
  },
  requiredRoles: ['admin_ddene', 'superadmin'],
  isMutation: false,

  async execute(args, context) {
    const filter = { ...context.tenantFilter() };

    if (args.query) {
      filter.$or = [
        { firstName: { $regex: args.query, $options: 'i' } },
        { lastName: { $regex: args.query, $options: 'i' } },
        { email: { $regex: args.query, $options: 'i' } },
      ];
    }

    if (args.role) {
      filter.role = args.role;
    }

    const limit = Math.min(args.limit || 15, 50);

    const users = await User.find(filter)
      .select('firstName lastName email role isActive district className createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return {
      users: users.map((u) => ({
        id: u._id.toString(),
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        district: u.district,
        className: u.className,
        createdAt: u.createdAt,
      })),
      total: users.length,
      message: users.length === 0
        ? 'Aucun utilisateur trouve.'
        : `${users.length} utilisateur(s) trouve(s).`,
    };
  },
});
