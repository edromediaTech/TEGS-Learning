<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center">
      <!-- Circular progress -->
      <div class="relative w-48 h-48 mx-auto mb-8">
        <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="42" stroke-width="3" stroke="rgba(99,102,241,0.2)" fill="none" />
          <circle cx="50" cy="50" r="42" stroke-width="4" stroke="#6366f1"
            fill="none" stroke-linecap="round"
            :stroke-dasharray="264"
            :stroke-dashoffset="264 - (264 * progress / 100)"
            class="transition-all duration-1000" />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div class="text-4xl font-black text-indigo-400">{{ position }}</div>
          <div class="text-xs text-gray-500 mt-1">en file</div>
        </div>
      </div>

      <!-- Status -->
      <h1 class="text-2xl font-extrabold mb-2">File d'attente active</h1>
      <p class="text-gray-400 mb-6">
        <span class="text-indigo-400 font-bold">{{ totalInQueue }}</span> personnes devant vous
      </p>

      <!-- Priority badge -->
      <div v-if="priority === 'high'" class="inline-flex items-center px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 mb-4">
        Priorité haute — Candidat vérifié
      </div>

      <!-- Estimated wait -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <div class="text-sm text-gray-400 mb-1">Temps d'attente estimé</div>
        <div class="text-3xl font-black text-white">
          <template v-if="estimatedWait >= 60">{{ Math.floor(estimatedWait / 60) }}m {{ estimatedWait % 60 }}s</template>
          <template v-else>{{ estimatedWait }}s</template>
        </div>
      </div>

      <!-- Tips / instructions -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 text-left">
        <h3 class="text-sm font-bold text-indigo-400 mb-3">En attendant...</h3>
        <ul class="space-y-2 text-sm text-gray-400">
          <li class="flex items-start space-x-2">
            <span class="text-indigo-400 mt-0.5">&#8226;</span>
            <span>Verifiez que votre camera et micro fonctionnent</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-indigo-400 mt-0.5">&#8226;</span>
            <span>Fermez les autres onglets pour optimiser la connexion</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-indigo-400 mt-0.5">&#8226;</span>
            <span>Preparez votre competitionToken</span>
          </li>
          <li class="flex items-start space-x-2">
            <span class="text-indigo-400 mt-0.5">&#8226;</span>
            <span>Ne fermez pas cette page — vous serez redirigé automatiquement</span>
          </li>
        </ul>
      </div>

      <!-- Pulse animation -->
      <div class="flex items-center justify-center space-x-1">
        <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
        <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
        <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
        <span class="ml-2 text-xs text-gray-500">Vérification en cours...</span>
      </div>

      <!-- Green light animation -->
      <Transition name="greenlight">
        <div v-if="greenLight" class="fixed inset-0 bg-green-500/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="text-center">
            <div class="text-7xl mb-4 animate-bounce">&#9989;</div>
            <h2 class="text-2xl font-extrabold text-green-400 mb-2">C'est votre tour !</h2>
            <p class="text-gray-300">Redirection en cours...</p>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();
const config = useRuntimeConfig();
const baseURL = config.public.apiBase as string;

const tournamentId = route.query.tournament_id as string || '';
const competitionToken = route.query.token as string || '';
const redirectTo = route.query.redirect as string || '';

const position = ref(0);
const totalInQueue = ref(0);
const estimatedWait = ref(0);
const priority = ref('normal');
const progress = ref(0);
const greenLight = ref(false);

let pollTimer: ReturnType<typeof setInterval> | null = null;

async function checkQueue() {
  try {
    const params = new URLSearchParams();
    if (tournamentId) params.set('tournament_id', tournamentId);
    if (competitionToken) params.set('token', competitionToken);

    const data = await $fetch<any>(`${baseURL}/queue/status?${params}`);

    if (!data.mustWait) {
      // Green light!
      greenLight.value = true;
      if (pollTimer) clearInterval(pollTimer);
      setTimeout(() => {
        if (redirectTo) {
          router.push(redirectTo);
        } else if (tournamentId) {
          router.push(`/tournament/${route.query.share_token || tournamentId}`);
        } else {
          router.push('/');
        }
      }, 2000);
      return;
    }

    position.value = data.position || 0;
    totalInQueue.value = data.totalInQueue || 0;
    estimatedWait.value = data.estimatedWaitTime || 0;
    priority.value = data.priority || 'normal';

    // Progress bar (inversé : plus on est proche de 1, plus on est avancé)
    if (totalInQueue.value > 0) {
      progress.value = Math.max(5, 100 - ((position.value / totalInQueue.value) * 100));
    }
  } catch {
    // API down — retry silently
  }
}

onMounted(() => {
  checkQueue();
  pollTimer = setInterval(checkQueue, 5000); // Poll toutes les 5 secondes
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  // Libérer la session quand on quitte
  try {
    $fetch(`${baseURL}/queue/release`, { method: 'POST' });
  } catch {}
});
</script>

<style scoped>
.greenlight-enter-active { transition: all 0.5s ease; }
.greenlight-enter-from { opacity: 0; }
</style>
