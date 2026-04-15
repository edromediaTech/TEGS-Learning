<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 text-white">

    <!-- ======================== -->
    <!-- STEP 1: Entrer le token -->
    <!-- ======================== -->
    <div v-if="step === 'token'" class="flex items-center justify-center min-h-screen px-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="text-5xl mb-4">&#127915;</div>
          <h1 class="text-2xl font-extrabold mb-2">Acceder au Quiz</h1>
          <p class="text-gray-400 text-sm">Entrez votre code de competition pour demarrer</p>
        </div>

        <form @submit.prevent="verifyToken" class="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-4">
          <div>
            <label class="block text-xs text-gray-400 mb-2">Code de competition (TKT-XXX)</label>
            <input v-model="competitionToken" type="text" required autofocus
              class="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl font-mono tracking-widest uppercase placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none"
              placeholder="TKT-XXXXXXXX" />
          </div>

          <div v-if="tokenError" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
            {{ tokenError }}
          </div>

          <button type="submit" :disabled="verifying"
            class="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50">
            {{ verifying ? 'Verification...' : 'Acceder au quiz' }}
          </button>
        </form>

        <div class="text-center mt-6">
          <NuxtLink :to="`/tournament/${shareToken}`" class="text-sm text-gray-500 hover:text-gray-300">
            &#8592; Retour au tournoi
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ======================== -->
    <!-- STEP 2: Briefing round -->
    <!-- ======================== -->
    <div v-if="step === 'briefing'" class="flex items-center justify-center min-h-screen px-4">
      <div class="w-full max-w-lg text-center">
        <div class="bg-white/10 backdrop-blur rounded-2xl p-8">
          <div class="text-4xl mb-4">&#9997;&#65039;</div>
          <h2 class="text-2xl font-extrabold mb-2">{{ roundInfo.label }}</h2>
          <p class="text-gray-400 mb-6">{{ tournamentTitle }}</p>

          <!-- Participant info -->
          <div class="bg-white/5 rounded-xl p-4 mb-6 text-left text-sm">
            <div class="grid grid-cols-2 gap-2">
              <div class="text-gray-500">Candidat</div>
              <div class="font-bold">{{ participantInfo.firstName }} {{ participantInfo.lastName }}</div>
              <div class="text-gray-500">Etablissement</div>
              <div>{{ participantInfo.establishment || '—' }}</div>
              <div class="text-gray-500">Round</div>
              <div class="font-bold text-amber-400">{{ roundInfo.order }}/{{ totalRounds || '?' }}</div>
              <div v-if="moduleInfo.globalTimeLimit" class="text-gray-500">Duree</div>
              <div v-if="moduleInfo.globalTimeLimit" class="font-bold text-red-400">
                {{ Math.floor(moduleInfo.globalTimeLimit / 60) }} min
              </div>
            </div>
          </div>

          <!-- Regles de passation -->
          <div class="space-y-3 mb-6 text-left">

            <!-- Instructions generales -->
            <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
              <p class="font-bold mb-2 flex items-center"><span class="mr-2">&#128221;</span> Instructions</p>
              <ul class="space-y-1.5 text-xs">
                <li class="flex items-start"><span class="mr-2 shrink-0">&#9679;</span> Repondez a toutes les questions dans le temps imparti</li>
                <li class="flex items-start"><span class="mr-2 shrink-0">&#9679;</span> Le classement est base sur le <strong>score (%)</strong> puis le <strong>temps de reponse</strong></li>
                <li v-if="moduleInfo.globalTimeLimit" class="flex items-start"><span class="mr-2 shrink-0">&#9200;</span> <strong>Temps limite : {{ Math.floor(moduleInfo.globalTimeLimit / 60) }} minutes</strong> — le quiz est soumis automatiquement a l'expiration</li>
                <li class="flex items-start"><span class="mr-2 shrink-0">&#9679;</span> Une fois soumis, vous <strong>ne pouvez pas</strong> modifier vos reponses</li>
              </ul>
            </div>

            <!-- Materiel requis -->
            <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-200">
              <p class="font-bold mb-2 flex items-center"><span class="mr-2">&#128247;</span> Materiel requis</p>
              <ul class="space-y-1.5 text-xs">
                <li class="flex items-center"><span class="text-green-400 mr-2">&#10003;</span> Connexion internet stable (Wi-Fi ou 4G)</li>
                <li class="flex items-center"><span class="text-green-400 mr-2">&#10003;</span> Navigateur a jour (Chrome, Firefox, Safari)</li>
                <li v-if="moduleInfo.proctoring !== 'none'" class="flex items-center">
                  <span class="text-green-400 mr-2">&#10003;</span> <strong>Camera fonctionnelle</strong> — surveillance active
                </li>
                <li v-if="moduleInfo.proctoring === 'video'" class="flex items-center">
                  <span class="text-green-400 mr-2">&#10003;</span> <strong>Microphone</strong> — enregistrement audio actif
                </li>
                <li class="flex items-center"><span class="text-green-400 mr-2">&#10003;</span> Votre code TKT-XXX (deja saisi)</li>
              </ul>
            </div>

            <!-- Surveillance -->
            <div v-if="moduleInfo.surveillanceMode === 'strict'" class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-200">
              <p class="font-bold mb-2 flex items-center"><span class="mr-2">&#128680;</span> Mode surveillance STRICT</p>
              <ul class="space-y-1.5 text-xs">
                <li class="flex items-start"><span class="mr-2 shrink-0">&#9888;</span> Le quiz s'affiche en <strong>plein ecran obligatoire</strong></li>
                <li class="flex items-start"><span class="mr-2 shrink-0">&#9888;</span> <strong>Copier-coller desactive</strong> pendant l'examen</li>
                <li class="flex items-start"><span class="mr-2 shrink-0">&#9888;</span> <strong>Changement d'onglet detecte</strong> — chaque sortie est comptabilisee</li>
                <li v-if="moduleInfo.proctoring !== 'none'" class="flex items-start"><span class="mr-2 shrink-0">&#9888;</span> Des <strong>captures photo</strong> sont prises aleatoirement pendant l'examen</li>
              </ul>
            </div>

            <!-- Cas d'elimination -->
            <div class="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-300">
              <p class="font-bold mb-2 flex items-center"><span class="mr-2">&#128683;</span> Cas d'elimination</p>
              <ul class="space-y-1.5 text-xs">
                <li class="flex items-start"><span class="text-red-400 mr-2">&#10005;</span> Score insuffisant — seuls les <strong>Top {{ roundInfo.promoteTopX || 'X' }}</strong> sont qualifies</li>
                <li class="flex items-start"><span class="text-red-400 mr-2">&#10005;</span> Non-soumission — si vous ne soumettez pas vos reponses avant la fin du timer</li>
                <li v-if="moduleInfo.surveillanceMode === 'strict'" class="flex items-start"><span class="text-red-400 mr-2">&#10005;</span> Trop de sorties d'onglet (max 3) — <strong>soumission automatique forcee</strong></li>
                <li class="flex items-start"><span class="text-red-400 mr-2">&#10005;</span> Fraude detectee — tentative de copie, aide externe ou usurpation d'identite</li>
                <li class="flex items-start"><span class="text-red-400 mr-2">&#10005;</span> Deconnexion prolongee — si votre connexion est perdue trop longtemps</li>
                <li v-if="moduleInfo.proctoring !== 'none'" class="flex items-start"><span class="text-red-400 mr-2">&#10005;</span> Camera desactivee ou obstruee pendant l'examen</li>
              </ul>
            </div>

          </div>

          <button @click="launchQuiz"
            class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg">
            Commencer le Quiz &#8594;
          </button>
        </div>
      </div>
    </div>

    <!-- ======================== -->
    <!-- STEP 3: Quiz (iframe) -->
    <!-- ======================== -->
    <div v-if="step === 'quiz'" class="min-h-screen flex flex-col">
      <!-- Header bar -->
      <div class="bg-black/50 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span class="text-sm font-bold">{{ roundInfo.label }}</span>
          <span class="text-xs text-gray-500">{{ participantInfo.firstName }} {{ participantInfo.lastName }}</span>
        </div>
        <div class="text-xs text-gray-400">{{ tournamentTitle }}</div>
      </div>

      <!-- Quiz iframe -->
      <iframe
        ref="quizFrame"
        :src="`${baseURL}/modules/public/${moduleInfo.shareToken}`"
        class="flex-1 w-full border-none"
        allow="camera;microphone"
        @load="onQuizLoaded">
      </iframe>
    </div>

    <!-- ======================== -->
    <!-- STEP 4: Resultat soumis -->
    <!-- ======================== -->
    <div v-if="step === 'submitted'" class="flex items-center justify-center min-h-screen px-4">
      <div class="w-full max-w-md text-center">
        <div class="bg-white/10 backdrop-blur rounded-2xl p-8">
          <div class="text-5xl mb-4">&#9989;</div>
          <h2 class="text-2xl font-extrabold mb-2">Reponses soumises !</h2>
          <p class="text-gray-400 mb-6">Vos reponses ont ete enregistrees avec succes.</p>

          <div v-if="submittedResult" class="bg-white/5 rounded-xl p-4 mb-6">
            <div class="text-xs text-gray-500 mb-1">Votre score</div>
            <div class="text-3xl font-black text-amber-400">{{ submittedResult.percentage }}%</div>
            <div class="text-sm text-gray-400">{{ submittedResult.score }}</div>
          </div>

          <p class="text-sm text-gray-500">
            Le classement sera annonce a la cloture du round par l'administrateur.
            Restez connecte pour suivre le direct.
          </p>

          <NuxtLink :to="`/tournament/${shareToken}`"
            class="inline-block mt-6 px-6 py-3 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl font-medium hover:bg-amber-500/30 transition">
            Retour au tournoi
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- ======================== -->
    <!-- Error state -->
    <!-- ======================== -->
    <div v-if="step === 'error'" class="flex items-center justify-center min-h-screen px-4">
      <div class="w-full max-w-md text-center">
        <div class="bg-white/10 backdrop-blur rounded-2xl p-8">
          <div class="text-5xl mb-4">&#128683;</div>
          <h2 class="text-xl font-bold mb-2">Acces impossible</h2>
          <p class="text-gray-400 mb-6">{{ globalError }}</p>
          <button @click="step = 'token'; tokenError = ''"
            class="px-6 py-3 bg-white/10 border border-white/20 rounded-xl text-sm font-medium hover:bg-white/20 transition">
            Reessayer
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const baseURL = config.public.apiBase as string;
const shareToken = route.params.token as string;

