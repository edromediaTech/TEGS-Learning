<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
    <!-- Header -->
    <header class="safe-area-top bg-black/30 backdrop-blur-md border-b border-white/10 px-4 py-3">
      <div class="max-w-2xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
            <span class="text-sm font-black">$</span>
          </div>
          <div>
            <div class="text-sm font-bold">Terminal Agent</div>
            <div class="text-[10px] text-emerald-400">{{ auth.fullName }} · {{ agentOrg }}</div>
          </div>
        </div>
        <div class="flex items-center space-x-2">
          <span class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/30 text-emerald-300">AGENT POS</span>
        </div>
      </div>
    </header>

    <div class="max-w-2xl mx-auto px-4 pt-6 pb-24">
      <!-- Blocked banner -->
      <div v-if="quota.isBlocked" class="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 mb-4">
        <div class="flex items-center space-x-3">
          <span class="text-3xl">&#128683;</span>
          <div>
            <div class="font-bold text-red-300">Compte suspendu</div>
            <div class="text-xs text-gray-400">Votre quota est epuise ou votre compte a ete desactive. Contactez l'administration DDENE pour regulariser.</div>
          </div>
        </div>
      </div>

      <!-- Quota progress bar -->
      <div v-if="quota.guaranteeBalance > 0" class="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-gray-400">Quota disponible</span>
          <span class="text-sm font-bold" :class="quota.quotaPercent > 20 ? 'text-emerald-400' : quota.quotaPercent > 10 ? 'text-amber-400' : 'text-red-400'">
            {{ quota.available.toLocaleString() }} {{ wallet.currency }} ({{ quota.quotaPercent }}%)
          </span>
        </div>
        <div class="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-500"
            :class="quota.quotaPercent > 20 ? 'bg-emerald-500' : quota.quotaPercent > 10 ? 'bg-amber-500' : 'bg-red-500'"
            :style="{ width: Math.max(2, quota.quotaPercent) + '%' }"></div>
        </div>
        <div class="flex items-center justify-between mt-1 text-[10px] text-gray-500">
          <span>Caution: {{ quota.guaranteeBalance.toLocaleString() }} {{ wallet.currency }}</span>
          <span>Consomme: {{ quota.usedQuota.toLocaleString() }} {{ wallet.currency }}</span>
        </div>
        <div v-if="quota.maxPaymentLimit > 0" class="text-[10px] text-gray-500 mt-1 text-center">
          Transactions: {{ quota.currentPaymentCount }} / {{ quota.maxPaymentLimit }}
        </div>
      </div>

      <!-- Wallet summary -->
      <div class="bg-gradient-to-r from-emerald-900/40 to-green-900/40 border border-emerald-500/20 rounded-2xl p-5 mb-6">
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-xl font-black text-emerald-400">{{ wallet.totalCommission.toLocaleString() }}</div>
            <div class="text-[10px] text-gray-400">Mes commissions</div>
          </div>
          <div>
            <div class="text-xl font-black text-white">{{ wallet.totalCollected.toLocaleString() }}</div>
            <div class="text-[10px] text-gray-400">Total encaisse</div>
          </div>
          <div>
            <div class="text-xl font-black text-amber-400">{{ wallet.amountDue.toLocaleString() }}</div>
            <div class="text-[10px] text-gray-400">A reverser</div>
          </div>
        </div>
        <div class="text-center mt-2 text-[10px] text-gray-500">
          Taux: {{ wallet.commissionRate }}% · {{ wallet.transactionCount }} transactions · {{ wallet.currency }}
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex items-center space-x-1 mb-6">
        <button @click="tab = 'collect'"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all text-center"
          :class="tab === 'collect' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400'">
          Encaisser
        </button>
        <button @click="tab = 'journal'; loadJournal()"
          class="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all text-center"
          :class="tab === 'journal' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-gray-400'">
          Journal ({{ journalCount }})
        </button>
      </div>

      <!-- ============================================ -->
      <!-- TAB: ENCAISSER -->
      <!-- ============================================ -->
      <template v-if="tab === 'collect'">
        <!-- Search -->
        <div class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 class="font-bold mb-3">Rechercher un participant</h2>
          <form @submit.prevent="searchParticipant" class="flex space-x-2">
            <input v-model="searchQuery" type="text"
              class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-400 outline-none"
              placeholder="Nom, email ou TKT-XXXXXXXX" />
            <button type="submit" :disabled="searching"
              class="bg-emerald-500 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-600 transition-colors shrink-0 disabled:opacity-50">
              {{ searching ? '...' : 'Chercher' }}
            </button>
          </form>
        </div>

        <!-- Search results -->
        <div v-if="searchResults.length > 0" class="space-y-3 mb-6">
          <div v-for="p in searchResults" :key="p._id"
            class="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div class="flex items-center justify-between mb-3">
              <div>
                <div class="font-bold">{{ p.firstName }} {{ p.lastName }}</div>
                <div class="text-xs text-gray-400">{{ p.email }} · {{ p.establishment || 'N/A' }}</div>
              </div>
              <span class="px-2 py-0.5 text-[10px] font-bold rounded-full"
                :class="p.paid ? 'bg-green-500/30 text-green-300' : 'bg-amber-500/30 text-amber-300'">
                {{ p.paid ? 'PAYÉ' : 'NON PAYÉ' }}
              </span>
            </div>

            <div v-if="p.tournament" class="text-xs text-gray-400 mb-3">
              {{ p.tournament.title }} — <span class="text-emerald-400 font-bold">{{ p.tournament.registrationFee }} {{ p.tournament.currency }}</span>
            </div>

            <!-- Action button -->
            <button v-if="!p.paid"
              @click="confirmCollect(p)"
              class="w-full bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-green-600 transition-all">
              Encaisser {{ p.tournament?.registrationFee || 0 }} {{ p.tournament?.currency || 'HTG' }}
            </button>
            <div v-else class="text-center py-2 text-green-400 text-sm font-medium">
              Déjà payé — {{ p.competitionToken }}
            </div>
          </div>
        </div>

        <!-- No results -->
        <div v-if="searchDone && searchResults.length === 0" class="text-center py-8 text-gray-500">
          Aucun participant trouvé
        </div>

        <!-- Confirmation modal -->
        <Transition name="fade">
          <div v-if="collectTarget" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            @click.self="collectTarget = null">
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 max-w-sm w-full border border-white/10">
              <h3 class="text-lg font-extrabold mb-4 text-center">Confirmer l'encaissement</h3>

              <div class="bg-white/5 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">Participant</span>
                  <span class="font-bold">{{ collectTarget.firstName }} {{ collectTarget.lastName }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Tournoi</span>
                  <span class="font-medium">{{ collectTarget.tournament?.title }}</span>
                </div>
                <div class="flex justify-between text-lg">
                  <span class="text-gray-400">Somme percue</span>
                  <span class="font-black text-emerald-400">{{ collectTarget.tournament?.registrationFee }} {{ collectTarget.tournament?.currency }}</span>
                </div>
              </div>

              <div class="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4 text-xs text-amber-300">
                En confirmant, vous attestez avoir recu le montant indique en especes.
              </div>

              <div class="flex space-x-3">
                <button @click="collectTarget = null"
                  class="flex-1 bg-white/10 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">
                  Annuler
                </button>
                <button @click="executeCollect" :disabled="collecting"
                  class="flex-1 bg-gradient-to-r from-emerald-500 to-green-500 py-3 rounded-xl font-bold hover:from-emerald-600 hover:to-green-600 transition-all disabled:opacity-50">
                  {{ collecting ? 'Traitement...' : 'Confirmer' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Receipt (after successful collection) -->
        <Transition name="fade">
          <div v-if="receipt" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 px-4">
            <div class="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 max-w-sm w-full border border-emerald-500/30">
              <div class="text-center mb-4">
                <div class="text-5xl mb-2">&#9989;</div>
                <h3 class="text-xl font-extrabold text-emerald-400">Paiement encaissé !</h3>
              </div>

              <!-- QR Code -->
              <div v-if="receipt.qrCode" class="bg-white rounded-2xl p-3 mx-auto w-fit mb-4">
                <img :src="receipt.qrCode" alt="QR" class="w-40 h-40" />
              </div>

              <!-- Receipt details -->
              <div class="bg-white/5 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-400">Recu n.</span>
                  <span class="font-mono text-xs">{{ receipt.receipt?.number }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Participant</span>
                  <span class="font-bold">{{ receipt.receipt?.participant }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Montant</span>
                  <span class="font-bold text-emerald-400">{{ receipt.receipt?.amount }} {{ receipt.receipt?.currency }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Token</span>
                  <span class="font-mono font-bold text-amber-400">{{ receipt.competitionToken }}</span>
                </div>
                <div v-if="receipt.receipt?.commissionAmount" class="flex justify-between">
                  <span class="text-gray-400">Commission ({{ receipt.receipt?.commissionRate }}%)</span>
                  <span class="text-emerald-400">{{ receipt.receipt?.commissionAmount }} {{ receipt.receipt?.currency }}</span>
                </div>
                <div v-if="receipt.receipt?.netAmount" class="flex justify-between">
                  <span class="text-gray-400">A reverser</span>
                  <span class="text-amber-400">{{ receipt.receipt?.netAmount }} {{ receipt.receipt?.currency }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-400">Agent</span>
                  <span>{{ receipt.receipt?.agent }}</span>
                </div>
              </div>

              <p class="text-center text-xs text-gray-500 mb-4">
                Le participant peut scanner ce QR code pour acceder au tournoi
              </p>

              <button @click="receipt = null; searchResults = []"
                class="w-full bg-white/10 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors">
                Nouveau encaissement
              </button>
            </div>
          </div>
        </Transition>
      </template>

      <!-- ============================================ -->
      <!-- TAB: JOURNAL DE CAISSE -->
      <!-- ============================================ -->
      <template v-if="tab === 'journal'">
        <!-- Date filter -->
        <div class="flex items-center space-x-3 mb-4">
          <input v-model="journalDate" type="date"
            class="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-emerald-400 outline-none text-sm"
            @change="loadJournal" />
          <button @click="journalDate = ''; loadJournal()"
            class="text-xs text-gray-400 hover:text-white">Tout voir</button>
        </div>

        <!-- Summary -->
        <div class="bg-gradient-to-r from-emerald-900/30 to-green-900/30 border border-emerald-500/20 rounded-2xl p-5 mb-6">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs text-gray-400 uppercase">Total encaissé</div>
              <div class="text-3xl font-black text-emerald-400">{{ journalTotal.toLocaleString() }} <span class="text-lg text-gray-500">{{ journalCurrency }}</span></div>
            </div>
            <div class="text-right">
              <div class="text-2xl font-black text-white">{{ journal.length }}</div>
              <div class="text-xs text-gray-400">transactions</div>
            </div>
          </div>
        </div>

        <!-- Collection list -->
        <div v-if="journal.length === 0" class="text-center py-8 text-gray-600">
          Aucune collecte pour cette période
        </div>
        <div v-else class="space-y-2">
          <div v-for="c in journal" :key="c._id"
            class="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center space-x-3">
            <div class="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-sm shrink-0">
              $
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">
                {{ c.participant?.firstName }} {{ c.participant?.lastName }}
              </div>
              <div class="text-[10px] text-gray-500">{{ c.receiptNumber }} · {{ formatTime(c.completedAt) }}</div>
            </div>
            <div class="font-bold text-emerald-400 shrink-0">{{ c.amount }} {{ c.currency }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- Bottom safe area -->
    <div class="safe-area-bottom"></div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const config = useRuntimeConfig();
const { apiFetch } = useApi();

const tab = ref<'collect' | 'journal'>('collect');
const searchQuery = ref('');
const searching = ref(false);
const searchDone = ref(false);
const searchResults = ref<any[]>([]);
const collectTarget = ref<any>(null);
const collecting = ref(false);
const receipt = ref<any>(null);

// Wallet
const wallet = reactive({
  totalCollected: 0,
  totalCommission: 0,
  amountDue: 0,
  transactionCount: 0,
  currency: 'HTG',
  commissionRate: 5,
});

// Quota
const quota = reactive({
  guaranteeBalance: 0,
  usedQuota: 0,
  available: 0,
  quotaPercent: 100,
  maxPaymentLimit: 0,
  currentPaymentCount: 0,
  isBlocked: false,
});

// Journal
const journal = ref<any[]>([]);
const journalDate = ref('');
const journalTotal = ref(0);
const journalCurrency = ref('HTG');
const journalCount = ref(0);

const agentOrg = computed(() => auth.user?.organizationName || 'Point de vente');

async function searchParticipant() {
  if (!searchQuery.value.trim()) return;
  searching.value = true;
  searchDone.value = false;
  try {
    const { data } = await apiFetch<any>(`/payment/agent/search-participant?q=${encodeURIComponent(searchQuery.value.trim())}`);
    searchResults.value = data.participants || [];
  } catch {
    searchResults.value = [];
  } finally {
    searching.value = false;
    searchDone.value = true;
  }
}

function confirmCollect(participant: any) {
  collectTarget.value = participant;
}

async function executeCollect() {
  if (!collectTarget.value) return;
  collecting.value = true;
  try {
    const { data } = await apiFetch<any>('/payment/agent/collect', {
      method: 'POST',
      body: JSON.stringify({ participant_id: collectTarget.value._id }),
    });
    receipt.value = data;
    collectTarget.value = null;
    journalCount.value++;
    loadWallet();
  } catch (e: any) {
    alert(e.data?.error || 'Erreur lors de l\'encaissement');
  } finally {
    collecting.value = false;
  }
}

async function loadJournal() {
  try {
    const params = new URLSearchParams();
    if (journalDate.value) params.set('date', journalDate.value);
    const { data } = await apiFetch<any>(`/payment/agent/my-collections?${params}`);
    journal.value = data.collections || [];
    journalTotal.value = data.total || 0;
    journalCurrency.value = data.currency || 'HTG';
    journalCount.value = data.count || 0;
  } catch {
    journal.value = [];
  }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

async function loadWallet() {
  try {
    const { data } = await apiFetch<any>('/payment/agent/wallet');
    wallet.totalCollected = data.wallet?.totalCollected || 0;
    wallet.totalCommission = data.wallet?.totalCommission || 0;
    wallet.amountDue = data.wallet?.amountDue || 0;
    wallet.transactionCount = data.wallet?.transactionCount || 0;
    wallet.currency = data.wallet?.currency || 'HTG';
    wallet.commissionRate = data.agent?.commissionRate || 5;
    // Quota
    if (data.quota) {
      quota.guaranteeBalance = data.quota.guaranteeBalance || 0;
      quota.usedQuota = data.quota.usedQuota || 0;
      quota.available = data.quota.available || 0;
      quota.quotaPercent = data.quota.quotaPercent ?? 100;
      quota.maxPaymentLimit = data.quota.maxPaymentLimit || 0;
      quota.currentPaymentCount = data.quota.currentPaymentCount || 0;
    }
    quota.isBlocked = data.agent?.isBlocked || false;
  } catch {}
}

onMounted(() => {
  loadWallet();
  loadJournal();
});
</script>

<style scoped>
.safe-area-top { padding-top: max(12px, env(safe-area-inset-top)); }
.safe-area-bottom { padding-bottom: max(8px, env(safe-area-inset-bottom)); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
