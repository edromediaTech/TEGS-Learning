// Bootstrap dev : pose le cookie __session via Set-Cookie + 302.
// Beaucoup plus fiable que l'ancien public/dev-login.html (qui dependait
// d'un document.cookie + setTimeout cote client). N'EST EXPOSE qu'en
// dev mode -- a retirer du Dockerfile/firebase.json en prod.
//
// Usage : /dev-login?t=<jwt>&tid=<tenant_id>&next=<path>

import { defineEventHandler, getQuery, setCookie, sendRedirect, createError } from 'h3';

export default defineEventHandler((event) => {
  // Garde-fou : un build Nitro de prod (Dockerfile) exposerait sinon la route.
  if (!import.meta.dev) {
    throw createError({ statusCode: 404 });
  }

  const q = getQuery(event);
  const t = typeof q.t === 'string' ? q.t : '';
  const tid = typeof q.tid === 'string' ? q.tid : '';
  // Chemin interne uniquement : "//hote" ou "/\hote" serait une redirection externe.
  const next = typeof q.next === 'string' && /^\/(?![/\\])/.test(q.next) ? q.next : '/admin/simulations-stats';

  if (!t || !tid) {
    throw createError({ statusCode: 400, statusMessage: 'Parametres manquants : ?t=<jwt>&tid=<tenant_id>' });
  }

  const value = JSON.stringify({ token: t, tenant_id: tid });
  setCookie(event, '__session', value, {
    maxAge: 60 * 60 * 4,
    path: '/',
    sameSite: 'lax',
    httpOnly: false, // Nuxt useCookie cote client doit pouvoir le lire
  });

  return sendRedirect(event, next, 302);
});
