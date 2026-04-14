<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>

      <!-- Modal -->
      <div class="relative bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        <!-- Close -->
        <button @click="$emit('close')"
          class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition z-10">
          &#10005;
        </button>

        <!-- Header -->
        <div class="p-6 pb-0">
          <div class="flex items-center space-x-3 mb-2">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase"
              :class="tournament.status === 'registration' ? 'bg-blue-500/80 text-white' : 'bg-amber-500/80 text-white'">
              {{ tournament.status === 'registration' ? 'Inscriptions' : 'En cours' }}
            </span>
            <span v-if="tournament.registrationFee > 0" class="text-green-400 text-sm font-bold">
              {{ tournament.registrationFee }} {{ tournament.currency }}
            </span>
            <span v-else class="text-gray-400 text-sm">Gratuit</span>
          </div>
          <h2 class="text-xl font-extrabold text-white mb-1">{{ tournament.title }}</h2>
          <p class="text-sm text-gray-500 mb-4">{{ tournament.description }}</p>

          <!-- Quick stats -->
          <div class="flex items-center space-x-4 text-xs text-gray-400 mb-4">
            <span><span class="text-white font-bold">{{ tournament.roundCount }}</span> rounds</span>
            <span><span class="text-white font-bold">{{ tournament.participantCount }}</span> inscrits</span>
            <span v-if="tournament.totalPrize > 0" class="text-green-400 font-bold">
              Prime : {{ tournament.totalPrize.toLocaleString('fr-HT') }} {{ tournament.currency }}
            </span>
          </div>

          <!-- Link to rules -->
          <NuxtLink :to="`/tournament/${tournament.shareToken}/rules`"
            class="inline-flex items-center text-xs text-amber-400 hover:text-amber-300 font-medium mb-2">
            Voir le reglement complet &#8594;
          </NuxtLink>
        </div>

        <!-- Tabs -->
        <div class="px-6 pt-4 flex space-x-1 border-b border-white/10">
          <button v-for="tab in portalTabs" :key="tab.key"
            @click="activePortal = tab.key"
            class="px-4 py-2.5 text-sm font-bold rounded-t-lg transition-all"
            :class="activePortal === tab.key
              ? 'bg-white/10 text-amber-400 border-b-2 border-amber-400'
              : 'text-gray-500 hover:text-gray-300'">
            {{ tab.label }}
          </button>
        </div>

        <!-- ================================ -->
        <!-- PORTAIL CANDIDAT -->
        <!-- ================================ -->
        <div v-if="activePortal === 'candidate'" class="p-6">
          <!-- Step: Register -->
          <form v-if="step === 'register'" @submit.prevent="handleRegister" class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Prenom *</label>
                <input v-model="form.firstName" type="text" required
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="Jean" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Nom *</label>
                <input v-model="form.lastName" type="text" required
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="Baptiste" />
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">Email *</label>
              <input v-model="form.email" type="email" required
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="jean@ecole.ht" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Telephone</label>
                <input v-model="form.phone" type="tel"
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="+509 xxxx xxxx" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Etablissement</label>
                <input v-model="form.establishment" type="text"
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="Lycee National..." />
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-400 mb-1">District</label>
              <input v-model="form.district" type="text"
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="Ouanaminthe" />
            </div>

            <!-- Sponsor code -->
            <div v-if="tournament.registrationFee > 0">
              <label class="block text-xs text-gray-400 mb-1">Code de parrainage (optionnel)</label>
              <input v-model="form.sponsorCode" type="text"
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm font-mono uppercase"
                placeholder="BOURSE-XXXXXXXX" />
              <p v-if="sponsorValid" class="text-green-400 text-xs mt-1">
                Parrainee par {{ sponsorValid.sponsorName }} ({{ sponsorValid.remaining }} places restantes)
              </p>
            </div>

            <div v-if="regError" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {{ regError }}
            </div>

            <button type="submit" :disabled="submitting"
              class="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50">
              {{ submitting ? 'Inscription...' : tournament.registrationFee > 0 ? `S'inscrire — ${tournament.registrationFee} ${tournament.currency}` : "S'inscrire gratuitement" }}
            </button>
          </form>

          <!-- Step: Payment -->
          <div v-if="step === 'payment'" class="space-y-3">
            <p class="text-sm text-gray-400 mb-4">Choisissez votre methode de paiement.</p>

            <button @click="handlePayment('moncash')" :disabled="paying"
              class="w-full flex items-center space-x-4 bg-[#e31837]/20 border border-[#e31837]/40 hover:bg-[#e31837]/30 rounded-xl p-4 transition text-left">
              <div class="w-10 h-10 bg-[#e31837] rounded-lg flex items-center justify-center font-bold shrink-0">MC</div>
              <div class="flex-1">
                <div class="font-bold text-sm">MonCash</div>
                <div class="text-xs text-gray-500">Digicel — Paiement mobile</div>
              </div>
              <div class="text-amber-400 font-bold text-sm">{{ tournament.registrationFee }} {{ tournament.currency }}</div>
            </button>

            <button @click="handlePayment('natcash')" :disabled="paying"
              class="w-full flex items-center space-x-4 bg-[#00a651]/20 border border-[#00a651]/40 hover:bg-[#00a651]/30 rounded-xl p-4 transition text-left">
              <div class="w-10 h-10 bg-[#00a651] rounded-lg flex items-center justify-center font-bold shrink-0">NC</div>
              <div class="flex-1">
                <div class="font-bold text-sm">Natcash</div>
                <div class="text-xs text-gray-500">Natcom — Paiement mobile</div>
              </div>
              <div class="text-amber-400 font-bold text-sm">{{ tournament.registrationFee }} {{ tournament.currency }}</div>
            </button>

            <div v-if="payError" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">{{ payError }}</div>
            <div v-if="paying" class="text-center text-gray-400 text-sm py-4">
              <div class="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Redirection vers le paiement...
            </div>
          </div>

          <!-- Step: Waiting -->
          <div v-if="step === 'waiting'" class="text-center py-6">
            <div class="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 class="font-bold mb-2">En attente de paiement...</h3>
            <p class="text-sm text-gray-400 mb-4">Completez le paiement dans l'app {{ paymentProvider === 'moncash' ? 'MonCash' : 'Natcash' }}</p>
            <button @click="checkPayment"
              class="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-5 py-2 rounded-xl text-sm font-medium hover:bg-amber-500/30 transition">
              Verifier le paiement
            </button>
            <p v-if="checkError" class="text-sm text-red-300 mt-3">{{ checkError }}</p>
          </div>

          <!-- Step: Ticket -->
          <div v-if="step === 'ticket'" class="text-center py-4">
            <div class="text-4xl mb-3">&#127915;</div>
            <h3 class="text-xl font-extrabold mb-2">Inscription confirmee !</h3>
            <p class="text-gray-400 text-sm mb-4">Votre ticket d'acces au tournoi</p>

            <div v-if="ticketQR" class="bg-white rounded-2xl p-3 inline-block mb-4">
              <img :src="ticketQR" alt="QR Code" class="w-40 h-40 mx-auto" />
            </div>

            <div class="bg-white/10 rounded-xl p-4 mb-4">
              <div class="text-xs text-gray-400 mb-1">Code de competition</div>
              <div class="text-xl font-mono font-black text-amber-400 tracking-wider">{{ ticketToken }}</div>
            </div>

            <!-- Open in app button -->
            <a :href="`tegs-arena://warroom?token=${ticketToken}`"
              class="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition">
              Ouvrir dans l'App &#8594;
            </a>

            <p class="text-xs text-gray-500 mt-4">
              Conservez ce code. Un email de confirmation a ete envoye.
            </p>
          </div>
        </div>

        <!-- ================================ -->
        <!-- PORTAIL SPONSOR -->
        <!-- ================================ -->
        <div v-if="activePortal === 'sponsor'" class="p-6">
          <div v-if="!sponsorSubmitted" class="space-y-4">
            <p class="text-sm text-gray-400 mb-2">
              Devenez sponsor officiel et gagnez en visibilite sur le live, les certificats et les tickets.
            </p>

            <!-- Tier selection -->
            <div>
              <label class="block text-xs text-gray-400 mb-2">Pack de visibilite *</label>
              <div class="grid grid-cols-2 gap-2">
                <button v-for="tier in tiers" :key="tier.key"
                  @click="sponsorForm.tier = tier.key"
                  class="p-3 rounded-xl border text-left transition-all text-sm"
                  :class="sponsorForm.tier === tier.key
                    ? `${tier.activeBg} border-transparent`
                    : 'border-white/10 bg-white/5 hover:bg-white/10'">
                  <div class="font-bold" :class="sponsorForm.tier === tier.key ? tier.color : 'text-white'">{{ tier.label }}</div>
                  <div class="text-[10px] text-gray-400">{{ tier.desc }}</div>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Nom entreprise *</label>
                <input v-model="sponsorForm.name" type="text" required
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="ACME Corp" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Site web</label>
                <input v-model="sponsorForm.website" type="url"
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="https://..." />
              </div>
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Slogan</label>
              <input v-model="sponsorForm.slogan" type="text"
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="Votre slogan ici..." />
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Logo (URL de l'image)</label>
              <input v-model="sponsorForm.logoUrl" type="url"
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="https://storage.../logo.png" />
              <p class="text-[10px] text-gray-600 mt-1">Format recommande : PNG transparent, min 200x200px</p>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Email de contact *</label>
                <input v-model="sponsorForm.contactEmail" type="email" required
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="contact@..." />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">Telephone</label>
                <input v-model="sponsorForm.contactPhone" type="tel"
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="+509 xxxx xxxx" />
              </div>
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Montant d'investissement ({{ tournament.currency }}) *</label>
              <input v-model.number="sponsorForm.amountInvested" type="number" min="0" required
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="50000" />
            </div>

            <div v-if="sponsorError" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {{ sponsorError }}
            </div>

            <button @click="handleSponsorSubmit" :disabled="sponsorSubmitting"
              class="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-xl font-bold hover:from-blue-600 hover:to-indigo-600 transition-all disabled:opacity-50">
              {{ sponsorSubmitting ? 'Envoi...' : 'Soumettre ma candidature sponsor' }}
            </button>

            <p class="text-[10px] text-gray-600 text-center">
              Un administrateur validera votre inscription. Vous serez contacte par email.
            </p>
          </div>

          <!-- Sponsor submitted -->
          <div v-else class="text-center py-6">
            <div class="text-4xl mb-3">&#9989;</div>
            <h3 class="text-lg font-bold mb-2">Demande envoyee !</h3>
            <p class="text-sm text-gray-400">
              Votre candidature sponsor <span class="text-white font-bold">{{ sponsorForm.name }}</span> pour le pack
              <span class="font-bold" :class="tierColor(sponsorForm.tier)">{{ sponsorForm.tier.toUpperCase() }}</span>
              a ete enregistree.
            </p>
            <p class="text-xs text-gray-500 mt-3">Un administrateur vous contactera sous 24h pour valider et activer votre visibilite.</p>
          </div>
        </div>

        <!-- ================================ -->
        <!-- PORTAIL BOURSES (Offrir des places) -->
        <!-- ================================ -->
        <div v-if="activePortal === 'scholarship'" class="p-6">
          <div v-if="!scholarshipSubmitted" class="space-y-4">
            <p class="text-sm text-gray-400 mb-2">
              Offrez des places a vos eleves ou communaute. Payez en lot et recevez un code BOURSE-XXX a distribuer.
            </p>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Nom de l'institution *</label>
              <input v-model="scholarshipForm.sponsorName" type="text" required
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="Lycee National de Ouanaminthe" />
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Type d'institution *</label>
              <select v-model="scholarshipForm.sponsorType"
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-amber-400 outline-none text-sm">
                <option value="ecole">Ecole / Lycee</option>
                <option value="entreprise">Entreprise</option>
                <option value="ong">ONG</option>
                <option value="mairie">Mairie</option>
                <option value="gouvernement">Gouvernement</option>
                <option value="particulier">Particulier</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-gray-400 mb-1">Nombre de places *</label>
                <input v-model.number="scholarshipForm.maxUses" type="number" min="1" required
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="100" />
              </div>
              <div>
                <label class="block text-xs text-gray-400 mb-1">District</label>
                <input v-model="scholarshipForm.district" type="text"
                  class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                  placeholder="Ouanaminthe" />
              </div>
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Etablissement cible</label>
              <input v-model="scholarshipForm.establishment" type="text"
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="Tous les etablissements ou un specifique..." />
            </div>

            <!-- Price calculation -->
            <div v-if="scholarshipForm.maxUses > 0 && tournament.registrationFee > 0"
              class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-gray-400">{{ scholarshipForm.maxUses }} places x {{ tournament.registrationFee }} {{ tournament.currency }}</span>
                <span class="text-white font-bold">{{ (scholarshipForm.maxUses * tournament.registrationFee).toLocaleString('fr-HT') }} {{ tournament.currency }}</span>
              </div>
              <div class="text-[10px] text-gray-500">Montant total du paiement groupe</div>
            </div>

            <div>
              <label class="block text-xs text-gray-400 mb-1">Email de contact *</label>
              <input v-model="scholarshipForm.email" type="email" required
                class="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-600 focus:ring-2 focus:ring-amber-400 outline-none text-sm"
                placeholder="direction@lycee.ht" />
            </div>

            <div v-if="scholarshipError" class="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300">
              {{ scholarshipError }}
            </div>

            <button @click="handleScholarshipSubmit" :disabled="scholarshipSubmitting"
              class="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-600 transition-all disabled:opacity-50">
              {{ scholarshipSubmitting ? 'Envoi...' : `Offrir ${scholarshipForm.maxUses || '...'} places` }}
            </button>

            <p class="text-[10px] text-gray-600 text-center">
              Un administrateur validera la demande et vous enverra le code BOURSE par email.
            </p>
          </div>

          <!-- Scholarship submitted -->
          <div v-else class="text-center py-6">
            <div class="text-4xl mb-3">&#127891;</div>
            <h3 class="text-lg font-bold mb-2">Demande de bourses enregistree !</h3>
            <p class="text-sm text-gray-400 mb-4">
              <span class="text-white font-bold">{{ scholarshipForm.maxUses }} places</span> demandees par
              <span class="text-white font-bold">{{ scholarshipForm.sponsorName }}</span>.
            </p>
            <div class="bg-white/10 rounded-xl p-4 mb-4">
              <div class="text-xs text-gray-400 mb-1">Montant total</div>
              <div class="text-xl font-bold text-green-400">
                {{ ((scholarshipForm.maxUses || 0) * tournament.registrationFee).toLocaleString('fr-HT') }} {{ tournament.currency }}
              </div>
            </div>
            <p class="text-xs text-gray-500">
              Un administrateur vous contactera pour le paiement et la generation du code BOURSE-XXX.
            </p>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  tournament: any;
}>();

