<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">

    <!-- Hero -->
    <header class="relative overflow-hidden">
      <!-- Animated background particles -->
      <div class="absolute inset-0">
        <div class="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10"></div>
        <div class="particle particle-1"></div>
        <div class="particle particle-2"></div>
        <div class="particle particle-3"></div>
        <div class="particle particle-4"></div>
        <div class="particle particle-5"></div>
        <!-- Animated grid -->
        <div class="absolute inset-0 bg-grid opacity-[0.03]"></div>
        <!-- Glow orbs -->
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] animate-glow-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] animate-glow-pulse-delayed"></div>
      </div>

      <div class="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
        <div class="text-center">
          <div class="animate-fade-down inline-flex items-center px-4 py-1.5 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 mb-6 backdrop-blur-sm">
            <span class="w-2 h-2 bg-amber-400 rounded-full mr-2 animate-pulse"></span>
            TEGS-ARENA
          </div>
          <h1 class="animate-fade-up text-4xl md:text-6xl font-black mb-4 leading-tight">
            <span class="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
              Concours Nationaux
            </span>
          </h1>
          <p class="animate-fade-up-delayed text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Participez aux competitions academiques, testez vos connaissances et remportez des primes.
          </p>

          <!-- Search -->
          <div class="animate-fade-up-delayed-2 max-w-md mx-auto relative group">
            <input v-model="search" type="text" placeholder="Rechercher un concours..."
              class="w-full px-5 py-3.5 pl-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none transition-all duration-300 focus:bg-white/15 focus:shadow-lg focus:shadow-amber-500/10" />
            <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Animated wave divider -->
      <div class="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" class="w-full h-auto">
          <path d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 33.3C672 36.7 768 43.3 864 45C960 46.7 1056 43.3 1152 40C1248 36.7 1344 33.3 1392 31.7L1440 30V60H0Z"
            fill="rgba(255,255,255,0.03)" class="animate-wave" />
          <path d="M0 60L48 57C96 54 192 48 288 44C384 40 480 38 576 40C672 42 768 48 864 50C960 52 1056 50 1152 46C1248 42 1344 36 1392 33L1440 30V60H0Z"
            fill="rgba(255,255,255,0.02)" class="animate-wave-slow" />
        </svg>
      </div>
    </header>

    <!-- Stats bar -->
    <div class="border-y border-white/10 bg-white/5 backdrop-blur relative z-10">
      <div class="max-w-6xl mx-auto px-4 py-5 flex items-center justify-center space-x-8 md:space-x-16 text-center">
        <div class="stat-item" style="--delay: 0s">
          <div class="text-2xl font-black text-amber-400 animate-count-up">{{ stats.live }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">En Cours</div>
        </div>
        <div class="stat-item" style="--delay: 0.1s">
          <div class="text-2xl font-black text-blue-400">{{ stats.registration }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Inscriptions</div>
        </div>
        <div class="stat-item" style="--delay: 0.2s">
          <div class="text-2xl font-black text-green-400">{{ stats.totalParticipants }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Participants</div>
        </div>
        <div class="stat-item" style="--delay: 0.3s">
          <div class="text-2xl font-black text-orange-400">{{ stats.totalPrize > 0 ? formatMoney(stats.totalPrize) : '---' }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Primes HTG</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="max-w-6xl mx-auto px-4 pt-8">
      <div class="flex items-center space-x-2 mb-6">
        <button v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 relative overflow-hidden"
          :class="activeTab === tab.key
            ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25 scale-105'
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white hover:scale-105'">
          {{ tab.label }}
          <span class="ml-1.5 text-xs opacity-70">({{ tab.count }})</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="relative">
        <div class="w-12 h-12 border-4 border-amber-400/30 rounded-full"></div>
        <div class="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
      </div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredTournaments.length === 0" class="text-center py-20 animate-fade-up">
      <div class="text-6xl mb-6 animate-float">&#127942;</div>
      <h2 class="text-xl font-bold text-gray-400 mb-2">Aucun concours disponible</h2>
      <p class="text-gray-600 text-sm">Revenez bientot pour de nouvelles competitions.</p>
      <div class="mt-8 flex items-center justify-center space-x-1">
        <div class="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style="animation-delay: 0s"></div>
        <div class="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
        <div class="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
      </div>
    </div>

    <!-- Grid -->
    <div v-else class="max-w-6xl mx-auto px-4 pb-16">
      <TransitionGroup name="card-list" tag="div"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <div v-for="(t, index) in filteredTournaments" :key="t._id"
          class="group card-enter bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/40 hover:bg-white/[0.07] transition-all duration-500 cursor-pointer hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1"
          :style="{ animationDelay: `${index * 0.1}s` }"
          @click="openTournament(t)">

          <!-- Cover -->
          <div class="relative h-40 bg-gradient-to-br from-amber-900/40 to-slate-800 overflow-hidden">
            <img v-if="t.coverImage" :src="t.coverImage" :alt="t.title"
              class="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-110 transition-all duration-700" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>

            <!-- Shimmer effect on hover -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </div>

            <!-- Status badge -->
            <div class="absolute top-3 left-3">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase backdrop-blur-sm"
                :class="statusBadge(t.status)">
                {{ statusLabel(t.status) }}
              </span>
            </div>

            <!-- Diamond sponsor logo -->
            <div v-if="t.diamondSponsor" class="absolute top-3 right-3 flex items-center space-x-1.5 bg-black/50 backdrop-blur rounded-lg px-2 py-1 animate-fade-in">
              <img v-if="t.diamondSponsor.logoUrl" :src="t.diamondSponsor.logoUrl" class="h-5 w-auto rounded" />
              <span class="text-[10px] text-gray-300 font-medium">{{ t.diamondSponsor.name }}</span>
            </div>

            <!-- Countdown / Live -->
            <div class="absolute bottom-3 right-3">
              <div v-if="t.status === 'active'" class="flex items-center space-x-1.5 bg-red-500/80 backdrop-blur rounded-lg px-2.5 py-1 animate-live-pulse">
                <div class="w-2 h-2 bg-white rounded-full animate-ping-slow"></div>
                <span class="text-xs font-bold">LIVE</span>
              </div>
              <div v-else-if="t.status === 'registration' && t.registrationClose"
                class="bg-black/60 backdrop-blur rounded-lg px-2.5 py-1 text-xs text-gray-300 animate-fade-in">
                {{ countdown(t.registrationClose) }}
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="p-5">
            <h3 class="font-bold text-lg mb-1 group-hover:text-amber-300 transition-colors duration-300 line-clamp-2">
              {{ t.title }}
            </h3>
            <p v-if="t.description" class="text-sm text-gray-500 mb-4 line-clamp-2">{{ t.description }}</p>

            <!-- Stats row -->
            <div class="flex items-center justify-between text-xs mb-4">
              <div class="flex items-center space-x-3">
                <span class="text-gray-400">
                  <span class="text-white font-bold">{{ t.roundCount }}</span> round{{ t.roundCount > 1 ? 's' : '' }}
                </span>
                <span class="text-gray-400">
                  <span class="text-white font-bold">{{ t.participantCount }}</span> inscrit{{ t.participantCount > 1 ? 's' : '' }}
                </span>
              </div>
              <div v-if="t.totalPrize > 0" class="text-green-400 font-bold">
                {{ formatMoney(t.totalPrize) }} {{ t.currency }}
              </div>
            </div>

            <!-- Spots + Price -->
            <div class="flex items-center justify-between">
              <div>
                <span v-if="t.spotsLeft !== null && t.spotsLeft <= 20" class="text-red-400 text-xs font-bold animate-pulse">
                  {{ t.spotsLeft === 0 ? 'COMPLET' : `${t.spotsLeft} place${t.spotsLeft > 1 ? 's' : ''}` }}
                </span>
                <span v-else-if="t.spotsLeft === null && t.status === 'registration'" class="text-gray-500 text-xs">
                  Places illimitees
                </span>
              </div>
              <div class="px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-300 group-hover:scale-110"
                :class="t.registrationFee > 0
                  ? 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30'
                  : 'bg-white/10 text-gray-400'">
                {{ t.registrationFee > 0 ? `${t.registrationFee} ${t.currency}` : 'Gratuit' }}
              </div>
            </div>
          </div>
        </div>

      </TransitionGroup>
    </div>

    <!-- Registration Modal -->
    <Transition name="modal">
      <RegistrationModal
        v-if="selectedTournament"
        :tournament="selectedTournament"
        @close="selectedTournament = null" />
    </Transition>

    <!-- Footer -->
    <footer class="border-t border-white/10 bg-black/30 py-8">
      <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div class="text-sm text-gray-500">
          TEGS-Arena &mdash; Plateforme de concours academiques
        </div>
        <div class="flex items-center space-x-6">
          <NuxtLink to="/docs" class="text-sm text-gray-400 hover:text-white font-medium transition-colors">
            Centre d'Aide
          </NuxtLink>
          <NuxtLink to="/login" class="text-sm text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Connexion Administrateur
          </NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import RegistrationModal from '~/components/tournament/RegistrationModal.vue';

const config = useRuntimeConfig();
const baseURL = config.public.apiBase as string;

const loading = ref(true);
const search = ref('');
const activeTab = ref('all');
const tournaments = ref<any[]>([]);
const selectedTournament = ref<any>(null);

const tabs = computed(() => [
  { key: 'all', label: 'Tous', count: tournaments.value.length },
  { key: 'registration', label: 'Inscriptions', count: tournaments.value.filter(t => t.status === 'registration').length },
  { key: 'active', label: 'Live', count: tournaments.value.filter(t => t.status === 'active').length },
  { key: 'completed', label: 'Termines', count: tournaments.value.filter(t => t.status === 'completed').length },
]);

const filteredTournaments = computed(() => {
  let list = tournaments.value;
  if (activeTab.value !== 'all') {
    list = list.filter(t => t.status === activeTab.value);
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(t => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }
  return list;
});

const stats = computed(() => {
  const live = tournaments.value.filter(t => t.status === 'active').length;
  const registration = tournaments.value.filter(t => t.status === 'registration').length;
  const totalParticipants = tournaments.value.reduce((s, t) => s + t.participantCount, 0);
  const totalPrize = tournaments.value
    .filter(t => ['registration', 'active'].includes(t.status))
    .reduce((s, t) => s + (t.totalPrize || 0), 0);
  return { live, registration, totalParticipants, totalPrize };
});

function statusBadge(status: string) {
  return {
    registration: 'bg-blue-500/80 text-white',
    active: 'bg-red-500/80 text-white',
    completed: 'bg-gray-500/80 text-gray-200',
  }[status] || 'bg-gray-500/80 text-gray-200';
}

function statusLabel(status: string) {
  return {
    registration: 'Inscriptions',
    active: 'En Cours',
    completed: 'Termine',
  }[status] || status;
}

function formatMoney(n: number) {
  return n.toLocaleString('fr-HT');
}

function countdown(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Ferme';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}j ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function openTournament(t: any) {
  if (t.status === 'registration') {
    selectedTournament.value = t;
  } else {
    navigateTo(`/tournament/${t.shareToken}`);
  }
}

onMounted(async () => {
  try {
    const res = await $fetch<any>(`${baseURL}/tournaments/public/list`);
    tournaments.value = res.tournaments || [];
  } catch {
    tournaments.value = [];
  } finally {
    loading.value = false;
  }
});

useHead({
  title: 'TEGS-Arena — Concours Nationaux',
  meta: [
    { name: 'description', content: 'Participez aux competitions academiques nationales. Inscrivez-vous, testez vos connaissances et remportez des primes.' },
    { property: 'og:title', content: 'TEGS-Arena — Concours Nationaux' },
    { property: 'og:description', content: 'Participez aux competitions academiques nationales.' },
    { property: 'og:type', content: 'website' },
  ],
});
</script>

<style scoped>
/* ========== Keyframes ========== */

@keyframes fade-down {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% center; }
  50% { background-position: 200% center; }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-15px); }
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

@keyframes glow-pulse-delayed {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.15); }
}

@keyframes wave {
  0% { transform: translateX(0); }
  50% { transform: translateX(-2%); }
  100% { transform: translateX(0); }
}

@keyframes live-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(239, 68, 68, 0.2); }
}

