<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">

    <!-- Hero -->
    <header class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10"></div>
      <div class="max-w-6xl mx-auto px-4 py-16 md:py-24 relative">
        <div class="text-center">
          <div class="inline-flex items-center px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300 mb-6">
            TEGS-ARENA
          </div>
          <h1 class="text-4xl md:text-6xl font-black mb-4 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent">
            Concours Nationaux
          </h1>
          <p class="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
            Participez aux competitions academiques, testez vos connaissances et remportez des primes.
          </p>

          <!-- Search -->
          <div class="max-w-md mx-auto relative">
            <input v-model="search" type="text" placeholder="Rechercher un concours..."
              class="w-full px-5 py-3 pl-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none" />
            <svg class="w-5 h-5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>
    </header>

    <!-- Stats bar -->
    <div class="border-y border-white/10 bg-white/5 backdrop-blur">
      <div class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-center space-x-8 md:space-x-16 text-center">
        <div>
          <div class="text-2xl font-black text-amber-400">{{ stats.live }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold">En Cours</div>
        </div>
        <div>
          <div class="text-2xl font-black text-blue-400">{{ stats.registration }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold">Inscriptions</div>
        </div>
        <div>
          <div class="text-2xl font-black text-green-400">{{ stats.totalParticipants }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold">Participants</div>
        </div>
        <div>
          <div class="text-2xl font-black text-orange-400">{{ stats.totalPrize > 0 ? formatMoney(stats.totalPrize) : '---' }}</div>
          <div class="text-[10px] uppercase text-gray-500 font-bold">Primes HTG</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="max-w-6xl mx-auto px-4 pt-8">
      <div class="flex items-center space-x-2 mb-6">
        <button v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          class="px-4 py-2 rounded-lg text-sm font-bold transition-all"
          :class="activeTab === tab.key
            ? 'bg-amber-500 text-black'
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'">
          {{ tab.label }}
          <span class="ml-1.5 text-xs opacity-70">({{ tab.count }})</span>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredTournaments.length === 0" class="text-center py-20">
      <div class="text-5xl mb-4 opacity-30">&#127942;</div>
      <h2 class="text-xl font-bold text-gray-500">Aucun concours disponible</h2>
      <p class="text-gray-600 text-sm mt-2">Revenez bientot pour de nouvelles competitions.</p>
    </div>

    <!-- Grid -->
    <div v-else class="max-w-6xl mx-auto px-4 pb-16">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <div v-for="t in filteredTournaments" :key="t._id"
          class="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-amber-500/40 hover:bg-white/[0.07] transition-all cursor-pointer"
          @click="openTournament(t)">

          <!-- Cover -->
          <div class="relative h-40 bg-gradient-to-br from-amber-900/40 to-slate-800 overflow-hidden">
            <img v-if="t.coverImage" :src="t.coverImage" :alt="t.title" class="w-full h-full object-cover opacity-70 group-hover:opacity-90 transition" />
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>

            <!-- Status badge -->
            <div class="absolute top-3 left-3">
              <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
                :class="statusBadge(t.status)">
                {{ statusLabel(t.status) }}
              </span>
            </div>

            <!-- Diamond sponsor logo -->
            <div v-if="t.diamondSponsor" class="absolute top-3 right-3 flex items-center space-x-1.5 bg-black/50 backdrop-blur rounded-lg px-2 py-1">
              <img v-if="t.diamondSponsor.logoUrl" :src="t.diamondSponsor.logoUrl" class="h-5 w-auto rounded" />
              <span class="text-[10px] text-gray-300 font-medium">{{ t.diamondSponsor.name }}</span>
            </div>

            <!-- Countdown / Live -->
            <div class="absolute bottom-3 right-3">
              <div v-if="t.status === 'active'" class="flex items-center space-x-1.5 bg-red-500/80 backdrop-blur rounded-lg px-2.5 py-1">
                <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span class="text-xs font-bold">LIVE</span>
              </div>
              <div v-else-if="t.status === 'registration' && t.registrationClose"
                class="bg-black/60 backdrop-blur rounded-lg px-2.5 py-1 text-xs text-gray-300">
                {{ countdown(t.registrationClose) }}
              </div>
            </div>
          </div>

          <!-- Body -->
          <div class="p-5">
            <h3 class="font-bold text-lg mb-1 group-hover:text-amber-300 transition line-clamp-2">
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
                <span v-if="t.spotsLeft !== null && t.spotsLeft <= 20" class="text-red-400 text-xs font-bold">
                  {{ t.spotsLeft === 0 ? 'COMPLET' : `${t.spotsLeft} place${t.spotsLeft > 1 ? 's' : ''}` }}
                </span>
                <span v-else-if="t.spotsLeft === null && t.status === 'registration'" class="text-gray-500 text-xs">
                  Places illimitees
                </span>
              </div>
              <div class="px-3 py-1.5 rounded-lg text-sm font-bold"
                :class="t.registrationFee > 0
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-white/10 text-gray-400'">
                {{ t.registrationFee > 0 ? `${t.registrationFee} ${t.currency}` : 'Gratuit' }}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Registration Modal -->
    <RegistrationModal
      v-if="selectedTournament"
      :tournament="selectedTournament"
      @close="selectedTournament = null" />

    <!-- Footer -->
    <footer class="border-t border-white/10 bg-black/30 py-8">
      <div class="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
        <div class="text-sm text-gray-500">
          TEGS-Arena &mdash; Plateforme de concours academiques
        </div>
        <NuxtLink to="/login" class="text-sm text-amber-400 hover:text-amber-300 font-medium">
          Connexion Administrateur
        </NuxtLink>
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
