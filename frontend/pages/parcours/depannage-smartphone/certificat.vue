<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100 py-8 px-4">
    <div class="max-w-5xl mx-auto">
      <!-- Toolbar (cache a l'impression) -->
      <div class="flex items-center justify-between mb-6 print:hidden">
        <NuxtLink to="/parcours/depannage-smartphone" class="text-sm text-primary-600 hover:underline">
          &larr; Retour au parcours
        </NuxtLink>
        <button
          @click="print"
          class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm font-bold rounded-md hover:from-indigo-700 hover:to-blue-600 shadow"
        >
          🖨 Imprimer / Sauvegarder en PDF
        </button>
      </div>

      <!-- Certificat -->
      <div
        ref="certEl"
        class="cert-page mx-auto bg-white rounded-lg shadow-xl border-8 border-double border-amber-700 print:border-amber-700 print:shadow-none p-12 relative"
        style="aspect-ratio: 297/210;"
      >
        <!-- Coins decoratifs -->
        <div class="absolute top-3 left-3 w-12 h-12 border-t-4 border-l-4 border-amber-600 rounded-tl-lg"></div>
        <div class="absolute top-3 right-3 w-12 h-12 border-t-4 border-r-4 border-amber-600 rounded-tr-lg"></div>
        <div class="absolute bottom-3 left-3 w-12 h-12 border-b-4 border-l-4 border-amber-600 rounded-bl-lg"></div>
        <div class="absolute bottom-3 right-3 w-12 h-12 border-b-4 border-r-4 border-amber-600 rounded-br-lg"></div>

        <div class="text-center flex flex-col h-full">
          <!-- En-tete -->
          <div class="flex items-center justify-center gap-4 mb-2">
            <div class="text-5xl">🎓</div>
            <div>
              <p class="text-xs uppercase tracking-widest text-amber-700 font-bold">
                Centre de Ressources Numériques et de Simulation
              </p>
              <p class="text-[11px] text-gray-500">DDENE - République d'Haïti</p>
            </div>
          </div>

          <!-- Titre -->
          <h1 class="text-4xl font-extrabold tracking-wide mt-4 mb-1 bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 bg-clip-text text-transparent">
            CERTIFICAT DE COMPLÉTION
          </h1>
          <p class="text-sm text-gray-600 italic mb-6">décerné à</p>

          <!-- Nom -->
          <p class="text-3xl font-serif font-bold text-gray-900 mb-1 underline decoration-amber-500 decoration-2 underline-offset-8">
            {{ studentFullName }}
          </p>
          <p v-if="studentEmail" class="text-xs text-gray-500 mb-6">{{ studentEmail }}</p>

          <!-- Texte principal -->
          <p class="text-base text-gray-800 leading-relaxed max-w-2xl mx-auto mb-4">
            Pour avoir validé avec succès l'intégralité du parcours
          </p>
          <p class="text-2xl font-bold text-indigo-800 mb-6">
            « Dépannage Smartphone »
          </p>
          <p class="text-sm text-gray-700 leading-relaxed max-w-3xl mx-auto mb-2">
            comprenant les modules
            <span class="font-semibold text-gray-900">Sécurité Li-ion</span>,
            <span class="font-semibold text-gray-900">Loi d'Ohm</span>,
            <span class="font-semibold text-gray-900">Anatomie & Diagnostic</span>
            et
            <span class="font-semibold text-gray-900">Assemblage pas-à-pas</span>.
          </p>

          <!-- Spacer -->
          <div class="flex-1"></div>

          <!-- Pied de page : date + ID + signature -->
          <div class="flex items-end justify-between mt-6 pt-4 border-t border-amber-200">
            <div class="text-left text-xs">
              <p class="font-semibold text-gray-700">Délivré le</p>
              <p class="text-gray-900 text-base font-bold">{{ issuedDate }}</p>
              <p class="text-[10px] text-gray-500 mt-1 font-mono">N° {{ certificateId }}</p>
            </div>
            <div class="text-center">
              <div class="w-32 h-12 border-b-2 border-gray-400 flex items-end justify-center pb-1">
                <span class="font-serif italic text-gray-700 text-sm">CRNS / DDENE</span>
              </div>
              <p class="text-[10px] text-gray-500 mt-1">Signature autorisée</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Verification info (cache a l'impression) -->
      <div class="text-center mt-6 text-xs text-gray-500 print:hidden">
        Vérification : ce certificat est lié à ton compte TEGS-Learning et à tes traces xAPI.
        Le numéro <code class="bg-white px-1 rounded">{{ certificateId }}</code>
        peut être croisé avec le dashboard moniteur.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });
useHead({ title: 'Certificat - Dépannage Smartphone' });

const auth = useAuthStore();

const studentFullName = computed(() => {
  if (!auth.user) return 'Élève anonyme';
  const first = (auth.user.firstName || '').trim();
  const last = (auth.user.lastName || '').trim();
  const full = `${first} ${last}`.trim();
  return full || auth.user.email || 'Élève';
});

const studentEmail = computed(() => auth.user?.email || '');

const issuedDate = computed(() =>
  new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
);

// ID stable lie a l'eleve + parcours (deterministe, pas une vraie signature mais
// permet de croiser avec les traces xAPI cote moniteur)
const certificateId = computed(() => {
  const seed = `${auth.user?.id || 'anon'}-depannage-smartphone-v1`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  return `CRNS-DEP-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
});

const certEl = ref<HTMLElement | null>(null);
function print() {
  window.print();
}
</script>

<style scoped>
.cert-page {
  width: 100%;
  max-width: 1100px;
  min-height: 700px;
}

@media print {
  @page { size: A4 landscape; margin: 0; }
  body { background: white !important; }
  .cert-page {
    box-shadow: none !important;
    border-radius: 0 !important;
    width: 100vw !important;
    max-width: none !important;
    height: 100vh !important;
    page-break-after: always;
  }
}
</style>
