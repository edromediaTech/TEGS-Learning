<template>
  <div
    class="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-mono font-bold"
    :class="timerClass"
  >
    <span>&#9201;</span>
    <span>{{ display }}</span>
    <span v-if="mode === 'countdown'" class="text-xs font-sans font-normal opacity-75">restant</span>
    <span v-else class="text-xs font-sans font-normal opacity-75">ecoule</span>
    <span v-if="label" class="text-xs font-sans font-normal opacity-60 ml-1">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  minutes: number;
  mode: 'countdown' | 'stopwatch';
  label?: string;
  paused?: boolean;
}>(), {
  label: '',
  paused: false,
});

const emit = defineEmits<{
  'time-up': [];
  'tick': [remaining: number, elapsed: number];
}>();

const totalSeconds = computed(() => props.minutes * 60);
const elapsed = ref(0);
const finished = ref(false);
let interval: ReturnType<typeof setInterval> | null = null;

const remaining = computed(() => Math.max(0, totalSeconds.value - elapsed.value));

const display = computed(() => {
  const secs = props.mode === 'countdown' ? remaining.value : elapsed.value;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
});

const timerClass = computed(() => {
  if (props.mode === 'stopwatch') return 'bg-blue-100 text-blue-800';
  if (totalSeconds.value <= 0) return 'bg-gray-100 text-gray-500';
  const pct = remaining.value / totalSeconds.value;
  if (pct <= 0) return 'bg-red-200 text-red-900 animate-pulse';
  if (pct <= 1 / totalSeconds.value * 60) return 'bg-red-100 text-red-800'; // last minute
  if (pct <= 0.25) return 'bg-orange-100 text-orange-800';
  return 'bg-blue-100 text-blue-800';
});

function startTimer() {
  if (interval) return;
  interval = setInterval(() => {
    if (props.paused) return;
    elapsed.value++;
    emit('tick', remaining.value, elapsed.value);
    if (props.mode === 'countdown' && remaining.value <= 0 && !finished.value) {
      finished.value = true;
      emit('time-up');
      if (interval) clearInterval(interval);
    }
  }, 1000);
}

onMounted(() => {
  startTimer();
});

onUnmounted(() => {
  if (interval) clearInterval(interval);
});

// Expose for parent components
defineExpose({ elapsed, remaining, finished });
</script>
