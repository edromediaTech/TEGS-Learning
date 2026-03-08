<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Loading -->
      <div v-if="store.loading && !store.currentScreen" class="text-center py-12 text-gray-500">
        Chargement de l'ecran...
      </div>

      <!-- Erreur -->
      <div v-else-if="store.error && !store.currentScreen" class="text-center py-12">
        <p class="text-red-500 mb-4">{{ store.error }}</p>
        <NuxtLink :to="`/admin/modules/${moduleId}/structure`" class="text-primary-600 hover:text-primary-800">
          Retour a la structure
        </NuxtLink>
      </div>

      <!-- Studio 3 colonnes -->
      <div v-else-if="store.currentScreen" class="h-[calc(100vh-80px)] flex flex-col">
        <!-- Barre superieure Studio -->
        <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between flex-shrink-0">
          <div class="flex items-center space-x-3">
            <NuxtLink
              :to="`/admin/modules/${moduleId}/structure`"
              class="text-sm text-primary-600 hover:text-primary-800"
            >
              &larr; Retour
            </NuxtLink>
            <div class="h-5 w-px bg-gray-300"></div>
            <h1 class="text-lg font-bold text-gray-900">{{ store.currentScreen.moduleTitle }}</h1>
            <span class="text-gray-400">/</span>
            <span class="text-sm text-gray-600">{{ store.currentScreen.screen.title }}</span>
          </div>
          <div class="flex items-center space-x-3">
            <div class="bg-gray-100 rounded-lg p-0.5 flex">
              <button
                @click="mode = 'edit'; clearError()"
                class="px-3 py-1 rounded-md text-xs font-medium transition"
                :class="mode === 'edit' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'"
              >
                Editeur
              </button>
              <button
                @click="mode = 'preview'; clearError()"
                class="px-3 py-1 rounded-md text-xs font-medium transition"
                :class="mode === 'preview' ? 'bg-white shadow text-primary-700' : 'text-gray-500 hover:text-gray-700'"
              >
                Apercu
              </button>
            </div>
            <button
              @click="save"
              :disabled="saving"
              class="bg-primary-600 text-white px-4 py-1.5 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 text-sm font-medium"
            >
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div v-if="saved" class="mx-4 mt-2 p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs flex-shrink-0">
          Contenu sauvegarde avec succes !
        </div>
        <div v-if="store.error" class="mx-4 mt-2 p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex-shrink-0">
          {{ store.error }}
        </div>

        <!-- ===== MODE EDITEUR : Layout 3 colonnes ===== -->
        <div v-if="mode === 'edit'" class="flex flex-1 overflow-hidden mt-2">
          <!-- COLONNE GAUCHE : Liste des slides -->
          <div class="w-56 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
            <div class="px-3 py-2 border-b border-gray-200">
              <p class="text-xs font-bold text-gray-500 uppercase">{{ store.currentScreen.sectionTitle }}</p>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
              <NuxtLink
                v-for="screen in sectionScreens"
                :key="screen._id"
                :to="`/admin/modules/${moduleId}/screens/${screen._id}`"
                class="block px-3 py-2 rounded-lg text-sm transition truncate"
                :class="screen._id === screenId
                  ? 'bg-primary-100 text-primary-800 font-medium border border-primary-300'
                  : 'text-gray-600 hover:bg-gray-100'"
              >
                {{ screen.title }}
              </NuxtLink>
            </div>
          </div>

          <!-- COLONNE CENTRALE : Canevas -->
          <div class="flex-1 overflow-y-auto p-4 bg-gray-100">
            <div class="max-w-3xl mx-auto space-y-3">
              <!-- Blocs existants -->
              <div
                v-for="(block, idx) in blocks"
                :key="idx"
                class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <!-- Header du bloc -->
                <div class="bg-gray-50 px-3 py-1.5 flex items-center justify-between border-b border-gray-200">
                  <div class="flex items-center space-x-2">
                    <span
                      class="px-2 py-0.5 text-xs font-bold rounded"
                      :class="blockTypeClass(block.type)"
                    >
                      {{ blockTypeLabel(block.type) }}
                    </span>
                    <span class="text-xs text-gray-400">{{ idx + 1 }}</span>
                  </div>
                  <div class="flex items-center space-x-1">
                    <button
                      v-if="idx > 0"
                      @click="moveBlock(idx, -1)"
                      class="text-gray-400 hover:text-gray-600 px-1 text-sm"
                      title="Monter"
                    >&uarr;</button>
                    <button
                      v-if="idx < blocks.length - 1"
                      @click="moveBlock(idx, 1)"
                      class="text-gray-400 hover:text-gray-600 px-1 text-sm"
                      title="Descendre"
                    >&darr;</button>
                    <button
                      @click="removeBlock(idx)"
                      class="text-red-400 hover:text-red-600 px-2 text-xs"
                    >Supprimer</button>
                  </div>
                </div>

                <!-- Editeur du bloc -->
                <div class="p-4">
                  <BlocksTextBlockEdit v-if="block.type === 'text'" v-model="block.data" />
                  <BlocksMediaBlockEdit v-if="block.type === 'media'" v-model="block.data" />
                  <BlocksQuizBlockEdit v-if="block.type === 'quiz'" v-model="block.data" :block-id="String(idx)" />
                  <BlocksHeadingBlockEdit v-if="block.type === 'heading'" v-model="block.data" />
                  <BlocksSeparatorBlockEdit v-if="block.type === 'separator'" v-model="block.data" />
                  <BlocksImageBlockEdit v-if="block.type === 'image'" v-model="block.data" />
                  <BlocksTextImageBlockEdit v-if="block.type === 'text_image'" v-model="block.data" />
                  <BlocksVideoBlockEdit v-if="block.type === 'video'" v-model="block.data" />
                  <BlocksAudioBlockEdit v-if="block.type === 'audio'" v-model="block.data" />
                  <BlocksPdfBlockEdit v-if="block.type === 'pdf'" v-model="block.data" />
                  <BlocksEmbedBlockEdit v-if="block.type === 'embed'" v-model="block.data" />
                  <BlocksTrueFalseBlockEdit v-if="block.type === 'true_false'" v-model="block.data" />
                  <BlocksNumericBlockEdit v-if="block.type === 'numeric'" v-model="block.data" />
                  <BlocksFillBlankBlockEdit v-if="block.type === 'fill_blank'" v-model="block.data" />
                  <BlocksMatchingBlockEdit v-if="block.type === 'matching'" v-model="block.data" />
                  <BlocksSequenceBlockEdit v-if="block.type === 'sequence'" v-model="block.data" />
                  <BlocksLikertBlockEdit v-if="block.type === 'likert'" v-model="block.data" />
                </div>
              </div>

              <!-- Zone de depot vide -->
              <div v-if="blocks.length === 0" class="border-2 border-dashed border-gray-300 rounded-xl py-16 text-center text-gray-400">
                <p class="text-lg mb-2">Glissez/deposez un nouveau bloc ici</p>
                <p class="text-sm">ou choisissez un bloc dans la palette a droite</p>
              </div>
            </div>
          </div>

          <!-- COLONNE DROITE : Palette -->
          <div class="w-64 bg-white border-l border-gray-200 flex flex-col flex-shrink-0">
            <!-- Onglets Palette -->
            <div class="flex border-b border-gray-200 flex-shrink-0">
              <button
                @click="paletteTab = 'blocs'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'blocs' ? 'border-primary-600 text-primary-700 bg-primary-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Blocs
              </button>
              <button
                @click="paletteTab = 'questions'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'questions' ? 'border-green-600 text-green-700 bg-green-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Questions
              </button>
              <button
                @click="paletteTab = 'aide'"
                class="flex-1 px-2 py-2.5 text-xs font-bold uppercase border-b-2 transition"
                :class="paletteTab === 'aide' ? 'border-amber-600 text-amber-700 bg-amber-50' : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                Aide
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-3">
              <!-- Blocs contenu -->
              <div v-if="paletteTab === 'blocs'" class="grid grid-cols-2 gap-2">
                <button
                  v-for="b in contentBlocks"
                  :key="b.type"
                  @click="addBlock(b.type)"
                  class="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:shadow-sm transition text-xs text-gray-600 hover:text-primary-700 cursor-pointer"
                >
                  <span class="text-lg mb-1">{{ b.icon }}</span>
                  <span class="font-medium text-center leading-tight">{{ b.label }}</span>
                </button>
              </div>

              <!-- Blocs questions -->
              <div v-if="paletteTab === 'questions'" class="grid grid-cols-2 gap-2">
                <button
                  v-for="b in questionBlocks"
                  :key="b.type"
                  @click="addBlock(b.type)"
                  class="flex flex-col items-center p-3 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 hover:shadow-sm transition text-xs text-gray-600 hover:text-green-700 cursor-pointer"
                >
                  <span class="text-lg mb-1">{{ b.icon }}</span>
                  <span class="font-medium text-center leading-tight">{{ b.label }}</span>
                </button>
              </div>

              <!-- Aide -->
              <div v-if="paletteTab === 'aide'" class="text-sm text-gray-600 space-y-3">
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Comment utiliser le Studio</h4>
                  <p class="text-xs leading-relaxed">Cliquez sur un bloc dans les onglets <strong>Blocs</strong> ou <strong>Questions</strong> pour l'ajouter a l'ecran.</p>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Reordonner</h4>
                  <p class="text-xs leading-relaxed">Utilisez les fleches haut/bas sur chaque bloc pour changer l'ordre.</p>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Apercu</h4>
                  <p class="text-xs leading-relaxed">Basculez en mode <strong>Apercu</strong> pour voir le rendu eleve.</p>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Types de blocs</h4>
                  <ul class="text-xs space-y-1 ml-3 list-disc">
                    <li><strong>Titre</strong> : H1, H2, H3</li>
                    <li><strong>Paragraphe</strong> : Texte avec markdown</li>
                    <li><strong>Image</strong> : URL avec taille ajustable</li>
                    <li><strong>Texte + Image</strong> : Layout cote a cote</li>
                    <li><strong>Video</strong> : YouTube ou MP4</li>
                    <li><strong>Audio</strong> : Fichier MP3</li>
                    <li><strong>PDF</strong> : Document integre</li>
                    <li><strong>Embed</strong> : Iframe externe</li>
                  </ul>
                </div>
                <div>
                  <h4 class="font-bold text-gray-800 mb-1">Types de questions</h4>
                  <ul class="text-xs space-y-1 ml-3 list-disc">
                    <li><strong>QCM/QCU</strong> : Choix multiples</li>
                    <li><strong>Vrai/Faux</strong> : Assertion</li>
                    <li><strong>Numerique</strong> : Reponse chiffree</li>
                    <li><strong>Texte a trous</strong> : Completer le texte</li>
                    <li><strong>Appariement</strong> : Associer des paires</li>
                    <li><strong>Sequence</strong> : Ordonner</li>
                    <li><strong>Likert</strong> : Echelle d'opinion</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== MODE PREVIEW ===== -->
        <div v-if="mode === 'preview'" class="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div class="max-w-3xl mx-auto">
            <div class="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              <div class="bg-primary-800 text-white px-6 py-4">
                <p class="text-sm text-primary-200">{{ store.currentScreen.sectionTitle }}</p>
                <h2 class="text-xl font-bold">{{ store.currentScreen.screen.title }}</h2>
              </div>

              <div class="p-6 space-y-6">
                <div v-if="blocks.length === 0" class="text-center py-8 text-gray-400">
                  Cet ecran est vide.
                </div>

                <div v-for="(block, idx) in sortedBlocks" :key="idx">
                  <BlocksTextBlockPreview v-if="block.type === 'text'" :data="block.data" />
                  <BlocksMediaBlockPreview v-if="block.type === 'media'" :data="block.data" />
                  <BlocksQuizBlockPreview v-if="block.type === 'quiz'" :data="block.data" />
                  <BlocksHeadingBlockPreview v-if="block.type === 'heading'" :data="block.data" />
                  <BlocksSeparatorBlockPreview v-if="block.type === 'separator'" :data="block.data" />
                  <BlocksImageBlockPreview v-if="block.type === 'image'" :data="block.data" />
                  <BlocksTextImageBlockPreview v-if="block.type === 'text_image'" :data="block.data" />
                  <BlocksVideoBlockPreview v-if="block.type === 'video'" :data="block.data" />
                  <BlocksAudioBlockPreview v-if="block.type === 'audio'" :data="block.data" />
                  <BlocksPdfBlockPreview v-if="block.type === 'pdf'" :data="block.data" />
                  <BlocksEmbedBlockPreview v-if="block.type === 'embed'" :data="block.data" />
                  <BlocksTrueFalseBlockPreview v-if="block.type === 'true_false'" :data="block.data" />
                  <BlocksNumericBlockPreview v-if="block.type === 'numeric'" :data="block.data" />
                  <BlocksFillBlankBlockPreview v-if="block.type === 'fill_blank'" :data="block.data" />
                  <BlocksMatchingBlockPreview v-if="block.type === 'matching'" :data="block.data" />
                  <BlocksSequenceBlockPreview v-if="block.type === 'sequence'" :data="block.data" />
                  <BlocksLikertBlockPreview v-if="block.type === 'likert'" :data="block.data" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { ContentBlock, BlockType } from '~/stores/modules';

