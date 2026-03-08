const jwt = require('jsonwebtoken');

/**
 * Genere un token JWT contenant l'id utilisateur, son role et son tenant_id.
 * Le tenant_id est embarque dans le token pour que le middleware d'isolation
 * puisse l'extraire sans requete supplementaire a la DB.
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      tenant_id: user.tenant_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

module.exports = generateToken;
