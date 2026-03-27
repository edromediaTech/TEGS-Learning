<template>
  <div :style="pageStyle">
    <!-- Loading -->
    <div v-if="loading" class="min-h-screen flex items-center justify-center">
      <div class="text-center">
        <div class="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-gray-500">Chargement du module...</p>
      </div>
    </div>

    <!-- Error (Live gate, 404, etc.) -->
    <div v-else-if="error" class="min-h-screen flex items-center justify-center">
      <div class="text-center max-w-md mx-auto p-8">
        <div class="text-6xl mb-4">{{ errorIcon }}</div>
        <h1 class="text-2xl font-bold text-gray-800 mb-2">{{ errorTitle }}</h1>
        <p class="text-gray-500">{{ error }}</p>
        <p v-if="liveStartTime" class="mt-4 text-sm text-blue-600 font-medium">
          Ouverture : {{ new Date(liveStartTime).toLocaleString('fr-FR') }}
        </p>
      </div>
    </div>

    <!-- Identification Gate -->
    <div v-else-if="!identified && moduleData" class="min-h-screen flex items-center justify-center">
      <div class="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4" :style="{ borderTop: `4px solid ${theme.primary}` }">
        <h1 class="text-xl font-bold mb-1" :style="{ color: theme.primary }">{{ moduleData.title }}</h1>
        <p class="text-sm text-gray-500 mb-6">Identifiez-vous pour commencer</p>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Prenom</label>
            <input v-model="studentInfo.firstName" type="text" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Votre prenom" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input v-model="studentInfo.lastName" type="text" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Votre nom" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Identifiant SIGEEE <span class="text-gray-400">(optionnel)</span></label>
            <input v-model="studentInfo.sigeeeId" type="text" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Ex: STD-001" />
          </div>
        </div>
        <div class="mt-4 text-xs text-gray-400">
          <span v-if="moduleData.questionCount">{{ moduleData.questionCount }} questions</span>
          <span v-if="moduleData.questionCount && moduleData.totalPoints"> &middot; {{ moduleData.totalPoints }} points</span>
          <span v-if="moduleData.evaluationType === 'live'" class="ml-2 text-red-500 font-bold">EXAMEN LIVE</span>
        </div>
        <button
          @click="startModule"
          :disabled="!studentInfo.firstName.trim() || !studentInfo.lastName.trim()"
          class="w-full mt-6 py-3 rounded-lg text-white font-bold text-sm transition disabled:opacity-40"
          :style="{ background: theme.primary }"
        >
          Commencer
        </button>
      </div>
    </div>

    <!-- Module Content -->
    <div v-else-if="moduleData" class="min-h-screen">
      <!-- Header with timer + progress -->
      <header :style="headerStyle" class="sticky top-0 z-50 shadow-md">
        <div class="max-w-5xl mx-auto px-4 md:px-6 py-3">
          <div class="flex items-center justify-between">
            <div class="min-w-0 flex-1 mr-4">
              <h1 class="text-lg font-bold truncate">{{ moduleData.title }}</h1>
              <p class="text-xs opacity-70">{{ studentInfo.firstName }} {{ studentInfo.lastName }}</p>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <!-- Timer -->
              <div v-if="timerActive" class="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono font-bold" :class="timerUrgent ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white'">
                <span>&#9201;</span>
                {{ formattedTimer }}
              </div>
              <!-- Screen counter -->
              <span class="text-sm opacity-70 hidden md:inline">
                {{ currentScreenIdx + 1 }}/{{ allScreens.length }}
              </span>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all duration-500" :style="{ width: progressPercent + '%', background: theme.primaryLight || '#60a5fa' }"></div>
          </div>
        </div>
      </header>

      <div class="max-w-5xl mx-auto flex gap-0 md:gap-6 min-h-[calc(100vh-90px)]">
        <!-- Sidebar Navigation -->
        <nav :style="sidebarStyle" class="hidden md:block w-56 flex-shrink-0 py-4 overflow-y-auto sticky top-[90px] self-start max-h-[calc(100vh-90px)]">
          <template v-for="(section, si) in moduleData.sections" :key="si">
            <div class="px-4 py-2 text-xs font-bold uppercase opacity-60" :style="{ color: theme.headerText }">
              {{ section.title }}
            </div>
            <button
              v-for="(screen, sci) in section.screens"
              :key="`${si}_${sci}`"
              @click="goToScreen(si, sci)"
              class="block w-full text-left px-4 py-2 mx-1 rounded-md text-sm transition-colors"
              :style="navItemStyle(si, sci)"
            >
              <span v-if="screenAnswered(si, sci)" class="mr-1">&#10003;</span>
              {{ screen.title }}
            </button>
          </template>
        </nav>

        <!-- Main Content -->
        <main class="flex-1 py-6 px-4 md:px-8">
          <!-- Mobile nav -->
          <div class="md:hidden mb-4">
            <select :value="currentScreenKey" @change="onMobileNavChange($event)" class="w-full px-3 py-2 border rounded-lg text-sm">
              <template v-for="(section, si) in moduleData.sections" :key="si">
                <option v-for="(screen, sci) in section.screens" :key="`${si}_${sci}`" :value="`${si}_${sci}`">
                  {{ section.title }} &gt; {{ screen.title }}
                </option>
              </template>
            </select>
          </div>

          <!-- Screen title -->
          <h2 class="text-xl font-bold mb-6" :style="{ color: theme.bodyText }">
            {{ currentScreen?.title }}
          </h2>

          <!-- Content Blocks -->
          <div v-if="currentScreen" class="space-y-4">
            <template v-for="(block, bi) in sortedBlocks" :key="bi">
              <!-- Heading -->
              <component
                v-if="block.type === 'heading'"
                :is="'h' + (block.data.level || 1)"
                class="font-bold"
                :style="{ color: theme.bodyText, fontSize: headingSize(block.data.level) }"
              >{{ block.data.text }}</component>

              <!-- Text -->
              <div v-else-if="block.type === 'text'" class="prose max-w-none leading-relaxed" v-html="sanitizeHtml(block.data.content)"></div>

              <!-- Separator -->
              <div v-else-if="block.type === 'separator'">
                <div v-if="block.data.style === 'space'" class="h-8"></div>
                <hr v-else class="border-gray-300 my-4" :style="{ borderStyle: block.data.style || 'solid' }">
              </div>

              <!-- Image -->
              <figure v-else-if="block.type === 'image' && block.data.url" :style="{ maxWidth: imgSize(block.data.size) }" class="mx-auto">
                <img :src="block.data.url" :alt="block.data.alt || ''" class="w-full rounded-lg" loading="lazy">
                <figcaption v-if="block.data.caption" class="text-center text-sm text-gray-500 mt-2">{{ block.data.caption }}</figcaption>
              </figure>

              <!-- Text + Image -->
              <div v-else-if="block.type === 'text_image'" class="flex gap-6 items-start flex-col md:flex-row" :class="block.data.layout === 'text-right' ? 'md:flex-row-reverse' : ''">
                <div class="flex-1 whitespace-pre-wrap">{{ block.data.text }}</div>
                <div class="flex-1"><img v-if="block.data.imageUrl" :src="block.data.imageUrl" class="w-full rounded-lg"></div>
              </div>

              <!-- Video -->
              <div v-else-if="block.type === 'video' && block.data.url">
                <div v-if="youtubeId(block.data.url)" class="relative pb-[56.25%] h-0">
                  <iframe :src="`https://www.youtube.com/embed/${youtubeId(block.data.url)}`" class="absolute top-0 left-0 w-full h-full rounded-lg" frameborder="0" allowfullscreen></iframe>
                </div>
                <video v-else :src="block.data.url" controls class="w-full rounded-lg"></video>
              </div>

              <!-- Audio -->
              <div v-else-if="block.type === 'audio' && block.data.url" class="bg-gray-50 rounded-lg p-4">
                <p v-if="block.data.title" class="font-semibold mb-2">{{ block.data.title }}</p>
                <audio :src="block.data.url" controls class="w-full"></audio>
              </div>

              <!-- PDF -->
              <div v-else-if="block.type === 'pdf' && block.data.url">
                <p v-if="block.data.title" class="font-semibold mb-2">{{ block.data.title }}</p>
                <iframe :src="block.data.url" class="w-full border rounded-lg" :style="{ height: (block.data.height || 500) + 'px' }" frameborder="0"></iframe>
              </div>

              <!-- Embed -->
              <div v-else-if="block.type === 'embed' && block.data.url" class="mx-auto" :style="{ maxWidth: (block.data.width || 800) + 'px' }">
                <p v-if="block.data.title" class="font-semibold mb-2">{{ block.data.title }}</p>
                <iframe :src="block.data.url" class="w-full border rounded-lg" :style="{ height: (block.data.height || 500) + 'px' }" frameborder="0" sandbox="allow-scripts allow-same-origin allow-popups"></iframe>
              </div>

              <!-- Interactive Question Components -->
              <ShareQuiz v-else-if="block.type === 'quiz'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />
              <ShareTrueFalse v-else-if="block.type === 'true_false'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />
              <ShareNumeric v-else-if="block.type === 'numeric'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />
              <ShareFillBlank v-else-if="block.type === 'fill_blank'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />
              <ShareMatching v-else-if="block.type === 'matching'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />
              <ShareSequence v-else-if="block.type === 'sequence'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />
              <ShareOpenAnswer v-else-if="block.type === 'open_answer'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />
              <ShareLikert v-else-if="block.type === 'likert'" :block="block" :theme="theme" @answered="onBlockAnswered(si_sci_key, bi, $event)" />

              <!-- Callout -->
              <div v-else-if="block.type === 'callout'" class="rounded-lg p-4 border-l-4" :style="calloutStyle(block.data)">
                <p v-if="block.data.title" class="font-bold mb-1">{{ block.data.title }}</p>
                <p>{{ block.data.content }}</p>
              </div>

              <!-- Media (legacy) -->
              <div v-else-if="block.type === 'media' && block.data.url">
                <video v-if="block.data.mediaType === 'video'" :src="block.data.url" controls class="w-full rounded-lg"></video>
                <img v-else :src="block.data.url" :alt="block.data.caption || ''" class="max-w-full rounded-lg">
              </div>
            </template>

            <p v-if="!sortedBlocks.length" class="text-center text-gray-400 py-8">Cet ecran est vide.</p>
          </div>

          <!-- Navigation buttons -->
          <div class="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              @click="prevScreen"
              :disabled="currentScreenIdx === 0"
              class="px-5 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-30"
              :style="{ background: theme.primary, color: theme.headerText }"
            >&larr; Precedent</button>

            <span class="text-sm text-gray-500">{{ currentScreenIdx + 1 }} / {{ allScreens.length }}</span>

            <!-- Next or Submit -->
            <button
              v-if="currentScreenIdx < allScreens.length - 1"
              @click="nextScreen"
              class="px-5 py-2.5 rounded-lg text-sm font-medium transition"
              :style="{ background: theme.primary, color: theme.headerText }"
            >Suivant &rarr;</button>

            <button
              v-else
              @click="submitModule"
              :disabled="submitting"
              class="px-6 py-2.5 rounded-lg text-sm font-bold transition bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {{ submitting ? 'Envoi...' : 'Valider et Terminer' }}
            </button>
          </div>
        </main>
      </div>

      <!-- Submitted overlay -->
      <div v-if="submitted" class="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
        <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div class="text-5xl mb-4">{{ scorePercent >= 50 ? '&#127942;' : '&#128218;' }}</div>
          <h2 class="text-2xl font-bold mb-2">{{ scorePercent >= 50 ? 'Felicitations !' : 'Module termine' }}</h2>
          <div class="text-4xl font-black my-4" :class="scorePercent >= 50 ? 'text-green-600' : 'text-red-500'">
            {{ scorePercent }}%
          </div>
          <p class="text-gray-500 text-sm">
            {{ totalCorrect }} / {{ totalQuestions }} questions correctes
            <br>Score : {{ earnedPoints }} / {{ moduleData.totalPoints || totalQuestions }} points
          </p>
          <p class="mt-4 text-xs text-gray-400">Vos resultats ont ete enregistres.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase as string
