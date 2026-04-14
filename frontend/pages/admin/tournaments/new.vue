<template>
  <div>
    <NuxtLayout name="admin">
      <div class="max-w-3xl mx-auto">
        <!-- Header -->
        <div class="flex items-center space-x-4 mb-8">
          <NuxtLink to="/admin/tournaments" class="text-gray-400 hover:text-gray-600 transition-colors">
            &#8592; Retour
          </NuxtLink>
          <h1 class="text-2xl font-extrabold text-gray-900">Nouveau Tournoi</h1>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleCreate" class="space-y-8">

          <!-- Infos generales -->
          <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">Informations generales</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Titre du tournoi *</label>
                <input v-model="form.title" type="text" required
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                  placeholder="Ex: Concours National de Mathematiques 2026"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea v-model="form.description" rows="3"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none resize-none"
                  placeholder="Decrivez le tournoi..."
                ></textarea>
              </div>
            </div>
          </section>

          <!-- Inscription & Paiement -->
          <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 class="text-lg font-bold text-gray-900 mb-4">Inscription &amp; Paiement</h2>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Frais d'inscription</label>
                <input v-model.number="form.registrationFee" type="number" min="0"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                  placeholder="0 = gratuit"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select v-model="form.currency"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none">
                  <option value="HTG">HTG (Gourde)</option>
                  <option value="USD">USD (Dollar)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Max. participants</label>
                <input v-model.number="form.maxParticipants" type="number" min="0"
                  class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                  placeholder="0 = illimite"
                />
              </div>
            </div>
          </section>

          <!-- Rounds -->
          <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900">Rounds (Pipeline eliminatoire)</h2>
              <button type="button" @click="addRound"
                class="text-sm bg-amber-50 text-amber-700 px-4 py-2 rounded-lg hover:bg-amber-100 font-medium transition-colors">
                + Ajouter un round
              </button>
            </div>

            <div v-if="form.rounds.length === 0" class="text-center py-8 text-gray-400 text-sm">
              Ajoutez au moins un round pour definir le pipeline
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(round, i) in form.rounds"
                :key="i"
                class="flex items-center space-x-3 bg-gray-50 rounded-xl p-4"
              >
                <div class="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  {{ i + 1 }}
                </div>
                <div class="flex-1 grid grid-cols-3 gap-3">
                  <input v-model="round.label" type="text" required
                    class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                    :placeholder="`Round ${i + 1}`"
                  />
                  <select v-model="round.module_id"
                    class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none">
                    <option :value="null">Module (optionnel)</option>
                    <option v-for="m in modules" :key="m._id" :value="m._id">{{ m.title }}</option>
                  </select>
                  <input v-model.number="round.promoteTopX" type="number" min="1" required
                    class="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                    placeholder="Top X qualifies"
                  />
                </div>
                <button type="button" @click="form.rounds.splice(i, 1)"
                  class="text-red-400 hover:text-red-600 transition-colors shrink-0" title="Retirer">
                  &#10005;
                </button>
              </div>
            </div>
          </section>

          <!-- Primes -->
          <section class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900">Dotation des primes</h2>
              <button type="button" @click="addPrize"
                class="text-sm bg-green-50 text-green-700 px-4 py-2 rounded-lg hover:bg-green-100 font-medium transition-colors">
                + Ajouter un rang
              </button>
            </div>

            <div v-if="form.prizes.length === 0" class="text-center py-6 text-gray-400 text-sm">
              Definissez les primes pour le podium (optionnel)
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="(prize, i) in form.prizes"
                :key="i"
                class="flex items-center space-x-3 bg-gray-50 rounded-xl p-4"
              >
                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  :class="{
                    'bg-yellow-100 text-yellow-700': prize.rank === 1,
                    'bg-gray-200 text-gray-600': prize.rank === 2,
                    'bg-orange-100 text-orange-700': prize.rank === 3,
                    'bg-gray-100 text-gray-500': prize.rank > 3,
                  }">
                  {{ prize.rank }}
                </div>
                <input v-model="prize.label" type="text"
                  class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  :placeholder="`Label (ex: Champion)`"
                />
                <input v-model.number="prize.amount" type="number" min="0"
                  class="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 outline-none"
                  placeholder="Montant"
                />
                <span class="text-xs text-gray-400">{{ form.currency }}</span>
                <button type="button" @click="form.prizes.splice(i, 1)"
                  class="text-red-400 hover:text-red-600 transition-colors shrink-0">
                  &#10005;
                </button>
              </div>
            </div>
          </section>

          <!-- Error -->
          <div v-if="errorMsg" class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
            {{ errorMsg }}
          </div>

          <!-- Submit -->
          <div class="flex items-center justify-end space-x-4">
            <NuxtLink to="/admin/tournaments" class="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium">
              Annuler
            </NuxtLink>
            <button
              type="submit"
              :disabled="submitting"
              class="bg-gradient-to-r from-amber-600 to-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:from-amber-700 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50"
            >
              {{ submitting ? 'Creation...' : 'Creer le tournoi' }}
            </button>
          </div>
        </form>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useTournamentStore } from '~/stores/tournaments';
import { useModulesStore } from '~/stores/modules';

definePageMeta({ middleware: 'auth' });

const store = useTournamentStore();
const moduleStore = useModulesStore();
const router = useRouter();
const submitting = ref(false);
const errorMsg = ref('');

const form = reactive({
  title: '',
  description: '',
  registrationFee: 0,
  currency: 'HTG' as 'HTG' | 'USD',
  maxParticipants: 0,
  rounds: [] as { label: string; module_id: string | null; promoteTopX: number }[],
  prizes: [] as { rank: number; label: string; amount: number; currency: 'HTG' | 'USD' }[],
});

const modules = computed(() => moduleStore.modules);

onMounted(() => {
  moduleStore.fetchModules();
});

function addRound() {
  const n = form.rounds.length + 1;
  form.rounds.push({
    label: `Round ${n}`,
    module_id: null,
    promoteTopX: 10,
  });
}

function addPrize() {
  const nextRank = form.prizes.length + 1;
  form.prizes.push({
    rank: nextRank,
    label: nextRank === 1 ? 'Champion' : nextRank === 2 ? 'Finaliste' : `${nextRank}e place`,
    amount: 0,
    currency: form.currency,
  });
}

async function handleCreate() {
  if (form.rounds.length === 0) {
    alert('Ajoutez au moins un round');
    return;
  }
  submitting.value = true;
  try {
    // Nettoyer les rounds : retirer module_id null, forcer promoteTopX en int
    const cleanRounds = form.rounds.map((r) => ({
      label: r.label || `Round`,
      promoteTopX: Math.max(1, r.promoteTopX || 1),
      ...(r.module_id ? { module_id: r.module_id } : {}),
    }));
    const tournament = await store.createTournament({
      title: form.title,
      description: form.description,
      registrationFee: form.registrationFee || 0,
      currency: form.currency,
      maxParticipants: form.maxParticipants || 0,
      rounds: cleanRounds,
      prizes: form.prizes.map((p) => ({ ...p, currency: form.currency })),
    } as any);
    if (tournament) {
      router.push(`/admin/tournaments/${tournament._id}`);
    }
  } catch (e: any) {
    const data = e?.data || e?.response?._data;
    if (data?.errors) {
      errorMsg.value = data.errors.map((err: any) => err.msg).join(', ');
    } else {
      errorMsg.value = data?.error || store.error || 'Erreur lors de la creation';
    }
  } finally {
    submitting.value = false;
  }
}
</script>
