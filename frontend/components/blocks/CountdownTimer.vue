<template>
  <div
    class="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-mono font-bold"
    :class="timerClass"
  >
    <span>&#9201;</span>
    <span>{{ display }}</span>
    <span v-if="mode === 'countdown'" class="text-xs font-sans font-normal opacity-75">restant</span>
    <span v-else class="text-xs font-sans font-normal opacity-75">ecoule</span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  minutes: number;
  mode: 'countdown' | 'stopwatch';
}>();

const emit = defineEmits<{
  'time-up': [];
}>();

const totalSeconds = props.minutes * 60;
const elapsed = ref(0);
const finished = ref(false);
let interval: ReturnType<typeof setInterval> | null = null;

const remaining = computed(() => Math.max(0, totalSeconds - elapsed.value));

const display = computed(() => {
  const secs = props.mode === 'countdown' ? remaining.value : elapsed.value;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const timerClass = computed(() => {
  if (props.mode === 'stopwatch') return 'bg-blue-100 text-blue-800';
  const pct = remaining.value / totalSeconds;
  if (pct <= 0) return 'bg-red-200 text-red-900 animate-pulse';
  if (pct <= 1 / totalSeconds * 60) return 'bg-red-100 text-red-800'; // last minute
  if (pct <= 0.25) return 'bg-orange-100 text-orange-800';
  return 'bg-blue-100 text-blue-800';
});

onMounted(() => {
  interval = setInterval(() => {
    elapsed.value++;
    if (props.mode === 'countdown' && remaining.value <= 0 && !finished.value) {
      finished.value = true;
      emit('time-up');
      if (interval) clearInterval(interval);
    }
  }, 1000);
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});
</script>
