<template>
  <div class="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white">
    <!-- Header -->
    <header class="safe-area-top bg-black/30 backdrop-blur-md px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-3">
        <NuxtLink to="/mobile" class="text-gray-400 hover:text-white">&#8592;</NuxtLink>
        <div>
          <div class="text-sm font-bold">Mode Superviseur</div>
          <div class="text-[10px] text-blue-400">Verification & Surveillance</div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <div class="w-2 h-2 rounded-full" :class="socketConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'"></div>
        <span class="text-[10px] text-gray-500">{{ socketConnected ? 'LIVE' : 'OFFLINE' }}</span>
      </div>
    </header>

    <div class="px-4 pt-6 pb-24">
      <!-- Scanner section -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <h2 class="font-bold mb-4 flex items-center space-x-2">
          <span class="text-xl">&#128247;</span>
          <span>Scanner un badge</span>
        </h2>

        <!-- Camera scanner (html5-qrcode) -->
        <div v-if="scanning" class="relative rounded-xl overflow-hidden mb-4 bg-black max-w-xs mx-auto">
          <div id="qr-reader" class="w-full"></div>
          <button @click="stopScan"
            class="absolute bottom-3 right-3 z-10 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">
            Arreter
          </button>
        </div>

        <!-- Manual input -->
        <div v-if="!scanning" class="space-y-3">
          <button @click="startScan"
            class="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-600 transition-all">
            Ouvrir le scanner
          </button>
          <div class="text-center text-gray-500 text-xs">ou entrer manuellement</div>
          <form @submit.prevent="verifyToken" class="flex space-x-2">
            <input v-model="manualToken" type="text" placeholder="TKT-XXXXXXXX"
              class="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-400 outline-none font-mono uppercase" />
            <button type="submit"
              class="bg-blue-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors shrink-0">
              Verifier
            </button>
          </form>
        </div>
      </div>

      <!-- Verification result -->
      <Transition name="slide">
        <div v-if="verificationResult" class="mb-6 rounded-2xl p-5 border"
          :class="verificationResult.valid
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'">
          <div class="flex items-center space-x-3 mb-3">
            <div class="text-3xl">{{ verificationResult.valid ? '&#9989;' : '&#10060;' }}</div>
            <div>
              <div class="font-bold" :class="verificationResult.valid ? 'text-green-300' : 'text-red-300'">
                {{ verificationResult.valid ? 'Badge valide' : 'Badge invalide' }}
              </div>
              <div class="text-xs text-gray-400">{{ verificationResult.token }}</div>
            </div>
          </div>
          <div v-if="verificationResult.participant" class="space-y-1 text-sm">
            <div><span class="text-gray-400">Nom:</span> {{ verificationResult.participant.firstName }} {{ verificationResult.participant.lastName }}</div>
            <div><span class="text-gray-400">Email:</span> {{ verificationResult.participant.email }}</div>
            <div><span class="text-gray-400">Etablissement:</span> {{ verificationResult.participant.establishment || '-' }}</div>
            <div><span class="text-gray-400">Statut:</span>
              <span class="font-bold" :class="{
                'text-green-400': verificationResult.participant.status === 'qualified',
                'text-blue-400': verificationResult.participant.status === 'registered',
                'text-red-400': verificationResult.participant.status === 'eliminated',
                'text-yellow-400': verificationResult.participant.status === 'winner',
              }">
                {{ verificationResult.participant.status }}
              </span>
            </div>
            <div><span class="text-gray-400">Paye:</span>
              <span :class="verificationResult.participant.paid ? 'text-green-400' : 'text-red-400'">
                {{ verificationResult.participant.paid ? 'Oui' : 'Non' }}
              </span>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Scan history -->
      <div class="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
        <h3 class="text-sm font-bold text-gray-400 uppercase mb-3">
          Historique des scans ({{ scanHistory.length }})
        </h3>
        <div v-if="scanHistory.length === 0" class="text-center py-4 text-gray-600 text-sm">
          Aucun scan effectue
        </div>
        <div v-else class="space-y-2 max-h-64 overflow-y-auto">
          <div v-for="scan in scanHistory" :key="scan.token + scan.time"
            class="flex items-center space-x-3 bg-white/5 rounded-xl p-3">
            <div class="w-2 h-2 rounded-full shrink-0"
              :class="scan.valid ? 'bg-green-500' : 'bg-red-500'"></div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ scan.name || scan.token }}</div>
              <div class="text-[10px] text-gray-500">{{ scan.establishment || '' }}</div>
            </div>
            <div class="text-[10px] text-gray-500 shrink-0">{{ scan.time }}</div>
          </div>
        </div>
      </div>

      <!-- Live fraud alerts -->
      <div class="bg-white/5 border border-red-500/20 rounded-2xl p-5">
        <h3 class="text-sm font-bold text-red-400 uppercase mb-3 flex items-center space-x-2">
          <span class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span>Alertes temps reel</span>
        </h3>
        <div v-if="fraudAlerts.length === 0" class="text-center py-4 text-gray-600 text-sm">
          Aucune alerte de fraude
        </div>
        <div v-else class="space-y-2 max-h-48 overflow-y-auto">
          <div v-for="(alert, i) in fraudAlerts" :key="i"
            class="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center space-x-3">
            <span class="text-red-400 text-lg shrink-0">&#9888;</span>
            <div class="flex-1 text-sm">
              <span class="font-bold text-red-300">{{ alert.student }}</span>
              <span class="text-gray-400"> — {{ alert.reason }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const native = useNativeBridge();

const scanning = ref(false);
const manualToken = ref('');
const socketConnected = ref(false);
let qrScanner: any = null;

interface VerificationResult {
  valid: boolean;
  token: string;
  participant?: {
    firstName: string;
    lastName: string;
    email: string;
    establishment: string;
    status: string;
    paid: boolean;
  };
}

const verificationResult = ref<VerificationResult | null>(null);
const scanHistory = ref<Array<{ token: string; name: string; establishment: string; valid: boolean; time: string }>>([]);
const fraudAlerts = ref<Array<{ student: string; reason: string }>>([]);

const config = useRuntimeConfig();
const baseURL = config.public.apiBase as string;

async function startScan() {
  scanning.value = true;
  await nextTick();

  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    qrScanner = new Html5Qrcode('qr-reader');

    await qrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 200, height: 200 } },
      (decodedText: string) => {
        // QR décodé — vérifier le token
        verifyToken(decodedText.trim());
        native.vibrate('light');
      },
      () => {
        // Scan en cours, pas de match
      }
    );
  } catch (e) {
    scanning.value = false;
    alert('Impossible d\'acceder a la camera');
  }
}

async function stopScan() {
  if (qrScanner) {
    try {
      await qrScanner.stop();
    } catch {}
    qrScanner = null;
  }
  scanning.value = false;
}

async function verifyToken(tokenOverride?: string) {
  const token = typeof tokenOverride === 'string' ? tokenOverride : manualToken.value.trim();
  if (!token) return;

  try {
    const res = await $fetch<any>(`${baseURL}/tournaments/verify-token/${token}`);
    verificationResult.value = {
      valid: true,
      token,
      participant: res.participant,
    };
    scanHistory.value.unshift({
      token,
      name: `${res.participant.firstName} ${res.participant.lastName}`,
      establishment: res.participant.establishment || '',
      valid: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });
    native.vibrate('light');
  } catch {
    verificationResult.value = { valid: false, token };
    scanHistory.value.unshift({
      token,
      name: '',
      establishment: '',
      valid: false,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });
    native.vibrateAlert();
  }

  manualToken.value = '';
}

onUnmounted(() => {
  stopScan();
});
</script>

<style scoped>
.safe-area-top { padding-top: max(12px, env(safe-area-inset-top)); }
.slide-enter-active { transition: all 0.3s ease; }
.slide-enter-from { transform: translateY(20px); opacity: 0; }
</style>
