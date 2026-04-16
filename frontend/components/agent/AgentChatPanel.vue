<template>
  <Transition name="agent-panel">
    <div
      v-if="agentStore.panelOpen"
      class="fixed z-50 right-4 bottom-4 w-[400px] max-h-[calc(100vh-100px)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="bg-gradient-to-r from-teal-600 to-emerald-600 text-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm font-bold">
            IA
          </div>
          <div>
            <h3 class="font-bold text-sm">TEGS Agent</h3>
            <div class="flex items-center gap-1.5">
              <span
                class="w-1.5 h-1.5 rounded-full"
                :class="connectionDotClass"
              />
              <p class="text-[10px] text-teal-200">{{ connectionLabel }}</p>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="handleClear"
            class="p-1.5 hover:bg-white/20 rounded-lg transition text-xs"
            title="Nouvelle conversation"
          >
            &#x21BB;
          </button>
          <button
            @click="agentStore.closePanel()"
            class="p-1.5 hover:bg-white/20 rounded-lg transition"
            title="Fermer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div ref="messagesRef" class="flex-1 overflow-y-auto px-3 py-4 space-y-1 min-h-[200px] max-h-[60vh]">
        <!-- Welcome -->
        <div v-if="agentStore.messages.length === 0" class="text-center py-8 px-4">
          <div class="w-14 h-14 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span class="text-2xl">&#x1F916;</span>
          </div>
          <p class="text-sm font-semibold text-gray-700 mb-1">{{ welcomeTitle }}</p>
          <p class="text-xs text-gray-500 mb-4">{{ welcomeDescription }}</p>
          <div class="flex flex-wrap gap-2 justify-center">
            <button
              v-for="suggestion in suggestions"
              :key="suggestion"
              @click="sendSuggestion(suggestion)"
              class="text-xs px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 transition border border-teal-200"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <!-- Message list -->
        <template v-for="msg in agentStore.messages" :key="msg.id">
          <AgentMessageBubble :msg="msg" />
          <AgentProposalCard
            v-if="msg.proposal"
            :proposal="msg.proposal"
            @confirm="handleConfirm"
            @reject="handleReject"
          />
        </template>

        <!-- Typing indicator -->
        <AgentThinkingIndicator
          v-if="agentStore.isTyping"
          @retry="handleRetry"
        />
      </div>

      <!-- Input -->
      <div class="border-t px-3 py-3 flex-shrink-0">
        <div v-if="agentStore.remainingRequests !== null && agentStore.remainingRequests <= 5" class="text-[10px] text-orange-600 mb-1.5 text-center">
          {{ agentStore.remainingRequests }} requete(s) restante(s) cette heure
        </div>
        <div class="flex gap-2">
          <input
            ref="inputRef"
            v-model="userInput"
            @keydown.enter.prevent="handleSend"
            type="text"
            placeholder="Posez votre question..."
            class="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            :disabled="agentStore.isTyping"
          />
          <button
            @click="handleSend"
            :disabled="!userInput.trim() || agentStore.isTyping"
            class="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &#x27A4;
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const agentStore = useAgentStore();
const { sendMessage, confirmAction, rejectAction, clearSession } = useAgentSocket();

const userInput = ref('');
const messagesRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLInputElement | null>(null);

// Auto-scroll on new messages
watch(
  () => agentStore.messages.length,
  () => {
    nextTick(() => {
      if (messagesRef.value) {
        messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
      }
    });
  }
);

// Focus input when panel opens
watch(
  () => agentStore.panelOpen,
  (open) => {
    if (open) {
      nextTick(() => inputRef.value?.focus());
    }
  }
);

const welcomeTitle = computed(() => {
  const profile = agentStore.profile;
  return profile ? `${profile.name}` : 'TEGS Agent IA';
});

const welcomeDescription = computed(() => {
  const profile = agentStore.profile;
  return profile?.description || 'Comment puis-je vous aider ?';
});

const suggestions = computed(() => {
  const auth = useAuthStore();
  if (auth.user?.role === 'student') {
    return ['Comment m\'inscrire ?', 'Quels tournois sont ouverts ?', 'Regles du concours'];
  }
  if (auth.user?.role === 'authorized_agent') {
    return ['Mon quota', 'Ma commission', 'Generer mon bordereau'];
  }
  return ['Tournois en cours', 'Vue d\'ensemble analytics', 'Rechercher un utilisateur'];
});

const connectionDotClass = computed(() => {
  if (agentStore.isConnected) return 'bg-green-400';
  if (agentStore.isOffline) return 'bg-red-400';
  return 'bg-orange-400 animate-pulse';
});

const connectionLabel = computed(() => {
  if (agentStore.isConnected) return 'Connecte';
  if (agentStore.isOffline) return 'Hors-ligne';
  return 'Reconnexion...';
});

function handleSend() {
  const text = userInput.value.trim();
  if (!text || agentStore.isTyping) return;

  // Optimistic UI
  agentStore.addUserMessage(text);
  userInput.value = '';

  // Send via socket (or offline fallback)
  sendMessage(text);
}

function sendSuggestion(text: string) {
  userInput.value = text;
  handleSend();
}

function handleConfirm(confirmationId: string) {
  confirmAction(confirmationId);
}

function handleReject(confirmationId: string) {
  rejectAction(confirmationId);
}

function handleClear() {
  clearSession();
}

function handleRetry() {
  // Re-send the last user message
  const lastUserMsg = [...agentStore.messages].reverse().find((m) => m.role === 'user');
  if (lastUserMsg) {
    agentStore.setTyping(false);
    sendMessage(lastUserMsg.content);
  }
}
</script>

<style scoped>
.agent-panel-enter-active, .agent-panel-leave-active {
  transition: all 0.25s ease;
}
.agent-panel-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.agent-panel-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
