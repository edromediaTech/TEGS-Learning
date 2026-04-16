<template>
  <div class="flex items-center gap-2 px-4 py-3">
    <div class="flex items-center gap-1">
      <span
        v-for="i in 3"
        :key="i"
        class="w-2 h-2 rounded-full animate-bounce"
        :class="dotClass"
        :style="{ animationDelay: `${(i - 1) * 150}ms` }"
      />
    </div>
    <span class="text-xs font-medium" :class="textClass">
      {{ statusText }}
    </span>
    <button
      v-if="agentStore.thinkingPhase === 'slow' || agentStore.thinkingPhase === 'offline'"
      @click="$emit('retry')"
      class="ml-auto text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 transition font-medium"
    >
      Reessayer
    </button>
  </div>
</template>

<script setup lang="ts">
const agentStore = useAgentStore();

defineEmits<{ retry: [] }>();

const TEXTS: Record<string, string[]> = {
  thinking: ['L\'agent reflechit...'],
  searching: ['Analyse en cours...', 'Recherche des donnees...', 'Preparation de la reponse...'],
  slow: ['Connexion lente... Nouvelle tentative'],
  offline: ['Connexion perdue. Passage en mode hors-ligne.'],
};

const textIndex = ref(0);

// Cycle through texts for "searching" phase
let textTimer: ReturnType<typeof setInterval> | null = null;

watch(
  () => agentStore.thinkingPhase,
  (phase) => {
    textIndex.value = 0;
    if (textTimer) clearInterval(textTimer);
    if (phase === 'searching') {
      textTimer = setInterval(() => {
        const texts = TEXTS.searching;
        textIndex.value = (textIndex.value + 1) % texts.length;
      }, 2500);
    }
  }
);

// Update phase based on elapsed time
let phaseTimer: ReturnType<typeof setInterval> | null = null;
watch(
  () => agentStore.isTyping,
  (typing) => {
    if (typing) {
      phaseTimer = setInterval(() => agentStore.updateThinkingPhase(), 500);
    } else {
      if (phaseTimer) clearInterval(phaseTimer);
    }
  }
);

onUnmounted(() => {
  if (textTimer) clearInterval(textTimer);
  if (phaseTimer) clearInterval(phaseTimer);
});

const statusText = computed(() => {
  const phase = agentStore.thinkingPhase;
  const texts = TEXTS[phase] || TEXTS.thinking;
  return texts[textIndex.value % texts.length];
});

const dotClass = computed(() => {
  switch (agentStore.thinkingPhase) {
    case 'slow':
    case 'offline':
      return 'bg-orange-400';
    default:
      return 'bg-teal-400';
  }
});

const textClass = computed(() => {
  switch (agentStore.thinkingPhase) {
    case 'slow':
    case 'offline':
      return 'text-orange-600';
    default:
      return 'text-teal-600';
  }
});
</script>
