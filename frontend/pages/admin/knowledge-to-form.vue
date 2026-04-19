<template>
  <NuxtLayout name="admin">
    <div class="max-w-5xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Generer un quiz depuis un document</h1>
        <p class="text-gray-500 mt-1 text-sm">
          Transformez un PDF, un document Word ou une page web en banque de questions ou en formulaire pre-rempli.
          Vous revisez toujours le resultat avant l'enregistrement.
        </p>
      </div>

      <FormGenerationWizard @saved="onSaved" />

      <div v-if="lastSaved" class="mt-6 bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800 flex items-start gap-3">
        <span class="text-lg">&#x2705;</span>
        <div class="flex-1">
          <p class="font-medium">Brouillon "{{ lastSaved.title }}" enregistre.</p>
          <p v-if="lastSaved.tournamentId" class="text-green-700 mt-1">
            Le tournoi brouillon est pret. Ouvrez-le dans
            <NuxtLink to="/admin/tournaments" class="underline font-medium">Tournois</NuxtLink>
            pour fixer les prix, les dates et publier. Le module associe est visible dans le
            <NuxtLink :to="`/admin/modules/${lastSaved.moduleId}/structure`" class="underline font-medium">Studio</NuxtLink>.
          </p>
          <p v-else class="text-green-700 mt-1">
            Retrouvez-le dans le
            <NuxtLink :to="`/admin/modules/${lastSaved.moduleId}/structure`" class="underline font-medium">Studio</NuxtLink>
            pour le publier ou l'attacher a un tournoi.
          </p>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const auth = useAuthStore();

if (process.client && !(auth.isSuperAdmin || auth.isAdmin)) {
  navigateTo('/admin/modules');
}

const lastSaved = ref<{ moduleId: string; tournamentId?: string; title: string } | null>(null);

function onSaved(payload: { moduleId: string; tournamentId?: string; title: string }) {
  lastSaved.value = payload;
}
</script>