definePageMeta({ middleware: 'auth' });

const route = useRoute();
const store = useModulesStore();

const moduleId = route.params.id as string;
const screenId = route.params.screenId as string;

const mode = ref<'edit' | 'preview'>('edit');
const saving = ref(false);
const saved = ref(false);

interface EditableBlock {
  type: BlockType;
  order: number;
  data: any;
}

const blocks = ref<EditableBlock[]>([]);
const paletteTab = ref<'blocs' | 'questions' | 'aide'>('blocs');

const contentBlocks = [
  { type: 'heading' as BlockType, icon: 'H', label: 'Titre' },
  { type: 'text' as BlockType, icon: '\u00B6', label: 'Paragraphe' },
  { type: 'separator' as BlockType, icon: '\u2500', label: 'Separateur' },
  { type: 'image' as BlockType, icon: '\uD83D\uDDBC', label: 'Image' },
  { type: 'text_image' as BlockType, icon: '\uD83D\uDCF0', label: 'Texte + Image' },
  { type: 'video' as BlockType, icon: '\u25B6', label: 'Video' },
  { type: 'audio' as BlockType, icon: '\uD83D\uDD0A', label: 'Audio' },
  { type: 'pdf' as BlockType, icon: '\uD83D\uDCC4', label: 'PDF' },
  { type: 'embed' as BlockType, icon: '\u2699', label: 'Objet integre' },
  { type: 'media' as BlockType, icon: '\uD83C\uDFA5', label: 'Media (legacy)' },
];

