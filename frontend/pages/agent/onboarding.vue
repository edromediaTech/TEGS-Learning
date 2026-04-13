<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white flex items-center justify-center px-4">
    <div class="max-w-lg w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
          <span class="text-3xl font-black">$</span>
        </div>
        <h1 class="text-2xl font-extrabold">Bienvenue, Agent TEGS-Arena</h1>
        <p class="text-gray-400 mt-2">Avant de commencer, veuillez lire et accepter le contrat de partenariat.</p>
      </div>

      <!-- Contract summary -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 max-h-[50vh] overflow-y-auto text-sm text-gray-300 space-y-4">
        <h3 class="font-bold text-white text-base">Contrat de Partenariat — Agent de Collecte Autorise</h3>

        <div>
          <h4 class="font-bold text-amber-400">Article 1 : Objet</h4>
          <p>Vous etes autorise(e) a collecter les frais d'inscription en especes pour les concours TEGS-Arena.</p>
        </div>

        <div>
          <h4 class="font-bold text-amber-400">Article 2 : Caution et Quota</h4>
          <p>Votre caution definit la limite maximale de collecte. Le systeme vous bloquera automatiquement si le quota est atteint.</p>
        </div>

        <div>
          <h4 class="font-bold text-amber-400">Article 3 : Commissions</h4>
          <p>Vous percevez une commission automatique sur chaque transaction. Le taux est fixe par l'administrateur.</p>
        </div>

        <div>
          <h4 class="font-bold text-amber-400">Article 4 : Obligations</h4>
          <p>Vous devez verifier l'identite des participants, reverser les fonds regulierement, et accompagner chaque versement du bordereau PDF genere par l'application.</p>
        </div>

        <div>
          <h4 class="font-bold text-amber-400">Article 5 : Securite</h4>
          <p>Toute fraude entrainera la desactivation immediate de votre compte et des poursuites legales.</p>
        </div>

        <div>
          <h4 class="font-bold text-amber-400">Article 6 : Duree</h4>
          <p>Contrat de 12 mois renouvelable. La Plateforme peut desactiver votre compte a tout moment.</p>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-3">
        <a :href="`${config.public.apiBase}/payment/agent/contract-pdf`"
          target="_blank"
          class="block text-center bg-white/10 hover:bg-white/20 py-3 rounded-xl text-sm font-medium transition-colors">
          Telecharger le contrat complet (PDF)
        </a>

        <label class="flex items-start space-x-3 bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer">
          <input v-model="accepted" type="checkbox"
            class="mt-0.5 w-5 h-5 rounded border-gray-400 text-emerald-500 focus:ring-emerald-400" />
          <span class="text-sm text-gray-300">
            J'ai lu et j'accepte les termes du contrat de partenariat Agent TEGS-Arena.
            Je comprends mes obligations financieres et les regles de securite.
          </span>
        </label>

        <button @click="handleAccept" :disabled="!accepted || submitting"
          class="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-40">
          {{ submitting ? 'Validation...' : 'Accepter et commencer' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const { apiFetch } = useApi();
const router = useRouter();

const accepted = ref(false);
const submitting = ref(false);

async function handleAccept() {
  submitting.value = true;
  try {
    await apiFetch('/payment/agent/accept-contract', { method: 'POST' });
    router.push('/agent/collection');
  } catch (e: any) {
    alert(e.data?.error || 'Erreur lors de l\'acceptation');
  } finally {
    submitting.value = false;
  }
}
</script>