const shareToken = route.params.token as string

// --- State ---
const loading = ref(true)
const error = ref('')
const errorIcon = ref('&#128683;')
const errorTitle = ref('Module inaccessible')
const liveStartTime = ref('')
const moduleData = ref<any>(null)
const identified = ref(false)
const submitted = ref(false)
const submitting = ref(false)

const studentInfo = reactive({
  firstName: '',
  lastName: '',
  sigeeeId: '',
})

const currentSectionIdx = ref(0)
const currentScreenInSection = ref(0)

// Timer
const timerActive = ref(false)
const remainingSeconds = ref(0)
const totalTimerSeconds = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null
let tickInterval: ReturnType<typeof setInterval> | null = null
const sessionKey = ref('')

// Answers tracking
const answers = reactive<Record<string, { correct: boolean; points: number }>>({})

// --- Themes ---
const THEMES: Record<string, any> = {
  ddene: { primary: '#1e40af', primaryLight: '#3b82f6', headerBg: '#1e40af', headerText: '#ffffff', bodyBg: '#f8fafc', bodyText: '#1e293b', cardBg: '#ffffff' },
  nature: { primary: '#166534', primaryLight: '#22c55e', headerBg: '#166534', headerText: '#ffffff', bodyBg: '#fefce8', bodyText: '#1c1917', cardBg: '#ffffff' },
  contrast: { primary: '#fbbf24', primaryLight: '#fde68a', headerBg: '#0f172a', headerText: '#fbbf24', bodyBg: '#1e293b', bodyText: '#f1f5f9', cardBg: '#334155' },
  ocean: { primary: '#0891b2', primaryLight: '#22d3ee', headerBg: '#164e63', headerText: '#ffffff', bodyBg: '#ecfeff', bodyText: '#134e4a', cardBg: '#ffffff' },
  sunset: { primary: '#dc2626', primaryLight: '#f87171', headerBg: '#7c2d12', headerText: '#ffffff', bodyBg: '#fff7ed', bodyText: '#1c1917', cardBg: '#ffffff' },
}

