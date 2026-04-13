<template>
  <div class="min-h-screen text-white overflow-hidden"
    :class="phase === 'lockdown' ? 'bg-[#0a0f1a]' : 'bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]'">

    <!-- ============================================ -->
    <!-- PHASE 1: LOBBY (en attente du round) -->
    <!-- ============================================ -->
    <template v-if="phase === 'lobby'">
      <div class="flex flex-col items-center justify-center min-h-screen px-6">
        <div class="text-6xl mb-6 animate-pulse">&#9876;</div>
        <h1 class="text-2xl font-extrabold mb-2 text-center">War Room</h1>
        <p class="text-gray-400 text-center mb-8">{{ tournamentTitle }}</p>

        <!-- Participant info -->
        <div class="bg-white/5 border border-white/10 rounded-2xl p-5 w-full max-w-sm mb-8">
          <div class="text-center mb-4">
            <div class="text-sm text-gray-400">Votre ticket</div>
            <div class="text-xl font-mono font-black text-amber-400 mt-1">{{ competitionToken }}</div>
          </div>
          <div class="text-center text-sm text-gray-400">
            Statut: <span class="font-bold" :class="{
              'text-blue-400': participantStatus === 'registered',
              'text-green-400': participantStatus === 'qualified',
              'text-red-400': participantStatus === 'eliminated',
            }">{{ participantStatus }}</span>
          </div>
        </div>

        <!-- Round info -->
        <div v-if="currentRound" class="bg-white/5 border border-white/10 rounded-2xl p-5 w-full max-w-sm mb-6">
          <div class="text-center">
            <div class="text-xs text-gray-500 uppercase">Prochain round</div>
            <div class="text-lg font-bold mt-1">{{ currentRound.label }}</div>
            <div class="text-sm text-gray-400 mt-1">
              Top {{ currentRound.promoteTopX }} qualifies
            </div>
          </div>
        </div>

        <!-- Waiting animation -->
        <div class="flex items-center space-x-2 text-gray-500 text-sm">
          <div class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
          <div class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
          <div class="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
          <span class="ml-2">En attente du demarrage...</span>
        </div>
      </div>
    </template>

    <!-- ============================================ -->
    <!-- PHASE 2: COUNTDOWN (round va commencer) -->
    <!-- ============================================ -->
    <template v-if="phase === 'countdown'">
      <div class="flex flex-col items-center justify-center min-h-screen px-6">
        <div class="text-sm text-amber-400 uppercase font-bold mb-4 tracking-widest">{{ currentRound?.label }}</div>

        <!-- Big countdown -->
        <div class="relative w-48 h-48 mb-8">
          <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="45" stroke-width="3" stroke="rgba(245,158,11,0.2)" fill="none" />
            <circle cx="50" cy="50" r="45" stroke-width="4" stroke="#f59e0b"
              fill="none" stroke-linecap="round"
              :stroke-dasharray="283"
              :stroke-dashoffset="283 - (283 * countdownValue / countdownMax)"
              class="transition-all duration-1000" />
          </svg>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-5xl font-black text-amber-400">{{ countdownValue }}</span>
          </div>
        </div>

        <p class="text-gray-400 text-lg font-medium animate-pulse">Preparez-vous...</p>

        <!-- Camera check reminder -->
        <div class="mt-8 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-sm">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">&#128247;</span>
            <div class="text-sm">
              <div class="font-bold text-amber-300">Camera requise</div>
              <div class="text-gray-400 text-xs">Assurez-vous que votre camera est activee pour la surveillance</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============================================ -->
    <!-- PHASE 3: LOCKDOWN (examen en cours) -->
    <!-- ============================================ -->
    <template v-if="phase === 'lockdown'">
      <!-- Minimal header -->
      <div class="bg-red-900/30 border-b border-red-500/20 px-4 py-2 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span class="text-xs font-bold text-red-400 uppercase">Lockdown actif</span>
        </div>
        <span class="text-xs text-gray-500 font-mono">{{ currentRound?.label }}</span>
      </div>

      <!-- Exam content area -->
      <div class="flex-1 flex items-center justify-center px-6 py-12">
        <div class="text-center max-w-sm">
          <div class="text-4xl mb-4">&#128274;</div>
          <h2 class="text-xl font-bold mb-2">Examen en cours</h2>
          <p class="text-gray-400 text-sm mb-6">
            Vous etes en mode lockdown. L'application est verrouillee jusqu'a la fin du round.
          </p>

          <!-- If module is linked, show link to take the exam -->
          <a v-if="currentRound?.module_id"
            :href="`/share/${moduleShareToken}`"
            class="block bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all mb-4">
            Acceder a l'epreuve
          </a>

          <div class="bg-white/5 rounded-xl p-4 text-left space-y-2 text-sm">
            <div class="flex items-center space-x-2">
              <span class="text-red-400">&#9888;</span>
              <span class="text-gray-400">Ne quittez pas l'application</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-red-400">&#9888;</span>
              <span class="text-gray-400">La camera surveille votre session</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="text-red-400">&#9888;</span>
              <span class="text-gray-400">Toute sortie sera signalee</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ============================================ -->
    <!-- PHASE 4: RESULTS (round terminé) -->
    <!-- ============================================ -->
    <template v-if="phase === 'results'">
      <div class="flex flex-col items-center justify-center min-h-screen px-6">
        <div class="text-6xl mb-6">
          {{ resultQualified ? '&#127881;' : '&#128546;' }}
        </div>
        <h1 class="text-2xl font-extrabold mb-2">
          {{ resultQualified ? 'Qualifie(e) !' : 'Elimine(e)' }}
        </h1>
        <p class="text-gray-400 text-center mb-6">
          {{ resultQualified
            ? `Vous passez au round suivant ! Rang: ${resultRank}`
            : 'Merci pour votre participation. Bonne chance pour la prochaine fois !'
          }}
        </p>

        <div v-if="resultPercentage !== null" class="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm text-center mb-6">
          <div class="text-3xl font-black" :class="resultQualified ? 'text-green-400' : 'text-red-400'">
            {{ resultPercentage.toFixed(1) }}%
          </div>
          <div class="text-sm text-gray-400 mt-1">Votre score</div>
        </div>

        <NuxtLink to="/mobile"
          class="bg-white/10 text-white px-8 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">
          Retour a l'accueil
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const tournamentId = route.params.id as string;
const native = useNativeBridge();
const ts = useTournamentSocket();

