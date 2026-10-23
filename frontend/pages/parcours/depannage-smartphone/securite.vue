<template>
  <div class="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50">
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <NuxtLink to="/parcours/depannage-smartphone" class="text-xs text-primary-600 hover:underline">
          &larr; Parcours Dépannage
        </NuxtLink>
        <h1 class="text-xl font-bold text-gray-900 mt-1">Module 0 — Sécurité Li-ion</h1>
        <p class="text-xs text-gray-500">Pré-requis obligatoire avant de manipuler du matériel.</p>
      </div>
      <span class="text-2xl">⚠️</span>
    </header>

    <div class="max-w-3xl mx-auto p-6">
      <div v-if="!submitted" class="space-y-4">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          Les batteries lithium-ion peuvent prendre feu ou exploser si elles sont perforées,
          surchauffées ou court-circuitées. Réponds correctement à au moins
          <strong>4 questions sur 5</strong> pour débloquer la suite du parcours.
        </div>

        <ol class="space-y-5">
          <li
            v-for="(q, qi) in questions"
            :key="qi"
            class="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <p class="font-semibold text-gray-900 mb-3">
              <span class="text-amber-700 mr-2">Q{{ qi + 1 }}.</span>{{ q.question }}
            </p>
            <div class="space-y-2">
              <label
                v-for="(opt, oi) in q.options"
                :key="oi"
                class="flex items-start gap-3 cursor-pointer hover:bg-amber-50 rounded p-2 transition-colors"
              >
                <input
                  type="radio"
                  :name="`q${qi}`"
                  :value="oi"
                  v-model="answers[qi]"
                  class="mt-1"
                />
                <span class="text-sm">{{ opt }}</span>
              </label>
            </div>
          </li>
        </ol>

        <button
          type="button"
          @click="submit"
          :disabled="!allAnswered || submitting"
          class="w-full px-4 py-3 bg-gradient-to-r from-amber-600 to-red-600 text-white text-base font-bold rounded-lg hover:from-amber-700 hover:to-red-700 disabled:opacity-50"
        >
          {{ submitting ? 'Évaluation...' : `Soumettre (${answeredCount}/${questions.length} répondues)` }}
        </button>
      </div>

      <!-- Resultat -->
      <div v-else class="space-y-4">
        <div
          class="rounded-lg p-6 border-l-4 text-center"
          :class="passed
            ? 'bg-green-50 border-green-500'
            : 'bg-red-50 border-red-500'"
        >
          <div class="text-5xl mb-2">{{ passed ? '🛡️' : '⚠️' }}</div>
          <p class="text-2xl font-bold mb-1" :class="passed ? 'text-green-800' : 'text-red-800'">
            {{ passed ? 'Sécurité validée' : 'Échec - relire la formation' }}
          </p>
          <p class="text-lg font-mono mt-2" :class="passed ? 'text-green-700' : 'text-red-700'">
            Score : {{ correctCount }}/{{ questions.length }}
          </p>
        </div>

        <details class="bg-white rounded-lg border border-gray-200 p-4">
          <summary class="cursor-pointer font-semibold text-gray-900">Voir les corrections</summary>
          <div class="mt-3 space-y-3">
            <div
              v-for="(q, qi) in questions"
              :key="qi"
              class="text-sm border-l-2 pl-3"
              :class="answers[qi] === q.correct ? 'border-green-400' : 'border-red-400'"
            >
              <p class="font-medium">
                {{ answers[qi] === q.correct ? '✓' : '✗' }}
                {{ q.question }}
              </p>
              <p class="text-gray-600 mt-1 text-xs">
                Bonne réponse : <strong>{{ q.options[q.correct] }}</strong>
              </p>
              <p class="text-gray-500 italic text-xs mt-1">{{ q.explanation }}</p>
            </div>
          </div>
        </details>

        <div class="flex gap-3">
          <button
            v-if="!passed"
            @click="retry"
            class="flex-1 px-4 py-3 bg-amber-600 text-white text-sm font-bold rounded-lg hover:bg-amber-700"
          >
            Recommencer
          </button>
          <NuxtLink
            v-if="passed"
            to="/parcours/depannage-smartphone"
            class="flex-1 px-4 py-3 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 text-center"
          >
            Module suivant débloqué →
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });

const ACTIVITY_ID = 'https://crns.tegs-learning.edu.ht/quiz/securite_lion_v1';
const PASS_THRESHOLD = 4; // 4 sur 5

interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const questions: Question[] = [
  {
    question: "Que peut-il arriver si on perce une batterie Li-ion gonflée avec un tournevis ?",
    options: [
      "Rien de particulier, juste un peu d'air qui s'échappe",
      "Risque immédiat d'incendie ou d'explosion à cause de l'électrolyte exposé à l'air",
      "La batterie redevient normale après ré-équilibrage chimique",
      "Le téléphone se met en veille automatique",
    ],
    correct: 1,
    explanation: "Une batterie Li-ion gonflée contient des gaz et un électrolyte inflammable. Toute perforation crée un court-circuit interne qui peut enflammer instantanément l'électrolyte.",
  },
  {
    question: "Comment reconnaître visuellement une batterie Li-ion défaillante ?",
    options: [
      "Elle change de couleur passant du noir au rouge",
      "Elle devient plus légère que d'habitude",
      "Gonflement visible, déformation du chassis, traces de corrosion ou surchauffe au toucher",
      "Aucun signe extérieur n'est jamais visible",
    ],
    correct: 2,
    explanation: "Le gonflement (swelling) est le signe principal. Il est dû à la production de gaz interne suite à une dégradation chimique. Une batterie qui pousse sur l'écran ou le chassis doit être remplacée immédiatement.",
  },
  {
    question: "Quel équipement de protection minimal porter pour intervenir sur une batterie Li-ion ?",
    options: [
      "Aucun, c'est inutile pour une batterie",
      "Casque de chantier",
      "Lunettes de protection + gants antistatiques (ESD)",
      "Combinaison ignifugée complète",
    ],
    correct: 2,
    explanation: "Les lunettes protègent les yeux des projections d'électrolyte (acide). Les gants ESD évitent les chocs électrostatiques qui peuvent endommager l'électronique ET protègent les doigts en cas de fuite chimique.",
  },
  {
    question: "Avant de décoller la batterie d'un smartphone avec une spatule, quel risque doit-on absolument éviter ?",
    options: [
      "Le bruit excessif de l'outil",
      "Le court-circuit en perforant la batterie ou en faisant contact entre + et −",
      "La condensation atmosphérique",
      "Aucun risque particulier, c'est une opération anodine",
    ],
    correct: 1,
    explanation: "Utiliser une spatule en plastique (jamais en métal) et soulever uniquement par les coins. Une perforation accidentelle = court-circuit interne = risque d'incendie.",
  },
  {
    question: "Que faire d'une batterie Li-ion gonflée ou endommagée que l'on doit retirer ?",
    options: [
      "La jeter à la poubelle ordinaire",
      "La placer dans le compost",
      "L'isoler dans un sac plastique étanche puis la déposer dans un point de collecte spécialisé (DEEE / piles)",
      "La remettre simplement dans une boite à outils",
    ],
    correct: 2,
    explanation: "Les batteries Li-ion sont classées DEEE (Déchets d'Équipements Électriques et Électroniques). Elles ne doivent jamais aller à la poubelle classique : risque de combustion lente dans les centres de tri, plus pollution lourde des sols.",
  },
];

const answers = ref<(number | null)[]>(questions.map(() => null));
const submitted = ref(false);
const submitting = ref(false);

const allAnswered = computed(() => answers.value.every((a) => a !== null));
const answeredCount = computed(() => answers.value.filter((a) => a !== null).length);
const correctCount = computed<number>(() =>
  answers.value.reduce<number>((sum, a, i) => sum + (a === questions[i].correct ? 1 : 0), 0),
);
const passed = computed<boolean>(() => (correctCount.value ?? 0) >= PASS_THRESHOLD);

async function submit() {
  if (!allAnswered.value) return;
  submitting.value = true;
  try {
    // Emet un statement xAPI
    const verb = passed.value ? 'passed' : 'failed';
    const tracker = useXapiTracker(ACTIVITY_ID);
    await tracker.initialize('Quiz Securite Li-ion');
    await tracker.sendEvent({
      id: 'evt_quiz_securite_submit',
      target: 'securite_lion',
      xapi_verb: verb,
      xapi_description: `Quiz Securite : ${correctCount.value}/${questions.length}`,
      runtime: {
        score_raw: correctCount.value,
        score_max: questions.length,
        answers: answers.value,
      },
    } as any);
  } catch (e) {
    console.error('xAPI submit failed', e);
  } finally {
    submitted.value = true;
    submitting.value = false;
  }
}

function retry() {
  answers.value = questions.map(() => null);
  submitted.value = false;
}
</script>
