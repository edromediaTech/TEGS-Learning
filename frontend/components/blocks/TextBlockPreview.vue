<template>
  <div class="prose prose-sm max-w-none" v-html="rendered"></div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { content: string } }>();

const rendered = computed(() => {
  const text = props.data.content || '';

  // Si c'est du HTML (genere par l'editeur WYSIWYG), l'afficher directement
  // en nettoyant uniquement les balises dangereuses
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text
      .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
      .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|style|meta|base)[^>]*>/gi, '')
      .replace(/\bon\w+\s*=/gi, '');
  }

  // Fallback : ancien contenu markdown
  let md = text;
  md = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  md = md.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-1">$1</h3>');
  md = md.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>');
  md = md.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*(.+?)\*/g, '<em>$1</em>');
  md = md.replace(/^- (.+)$/gm, '<li class="ml-4">$1</li>');
  md = md.replace(/\n\n/g, '</p><p class="mb-2">');
  md = md.replace(/\n/g, '<br>');
  return `<p class="mb-2">${md}</p>`;
});
</script>
