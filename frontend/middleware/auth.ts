export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore();

  // Restaurer la session depuis le cookie si pas encore fait
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
