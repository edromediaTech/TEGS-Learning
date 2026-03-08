<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Tableau de Bord Analytics</h1>
          <p class="text-gray-500 mt-1">Intelligence pedagogique - DDENE</p>
        </div>
        <div class="flex items-center gap-3">
          <!-- Filtre periode -->
          <select v-model="period" @change="loadAll" class="border rounded-lg px-3 py-2 text-sm">
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="all">Tout</option>
          </select>
          <!-- Filtre source -->
          <select v-model="sourceFilter" @change="loadAll" class="border rounded-lg px-3 py-2 text-sm">
            <option value="">Toutes sources</option>
            <option value="inspect-mobile">Inspect Mobile</option>
            <option value="sigeee-desktop">SIGEEE Desktop</option>
            <option value="tegs-runtime">TEGS Runtime</option>
            <option value="direct">Direct (Web)</option>
          </select>
          <!-- Export -->
          <button @click="exportCSV" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
            Export CSV
          </button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Total Traces</p>
          <p class="text-3xl font-bold text-primary-700">{{ overview.totalStatements }}</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Taux de Reussite</p>
          <p class="text-3xl font-bold" :class="overview.successRate >= 60 ? 'text-green-600' : 'text-red-600'">
            {{ overview.successRate }}%
          </p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Score Moyen</p>
          <p class="text-3xl font-bold text-blue-600">{{ (overview.avgScore * 100).toFixed(0) }}%</p>
        </div>
        <div class="bg-white rounded-xl shadow p-5">
          <p class="text-sm text-gray-500">Utilisateurs Actifs</p>
          <p class="text-3xl font-bold text-purple-600">{{ overview.totalUsers }}</p>
        </div>
      </div>

      <!-- Charts Row 1 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Progression hebdo -->
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="font-semibold text-gray-700 mb-4">Progression Quotidienne</h3>
          <div class="h-64">
            <ClientOnly>
              <Bar v-if="weeklyData.labels.length" :data="weeklyData" :options="barOptions" />
              <p v-else class="text-gray-400 text-center mt-16">Aucune donnee</p>
            </ClientOnly>
          </div>
        </div>

        <!-- Repartition verbes -->
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="font-semibold text-gray-700 mb-4">Types d'Activites</h3>
          <div class="h-64 flex items-center justify-center">
            <ClientOnly>
              <Doughnut v-if="verbData.labels.length" :data="verbData" :options="doughnutOptions" />
              <p v-else class="text-gray-400">Aucune donnee</p>
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Charts Row 2 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Top modules -->
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="font-semibold text-gray-700 mb-4">Top Modules (Taux de Reussite)</h3>
          <div class="h-64">
            <ClientOnly>
              <Bar v-if="topModulesData.labels.length" :data="topModulesData" :options="horizontalBarOptions" />
              <p v-else class="text-gray-400 text-center mt-16">Aucune donnee</p>
            </ClientOnly>
          </div>
        </div>

        <!-- Sources -->
        <div class="bg-white rounded-xl shadow p-6">
          <h3 class="font-semibold text-gray-700 mb-4">Sources de Donnees</h3>
          <div class="h-64 flex items-center justify-center">
            <ClientOnly>
              <Doughnut v-if="sourcesData.labels.length" :data="sourcesData" :options="doughnutOptions" />
              <p v-else class="text-gray-400">Aucune donnee</p>
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Comparaison Ecoles (admin only) -->
      <div v-if="auth.isAdmin && schools.length > 0" class="bg-white rounded-xl shadow p-6 mb-8">
        <h3 class="font-semibold text-gray-700 mb-4">Comparaison des Ecoles</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left p-3">Ecole</th>
                <th class="text-right p-3">Traces</th>
                <th class="text-right p-3">Reussis</th>
                <th class="text-right p-3">Echoues</th>
                <th class="text-right p-3">Taux</th>
                <th class="text-right p-3">Score Moy.</th>
                <th class="text-right p-3">Utilisateurs</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in schools" :key="s.tenantId" class="border-t hover:bg-gray-50">
                <td class="p-3 font-medium">{{ s.schoolName }}</td>
                <td class="p-3 text-right">{{ s.totalStatements }}</td>
                <td class="p-3 text-right text-green-600">{{ s.passed }}</td>
                <td class="p-3 text-right text-red-600">{{ s.failed }}</td>
                <td class="p-3 text-right font-bold" :class="s.successRate >= 60 ? 'text-green-600' : 'text-red-600'">
                  {{ s.successRate }}%
                </td>
                <td class="p-3 text-right">{{ (s.avgScore * 100).toFixed(0) }}%</td>
                <td class="p-3 text-right">{{ s.activeUsers }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Leaderboard -->
      <div class="bg-white rounded-xl shadow p-6 mb-8">
        <h3 class="font-semibold text-gray-700 mb-4">Classement des Eleves</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left p-3">#</th>
                <th class="text-left p-3">Nom</th>
                <th class="text-right p-3">Score Moyen</th>
                <th class="text-right p-3">Activites</th>
                <th class="text-right p-3">Reussis</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in leaderboard" :key="l.userId" class="border-t hover:bg-gray-50">
                <td class="p-3 font-bold text-primary-600">{{ l.rank }}</td>
                <td class="p-3">{{ l.name }}</td>
                <td class="p-3 text-right font-medium">{{ (l.avgScore * 100).toFixed(0) }}%</td>
                <td class="p-3 text-right">{{ l.totalActivities }}</td>
                <td class="p-3 text-right text-green-600">{{ l.passed }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="leaderboard.length === 0" class="text-gray-400 text-center py-6">Aucune donnee de score</p>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

definePageMeta({ middleware: 'auth' })

const auth = useAuthStore()
const { apiFetch, baseURL } = useApi()

const period = ref('30')
const sourceFilter = ref('')

const overview = ref({
  totalStatements: 0, totalUsers: 0, totalModules: 0,
  successRate: 0, avgScore: 0, passCount: 0, failCount: 0,
  verbBreakdown: [] as any[],
})

const weeklyProgress = ref([] as any[])
const topModules = ref([] as any[])
const sources = ref([] as any[])
const schools = ref([] as any[])
const leaderboard = ref([] as any[])

// Chart data
const weeklyData = computed(() => ({
  labels: weeklyProgress.value.map(d => d.date),
  datasets: [
    {
      label: 'Reussis',
      data: weeklyProgress.value.map(d => d.passed),
      backgroundColor: '#22c55e',
    },
    {
      label: 'Echoues',
      data: weeklyProgress.value.map(d => d.failed),
      backgroundColor: '#ef4444',
    },
    {
      label: 'Completes',
      data: weeklyProgress.value.map(d => d.completed),
      backgroundColor: '#3b82f6',
    },
  ],
}))

const verbData = computed(() => {
  const vb = overview.value.verbBreakdown || []
  const colors = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1']
  return {
    labels: vb.map(v => v.verb),
    datasets: [{
      data: vb.map(v => v.count),
      backgroundColor: vb.map((_, i) => colors[i % colors.length]),
    }],
  }
})

const topModulesData = computed(() => ({
  labels: topModules.value.map(m => typeof m.name === 'object' ? Object.values(m.name)[0] : m.name),
  datasets: [{
    label: 'Taux de reussite (%)',
    data: topModules.value.map(m => m.successRate),
    backgroundColor: '#3b82f6',
  }],
}))

const sourcesData = computed(() => {
  const sourceLabels: Record<string, string> = {
    'inspect-mobile': 'Inspect Mobile',
    'sigeee-desktop': 'SIGEEE Desktop',
    'tegs-runtime': 'TEGS Runtime',
    'direct': 'Direct (Web)',
    'unknown': 'Inconnu',
  }
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444']
  return {
    labels: sources.value.map(s => sourceLabels[s.source] || s.source),
    datasets: [{
      data: sources.value.map(s => s.count),
      backgroundColor: sources.value.map((_, i) => colors[i % colors.length]),
    }],
  }
})

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } },
  scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
}

const horizontalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true, max: 100 } },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'right' as const } },
}

function queryParams() {
  const params = new URLSearchParams()
  if (period.value !== 'all') {
    const since = new Date()
    since.setDate(since.getDate() - parseInt(period.value))
    params.set('since', since.toISOString())
  }
  if (sourceFilter.value) params.set('source', sourceFilter.value)
  return params.toString() ? `?${params.toString()}` : ''
}

async function loadAll() {
  const q = queryParams()
  const days = period.value === 'all' ? '365' : period.value

  try {
    const [ov, wp, tm, src, lb] = await Promise.all([
      apiFetch(`/analytics/overview${q}`),
      apiFetch(`/analytics/weekly-progress${q}&days=${days}`),
      apiFetch(`/analytics/top-modules${q}`),
      apiFetch(`/analytics/sources${q}`),
      apiFetch(`/analytics/leaderboard${q}`),
    ])
    overview.value = ov.data as any
    weeklyProgress.value = (wp.data as any).progress || []
    topModules.value = (tm.data as any).modules || []
    sources.value = (src.data as any).sources || []
    leaderboard.value = (lb.data as any).leaderboard || []
  } catch (e) {
    console.error('Analytics load error', e)
  }

  // Comparaison ecoles (admin only)
  if (auth.isAdmin) {
    try {
      const cs = await apiFetch(`/analytics/compare-schools${q}`)
      schools.value = (cs.data as any).schools || []
    } catch { /* non-admin or error */ }
  }
}

function exportCSV() {
  const q = queryParams()
  const token = useCookie('auth_token').value
  window.open(`${baseURL}/analytics/export/csv${q}${q ? '&' : '?'}token=${token}`, '_blank')
}

onMounted(() => loadAll())
</script>
