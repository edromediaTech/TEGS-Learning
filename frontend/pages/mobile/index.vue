<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
    <!-- Top bar -->
    <header class="safe-area-top bg-black/30 backdrop-blur-md px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <div class="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
          <span class="text-sm font-black">T</span>
        </div>
        <div>
          <div class="text-sm font-bold">TEGS Arena</div>
          <div class="text-[10px] text-gray-400">{{ roleLabel }}</div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 rounded-full" :class="native.isNative.value ? 'bg-green-500' : 'bg-blue-400'"></div>
        <span class="text-[10px] text-gray-500">{{ native.platform.value }}</span>
      </div>
    </header>

    <!-- Not logged in -->
    <div v-if="!auth.isLoggedIn" class="px-4 pt-12 text-center">
      <div class="text-6xl mb-6 opacity-50">&#127942;</div>
      <h1 class="text-2xl font-extrabold mb-3">TEGS Arena</h1>
      <p class="text-gray-400 mb-8">Le Terminal Universel de Competition</p>

      <!-- Quick access by token -->
      <div class="bg-white/10 backdrop-blur rounded-2xl p-6 mb-6">
        <h3 class="text-sm font-bold text-gray-300 mb-3">Acces rapide par ticket</h3>
        <form @submit.prevent="joinByToken" class="flex space-x-2">
          <input v-model="quickToken" type="text" placeholder="TKT-XXXXXXXX"
            class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 outline-none font-mono uppercase" />
          <button type="submit"
            class="bg-amber-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors shrink-0">
            Entrer
          </button>
        </form>
        <p v-if="tokenError" class="text-red-400 text-xs mt-2">{{ tokenError }}</p>
      </div>

      <!-- Login -->
      <NuxtLink to="/login" class="block bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">
        Se connecter
      </NuxtLink>
    </div>

    <!-- Logged in: Role-based dashboard -->
    <div v-else class="px-4 pt-6 pb-24">
      <!-- Role selector (for admins who can switch views) -->
      <div v-if="auth.isAdmin || auth.isSuperAdmin" class="flex items-center space-x-2 mb-6 overflow-x-auto">
        <button
          v-for="r in availableRoles"
          :key="r.id"
          @click="viewRole = r.id"
          class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0"
          :class="viewRole === r.id
            ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'"
        >
          {{ r.label }}
        </button>
      </div>

      <!-- =============================================== -->
      <!-- CANDIDAT DASHBOARD -->
      <!-- =============================================== -->
      <template v-if="viewRole === 'candidate'">
        <h2 class="text-xl font-extrabold mb-4">Mes Tournois</h2>

        <!-- Active tournaments (via token) -->
        <div v-if="myTournaments.length === 0" class="bg-white/5 rounded-2xl p-8 text-center">
          <div class="text-4xl mb-3 opacity-50">&#127915;</div>
          <p class="text-gray-400 mb-4">Aucun tournoi en cours</p>
          <p class="text-gray-500 text-sm">Inscrivez-vous via le lien partage par votre ecole</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="t in myTournaments" :key="t._id"
            class="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-bold">{{ t.title }}</h3>
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                :class="t.status === 'active' ? 'bg-amber-500/30 text-amber-300' : 'bg-gray-500/30 text-gray-400'">
                {{ t.status === 'active' ? 'EN COURS' : t.status }}
              </span>
            </div>
            <!-- War Room button -->
            <NuxtLink v-if="t.status === 'active'"
              :to="`/mobile/warroom/${t._id}`"
              class="block bg-gradient-to-r from-red-500 to-orange-500 text-white text-center py-3 rounded-xl font-bold hover:from-red-600 hover:to-orange-600 transition-all">
              Entrer dans la War Room
            </NuxtLink>
          </div>
        </div>

        <!-- Wallet section -->
        <div class="mt-8 bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 class="text-sm font-bold text-gray-400 uppercase mb-3">Mon Wallet</h3>
          <div class="text-3xl font-black text-green-400 mb-1">0 <span class="text-lg text-gray-500">HTG</span></div>
          <p class="text-xs text-gray-500">Les remboursements et primes apparaitront ici</p>
        </div>
      </template>

      <!-- =============================================== -->
      <!-- SUPERVISEUR DASHBOARD -->
      <!-- =============================================== -->
      <template v-if="viewRole === 'supervisor'">
        <h2 class="text-xl font-extrabold mb-4">Supervision</h2>

        <!-- Scanner button -->
        <NuxtLink to="/mobile/supervisor"
          class="block bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl p-6 mb-4 text-center hover:from-blue-600 hover:to-indigo-600 transition-all">
          <div class="text-4xl mb-2">&#128247;</div>
          <div class="font-bold text-lg">Scanner un badge</div>
          <div class="text-blue-200 text-sm mt-1">Verifier le competitionToken d'un candidat</div>
        </NuxtLink>

        <!-- Live monitoring -->
        <div class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-4">
          <h3 class="text-sm font-bold text-gray-400 uppercase mb-3">Monitoring live</h3>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-white/5 rounded-xl p-3">
              <div class="text-xl font-black text-blue-400">{{ liveStats.scanned }}</div>
              <div class="text-[10px] text-gray-500">Scannes</div>
            </div>
            <div class="bg-white/5 rounded-xl p-3">
              <div class="text-xl font-black text-green-400">{{ liveStats.valid }}</div>
              <div class="text-[10px] text-gray-500">Valides</div>
            </div>
            <div class="bg-white/5 rounded-xl p-3">
              <div class="text-xl font-black text-red-400">{{ liveStats.alerts }}</div>
              <div class="text-[10px] text-gray-500">Alertes</div>
            </div>
          </div>
        </div>

        <!-- Fraud alerts -->
        <div class="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 class="text-sm font-bold text-red-400 uppercase mb-3">Alertes de fraude</h3>
          <div v-if="fraudAlerts.length === 0" class="text-center py-4 text-gray-600 text-sm">
            Aucune alerte
          </div>
          <div v-else class="space-y-2">
            <div v-for="alert in fraudAlerts" :key="alert.id"
              class="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center space-x-3">
              <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0"></div>
              <div class="flex-1 text-sm">
                <span class="font-bold text-red-300">{{ alert.student }}</span>
                <span class="text-gray-400"> — {{ alert.reason }}</span>
              </div>
              <span class="text-[10px] text-gray-500">{{ alert.time }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- =============================================== -->
      <!-- SPECTATEUR DASHBOARD -->
      <!-- =============================================== -->
      <template v-if="viewRole === 'spectator'">
        <h2 class="text-xl font-extrabold mb-4">Arena TV</h2>

        <!-- Tournament list for spectating -->
        <div v-if="activeTournaments.length === 0" class="bg-white/5 rounded-2xl p-8 text-center">
          <div class="text-4xl mb-3 opacity-50">&#128250;</div>
          <p class="text-gray-400">Aucun tournoi en direct pour le moment</p>
        </div>

        <div v-else class="space-y-4">
          <NuxtLink
            v-for="t in activeTournaments"
            :key="t._id"
            :to="`/live-tournament/${t.shareToken}`"
            class="block bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors"
          >
            <div class="flex items-center space-x-3">
              <div class="w-3 h-3 bg-red-500 rounded-full animate-pulse shrink-0"></div>
              <div class="flex-1">
                <div class="font-bold">{{ t.title }}</div>
                <div class="text-xs text-gray-400">
                  Round {{ (t.currentRound || 0) + 1 }} / {{ t.rounds?.length || 0 }}
                  · {{ t.participantCount || 0 }} participants
                </div>
              </div>
              <span class="text-amber-400 text-sm font-bold">LIVE</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Join by share token -->
        <div class="mt-6 bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 class="text-sm font-bold text-gray-400 mb-3">Rejoindre par lien</h3>
          <form @submit.prevent="joinArena" class="flex space-x-2">
            <input v-model="arenaToken" type="text" placeholder="Token du tournoi"
              class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 outline-none" />
            <button type="submit"
              class="bg-red-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-600 transition-colors shrink-0">
              Regarder
            </button>
          </form>
        </div>
      </template>
    </div>

    <!-- Bottom nav (mobile) -->
    <nav class="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
      <div class="flex items-center justify-around py-2">
        <NuxtLink to="/mobile" class="flex flex-col items-center py-1 px-3"
          :class="route.path === '/mobile' ? 'text-amber-400' : 'text-gray-500'">
          <span class="text-lg">&#127968;</span>
          <span class="text-[10px] mt-0.5">Accueil</span>
        </NuxtLink>
        <NuxtLink v-if="auth.isLoggedIn" to="/mobile/supervisor" class="flex flex-col items-center py-1 px-3"
          :class="route.path.startsWith('/mobile/supervisor') ? 'text-amber-400' : 'text-gray-500'">
          <span class="text-lg">&#128247;</span>
          <span class="text-[10px] mt-0.5">Scanner</span>
        </NuxtLink>
        <NuxtLink to="/admin/tournaments" class="flex flex-col items-center py-1 px-3"
          :class="route.path.startsWith('/admin/tournaments') ? 'text-amber-400' : 'text-gray-500'">
          <span class="text-lg">&#127942;</span>
          <span class="text-[10px] mt-0.5">Tournois</span>
        </NuxtLink>
        <button @click="auth.isLoggedIn ? auth.logout() : navigateTo('/login')"
          class="flex flex-col items-center py-1 px-3 text-gray-500">
          <span class="text-lg">{{ auth.isLoggedIn ? '&#9211;' : '&#128100;' }}</span>
          <span class="text-[10px] mt-0.5">{{ auth.isLoggedIn ? 'Sortir' : 'Connexion' }}</span>
        </button>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useTournamentStore } from '~/stores/tournaments';

