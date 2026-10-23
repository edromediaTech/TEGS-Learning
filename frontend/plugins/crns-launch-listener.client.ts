// Plugin client : connecte tout utilisateur authentifie au namespace /crns
// et reagit a `crns:launch` en redirigeant automatiquement vers la simulation
// poussee par l'enseignant. Indispensable pour le scenario salle de classe.
//
// Strategie d'evitement :
//   - ne redirige pas si on est deja sur /simulations/<simId>
//   - ne redirige pas si on est sur la page moniteur (l'enseignant pousse)
//   - le serveur exclut deja l'emetteur du broadcast, donc l'onglet du prof
//     qui pousse n'est pas redirigee

export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return;

  nuxtApp.hook('app:mounted', async () => {
    const auth = useAuthStore();
    if (!auth.isLoggedIn) {
      try {
        await auth.fetchMe();
      } catch {
        return;
      }
    }
    if (!auth.isLoggedIn) return;

    const userName = auth.user ? `${auth.user.firstName} ${auth.user.lastName}`.trim() : null;
    const monitor = useCrnsClassroomSocket({ name: userName || undefined });
    monitor.connect();

    const router = useRouter();
    watch(monitor.lastLaunch, (launch) => {
      if (!launch?.simulationId) return;
      const target = `/simulations/${launch.simulationId}`;
      const cur = router.currentRoute.value.path;
      if (cur === target) return;
      if (cur.startsWith('/admin/classroom-monitor')) return;
      router.push(target);
    });
  });
});
