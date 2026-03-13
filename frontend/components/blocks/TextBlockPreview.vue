<template>
  <div class="prose prose-sm max-w-none" v-html="rendered"></div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { content: string } }>();

function sanitizeStyle(style: string): string {
  // Keep only safe CSS properties from WYSIWYG (color, background, font, text)
  const safe = style.split(';')
    .map(s => s.trim())
    .filter(s => {
      const prop = s.split(':')[0]?.trim().toLowerCase() || '';
      return /^(color|background-color|background|font-size|font-family|font-weight|font-style|text-align|text-decoration)$/.test(prop);
    })
    .join('; ');
  return safe;
}

const rendered = computed(() => {
  const text = props.data.content || '';

  // Si c'est du HTML (genere par l'editeur WYSIWYG), l'afficher directement
  // en nettoyant les balises dangereuses et le balisage Word/MSO
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text
      // Remove all HTML comments (Word conditionals, StartFragment, etc.)
      .replace(/<!--[\s\S]*?-->/g, '')
      // Remove XML declarations and namespace tags
      .replace(/<\?xml[\s\S]*?\?>/gi, '')
      .replace(/<\/?\w+:[^>]*>/gi, '')
      // Remove dangerous tags
      .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
      .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|style|meta|base)[^>]*>/gi, '')
      .replace(/\bon\w+\s*=/gi, '')
      // Remove <mark> tags (Google highlights) but keep content
      .replace(/<\/?mark[^>]*>/gi, '')
      // Remove data-*, js* attributes (Google), class, lang, dir
      .replace(/\s*(?:data-\w[\w-]*|jscontroller|jsuid|jsname|jsaction|class|lang|dir)="[^"]*"/gi, '')
      // Sanitize style attributes: keep safe CSS properties only
      .replace(/\s*style="([^"]*)"/gi, (_m, s) => {
        const safe = sanitizeStyle(s);
        return safe ? ` style="${safe}"` : '';
      })
      // Clean up empty spans (no attributes left)
      .replace(/<span\s*>\s*([\s\S]*?)\s*<\/span>/gi, '$1');
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
