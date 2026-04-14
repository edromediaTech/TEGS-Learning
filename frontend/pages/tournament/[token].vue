<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900 text-white">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-400">Chargement du tournoi...</p>
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="text-6xl mb-4 opacity-50">&#127942;</div>
        <h1 class="text-2xl font-bold mb-2">Tournoi introuvable</h1>
        <p class="text-gray-400">{{ error }}</p>
      </div>
    </div>

    <!-- Tournament page -->
    <div v-else-if="tournament" class="max-w-2xl mx-auto px-4 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mb-4"
          :class="statusClass">
          {{ statusText }}
        </div>
        <h1 class="text-3xl md:text-4xl font-extrabold mb-3">{{ tournament.title }}</h1>
        <p v-if="tournament.description" class="text-gray-300 text-lg">{{ tournament.description }}</p>
      </div>

      <!-- Stats cards -->
      <div class="grid grid-cols-3 gap-4 mb-8">
        <div class="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
          <div class="text-2xl font-black text-amber-400">{{ tournament.rounds.length }}</div>
          <div class="text-xs text-gray-400 mt-1">Round{{ tournament.rounds.length > 1 ? 's' : '' }}</div>
        </div>
        <div class="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
          <div class="text-2xl font-black text-blue-400">{{ participantCount }}</div>
          <div class="text-xs text-gray-400 mt-1">Inscrits</div>
        </div>
        <div class="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
          <div class="text-2xl font-black" :class="tournament.registrationFee > 0 ? 'text-green-400' : 'text-gray-300'">
            {{ tournament.registrationFee > 0 ? `${tournament.registrationFee} ${tournament.currency}` : 'Gratuit' }}
          </div>
          <div class="text-xs text-gray-400 mt-1">Inscription</div>
        </div>
      </div>

      <!-- Rounds pipeline -->
      <div class="bg-white/5 backdrop-blur rounded-2xl p-5 mb-8">
        <h3 class="text-sm font-bold text-gray-400 uppercase mb-3">Pipeline eliminatoire</h3>
        <div class="space-y-3">
          <div v-for="round in tournament.rounds" :key="round.order"
            class="flex items-center space-x-3 bg-white/5 rounded-xl p-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="{
                'bg-green-500/30 text-green-300': round.status === 'completed',
                'bg-amber-500/30 text-amber-300 animate-pulse': round.status === 'active',
                'bg-gray-500/20 text-gray-500': round.status === 'pending',
              }">
              {{ round.order }}
            </div>
            <div class="flex-1">
              <div class="font-medium">{{ round.label }}</div>
              <div class="text-xs text-gray-500">Top {{ round.promoteTopX }} qualifies</div>
            </div>
            <span v-if="round.status === 'completed'" class="text-xs text-green-400 font-bold">TERMINE</span>
            <span v-else-if="round.status === 'active'" class="text-xs text-amber-400 font-bold">EN COURS</span>
          </div>
        </div>
      </div>

      <!-- Prizes -->
      <div v-if="tournament.prizes && tournament.prizes.length > 0" class="bg-white/5 backdrop-blur rounded-2xl p-5 mb-8">
        <h3 class="text-sm font-bold text-gray-400 uppercase mb-3">Dotation des primes</h3>
        <div class="space-y-2">
          <div v-for="prize in tournament.prizes" :key="prize.rank"
            class="flex items-center space-x-3 bg-white/5 rounded-xl p-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              :class="{
                'bg-yellow-500/30 text-yellow-300': prize.rank === 1,
                'bg-gray-400/30 text-gray-300': prize.rank === 2,
                'bg-orange-500/30 text-orange-300': prize.rank === 3,
                'bg-gray-500/20 text-gray-500': prize.rank > 3,
              }">
              {{ prize.rank }}
            </div>
            <div class="flex-1 font-medium">{{ prize.label || `${prize.rank}e place` }}</div>
            <div class="font-bold text-green-400">{{ prize.amount }} {{ prize.currency || tournament.currency }}</div>
          </div>
        </div>
      </div>

      <!-- Link to rules -->
      <div class="text-center mb-6">
        <NuxtLink :to="`/tournament/${token}/rules`"
          class="inline-flex items-center text-sm text-amber-400 hover:text-amber-300 font-medium">
          Voir le reglement complet et les modalites &#8594;
        </NuxtLink>
      </div>

      <!-- Spots left -->
      <div v-if="spotsLeft !== null && spotsLeft <= 20" class="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-6 text-center">
        <span class="text-red-300 font-bold text-sm">
          {{ spotsLeft === 0 ? 'COMPLET — plus de places disponibles' : `Plus que ${spotsLeft} place${spotsLeft > 1 ? 's' : ''} !` }}
        </span>
      </div>

      <!-- ============================================================= -->
      <!-- Step 1: Registration form -->
      <!-- ============================================================= -->
      <div v-if="step === 'register' && canRegister" class="bg-white/10 backdrop-blur rounded-2xl p-6">
        <h2 class="text-xl font-bold mb-4">Inscription</h2>
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Prenom *</label>
              <input v-model="form.firstName" type="text" required
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                placeholder="Jean" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Nom *</label>
              <input v-model="form.lastName" type="text" required
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                placeholder="Baptiste" />
            </div>
          </div>
          <div>
            <label class="block text-xs text-gray-400 mb-1">Email *</label>
            <input v-model="form.email" type="email" required
              class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
              placeholder="jean@ecole.ht" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-gray-400 mb-1">Telephone</label>
              <input v-model="form.phone" type="tel"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                placeholder="+509 xxxx xxxx" />
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Etablissement</label>
              <input v-model="form.establishment" type="text"
                class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                placeholder="Lycee National de..." />
            </div>
          </div>

          <!-- Code parrainage -->
          <div v-if="tournament.registrationFee > 0">
            <label class="block text-xs text-gray-400 mb-1">Code de parrainage (optionnel)</label>
            <input v-model="form.sponsorCode" type="text"
              class="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none font-mono uppercase"
              placeholder="BOURSE-XXXXXXXX" />
            <p v-if="sponsorValid" class="text-green-400 text-xs mt-1">
              Parrainee par {{ sponsorValid.sponsorName }} ({{ sponsorValid.remaining }} places restantes)
            </p>
          </div>

          <div v-if="regError" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
            {{ regError }}
          </div>

          <button type="submit" :disabled="submitting"
            class="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-xl font-bold text-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50">
            {{ submitting ? 'Inscription...' : tournament.registrationFee > 0 ? `S'inscrire — ${tournament.registrationFee} ${tournament.currency}` : "S'inscrire gratuitement" }}
          </button>
        </form>
      </div>

      <!-- Inscriptions fermées -->
      <div v-if="!canRegister && step === 'register'" class="bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
        <div class="text-4xl mb-3 opacity-50">&#128274;</div>
        <h2 class="text-xl font-bold mb-2">Inscriptions fermees</h2>
        <p class="text-gray-400">Ce tournoi n'accepte plus de nouvelles inscriptions.</p>
      </div>

      <!-- ============================================================= -->
      <!-- Step 2: Payment selection -->
      <!-- ============================================================= -->
      <div v-if="step === 'payment'" class="bg-white/10 backdrop-blur rounded-2xl p-6">
        <h2 class="text-xl font-bold mb-2">Paiement</h2>
        <p class="text-gray-400 text-sm mb-6">
          Choisissez votre methode de paiement pour confirmer votre inscription.
        </p>

        <div class="space-y-3">
          <!-- MonCash -->
          <button @click="handlePayment('moncash')" :disabled="paying"
            class="w-full flex items-center space-x-4 bg-[#e31837]/20 border border-[#e31837]/40 hover:bg-[#e31837]/30 rounded-xl p-4 transition-colors text-left">
            <div class="w-12 h-12 bg-[#e31837] rounded-xl flex items-center justify-center font-bold text-lg shrink-0">MC</div>
            <div class="flex-1">
              <div class="font-bold">MonCash</div>
              <div class="text-xs text-gray-400">Digicel — Paiement mobile</div>
            </div>
            <div class="text-amber-400 font-bold">{{ tournament.registrationFee }} {{ tournament.currency }}</div>
          </button>

          <!-- Natcash -->
          <button @click="handlePayment('natcash')" :disabled="paying"
            class="w-full flex items-center space-x-4 bg-[#00a651]/20 border border-[#00a651]/40 hover:bg-[#00a651]/30 rounded-xl p-4 transition-colors text-left">
            <div class="w-12 h-12 bg-[#00a651] rounded-xl flex items-center justify-center font-bold text-lg shrink-0">NC</div>
            <div class="flex-1">
              <div class="font-bold">Natcash</div>
              <div class="text-xs text-gray-400">Natcom — Paiement mobile</div>
            </div>
            <div class="text-amber-400 font-bold">{{ tournament.registrationFee }} {{ tournament.currency }}</div>
          </button>
        </div>

        <div v-if="payError" class="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
          {{ payError }}
        </div>

        <div v-if="paying" class="mt-4 text-center text-gray-400 text-sm">
          <div class="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          Redirection vers le paiement...
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- Step 3: Ticket (success) -->
      <!-- ============================================================= -->
      <div v-if="step === 'ticket'" class="text-center">
        <div class="bg-white/10 backdrop-blur rounded-2xl p-8">
          <div class="text-5xl mb-4">&#127915;</div>
          <h2 class="text-2xl font-extrabold mb-2">Inscription confirmee !</h2>
          <p class="text-gray-300 mb-6">Votre ticket d'acces au tournoi</p>

          <!-- QR Code -->
          <div v-if="ticketQR" class="bg-white rounded-2xl p-4 inline-block mb-4">
            <img :src="ticketQR" alt="QR Code" class="w-48 h-48 mx-auto" />
          </div>

          <!-- Token -->
          <div class="bg-white/10 rounded-xl p-4 mb-6">
            <div class="text-xs text-gray-400 mb-1">Votre code de competition</div>
            <div class="text-2xl font-mono font-black text-amber-400 tracking-wider">{{ ticketToken }}</div>
          </div>

          <p class="text-sm text-gray-400">
            Conservez ce code — il sera demande le jour du concours.<br>
            Un email de confirmation a ete envoye.
          </p>
        </div>
      </div>

      <!-- ============================================================= -->
      <!-- Step 4: Waiting for payment -->
      <!-- ============================================================= -->
      <div v-if="step === 'waiting'" class="text-center">
        <div class="bg-white/10 backdrop-blur rounded-2xl p-8">
          <div class="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 class="text-xl font-bold mb-2">En attente de paiement...</h2>
          <p class="text-gray-400 text-sm mb-4">Completez le paiement dans l'application {{ paymentProvider === 'moncash' ? 'MonCash' : 'Natcash' }}</p>
          <button @click="checkPayment"
            class="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-6 py-3 rounded-xl font-medium hover:bg-amber-500/30 transition-colors">
            Verifier le paiement
          </button>
          <div v-if="checkError" class="mt-3 text-sm text-red-300">{{ checkError }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const config = useRuntimeConfig();
const token = route.params.token as string;

const loading = ref(true);
const error = ref('');
const tournament = ref<any>(null);
const participantCount = ref(0);
const spotsLeft = ref<number | null>(null);

const step = ref<'register' | 'payment' | 'waiting' | 'ticket'>('register');
const submitting = ref(false);
const paying = ref(false);
const regError = ref('');
const payError = ref('');
const checkError = ref('');

const participantId = ref('');
const ticketToken = ref('');
const ticketQR = ref('');
const transactionId = ref('');
const paymentProvider = ref('');

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  establishment: '',
  sponsorCode: '',
});

