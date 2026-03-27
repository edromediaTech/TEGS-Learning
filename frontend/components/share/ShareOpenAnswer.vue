<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: '#f8fafc', borderColor: '#e2e8f0' }">
    <span class="bg-gray-700 text-white px-2 py-0.5 rounded text-xs font-bold">REPONSE LIBRE</span>
    <p class="font-semibold my-3">{{ block.data.question }}</p>
    <textarea
      v-model="answer"
      :disabled="submitted"
      rows="4"
      :placeholder="block.data.placeholder || 'Ecrivez votre reponse ici...'"
      class="w-full px-3 py-2 border rounded-md text-sm resize-y"
    ></textarea>
    <div class="flex items-center justify-between mt-2">
      <span class="text-xs text-gray-400">{{ answer.length }} caracteres</span>
      <button v-if="!submitted" @click="submit" :disabled="!answer.trim()" class="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium disabled:opacity-50">Soumettre</button>
    </div>
    <div v-if="submitted" class="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
      Reponse enregistree. Cette question sera evaluee manuellement.
    </div>
    <button v-if="submitted" @click="reset" class="mt-2 text-sm text-gray-600 hover:underline">Modifier</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const emit = defineEmits<{ answered: [result: { correct: boolean; points: number }] }>()
const answer = ref('')
const submitted = ref(false)
function submit() {
  submitted.value = true
  emit('answered', { correct: true, points: props.block.data.points || 1 })
}
function reset() { submitted.value = false }
</script>
