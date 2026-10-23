// Plugin client : replay automatique de la file xAPI quand le reseau revient.
// Reduit la perte de progres pour les eleves Fort-Liberte sur connexion intermittente.

import { flushXapiQueue, getXapiQueueSize } from '~/composables/useXapiTracker';

export default defineNuxtPlugin(() => {
  if (import.meta.server) return;
  const { apiFetch } = useApi();

  function tryFlush() {
    if (!navigator.onLine) return;
    if (getXapiQueueSize() === 0) return;
    flushXapiQueue(apiFetch).catch(() => {});
  }

  window.addEventListener('online', tryFlush);
  // tente egalement au boot si on est deja online + queue non vide
  if (navigator.onLine) {
    setTimeout(tryFlush, 2000); // attend que l'auth Pinia soit setteen
  }
});
