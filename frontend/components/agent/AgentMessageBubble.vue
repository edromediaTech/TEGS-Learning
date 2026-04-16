<template>
  <div
    class="flex mb-3"
    :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
      :class="bubbleClass"
    >
      <!-- Render simple markdown -->
      <div v-html="renderedContent" class="agent-content" />

      <!-- Timestamp -->
      <div class="text-[10px] mt-1 opacity-50 text-right">
        {{ formattedTime }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  msg: {
    role: 'user' | 'agent';
    content: string;
    timestamp: string;
  };
}

const props = defineProps<Props>();

const bubbleClass = computed(() =>
  props.msg.role === 'user'
    ? 'bg-blue-600 text-white rounded-br-md'
    : 'bg-gray-100 text-gray-800 rounded-bl-md'
);

const formattedTime = computed(() => {
  try {
    const d = new Date(props.msg.timestamp);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
});

/**
 * Simple markdown rendering (no external lib).
 * Supports: **bold**, *italic*, `code`, lists, line breaks.
 */
const renderedContent = computed(() => {
  let text = props.msg.content;

  // Escape HTML
  text = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Code: `text`
  text = text.replace(/`(.+?)`/g, '<code class="bg-gray-200 text-gray-800 px-1 rounded text-xs">$1</code>');

  // Lists: - item
  text = text.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');

  // Line breaks
  text = text.replace(/\n/g, '<br>');

  return text;
});
</script>

<style scoped>
.agent-content :deep(strong) {
  font-weight: 700;
}
.agent-content :deep(li) {
  margin-bottom: 2px;
}
</style>
