export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  // Si pas encore charge, tenter de restaurer la session
  if (!auth.isLoggedIn) {
    await auth.fetchMe();
  }

  // Cote client : si toujours pas connecte mais cookie present, retenter
  if (!auth.isLoggedIn && import.meta.client) {
    const token = useCookie('auth_token').value;
    if (token) {
      // Le token existe en cookie mais fetchMe a echoue cote SSR
      // Retenter cote client
      await auth.fetchMe();
    }
  }

  if (!auth.isLoggedIn) {
    return navigateTo('/login');
  }

  // Routes admin : verifier le role
  if (to.path.startsWith('/admin') && !auth.canManageModules) {
    return navigateTo('/login');
  }
});