@keyframes ping-slow {
  0% { transform: scale(1); opacity: 1; }
  75%, 100% { transform: scale(2); opacity: 0; }
}

@keyframes particle-drift {
  0% { transform: translate(0, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) rotate(360deg); opacity: 0; }
}

@keyframes stat-pop {
  from { opacity: 0; transform: translateY(10px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes card-appear {
  from { opacity: 0; transform: translateY(40px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ========== Animation classes ========== */

.animate-fade-down {
  animation: fade-down 0.8s ease-out both;
}

.animate-fade-up {
  animation: fade-up 0.8s ease-out 0.2s both;
}

.animate-fade-up-delayed {
  animation: fade-up 0.8s ease-out 0.4s both;
}

.animate-fade-up-delayed-2 {
  animation: fade-up 0.8s ease-out 0.6s both;
}

.animate-gradient-shift {
  animation: gradient-shift 6s ease-in-out infinite;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-glow-pulse {
  animation: glow-pulse 4s ease-in-out infinite;
}

.animate-glow-pulse-delayed {
  animation: glow-pulse-delayed 5s ease-in-out 1s infinite;
}

.animate-wave {
  animation: wave 8s ease-in-out infinite;
}

.animate-wave-slow {
  animation: wave 12s ease-in-out 2s infinite;
}

.animate-live-pulse {
  animation: live-pulse 2s ease-in-out infinite;
}

.animate-ping-slow {
  animation: ping-slow 1.5s ease-out infinite;
}

.animate-fade-in {
  animation: fade-up 0.5s ease-out both;
}

/* ========== Stat items ========== */

.stat-item {
  animation: stat-pop 0.6s ease-out both;
  animation-delay: var(--delay);
}

/* ========== Card staggered entry ========== */

.card-enter {
  animation: card-appear 0.6s ease-out both;
}

/* ========== Particles ========== */

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(251, 191, 36, 0.4);
  border-radius: 50%;
  animation: particle-drift linear infinite;
}

.particle-1 {
  top: 20%; left: 10%;
  --tx: 100px; --ty: -200px;
  animation-duration: 12s;
}

.particle-2 {
  top: 60%; left: 80%;
  --tx: -150px; --ty: -180px;
  animation-duration: 15s;
  animation-delay: 2s;
  width: 3px; height: 3px;
  background: rgba(251, 146, 60, 0.3);
}

.particle-3 {
  top: 40%; left: 50%;
  --tx: 80px; --ty: -250px;
  animation-duration: 18s;
  animation-delay: 5s;
  width: 5px; height: 5px;
  background: rgba(251, 191, 36, 0.2);
}

.particle-4 {
  top: 70%; left: 25%;
  --tx: 120px; --ty: -150px;
  animation-duration: 14s;
  animation-delay: 3s;
  width: 3px; height: 3px;
  background: rgba(251, 146, 60, 0.25);
}

.particle-5 {
  top: 30%; left: 70%;
  --tx: -80px; --ty: -220px;
  animation-duration: 16s;
  animation-delay: 7s;
  width: 4px; height: 4px;
  background: rgba(251, 191, 36, 0.3);
}

/* ========== Grid background ========== */

.bg-grid {
  background-image:
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* ========== Card list transitions ========== */

.card-list-enter-active {
  transition: all 0.5s ease-out;
}

.card-list-leave-active {
  transition: all 0.3s ease-in;
}

.card-list-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.95);
}

.card-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.card-list-move {
  transition: transform 0.4s ease;
}

/* ========== Modal transition ========== */

.modal-enter-active {
  transition: all 0.3s ease-out;
}

.modal-leave-active {
  transition: all 0.2s ease-in;
}

.modal-enter-from {
  opacity: 0;
}

.modal-leave-to {
  opacity: 0;
}

.modal-enter-from :deep(.relative) {
  transform: scale(0.9) translateY(20px);
}

.modal-leave-to :deep(.relative) {
  transform: scale(0.95);
}
</style>