const sponsorValid = ref<any>(null);
const baseURL = config.public.apiBase as string;

// Valider le code parrainage en temps réel
watch(() => form.sponsorCode, async (code) => {
  if (!code || code.length < 6) { sponsorValid.value = null; return; }
  try {
    const data = await $fetch<any>(`${baseURL}/sponsorship/validate-code`, {
      method: 'POST',
      body: { code, tournament_id: tournament.value?._id },
    });
    sponsorValid.value = data.valid ? data.pack : null;
  } catch {
    sponsorValid.value = null;
  }
}, { debounce: 500 } as any);

const canRegister = computed(() => {
  if (!tournament.value) return false;
  if (!['draft', 'registration'].includes(tournament.value.status)) return false;
  if (spotsLeft.value === 0) return false;
  return true;
});

const statusClass = computed(() => {
  const map: Record<string, string> = {
    draft: 'bg-gray-500/30 text-gray-300',
    registration: 'bg-blue-500/30 text-blue-300',
    active: 'bg-amber-500/30 text-amber-300',
    completed: 'bg-green-500/30 text-green-300',
  };
  return map[tournament.value?.status] || map.draft;
});

const statusText = computed(() => {
  const map: Record<string, string> = {
    draft: 'Bientot',
    registration: 'Inscriptions ouvertes',
    active: 'En cours',
    completed: 'Termine',
  };
  return map[tournament.value?.status] || '';
});

