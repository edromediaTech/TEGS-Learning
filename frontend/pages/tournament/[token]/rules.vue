<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 text-white">

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="text-6xl mb-4 opacity-50">&#128274;</div>
        <h1 class="text-2xl font-bold mb-2">Tournoi introuvable</h1>
        <p class="text-gray-400">{{ error }}</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else-if="tournament" class="max-w-3xl mx-auto px-4 py-8">

      <!-- Back link -->
      <NuxtLink :to="`/tournament/${token}`"
        class="inline-flex items-center text-sm text-gray-400 hover:text-white mb-6 transition">
        &#8592; Retour au concours
      </NuxtLink>

      <!-- Title -->
      <div class="mb-8">
        <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-3"
          :class="statusClass">
          {{ statusText }}
        </div>
        <h1 class="text-3xl md:text-4xl font-extrabold mb-2">{{ tournament.title }}</h1>
        <p class="text-lg text-gray-400">Reglement et Modalites</p>
      </div>

      <!-- ================================ -->
      <!-- Section 1: Informations generales -->
      <!-- ================================ -->
      <section class="bg-white/5 backdrop-blur rounded-2xl p-6 mb-6">
        <h2 class="text-lg font-bold mb-4 flex items-center">
          <span class="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400 text-sm mr-3">1</span>
          Informations Generales
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div class="bg-white/5 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Titre du concours</div>
            <div class="font-bold">{{ tournament.title }}</div>
          </div>
          <div class="bg-white/5 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Statut</div>
            <div class="font-bold">{{ statusText }}</div>
          </div>
          <div class="bg-white/5 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Frais d'inscription</div>
            <div class="font-bold" :class="tournament.registrationFee > 0 ? 'text-green-400' : 'text-gray-300'">
              {{ tournament.registrationFee > 0 ? `${tournament.registrationFee} ${tournament.currency}` : 'Gratuit' }}
            </div>
          </div>
          <div class="bg-white/5 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Capacite maximale</div>
            <div class="font-bold">
              {{ tournament.maxParticipants > 0 ? `${tournament.maxParticipants} participants` : 'Illimite' }}
            </div>
          </div>
          <div v-if="tournament.registrationOpen" class="bg-white/5 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Ouverture inscriptions</div>
            <div class="font-bold">{{ formatDate(tournament.registrationOpen) }}</div>
          </div>
          <div v-if="tournament.registrationClose" class="bg-white/5 rounded-xl p-4">
            <div class="text-xs text-gray-500 mb-1">Cloture inscriptions</div>
            <div class="font-bold">{{ formatDate(tournament.registrationClose) }}</div>
          </div>
        </div>
        <p v-if="tournament.description" class="text-sm text-gray-400 mt-4 bg-white/5 rounded-xl p-4">
          {{ tournament.description }}
        </p>
      </section>

      <!-- ================================ -->
      <!-- Section 2: Pipeline eliminatoire -->
      <!-- ================================ -->
      <section class="bg-white/5 backdrop-blur rounded-2xl p-6 mb-6">
        <h2 class="text-lg font-bold mb-4 flex items-center">
          <span class="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 text-sm mr-3">2</span>
          Pipeline Eliminatoire — {{ tournament.rounds.length }} Round{{ tournament.rounds.length > 1 ? 's' : '' }}
        </h2>
        <div class="space-y-3">
          <div v-for="round in tournament.rounds" :key="round.order"
            class="flex items-center space-x-4 bg-white/5 rounded-xl p-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
              :class="{
                'bg-green-500/30 text-green-300': round.status === 'completed',
                'bg-amber-500/30 text-amber-300 animate-pulse': round.status === 'active',
                'bg-gray-500/20 text-gray-500': round.status === 'pending',
              }">
              {{ round.order }}
            </div>
            <div class="flex-1">
              <div class="font-bold">{{ round.label }}</div>
              <div class="text-xs text-gray-500">
                Les <span class="text-white font-bold">{{ round.promoteTopX }}</span> meilleurs sont qualifies pour le round suivant.
                Les autres sont elimines.
              </div>
            </div>
            <span class="text-xs font-bold shrink-0" :class="{
              'text-green-400': round.status === 'completed',
              'text-amber-400': round.status === 'active',
              'text-gray-600': round.status === 'pending',
            }">
              {{ { completed: 'TERMINE', active: 'EN COURS', pending: 'A VENIR' }[round.status] }}
            </span>
          </div>
        </div>
        <div class="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
          <span class="font-bold">Regle :</span> A chaque round, les candidats passent un examen en temps limite.
          Seuls les Top {{ tournament.rounds[0]?.promoteTopX || 'X' }} avancent.
          Le classement est base sur le score (%) puis le temps de completion.
        </div>
      </section>

      <!-- ================================ -->
      <!-- Section 3: Dotation des primes -->
      <!-- ================================ -->
      <section v-if="tournament.prizes && tournament.prizes.length > 0"
        class="bg-white/5 backdrop-blur rounded-2xl p-6 mb-6">
        <h2 class="text-lg font-bold mb-4 flex items-center">
          <span class="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400 text-sm mr-3">3</span>
          Dotation des Primes
        </h2>
        <div class="space-y-3">
          <div v-for="prize in tournament.prizes" :key="prize.rank"
            class="flex items-center space-x-4 bg-white/5 rounded-xl p-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
              :class="{
                'bg-yellow-500/30 text-yellow-300': prize.rank === 1,
                'bg-gray-400/30 text-gray-300': prize.rank === 2,
                'bg-orange-500/30 text-orange-300': prize.rank === 3,
                'bg-gray-500/20 text-gray-500': prize.rank > 3,
              }">
              {{ prize.rank === 1 ? '&#127942;' : prize.rank === 2 ? '&#129352;' : prize.rank === 3 ? '&#129353;' : prize.rank }}
            </div>
            <div class="flex-1 font-bold">{{ prize.label || `${prize.rank}e place` }}</div>
            <div class="text-lg font-black text-green-400">
              {{ prize.amount.toLocaleString('fr-HT') }} {{ prize.currency || tournament.currency }}
            </div>
          </div>
        </div>
        <div class="mt-4 bg-white/5 rounded-xl p-4 flex items-center justify-between">
          <span class="text-sm text-gray-400">Total des primes</span>
          <span class="text-xl font-black text-green-400">
            {{ totalPrize.toLocaleString('fr-HT') }} {{ tournament.currency }}
          </span>
        </div>
      </section>

      <!-- ================================ -->
      <!-- Section 4: Materiel requis -->
      <!-- ================================ -->
      <section class="bg-white/5 backdrop-blur rounded-2xl p-6 mb-6">
        <h2 class="text-lg font-bold mb-4 flex items-center">
          <span class="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center text-purple-400 text-sm mr-3">4</span>
          Materiel Requis
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="flex items-center space-x-3 bg-white/5 rounded-xl p-4">
            <span class="text-green-400 text-lg">&#9989;</span>
            <div>
              <div class="font-bold text-sm">Application TEGS-Arena</div>
              <div class="text-xs text-gray-500">Installee sur smartphone ou tablette</div>
            </div>
          </div>
          <div class="flex items-center space-x-3 bg-white/5 rounded-xl p-4">
            <span class="text-green-400 text-lg">&#9989;</span>
            <div>
              <div class="font-bold text-sm">Camera fonctionnelle</div>
              <div class="text-xs text-gray-500">Pour la surveillance (proctoring)</div>
            </div>
          </div>
          <div class="flex items-center space-x-3 bg-white/5 rounded-xl p-4">
            <span class="text-green-400 text-lg">&#9989;</span>
            <div>
              <div class="font-bold text-sm">Connexion Internet stable</div>
              <div class="text-xs text-gray-500">Wi-Fi ou donnees mobiles 4G+</div>
            </div>
          </div>
          <div class="flex items-center space-x-3 bg-white/5 rounded-xl p-4">
            <span class="text-green-400 text-lg">&#9989;</span>
            <div>
              <div class="font-bold text-sm">Badge QR (TKT-XXX)</div>
              <div class="text-xs text-gray-500">Recu apres inscription et paiement</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================================ -->
      <!-- Section 5: Modalites de paiement -->
      <!-- ================================ -->
      <section v-if="tournament.registrationFee > 0"
        class="bg-white/5 backdrop-blur rounded-2xl p-6 mb-6">
        <h2 class="text-lg font-bold mb-4 flex items-center">
          <span class="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center text-orange-400 text-sm mr-3">5</span>
          Modalites de Paiement
        </h2>
        <div class="space-y-3">
          <div class="flex items-center space-x-4 bg-[#e31837]/10 border border-[#e31837]/20 rounded-xl p-4">
            <div class="w-10 h-10 bg-[#e31837] rounded-lg flex items-center justify-center font-bold shrink-0">MC</div>
            <div>
              <div class="font-bold text-sm">MonCash (Digicel)</div>
              <div class="text-xs text-gray-500">Paiement mobile — confirmation instantanee</div>
            </div>
          </div>
          <div class="flex items-center space-x-4 bg-[#00a651]/10 border border-[#00a651]/20 rounded-xl p-4">
            <div class="w-10 h-10 bg-[#00a651] rounded-lg flex items-center justify-center font-bold shrink-0">NC</div>
            <div>
              <div class="font-bold text-sm">Natcash (Natcom)</div>
              <div class="text-xs text-gray-500">Paiement mobile — confirmation instantanee</div>
            </div>
          </div>
          <div class="flex items-center space-x-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div class="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center font-bold shrink-0 text-xs">CODE</div>
            <div>
              <div class="font-bold text-sm">Code de Parrainage (BOURSE-XXX)</div>
              <div class="text-xs text-gray-500">Si un sponsor a pris en charge vos frais</div>
            </div>
          </div>
        </div>
        <div class="mt-4 bg-white/5 rounded-xl p-4 text-center">
          <div class="text-xs text-gray-500 mb-1">Frais d'inscription</div>
          <div class="text-3xl font-black text-green-400">{{ tournament.registrationFee }} {{ tournament.currency }}</div>
        </div>
      </section>

      <!-- ================================ -->
      <!-- Section 6: Sponsors -->
      <!-- ================================ -->
      <section v-if="sponsors.length > 0" class="bg-white/5 backdrop-blur rounded-2xl p-6 mb-6">
        <h2 class="text-lg font-bold mb-4 flex items-center">
          <span class="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-400 text-sm mr-3">6</span>
          Partenaires Officiels
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div v-for="sponsor in sponsors" :key="sponsor._id"
            class="bg-white/5 rounded-xl p-4 text-center">
            <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" :alt="sponsor.name"
              class="h-12 w-auto mx-auto object-contain rounded mb-2" />
            <div v-else class="w-12 h-12 mx-auto rounded-lg flex items-center justify-center text-lg font-bold mb-2"
              :class="tierBg(sponsor.tier)">
              {{ sponsor.name.charAt(0) }}
            </div>
            <div class="text-sm font-bold">{{ sponsor.name }}</div>
            <div class="text-[10px] uppercase font-bold mt-1" :class="tierColor(sponsor.tier)">
              {{ sponsor.tier }}
            </div>
          </div>
        </div>
      </section>

      <!-- CTA -->
      <div class="text-center py-8">
        <NuxtLink :to="`/tournament/${token}`"
          class="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg">
          {{ tournament.registrationFee > 0 ? `S'inscrire — ${tournament.registrationFee} ${tournament.currency}` : "S'inscrire gratuitement" }}
          &#8594;
        </NuxtLink>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const token = route.params.token as string;
