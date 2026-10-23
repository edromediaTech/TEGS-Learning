<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
    <header class="bg-white border-b border-gray-200 px-6 py-4">
      <h1 class="text-2xl font-extrabold bg-gradient-to-r from-indigo-700 to-blue-500 bg-clip-text text-transparent">
        Parcours Dépannage Smartphone
      </h1>
      <p class="text-sm text-gray-500 mt-1">
        Formation professionnelle CRNS - DDENE Haïti. 4 modules à valider en séquence.
      </p>
    </header>

    <main class="max-w-5xl mx-auto p-6">
      <div v-if="loading" class="text-center text-gray-500 py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-3"></div>
        <p>Chargement de ta progression...</p>
      </div>

      <div v-else class="space-y-6">
        <!-- Progress bar globale -->
        <div class="bg-white rounded-xl shadow p-5">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-gray-900">Progression globale</span>
            <span class="text-sm font-mono text-gray-700">
              {{ doneCount }}/{{ modules.length }} modules
            </span>
          </div>
          <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500"
              :style="{ width: `${(doneCount / modules.length) * 100}%` }"
            ></div>
          </div>
          <div v-if="doneCount === modules.length" class="mt-3 flex items-center gap-3">
            <p class="text-xs text-green-700 font-semibold">🎓 Parcours complété !</p>
            <NuxtLink
              to="/parcours/depannage-smartphone/certificat"
              class="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-bold rounded-md hover:from-amber-700 hover:to-amber-800 shadow"
            >
              Voir mon certificat →
            </NuxtLink>
          </div>
        </div>

        <!-- Modules -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="(m, mi) in modulesWithStatus"
            :key="m.id"
            class="bg-white rounded-xl shadow p-5 border-2 transition-all"
            :class="{
              'border-green-300': m.status === 'completed',
              'border-blue-400 hover:shadow-md cursor-pointer': m.status === 'available',
              'border-gray-200 opacity-60': m.status === 'locked',
            }"
            @click="onCardClick(m)"
          >
            <div class="flex items-start gap-3 mb-3">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                :class="{
                  'bg-green-100 text-green-700': m.status === 'completed',
                  'bg-blue-100 text-blue-700': m.status === 'available',
                  'bg-gray-100 text-gray-400': m.status === 'locked',
                }"
              >
                <span v-if="m.status === 'completed'">✓</span>
                <span v-else-if="m.status === 'locked'">🔒</span>
                <span v-else>{{ mi }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Module {{ mi }} · {{ m.kind }}
                </p>
                <h3 class="text-base font-bold text-gray-900 mt-0.5 leading-tight">{{ m.title }}</h3>
              </div>
            </div>
            <p class="text-sm text-gray-600 leading-relaxed mb-3">{{ m.description }}</p>
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500">⏱ {{ m.duration_minutes }} min</span>
              <span
                v-if="m.status === 'completed'"
                class="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold"
              >
                Validé
              </span>
              <span
                v-else-if="m.status === 'available'"
                class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold"
              >
                Démarrer →
              </span>
              <span v-else class="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">
                Verrouillé
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });

interface ModuleDef {
  id: string;
  kind: string;
  title: string;
  description: string;
  duration_minutes: number;
  activityId: string;
  url: string;
  prerequisites: string[];
  completionVerbs?: string[];
}

const SIM_BASE = 'https://crns.tegs-learning.edu.ht/sim';
const QUIZ_BASE = 'https://crns.tegs-learning.edu.ht/quiz';

const modules: ModuleDef[] = [
  {
    id: 'mod0_securite',
    kind: 'Quiz obligatoire',
    title: 'Sécurité - Risques batteries Li-ion',
    description: "Vidéo + quiz sur les bons gestes pour manipuler une batterie lithium-ion sans risque d'incendie ou d'électrocution.",
    duration_minutes: 10,
    activityId: `${QUIZ_BASE}/securite_lion_v1`,
    url: '/parcours/depannage-smartphone/securite',
    prerequisites: [],
    completionVerbs: ['passed'],
  },
  {
    id: 'mod1_ohm',
    kind: 'Laboratoire virtuel',
    title: "Loi d'Ohm - circuits de base",
    description: 'Comprendre la relation U = R × I et identifier le seuil de rupture d\'une ampoule. Multimètre virtuel inclus.',
    duration_minutes: 15,
    activityId: `${SIM_BASE}/phys_ohm_law_v1`,
    url: '/simulations/phys_ohm_law_v1',
    prerequisites: ['mod0_securite'],
    completionVerbs: ['experienced', 'passed', 'completed'],
  },
  {
    id: 'mod2_anatomie',
    kind: 'Diagnostic',
    title: 'Anatomie + Diagnostic - vue éclatée',
    description: 'Identifier les 8 composants principaux et diagnostiquer une panne aléatoire avec multimètre 2 pointes.',
    duration_minutes: 20,
    activityId: `${SIM_BASE}/tech_smartphone_anatomie_v1`,
    url: '/simulations/tech_smartphone_anatomie_v1',
    prerequisites: ['mod1_ohm'],
    completionVerbs: ['passed'],
  },
  {
    id: 'mod3_assemblage',
    kind: 'Assemblage pas-à-pas',
    title: 'Assemblage - remontage du téléphone',
    description: "Maîtriser l'ordre de montage : batterie → connecteurs → puces → écran. Score basé sur ordre + erreurs + temps.",
    duration_minutes: 25,
    activityId: `${SIM_BASE}/tech_smartphone_assemblage_v1`,
    url: '/simulations/tech_smartphone_assemblage_v1',
    prerequisites: ['mod2_anatomie'],
    completionVerbs: ['passed', 'completed'],
  },
];

const progression = useCourseProgression(
  modules.map((m) => ({ id: m.id, activityId: m.activityId, completionVerbs: m.completionVerbs })),
);
const { loading, refresh } = progression;

const modulesWithStatus = computed(() =>
  modules.map((m) => ({
    ...m,
    status: progression.statusOf(m.id, m.prerequisites),
  })),
);

const doneCount = computed(() =>
  modulesWithStatus.value.filter((m) => m.status === 'completed').length,
);

const router = useRouter();
function onCardClick(m: typeof modulesWithStatus.value[number]) {
  if (m.status === 'locked') return;
  router.push(m.url);
}

onMounted(() => refresh());
</script>