const step = ref<'token' | 'briefing' | 'quiz' | 'submitted' | 'error'>('token');
const competitionToken = ref('');
const verifying = ref(false);
const tokenError = ref('');
const globalError = ref('');
const quizFrame = ref<HTMLIFrameElement | null>(null);

const tournamentTitle = ref('');
const totalRounds = ref(0);
const participantInfo = ref<any>({});
const roundInfo = ref<any>({});
const moduleInfo = ref<any>({});
const submittedResult = ref<any>(null);

async function verifyToken() {
  if (!competitionToken.value.trim()) return;
  verifying.value = true;
  tokenError.value = '';

  try {
    const res = await $fetch<any>(`${baseURL}/tournaments/play/${competitionToken.value.trim()}`, {
      method: 'GET',
    });

    participantInfo.value = res.participant;
    tournamentTitle.value = res.tournament.title;
    roundInfo.value = res.round;
    totalRounds.value = res.totalRounds || 0;
    moduleInfo.value = res.module;
    step.value = 'briefing';
  } catch (e: any) {
    const data = e.data || e.response?._data;
    if (data?.result) {
      // Deja soumis — afficher le resultat
      submittedResult.value = data.result;
      step.value = 'submitted';
    } else {
      tokenError.value = data?.error || 'Token invalide ou tournoi non accessible';
    }
  } finally {
    verifying.value = false;
  }
}

function launchQuiz() {
  step.value = 'quiz';
}

function onQuizLoaded() {
  // Le quiz player share.js est charge dans l'iframe
  // On ecoute les messages postMessage pour la soumission
}

// Ecouter les messages du quiz player (share.js envoie un postMessage a la soumission)
onMounted(() => {
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'TEGS_QUIZ_SUBMITTED') {
      // Le quiz a ete soumis via le player share.js
      // Maintenant on lie le resultat au participant via notre endpoint
      try {
        const res = await $fetch<any>(
          `${baseURL}/tournaments/play/${competitionToken.value}/submit`,
          {
            method: 'POST',
            body: {
              answers: event.data.answers || [],
              duration: event.data.duration || '',
              moduleTitle: event.data.moduleTitle || moduleInfo.value.title,
              autoSubmitted: event.data.autoSubmitted || false,
            },
          }
        );
        submittedResult.value = {
          score: res.score,
          percentage: res.percentage,
        };
        step.value = 'submitted';
      } catch (e: any) {
        const data = e.data || e.response?._data;
        submittedResult.value = { score: '—', percentage: '—' };
        step.value = 'submitted';
      }
    }
  });
});

// SEO
useHead({
  title: 'Quiz du Concours | TEGS-Arena',
});
</script>
