<template>
  <div class="space-y-3">
    <div class="flex gap-3">
      <div class="flex-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">Style</label>
        <select
          v-model="localData.variant"
          @change="emit('update:modelValue', localData)"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="info">Information</option>
          <option value="success">Succes</option>
          <option value="warning">Attention</option>
          <option value="danger">Important</option>
          <option value="note">Note</option>
          <option value="tip">Astuce</option>
          <option value="quote">Citation</option>
          <option value="custom">Personnalise</option>
        </select>
      </div>
      <div v-if="localData.variant === 'custom'" class="flex gap-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Couleur fond</label>
          <input
            type="color"
            v-model="localData.bgColor"
            @input="emit('update:modelValue', localData)"
            class="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Bordure</label>
          <input
            type="color"
            v-model="localData.borderColor"
            @input="emit('update:modelValue', localData)"
            class="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Texte</label>
          <input
            type="color"
            v-model="localData.textColor"
            @input="emit('update:modelValue', localData)"
            class="w-10 h-9 border border-gray-300 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Titre (optionnel)</label>
      <input
        v-model="localData.title"
        @input="emit('update:modelValue', localData)"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        placeholder="Titre de la boite..."
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
      <textarea
        v-model="localData.content"
        @input="emit('update:modelValue', localData)"
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        placeholder="Contenu de la boite de texte..."
      ></textarea>
    </div>

    <div class="flex gap-3 items-center">
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          v-model="localData.collapsible"
          @change="emit('update:modelValue', localData)"
          class="rounded border-gray-300 text-primary-600"
        />
        <span class="text-gray-700">Repliable</span>
      </label>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Bordure</label>
        <select
          v-model="localData.borderStyle"
          @change="emit('update:modelValue', localData)"
          class="px-2 py-1 border border-gray-300 rounded-lg text-sm"
        >
          <option value="left">Gauche</option>
          <option value="full">Encadre</option>
          <option value="none">Aucune</option>
        </select>
      </div>
    </div>

    <!-- Apercu en direct -->
    <div class="pt-2 border-t border-gray-100">
      <p class="text-xs text-gray-400 mb-2">Apercu :</p>
      <div
        class="rounded-lg p-4 text-sm"
        :class="variantClasses"
        :style="localData.variant === 'custom' ? customStyle : ''"
      >
        <div v-if="localData.title" class="font-bold mb-1">
          <span>{{ variantIcon }} </span>{{ localData.title }}
        </div>
        <div v-else-if="variantIcon" class="float-left mr-2 text-lg">{{ variantIcon }}</div>
        <div class="whitespace-pre-wrap">{{ localData.content || 'Contenu de la boite...' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: any }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const localData = reactive({
  variant: props.modelValue.variant || 'info',
  title: props.modelValue.title || '',
  content: props.modelValue.content || '',
  collapsible: props.modelValue.collapsible ?? false,
  borderStyle: props.modelValue.borderStyle || 'left',
  bgColor: props.modelValue.bgColor || '#eff6ff',
  borderColor: props.modelValue.borderColor || '#3b82f6',
  textColor: props.modelValue.textColor || '#1e3a5f',
});

const variantStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800', icon: '\u2139\uFE0F' },
  success: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800', icon: '\u2705' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', icon: '\u26A0\uFE0F' },
  danger: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800', icon: '\u274C' },
  note: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-800', icon: '\uD83D\uDCDD' },
  tip: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', icon: '\uD83D\uDCA1' },
  quote: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-800', icon: '\u201C' },
  custom: { bg: '', border: '', text: '', icon: '' },
};

const variantIcon = computed(() => variantStyles[localData.variant]?.icon || '');

const variantClasses = computed(() => {
  if (localData.variant === 'custom') return '';
  const s = variantStyles[localData.variant] || variantStyles.info;
  const border = localData.borderStyle === 'left'
    ? `border-l-4 ${s.border}`
    : localData.borderStyle === 'full'
    ? `border-2 ${s.border}`
    : '';
  return `${s.bg} ${s.text} ${border}`;
});

const customStyle = computed(() => {
  const base: any = {
    backgroundColor: localData.bgColor,
    color: localData.textColor,
  };
  if (localData.borderStyle === 'left') {
    base.borderLeft = `4px solid ${localData.borderColor}`;
  } else if (localData.borderStyle === 'full') {
    base.border = `2px solid ${localData.borderColor}`;
  }
  return base;
});

watch(() => props.modelValue, (v) => {
  Object.assign(localData, {
    variant: v.variant || 'info',
    title: v.title || '',
    content: v.content || '',
    collapsible: v.collapsible ?? false,
    borderStyle: v.borderStyle || 'left',
    bgColor: v.bgColor || '#eff6ff',
    borderColor: v.borderColor || '#3b82f6',
    textColor: v.textColor || '#1e3a5f',
  });
}, { deep: true });
</script>