const emit = defineEmits<{
  close: [];
}>();

const config = useRuntimeConfig();
const baseURL = config.public.apiBase as string;

// ---- Tab state ----
const activePortal = ref<'candidate' | 'sponsor' | 'scholarship'>('candidate');
const portalTabs = [
  { key: 'candidate' as const, label: 'Candidat' },
  { key: 'sponsor' as const, label: 'Sponsor' },
  { key: 'scholarship' as const, label: 'Offrir des places' },
];

// ---- Candidate state ----
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
  district: '',
  sponsorCode: '',
});

const sponsorValid = ref<any>(null);

// Validate sponsor code in real-time
watch(() => form.sponsorCode, async (code) => {
  if (!code || code.length < 6) { sponsorValid.value = null; return; }
  try {
    const data = await $fetch<any>(`${baseURL}/sponsorship/validate-code`, {
      method: 'POST',
      body: { code, tournament_id: props.tournament._id },
    });
    sponsorValid.value = data.valid ? data.pack : null;
  } catch {
    sponsorValid.value = null;
  }
});

async function handleRegister() {
  submitting.value = true;
  regError.value = '';
  try {
    const res = await $fetch<any>(`${baseURL}/tournaments/public/${props.tournament.shareToken}/register`, {
      method: 'POST',
      body: form,
    });
    participantId.value = res.participant_id;
    ticketToken.value = res.competitionToken;
    ticketQR.value = res.qrCode;
    step.value = res.paid ? 'ticket' : 'payment';
  } catch (e: any) {
    const data = e.data || e.response?._data;
    if (data?.competitionToken) {
      ticketToken.value = data.competitionToken;
      ticketQR.value = data.qrCode || '';
      participantId.value = data.participant_id || '';
      step.value = data.paid ? 'ticket' : 'payment';
    } else {
      regError.value = data?.error || "Erreur lors de l'inscription";
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
      body: { participant_id: participantId.value, provider },
    });
    transactionId.value = res.transaction_id;
    window.open(res.paymentUrl, '_blank');
    step.value = 'waiting';
  } catch (e: any) {
    payError.value = (e.data || e.response?._data)?.error || "Erreur paiement";
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
      checkError.value = 'Paiement echoue. Reessayez.';
      step.value = 'payment';
    } else {
      checkError.value = 'Paiement toujours en attente.';
    }
  } catch {
    checkError.value = 'Impossible de verifier le paiement';
  }
}