const auth = useAuthStore();
const store = useTournamentStore();
const native = useNativeBridge();
const route = useRoute();

const viewRole = ref<'candidate' | 'supervisor' | 'spectator'>('candidate');
const quickToken = ref('');
const tokenError = ref('');
const arenaToken = ref('');

// Supervisor live stats (will be populated via socket)
const liveStats = reactive({ scanned: 0, valid: 0, alerts: 0 });
const fraudAlerts = ref<Array<{ id: string; student: string; reason: string; time: string }>>([]);

// Detect role
const roleLabel = computed(() => {
  const map: Record<string, string> = {
    candidate: 'Candidat',
    supervisor: 'Superviseur',
    spectator: 'Spectateur',
  };
  return map[viewRole.value] || 'Candidat';
});

const availableRoles = computed(() => {
  const roles = [
    { id: 'candidate' as const, label: 'Candidat' },
    { id: 'spectator' as const, label: 'Spectateur' },
  ];
  if (auth.isAdmin || auth.isSuperAdmin || auth.user?.role === 'teacher') {
    roles.splice(1, 0, { id: 'supervisor' as const, label: 'Superviseur' });
  }
  return roles;
});

// Auto-select role based on user role
onMounted(async () => {
  if (auth.user?.role === 'student') {
    viewRole.value = 'candidate';
  } else if (auth.user?.role === 'teacher' || auth.isAdmin) {
    viewRole.value = 'supervisor';
  }

  // Setup native features
  native.setStatusBarDark();

  // Register push notifications
  const fcmToken = await native.registerPush();
  if (fcmToken) {
    // Will register device token with backend
    console.log('[PUSH] FCM token:', fcmToken.substring(0, 20) + '...');
  }

  // Fetch tournaments
  if (auth.isLoggedIn) {
    await store.fetchTournaments();
  }
});

// Filtered lists
const myTournaments = computed(() =>
  store.tournaments.filter((t) => ['active', 'registration'].includes(t.status))
);

const activeTournaments = computed(() =>
  store.tournaments.filter((t) => t.status === 'active')
);

// Quick access by competition token
async function joinByToken() {
  tokenError.value = '';
  if (!quickToken.value.trim()) {
    tokenError.value = 'Entrez votre code de competition';
    return;
  }
  // TODO: Verify token via API and redirect to war room
  navigateTo(`/mobile/warroom?token=${quickToken.value.trim()}`);
}

function joinArena() {
  if (arenaToken.value.trim()) {
    navigateTo(`/live-tournament/${arenaToken.value.trim()}`);
  }
}
</script>

<style scoped>
.safe-area-top {
  padding-top: max(12px, env(safe-area-inset-top));
}
.safe-area-bottom {
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}
</style>