onMounted(async () => {
  try {
    const res = await $fetch<any>(`${baseURL}/tournaments/public/${token}`);
    tournament.value = res.tournament;
    participantCount.value = res.participantCount;
    spotsLeft.value = res.spotsLeft;
  } catch (e: any) {
    error.value = 'Ce tournoi n\'existe pas ou n\'est plus disponible.';
  } finally {
    loading.value = false;
  }
});

async function handleRegister() {
  submitting.value = true;
  regError.value = '';
  try {
    const res = await $fetch<any>(`${baseURL}/tournaments/public/${token}/register`, {
      method: 'POST',
      body: form,
    });

    participantId.value = res.participant_id;
    ticketToken.value = res.competitionToken;
    ticketQR.value = res.qrCode;

    if (res.paid) {
      step.value = 'ticket';
    } else {
      step.value = 'payment';
    }
  } catch (e: any) {
    const data = e.data || e.response?._data;
    if (data?.competitionToken) {
      // Déjà inscrit
      ticketToken.value = data.competitionToken;
      ticketQR.value = data.qrCode || '';
      participantId.value = data.participant_id || '';
      if (data.paid) {
        step.value = 'ticket';
      } else {
        step.value = 'payment';
      }
    } else {
      regError.value = data?.error || 'Erreur lors de l\'inscription';
    }
  } finally {
    submitting.value = false;
  }
}