const questionBlocks = [
  { type: 'quiz' as BlockType, icon: '\u2611', label: 'QCM / QCU' },
  { type: 'true_false' as BlockType, icon: '\u2713\u2717', label: 'Vrai / Faux' },
  { type: 'numeric' as BlockType, icon: '#', label: 'Numerique' },
  { type: 'fill_blank' as BlockType, icon: '_\u2026', label: 'Texte a trous' },
  { type: 'matching' as BlockType, icon: '\u21C4', label: 'Appariement' },
  { type: 'sequence' as BlockType, icon: '1\u20262\u20263', label: 'Sequence' },
  { type: 'likert' as BlockType, icon: '\u2605', label: 'Likert' },
];

// Liste des ecrans de la section courante (sidebar gauche)
const sectionScreens = computed(() => {
  if (!store.current?.sections) return [];
  const sectionTitle = store.currentScreen?.sectionTitle;
  const section = store.current.sections.find(s => s.title === sectionTitle);
  return section?.screens || [];
});

const sortedBlocks = computed(() =>
  [...blocks.value].sort((a, b) => a.order - b.order)
);

function loadBlocks() {
  if (!store.currentScreen?.screen) return;
  const existing = store.currentScreen.screen.contentBlocks || [];
  blocks.value = existing.map((b, i) => ({
    type: b.type,
    order: b.order ?? i,
    data: JSON.parse(JSON.stringify(b.data)),
  }));
}

