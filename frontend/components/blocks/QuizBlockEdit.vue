<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Question</label>
      <input
        :value="modelValue.question"
        @input="updateField('question', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Ex: Quel est le resultat de 3 + 4 ?"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Options de reponse</label>
      <div class="space-y-2">
        <div
          v-for="(option, idx) in modelValue.options"
          :key="idx"
          class="flex items-center space-x-2"
        >
          <input
            type="radio"
            :name="`quiz-correct-${blockId}`"
            :checked="option.isCorrect"
            @change="setCorrect(idx)"
            class="text-green-600"
            title="Bonne reponse"
          />
          <input
            :value="option.text"
            @input="updateOption(idx, 'text', ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="`Option ${idx + 1}`"
            class="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            :class="option.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-300'"
          />
          <button
            v-if="modelValue.options.length > 2"
            @click="removeOption(idx)"
            class="text-red-400 hover:text-red-600 px-2"
            title="Supprimer"
          >
            &times;
          </button>
        </div>
      </div>
      <button
        @click="addOption"
        class="mt-2 text-sm text-primary-600 hover:text-primary-800"
      >
        + Ajouter une option
      </button>
      <p class="text-xs text-gray-400 mt-1">Selectionnez le bouton radio pour la bonne reponse</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Explication (optionnel)</label>
      <textarea
        :value="modelValue.explanation"
        @input="updateField('explanation', ($event.target as HTMLTextAreaElement).value)"
        rows="2"
        placeholder="Explication affichee apres la reponse..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      ></textarea>
    </div>

    <!-- Chronometre -->
    <div class="border-t border-gray-200 pt-4">
      <div class="flex items-center justify-between mb-2">
        <label class="text-sm font-medium text-gray-700 flex items-center space-x-2">
          <span>&#9201;</span>
          <span>Limite de temps</span>
        </label>
        <button
          type="button"
          @click="toggleTimer"
          class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
          :class="timerEnabled ? 'bg-primary-600' : 'bg-gray-300'"
        >
          <span
            class="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
            :class="timerEnabled ? 'translate-x-4.5' : 'translate-x-0.5'"
          ></span>
        </button>
      </div>

      <div v-if="timerEnabled" class="space-y-3 pl-1">
        <div class="flex items-center space-x-3">
          <div>
            <label class="text-xs text-gray-500">Duree (minutes)</label>
            <input
              :value="modelValue.timerMinutes || 5"
              @input="updateField('timerMinutes', Math.max(1, parseInt(($event.target as HTMLInputElement).value) || 5))"
              type="number"
              min="1"
              max="120"
              class="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500">Mode</label>
            <select
              :value="modelValue.timerMode || 'countdown'"
              @change="updateField('timerMode', ($event.target as HTMLSelectElement).value)"
              class="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="countdown">Compte a rebours</option>
              <option value="stopwatch">Chronometre</option>
            </select>
          </div>
        </div>

        <div>
          <label class="text-xs text-gray-500">A la fin du temps</label>
          <select
            :value="modelValue.timerAction || 'auto_submit'"
            @change="updateField('timerAction', ($event.target as HTMLSelectElement).value)"
            class="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 mt-1"
          >
            <option value="auto_submit">Valider automatiquement</option>
            <option value="block">Bloquer (empecher la reponse)</option>
          </select>
        </div>

        <p class="text-xs text-gray-400">
          Le chronometre s'affichera en haut du quiz pour l'eleve.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface QuizOption {
  text: string;
  isCorrect: boolean;
}

const props = defineProps<{
  modelValue: {
    question: string;
    options: QuizOption[];
    explanation: string;
    timerEnabled?: boolean;
    timerMinutes?: number;
    timerMode?: 'countdown' | 'stopwatch';
    timerAction?: 'auto_submit' | 'block';
  };
  blockId: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const timerEnabled = computed(() => props.modelValue.timerEnabled === true);

function toggleTimer() {
  const enabled = !timerEnabled.value;
  emit('update:modelValue', {
    ...props.modelValue,
    timerEnabled: enabled,
    timerMinutes: enabled ? (props.modelValue.timerMinutes || 5) : props.modelValue.timerMinutes,
    timerMode: enabled ? (props.modelValue.timerMode || 'countdown') : props.modelValue.timerMode,
    timerAction: enabled ? (props.modelValue.timerAction || 'auto_submit') : props.modelValue.timerAction,
  });
}

function updateField(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function updateOption(idx: number, key: string, value: any) {
  const newOptions = props.modelValue.options.map((o, i) =>
    i === idx ? { ...o, [key]: value } : { ...o }
  );
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}

function setCorrect(idx: number) {
  const newOptions = props.modelValue.options.map((o, i) => ({
    ...o,
    isCorrect: i === idx,
  }));
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}

function addOption() {
  const newOptions = [...props.modelValue.options, { text: '', isCorrect: false }];
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}

function removeOption(idx: number) {
  const newOptions = props.modelValue.options.filter((_, i) => i !== idx);
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}
</script>
