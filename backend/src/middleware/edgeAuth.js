const crypto = require('crypto');
const Center = require('../models/Center');

/**
 * Authentification des noeuds TEGS-Edge (CDC section 5).
 *
 *   X-Center-ID: <center_id>
 *   Authorization: Bearer <jeton du noeud>
 *
 * Les lots montants (push) sont en plus signes :
 *   X-Edge-Signature: sha256=<HMAC-SHA256 du corps brut>
 * La cle HMAC est l'empreinte SHA-256 du jeton, en hexadecimal (le noeud la calcule
 * a partir de son jeton, le cloud la connait sans stocker le jeton).
 */

const TOKEN_PREFIX = 'tegs_edge_';

function generateToken() {
  return TOKEN_PREFIX + crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

function safeEqualHex(a, b) {
  const ba = Buffer.from(a || '', 'utf8');
  const bb = Buffer.from(b || '', 'utf8');
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

function signBody(tokenHash, rawBody) {
  return 'sha256=' + crypto.createHmac('sha256', tokenHash).update(rawBody).digest('hex');
}

function deny(res, status, error) {
  return res.status(status).json({ status: 'REJECT', error });
}

async function authenticateEdge(req, res, next) {
  try {
    const centerId = String(req.get('X-Center-ID') || '').trim().toUpperCase();
    const auth = req.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!centerId || !token) return deny(res, 401, 'X-Center-ID et jeton Bearer requis');

    const center = await Center.findOne({ center_id: centerId }).select('+token_hash');
    // Meme reponse si le centre n'existe pas ou si le jeton est faux.
    if (!center || !safeEqualHex(center.token_hash, hashToken(token))) {
      return deny(res, 401, 'Centre ou jeton invalide');
    }
    if (!center.isActive) return deny(res, 403, 'Centre desactive');

    const bodyCenter = req.body?.center_id;
    if (bodyCenter && String(bodyCenter).trim().toUpperCase() !== centerId) {
      return deny(res, 400, 'center_id du corps different de X-Center-ID');
    }

    req.center = center;
    req.tenantId = center.tenant_id;
    next();
  } catch (err) {
    next(err);
  }
}

// A placer apres authenticateEdge, sur les routes qui exigent un corps signe.
function requireEdgeSignature(req, res, next) {
  const given = String(req.get('X-Edge-Signature') || '');
  if (!req.rawBody) return deny(res, 400, 'Corps brut indisponible pour verifier la signature');
  const expected = signBody(req.center.token_hash, req.rawBody);
  if (!given || !safeEqualHex(given, expected)) return deny(res, 401, 'Signature du lot invalide');
  next();
}

module.exports = {
  TOKEN_PREFIX, generateToken, hashToken, signBody, authenticateEdge, requireEdgeSignature,
};
