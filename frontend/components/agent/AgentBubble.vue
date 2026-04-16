<template>
  <div
    v-if="agentStore.enabled && !agentStore.panelOpen"
    class="fixed z-50 right-5 bottom-24 select-none"
  >
    <!-- Tooltip -->
    <Transition name="agent-tooltip">
      <div
        v-if="showTooltip"
        class="absolute bottom-[calc(100%+8px)] right-0 bg-gray-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
      >
        Agent IA — Posez vos questions
        <div class="absolute -bottom-1 right-5 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
    </Transition>

    <!-- Bubble -->
    <button
      @click="openAgent"
      class="relative w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform duration-200 cursor-pointer"
      title="TEGS Agent IA"
    >
      <span class="text-xl font-bold">IA</span>

      <!-- Unread badge -->
      <span
        v-if="agentStore.unreadCount > 0"
        class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white"
      >
        {{ agentStore.unreadCount > 9 ? '9+' : agentStore.unreadCount }}
      </span>

      <!-- Connection indicator -->
      <span
        class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
        :class="agentStore.isConnected ? 'bg-green-400' : 'bg-orange-400 animate-pulse'"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
const agentStore = useAgentStore();
const { connect } = useAgentSocket();

const showTooltip = ref(false);

onMounted(async () => {
  // Fetch status and connect socket
  await agentStore.fetchStatus();
  if (agentStore.enabled) {
    connect();
    // Show tooltip briefly
    setTimeout(() => { showTooltip.value = true; }, 2000);
    setTimeout(() => { showTooltip.value = false; }, 7000);
  }
});

function openAgent() {
  agentStore.openPanel();
}
</script>

<style scoped>
.agent-tooltip-enter-active, .agent-tooltip-leave-active {
  transition: opacity 0.2s ease;
}
.agent-tooltip-enter-from, .agent-tooltip-leave-to {
  opacity: 0;
}
</style>
