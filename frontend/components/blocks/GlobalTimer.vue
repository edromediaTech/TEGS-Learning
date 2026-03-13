<template>
  <div v-if="totalMinutes > 0" class="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-2 flex items-center justify-between shadow-sm">
    <div class="flex items-center gap-3">
      <CountdownTimer
        :minutes="totalMinutes"
        mode="countdown"
        :label="source === 'global' ? 'Duree globale' : `${questionCount} questions`"
        @time-up="onTimeUp"
        @tick="onTick"
      />
      <!-- Progress bar -->
      <div class="hidden sm:block w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-1000"
          :class="progressColor"
          :style="{ width: `${progressPct}%` }"
        ></div>
      </div>
    </div>
    <div class="text-xs text-gray-500">
      {{ source === 'global' ? 'Limite globale' : 'Somme des durees' }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  totalMinutes: number;
  source: 'global' | 'questions' | 'none';
  questionCount?: number;
}>();

const emit = defineEmits<{
  'time-up': [];
}>();

const progressPct = ref(100);

const progressColor = computed(() => {
  if (progressPct.value <= 10) return 'bg-red-500 animate-pulse';
  if (progressPct.value <= 25) return 'bg-orange-500';
  return 'bg-blue-500';
});

function onTick(remaining: number) {
  const total = props.totalMinutes * 60;
  progressPct.value = total > 0 ? Math.round((remaining / total) * 100) : 0;
}

function onTimeUp() {
  emit('time-up');
}
</script>