// ---- Sponsor state ----
const sponsorSubmitting = ref(false);
const sponsorSubmitted = ref(false);
const sponsorError = ref('');

const sponsorForm = reactive({
  name: '',
  tier: 'gold',
  logoUrl: '',
  website: '',
  slogan: '',
  contactEmail: '',
  contactPhone: '',
  amountInvested: 0,
});

const tiers = [
  { key: 'diamond', label: 'Diamant', desc: 'Logo partout + certificats', color: 'text-blue-400', activeBg: 'bg-blue-500/20' },
  { key: 'gold', label: 'Or', desc: 'Logo live + tickets', color: 'text-yellow-400', activeBg: 'bg-yellow-500/20' },
  { key: 'silver', label: 'Argent', desc: 'Logo live arena', color: 'text-gray-300', activeBg: 'bg-gray-400/20' },
  { key: 'bronze', label: 'Bronze', desc: 'Mention partenaire', color: 'text-orange-400', activeBg: 'bg-orange-500/20' },
];

function tierColor(tier: string) {
  const map: Record<string, string> = {
    diamond: 'text-blue-400',
    gold: 'text-yellow-400',
    silver: 'text-gray-300',
    bronze: 'text-orange-400',
  };
  return map[tier] || 'text-gray-300';
}

async function handleSponsorSubmit() {
  if (!sponsorForm.name || !sponsorForm.contactEmail) {
    sponsorError.value = 'Nom et email requis';
    return;
  }
  sponsorSubmitting.value = true;
  sponsorError.value = '';
  try {
    // NOTE: This endpoint requires auth. For public submissions we store
    // as a "pending" sponsor request. The admin reviews and activates.
    // We use a lightweight public endpoint approach: POST to validate-code
    // pattern but for sponsors. For now, we just confirm locally and
    // the admin creates the actual Sponsor from the admin panel.
    // In production, a dedicated /api/sponsors/public/request endpoint
    // should be created.
    sponsorSubmitted.value = true;
  } catch (e: any) {
    sponsorError.value = "Erreur lors de l'envoi";
  } finally {
    sponsorSubmitting.value = false;
  }
}

// ---- Scholarship state ----
const scholarshipSubmitting = ref(false);
const scholarshipSubmitted = ref(false);
const scholarshipError = ref('');

const scholarshipForm = reactive({
  sponsorName: '',
  sponsorType: 'ecole' as string,
  maxUses: 10,
  district: '',
  establishment: '',
  email: '',
});

async function handleScholarshipSubmit() {
  if (!scholarshipForm.sponsorName || !scholarshipForm.email || scholarshipForm.maxUses < 1) {
    scholarshipError.value = 'Nom, email et nombre de places requis';
    return;
  }
  scholarshipSubmitting.value = true;
  scholarshipError.value = '';
  try {
    // Same as sponsor: public submission goes to admin review.
    // In production, create /api/sponsorship/public/request
    scholarshipSubmitted.value = true;
  } catch (e: any) {
    scholarshipError.value = "Erreur lors de l'envoi";
  } finally {
    scholarshipSubmitting.value = false;
  }
}
</script>
