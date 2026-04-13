<template>
  <div class="broadcast-mode w-screen h-screen bg-[#0a0f1a] text-white overflow-hidden relative">
    <!-- OBS Capture: full-screen clean feed -->

    <!-- Top bar (thin) -->
    <header class="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
            <span class="text-xs font-black">T</span>
          </div>
          <div>
            <div class="text-sm font-extrabold">{{ ts.tournament.value?.title || 'TEGS-Arena' }}</div>
            <div class="text-[10px] text-gray-400">{{ activeRoundLabel }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-bold text-red-400">LIVE</span>
          </div>
          <span class="text-xs text-gray-500">{{ ts.participantCount.value }} participants</span>
        </div>
      </div>
    </header>

    <!-- Main content: Bracket (center) -->
    <main class="absolute inset-0 flex items-center justify-center px-8 pt-16 pb-20">
      <div class="w-full max-w-6xl">
        <TournamentTree
          v-if="ts.bracket.value.length > 0"
          :bracket="ts.bracket.value"
          :podium="ts.podium.value"
          :dark="true"
        />
      </div>
    </main>

    <!-- Commentator name plate (configurable) -->
    <div v-if="commentator" class="absolute bottom-16 left-6 z-10">
      <div class="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 rounded-lg shadow-xl">
        <div class="text-xs font-bold uppercase tracking-wider">Commentateur</div>
        <div class="text-sm font-extrabold">{{ commentator }}</div>
      </div>
    </div>

    <!-- Sponsor ticker (bottom bar) -->
    <div class="absolute bottom-0 left-0 right-0 z-10 bg-black/90 border-t border-white/10">
      <div class="flex items-center h-12 px-4">
        <span class="text-[10px] text-amber-400 font-bold uppercase shrink-0 mr-4">PARTENAIRES</span>
        <div class="flex-1 overflow-hidden">
          <div class="flex items-center space-x-8 animate-ticker">
            <template v-for="(sponsor, i) in tickerSponsors" :key="i">
              <div class="flex items-center space-x-2 shrink-0">
                <img v-if="sponsor.logoUrl" :src="sponsor.logoUrl" class="h-5 w-auto" />
                <span class="text-xs text-gray-300 font-medium whitespace-nowrap">{{ sponsor.name }}</span>
                <span v-if="sponsor.slogan" class="text-[10px] text-gray-500 whitespace-nowrap">{{ sponsor.slogan }}</span>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Breaking news overlay -->
    <Transition name="news-slide">
      <div v-if="latestNews" class="absolute top-16 left-1/2 -translate-x-1/2 z-20">
        <div class="bg-amber-500/90 text-black px-6 py-2 rounded-full font-bold text-sm shadow-xl animate-pulse">
          <template v-if="latestNews.type === 'round_complete'">
            {{ latestNews.round }} termine — {{ latestNews.qualifiedCount }} qualifies
          </template>
        </div>
      </div>
    </Transition>

    <!-- Podium overlay (final) -->
    <Transition name="podium-reveal">
      <div v-if="ts.tournamentFinished.value && showPodium"
        class="absolute inset-0 bg-black/90 z-30 flex items-center justify-center">
        <div class="text-center">
          <div class="text-7xl mb-6 animate-bounce-slow">&#127942;</div>
          <h1 class="text-4xl font-extrabold mb-4">{{ ts.tournamentFinished.value.tournamentTitle }}</h1>
          <div class="flex items-end justify-center space-x-10 mt-8">
            <!-- 2nd -->
            <div v-if="ts.tournamentFinished.value.podium[1]" class="text-center animate-slide-up" style="animation-delay: 0.4s">
              <div class="w-20 h-20 bg-gray-500/30 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-gray-400/30">
                <span class="text-3xl font-black text-gray-300">2</span>
              </div>
              <div class="text-lg font-bold">{{ ts.tournamentFinished.value.podium[1].name }}</div>
              <div v-if="ts.tournamentFinished.value.podium[1].prize" class="text-green-400 font-bold mt-1">
                {{ ts.tournamentFinished.value.podium[1].prize.amount?.toLocaleString() }} {{ ts.tournamentFinished.value.podium[1].prize.currency }}
              </div>
            </div>
            <!-- 1st -->
            <div v-if="ts.tournamentFinished.value.podium[0]" class="text-center -mb-6 animate-slide-up">
              <div class="w-28 h-28 bg-yellow-500/30 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-yellow-400/50 shadow-2xl shadow-yellow-500/20">
                <span class="text-5xl font-black text-yellow-300">1</span>
              </div>
              <div class="text-2xl font-extrabold">{{ ts.tournamentFinished.value.podium[0].name }}</div>
              <div v-if="ts.tournamentFinished.value.podium[0].prize" class="text-green-400 font-bold text-xl mt-1">
                {{ ts.tournamentFinished.value.podium[0].prize.amount?.toLocaleString() }} {{ ts.tournamentFinished.value.podium[0].prize.currency }}
              </div>
            </div>
            <!-- 3rd -->
            <div v-if="ts.tournamentFinished.value.podium[2]" class="text-center animate-slide-up" style="animation-delay: 0.8s">
              <div class="w-16 h-16 bg-orange-500/30 rounded-full flex items-center justify-center mx-auto mb-3 ring-4 ring-orange-400/30">
                <span class="text-2xl font-black text-orange-300">3</span>
              </div>
              <div class="text-lg font-bold">{{ ts.tournamentFinished.value.podium[2].name }}</div>
              <div v-if="ts.tournamentFinished.value.podium[2].prize" class="text-green-400 font-bold mt-1">
                {{ ts.tournamentFinished.value.podium[2].prize.amount?.toLocaleString() }} {{ ts.tournamentFinished.value.podium[2].prize.currency }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- OBS instructions overlay (hidden by default, press 'I') -->
    <Transition name="fade">
      <div v-if="showOBSGuide" class="absolute inset-0 bg-black/95 z-40 flex items-center justify-center p-8" @click="showOBSGuide = false">
        <div class="max-w-lg bg-slate-800 rounded-2xl p-6 border border-white/10" @click.stop>
          <h2 class="text-lg font-bold mb-4">Configuration OBS Studio</h2>
          <ol class="space-y-3 text-sm text-gray-300">
            <li><span class="font-bold text-amber-400">1.</span> Ouvrir OBS Studio</li>
            <li><span class="font-bold text-amber-400">2.</span> Ajouter source &gt; "Navigateur" (Browser)</li>
            <li>
              <span class="font-bold text-amber-400">3.</span> URL:
              <code class="bg-black/50 px-2 py-0.5 rounded text-xs block mt-1 break-all">{{ currentUrl }}</code>
            </li>
            <li><span class="font-bold text-amber-400">4.</span> Résolution: 1920 x 1080 (Full HD)</li>
            <li><span class="font-bold text-amber-400">5.</span> FPS: 60</li>
            <li><span class="font-bold text-amber-400">6.</span> Dans "Paramètres &gt; Diffusion":
              <ul class="ml-4 mt-1 space-y-1 text-gray-400">
                <li>Facebook Live: Copier la clé de flux depuis facebook.com/live/producer</li>
                <li>YouTube: Copier depuis studio.youtube.com &gt; Go Live</li>
              </ul>
            </li>
            <li><span class="font-bold text-amber-400">7.</span> Cliquer "Commencer la diffusion"</li>
          </ol>
          <div class="mt-4 text-[10px] text-gray-500">Appuyez sur 'I' pour masquer ce guide</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import TournamentTree from '~/components/tournament/TournamentTree.vue';

const route = useRoute();
const shareToken = route.params.token as string;
const ts = useTournamentSocket();

const showPodium = ref(false);
const showOBSGuide = ref(false);
const sponsors = ref<any[]>([]);
const commentator = ref(route.query.commentator as string || '');

const currentUrl = computed(() => typeof window !== 'undefined' ? window.location.href : '');

const activeRoundLabel = computed(() => {
  const t = ts.tournament.value;
  if (!t) return '';
  const active = t.rounds.find((r: any) => r.status === 'active');
  if (active) return `${active.label} — En cours`;
  if (t.status === 'completed') return 'Termine';
  return `Round ${(t.currentRound || 0) + 1}`;
});

const latestNews = computed(() => ts.breakingNews.value[0] || null);

const tickerSponsors = computed(() => {
  if (sponsors.value.length <= 4) return [...sponsors.value, ...sponsors.value];
  return sponsors.value;
});

watch(() => ts.tournamentFinished.value, (val) => {
  if (val) showPodium.value = true;
});

// Keyboard shortcuts
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'i' || e.key === 'I') showOBSGuide.value = !showOBSGuide.value;
    if (e.key === 'p' || e.key === 'P') showPodium.value = !showPodium.value;
  });
}

