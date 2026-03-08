<template>
  <div class="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center space-x-2 mb-2">
      <span class="bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded">TEXTE A TROUS</span>
    </div>
    <div class="text-gray-800 leading-relaxed">
      <template v-for="(part, i) in parts" :key="i">
        <span v-if="part.type === 'text'">{{ part.value }}</span>
        <span v-else class="inline-block mx-1">
          <input
            v-model="userAnswers[part.index!]"
            :disabled="answered"
            type="text"
            :placeholder="'...'"
            class="px-2 py-1 border-b-2 text-center text-sm w-28 focus:outline-none"
            :class="answered ? (isBlankCorrect(part.index!) ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-400 bg-white'"
          />
        </span>
      </template>
    </div>
    <button
      @click="check"
      :disabled="answered"
      class="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50"
    >
      Valider
    </button>
    <div v-if="answered" class="pt-2">
      <div class="p-3 rounded-lg text-sm" :class="allCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
        {{ allCorrect ? 'Tout est correct !' : 'Certaines reponses sont incorrectes.' }}
      </div>
      <div v-if="!allCorrect" class="mt-2 text-sm text-gray-600">
        <span class="font-medium">Reponses :</span>
        <span v-for="(b, i) in blanks" :key="i" class="ml-2">{{ i + 1 }}. <strong>{{ b }}</strong></span>
      </div>
      <p v-if="data.explanation" class="mt-2 text-sm text-gray-600 italic">{{ data.explanation }}</p>
      <button @click="reset" class="mt-2 text-sm text-primary-600 hover:text-primary-800">Recommencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { text: string; explanation: string } }>();

interface Part { type: 'text' | 'blank'; value: string; index?: number; }

const blanks = computed(() => {
  const matches = props.data.text?.match(/\{\{(.+?)\}\}/g) || [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
});

const parts = computed<Part[]>(() => {
  const text = props.data.text || '';
  const result: Part[] = [];
  let blankIdx = 0;
  let lastIdx = 0;
  const regex = /\{\{(.+?)\}\}/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) result.push({ type: 'text', value: text.slice(lastIdx, match.index) });
    result.push({ type: 'blank', value: match[1], index: blankIdx++ });
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) result.push({ type: 'text', value: text.slice(lastIdx) });
  return result;
});

const userAnswers = ref<string[]>([]);
const answered = ref(false);

watch(blanks, () => { userAnswers.value = blanks.value.map(() => ''); }, { immediate: true });

function isBlankCorrect(idx: number) {
  return (userAnswers.value[idx] || '').trim().toLowerCase() === (blanks.value[idx] || '').trim().toLowerCase();
}

const allCorrect = computed(() => blanks.value.every((_, i) => isBlankCorrect(i)));

function check() { answered.value = true; }
function reset() { userAnswers.value = blanks.value.map(() => ''); answered.value = false; }
</script>
