<template>
  <div class="bg-pink-50 border border-pink-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center space-x-2 mb-2">
      <span class="bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded">LIKERT</span>
    </div>
    <p class="font-medium text-gray-800">{{ data.question }}</p>
    <div class="flex justify-between gap-2">
      <label
        v-for="(lbl, i) in labels"
        :key="i"
        class="flex-1 text-center cursor-pointer"
      >
        <input
          type="radio"
          :name="'likert-' + data.question"
          :value="i"
          v-model="selected"
          class="block mx-auto mb-1"
        />
        <span class="text-xs text-gray-600 leading-tight block">{{ lbl }}</span>
      </label>
    </div>
    <div v-if="selected !== null" class="text-sm text-gray-500 italic">
      Reponse enregistree : {{ labels[selected] }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { question: string; scale: string } }>();

const scaleLabels: Record<string, string[]> = {
  agreement: ['Pas du tout d\'accord', 'Pas d\'accord', 'Neutre', 'D\'accord', 'Tout a fait d\'accord'],
  satisfaction: ['Tres insatisfait', 'Insatisfait', 'Neutre', 'Satisfait', 'Tres satisfait'],
  frequency: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'],
};

const labels = computed(() => scaleLabels[props.data.scale] || scaleLabels.agreement);
const selected = ref<number | null>(null);
</script>
