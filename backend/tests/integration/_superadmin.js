/**
 * Jeton superadmin pour les tests d'integration.
 *
 * Depuis le correctif de l'audit d'octobre 2026, POST /api/tenants et POST /api/auth/register
 * (hors creation du tout premier superadmin) exigent un administrateur authentifie. Les
 * scenarios historiques creaient organisations et comptes sans jeton : withSuperAdmin()
 * enveloppe leur helper request() et fournit un jeton superadmin a ces seuls appels.
 *
 * Origine du jeton, dans l'ordre :
 *   1. celui que le test passe lui-meme a POST /tenants (tests qui ont deja un superadmin) ;
 *   2. TEGS_TEST_SUPERADMIN_EMAIL + TEGS_TEST_SUPERADMIN_PASSWORD (base deja amorcee) ;
 *   3. creation du premier superadmin (base vide).
 */

function needsAdmin(method, path, body) {
  if (method !== 'POST') return false;
  if (path === '/tenants') return true;
  return path === '/auth/register' && body?.role !== 'superadmin';
}

function withSuperAdmin(request) {
  let superToken = null;

  async function obtain() {
    if (superToken) return superToken;
    const email = process.env.TEGS_TEST_SUPERADMIN_EMAIL;
    const password = process.env.TEGS_TEST_SUPERADMIN_PASSWORD;
    if (email && password) {
      const login = await request('POST', '/auth/login', { email, password });
      if (login.status === 200 && login.data?.token) return (superToken = login.data.token);
    }
    const reg = await request('POST', '/auth/register', {
      email: `sa-integration-${Date.now()}@tegs.ht`, password: 'Super123!',
      firstName: 'Super', lastName: 'Integration', role: 'superadmin',
    });
    if (reg.status === 201 && reg.data?.token) return (superToken = reg.data.token);
    throw new Error(
      'Aucun jeton superadmin : la base en a deja un. Definir TEGS_TEST_SUPERADMIN_EMAIL '
      + 'et TEGS_TEST_SUPERADMIN_PASSWORD, ou lancer les tests sur une base vide.',
    );
  }

  return async function requestWithSuperAdmin(method, path, body, token) {
    if (!needsAdmin(method, path, body)) return request(method, path, body, token);
    if (token) {
      if (path === '/tenants') superToken = superToken || token;
      return request(method, path, body, token);
    }
    return request(method, path, body, await obtain());
  };
}

module.exports = { withSuperAdmin };
