<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Consigne (optionnel)</label>
      <input
        :value="modelValue.instruction"
        @input="update('instruction', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Associez chaque element a sa correspondance"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Paires</label>
      <div class="space-y-2">
        <div v-for="(pair, idx) in modelValue.pairs" :key="idx" class="flex items-center space-x-2">
          <input
            :value="pair.left"
            @input="updatePair(idx, 'left', ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="`Element ${idx + 1}`"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
          <span class="text-gray-400 font-bold">&harr;</span>
          <input
            :value="pair.right"
            @input="updatePair(idx, 'right', ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="`Correspondance ${idx + 1}`"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
          <button
            v-if="modelValue.pairs.length > 2"
            @click="removePair(idx)"
            class="text-red-400 hover:text-red-600 px-2"
          >&times;</button>
        </div>
      </div>
      <button @click="addPair" class="mt-2 text-sm text-primary-600 hover:text-primary-800">+ Ajouter une paire</button>
    </div>
    <!-- Points & Duree -->
    <div class="flex gap-3 border-t border-gray-200 pt-3">
      <div>
        <label class="block text-xs text-gray-500 mb-1">Points</label>
        <input :value="modelValue.points || 1" @input="update('points', Math.max(0, parseInt(($event.target as HTMLInputElement).value) || 1))" type="number" min="0" class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
      </div>
      <div>
        <label class="block text-xs text-gray-500 mb-1">Duree (min)</label>
        <input :value="modelValue.duration || ''" @input="update('duration', parseInt(($event.target as HTMLInputElement).value) || 0)" type="number" min="0" placeholder="--" class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Explication (optionnel)</label>
      <textarea
        :value="modelValue.explanation"
        @input="update('explanation', ($event.target as HTMLTextAreaElement).value)"
        rows="2"
        placeholder="Explication..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Pair { left: string; right: string; }

const props = defineProps<{ modelValue: { instruction: string; pairs: Pair[]; explanation: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function updatePair(idx: number, side: string, value: string) {
  const newPairs = props.modelValue.pairs.map((p, i) => i === idx ? { ...p, [side]: value } : { ...p });
  emit('update:modelValue', { ...props.modelValue, pairs: newPairs });
}

function addPair() {
  emit('update:modelValue', { ...props.modelValue, pairs: [...props.modelValue.pairs, { left: '', right: '' }] });
}

function removePair(idx: number) {
  emit('update:modelValue', { ...props.modelValue, pairs: props.modelValue.pairs.filter((_, i) => i !== idx) });
}
</script>
