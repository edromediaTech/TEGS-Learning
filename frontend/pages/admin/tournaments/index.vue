<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-extrabold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">Tournois</h1>
          <p class="text-gray-500 mt-1">Organisez des competitions eliminatoires avec classement et primes</p>
        </div>
        <NuxtLink
          to="/admin/tournaments/new"
          class="bg-gradient-to-r from-amber-600 to-orange-500 text-white px-6 py-3 rounded-xl hover:from-amber-700 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2 font-bold"
        >
          <span class="text-xl">+</span>
          <span>Creer un tournoi</span>
        </NuxtLink>
      </div>

      <!-- Error -->
      <div v-if="store.error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        {{ store.error }}
      </div>

      <!-- Loading -->
      <div v-if="store.loading" class="text-center py-12 text-gray-500">
        Chargement...
      </div>

      <!-- Empty -->
      <div v-else-if="store.tournaments.length === 0" class="text-center py-12">
        <div class="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-4xl text-amber-400">&#127942;</span>
        </div>
        <p class="text-gray-400 text-lg mb-4">Aucun tournoi pour le moment</p>
        <NuxtLink to="/admin/tournaments/new" class="text-amber-600 hover:text-amber-800 font-medium">
          Creer votre premier tournoi
        </NuxtLink>
      </div>

      <!-- Filters -->
      <div v-else>
        <div class="flex items-center space-x-2 mb-6">
          <button
            v-for="tab in statusTabs"
            :key="tab.value"
            @click="activeFilter = tab.value"
            class="px-4 py-2 rounded-full text-sm font-medium transition-all"
            :class="activeFilter === tab.value
              ? 'bg-amber-100 text-amber-800 shadow-sm'
              : 'text-gray-500 hover:bg-gray-100'"
          >
            {{ tab.label }}
            <span class="ml-1 text-xs opacity-60">({{ tab.count }})</span>
          </button>
        </div>

        <!-- Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="t in filteredTournaments"
            :key="t._id"
            class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
          >
            <!-- Top gradient bar -->
            <div class="h-3" :class="statusGradient(t.status)"></div>

            <div class="p-5">
              <!-- Status badge -->
              <div class="flex items-center justify-between mb-3">
                <span
                  class="px-2.5 py-1 text-[10px] font-bold rounded-full uppercase"
                  :class="statusBadge(t.status)"
                >
                  {{ statusLabel(t.status) }}
                </span>
                <span class="text-xs text-gray-400">
                  {{ t.rounds?.length || 0 }} round{{ (t.rounds?.length || 0) > 1 ? 's' : '' }}
                </span>
              </div>

              <h3 class="text-lg font-bold text-gray-900 mb-1">{{ t.title }}</h3>
              <p class="text-sm text-gray-500 mb-4 line-clamp-2">
                {{ t.description || 'Aucune description' }}
              </p>

              <!-- Stats row -->
              <div class="flex items-center text-xs space-x-3 mb-4">
                <span class="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                  <span class="font-medium">{{ t.participantCount || 0 }} inscrits</span>
                </span>
                <span v-if="t.registrationFee > 0" class="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
                  <span class="font-medium">{{ t.registrationFee }} {{ t.currency }}</span>
                </span>
                <span v-else class="flex items-center space-x-1 px-2 py-1 bg-gray-50 text-gray-500 rounded-full">
                  <span class="font-medium">Gratuit</span>
                </span>
              </div>

              <!-- Rounds progress -->
              <div class="flex items-center space-x-1 mb-4">
                <div
                  v-for="(round, i) in t.rounds"
                  :key="i"
                  class="flex-1 h-2 rounded-full"
                  :class="{
                    'bg-green-400': round.status === 'completed',
                    'bg-amber-400 animate-pulse': round.status === 'active',
                    'bg-gray-200': round.status === 'pending',
                  }"
                  :title="`${round.label} — ${round.status}`"
                ></div>
              </div>

              <!-- Actions -->
              <div class="flex items-center space-x-2">
                <NuxtLink
                  :to="`/admin/tournaments/${t._id}`"
                  class="flex-1 text-center py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
                >
                  Gerer
                </NuxtLink>
                <button
                  v-if="t.status === 'draft'"
                  @click="deleteTournament(t._id)"
                  class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  &#128465;
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { useTournamentStore } from '~/stores/tournaments';

definePageMeta({ middleware: 'auth' });

const store = useTournamentStore();
const activeFilter = ref('all');

onMounted(() => {
  store.fetchTournaments();
});

const statusTabs = computed(() => [
  { label: 'Tous', value: 'all', count: store.tournaments.length },
  { label: 'Brouillons', value: 'draft', count: store.draftTournaments.length },
  { label: 'Inscriptions', value: 'registration', count: store.registrationOpen.length },
  { label: 'En cours', value: 'active', count: store.activeTournaments.length },
  { label: 'Termines', value: 'completed', count: store.completedTournaments.length },
]);

const filteredTournaments = computed(() => {
  if (activeFilter.value === 'all') return store.tournaments;
  return store.tournaments.filter((t) => t.status === activeFilter.value);
});

function statusGradient(status: string) {
  const map: Record<string, string> = {
    draft: 'bg-gradient-to-r from-gray-300 to-gray-400',
    registration: 'bg-gradient-to-r from-blue-400 to-blue-500',
    active: 'bg-gradient-to-r from-amber-400 to-orange-500',
    completed: 'bg-gradient-to-r from-green-400 to-emerald-500',
    cancelled: 'bg-gradient-to-r from-red-400 to-red-500',
  };
  return map[status] || map.draft;
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

async function deleteTournament(id: string) {
  if (!confirm('Supprimer ce tournoi ?')) return;
  await store.deleteTournament(id);
}
</script>
