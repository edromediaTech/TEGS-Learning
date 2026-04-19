<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <!-- Progress bar -->
    <div class="flex items-center px-6 py-4 border-b bg-gray-50">
      <div
        v-for="(s, i) in steps"
        :key="s.key"
        class="flex items-center"
        :class="{ 'flex-1': i < steps.length - 1 }"
      >
        <div
          class="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
          :class="stepIndex >= i ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'"
        >
          {{ i + 1 }}
        </div>
        <div class="ml-2 text-sm font-medium hidden sm:block" :class="stepIndex >= i ? 'text-gray-900' : 'text-gray-400'">
          {{ s.label }}
        </div>
        <div v-if="i < steps.length - 1" class="flex-1 h-0.5 mx-3" :class="stepIndex > i ? 'bg-primary-600' : 'bg-gray-200'" />
      </div>
    </div>

    <!-- Etape 1 : Source -->
    <div v-if="stepIndex === 0" class="p-6 space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Choisissez une source</h2>
        <p class="text-sm text-gray-500 mt-1">Importez un document (PDF texte, Word .docx, texte simple) ou collez un lien public.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          class="border-2 border-dashed rounded-xl p-5 cursor-pointer transition"
          :class="sourceKind === 'file' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'"
          @click="sourceKind = 'file'"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">&#x1F4C4;</span>
            <span class="font-medium">Importer un fichier</span>
          </div>
          <p class="text-xs text-gray-500 mb-3">PDF, Word (.docx) ou .txt — 20 Mo maximum.</p>
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            class="block w-full text-sm"
            @change="onFileChange"
          />
          <p v-if="file" class="text-xs text-green-700 mt-2">Selection : {{ file.name }} ({{ formatSize(file.size) }})</p>
        </div>

        <div
          class="border-2 border-dashed rounded-xl p-5 cursor-pointer transition"
          :class="sourceKind === 'url' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'"
          @click="sourceKind = 'url'"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl">&#x1F517;</span>
            <span class="font-medium">Coller un lien</span>
          </div>
          <p class="text-xs text-gray-500 mb-3">Page web publique (article, page Wikipedia, etc.).</p>
          <input
            v-model="url"
            type="url"
            placeholder="https://..."
            class="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>

      <div class="flex justify-end pt-2">
        <button
          class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-40"
          :disabled="!canGoToStep2"
          @click="stepIndex = 1"
        >
          Suivant
        </button>
      </div>
    </div>

    <!-- Etape 2 : Mode -->
    <div v-if="stepIndex === 1" class="p-6 space-y-5">
      <div>
        <h2 class="text-lg font-semibold text-gray-900">Que voulez-vous obtenir ?</h2>
        <p class="text-sm text-gray-500 mt-1">Choisissez le type de sortie a generer.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          class="text-left border-2 rounded-xl p-5 transition"
          :class="extractionMode === 'DATA' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'"
          @click="extractionMode = 'DATA'"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl">&#x1F4DA;</span>
            <span class="font-medium">Generer des questions</span>
          </div>
          <p class="text-xs text-gray-500">Transforme le contenu en banque de questions pedagogiques (QCM, Vrai/Faux, ouvertes).</p>
        </button>

        <button
          class="text-left border-2 rounded-xl p-5 transition"
          :class="extractionMode === 'STRUCTURE' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'"
          @click="extractionMode = 'STRUCTURE'"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xl">&#x1F4DD;</span>
            <span class="font-medium">Detecter la structure</span>
          </div>
          <p class="text-xs text-gray-500">Identifie les champs d'un formulaire (texte, email, date, liste) a reproduire.</p>
        </button>
      </div>

      <div v-if="extractionMode === 'DATA'" class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de questions</label>
          <input v-model.number="questionCount" type="number" min="1" max="20" class="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Type de question</label>
          <select v-model="questionType" class="w-full px-3 py-2 border rounded-lg text-sm">
            <option value="quiz">QCM (choix multiples)</option>
            <option value="true_false">Vrai / Faux</option>
            <option value="open_answer">Ouvertes</option>
            <option value="mixed">Variees</option>
          </select>
        </div>
        <div v-if="questionType === 'quiz' || questionType === 'mixed'">
          <label class="block text-sm font-medium text-gray-700 mb-1">Options par QCM</label>
          <input v-model.number="optionCount" type="number" min="2" max="6" class="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
      </div>

      <div v-if="extractionMode === 'DATA'" class="pt-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Ou enregistrer le resultat ?</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            class="text-left border-2 rounded-xl p-4 transition"
            :class="targetType === 'module_draft' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'"
            @click="targetType = 'module_draft'"
          >
            <div class="flex items-center gap-2 mb-1 text-sm font-medium">
              <span>&#x1F4D6;</span> Module brouillon
            </div>
            <p class="text-xs text-gray-500">Cree un module reutilisable dans le Studio.</p>
          </button>
          <button
            class="text-left border-2 rounded-xl p-4 transition"
            :class="targetType === 'tournament_draft' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'"
            @click="targetType = 'tournament_draft'"
          >
            <div class="flex items-center gap-2 mb-1 text-sm font-medium">
              <span>&#x1F3C6;</span> Tournoi brouillon
            </div>
            <p class="text-xs text-gray-500">Cree un module + un tournoi pret a configurer.</p>
          </button>
        </div>
      </div>

      <div class="pt-2">
        <label class="block text-sm font-medium text-gray-700 mb-1">Titre du brouillon (optionnel)</label>
        <input v-model="targetTitle" placeholder="Ex. Concours Histoire d'Haiti" class="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>

      <div class="flex justify-between pt-2">
        <button class="px-4 py-2 rounded-lg border text-sm" @click="stepIndex = 0">Retour</button>
        <button
          class="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium disabled:opacity-40"
          :disabled="analyzing"
          @click="runAnalysis"
        >
          <span v-if="!analyzing">Analyser</span>
          <span v-else>Analyse en cours...</span>
        </button>
      </div>

      <p v-if="analysisError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{{ analysisError }}</p>
    </div>

    <!-- Etape 3 : Revision -->
    <div v-if="stepIndex === 2" class="p-6 space-y-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Revision et edition</h2>
          <p class="text-sm text-gray-500 mt-1">Modifiez, supprimez ou ajoutez des elements avant d'enregistrer le brouillon.</p>
        </div>
        <span class="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 whitespace-nowrap">Brouillon — pas encore enregistre</span>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Titre du brouillon</label>
        <input v-model="proposalTitle" class="w-full px-3 py-2 border rounded-lg text-sm" />
      </div>

      <!-- Questions (mode DATA) -->
      <div v-if="proposalMode === 'DATA'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700">Questions ({{ editedQuestions.length }})</h3>
          <button class="text-sm text-primary-600 hover:underline" @click="addQuestion">+ Ajouter une question</button>
        </div>

        <div
          v-for="(q, i) in editedQuestions"
          :key="i"
          class="border rounded-xl p-4 space-y-3 bg-gray-50/60"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1">
              <label class="text-xs text-gray-500">Question {{ i + 1 }}</label>
              <textarea
                v-model="q.prompt"
                rows="2"
                class="w-full px-3 py-2 border rounded-lg text-sm mt-1"
              />
            </div>
            <div class="flex flex-col gap-2 shrink-0">
              <select v-model="q.type" class="border rounded px-2 py-1 text-xs">
                <option value="quiz">QCM</option>
                <option value="true_false">Vrai/Faux</option>
                <option value="open_answer">Ouverte</option>
              </select>
              <button class="text-xs text-red-600 hover:underline" @click="removeQuestion(i)">Supprimer</button>
            </div>
          </div>

          <div v-if="q.type === 'quiz'" class="space-y-2">
            <label class="text-xs text-gray-500">Options (cochez la bonne reponse)</label>
            <div
              v-for="(opt, j) in q.options"
              :key="j"
              class="flex items-center gap-2"
            >
              <input
                type="radio"
                :name="`correct-${i}`"
                :checked="q.correctIndex === j"
                @change="q.correctIndex = j"
              />
              <input v-model="q.options[j]" class="flex-1 px-2 py-1 border rounded text-sm" />
              <button class="text-xs text-gray-400 hover:text-red-600" @click="removeOption(q, j)">&times;</button>
            </div>
            <button class="text-xs text-primary-600 hover:underline" @click="addOption(q)">+ option</button>
          </div>

          <div v-else-if="q.type === 'true_false'" class="flex items-center gap-4">
            <label class="flex items-center gap-1 text-sm">
              <input type="radio" :name="`tf-${i}`" :checked="q.correctIndex === 0" @change="q.correctIndex = 0" />
              Vrai
            </label>
            <label class="flex items-center gap-1 text-sm">
              <input type="radio" :name="`tf-${i}`" :checked="q.correctIndex === 1" @change="q.correctIndex = 1" />
              Faux
            </label>
          </div>

          <div v-else>
            <label class="text-xs text-gray-500">Reponse attendue (sera stockee dans explanation)</label>
            <textarea
              v-model="q.explanation"
              rows="2"
              class="w-full px-3 py-2 border rounded-lg text-sm mt-1"
            />
          </div>

          <div v-if="q.type !== 'open_answer'">
            <label class="text-xs text-gray-500">Justification (optionnel)</label>
            <input v-model="q.explanation" class="w-full px-3 py-2 border rounded-lg text-sm mt-1" />
          </div>
        </div>
      </div>

      <!-- Champs (mode STRUCTURE) -->
      <div v-else-if="proposalMode === 'STRUCTURE'" class="space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-700">Champs du formulaire ({{ editedFields.length }})</h3>
          <button class="text-sm text-primary-600 hover:underline" @click="addField">+ Ajouter un champ</button>
        </div>

        <div
          v-for="(f, i) in editedFields"
          :key="i"
          class="border rounded-xl p-3 grid grid-cols-1 md:grid-cols-[1fr_150px_90px_auto] gap-2 items-center bg-gray-50/60"
        >
          <input v-model="f.label" placeholder="Libelle" class="px-3 py-2 border rounded-lg text-sm" />
          <select v-model="f.type" class="px-3 py-2 border rounded-lg text-sm">
            <option value="text">Texte</option>
            <option value="email">Email</option>
            <option value="number">Nombre</option>
            <option value="date">Date</option>
            <option value="select">Liste deroulante</option>
            <option value="textarea">Paragraphe</option>
          </select>
          <label class="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" v-model="f.required" /> Requis
          </label>
          <button class="text-xs text-red-600 hover:underline" @click="removeField(i)">Retirer</button>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t">
        <button class="px-4 py-2 rounded-lg border text-sm" @click="restart">Recommencer</button>
        <div class="flex gap-2">
          <button
            class="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm"
            :disabled="saving"
            @click="onReject"
          >
            Annuler la proposition
          </button>
          <button
            class="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium disabled:opacity-40"
            :disabled="saving"
            @click="onConfirm"
          >
            <span v-if="!saving">Enregistrer le brouillon</span>
            <span v-else>Enregistrement...</span>
          </button>
        </div>
      </div>

      <p v-if="saveError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{{ saveError }}</p>
      <p v-if="saveSuccess" class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
        {{ saveSuccess }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Question {
  order?: number;
  type: 'quiz' | 'true_false' | 'open_answer';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface FormField {
  order?: number;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

const emit = defineEmits<{ saved: [payload: { moduleId: string; tournamentId?: string; title: string }] }>();

const config = useRuntimeConfig();
const apiBase = config.public.apiBase as string;

const steps = [
  { key: 'source', label: 'Source' },
  { key: 'mode', label: 'Mode' },
  { key: 'review', label: 'Revision' },
];

const stepIndex = ref(0);

// Step 1
const sourceKind = ref<'file' | 'url'>('file');
const file = ref<File | null>(null);
const url = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

// Step 2
const extractionMode = ref<'DATA' | 'STRUCTURE'>('DATA');
const questionCount = ref(10);
const questionType = ref<'quiz' | 'true_false' | 'open_answer' | 'mixed'>('quiz');
const optionCount = ref(4);
const targetType = ref<'module_draft' | 'tournament_draft'>('module_draft');
const targetTitle = ref('');
const analyzing = ref(false);
const analysisError = ref('');

// Step 3
const confirmationId = ref('');
const proposalMode = ref<'DATA' | 'STRUCTURE'>('DATA');
const proposalTitle = ref('');
const editedQuestions = ref<Question[]>([]);
const editedFields = ref<FormField[]>([]);
const saving = ref(false);
const saveError = ref('');
const saveSuccess = ref('');

const canGoToStep2 = computed(() => {
  if (sourceKind.value === 'file') return !!file.value;
  return /^https?:\/\/.+/.test(url.value.trim());
});

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  file.value = input.files?.[0] || null;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function authHeader(): Record<string, string> {
  const session = useCookie<{ token: string } | null>('__session').value;
  const token = session?.token || useCookie('auth_token').value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function runAnalysis() {
  analyzing.value = true;
  analysisError.value = '';
  try {
    const form = new FormData();
    form.append('extractionMode', extractionMode.value);
    form.append('questionCount', String(questionCount.value));
    form.append('questionType', questionType.value);
    form.append('optionCount', String(optionCount.value));
    form.append('targetType', extractionMode.value === 'STRUCTURE' ? 'module_draft' : targetType.value);
    if (targetTitle.value.trim()) form.append('targetTitle', targetTitle.value.trim());

    if (sourceKind.value === 'file' && file.value) {
      form.append('file', file.value);
    } else if (sourceKind.value === 'url') {
      form.append('url', url.value.trim());
    }

    const res = await $fetch<any>(`${apiBase}/knowledge-to-form/analyze`, {
      method: 'POST',
      headers: authHeader(),
      body: form,
    });

    confirmationId.value = res.confirmationId;
    proposalMode.value = res.mode;
    proposalTitle.value = res.title || targetTitle.value || 'Brouillon';
    editedQuestions.value = Array.isArray(res.questions) ? res.questions.map((q: Question) => ({ ...q })) : [];
    editedFields.value = Array.isArray(res.fields) ? res.fields.map((f: FormField) => ({ ...f })) : [];

    stepIndex.value = 2;
  } catch (err: any) {
    analysisError.value = err?.data?.error || err?.message || 'Erreur lors de l\'analyse.';
  } finally {
    analyzing.value = false;
  }
}

function addQuestion() {
  editedQuestions.value.push({
    type: 'quiz',
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  });
}
function removeQuestion(i: number) {
  editedQuestions.value.splice(i, 1);
}
function addOption(q: Question) {
  if (q.options.length < 6) q.options.push('');
}
function removeOption(q: Question, idx: number) {
  if (q.options.length <= 2) return;
  q.options.splice(idx, 1);
  if (q.correctIndex >= q.options.length) q.correctIndex = 0;
}
function addField() {
  editedFields.value.push({ label: '', type: 'text', required: false, options: [] });
}
function removeField(i: number) {
  editedFields.value.splice(i, 1);
}

async function onConfirm() {
  saving.value = true;
  saveError.value = '';
  saveSuccess.value = '';

  const payload: any = { title: proposalTitle.value.trim() };
  if (proposalMode.value === 'DATA') {
    payload.questions = editedQuestions.value.map((q, i) => ({ ...q, order: i }));
  } else {
    payload.fields = editedFields.value.map((f, i) => ({ ...f, order: i }));
  }

  try {
    const res = await $fetch<any>(`${apiBase}/knowledge-to-form/confirm/${confirmationId.value}`, {
      method: 'POST',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: payload,
    });

    saveSuccess.value = res?.result?.message || 'Brouillon enregistre.';
    emit('saved', {
      moduleId: res?.result?.moduleId,
      tournamentId: res?.result?.tournamentId,
      title: proposalTitle.value.trim(),
    });
  } catch (err: any) {
    saveError.value = err?.data?.error || err?.message || 'Erreur lors de l\'enregistrement.';
  } finally {
    saving.value = false;
  }
}

async function onReject() {
  if (!confirmationId.value) return;
  saving.value = true;
  try {
    await $fetch(`${apiBase}/knowledge-to-form/reject/${confirmationId.value}`, {
      method: 'POST',
      headers: authHeader(),
    });
    restart();
  } catch (err: any) {
    saveError.value = err?.data?.error || err?.message || 'Erreur lors de l\'annulation.';
  } finally {
    saving.value = false;
  }
}

function restart() {
  stepIndex.value = 0;
  file.value = null;
  url.value = '';
  extractionMode.value = 'DATA';
  questionCount.value = 10;
  questionType.value = 'quiz';
  optionCount.value = 4;
  targetType.value = 'module_draft';
  targetTitle.value = '';
  confirmationId.value = '';
  proposalMode.value = 'DATA';
  proposalTitle.value = '';
  editedQuestions.value = [];
  editedFields.value = [];
  analysisError.value = '';
  saveError.value = '';
  saveSuccess.value = '';
  if (fileInput.value) fileInput.value.value = '';
}
</script>