const theme = computed(() => THEMES[moduleData.value?.theme] || THEMES.ddene)
const pageStyle = computed(() => ({ background: theme.value.bodyBg, color: theme.value.bodyText, minHeight: '100vh' }))
const headerStyle = computed(() => ({ background: theme.value.headerBg, color: theme.value.headerText }))
const sidebarStyle = computed(() => ({ background: theme.value.headerBg, borderRadius: '0 0 12px 0' }))

// --- Computed ---
const allScreens = computed(() => {
  if (!moduleData.value) return []
  const screens: { si: number; sci: number; title: string; screen: any }[] = []
  for (const [si, section] of (moduleData.value.sections || []).entries()) {
    for (const [sci, screen] of (section.screens || []).entries()) {
      screens.push({ si, sci, title: screen.title, screen })
    }
  }
  return screens
})

const currentScreenIdx = computed(() => {
  let idx = 0
  for (const [si, section] of (moduleData.value?.sections || []).entries()) {
    for (const [sci] of (section.screens || []).entries()) {
      if (si === currentSectionIdx.value && sci === currentScreenInSection.value) return idx
      idx++
    }
  }
  return 0
})

const si_sci_key = computed(() => `${currentSectionIdx.value}_${currentScreenInSection.value}`)
const currentScreenKey = computed(() => si_sci_key.value)
const currentScreen = computed(() => moduleData.value?.sections?.[currentSectionIdx.value]?.screens?.[currentScreenInSection.value] || null)
const sortedBlocks = computed(() => {
  if (!currentScreen.value) return []
  return [...(currentScreen.value.contentBlocks || [])].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
})

