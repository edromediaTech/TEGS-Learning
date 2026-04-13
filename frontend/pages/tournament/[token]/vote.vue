<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-purple-900 text-white">
    <!-- Header -->
    <header class="bg-black/30 backdrop-blur-md border-b border-white/10 px-4 py-3 text-center">
      <h1 class="text-lg font-extrabold">{{ tournament?.title || 'Vote du Public' }}</h1>
      <p class="text-xs text-gray-400 mt-0.5">Soutenez votre candidat prefere</p>
    </header>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
    </div>

    <div v-else class="max-w-2xl mx-auto px-4 py-6">
      <!-- Total votes -->
      <div class="text-center mb-6">
        <div class="text-3xl font-black text-purple-400">{{ totalVotes.toLocaleString() }}</div>
        <div class="text-xs text-gray-400">votes au total</div>
      </div>

      <!-- Candidate list -->
      <div class="space-y-3">
        <div v-for="(c, i) in rankings" :key="c.participantId"
          class="bg-white/5 border border-white/10 rounded-2xl p-4 transition-all"
          :class="{ 'ring-2 ring-purple-500/50 bg-purple-500/10': justVoted === c.participantId }">
          <div class="flex items-center space-x-3">
            <!-- Rank -->
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="i === 0 ? 'bg-purple-500/30 text-purple-300' : 'bg-gray-700 text-gray-400'">
              {{ i + 1 }}
            </div>

            <!-- Flame for #1 -->
            <span v-if="i === 0 && c.votes > 0" class="text-xl animate-pulse shrink-0">&#128293;</span>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm truncate">{{ c.name }}</div>
              <div class="text-[10px] text-gray-500">{{ c.establishment || 'N/A' }}</div>
            </div>

            <!-- Vote count + bar -->
            <div class="w-24 shrink-0">
              <div class="text-right text-sm font-bold text-purple-400">{{ c.votes }}</div>
              <div class="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mt-1">
                <div class="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  :style="{ width: maxVotes > 0 ? Math.max(5, (c.votes / maxVotes) * 100) + '%' : '5%' }"></div>
              </div>
            </div>

            <!-- Vote button -->
            <button @click="vote(c.participantId, c.name)"
              :disabled="votingFor === c.participantId"
              class="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 shrink-0">
              {{ votingFor === c.participantId ? '...' : '&#10084; Voter' }}
            </button>
          </div>

          <!-- Share buttons (after voting) -->
          <Transition name="slide">
            <div v-if="justVoted === c.participantId" class="mt-3 flex items-center space-x-2 pt-2 border-t border-white/10">
              <span class="text-[10px] text-gray-500">Partager:</span>
              <a :href="facebookShareUrl(c.name)" target="_blank"
                class="bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-medium hover:bg-blue-600/30">
                Facebook
              </a>
              <a :href="whatsappShareUrl(c.name)" target="_blank"
                class="bg-green-600/20 text-green-400 px-3 py-1 rounded-lg text-[10px] font-medium hover:bg-green-600/30">
                WhatsApp
              </a>
              <button @click="copyShareLink(c.name)"
                class="bg-white/10 text-gray-300 px-3 py-1 rounded-lg text-[10px] font-medium hover:bg-white/20">
                {{ copied ? 'Copie !' : 'Copier' }}
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Vote feedback -->
      <Transition name="fade">
        <div v-if="voteMessage" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-purple-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-xl">
          {{ voteMessage }}
        </div>
      </Transition>

      <!-- Empty -->
      <div v-if="!loading && rankings.length === 0" class="text-center py-12 text-gray-500">
        Aucun candidat disponible pour le vote
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const shareToken = route.params.token as string;
const config = useRuntimeConfig();
const baseURL = config.public.apiBase as string;

const loading = ref(true);
const tournament = ref<any>(null);
const rankings = ref<any[]>([]);
const totalVotes = ref(0);
const votingFor = ref('');
const justVoted = ref('');
const voteMessage = ref('');
const copied = ref(false);

const maxVotes = computed(() => rankings.value.length > 0 ? rankings.value[0].votes : 0);

const pageUrl = computed(() => typeof window !== 'undefined' ? window.location.href : '');

onMounted(async () => {
  try {
    // Charger le tournoi
    const tData = await $fetch<any>(`${baseURL}/tournaments/public/${shareToken}`);
    tournament.value = tData.tournament;

    // Charger les participants pour le vote
    if (tournament.value?._id) {
      await loadRankings();
    }
  } catch {
    // Tournament not found
  } finally {
    loading.value = false;
  }
});

async function loadRankings() {
  try {
    const data = await $fetch<any>(`${baseURL}/votes/${tournament.value._id}/rankings`);
    totalVotes.value = data.totalVotes || 0;

    // Merger avec tous les participants (même ceux sans votes)
    const Participant = await $fetch<any>(`${baseURL}/tournaments/public/${shareToken}`);
    // On garde juste les rankings existants
    rankings.value = data.rankings || [];

    // Si pas assez de rankings, charger les participants
    if (rankings.value.length === 0) {
      // Pas de votes encore — afficher les participants du tournoi public
      // On utilise les infos du tournoi
    }
  } catch {
    rankings.value = [];
  }
}

async function vote(participantId: string, name: string) {
  votingFor.value = participantId;
  try {
    const data = await $fetch<any>(`${baseURL}/votes/${tournament.value._id}/${participantId}`, {
      method: 'POST',
    });
    justVoted.value = participantId;
    voteMessage.value = `Vote pour ${name} enregistre !`;
    setTimeout(() => { voteMessage.value = ''; }, 3000);
    await loadRankings();
  } catch (e: any) {
    const err = e.data || e.response?._data;
    if (err?.minutesLeft) {
      voteMessage.value = `Reessayez dans ${err.minutesLeft} min`;
    } else {
      voteMessage.value = err?.error || 'Erreur';
    }
    setTimeout(() => { voteMessage.value = ''; }, 3000);
  } finally {
    votingFor.value = '';
  }
}

function facebookShareUrl(name: string) {
  const text = `Je viens de voter pour ${name} sur TEGS-Arena ! Soutenez-le ici :`;
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl.value)}&quote=${encodeURIComponent(text)}`;
}

function whatsappShareUrl(name: string) {
  const text = `Je viens de voter pour ${name} sur TEGS-Arena ! Soutenez-le ici : ${pageUrl.value}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function copyShareLink(name: string) {
  const text = `Je viens de voter pour ${name} sur TEGS-Arena ! ${pageUrl.value}`;
  navigator.clipboard.writeText(text);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
</script>

<style scoped>
.slide-enter-active { transition: all 0.3s ease; }
.slide-enter-from { height: 0; opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