async function handlePayment(provider: string) {
  paying.value = true;
  payError.value = '';
  paymentProvider.value = provider;
  try {
    const res = await $fetch<any>(`${baseURL}/payment/initiate`, {
      method: 'POST',
      body: {
        participant_id: participantId.value,
        provider,
      },
    });

    transactionId.value = res.transaction_id;

    // Ouvrir la page de paiement dans un nouvel onglet
    window.open(res.paymentUrl, '_blank');

    // Passer en mode attente
    step.value = 'waiting';
  } catch (e: any) {
    const data = e.data || e.response?._data;
    payError.value = data?.error || 'Erreur lors de l\'initiation du paiement';
  } finally {
    paying.value = false;
  }
}

async function checkPayment() {
  checkError.value = '';
  try {
    const res = await $fetch<any>(`${baseURL}/payment/verify/${transactionId.value}`);

    if (res.status === 'completed') {
      ticketToken.value = res.competitionToken;
      ticketQR.value = res.qrCode;
      step.value = 'ticket';
    } else if (res.status === 'failed') {
      checkError.value = 'Le paiement a echoue. Veuillez reessayer.';
      step.value = 'payment';
    } else {
      checkError.value = 'Paiement toujours en attente. Reessayez dans un instant.';
    }
  } catch (e: any) {
    checkError.value = 'Impossible de verifier le paiement';
  }
}

// SEO / OpenGraph
useHead(() => ({
  title: tournament.value ? `${tournament.value.title} | TEGS-Arena` : 'TEGS-Arena',
  meta: [
    { name: 'description', content: tournament.value ? `Inscrivez-vous au concours ${tournament.value.title}. ${tournament.value.rounds?.length || 0} rounds eliminatoires.` : '' },
    { property: 'og:title', content: tournament.value?.title || 'TEGS-Arena' },
    { property: 'og:description', content: tournament.value ? `${tournament.value.registrationFee > 0 ? tournament.value.registrationFee + ' ' + tournament.value.currency : 'Gratuit'} — ${participantCount.value} participants` : '' },
    { property: 'og:image', content: tournament.value?.coverImage || '' },
    { property: 'og:type', content: 'website' },
  ],
}));
</script>
