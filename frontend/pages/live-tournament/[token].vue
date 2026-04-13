<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white overflow-hidden">
    <!-- Connection status -->
    <div v-if="!ts.connected.value" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-16 h-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-400">Connexion a l'arene...</p>
      </div>
    </div>

    <template v-else>
      <!-- Header bar -->
      <header class="bg-black/30 backdrop-blur-md border-b border-white/10 px-6 py-3">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-lg font-black">T</span>
            </div>
            <div>
              <h1 class="text-lg font-extrabold">{{ ts.tournament.value?.title || 'Tournoi' }}</h1>
              <div class="flex items-center space-x-3 text-xs text-gray-400">
                <span>{{ ts.participantCount.value }} participants</span>
                <span class="w-1 h-1 rounded-full bg-gray-600"></span>
                <span v-if="activeRound">{{ activeRound.label }}</span>
                <span v-else-if="ts.tournament.value?.status === 'completed'" class="text-green-400 font-bold">TERMINE</span>
              </div>
            </div>
          </div>

          <!-- Status badge -->
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <div class="w-2 h-2 rounded-full animate-pulse"
                :class="ts.tournament.value?.status === 'active' ? 'bg-red-500' : 'bg-green-500'"></div>
              <span class="text-xs font-bold uppercase text-gray-400">
                {{ ts.tournament.value?.status === 'active' ? 'LIVE' : statusLabel }}
              </span>
            </div>
            <div class="px-3 py-1 bg-white/10 rounded-full text-xs font-medium">
              Round {{ (ts.tournament.value?.currentRound || 0) + 1 }} / {{ ts.tournament.value?.rounds?.length || 0 }}
            </div>
          </div>
        </div>
      </header>

      <!-- Main content -->
      <main class="max-w-7xl mx-auto px-6 py-6">

        <!-- Breaking news ticker -->
        <div v-if="ts.breakingNews.value.length > 0"
          class="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 mb-6 overflow-hidden">
          <div class="flex items-center space-x-3">
            <span class="text-amber-400 font-black text-xs uppercase shrink-0">FLASH</span>
            <div class="flex-1 overflow-hidden">
              <TransitionGroup name="news" tag="div">
                <div :key="ts.breakingNews.value[0]?.type + ts.breakingNews.value[0]?.round"
                  class="text-sm text-amber-200 truncate">
                  <template v-if="ts.breakingNews.value[0]?.type === 'round_complete'">
                    {{ ts.breakingNews.value[0].round }} termine — {{ ts.breakingNews.value[0].qualifiedCount }} qualifies,
                    {{ ts.breakingNews.value[0].eliminatedCount }} elimines.
                    Leader: {{ ts.breakingNews.value[0].leader?.name }}
                  </template>
                </div>
              </TransitionGroup>
            </div>
          </div>
        </div>

        <!-- Tournament Tree -->
        <div class="mb-8">
          <h2 class="text-sm font-bold text-gray-400 uppercase mb-4">Arbre de progression</h2>
          <TournamentTree
            :bracket="ts.bracket.value"
            :podium="ts.podium.value"
            :dark="true"
          />
        </div>

        <!-- Round advance animation -->
        <Transition name="advance">
          <div v-if="ts.lastAdvance.value && showAdvance"
            class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
            @click="showAdvance = false">
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-full mx-4 border border-white/10 shadow-2xl"
              @click.stop>
              <div class="text-center mb-6">
                <div class="text-4xl mb-3">&#9989;</div>
                <h3 class="text-xl font-extrabold">{{ ts.lastAdvance.value.label }}</h3>
                <p class="text-gray-400 text-sm mt-1">Resultats de la promotion</p>
              </div>

              <!-- Qualified -->
              <div class="mb-4">
                <div class="text-xs font-bold text-green-400 uppercase mb-2">
                  Qualifies ({{ ts.lastAdvance.value.qualified.length }})
                </div>
                <div class="space-y-1 max-h-32 overflow-y-auto">
                  <div v-for="q in ts.lastAdvance.value.qualified" :key="q.name"
                    class="flex items-center justify-between bg-green-500/10 rounded-lg px-3 py-2 text-sm">
                    <span class="font-medium">{{ q.rank }}. {{ q.name }}</span>
                    <span class="text-green-400 font-bold">{{ q.percentage.toFixed(1) }}%</span>
                  </div>
                </div>
              </div>

              <!-- Eliminated -->
              <div v-if="ts.lastAdvance.value.eliminated.length > 0" class="mb-4">
                <div class="text-xs font-bold text-red-400 uppercase mb-2">
                  Elimines ({{ ts.lastAdvance.value.eliminated.length }})
                </div>
                <div class="space-y-1 max-h-24 overflow-y-auto">
                  <div v-for="e in ts.lastAdvance.value.eliminated" :key="e.name"
                    class="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2 text-sm opacity-70">
                    <span>{{ e.name }}</span>
                    <span class="text-red-400">{{ e.percentage.toFixed(1) }}%</span>
                  </div>
                </div>
              </div>

              <!-- Finished -->
              <div v-if="ts.lastAdvance.value.isFinished" class="text-center mt-4 p-3 bg-amber-500/20 rounded-xl">
                <span class="text-amber-300 font-bold">Le tournoi est termine !</span>
              </div>

              <button @click="showAdvance = false"
                class="w-full mt-4 bg-white/10 hover:bg-white/20 rounded-xl py-3 text-sm font-medium transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </Transition>

        <!-- Podium reveal (final) -->
        <Transition name="podium">
          <div v-if="ts.tournamentFinished.value && showPodium"
            class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
            <div class="text-center max-w-lg mx-4">
              <div class="text-6xl mb-4">&#127942;</div>
              <h2 class="text-3xl font-extrabold mb-2">{{ ts.tournamentFinished.value.tournamentTitle }}</h2>
              <p class="text-gray-400 mb-8">Classement Final</p>

              <div class="flex items-end justify-center space-x-8 mb-8">
                <!-- 2nd -->
                <div v-if="ts.tournamentFinished.value.podium[1]" class="text-center animate-slide-up" style="animation-delay: 0.3s">
                  <div class="w-20 h-20 bg-gray-500/30 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-gray-400/30">
                    <span class="text-3xl font-black text-gray-300">2</span>
                  </div>
                  <div class="font-bold text-lg">{{ ts.tournamentFinished.value.podium[1].name }}</div>
                  <div v-if="ts.tournamentFinished.value.podium[1].prize" class="text-green-400 font-bold mt-1">
                    {{ ts.tournamentFinished.value.podium[1].prize.amount }} {{ ts.tournamentFinished.value.podium[1].prize.currency }}
                  </div>
                </div>
                <!-- 1st -->
                <div v-if="ts.tournamentFinished.value.podium[0]" class="text-center -mb-4 animate-slide-up">
                  <div class="w-28 h-28 bg-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-yellow-400/50 shadow-xl shadow-yellow-500/20">
                    <span class="text-5xl font-black text-yellow-300">1</span>
                  </div>
                  <div class="font-extrabold text-2xl">{{ ts.tournamentFinished.value.podium[0].name }}</div>
                  <div v-if="ts.tournamentFinished.value.podium[0].prize" class="text-green-400 font-bold text-lg mt-1">
                    {{ ts.tournamentFinished.value.podium[0].prize.amount }} {{ ts.tournamentFinished.value.podium[0].prize.currency }}
                  </div>
                </div>
                <!-- 3rd -->
                <div v-if="ts.tournamentFinished.value.podium[2]" class="text-center animate-slide-up" style="animation-delay: 0.6s">
                  <div class="w-16 h-16 bg-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-orange-400/30">
                    <span class="text-2xl font-black text-orange-300">3</span>
                  </div>
                  <div class="font-bold text-lg">{{ ts.tournamentFinished.value.podium[2].name }}</div>
                  <div v-if="ts.tournamentFinished.value.podium[2].prize" class="text-green-400 font-bold mt-1">
                    {{ ts.tournamentFinished.value.podium[2].prize.amount }} {{ ts.tournamentFinished.value.podium[2].prize.currency }}
                  </div>
                </div>
              </div>

              <button @click="showPodium = false"
                class="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-8 py-3 rounded-xl font-bold hover:bg-amber-500/30 transition-colors">
                Voir le bracket
              </button>
            </div>
          </div>
        </Transition>
      </main>
    </template>
  </div>