const phase = ref<'lobby' | 'countdown' | 'lockdown' | 'results'>('lobby');
const tournamentTitle = ref('');
const competitionToken = ref('');
const participantStatus = ref('registered');
const currentRound = ref<any>(null);
const moduleShareToken = ref('');
const countdownValue = ref(10);
const countdownMax = ref(10);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

// Results
const resultQualified = ref(false);
const resultRank = ref(0);
const resultPercentage = ref<number | null>(null);

const config = useRuntimeConfig();
const baseURL = config.public.apiBase as string;

onMounted(async () => {
  // Setup native lockdown
  native.setStatusBarDark();

  // Get tournament info from token in query or from ID
  const token = route.query.token as string;
  if (token) {
    competitionToken.value = token;
  }

  // Connect to tournament socket
  const session = useCookie<{ token: string } | null>('__session').value;
  const authToken = session?.token || useCookie('auth_token').value;

  if (authToken) {
    ts.connectAdmin(tournamentId, authToken as string);
  }

  // Watch for round started
  watch(() => ts.roundStarted.value, (data) => {
    if (data) {
      currentRound.value = data.round;
      startCountdown();
    }
  });

  // Watch for round advanced (results)
  watch(() => ts.lastAdvance.value, async (data) => {
    if (data) {
      // Exit lockdown
      await native.exitLockdown();
      phase.value = 'results';

      // Check if we're qualified
      const myResult = data.qualified.find((q: any) =>
        q.name?.toLowerCase().includes(competitionToken.value.toLowerCase())
      );
      if (myResult) {
        resultQualified.value = true;
        resultRank.value = myResult.rank;
        resultPercentage.value = myResult.percentage;
        native.vibrate('heavy');
      } else {
        resultQualified.value = false;
        const elim = data.eliminated.find((e: any) =>
          e.name?.toLowerCase().includes(competitionToken.value.toLowerCase())
        );
        resultPercentage.value = elim?.percentage || null;
        native.vibrateAlert();
      }
    }
  });

  // Load tournament state
  watch(() => ts.tournament.value, (t) => {
    if (t) {
      tournamentTitle.value = t.title;
      const activeRound = t.rounds.find((r: any) => r.status === 'active');
      if (activeRound) {
        currentRound.value = activeRound;
        if (phase.value === 'lobby') {
          startCountdown();
        }
      } else {
        currentRound.value = t.rounds[t.currentRound] || null;
      }
    }
  });
});

function startCountdown() {
  phase.value = 'countdown';
  countdownValue.value = 10;
  countdownMax.value = 10;

  countdownTimer = setInterval(() => {
    countdownValue.value--;
    if (countdownValue.value <= 0) {
      clearInterval(countdownTimer!);
      enterLockdown();
    }
  }, 1000);
}

async function enterLockdown() {
  phase.value = 'lockdown';
  await native.enterLockdown();
  native.vibrate('heavy');
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer);
  native.exitLockdown();
});
</script>
