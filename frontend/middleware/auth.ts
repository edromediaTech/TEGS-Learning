export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  // Si pas encore charge, tenter de restaurer la session
  if (!auth.isLoggedIn) {
    await auth.fetchMe();
  }

  if (!auth.isLoggedIn) {
    return navigateTo('/login');
  }

  // Routes admin : verifier le role
  if (to.path.startsWith('/admin') && !auth.canManageModules) {
    return navigateTo('/login');
  }
});
