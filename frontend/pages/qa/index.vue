<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-6 lg:p-10">
    <p class="text-xs uppercase tracking-wider text-slate-400">Assurance qualité</p>
    <h1 class="text-2xl font-bold mt-1">Composants 3D</h1>
    <p class="text-sm text-slate-300 mt-2">
      Un composant n'entre au catalogue des cours qu'après le linter automatique puis la revue humaine.
    </p>
    <div class="flex flex-wrap gap-2 mt-5">
      <button v-for="s in FILTERS" :key="s.value" class="rounded-full px-3 py-1 text-sm"
              :class="filter === s.value ? 'bg-amber-400 text-slate-900' : 'bg-slate-700'" @click="filter = s.value">{{ s.label }}</button>
    </div>
    <p v-if="error" class="text-red-300 mt-4">{{ error }}</p>
    <table class="w-full mt-5 text-sm" data-testid="liste">
      <thead class="text-left text-slate-400">
        <tr><th class="py-2">Composant</th><th>Version</th><th>Statut</th><th>Linter</th><th /></tr>
      </thead>
      <tbody>
        <tr v-for="c in shown" :key="c.component_id" class="border-t border-slate-700">
          <td class="py-3"><b>{{ c.title }}</b><br><span class="text-slate-400">{{ c.component_id }}</span></td>
          <td>{{ c.version }}</td>
          <td>{{ c.status }}</td>
          <td :class="c.errors ? 'text-red-300' : 'text-emerald-300'">{{ c.errors ? `${c.errors} erreur(s)` : 'conforme' }}</td>
          <td class="text-right"><NuxtLink :to="`/qa/review/${c.component_id}`" class="rounded-lg bg-blue-600 px-3 py-2">Inspecter</NuxtLink></td>
        </tr>
        <tr v-if="!shown.length"><td colspan="5" class="py-6 text-slate-400">Aucun composant.</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
// Liste des composants 3D et de leur statut QA (DRAFT, CI_PASSED, REVIEW_PENDING, APPROVED, REJECTED).
definePageMeta({ layout: false, middleware: ['auth'] });
useHead({ title: 'Assurance qualité · Composants 3D' });

const FILTERS = [
  { value: '', label: 'Tous' }, { value: 'REVIEW_PENDING', label: 'À inspecter' }, { value: 'CI_PASSED', label: 'Prêts à soumettre' },
  { value: 'DRAFT', label: 'Brouillons' }, { value: 'APPROVED', label: 'Approuvés' }, { value: 'REJECTED', label: 'Rejetés' },
];
const { apiFetch } = useApi();
const items = ref<any[]>([]);
const filter = ref('');
const error = ref('');
const shown = computed(() => items.value.filter((c) => !filter.value || c.status === filter.value));

onMounted(async () => {
  try {
    items.value = (await apiFetch('/v1/components')).data.components;
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Liste indisponible';
  }
});
</script>