function defaultData(type: string): any {
  const defaults: Record<string, any> = {
    text: { content: '' },
    media: { url: '', mediaType: 'image', caption: '' },
    quiz: { question: '', options: [{ text: '', isCorrect: true }, { text: '', isCorrect: false }], explanation: '' },
    heading: { text: '', level: 1 },
    separator: { style: 'solid' },
    image: { url: '', alt: '', caption: '', size: 'full' },
    text_image: { text: '', imageUrl: '', layout: 'text-left' },
    video: { url: '', caption: '' },
    audio: { url: '', title: '' },
    pdf: { url: '', title: '', height: 500 },
    embed: { url: '', width: 800, height: 500, title: '' },
    true_false: { statement: '', answer: true, explanation: '' },
    numeric: { question: '', answer: 0, tolerance: 0, unit: '', explanation: '' },
    fill_blank: { text: '', explanation: '' },
    matching: { instruction: '', pairs: [{ left: '', right: '' }, { left: '', right: '' }], explanation: '' },
    sequence: { instruction: '', items: ['', '', ''], explanation: '' },
    likert: { question: '', scale: 'agreement' },
  };
  return defaults[type] || {};
}

function clearError() {
  store.error = null;
}

function addBlock(type: BlockType) {
  clearError();
  blocks.value.push({
    type,
    order: blocks.value.length,
    data: defaultData(type),
  });
}

