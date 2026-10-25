<template>
  <div class="rounded-xl border border-slate-600 p-4" data-testid="checklist">
    <p class="text-sm font-semibold">Recette humaine : 4 points obligatoires</p>
    <label v-for="(label, key) in labels" :key="key" class="flex items-start gap-3 mt-3 text-sm cursor-pointer">
      <input type="checkbox" class="mt-0.5 h-5 w-5 accent-emerald-500" :checked="!!modelValue[key]" :disabled="disabled"
             :data-testid="`check-${key}`" @change="toggle(key, ($event.target as HTMLInputElement).checked)">
      <span>{{ label }}</span>
    </label>
    <p class="text-xs text-slate-400 mt-3">{{ done }} / {{ total }} point(s) validé(s)</p>
  </div>
</template>

<script setup lang="ts">
// Check-list de revue QA (verrou n°2). Les libelles viennent de l'API (componentLifecycle) :
// la meme liste fait foi cote serveur, qui refuse toute approbation incomplete.
const props = defineProps<{
  labels: Record<string, string>;
  modelValue: Record<string, boolean>;
  disabled?: boolean;
}>();
const emit = defineEmits<{ (e: 'update:modelValue', v: Record<string, boolean>): void }>();

const total = computed(() => Object.keys(props.labels).length);
const done = computed(() => Object.keys(props.labels).filter((k) => props.modelValue[k]).length);

function toggle(key: string, value: boolean) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
