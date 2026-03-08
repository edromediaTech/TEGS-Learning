<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Consigne</label>
      <input
        :value="modelValue.instruction"
        @input="update('instruction', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Remettez ces elements dans le bon ordre"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Elements (dans l'ordre correct)</label>
      <div class="space-y-2">
        <div v-for="(item, idx) in modelValue.items" :key="idx" class="flex items-center space-x-2">
          <span class="text-xs text-gray-400 w-6 text-right">{{ idx + 1 }}.</span>
          <input
            :value="item"
            @input="updateItem(idx, ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="`Etape ${idx + 1}`"
            class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
          <button
            v-if="modelValue.items.length > 2"
            @click="removeItem(idx)"
            class="text-red-400 hover:text-red-600 px-2"
          >&times;</button>
        </div>
      </div>
      <button @click="addItem" class="mt-2 text-sm text-primary-600 hover:text-primary-800">+ Ajouter un element</button>
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
const props = defineProps<{ modelValue: { instruction: string; items: string[]; explanation: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function updateItem(idx: number, value: string) {
  const newItems = [...props.modelValue.items];
  newItems[idx] = value;
  emit('update:modelValue', { ...props.modelValue, items: newItems });
}

function addItem() {
  emit('update:modelValue', { ...props.modelValue, items: [...props.modelValue.items, ''] });
}

function removeItem(idx: number) {
  emit('update:modelValue', { ...props.modelValue, items: props.modelValue.items.filter((_, i) => i !== idx) });
}
</script>