function removeBlock(idx: number) {
  clearError();
  blocks.value.splice(idx, 1);
  reorder();
}

function moveBlock(idx: number, dir: number) {
  const target = idx + dir;
  const temp = blocks.value[idx];
  blocks.value[idx] = blocks.value[target];
  blocks.value[target] = temp;
  reorder();
}

function reorder() {
  blocks.value.forEach((b, i) => { b.order = i; });
}

function blockTypeLabel(type: string) {
  const labels: Record<string, string> = {
    text: 'TEXTE', media: 'MEDIA', quiz: 'QCM',
    heading: 'TITRE', separator: 'SEPARATEUR', image: 'IMAGE',
    text_image: 'TEXTE + IMAGE', video: 'VIDEO', audio: 'AUDIO',
    pdf: 'PDF', embed: 'EMBED',
    true_false: 'VRAI/FAUX', numeric: 'NUMERIQUE', fill_blank: 'TEXTE A TROUS',
    matching: 'APPARIEMENT', sequence: 'SEQUENCE', likert: 'LIKERT',
  };
  return labels[type] || type.toUpperCase();
}

function blockTypeClass(type: string) {
  const classes: Record<string, string> = {
    text: 'bg-blue-100 text-blue-700',
    media: 'bg-purple-100 text-purple-700',
    quiz: 'bg-green-100 text-green-700',
    heading: 'bg-gray-800 text-white',
    separator: 'bg-gray-200 text-gray-600',
    image: 'bg-pink-100 text-pink-700',
    text_image: 'bg-cyan-100 text-cyan-700',
    video: 'bg-red-100 text-red-700',
    audio: 'bg-yellow-100 text-yellow-700',
    pdf: 'bg-orange-100 text-orange-700',
    embed: 'bg-slate-100 text-slate-700',
    true_false: 'bg-amber-100 text-amber-700',
    numeric: 'bg-indigo-100 text-indigo-700',
    fill_blank: 'bg-teal-100 text-teal-700',
    matching: 'bg-violet-100 text-violet-700',
    sequence: 'bg-orange-100 text-orange-700',
    likert: 'bg-pink-100 text-pink-700',
  };
  return classes[type] || 'bg-gray-100 text-gray-700';
}

async function save() {
  saving.value = true;
  saved.value = false;
  store.error = null;
  try {
    const payload = blocks.value.map((b, i) => ({
      type: b.type,
      order: i,
      data: b.data,
    }));
    await store.saveScreenContent(moduleId, screenId, payload);
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 3000);
  } catch {
    // error in store
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  // Charger le module complet (pour la sidebar des ecrans)
  await Promise.all([
    store.fetchModule(moduleId),
    store.fetchScreen(moduleId, screenId),
  ]);
  loadBlocks();
});
</script>
