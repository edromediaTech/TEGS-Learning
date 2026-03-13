<template>
  <div>
    <NuxtLayout name="admin">
      <div v-if="loading && !moduleData" class="text-center py-12 text-gray-500">
        Chargement...
      </div>

      <div v-else-if="moduleData">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <NuxtLink :to="`/admin/modules/${moduleId}/settings`" class="text-sm text-primary-600 hover:text-primary-800 mb-1 inline-block">
              &larr; Retour au module
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">Reporting : {{ moduleData.title }}</h1>
            <p class="text-sm text-gray-500 mt-1">Rapports individuels, export Excel et remediation IA</p>
          </div>
          <div class="flex items-center gap-3">
            <button
              @click="exportExcel"
              :disabled="results.length === 0"
              class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              Export Excel
            </button>
            <button
              @click="generateAllCommentaries"
              :disabled="results.length === 0 || aiLoading"
              class="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {{ aiLoading ? 'Generation IA...' : 'Commentaires IA (tous)' }}
            </button>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Participants</p>
            <p class="text-3xl font-bold text-primary-700">{{ stats.total }}</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Score Moyen</p>
            <p class="text-3xl font-bold text-blue-600">{{ stats.avgScore }}%</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Reussis</p>
            <p class="text-3xl font-bold text-green-600">{{ stats.passed }}</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Echoues</p>
            <p class="text-3xl font-bold text-red-600">{{ stats.failed }}</p>
          </div>
        </div>

        <!-- Timer Info -->
        <div v-if="timerInfo" class="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span class="font-semibold text-blue-800">Duree totale du module :</span>
            <span class="ml-2 text-blue-700">{{ timerInfo.totalMinutes }} minutes</span>
            <span class="text-xs text-blue-500 ml-2">
              ({{ timerInfo.source === 'global' ? 'duree globale definie' : `somme de ${timerInfo.breakdown.length} questions` }})
            </span>
          </div>
          <div v-if="timerInfo.breakdown.length > 0" class="text-xs text-blue-500">
            {{ timerInfo.breakdown.map((b: any) => `${b.type}: ${b.duration}min`).join(' | ') }}
          </div>
        </div>

        <!-- Results Table -->
        <div class="bg-white rounded-xl shadow overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="font-semibold text-gray-700">Resultats des participants</h3>
            <span class="text-xs text-gray-400">{{ results.length }} participant(s)</span>
          </div>

          <div v-if="results.length === 0" class="p-12 text-center text-gray-400">
            Aucun resultat soumis pour ce module.
          </div>

          <table v-else class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left p-3">#</th>
                <th class="text-left p-3">Eleve</th>
                <th class="text-right p-3">Score</th>
                <th class="text-right p-3">%</th>
                <th class="text-right p-3">Questions</th>
                <th class="text-center p-3">Statut</th>
                <th class="text-center p-3">Date</th>
                <th class="text-center p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in results"
                :key="r._id"
                class="border-t hover:bg-gray-50 transition"
              >
                <td class="p-3 font-bold text-gray-400">{{ i + 1 }}</td>
                <td class="p-3">
                  <div class="font-medium text-gray-900">{{ r.studentName }}</div>
                  <div class="text-xs text-gray-400">{{ r.studentEmail }}</div>
                </td>
                <td class="p-3 text-right font-mono font-bold">{{ r.totalScore }}/{{ r.maxScore }}</td>
                <td class="p-3 text-right font-bold" :class="r.percentage >= 60 ? 'text-green-600' : 'text-red-600'">
                  {{ r.percentage }}%
                </td>
                <td class="p-3 text-right">
                  <span class="text-green-600">{{ r.correctCount }}</span>/<span class="text-gray-500">{{ r.answersCount }}</span>
                </td>
                <td class="p-3 text-center">
                  <span
                    class="px-2 py-1 rounded-full text-xs font-bold"
                    :class="r.percentage >= 60 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                  >
                    {{ r.percentage >= 60 ? 'Reussi' : 'Echoue' }}
                  </span>
                </td>
                <td class="p-3 text-center text-xs text-gray-500">
                  <div>{{ formatDate(r.completedAt) }}</div>
                  <div v-if="r.evaluationType === 'live'" class="mt-0.5">
                    <span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">LIVE</span>
                    <span v-if="r.autoSubmitted" class="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 ml-0.5">AUTO</span>
                  </div>
                </td>
                <td class="p-3 text-center">
                  <div class="flex items-center justify-center gap-1">
                    <!-- PDF -->
                    <button
                      @click="downloadPDF(r._id, r.studentName)"
                      class="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-700"
                      title="Telecharger PDF"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <!-- AI Commentary -->
                    <button
                      @click="generateCommentary(r._id)"
                      :disabled="aiLoading"
                      class="p-1.5 rounded hover:bg-purple-50 text-purple-600 hover:text-purple-700"
                      :title="r.ai_commentary ? 'Regenerer commentaire IA' : 'Generer commentaire IA'"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </button>
                    <!-- Remediation -->
                    <button
                      @click="generateRemediation(r._id, r.studentName)"
                      :disabled="aiLoading"
                      class="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-700"
                      title="Generer quiz de remediation"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- AI Commentary Display -->
        <div v-if="selectedCommentary" class="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold text-purple-800">Commentaire IA - {{ selectedCommentaryName }}</h3>
            <button @click="selectedCommentary = ''" class="text-purple-400 hover:text-purple-600 text-sm">Fermer</button>
          </div>
          <p class="text-gray-700 whitespace-pre-line">{{ selectedCommentary }}</p>
        </div>

        <!-- Remediation Quiz Display -->
        <div v-if="remediationQuiz" class="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-blue-800">Quiz de Remediation - {{ remediationStudentName }}</h3>
            <button @click="remediationQuiz = null" class="text-blue-400 hover:text-blue-600 text-sm">Fermer</button>
          </div>
          <div class="space-y-4">
            <div
              v-for="(q, qi) in remediationQuiz"
              :key="qi"
              class="bg-white rounded-lg p-4 border border-blue-100"
            >
              <div class="flex items-start gap-3">
                <span class="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {{ qi + 1 }}
                </span>
                <div class="flex-1">
                  <p class="font-medium text-gray-900 mb-2">{{ q.questionText }}</p>
                  <div class="flex items-center gap-3 text-xs text-gray-500">
                    <span class="bg-gray-100 px-2 py-0.5 rounded">{{ q.type }}</span>
                    <span>{{ q.points }} pts</span>
                  </div>
                  <!-- Choices for quiz type -->
                  <div v-if="q.choices" class="mt-2 space-y-1">
                    <div
                      v-for="(c, ci) in q.choices"
                      :key="ci"
                      class="text-sm px-2 py-1 rounded"
                      :class="c === q.correctAnswer || String.fromCharCode(65 + Number(ci)) === q.correctAnswer
                        ? 'bg-green-50 text-green-700 font-medium'
                        : 'text-gray-600'"
                    >
                      {{ String.fromCharCode(65 + Number(ci)) }}. {{ c }}
                    </div>
                  </div>
                  <!-- True/False -->
                  <div v-else-if="q.type === 'true_false'" class="mt-2 text-sm">
                    Reponse: <span class="font-bold" :class="q.correctAnswer ? 'text-green-600' : 'text-red-600'">
                      {{ q.correctAnswer ? 'Vrai' : 'Faux' }}
                    </span>
                  </div>
                  <!-- Other types -->
                  <div v-else class="mt-2 text-sm text-gray-600">
                    Reponse attendue: <span class="font-medium">{{ q.correctAnswer }}</span>
                  </div>
                  <!-- Feedback -->
                  <p v-if="q.feedback" class="mt-2 text-xs text-blue-600 italic">{{ q.feedback }}</p>
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
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const { apiFetch, baseURL } = useApi()
const auth = useAuthStore()