const baseURL = config.public.apiBase as string;

const loading = ref(true);
const error = ref('');
const tournament = ref<any>(null);
const sponsors = ref<any[]>([]);

const statusClass = computed(() => {
  const map: Record<string, string> = {
    draft: 'bg-gray-500/30 text-gray-300',
    registration: 'bg-blue-500/30 text-blue-300',
    active: 'bg-amber-500/30 text-amber-300',
    completed: 'bg-green-500/30 text-green-300',
  };
  return map[tournament.value?.status] || map.draft;
});

const statusText = computed(() => {
  const map: Record<string, string> = {
    draft: 'Bientot',
    registration: 'Inscriptions ouvertes',
    active: 'En cours',
    completed: 'Termine',
  };
  return map[tournament.value?.status] || '';
});

const totalPrize = computed(() => {
  return (tournament.value?.prizes || []).reduce((s: number, p: any) => s + (p.amount || 0), 0);
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function tierBg(tier: string) {
  const map: Record<string, string> = {
    diamond: 'bg-blue-500/30 text-blue-300',
    gold: 'bg-yellow-500/30 text-yellow-300',
    silver: 'bg-gray-400/30 text-gray-300',
    bronze: 'bg-orange-500/30 text-orange-300',
  };
  return map[tier] || map.bronze;
}

function tierColor(tier: string) {
  const map: Record<string, string> = {
    diamond: 'text-blue-400',
    gold: 'text-yellow-400',
    silver: 'text-gray-300',
    bronze: 'text-orange-400',
  };
  return map[tier] || 'text-gray-400';
}

onMounted(async () => {
  try {
    const [tournamentRes, sponsorsRes] = await Promise.all([
      $fetch<any>(`${baseURL}/tournaments/public/${token}`),
      $fetch<any>(`${baseURL}/sponsors/public/${token}`).catch(() => ({ sponsors: [] })),
    ]);
    tournament.value = tournamentRes.tournament;

    // Sponsors need tournament _id, not shareToken — fetch separately if first call failed
    if (sponsorsRes.sponsors?.length === 0 && tournamentRes.tournament?._id) {
      try {
        const sr = await $fetch<any>(`${baseURL}/sponsors/public/${tournamentRes.tournament._id}`);
        sponsors.value = sr.sponsors || [];
      } catch {
        sponsors.value = [];
      }
    } else {
      sponsors.value = sponsorsRes.sponsors || [];
    }
  } catch {
    error.value = "Ce tournoi n'existe pas ou n'est plus disponible.";
  } finally {
    loading.value = false;
  }
});

// SEO
useHead(() => ({
  title: tournament.value ? `${tournament.value.title} — Reglement | TEGS-Arena` : 'TEGS-Arena',
  meta: [
    { name: 'description', content: tournament.value ? `Reglement et modalites du concours ${tournament.value.title}. ${tournament.value.rounds?.length || 0} rounds eliminatoires.` : '' },
    { property: 'og:title', content: tournament.value ? `${tournament.value.title} — Reglement` : 'TEGS-Arena' },
    { property: 'og:description', content: tournament.value ? `${tournament.value.rounds?.length || 0} rounds, ${totalPrize.value > 0 ? totalPrize.value.toLocaleString('fr-HT') + ' HTG de primes' : 'Concours gratuit'}` : '' },
    { property: 'og:type', content: 'article' },
  ],
}));
</script>