const progressPercent = computed(() => {
  if (!allScreens.value.length) return 0
  return Math.round(((currentScreenIdx.value + 1) / allScreens.value.length) * 100)
})

const formattedTimer = computed(() => {
  const s = remainingSeconds.value
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const timerUrgent = computed(() => remainingSeconds.value > 0 && remainingSeconds.value <= 60)

const totalQuestions = computed(() => moduleData.value?.questionCount || 0)
const totalCorrect = computed(() => Object.values(answers).filter(a => a.correct).length)
const earnedPoints = computed(() => Object.values(answers).reduce((sum, a) => sum + (a.correct ? a.points : 0), 0))
const scorePercent = computed(() => {
  const max = moduleData.value?.totalPoints || totalQuestions.value
  if (!max) return 0
  return Math.round((earnedPoints.value / max) * 100)
})

// --- Methods ---
function goToScreen(si: number, sci: number) {
  // Send xAPI experienced event for current screen before leaving
  sendXapiExperienced()
  currentSectionIdx.value = si
  currentScreenInSection.value = sci
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onMobileNavChange(e: Event) {
  const [si, sci] = (e.target as HTMLSelectElement).value.split('_').map(Number)
  goToScreen(si, sci)
}

function prevScreen() {
  const idx = currentScreenIdx.value
  if (idx > 0) { const t = allScreens.value[idx - 1]; goToScreen(t.si, t.sci) }
}

function nextScreen() {
  const idx = currentScreenIdx.value
  if (idx < allScreens.value.length - 1) { const t = allScreens.value[idx + 1]; goToScreen(t.si, t.sci) }
}

function navItemStyle(si: number, sci: number) {
  const active = si === currentSectionIdx.value && sci === currentScreenInSection.value
  return { color: theme.value.headerText, background: active ? 'rgba(255,255,255,0.2)' : 'transparent', fontWeight: active ? '600' : '400' }
}

function screenAnswered(si: number, sci: number) {
  return Object.keys(answers).some(k => k.startsWith(`${si}_${sci}_`))
}

function headingSize(level: number) { return { 1: '28px', 2: '22px', 3: '18px' }[level] || '18px' }
function imgSize(size: string) { return { small: '50%', medium: '75%', large: '100%' }[size] || '100%' }
function youtubeId(url: string) { const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : null }

function sanitizeHtml(html: string) {
  if (!html) return ''
  return html
    .replace(/<!--[\s\S]*?-->/g, '').replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<\/?\w+:[^>]*>/gi, '')
    .replace(/<script[\s>][\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(?:script|iframe|object|embed|form|input|button|link|meta|base)[^>]*>/gi, '')
    .replace(/\bon\w+\s*=/gi, '')
}

function calloutStyle(data: any) {
  const c: Record<string, { bg: string; border: string }> = {
    info: { bg: '#eff6ff', border: '#3b82f6' }, warning: { bg: '#fffbeb', border: '#f59e0b' },
    success: { bg: '#f0fdf4', border: '#22c55e' }, error: { bg: '#fef2f2', border: '#ef4444' },
  }
  const s = c[data.type] || c.info
  return { background: s.bg, borderLeftColor: s.border }
}

// --- Answer tracking ---
function onBlockAnswered(screenKey: string, blockIdx: number, result: { correct: boolean; points: number }) {
  answers[`${screenKey}_${blockIdx}`] = result
  sendXapiAnswered(result)
}

// --- xAPI Tracking ---
function xapiActor() {
  return {
    name: `${studentInfo.firstName} ${studentInfo.lastName}`,
    mbox: studentInfo.sigeeeId
      ? `mailto:${studentInfo.sigeeeId}@sigeee.edu.ht`
      : `mailto:${studentInfo.firstName.toLowerCase()}.${studentInfo.lastName.toLowerCase()}@share.tegs.local`,
  }
}

async function sendXapiStatement(verb: string, verbDisplay: string, extras: any = {}) {
  try {
    await $fetch(`${apiBase}/xapi/statements`, {
      method: 'POST',
      body: {
        actor: xapiActor(),
        verb: { id: `http://adlnet.gov/expapi/verbs/${verb}`, display: { 'fr-HT': verbDisplay } },
        object: {
          id: `https://tegs-learning.edu.ht/share/${shareToken}`,
          objectType: 'Activity',
          definition: { name: { 'fr-HT': moduleData.value?.title || 'Module' } },
        },
        ...extras,
      },
    })
  } catch { /* silent - tracking is best-effort */ }
}

function sendXapiExperienced() {
  const screen = currentScreen.value
  if (!screen) return
  sendXapiStatement('experienced', 'a consulte', {
    context: { extensions: { 'https://tegs-learning.edu.ht/extensions/screen': screen.title } },
  })
}

function sendXapiAnswered(result: { correct: boolean; points: number }) {
  sendXapiStatement(result.correct ? 'passed' : 'failed', result.correct ? 'a reussi' : 'a echoue', {
    result: { success: result.correct, score: { raw: result.points, max: result.points } },
  })
}

// --- Session Timer ---
async function initSession() {
  sessionKey.value = `${studentInfo.firstName}_${studentInfo.lastName}_${Date.now()}`
  try {
    const res = await $fetch<any>(`${apiBase}/share/public/${shareToken}/session`, {
      method: 'POST',
      body: { sessionKey: sessionKey.value },
    })

    if (res.status === 'no_timer') {
      timerActive.value = false
      return
    }

    if (res.remainingSeconds && res.remainingSeconds > 0) {
      remainingSeconds.value = res.remainingSeconds
      totalTimerSeconds.value = res.totalSeconds || res.remainingSeconds
      timerActive.value = true
      startTimer()
    }
  } catch { /* no timer */ }
}

function startTimer() {
  timerInterval = setInterval(() => {
    if (remainingSeconds.value <= 0) {
      stopTimer()
      forceSubmit()
      return
    }
    remainingSeconds.value--
  }, 1000)

  // Sync with server every 30s
  tickInterval = setInterval(async () => {
    try {
      const res = await $fetch<any>(`${apiBase}/share/public/${shareToken}/session/tick`, {
        method: 'POST',
        body: { sessionKey: sessionKey.value },
      })
      if (res.forceSubmit || res.status === 'expired') {
        stopTimer()
        forceSubmit()
        return
      }
      if (res.remainingSeconds !== undefined) {
        remainingSeconds.value = res.remainingSeconds
      }
    } catch { /* continue with local timer */ }
  }, 30000)
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
}

async function forceSubmit() {
  if (submitted.value) return
  await submitModule()
}

// --- Start module ---
async function startModule() {
  identified.value = true
  sendXapiStatement('initialized', 'a initialise')
  await initSession()
}

// --- Submit ---
async function submitModule() {
  if (submitting.value || submitted.value) return
  submitting.value = true

  // Send completed + final score
  const scaled = (moduleData.value?.totalPoints || totalQuestions.value) > 0
    ? earnedPoints.value / (moduleData.value?.totalPoints || totalQuestions.value)
    : 0

  await sendXapiStatement(scaled >= 0.5 ? 'passed' : 'failed', scaled >= 0.5 ? 'a reussi' : 'a echoue', {
    result: {
      score: { scaled, raw: earnedPoints.value, max: moduleData.value?.totalPoints || totalQuestions.value },
      success: scaled >= 0.5,
      completion: true,
    },
  })

  await sendXapiStatement('completed', 'a termine', {
    result: { completion: true },
  })

  await sendXapiStatement('terminated', 'a mis fin')

  // Close server session
  if (sessionKey.value) {
    try {
      await $fetch(`${apiBase}/share/public/${shareToken}/session/close`, {
        method: 'POST',
        body: { sessionKey: sessionKey.value },
      })
    } catch { /* best-effort */ }
  }

  stopTimer()
  submitted.value = true
  submitting.value = false
}

// --- Surveillance (strict mode) ---
function initSurveillance() {
  if (!moduleData.value || moduleData.value.surveillanceMode !== 'strict') return
  const ss = moduleData.value.strictSettings || {}

  if (ss.antiCopy) {
    document.addEventListener('contextmenu', (e) => e.preventDefault())
    document.addEventListener('copy', (e) => e.preventDefault())
    document.addEventListener('cut', (e) => e.preventDefault())
  }

  if (ss.blurDetection) {
    let blurCount = 0
    const maxBlur = ss.maxBlurCount || 3
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && identified.value && !submitted.value) {
        blurCount++
        if (blurCount >= maxBlur && ss.autoSubmitOnExceed) {
          forceSubmit()
        } else if (blurCount < maxBlur) {
          alert(`Attention : sortie d'onglet detectee (${blurCount}/${maxBlur})`)
        }
      }
    })
  }
}

// --- Fetch module ---
onMounted(async () => {
  try {
    const res = await $fetch<any>(`${apiBase}/share/public/${shareToken}/json`)
    moduleData.value = res
    nextTick(() => initSurveillance())
  } catch (err: any) {
    const data = err?.data || err?.response?._data || {}
    error.value = data.error || 'Module introuvable ou partage desactive'
    if (data.liveStartTime) {
      liveStartTime.value = data.liveStartTime
      errorIcon.value = '&#9203;'
      errorTitle.value = 'Examen pas encore ouvert'
    } else if (data.liveEndTime) {
      errorIcon.value = '&#128683;'
      errorTitle.value = 'Examen termine'
    }
  } finally {
    loading.value = false
  }
})

onUnmounted(() => stopTimer())

useHead({
  title: computed(() => moduleData.value?.title ? `${moduleData.value.title} | TEGS-Learning` : 'TEGS-Learning'),
})
</script>
