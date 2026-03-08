<template>
  <div class="space-y-1">
    <label class="block text-sm font-medium text-gray-700">Paragraphe</label>

    <!-- Barre d'outils -->
    <div class="border border-gray-300 rounded-t-lg bg-gray-50 px-1 py-1 flex flex-wrap items-center gap-0.5">
      <!-- Groupe : Style de bloc -->
      <select
        @change="execBlock(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = 'p'"
        class="toolbar-select"
        title="Style de bloc"
      >
        <option value="p">Paragraphe</option>
        <option value="h1">Titre 1</option>
        <option value="h2">Titre 2</option>
        <option value="h3">Titre 3</option>
        <option value="blockquote">Citation</option>
        <option value="pre">Code</option>
      </select>

      <!-- Groupe : Police -->
      <select
        @change="execCmd('fontName', ($event.target as HTMLSelectElement).value)"
        class="toolbar-select"
        title="Police"
      >
        <option value="sans-serif">Sans-serif</option>
        <option value="serif">Serif</option>
        <option value="monospace">Monospace</option>
        <option value="Georgia">Georgia</option>
        <option value="Verdana">Verdana</option>
        <option value="Arial">Arial</option>
        <option value="Times New Roman">Times New Roman</option>
      </select>

      <!-- Groupe : Taille -->
      <select
        @change="execCmd('fontSize', ($event.target as HTMLSelectElement).value)"
        class="toolbar-select w-16"
        title="Taille du texte"
      >
        <option value="2">Petit</option>
        <option value="3" selected>Normal</option>
        <option value="4">Moyen</option>
        <option value="5">Grand</option>
        <option value="6">Tres grand</option>
      </select>

      <div class="toolbar-sep"></div>

      <!-- Groupe : Formatage texte -->
      <button @click="execCmd('bold')" class="toolbar-btn" title="Gras (Ctrl+B)"><strong>B</strong></button>
      <button @click="execCmd('italic')" class="toolbar-btn" title="Italique (Ctrl+I)"><em>I</em></button>
      <button @click="execCmd('underline')" class="toolbar-btn" title="Souligne (Ctrl+U)"><u>U</u></button>
      <button @click="execCmd('strikeThrough')" class="toolbar-btn" title="Barre"><s>S</s></button>
      <button @click="execCmd('subscript')" class="toolbar-btn text-[10px]" title="Indice">X<sub>2</sub></button>
      <button @click="execCmd('superscript')" class="toolbar-btn text-[10px]" title="Exposant">X<sup>2</sup></button>
      <button @click="execCmd('removeFormat')" class="toolbar-btn" title="Effacer le formatage">
        <span class="text-[10px]">T<sub>x</sub></span>
      </button>

      <div class="toolbar-sep"></div>

      <!-- Groupe : Couleurs -->
      <label class="toolbar-btn relative" title="Couleur du texte">
        <span class="text-xs font-bold">A</span>
        <div class="absolute bottom-0.5 left-1 right-1 h-1 rounded" :style="{ background: textColor }"></div>
        <input type="color" v-model="textColor" @input="execCmd('foreColor', textColor)" class="sr-only" />
      </label>
      <label class="toolbar-btn relative" title="Surlignage">
        <span class="text-xs font-bold px-0.5 rounded" :style="{ background: bgColor, color: '#000' }">A</span>
        <input type="color" v-model="bgColor" @input="execCmd('hiliteColor', bgColor)" class="sr-only" />
      </label>

      <div class="toolbar-sep"></div>

      <!-- Groupe : Alignement -->
      <button @click="execCmd('justifyLeft')" class="toolbar-btn" title="Aligner a gauche">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm0 3h8v1.5H2zm0 3h12v1.5H2zm0 3h8v1.5H2z"/></svg>
      </button>
      <button @click="execCmd('justifyCenter')" class="toolbar-btn" title="Centrer">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M4 2h8v1.5H4zm2-0h12v1.5H2zm2 6h8v1.5H4zM2 8h12v1.5H2z" transform="translate(0,0)"/><rect x="4" y="2" width="8" height="1.5"/><rect x="2" y="5" width="12" height="1.5"/><rect x="4" y="8" width="8" height="1.5"/><rect x="2" y="11" width="12" height="1.5"/></svg>
      </button>
      <button @click="execCmd('justifyRight')" class="toolbar-btn" title="Aligner a droite">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm4 3h8v1.5H6zm-4 3h12v1.5H2zm4 3h8v1.5H6z"/></svg>
      </button>
      <button @click="execCmd('justifyFull')" class="toolbar-btn" title="Justifier">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2h12v1.5H2zm0 3h12v1.5H2zm0 3h12v1.5H2zm0 3h12v1.5H2z"/></svg>
      </button>

      <div class="toolbar-sep"></div>

      <!-- Groupe : Listes -->
      <button @click="execCmd('insertUnorderedList')" class="toolbar-btn" title="Liste a puces">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><circle cx="3" cy="3.5" r="1.5"/><rect x="6" y="2.5" width="8" height="1.5" rx="0.5"/><circle cx="3" cy="8" r="1.5"/><rect x="6" y="7" width="8" height="1.5" rx="0.5"/><circle cx="3" cy="12.5" r="1.5"/><rect x="6" y="11.5" width="8" height="1.5" rx="0.5"/></svg>
      </button>
      <button @click="execCmd('insertOrderedList')" class="toolbar-btn" title="Liste numerotee">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><text x="1" y="5" font-size="5" font-weight="bold">1</text><rect x="6" y="2.5" width="8" height="1.5" rx="0.5"/><text x="1" y="9.5" font-size="5" font-weight="bold">2</text><rect x="6" y="7" width="8" height="1.5" rx="0.5"/><text x="1" y="14" font-size="5" font-weight="bold">3</text><rect x="6" y="11.5" width="8" height="1.5" rx="0.5"/></svg>
      </button>
      <button @click="execCmd('indent')" class="toolbar-btn" title="Augmenter le retrait">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="1.5"/><rect x="6" y="5" width="8" height="1.5"/><rect x="6" y="8" width="8" height="1.5"/><rect x="2" y="11" width="12" height="1.5"/><path d="M2 5.5l3 2-3 2z"/></svg>
      </button>
      <button @click="execCmd('outdent')" class="toolbar-btn" title="Diminuer le retrait">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="1.5"/><rect x="6" y="5" width="8" height="1.5"/><rect x="6" y="8" width="8" height="1.5"/><rect x="2" y="11" width="12" height="1.5"/><path d="M5 5.5l-3 2 3 2z"/></svg>
      </button>

      <div class="toolbar-sep"></div>

      <!-- Groupe : Insertion -->
      <button @click="insertLink" class="toolbar-btn" title="Inserer un lien">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><path d="M6.5 9.5a3 3 0 004.2.3l2-2a3 3 0 00-4.2-4.3l-1 1m2 1.5a3 3 0 00-4.2-.3l-2 2a3 3 0 004.2 4.3l1-1"/></svg>
      </button>
      <button @click="execCmd('unlink')" class="toolbar-btn" title="Supprimer le lien">
        <svg class="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><path d="M6.5 9.5a3 3 0 004.2.3l2-2a3 3 0 00-4.2-4.3l-1 1m2 1.5a3 3 0 00-4.2-.3l-2 2a3 3 0 004.2 4.3l1-1"/><line x1="2" y1="14" x2="14" y2="2" stroke-width="2"/></svg>
      </button>
      <button @click="insertImage" class="toolbar-btn" title="Inserer une image">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><circle cx="5" cy="6" r="1.5"/><path d="M1.5 11l3.5-3.5 2.5 2.5 2-1.5 5 4"/></svg>
      </button>
      <button @click="insertHR" class="toolbar-btn" title="Ligne horizontale">
        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 16 16"><rect x="2" y="7" width="12" height="2" rx="1"/></svg>
      </button>

      <div class="toolbar-sep"></div>

      <!-- Code source -->
      <button
        @click="toggleSource"
        class="toolbar-btn text-[10px] font-mono"
        :class="sourceMode ? 'bg-gray-300 text-gray-800' : ''"
        title="Code source HTML"
      >&lt;/&gt;</button>
    </div>

    <!-- Zone d'edition WYSIWYG -->
    <div
      v-show="!sourceMode"
      ref="editorRef"
      contenteditable="true"
      @input="onInput"
      @paste="onPaste"
      class="w-full min-h-[180px] max-h-[400px] overflow-y-auto px-3 py-2 border border-gray-300 border-t-0 rounded-b-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm leading-relaxed prose prose-sm max-w-none"
      :style="{ direction: 'ltr' }"
      data-placeholder="Inserez votre texte ici..."
    ></div>

    <!-- Zone source HTML -->
    <textarea
      v-show="sourceMode"
      v-model="sourceHtml"
      @input="onSourceInput"
      rows="8"
      class="w-full px-3 py-2 border border-gray-300 border-t-0 rounded-b-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-xs"
      placeholder="<p>Code HTML ici...</p>"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { content: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const editorRef = ref<HTMLDivElement | null>(null);
const sourceMode = ref(false);
const sourceHtml = ref('');
const textColor = ref('#000000');
const bgColor = ref('#ffff00');
const isInternalUpdate = ref(false);

function execCmd(cmd: string, value?: string) {
  editorRef.value?.focus();
  document.execCommand(cmd, false, value || '');
  emitContent();
}

function execBlock(tag: string) {
  editorRef.value?.focus();
  document.execCommand('formatBlock', false, `<${tag}>`);
  emitContent();
}

function insertLink() {
  const url = prompt('URL du lien :', 'https://');
  if (url) {
    editorRef.value?.focus();
    document.execCommand('createLink', false, url);
    emitContent();
  }
}

function insertImage() {
  const url = prompt('URL de l\'image :', 'https://');
  if (url) {
    editorRef.value?.focus();
    document.execCommand('insertImage', false, url);
    emitContent();
  }
}

function insertHR() {
  editorRef.value?.focus();
  document.execCommand('insertHorizontalRule');
  emitContent();
}

function toggleSource() {
  if (sourceMode.value) {
    // Retour en mode WYSIWYG
    if (editorRef.value) {
      isInternalUpdate.value = true;
      editorRef.value.innerHTML = sourceHtml.value;
    }
    sourceMode.value = false;
    emitContent();
  } else {
    // Passer en mode source
    sourceHtml.value = editorRef.value?.innerHTML || '';
    sourceMode.value = true;
  }
}

function onSourceInput() {
  emit('update:modelValue', { ...props.modelValue, content: sourceHtml.value });
}

function onInput() {
  emitContent();
}

function onPaste(e: ClipboardEvent) {
  // Coller en texte enrichi mais nettoyer les attributs Word/Google Docs
  const html = e.clipboardData?.getData('text/html');
  if (html) {
    e.preventDefault();
    // Nettoyer les styles inline excessifs de Word
    const cleaned = html
      .replace(/class="[^"]*"/gi, '')
      .replace(/style="[^"]*mso[^"]*"/gi, '')
      .replace(/<o:p>[\s\S]*?<\/o:p>/gi, '');
    document.execCommand('insertHTML', false, cleaned);
    emitContent();
  }
}

function emitContent() {
  const html = editorRef.value?.innerHTML || '';
  emit('update:modelValue', { ...props.modelValue, content: html });
}

// Charger le contenu initial et reagir aux changements externes
function loadContent() {
  if (!editorRef.value) return;
  const currentContent = props.modelValue.content || '';
  // Detecter si c'est du markdown legacy et le convertir
  const isHtml = /<[a-z][\s\S]*>/i.test(currentContent);
  if (isHtml) {
    editorRef.value.innerHTML = currentContent;
  } else {
    // Convertir le markdown basique en HTML
    editorRef.value.innerHTML = markdownToHtml(currentContent);
    // Emettre la version HTML convertie
    if (currentContent.trim()) emitContent();
  }
}

function markdownToHtml(md: string): string {
  if (!md.trim()) return '';
  let text = md;
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
  text = text.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  text = text.replace(/<\/ul>\s*<ul>/g, '');
  // Paragraphes
  const lines = text.split('\n\n');
  text = lines.map(l => {
    if (l.startsWith('<h') || l.startsWith('<ul') || l.startsWith('<ol')) return l;
    return `<p>${l.replace(/\n/g, '<br>')}</p>`;
  }).join('');
  return text;
}

onMounted(() => {
  loadContent();
});

watch(() => props.modelValue.content, (newVal) => {
  if (!editorRef.value) return;
  // Ne pas re-charger si c'est nous qui avons emis le changement
  if (editorRef.value.innerHTML !== newVal && !editorRef.value.matches(':focus')) {
    isInternalUpdate.value = true;
    editorRef.value.innerHTML = newVal || '';
  }
});
</script>

<style scoped>
.toolbar-btn {
  @apply w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 active:bg-gray-300 text-gray-700 transition cursor-pointer text-xs;
}
.toolbar-select {
  @apply h-7 px-1 text-xs border border-gray-300 rounded bg-white text-gray-700 cursor-pointer hover:border-gray-400 focus:ring-1 focus:ring-primary-400;
}
.toolbar-sep {
  @apply w-px h-6 bg-gray-300 mx-0.5;
}
[contenteditable]:empty:before {
  content: attr(data-placeholder);
  color: #9ca3af;
  pointer-events: none;
}
[contenteditable] {
  outline: none;
}
</style>