onMounted(async () => {
  ts.connectSpectator(shareToken);

  watch(() => ts.tournament.value, async (t) => {
    if (t?._id && sponsors.value.length === 0) {
      try {
        const config = useRuntimeConfig();
        const data = await $fetch<any>(`${config.public.apiBase}/sponsors/public/${t._id}`);
        sponsors.value = (data.sponsors || []).filter((s: any) => s.showOnArena);
      } catch {}
    }
  }, { immediate: true });
});
</script>

<style scoped>
@keyframes ticker {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-ticker {
  animation: ticker 30s linear infinite;
}

@keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-bounce-slow {
  animation: bounce-slow 2s ease-in-out infinite;
}

@keyframes slide-up {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up {
  animation: slide-up 0.8s ease forwards;
}

.news-slide-enter-active { transition: all 0.5s ease; }
.news-slide-enter-from { transform: translate(-50%, -20px); opacity: 0; }
.news-slide-leave-active { transition: all 0.3s ease; }
.news-slide-leave-to { transform: translate(-50%, -20px); opacity: 0; }

.podium-reveal-enter-active { transition: opacity 1s ease; }
.podium-reveal-enter-from { opacity: 0; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 60 FPS optimization */
* { will-change: transform; }
.broadcast-mode { -webkit-font-smoothing: antialiased; }
</style>
