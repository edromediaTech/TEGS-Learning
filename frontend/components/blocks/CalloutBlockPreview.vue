<template>
  <div
    class="rounded-lg text-sm"
    :class="[variantClasses, data.collapsible ? 'cursor-pointer' : '', padding]"
    :style="data.variant === 'custom' ? customStyle : ''"
    @click="data.collapsible ? (collapsed = !collapsed) : null"
  >
    <div v-if="data.title" class="font-bold" :class="data.collapsible ? 'flex items-center justify-between' : 'mb-1'">
      <span>
        <span v-if="variantIcon">{{ variantIcon }} </span>{{ data.title }}
      </span>
      <span v-if="data.collapsible" class="text-xs ml-2 select-none">{{ collapsed ? '\u25B6' : '\u25BC' }}</span>
    </div>
    <div v-else-if="variantIcon && !data.collapsible" class="float-left mr-2 text-lg">{{ variantIcon }}</div>

    <div v-show="!collapsed" class="whitespace-pre-wrap" :class="data.title ? 'mt-1' : ''">{{ data.content }}</div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: any }>();
const collapsed = ref(props.data.collapsible ?? false);

const padding = 'p-4';

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

const variantIcon = computed(() => variantStyles[props.data.variant]?.icon || '');

const variantClasses = computed(() => {
  if (props.data.variant === 'custom') return '';
  const s = variantStyles[props.data.variant] || variantStyles.info;
  const borderStyle = props.data.borderStyle || 'left';
  const border = borderStyle === 'left'
    ? `border-l-4 ${s.border}`
    : borderStyle === 'full'
    ? `border-2 ${s.border}`
    : '';
  return `${s.bg} ${s.text} ${border}`;
});

const customStyle = computed(() => {
  const base: any = {
    backgroundColor: props.data.bgColor || '#eff6ff',
    color: props.data.textColor || '#1e3a5f',
  };
  const borderStyle = props.data.borderStyle || 'left';
  if (borderStyle === 'left') {
    base.borderLeft = `4px solid ${props.data.borderColor || '#3b82f6'}`;
  } else if (borderStyle === 'full') {
    base.border = `2px solid ${props.data.borderColor || '#3b82f6'}`;
  }
  return base;
});
</script>