const moduleId = route.params.id as string

const loading = ref(true)
const aiLoading = ref(false)
const moduleData = ref<any>(null)
const results = ref<any[]>([])
const stats = ref({ total: 0, avgScore: 0, passed: 0, failed: 0 })
const timerInfo = ref<any>(null)
const selectedCommentary = ref('')
const selectedCommentaryName = ref('')
const remediationQuiz = ref<any[] | null>(null)
const remediationStudentName = ref('')

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

async function loadData() {
  loading.value = true
  try {
    const [modRes, resultsRes, timerRes] = await Promise.all([
      apiFetch(`/modules/${moduleId}`),
      apiFetch(`/reporting/results/${moduleId}`),
      apiFetch(`/reporting/module-timer/${moduleId}`),
    ])
    moduleData.value = (modRes.data as any)
    const rd = resultsRes.data as any
    results.value = rd.results || []
    stats.value = rd.stats || { total: 0, avgScore: 0, passed: 0, failed: 0 }
    const td = timerRes.data as any
    if (td.source !== 'none') {
      timerInfo.value = td
    }
  } catch (e) {
    console.error('Load error', e)
  } finally {
    loading.value = false
  }
}

function getToken() {
  const session = useCookie<{ token: string; tenant_id: string } | null>('__session').value
  return session?.token || useCookie('auth_token').value
}

function downloadPDF(resultId: string, studentName: string) {
  window.open(`${baseURL}/reporting/pdf/${resultId}?token=${getToken()}`, '_blank')
}

function exportExcel() {
  window.open(`${baseURL}/reporting/excel/${moduleId}?token=${getToken()}`, '_blank')
}

async function generateCommentary(resultId: string) {
  aiLoading.value = true
  try {
    const res = await apiFetch(`/reporting/ai-commentary/${resultId}`, { method: 'POST' })
    const commentary = (res.data as any).commentary
    const r = results.value.find(r => r._id === resultId)
    if (r) {
      r.ai_commentary = commentary
      selectedCommentary.value = commentary
      selectedCommentaryName.value = r.studentName
    }
  } catch (e) {
    console.error('AI commentary error', e)
  } finally {
    aiLoading.value = false
  }
}

async function generateAllCommentaries() {
  aiLoading.value = true
  try {
    const res = await apiFetch(`/reporting/ai-commentary-batch/${moduleId}`, { method: 'POST' })
    const data = res.data as any
    alert(`${data.count} commentaires generes avec succes`)
    await loadData()
  } catch (e) {
    console.error('Batch AI error', e)
  } finally {
    aiLoading.value = false
  }
}

async function generateRemediation(resultId: string, studentName: string) {
  aiLoading.value = true
  remediationStudentName.value = studentName
  try {
    const res = await apiFetch(`/reporting/remediation/${resultId}`, { method: 'POST' })
    const data = res.data as any
    remediationQuiz.value = data.quiz
    if (!data.quiz) {
      alert(data.message || 'Aucune erreur detectee')
    }
  } catch (e) {
    console.error('Remediation error', e)
  } finally {
    aiLoading.value = false
  }
}

onMounted(() => loadData())
</script>