</template>

<script setup lang="ts">
import TournamentTree from '~/components/tournament/TournamentTree.vue';

const route = useRoute();
const shareToken = route.params.token as string;

const ts = useTournamentSocket();
const showAdvance = ref(false);
const showPodium = ref(false);

const activeRound = computed(() => {
  if (!ts.tournament.value) return null;
  return ts.tournament.value.rounds.find((r) => r.status === 'active') || null;
});

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    draft: 'BIENTOT',
    registration: 'INSCRIPTIONS',
    active: 'EN COURS',
    completed: 'TERMINE',
  };
  return map[ts.tournament.value?.status || ''] || '';
});

// Watch for advance to show overlay
watch(() => ts.lastAdvance.value, (val) => {
  if (val) showAdvance.value = true;
});

// Watch for podium
watch(() => ts.tournamentFinished.value, (val) => {
  if (val) showPodium.value = true;
});

onMounted(() => {
  ts.connectSpectator(shareToken);
});
</script>

<style scoped>
.advance-enter-active, .advance-leave-active {
  transition: opacity 0.3s ease;
}
.advance-enter-from, .advance-leave-to {
  opacity: 0;
}

.podium-enter-active {
  transition: opacity 0.5s ease;
}
.podium-enter-from {
  opacity: 0;
}
.podium-leave-active {
  transition: opacity 0.3s ease;
}
.podium-leave-to {
  opacity: 0;
}

.news-enter-active {
  transition: all 0.3s ease;
}
.news-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

@keyframes slide-up {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.6s ease forwards;
}
</style>
