<template>
  <div class="steps my-6">
    <div v-for="(step, i) in steps" :key="i"
      class="flex items-start space-x-4 mb-4 last:mb-0">
      <button @click="toggleStep(i)"
        class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all border-2"
        :class="checked[i]
          ? 'bg-green-500 border-green-500 text-white'
          : 'bg-white border-gray-300 text-gray-500 hover:border-green-400'">
        <span v-if="checked[i]">&#10003;</span>
        <span v-else>{{ i + 1 }}</span>
      </button>
      <div class="flex-1 pt-1">
        <div class="font-medium" :class="checked[i] ? 'line-through text-gray-400' : 'text-gray-800'">
          {{ step.title }}
        </div>
        <div v-if="step.description" class="text-sm text-gray-500 mt-0.5">{{ step.description }}</div>
      </div>
    </div>
    <div v-if="allDone" class="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 text-sm font-medium">
      Toutes les etapes sont completees !
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  steps: { title: string; description?: string }[];
}>();

const checked = ref<boolean[]>(props.steps.map(() => false));

function toggleStep(i: number) {
  checked.value[i] = !checked.value[i];
}

const allDone = computed(() => checked.value.every(Boolean));
</script>
