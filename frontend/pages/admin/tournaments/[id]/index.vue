<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Loading -->
      <div v-if="store.loading && !store.current" class="text-center py-12 text-gray-500">
        Chargement...
      </div>

      <template v-else-if="store.current">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/admin/tournaments" class="text-gray-400 hover:text-gray-600">&#8592;</NuxtLink>
            <div>
              <h1 class="text-2xl font-extrabold text-gray-900">{{ store.current.title }}</h1>
              <div class="flex items-center space-x-3 mt-1">
                <span class="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase"
                  :class="statusBadge(store.current.status)">
                  {{ statusLabel(store.current.status) }}
                </span>
                <span class="text-sm text-gray-400">
                  {{ store.participants.length }} participant{{ store.participants.length > 1 ? 's' : '' }}
                </span>
                <span v-if="store.current.registrationFee > 0" class="text-sm text-green-600 font-medium">
                  {{ store.current.registrationFee }} {{ store.current.currency }}
                </span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-3">
            <!-- Share link -->
            <button v-if="store.current.shareToken"
              @click="copyShareLink"
              class="bg-gray-100 text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              :title="shareCopied ? 'Copie !' : 'Copier le lien public'">
              {{ shareCopied ? 'Copie !' : 'Lien public' }}
            </button>
            <!-- Live Arena link -->
            <NuxtLink v-if="store.current.shareToken && store.current.status === 'active'"
              :to="`/live-tournament/${store.current.shareToken}`"
              target="_blank"
              class="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center space-x-1">
              <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              <span>Arena TV</span>
            </NuxtLink>
            <button
              v-if="store.current.status === 'draft'"
              @click="changeStatus('registration')"
              class="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              Ouvrir les inscriptions
            </button>
            <button
              v-if="store.current.status === 'registration' || (store.current.status === 'active' && activeRound?.status === 'completed' && !isLastRound)"
              @click="handleStartRoundLive"
              class="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:from-amber-600 hover:to-orange-600 transition-all shadow-md">
              Demarrer Round {{ (store.current.currentRound || 0) + 1 }}
            </button>
            <button
              v-if="store.current.status === 'active' && activeRound?.status === 'active'"
              @click="handleAdvanceLive"
              :disabled="advancing"
              class="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:from-green-600 hover:to-emerald-600 transition-all shadow-md disabled:opacity-50">
              {{ advancing ? 'Calcul...' : 'Cloturer & Qualifier' }}
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex items-center space-x-1 mb-6 border-b border-gray-200">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-4 py-3 text-sm font-medium border-b-2 transition-colors"
            :class="activeTab === tab.id
              ? 'border-amber-500 text-amber-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- TAB: Bracket -->
        <div v-if="activeTab === 'bracket'" class="space-y-6">
          <!-- Live connection status -->
          <div v-if="ts.connected.value" class="flex items-center space-x-2 text-xs">
            <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span class="text-green-600 font-medium">Connecte en temps reel</span>
          </div>

          <div v-if="liveBracket.length === 0 && store.bracket.length === 0" class="text-center py-8 text-gray-400">
            Le bracket sera visible une fois le tournoi demarre
          </div>

          <!-- Tournament Tree Component -->
          <TournamentTree
            v-if="liveBracket.length > 0 || store.bracket.length > 0"
            :bracket="liveBracket.length > 0 ? liveBracket : store.bracket"
            :podium="livePodium || (store.podium.length > 0 ? store.podium : null)"
            :dark="false"
          />

          <!-- Live advance result notification -->
          <Transition name="fade">
            <div v-if="ts.lastAdvance.value"
              class="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
              <h4 class="font-bold text-green-800 mb-2">
                {{ ts.lastAdvance.value.label }} — Promotion terminee
              </h4>
              <div class="flex items-center space-x-6 text-sm">
                <span class="text-green-600 font-medium">
                  {{ ts.lastAdvance.value.qualified.length }} qualifie(s)
                </span>
                <span class="text-red-500">
                  {{ ts.lastAdvance.value.eliminated.length }} elimine(s)
                </span>
              </div>
              <div v-if="ts.lastAdvance.value.isFinished" class="mt-2 text-amber-700 font-bold">
                Le tournoi est termine ! Consultez le podium.
              </div>
            </div>
          </Transition>
        </div>

        <!-- TAB: Participants -->
        <div v-if="activeTab === 'participants'" class="space-y-4">
          <!-- Add participant (inline) -->
          <div v-if="['draft', 'registration'].includes(store.current.status)"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 class="text-sm font-bold text-gray-700 mb-3">Inscrire un participant</h3>
            <form @submit.prevent="handleRegister" class="flex items-end space-x-3">
              <div class="flex-1">
                <label class="text-xs text-gray-500 mb-1 block">Prenom *</label>
                <input v-model="regForm.firstName" required
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <div class="flex-1">
                <label class="text-xs text-gray-500 mb-1 block">Nom *</label>
                <input v-model="regForm.lastName" required
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <div class="flex-1">
                <label class="text-xs text-gray-500 mb-1 block">Email *</label>
                <input v-model="regForm.email" type="email" required
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <div class="w-40">
                <label class="text-xs text-gray-500 mb-1 block">Etablissement</label>
                <input v-model="regForm.establishment"
                  class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <button type="submit"
                class="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors shrink-0">
                Inscrire
              </button>
            </form>
          </div>

          <!-- Participants table -->
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table class="w-full">
              <thead class="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th class="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">#</th>
                  <th class="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Participant</th>
                  <th class="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Etablissement</th>
                  <th class="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Token</th>
                  <th class="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Statut</th>
                  <th class="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-if="store.participants.length === 0">
                  <td colspan="6" class="text-center py-8 text-gray-400 text-sm">Aucun participant inscrit</td>
                </tr>
                <tr v-for="(p, i) in store.participants" :key="p._id" class="hover:bg-gray-50/50">
                  <td class="px-4 py-3 text-sm font-bold text-gray-400">{{ i + 1 }}</td>
                  <td class="px-4 py-3">
                    <div class="text-sm font-medium text-gray-900">{{ p.firstName }} {{ p.lastName }}</div>
                    <div class="text-xs text-gray-400">{{ p.email }}</div>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">{{ p.establishment || '-' }}</td>
                  <td class="px-4 py-3">
                    <code class="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{{ p.competitionToken }}</code>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                      :class="participantBadge(p.status)">
                      {{ participantLabel(p.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right text-sm font-bold" :class="p.status === 'eliminated' ? 'text-red-400' : 'text-gray-900'">
                    {{ p.totalScore }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAB: Analytics -->
        <div v-if="activeTab === 'analytics'" class="space-y-6">
          <div v-if="kpiLoading" class="text-center py-8 text-gray-400">Chargement des KPIs...</div>

          <template v-else-if="kpis">
            <!-- KPI Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="text-2xl font-black text-blue-600">{{ kpis.participation.total }}</div>
                <div class="text-xs text-gray-400 mt-1">Inscrits</div>
              </div>
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="text-2xl font-black text-green-600">{{ kpis.participation.paymentRate }}%</div>
                <div class="text-xs text-gray-400 mt-1">Taux paiement</div>
              </div>
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="text-2xl font-black" :class="kpis.fraudIndex >= 80 ? 'text-green-600' : kpis.fraudIndex >= 50 ? 'text-amber-600' : 'text-red-600'">
                  {{ kpis.fraudIndex }}
                </div>
                <div class="text-xs text-gray-400 mt-1">Indice fiabilite</div>
              </div>
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="text-2xl font-black text-green-600">{{ kpis.financial.totalRevenue.toLocaleString() }}</div>
                <div class="text-xs text-gray-400 mt-1">Revenus {{ kpis.financial.currency }}</div>
              </div>
            </div>

            <!-- Vitesse par round -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-bold text-gray-900 mb-4">Vitesse de reponse par round</h3>
              <div class="space-y-3">
                <div v-for="r in kpis.speedByRound" :key="r.round"
                  class="flex items-center space-x-4 bg-gray-50 rounded-xl p-3">
                  <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                    {{ r.round }}
                  </div>
                  <div class="flex-1">
                    <div class="font-medium text-sm">{{ r.label }}</div>
                    <div class="text-xs text-gray-400">{{ r.participantCount }} participants</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-sm">{{ r.avgDurationLabel }}</div>
                    <div class="text-[10px] text-gray-400">{{ r.fastestSec }}s — {{ r.slowestSec }}s</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Completion par district -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-bold text-gray-900 mb-4">Completion par district</h3>
              <div class="space-y-2">
                <div v-for="d in kpis.completionByDistrict" :key="d.district"
                  class="flex items-center space-x-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">{{ d.district }}</div>
                    <div class="text-xs text-gray-400">{{ d.completed }}/{{ d.total }} — score moy. {{ d.avgScore }}</div>
                  </div>
                  <div class="w-24 h-2 bg-gray-200 rounded-full overflow-hidden shrink-0">
                    <div class="h-full bg-blue-500 rounded-full" :style="{ width: d.completionRate + '%' }"></div>
                  </div>
                  <span class="text-sm font-bold text-gray-700 w-12 text-right">{{ d.completionRate }}%</span>
                </div>
              </div>
            </div>

            <!-- Finances -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 class="font-bold text-gray-900 mb-4">Bilan financier</h3>
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-lg font-bold text-green-600">{{ kpis.financial.totalRevenue.toLocaleString() }}</div>
                  <div class="text-xs text-gray-400">Revenus</div>
                </div>
                <div>
                  <div class="text-lg font-bold text-red-500">{{ kpis.financial.totalPrizes.toLocaleString() }}</div>
                  <div class="text-xs text-gray-400">Primes</div>
                </div>
                <div>
                  <div class="text-lg font-bold" :class="kpis.financial.netRevenue >= 0 ? 'text-green-600' : 'text-red-500'">
                    {{ kpis.financial.netRevenue.toLocaleString() }}
                  </div>
                  <div class="text-xs text-gray-400">Net {{ kpis.financial.currency }}</div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- TAB: Settings -->
        <div v-if="activeTab === 'settings'" class="max-w-2xl">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 class="font-bold text-gray-900">Parametres du tournoi</h3>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
              <input v-model="editForm.title" type="text"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea v-model="editForm.description" rows="3"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none resize-none"></textarea>
            </div>
            <button @click="handleSave"
              class="bg-amber-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors">
              Sauvegarder
            </button>
          </div>

          <!-- Rounds editor -->
          <div v-if="store.current?.rounds?.length" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
            <h3 class="font-bold text-gray-900 mb-4">Rounds ({{ store.current.rounds.length }})</h3>
            <div class="space-y-3">
              <div
                v-for="(round, i) in store.current.rounds"
                :key="i"
                class="flex items-center space-x-3 bg-gray-50 rounded-xl p-4"
              >
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  :class="round.status === 'completed' ? 'bg-green-100 text-green-700' : round.status === 'active' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'">
                  {{ i + 1 }}
                </div>
                <div class="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <input v-model="round.label" type="text"
                    class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                    :disabled="round.status !== 'pending'" />
                  <select v-model="round.module_id" @change="round.section_index = null"
                    class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                    :disabled="round.status !== 'pending'">
                    <option :value="null">Module</option>
                    <option v-for="m in modulesList" :key="m._id" :value="m._id">{{ m.title }}</option>
                  </select>
                  <select v-model="round.section_index"
                    :disabled="!round.module_id || round.status !== 'pending'"
                    class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none disabled:opacity-50">
                    <option :value="null">Tout le module</option>
                    <option v-for="(sec, idx) in getModuleSections(round.module_id)" :key="idx" :value="idx">
                      {{ sec.title || 'Chapitre ' + (idx + 1) }}
                    </option>
                  </select>
                  <div class="flex items-center space-x-2">
                    <span class="text-xs text-gray-400">Top</span>
                    <input v-model.number="round.promoteTopX" type="number" min="1"
                      class="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                      :disabled="round.status !== 'pending'" />
                  </div>
                </div>
                <span class="text-[10px] font-bold uppercase px-2 py-1 rounded-full"
                  :class="round.status === 'completed' ? 'bg-green-100 text-green-600' : round.status === 'active' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'">
                  {{ round.status === 'completed' ? 'Termine' : round.status === 'active' ? 'En cours' : 'En attente' }}
                </span>
              </div>
            </div>
            <button @click="handleSaveRounds"
              class="mt-4 bg-amber-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-600 transition-colors">
              Sauvegarder les rounds
            </button>
          </div>
        </div>

        <!-- Live advance result notification (via socket) -->
        <Transition name="fade">
          <div v-if="ts.lastAdvance.value" class="fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-sm z-50">
            <h4 class="font-bold text-green-700 mb-2">Promotion terminee</h4>
            <p class="text-sm text-gray-600 mb-2">{{ ts.lastAdvance.value.qualified.length }} qualifie(s), {{ ts.lastAdvance.value.eliminated.length }} elimine(s)</p>
            <div v-if="ts.lastAdvance.value.isFinished" class="text-sm font-bold text-amber-600">
              Le tournoi est termine ! Consultez le podium.
            </div>
          </div>
        </Transition>
      </template>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useTournamentStore } from '~/stores/tournaments';
import TournamentTree from '~/components/tournament/TournamentTree.vue';

definePageMeta({ middleware: 'auth' });

const store = useTournamentStore();
const moduleStore = useModuleStore();
const ts = useTournamentSocket();
const route = useRoute();
const id = route.params.id as string;

const activeTab = ref('bracket');
const advancing = ref(false);
const shareCopied = ref(false);
const modulesList = computed(() => moduleStore.modules);

const tabs = [
  { id: 'bracket', label: 'Bracket' },
  { id: 'participants', label: 'Participants' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Parametres' },
];

const regForm = reactive({ firstName: '', lastName: '', email: '', establishment: '' });
const editForm = reactive({ title: '', description: '' });
const kpis = ref<any>(null);
const kpiLoading = ref(false);

// Use live socket data if connected, fallback to store
const liveBracket = computed(() => ts.bracket.value || []);
const livePodium = computed(() => ts.podium.value);

const activeRound = computed(() => {
  const t = ts.tournament.value || store.current;
  if (!t) return null;
  return t.rounds[t.currentRound] || null;
});

const isLastRound = computed(() => {
  const t = ts.tournament.value || store.current;
  if (!t) return false;
  return t.currentRound >= t.rounds.length - 1;
});

onMounted(async () => {
  await store.fetchTournament(id);
  moduleStore.fetchModules();
  if (store.current) {
    editForm.title = store.current.title;
    editForm.description = store.current.description;
    await store.fetchBracket(id);

    // Connect socket as admin
    const session = useCookie<{ token: string } | null>('__session').value;
    const token = session?.token || useCookie('auth_token').value;
    if (token) {
      ts.connectAdmin(id, token as string);
    }
  }
});

async function changeStatus(status: string) {
  await store.updateTournament(id, { status } as any);
  await store.fetchTournament(id);
}

// Live socket actions (broadcast to all spectators)
async function handleStartRoundLive() {
  if (store.current?.status === 'registration') {
    await changeStatus('active');
  }
  if (ts.connected.value) {
    ts.emitStartRound();
  } else {
    await store.startRound(id);
    await store.fetchBracket(id);
  }
}

async function handleAdvanceLive() {
  advancing.value = true;
  try {
    if (ts.connected.value) {
      ts.emitAdvance();
      // Socket will update bracket via events
    } else {
      await store.advanceRound(id);
      await store.fetchBracket(id);
      await store.fetchTournament(id);
    }
  } finally {
    // Small delay to let socket events arrive
    setTimeout(() => { advancing.value = false; }, 1500);
  }
}

async function handleRegister() {
  await store.registerParticipant(id, { ...regForm } as any);
  regForm.firstName = '';
  regForm.lastName = '';
  regForm.email = '';
  regForm.establishment = '';
}

async function handleSave() {
  await store.updateTournament(id, editForm as any);
}

async function handleSaveRounds() {
  if (!store.current) return;
  const rounds = store.current.rounds.map((r: any) => ({
    order: r.order,
    label: r.label,
    module_id: r.module_id,
    section_index: r.section_index ?? null,
    promoteTopX: r.promoteTopX,
    status: r.status,
  }));
  await store.updateTournament(id, { rounds } as any);
  await store.fetchTournament(id);
}

function getModuleSections(moduleId: string | null) {
  if (!moduleId) return [];
  const mod = modulesList.value.find((m: any) => m._id === moduleId);
  return mod?.sections || [];
}

// Load KPIs when analytics tab is selected
watch(activeTab, async (tab) => {
  if (tab === 'analytics' && !kpis.value) {
    kpiLoading.value = true;
    try {
      const { apiFetch } = useApi();
      const { data } = await apiFetch<any>(`/analytics/tournament-kpis/${id}`);
      kpis.value = data;
    } catch {
      // KPIs not available
    } finally {
      kpiLoading.value = false;
    }
  }
});

function copyShareLink() {
  if (!store.current?.shareToken) return;
  const url = `${window.location.origin}/tournament/${store.current.shareToken}`;
  navigator.clipboard.writeText(url);
  shareCopied.value = true;
  setTimeout(() => { shareCopied.value = false; }, 2000);
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    registration: 'bg-blue-100 text-blue-700',
    active: 'bg-amber-100 text-amber-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  };
  return map[status] || map.draft;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    draft: 'Brouillon',
    registration: 'Inscriptions',
    active: 'En cours',
    completed: 'Termine',
    cancelled: 'Annule',
  };
  return map[status] || status;
}

function participantBadge(status: string) {
  const map: Record<string, string> = {
    registered: 'bg-blue-100 text-blue-700',
    qualified: 'bg-green-100 text-green-700',
    eliminated: 'bg-red-100 text-red-600',
    winner: 'bg-yellow-100 text-yellow-700',
    disqualified: 'bg-gray-200 text-gray-500',
  };
  return map[status] || map.registered;
}

function participantLabel(status: string) {
  const map: Record<string, string> = {
    registered: 'Inscrit',
    qualified: 'Qualifie',
    eliminated: 'Elimine',
    winner: 'Gagnant',
    disqualified: 'Disqualifie',
  };
  return map[status] || status;
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
