<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Question / Enonce</label>
      <input
        :value="modelValue.question"
        @input="update('question', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Ex: Ce cours m'a aide a comprendre le sujet"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Echelle</label>
      <div class="flex space-x-4">
        <label v-for="s in scales" :key="s.value" class="flex items-center space-x-2 cursor-pointer">
          <input type="radio" :value="s.value" :checked="modelValue.scale === s.value" @change="update('scale', s.value)" class="text-primary-600" />
          <span class="text-sm">{{ s.label }}</span>
        </label>
      </div>
    </div>
    <div class="bg-gray-50 rounded-lg p-3">
      <p class="text-xs text-gray-500 mb-2">Apercu de l'echelle :</p>
      <div class="flex justify-between text-xs text-gray-600">
        <span v-for="(lbl, i) in previewLabels" :key="i" class="text-center flex-1">{{ lbl }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { question: string; scale: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const scales = [
  { value: 'agreement', label: 'Accord (5 niveaux)' },
  { value: 'satisfaction', label: 'Satisfaction (5 niveaux)' },
  { value: 'frequency', label: 'Frequence (5 niveaux)' },
];

const scaleLabels: Record<string, string[]> = {
  agreement: ['Pas du tout d\'accord', 'Pas d\'accord', 'Neutre', 'D\'accord', 'Tout a fait d\'accord'],
  satisfaction: ['Tres insatisfait', 'Insatisfait', 'Neutre', 'Satisfait', 'Tres satisfait'],
  frequency: ['Jamais', 'Rarement', 'Parfois', 'Souvent', 'Toujours'],
};

const previewLabels = computed(() => scaleLabels[props.modelValue.scale] || scaleLabels.agreement);

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
