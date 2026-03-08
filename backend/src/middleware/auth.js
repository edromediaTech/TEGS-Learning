const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware d'authentification JWT.
 * Extrait le token du header Authorization (Bearer <token>),
 * le verifie, puis injecte les infos utilisateur et le tenant_id dans req.
 *
 * Apres ce middleware, chaque handler a acces a :
 *   - req.user    : { id, role, tenant_id }
 *   - req.tenantId : ObjectId du tenant (raccourci pour le filtrage)
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verification que l'utilisateur existe toujours et est actif
    const user = await User.findById(decoded.id).select('role tenant_id isActive');
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Utilisateur invalide ou desactive' });
    }

    // Injection du contexte tenant dans la requete
    req.user = {
      id: user._id,
      role: user.role,
      tenant_id: user.tenant_id,
    };
    req.tenantId = user.tenant_id;

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token invalide ou expire' });
    }
    next(err);
  }
}

/**
 * Middleware de restriction par role.
 * Usage : authorize('admin_ddene', 'teacher')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acces refuse : role insuffisant' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
